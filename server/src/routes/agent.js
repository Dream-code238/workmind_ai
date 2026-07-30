import express from "express";
import { HumanMessage } from "@langchain/core/messages";
import { createAgent } from "../services/agent/agent.js";

const router = express.Router();

// POST /api/agent/run - 执行 Agent 任务
router.post("/run", async (req, res) => {
  const { task } = req.body;
  if (!task) return res.status(400).json({ error: "请输入任务" });

  // SSE 流式输出
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const send = (event, data) => {
    if (!res.writableEnded) {
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    }
  };

  try {
    send("start", {});

    // 每次请求创建新的 Agent 实例（确保干净的对话历史）
    const agent = createAgent();
    const steps = [];

    send("thinking", { message: "开始分析任务..." });

    // 流式执行 Agent
    for await (const chunk of await agent.stream({
      messages: [new HumanMessage(task)],
    })) {
      // 处理每个节点的输出
      for (const [nodeName, output] of Object.entries(chunk)) {
        if (nodeName === "agent") {
          const msgs = output.messages || [];
          for (const msg of msgs) {
            if (msg.tool_calls?.length) {
              // AI 正在调用工具
              send("tool_call", {
                tools: msg.tool_calls.map((t) => ({
                  name: t.name,
                  args: t.args,
                })),
              });
            } else if (msg.content) {
              // AI 的回复内容
              send("token", { token: msg.content });
            }
          }
        } else if (nodeName === "tools") {
          const msgs = output.messages || [];
          for (const msg of msgs) {
            send("tool_result", { content: msg.content });
          }
        }
      }
    }

    send("done", { steps });
  } catch (err) {
    send("error", { message: err.message });
  } finally {
    if (!res.writableEnded) res.end();
  }
});

export default router;
