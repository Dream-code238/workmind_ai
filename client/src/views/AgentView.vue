<template>
  <div class="agent-view">
    <!-- 左侧：任务输入 + 示例 + 工具列表 -->
    <aside class="task-panel">
      <div class="panel-header">
        <span class="panel-title">任务 Agent</span>
        <button
          v-if="agentStore.tasks.length"
          class="btn-text-sm"
          @click="agentStore.clearTasks()"
        >
          清空
        </button>
      </div>
      <div class="task-input-area">
        <textarea
          v-model="taskText"
          class="task-textarea"
          placeholder="描述你的任务，Agent 会自动拆解步骤..."
          :disabled="agentStore.running"
          @keydown.ctrl.enter="runTask"
          rows="4"
        />
        <div class="input-actions">
          <span class="hint">Ctrl+Enter 执行</span>
          <button
            class="btn btn-primary"
            @click="runTask"
            :disabled="!taskText.trim() || agentStore.running"
          >
            {{ agentStore.running ? "执行中..." : "执行任务" }}
          </button>
        </div>
      </div>

      <div class="examples-section">
        <div class="section-label">示例任务</div>
        <div
          v-for="ex in agentStore.examples"
          :key="ex.title"
          class="example-item"
          @click="useExample(ex.task)"
          :class="{ disabled: agentStore.running }"
        >
          <div class="ex-content">
            <div class="ex-title">{{ ex.title }}</div>
            <div class="ex-desc">{{ ex.task.slice(0, 40) }}...</div>
          </div>
        </div>
      </div>

      <div class="tools-section">
        <div class="section-label">
          可用工具（{{ agentStore.toolList.length }}）
        </div>
        <div class="tool-chips">
          <div
            v-for="t in agentStore.toolList"
            :key="t.name"
            class="tool-chip"
            :title="t.description"
          >
            {{ t.label }}
          </div>
        </div>
      </div>
    </aside>

    <!-- 右侧：执行结果 -->
    <main class="execution-panel">
      <div v-if="!agentStore.tasks.length" class="empty-state">
        <div class="empty-title">任务执行 Agent</div>
        <div class="empty-desc">
          在左侧输入任务，Agent 会自动规划步骤，调用合适的工具完成
        </div>
        <div class="feature-tags">
          <span class="tag tag-blue">联网搜索</span>
          <span class="tag tag-green">知识库检索</span>
          <span class="tag tag-purple">数学计算</span>
          <span class="tag tag-amber">生成报告</span>
        </div>
      </div>

      <div v-else class="task-list">
        <div v-for="task in agentStore.tasks" :key="task.id" class="task-block">
          <div class="task-header">
            <div class="task-meta">
              <span class="task-status-dot" :class="`dot-${task.status}`" />
              <span class="task-index">任务 #{{ task.id }}</span>
              <span class="task-time">{{ formatTime(task.startTime) }}</span>
              <span v-if="task.duration" class="task-duration"
                >{{ (task.duration / 1000).toFixed(1) }}s</span
              >
            </div>
            <div class="task-desc">{{ task.task }}</div>
          </div>

          <!-- 工具调用步骤 -->
          <div v-if="task.steps.length" class="steps-list">
            <ToolCallCard
              v-for="step in task.steps"
              :key="step.id"
              :step="step"
            />
          </div>

          <!-- 最终回答 -->
          <div v-if="task.answer" class="final-answer">
            <div class="answer-header">
              <span>最终回答</span>
              <button class="btn-copy" @click="copyAnswer(task.answer)">
                复制
              </button>
            </div>
            <div
              class="answer-content markdown-body"
              v-html="renderMd(task.answer)"
            />
            <span
              v-if="task.status === 'running' && task.answer"
              class="cursor-blink"
            />
          </div>

          <div v-if="task.status === 'error'" class="error-hint">
            {{ task.answer || "任务执行失败，请重试" }}
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { marked } from "marked";
import hljs from "highlight.js";
import { useAgentStore } from "@/stores/agent.js";
import { useAppStore } from "@/stores/app.js";
import ToolCallCard from "@/components/agent/ToolCallCard.vue";

const agentStore = useAgentStore();
const appStore = useAppStore();
const taskText = ref("");

marked.setOptions({
  highlight: (c, l) =>
    l && hljs.getLanguage(l) ? hljs.highlight(c, { language: l }).value : c,
  breaks: true,
});
function renderMd(t) {
  try {
    return marked(t || "");
  } catch {
    return t;
  }
}
function formatTime(iso) {
  return iso
    ? new Date(iso).toLocaleTimeString("zh-CN", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
    : "";
}
async function runTask() {
  if (!taskText.value.trim() || agentStore.running) return;
  const t = taskText.value.trim();
  taskText.value = "";
  await agentStore.runTask(t);
}
function useExample(task) {
  if (!agentStore.running) taskText.value = task;
}
async function copyAnswer(text) {
  await navigator.clipboard.writeText(text);
  appStore.toast.success("已复制");
}
onMounted(() => agentStore.loadMeta());
</script>
