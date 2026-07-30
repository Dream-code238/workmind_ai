<template>
  <div class="erp-view">
    <aside class="erp-sidebar">
      <!-- 报销/请假 Tab 切换 -->
      <div class="type-tabs">
        <button
          class="type-tab"
          :class="{ active: erpStore.formType === 'expense' }"
          @click="switchType('expense')"
          :disabled="erpStore.approving"
        >
          报销申请
        </button>
        <button
          class="type-tab"
          :class="{ active: erpStore.formType === 'leave' }"
          @click="switchType('leave')"
          :disabled="erpStore.approving"
        >
          请假申请
        </button>
      </div>
      <div class="sidebar-scroll">
        <SmartFormParser @submit="startApproval" />
      </div>
      <!-- 申请记录 -->
      <div class="record-section">
        <div class="record-header" @click="showRecords = !showRecords">
          <span>申请记录 ({{ erpStore.applications.length }})</span>
          <span>{{ showRecords ? "▴" : "▾" }}</span>
        </div>
        <div v-if="showRecords" class="record-list">
          <div v-if="!erpStore.applications.length" class="record-empty">
            暂无申请记录
          </div>
          <div
            v-for="app in erpStore.applications"
            :key="app.id"
            class="record-item"
          >
            <div class="record-top">
              <span class="record-id">{{ app.id }}</span>
              <span class="record-status" :class="app.status">{{
                statusLabel(app.status)
              }}</span>
            </div>
            <div class="record-desc">{{ app.reason }}</div>
            <div class="record-meta">
              {{
                app.formType === "expense" ? `¥${app.amount}` : `${app.days}天`
              }}
              · {{ formatTime(app.createdAt) }}
            </div>
          </div>
        </div>
      </div>
    </aside>

    <!-- 右侧：审批流程展示 -->
    <main class="erp-main">
      <div
        v-if="
          !erpStore.approving &&
          !erpStore.approvalMessages.length &&
          !erpStore.finalResult
        "
        class="main-empty"
      >
        <div class="empty-title">ERP 智能报销与请假</div>
        <div class="empty-desc">
          在左侧用自然语言描述，AI 自动填表后提交，多个 Agent 模拟真实审批流程
        </div>
      </div>
      <div v-else class="approval-area">
        <div class="app-summary">
          <span class="app-type">{{
            erpStore.formType === "expense" ? "报销申请" : "请假申请"
          }}</span>
          <span class="app-id">{{ erpStore.currentAppId }}</span>
        </div>
        <ApprovalTimeline class="timeline-area" />
        <div v-if="erpStore.finalResult" class="done-actions">
          <button class="btn btn-ghost" @click="erpStore.reset()">
            开始新申请
          </button>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { useErpStore } from "@/stores/erp.js";
import SmartFormParser from "@/components/erp/SmartFormParser.vue";
import ApprovalTimeline from "@/components/erp/ApprovalTimeline.vue";

const erpStore = useErpStore();
const showRecords = ref(false);

function switchType(type) {
  erpStore.formType = type;
  erpStore.reset();
}
async function startApproval() {
  await erpStore.submitApproval("申请人");
}
function statusLabel(s) {
  return { pending: "审批中", approved: "已通过", rejected: "已驳回" }[s] || s;
}
function formatTime(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
}
onMounted(() => erpStore.loadApplications());
</script>
