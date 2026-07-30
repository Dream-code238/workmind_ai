<!-- 工作流节点可视化：纵向流程图，展示每个节点的状态 -->
<template>
  <div class="wf-graph">
    <div v-for="(node, idx) in nodes" :key="node.id" class="wf-step">
      <!-- 节点卡片 -->
      <div class="node-card" :class="nodeClass(node)">
        <div class="node-status-circle" :class="nodeClass(node)">
          <span v-if="nodeState(node.id) === 'done'" class="icon-done">✓</span>
          <span
            v-else-if="nodeState(node.id) === 'running'"
            class="spinner-sm"
          />
          <span v-else-if="nodeState(node.id) === 'waiting'" class="icon-wait"
            >⏸</span
          >
          <span v-else class="step-num">{{ idx + 1 }}</span>
        </div>
        <div class="node-body">
          <div class="node-row">
            <span class="node-label">{{ node.label }}</span>
            <span v-if="node.isHuman" class="human-badge">人工</span>
            <span class="status-label" :class="nodeState(node.id)">{{
              statusText(node.id, node.isHuman)
            }}</span>
          </div>
          <div v-if="nodeOutput(node.id)" class="node-output">
            {{ nodeOutput(node.id) }}
          </div>
          <div
            v-if="node.isHuman && nodeState(node.id) === 'waiting'"
            class="review-hint"
          >
            👆 请查看上方的中间产物，填写修改意见后点击继续
          </div>
        </div>
      </div>

      <!-- 节点之间的连接线 -->
      <div v-if="idx < nodes.length - 1" class="connector">
        <div
          class="connector-line"
          :class="{ lit: nodeState(node.id) === 'done' }"
        />
        <div
          class="connector-arrow"
          :class="{ lit: nodeState(node.id) === 'done' }"
        >
          ▼
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useWorkflowStore } from "@/stores/workflow.js";

const props = defineProps({ nodes: { type: Array, default: () => [] } });
const wfStore = useWorkflowStore();

function nodeState(id) {
  return wfStore.nodeStates[id] || "idle";
}
function nodeOutput(id) {
  return wfStore.nodeOutputs[id] || "";
}
function nodeClass(node) {
  return nodeState(node.id);
}
function statusText(id, isHuman) {
  const s = nodeState(id);
  if (s === "running") return "执行中";
  if (s === "done") return "完成";
  if (s === "waiting") return "等待审核";
  if (s === "idle") return isHuman ? "待审核" : "等待";
  return s;
}
</script>
