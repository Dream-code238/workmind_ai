<!-- 审批流程展示：左侧审批人步骤 + 右侧对话气泡 -->
<template>
  <div class="approval-timeline">
    <!-- 左侧：审批人步骤 -->
    <div class="steps-panel">
      <div class="steps-title">审批流程</div>
      <div class="steps-list">
        <div
          v-for="(step, idx) in erpStore.approvalSteps"
          :key="step.roleId"
          class="step-item"
          :class="step.status"
        >
          <!-- 连接线 -->
          <div
            class="step-line"
            v-if="idx < erpStore.approvalSteps.length - 1"
            :class="{ active: step.status === 'approved' }"
          />
          <!-- 角色头像 -->
          <div
            class="step-avatar"
            :style="{
              background: step.role.color + '22',
              color: step.role.color,
            }"
          >
            {{ step.role.name?.slice(0, 1) }}
          </div>
          <div class="step-info">
            <div class="step-name">{{ step.role.name }}</div>
            <div class="step-status" :class="step.status">
              {{ stepStatusText(step.status) }}
            </div>
          </div>
        </div>
      </div>

      <!-- 最终结果 -->
      <div
        v-if="erpStore.finalResult"
        class="final-result"
        :class="erpStore.finalResult.status"
      >
        <div class="final-text">
          {{ erpStore.finalResult.approved ? "审批通过" : "审批驳回" }}
        </div>
      </div>
    </div>

    <!-- 右侧：对话气泡 -->
    <div class="conversation" ref="convEl">
      <div
        v-for="msg in erpStore.approvalMessages"
        :key="msg.id"
        class="msg-bubble-wrap"
        :class="{ 'is-applicant': msg.from === 'applicant' }"
      >
        <!-- 非申请人：左对齐 -->
        <template v-if="msg.from !== 'applicant'">
          <div
            class="msg-avatar"
            :style="{
              background: msg.role?.color + '22',
              color: msg.role?.color,
            }"
          >
            {{ msg.role?.name?.slice(0, 1) || "?" }}
          </div>
          <div class="msg-content left">
            <div class="msg-sender">{{ msg.role?.name }}</div>
            <div class="msg-bubble" :class="`type-${msg.type}`">
              {{ msg.content }}
            </div>
            <div class="msg-type-tag">{{ typeLabel(msg.type) }}</div>
          </div>
        </template>
        <!-- 申请人：右对齐 -->
        <template v-else>
          <div class="msg-content right">
            <div class="msg-sender right">申请人</div>
            <div class="msg-bubble applicant">{{ msg.content }}</div>
          </div>
          <div class="msg-avatar applicant">我</div>
        </template>
      </div>

      <!-- 等待动画（3 点打字效果） -->
      <div
        v-if="erpStore.approving && erpStore.approvalMessages.length"
        class="conv-thinking inline"
      >
        <div class="typing-dots"><span /><span /><span /></div>
        <span>审批人正在思考...</span>
      </div>
      <div ref="bottomEl" />
    </div>
  </div>
</template>

<script setup>
import { ref, watch, nextTick } from "vue";
import { useErpStore } from "@/stores/erp.js";

const erpStore = useErpStore();
const bottomEl = ref(null);

function stepStatusText(status) {
  return (
    {
      pending: "待审核",
      running: "审核中",
      approved: "已通过",
      rejected: "已驳回",
    }[status] || status
  );
}
function typeLabel(type) {
  return (
    { question: "提出问题", answer: "申请人回复", decision: "最终决定" }[
      type
    ] || ""
  );
}

// 新消息自动滚底
watch(
  () => erpStore.approvalMessages.length,
  async () => {
    await nextTick();
    bottomEl.value?.scrollIntoView({ behavior: "smooth" });
  },
);
</script>
