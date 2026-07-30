// 消息气泡组件

<template>
  <div class="message-wrap" :class="message.role">
    <!-- 用户消息 -->
    <div v-if="message.role === 'user'" class="user-msg">
      <div class="bubble user-bubble">{{ message.content }}</div>
      <div class="avatar">我</div>
    </div>

    <!-- AI 消息 -->
    <div v-else class="ai-msg">
      <div class="avatar ai-avatar">AI</div>
      <div class="ai-content">
        <!-- 缓存标记 -->
        <span v-if="message.fromCache" class="cache-badge">缓存</span>

        <!-- Markdown 渲染 -->
        <div
          class="bubble ai-bubble markdown-body"
          v-html="renderedContent"
        ></div>

        <!-- 流式光标 -->
        <span v-if="message.streaming" class="cursor-blink"></span>

        <!-- 操作按钮 -->
        <div v-if="!message.streaming" class="msg-actions">
          <button @click="copy">{{ copied ? "已复制" : "复制" }}</button>
          <button @click="$emit('regenerate')">重新生成</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from "vue";
import { marked } from "marked";
import hljs from "highlight.js";
import "highlight.js/styles/github-dark.css";

const props = defineProps({
  message: { type: Object, required: true },
});
defineEmits(["regenerate"]);

// 配置 marked
marked.setOptions({
  highlight(code, lang) {
    if (lang && hljs.getLanguage(lang)) {
      return hljs.highlight(code, { language: lang }).value;
    }
    return hljs.highlightAuto(code).value;
  },
  breaks: true, // 换行转 <br>
  gfm: true, // GitHub 风格 Markdown
});

// 将 Markdown 渲染为 HTML
const renderedContent = computed(() => {
  if (!props.message.content) return "";
  try {
    return marked.parse(props.message.content);
  } catch {
    return props.message.content;
  }
});

// 复制功能
const copied = ref(false);
async function copy() {
  try {
    await navigator.clipboard.writeText(props.message.content);
    copied.value = true;
    setTimeout(() => {
      copied.value = false;
    }, 2000);
  } catch {
    // fallback
    const ta = document.createElement("textarea");
    ta.value = props.message.content;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    document.body.removeChild(ta);
    copied.value = true;
    setTimeout(() => {
      copied.value = false;
    }, 2000);
  }
}
</script>

<style lang="less" scoped>
.message-wrap {
  display: flex;
  margin-bottom: 20px;
}

.message-wrap.user {
  justify-content: flex-end;
}

.user-msg,
.ai-msg {
  display: flex;
  gap: 10px;
  max-width: 80%;
  align-items: flex-start;
}

.avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 600;
  flex-shrink: 0;
}

.ai-avatar {
  background: var(--color-primary);
  color: #fff;
}

.user-msg .avatar {
  background: var(--color-border);
}

.bubble {
  padding: 12px 16px;
  border-radius: 12px;
  line-height: 1.7;
}

.user-bubble {
  background: var(--color-primary);
  color: #fff;
  border-bottom-right-radius: 4px;
}

.ai-bubble {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-bottom-left-radius: 4px;
}

.cursor-blink {
  display: inline-block;
  width: 2px;
  height: 18px;
  background: var(--color-primary);
  vertical-align: text-bottom;
  animation: blink 1s step-end infinite;
}

@keyframes blink {
  50% {
    opacity: 0;
  }
}

.cache-badge {
  display: inline-block;
  font-size: 11px;
  padding: 1px 6px;
  border-radius: 4px;
  background: #eef2ff;
  color: var(--color-primary);
  margin-bottom: 4px;
}

.msg-actions {
  margin-top: 6px;
  display: flex;
  gap: 8px;
}

.msg-actions button {
  font-size: 12px;
  padding: 2px 8px;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  background: transparent;
  cursor: pointer;
  color: var(--color-textsub);
}
</style>
