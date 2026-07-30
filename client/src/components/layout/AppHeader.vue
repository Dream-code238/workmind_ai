<template>
  <header class="app-header">
    <div class="header-left">
      <h1 class="page-title">{{ currentMeta.title }}</h1>
      <span v-if="currentMeta.desc" class="page-desc">{{
        currentMeta.desc
      }}</span>
    </div>
    <div class="header-right">
      <div v-if="budgetAlert" class="budget-alert">
        ⚠ 今日用量已达 {{ budgetAlert }}
      </div>
      <div class="user-info">
        <div class="user-avatar">大</div>
        <span class="user-name">大伟 </span>
      </div>
    </div>
  </header>
</template>

<script setup>
import { computed } from "vue";
import { useRoute } from "vue-router";
import { useMonitorStore } from "@/stores/monitor.js";
const route = useRoute();
const monitorStore = useMonitorStore();
const pageMeta = {
  "/chat": { title: "智能对话助手", desc: "多轮对话，流式输出，记住你的偏好" },
  "/knowledge": { title: "知识库问答", desc: "上传文档，基于内容精准回答" },
  "/agent": {
    title: "任务执行 Agent",
    desc: "复杂任务自动拆解，工具调用可视化",
  },
  "/workflow": {
    title: "内容生成工作流",
    desc: "周报、纪要、邮件、PRD 一键生成",
  },
  "/erp": { title: "ERP 报销与请假", desc: "智能填单，AI 模拟审批流程" },
  "/prompt": { title: "Prompt 调试工具", desc: "A/B 测试，版本管理，效果对比" },
  "/monitor": { title: "用量与成本看板", desc: "Token 消耗、费用、缓存命中率" },
};
const currentMeta = computed(
  () => pageMeta[route.path] || { title: "WorkMind" },
);
const budgetAlert = computed(() => monitorStore.budgetWarning);
</script>
