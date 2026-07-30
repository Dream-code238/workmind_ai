<template>
  <aside class="sidebar">
    <div class="sidebar-header">
      <h2>WorkMind AI</h2>
    </div>
    <!-- 新建对话按钮 -->
    <div class="new-chat-btn">
      <el-button type="primary" @click="chatStore.newSession()" block>
        新建对话
      </el-button>
    </div>
    <!-- 导航菜单 -->
    <nav class="sidebar-nav">
      <router-link
        v-for="item in navItems"
        :key="item.path"
        :to="item.path"
        class="nav-item"
        active-class="active"
      >
        <span class="nav-icon">{{ item.icon }}</span>
        <span>{{ item.title }}</span>
      </router-link>
    </nav>
    <!-- 会话列表 -->
    <div class="sessions-list">
      <div class="sessions-title">会话记录</div>
      <div
        v-for="sess in chatStore.sessions"
        :key="sess.id"
        class="session-item"
        :class="{ active: sess.id === chatStore.currentId }"
        @click="chatStore.currentId = sess.id"
      >
        {{ sess.title || "新对话" }}
      </div>
    </div>
  </aside>
</template>

<script setup>
import { useChatStore } from "@/stores/chat.js";
import { useRouter } from "vue-router";
const chatStore = useChatStore();
const router = useRouter();
const navItems = [
  { path: "/chat", title: "智能对话", icon: "💬" },
  { path: "/knowledge", title: "知识库", icon: "📚" },
  { path: "/agent", title: "任务 Agent", icon: "🤖" },
  { path: "/workflow", title: "内容工作流", icon: "🔄" },
  { path: "/erp", title: "ERP 报销请假", icon: "📝" },
  { path: "/prompt", title: "Prompt 调试", icon: "🔧" },
  { path: "/monitor", title: "用量看板", icon: "📊" },
];
</script>
