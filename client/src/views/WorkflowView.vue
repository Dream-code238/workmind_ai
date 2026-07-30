<template>
  <div class="workflow-view">
    <!-- 左侧：模板选择 + 流程图 -->
    <aside class="wf-sidebar">
      <div class="template-section">
        <div class="section-label">选择工作流模板</div>
        <div class="template-grid">
          <div
            v-for="t in wfStore.templates"
            :key="t.id"
            class="template-card"
            :class="{ active: wfStore.selectedTemplate === t.id }"
            @click="selectAndReset(t.id)"
          >
            <div class="tpl-info">
              <div class="tpl-title">{{ t.title }}</div>
              <div class="tpl-desc">{{ t.desc }}</div>
            </div>
          </div>
        </div>
      </div>
      <div v-if="currentMeta" class="graph-section">
        <div class="section-label">执行流程</div>
        <WorkflowGraph :nodes="currentMeta.nodes" />
      </div>
    </aside>

    <!-- 右侧：五阶段切换 -->
    <main class="wf-main">
      <div v-if="!wfStore.selectedTemplate" class="empty-state">
        <div class="empty-icon">⚙️</div>
        <div class="empty-title">选择一个工作流模板</div>
      </div>

      <template v-else>
        <!-- 阶段1：输入 -->
        <div
          v-if="!wfStore.running && !wfStore.paused && !wfStore.result"
          class="input-phase"
        >
          <div v-if="currentMeta.extraField" class="form-field">
            <label class="field-label">{{
              currentMeta.extraField.label
            }}</label>
            <input
              v-model="extraValue"
              class="input"
              :placeholder="currentMeta.extraField.placeholder"
            />
          </div>
          <div class="form-field">
            <label class="field-label">{{ currentMeta.inputLabel }}</label>
            <textarea
              v-model="mainInput"
              class="input"
              :placeholder="currentMeta.inputPlaceholder"
              rows="8"
            />
            <div class="char-count">{{ mainInput.length }} 字</div>
          </div>
          <button
            class="btn btn-primary start-btn"
            @click="startWorkflow"
            :disabled="!mainInput.trim()"
          >
            ▶ 开始执行
          </button>
        </div>

        <!-- 阶段2：执行中 -->
        <div
          v-if="wfStore.running && !wfStore.paused && !wfStore.streamBuffer"
          class="running-phase"
        >
          <div class="spinner" />
          <span>工作流执行中，请稍候...</span>
        </div>

        <!-- 阶段3：人工审核 -->
        <div v-if="wfStore.paused" class="review-phase">
          <HumanReviewPanel
            @approve="resumeWithFeedback"
            @abort="handleAbort"
          />
        </div>

        <!-- 阶段4：流式输出最终内容 -->
        <div
          v-if="wfStore.running && wfStore.streamBuffer"
          class="streaming-phase"
        >
          <div class="streaming-label">正在生成最终内容...</div>
          <div
            class="streaming-content markdown-body"
            v-html="renderMd(wfStore.streamBuffer)"
          />
          <span class="cursor-blink" />
        </div>

        <!-- 阶段5：结果展示 -->
        <div v-if="wfStore.result && !wfStore.running" class="result-phase">
          <div class="result-header">
            <span>✅ 生成完成</span>
            <div class="result-actions">
              <button class="btn btn-ghost btn-sm" @click="copyResult">
                复制内容
              </button>
              <button class="btn btn-ghost btn-sm" @click="restart">
                重新开始
              </button>
            </div>
          </div>
          <div
            class="result-content markdown-body"
            v-html="renderMd(wfStore.result)"
          />
        </div>
      </template>
    </main>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import { marked } from "marked";
import hljs from "highlight.js";
import { useWorkflowStore } from "@/stores/workflow.js";
import { useAppStore } from "@/stores/app.js";
import WorkflowGraph from "@/components/workflow/WorkflowGraph.vue";
import HumanReviewPanel from "@/components/workflow/HumanReviewPanel.vue";

const wfStore = useWorkflowStore();
const appStore = useAppStore();
const mainInput = ref("");
const extraValue = ref("");

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

const currentMeta = computed(
  () =>
    wfStore.templates.find((t) => t.id === wfStore.selectedTemplate) || null,
);

function selectAndReset(id) {
  wfStore.selectTemplate(id);
  mainInput.value = "";
  extraValue.value = "";
}

async function startWorkflow() {
  if (!mainInput.value.trim() || !currentMeta.value) return;
  // 根据模板类型映射字段名（向后端发送规范化的 payload）
  const fieldMaps = {
    weekly_report: { mainKey: "points", extraKey: "dept" },
    meeting_minutes: { mainKey: "rawNotes", extraKey: "meetingTitle" },
    email_polish: { mainKey: "draft", extraKey: "recipient" },
    prd_skeleton: { mainKey: "description", extraKey: null },
  };
  const m = fieldMaps[wfStore.selectedTemplate] || {
    mainKey: "input",
    extraKey: null,
  };
  const payload = { [m.mainKey]: mainInput.value };
  if (m.extraKey && extraValue.value.trim())
    payload[m.extraKey] = extraValue.value;
  await wfStore.startWorkflow(payload);
}

async function resumeWithFeedback(feedback) {
  await wfStore.resumeWorkflow(feedback);
}
function handleAbort() {
  wfStore.reset();
  mainInput.value = "";
  extraValue.value = "";
}
async function copyResult() {
  await navigator.clipboard.writeText(wfStore.result);
  appStore.toast.success("已复制到剪贴板");
}
function restart() {
  wfStore.reset();
}
onMounted(() => wfStore.loadTemplates());
</script>
