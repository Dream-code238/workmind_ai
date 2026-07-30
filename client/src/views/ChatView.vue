<template>
  <div class="chat-view">
    <!-- 角色选择 -->
    <div class="toolbar">
      <el-select v-model="chatStore.selectedRole" size="small">
        <el-option label="通用助手" value="default" />
        <el-option label="技术顾问" value="tech" />
        <el-option label="HR 助理" value="hr" />
        <el-option label="法务助理" value="legal" />
      </el-select>
    </div>
    <!-- 消息列表 -->
    <div class="messages-container" ref="msgContainer">
      <div v-if="chatStore.messages.length === 0" class="empty-state">
        <h3>WorkMind AI</h3>
        <p>有什么可以帮助你的？</p>
      </div>
      <template v-for="msg in chatStore.messages" :key="msg.id">
        <MessageBubble :message="msg" @regenerate="regenerate" />
      </template>
      <div v-if="chatStore.loading" class="typing-indicator">
        <span></span><span></span><span></span>
      </div>
    </div>
    <!-- 输入框 -->
    <div class="input-area">
      <el-input
        v-model="inputText"
        type="textarea"
        :rows="2"
        placeholder="输入消息，按 Enter 发送，Shift+Enter 换行"
        @keydown.enter.exact.prevent="handleSend"
      />
      <el-button
        type="primary"
        @click="handleSend"
        :loading="chatStore.loading"
        :disabled="!inputText.trim()"
      >
        发送
      </el-button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick, watch } from "vue";
import { useChatStore } from "@/stores/chat.js";
import MessageBubble from "@/components/chat/MessageBubble.vue";

const chatStore = useChatStore();
const inputText = ref("");
const msgContainer = ref(null);

// 页面加载时自动创建会话
onMounted(() => {
  if (!chatStore.sessions.length) {
    chatStore.newSession();
  }
});

function handleSend() {
  if (!inputText.value.trim()) return;
  chatStore.sendMessage(inputText.value);
  inputText.value = "";
}

// 消息变化时自动滚到底部
watch(
  () => chatStore.messages.length,
  async () => {
    await nextTick();
    if (msgContainer.value) {
      msgContainer.value.scrollTop = msgContainer.value.scrollHeight;
    }
  },
);
</script>
