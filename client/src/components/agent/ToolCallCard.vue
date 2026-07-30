<!-- 单次工具调用卡片：工具名、入参、出参、执行时间、状态 -->
<template>
  <div class="tool-card" :class="step.status">
    <div class="card-header" @click="toggle">
      <div class="left">
        <span class="status-dot" :class="`dot-${step.status}`" />
        <span class="step-num">#{{ step.id }}</span>
        <span class="tool-label">{{ step.label || step.toolName }}</span>
      </div>
      <div class="right">
        <span v-if="step.durationMs" class="duration"
          >{{ step.durationMs }}ms</span
        >
        <span class="status-tag" :class="step.status">{{ statusText }}</span>
        <span class="arrow">{{ expanded ? "▴" : "▾" }}</span>
      </div>
    </div>

    <!-- 展开区域：入参 + 出参 -->
    <Transition name="slide">
      <div v-if="expanded" class="card-body">
        <div v-if="argsText" class="detail-section">
          <div class="section-label">输入参数</div>
          <pre class="code-block args">{{ argsText }}</pre>
        </div>
        <div v-if="step.result" class="detail-section">
          <div class="section-label">执行结果</div>
          <pre class="code-block result">{{ resultText }}</pre>
        </div>
        <div v-if="step.status === 'running'" class="loading-row">
          <div class="spinner" />
          <span>正在执行...</span>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, computed } from "vue";

const props = defineProps({ step: { type: Object, required: true } });
const expanded = ref(true); // 默认展开

function toggle() {
  if (props.step.status !== "running") expanded.value = !expanded.value;
}

const statusText = computed(
  () =>
    ({
      running: "执行中",
      done: "完成",
      error: "失败",
    })[props.step.status] || props.step.status,
);

// 格式化入参为可读 JSON
const argsText = computed(() => {
  const args = props.step.args;
  if (!args) return "";
  if (typeof args === "string") return args;
  try {
    return JSON.stringify(args, null, 2);
  } catch {
    return String(args);
  }
});

// 格式化出参，尝试 prettify JSON
const resultText = computed(() => {
  const r = props.step.result;
  if (!r) return "";
  if (typeof r === "string") {
    try {
      return JSON.stringify(JSON.parse(r), null, 2);
    } catch {
      return r;
    }
  }
  try {
    return JSON.stringify(r, null, 2);
  } catch {
    return String(r);
  }
});
</script>
