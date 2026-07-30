<template>
  <div class="profile-panel">
    <div class="panel-header">
      <span class="panel-title">用户画像</span>
      <button class="btn-refresh" @click="chatStore.loadProfile()" title="刷新">
        ↻
      </button>
    </div>
    <div class="panel-body">
      <div v-if="isEmpty" class="empty-hint">
        <div>多聊几句，AI 会自动记住你的偏好和背景</div>
      </div>
      <div v-else class="profile-items">
        <div v-if="p.name" class="profile-row">
          <span class="row-label">姓名</span
          ><span class="row-value">{{ p.name }}</span>
        </div>
        <div v-if="p.dept" class="profile-row">
          <span class="row-label">部门</span
          ><span class="row-value">{{ p.dept }}</span>
        </div>
        <div v-if="p.techLevel" class="profile-row">
          <span class="row-label">技术水平</span>
          <span class="row-value">{{ p.techLevel }}</span>
        </div>
        <div v-if="p.primaryStack?.length" class="profile-row">
          <span class="row-label">技术栈</span>
          <div class="row-tags">
            <span v-for="s in p.primaryStack" :key="s" class="tag">{{
              s
            }}</span>
          </div>
        </div>
        <div v-if="p.prefersShort || p.prefersCode" class="profile-row">
          <span class="row-label">偏好</span>
          <span v-if="p.prefersShort" class="tag">简短回答</span>
          <span v-if="p.prefersCode" class="tag">代码示例</span>
        </div>
      </div>
      <button v-if="!isEmpty" class="btn-clear" @click="chatStore.profile = {}">
        清除记忆
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed } from "vue";
import { useChatStore } from "@/stores/chat.js";

const chatStore = useChatStore();
const p = computed(() => chatStore.profile);
const isEmpty = computed(
  () => !p.value || (!p.value.name && !p.value.dept && !p.value.techLevel),
);
</script>
