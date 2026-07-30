<template>
  <div class="session-sidebar">
    <div class="sidebar-header">
      <span class="sidebar-title">对话记录</span>
      <button class="btn-new" @click="chatStore.newSession()">＋</button>
    </div>
    <div class="session-list">
      <div
        v-for="session in chatStore.sessions"
        :key="session.id"
        class="session-item"
        :class="{ active: session.id === chatStore.currentId }"
        @click="chatStore.switchSession(session.id)"
      >
        <div class="session-info">
          <div class="session-title">{{ session.title }}</div>
          <div class="session-meta">{{ session.messages.length }} 条消息</div>
        </div>
        <button class="btn-delete" @click.stop="deleteSession(session.id)">
          ×
        </button>
      </div>
      <div v-if="!chatStore.sessions.length" class="empty-hint">
        还没有对话记录
      </div>
    </div>
  </div>
</template>

<script setup>
import { useChatStore } from "@/stores/chat.js";
import { useAppStore } from "@/stores/app.js";
const chatStore = useChatStore();
const appStore = useAppStore();
function deleteSession(id) {
  if (chatStore.sessions.length <= 1) {
    appStore.toast.warning("至少保留一个会话");
    return;
  }
  chatStore.deleteSession(id);
}
</script>
