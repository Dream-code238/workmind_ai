import { chatModel } from "../model.js";

// ─── Token 估算（不调 API，本地估算）───
// 中文约 0.6 token/字，英文约 0.25 token/字符
function estTokens(text = "") {
  const cn = (text.match(/[\u4e00-\u9fff]/g) || []).length;
  return Math.ceil(cn * 0.6 + (text.length - cn) * 0.25);
}

// ─── 会话历史存储（生产环境换 Redis）───
const sessionStore = new Map();

export function getHistory(sessionId) {
  if (!sessionStore.has(sessionId)) sessionStore.set(sessionId, []);
  return sessionStore.get(sessionId);
}

export function clearHistory(sessionId) {
  sessionStore.delete(sessionId);
}

// Token 感知截取：从最新消息往前，2000 token 为上限
export function trimHistory(history, maxTokens = 2000) {
  const result = [];
  let total = 0;
  for (let i = history.length - 1; i >= 0; i--) {
    const t = estTokens(history[i].content || "");
    if (total + t > maxTokens) break;
    result.unshift(history[i]);
    total += t;
  }
  return result;
}

// ─── 用户画像（跨会话记忆）───
const profileStore = new Map();

export function getProfile(userId) {
  return profileStore.get(userId) || {};
}

// 把画像转成 system 上下文片段
export function profileToContext(profile) {
  if (!profile || !Object.keys(profile).length) return "";
  const parts = [];
  if (profile.name) parts.push(`用户姓名：${profile.name}`);
  if (profile.dept) parts.push(`部门：${profile.dept}`);
  if (profile.techLevel) parts.push(`技术水平：${profile.techLevel}`);
  if (profile.currentGoal) parts.push(`当前目标：${profile.currentGoal}`);
  return parts.length
    ? `\n\n用户背景：\n${parts.map((p) => `- ${p}`).join("\n")}`
    : "";
}

// 从对话中异步提取用户信息，更新画像
export async function extractAndUpdateProfile(userId, userMsg, aiReply) {
  try {
    const current = getProfile(userId);
    // withStructuredOutput：让 AI 返回固定格式的 JSON
    const extractModel = chatModel.withStructuredOutput({
      type: "object",
      properties: {
        hasInfo: { type: "boolean" },
        name: { type: "string" },
        dept: { type: "string" },
        techLevel: { type: "string", enum: ["初级", "中级", "高级", "架构师"] },
        primaryStack: { type: "array", items: { type: "string" } },
        currentGoal: { type: "string" },
      },
      required: ["hasInfo"],
    });
    const result = await extractModel.invoke([
      {
        role: "system",
        content: `从对话中提取用户信息，只填写有明确依据的字段。
        当前已知画像：${JSON.stringify(current)}
        如果没有新信息，hasInfo 返回 false。`,
      },
      {
        role: "user",
        content: `用户说：${userMsg}\nAI 回复：${aiReply.slice(0, 200)}`,
      },
    ]);
    if (!result.hasInfo) return;

    // 合并更新
    const updated = { ...current };
    if (result.name) updated.name = result.name;
    if (result.dept) updated.dept = result.dept;
    if (result.techLevel) updated.techLevel = result.techLevel;
    if (result.currentGoal) updated.currentGoal = result.currentGoal;
    if (result.primaryStack?.length) {
      updated.primaryStack = [
        ...new Set([...(current.primaryStack || []), ...result.primaryStack]),
      ];
    }
    profileStore.set(userId, updated);
  } catch (e) {
    // 画像提取失败不影响主流程，静默处理
  }
}

export function listSessions() {
  return [...sessionStore.keys()].map((id) => ({
    id,
    messageCount: sessionStore.get(id).length,
  }));
}
