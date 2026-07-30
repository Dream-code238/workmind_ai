import { defineStore } from "pinia";
import { ref, computed, reactive } from "vue";
import { fetchStream } from "@/utils/http.js";

export const useChatStore = defineStore("chat", () => {
  // 会话列表
  const sessions = ref([]);
  const currentId = ref(null);

  const currentSession = computed(
    () => sessions.value.find((s) => s.id === currentId.value) || null,
  );
  const messages = computed(() => currentSession.value?.messages || []);

  // 创建新会话
  function newSession() {
    const id = `session_${Date.now()}`;
    sessions.value.unshift({
      id,
      title: "新对话",
      messages: [],
      createdAt: new Date().toISOString(),
    });
    currentId.value = id;
    return id;
  }
  const selectedRole = ref("default");
  const userId = ref("user_" + Date.now());

  // ─── 发送消息（★★★ 核心方法 ★★★）───
  const loading = ref(false);

  async function sendMessage(text) {
    if (!text.trim() || loading.value) return;
    const session = currentSession.value;
    loading.value = true;

    // 1. 添加用户消息
    session.messages.push({
      id: `msg_${Date.now()}`,
      role: "user",
      content: text,
      time: new Date().toISOString(),
    });

    // 2. 添加 AI 消息占位（流式填充）
    // ⚠️ 必须用 reactive()！否则流式更新不触发视图刷新
    const aiMsg = reactive({
      id: `msg_${Date.now() + 1}`,
      role: "assistant",
      content: "",
      fromCache: false,
      streaming: true,
      time: new Date().toISOString(),
    });
    session.messages.push(aiMsg);

    // 3. 发起 SSE 流式请求
    await fetchStream(
      "/api/chat/stream",
      {
        message: text,
        sessionId: currentId.value,
        role: selectedRole.value,
        userId: userId.value,
      },
      {
        onToken: (token) => {
          aiMsg.content += token; // 逐 token 拼接
        },
        onEvent: (event, data) => {
          if (event === "cache_hit") aiMsg.fromCache = true;
          if (event === "start") aiMsg.streaming = true;
        },
        onDone: (data) => {
          aiMsg.streaming = false;
          // 记录用量统计（非缓存时）
          if (!data.fromCache) {
            monitorStore.recordCall({
              inputTokens: data.inputTokens,
              outputTokens: data.outputTokens,
              fromCache: false,
              feature: "chat",
            });
          }
        },
        onError: (err) => {
          aiMsg.streaming = false;
          aiMsg.content = aiMsg.content || "抱歉，出现了一些问题，请重试。";
        },
      },
    );

    loading.value = false;
  }

  return {
    sessions,
    currentId,
    currentSession,
    messages,
    loading,
    selectedRole,
    userId,
    newSession,
    sendMessage,
  };
});
