<template>
  <div class="chat-input-area">
    <div class="input-wrapper" :class="{ focused }">
      <textarea
        v-model="inputText"
        @focus="focused = true"
        @blur="focused = false"
        @keydown="handleKeydown"
        @input="autoResize"
        placeholder="输入消息... (Enter 发送，Shift+Enter 换行)"
        :disabled="chatStore.loading"
        rows="1"
      />
      <div class="input-actions">
        <span class="char-count" :class="{ warn: inputText.length > 3500 }">
          {{ inputText.length }}/4000
        </span>
        <button v-if="chatStore.loading" class="btn-stop" @click="stopGenerate">
          ⏹ 停止
        </button>
        <button
          v-else
          class="btn-send"
          @click="send"
          :disabled="!inputText.trim()"
        >
          发送 ↵
        </button>
      </div>
    </div>
    <div class="input-tips"><span>Enter 发送 · Shift+Enter 换行</span></div>
  </div>
</template>

<script setup>
import { ref, nextTick } from "vue";
import { useChatStore } from "@/stores/chat.js";

const chatStore = useChatStore();
const inputText = ref("");
const focused = ref(false);
const textareaEl = ref(null);

async function send() {
  const text = inputText.value.trim();
  if (!text || chatStore.loading) return;
  inputText.value = "";
  resetHeight();
  await chatStore.sendMessage(text);
}

function handleKeydown(e) {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    send();
  }
}

function autoResize() {
  const el = textareaEl.value;
  if (!el) return;
  el.style.height = "auto";
  el.style.height = Math.min(el.scrollHeight, 130) + "px";
}

function resetHeight() {
  if (textareaEl.value) textareaEl.value.style.height = "auto";
}

function stopGenerate() {
  chatStore.loading = false;
}
</script>
