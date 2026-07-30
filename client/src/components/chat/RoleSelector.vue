<template>
  <div class="role-selector">
    <button
      v-for="role in chatStore.roles"
      :key="role.id"
      class="role-btn"
      :class="{ active: chatStore.selectedRole === role.id }"
      @click="chatStore.selectedRole = role.id"
      :title="role.desc"
    >
      <span class="role-icon">{{ role.icon }}</span>
      <span class="role-label">{{ role.label }}</span>
    </button>
  </div>
</template>

<script setup>
import { useChatStore } from "@/stores/chat.js";
const chatStore = useChatStore();
</script>
