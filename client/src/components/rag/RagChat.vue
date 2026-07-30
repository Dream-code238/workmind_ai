<!-- RAG 问答界面：带来源标注的对话，展示检索到的文档片段 -->
<template>
  <div class="rag-chat">
    <div class="filter-bar">
      <span class="filter-label">搜索范围：</span>
      <select v-model="knStore.filterCategory" class="input filter-select">
        <option
          v-for="cat in knStore.categories"
          :key="cat.value"
          :value="cat.value"
        >
          {{ cat.label }}
        </option>
      </select>
      <button
        v-if="knStore.messages.length"
        class="btn-ghost btn-sm"
        @click="knStore.clearMessages()"
      >
        清空记录
      </button>
    </div>

    <div class="message-list" ref="listEl">
      <!-- 空状态 + 示例问题 -->
      <div v-if="!knStore.messages.length" class="empty-state">
        <div class="icon">🔍</div>
        <div class="title">向知识库提问</div>
        <div class="desc">AI 会检索相关文档，给出有来源标注的回答</div>
        <div class="examples">
          <button
            v-for="q in exampleQuestions"
            :key="q"
            class="example-btn"
            @click="knStore.query(q)"
          >
            {{ q }}
          </button>
        </div>
      </div>

      <!-- 消息列表 -->
      <div
        v-for="msg in knStore.messages"
        :key="msg.id"
        class="message-wrap"
        :class="msg.role"
      >
        <!-- 用户问题 -->
        <div v-if="msg.role === 'user'" class="user-msg">
          <div class="bubble user-bubble">{{ msg.content }}</div>
        </div>

        <!-- AI 回答（含来源标注） -->
        <div v-else class="ai-msg">
          <div v-if="msg.status && !msg.content" class="status-hint">
            <div class="spinner" />
            <span>{{ msg.status }}</span>
          </div>

          <!-- 来源文档 -->
          <div v-if="msg.sources?.length" class="sources-panel">
            <div class="sources-label">
              📎 参考文档（{{ msg.sources.length }} 条）
            </div>
            <div class="source-list">
              <div
                v-for="(src, i) in msg.sources"
                :key="i"
                class="source-item"
                :title="src.content"
              >
                <span class="source-num">[{{ i + 1 }}]</span>
                <span class="source-title">{{ src.title }}</span>
                <span class="source-score"
                  >{{ (src.score * 100).toFixed(0) }}%</span
                >
                <button class="source-expand" @click="toggleSource(msg.id, i)">
                  {{ expandedSources[`${msg.id}_${i}`] ? "▲" : "▼" }}
                </button>
                <div
                  v-if="expandedSources[`${msg.id}_${i}`]"
                  class="source-content"
                >
                  {{ src.content }}
                </div>
              </div>
            </div>
          </div>

          <div
            v-if="msg.content || msg.streaming"
            class="bubble ai-bubble markdown-body"
            v-html="renderMarkdown(msg.content)"
          />
          <span v-if="msg.streaming && msg.content" class="cursor-blink" />
        </div>
      </div>
      <div ref="bottomEl" />
    </div>

    <!-- 输入框 -->
    <div class="input-area">
      <div class="input-wrap" :class="{ focused }">
        <textarea
          v-model="question"
          @focus="focused = true"
          @blur="focused = false"
          @keydown.enter.prevent="handleEnter"
          @keydown.shift.enter="null"
          placeholder="向知识库提问... (Enter 发送，Shift+Enter 换行)"
          :disabled="knStore.querying"
          rows="1"
          class="qa-input"
          ref="textareaEl"
          @input="autoResize"
        />
        <button
          class="btn-send"
          @click="send"
          :disabled="!question.trim() || knStore.querying"
        >
          {{ knStore.querying ? "..." : "提问" }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, nextTick, reactive } from "vue";
import { marked } from "marked";
import hljs from "highlight.js";
import { useKnowledgeStore } from "@/stores/knowledge.js";

const knStore = useKnowledgeStore();
const listEl = ref(null);
const bottomEl = ref(null);
const textareaEl = ref(null);
const question = ref("");
const focused = ref(false);
const expandedSources = reactive({});

const exampleQuestions = [
  "请介绍一下员工请假的相关规定",
  "差旅费报销标准是多少？",
  "产品的主要功能有哪些？",
];

marked.setOptions({
  highlight: (code, lang) => {
    if (lang && hljs.getLanguage(lang))
      return hljs.highlight(code, { language: lang }).value;
    return hljs.highlightAuto(code).value;
  },
  breaks: true,
});

function renderMarkdown(text) {
  if (!text) return "";
  try {
    return marked(text);
  } catch {
    return text;
  }
}
function handleEnter(e) {
  if (e.shiftKey) return;
  send();
}
async function send() {
  const q = question.value.trim();
  if (!q || knStore.querying) return;
  question.value = "";
  resetHeight();
  await knStore.query(q);
}
function autoResize() {
  const el = textareaEl.value;
  if (!el) return;
  el.style.height = "auto";
  el.style.height = Math.min(el.scrollHeight, 100) + "px";
}
function resetHeight() {
  if (textareaEl.value) textareaEl.value.style.height = "auto";
}
function toggleSource(msgId, idx) {
  const key = `${msgId}_${idx}`;
  expandedSources[key] = !expandedSources[key];
}

// 新消息自动滚底
watch(
  () => knStore.messages.length,
  async () => {
    await nextTick();
    bottomEl.value?.scrollIntoView({ behavior: "smooth" });
  },
);

// 流式内容也滚底（instant 模式避免动画堆积）
watch(
  () => knStore.messages[knStore.messages.length - 1]?.content,
  async () => {
    if (knStore.querying) {
      await nextTick();
      bottomEl.value?.scrollIntoView({ behavior: "instant" });
    }
  },
);
</script>
