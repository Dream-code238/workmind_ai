<!-- 人工审核面板：展示中间产物 + 填写修改意见 + 继续/放弃 -->
<template>
  <div class="review-panel">
    <div class="review-header">
      <span class="review-icon">👤</span>
      <div>
        <div class="review-title">等待人工审核</div>
        <div class="review-desc">
          请确认上方的分析结果，如需调整可以填写修改意见
        </div>
      </div>
    </div>

    <!-- 中间产物 -->
    <div v-if="intermediates.length" class="intermediates">
      <div
        v-for="item in intermediates"
        :key="item.key"
        class="intermediate-item"
      >
        <div class="item-label">{{ item.label }}</div>
        <div class="item-value">{{ item.value }}</div>
      </div>
    </div>

    <!-- 修改意见 -->
    <div class="feedback-area">
      <label class="feedback-label">修改意见（可选）</label>
      <textarea
        v-model="feedback"
        class="input"
        placeholder="如有问题，在此填写修改要求，AI 会根据你的意见重新生成。留空则直接使用当前结果继续。"
        rows="3"
      />
    </div>

    <!-- 操作按钮 -->
    <div class="review-actions">
      <button class="btn btn-ghost" @click="emit('abort')">取消</button>
      <button
        class="btn btn-primary"
        @click="emit('approve', feedback)"
        :disabled="wfStore.running"
      >
        {{
          wfStore.running
            ? "执行中..."
            : feedback.trim()
              ? "📝 采纳意见并继续"
              : "✅ 确认并继续"
        }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from "vue";
import { useWorkflowStore } from "@/stores/workflow.js";

const emit = defineEmits(["approve", "abort"]);
const wfStore = useWorkflowStore();
const feedback = ref("");
const intermediates = computed(() => wfStore.intermediates);
</script>
