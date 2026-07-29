import express from "express";
import {
  HumanMessage,
  AIMessage,
  SystemMessage,
} from "@langchain/core/messages";
import { chatModel } from "../services/model.js";
import { cache } from "../services/cache.js";
import {
  getHistory,
  trimHistory,
  clearHistory,
  getProfile,
  profileToContext,
  extractAndUpdateProfile,
  listSessions,
} from "../services/chat/memory.js";
import {
  validateChat,
  rateLimiter,
  securityCheck,
} from "../middleware/index.js";
import { sendSseError } from "../utils/errors.js";

const router = express.Router();

// 内置角色预设
const ROLES = {
  default: "你是 WorkMind AI，一个智能办公助手，回答简洁专业。",
  tech: "你是资深技术顾问，精通 Vue3、React、Node.js。回答要有代码示例。",
  hr: "你是 HR 助理，熟悉劳动法规、公司政策。回答有温度。",
  legal: "你是法务助理，熟悉合同法、知识产权。回答严谨。",
};

// ─── POST /api/chat/stream ─── 核心接口：流式对话
chatRouter.post(
  "/stream",
  rateLimiter,
  validateChat,
  securityCheck,
  async (req, res) => {
    const {
      message,
      sessionId = "default",
      role = "default",
      userId = "anonymous",
    } = req.body;

    // 设置 SSE 响应头
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no"); // 关闭 nginx 缓冲

    const send = (event, data) => {
      if (!res.writableEnded) {
        res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
      }
    };

    try {
      // 步骤 1：拼接 system prompt（角色 + 用户画像）
      const baseSystem = ROLES[role] || ROLES.default;
      const profile = getProfile(userId);
      const profileCtx = profileToContext(profile);
      const systemPrompt = baseSystem + profileCtx;

      // 步骤 2：精确缓存检查
      const cached = cache.get(systemPrompt, message);
      if (cached) {
        send("cache_hit", {});
        // 模拟流式输出缓存内容（用户体验一致）
        const chars = cached.content.split("");
        for (let i = 0; i < chars.length; i += 3) {
          send("token", { token: chars.slice(i, i + 3).join("") });
          await new Promise((r) => setTimeout(r, 6));
        }
        send("done", { fromCache: true });
        return res.end();
      }

      // 步骤 3：获取会话历史（多轮对话）
      const history = getHistory(sessionId);
      const trimmed = trimHistory(history, 2000);

      // 步骤 4：构造消息列表
      // 顺序：系统消息 → 历史消息 → 当前用户消息
      const messages = [
        new SystemMessage(systemPrompt),
        ...trimmed,
        new HumanMessage(message),
      ];
      send("start", { sessionId });

      // 步骤 5：流式调用模型
      let fullReply = "";
      let inputTokens = 0;
      let outputTokens = 0;

      const stream = await chatModel.stream(messages);

      for await (const chunk of stream) {
        if (chunk.content) {
          fullReply += chunk.content;
          send("token", { token: chunk.content });
        }
        if (chunk.usage_metadata) {
          inputTokens = chunk.usage_metadata.input_tokens || 0;
          outputTokens = chunk.usage_metadata.output_tokens || 0;
        }
      }

      // 步骤 6：更新会话历史
      history.push(new HumanMessage(message));
      history.push(new AIMessage(fullReply));
      if (history.length > 20) history.splice(0, 2); // 保持最近 10 轮

      // 步骤 7：写入缓存
      cache.set(systemPrompt, message, {
        content: fullReply,
        tokens: inputTokens + outputTokens,
      });

      // 步骤 8：异步更新用户画像（不阻塞响应）
      extractAndUpdateProfile(userId, message, fullReply).catch(() => {});
      send("done", { fromCache: false, inputTokens, outputTokens });
    } catch (err) {
      sendSseError(res, err);
    } finally {
      if (!res.writableEnded) res.end();
    }
  },
);

// 获取所有会话列表
router.get("/sessions", (req, res) => {
  res.json({ sessions: listSessions() });
});

// 清空某个会话
router.delete("/sessions/:id", (req, res) => {
  clearHistory(req.params.id);
  res.json({ success: true });
});

// 获取用户画像
router.get("/profile/:userId", (req, res) => {
  res.json(getProfile(req.params.userId));
});

// 获取角色列表
router.get("/roles", (req, res) => {
  res.json({
    roles: [
      { id: "default", label: "通用助手", icon: "🤖" },
      { id: "tech", label: "技术顾问", icon: "💻" },
      { id: "hr", label: "HR 助理", icon: "📋" },
      { id: "legal", label: "法务助理", icon: "⚖️" },
    ],
  });
});

export default router;
