<!-- 文档列表：展示已入库的文档，支持删除和分类筛选 -->
<template>
  <div class="doc-list-wrapper">
    <div class="list-header">
      <span class="list-title">知识库文档</span>
      <span class="doc-count">{{ filteredDocs.length }} 篇</span>
    </div>

    <div v-if="knStore.categories.length > 1" class="category-tabs">
      <button
        v-for="cat in knStore.categories"
        :key="cat.value"
        class="cat-tab"
        :class="{ active: activeCategory === cat.value }"
        @click="switchCategory(cat.value)"
      >
        {{ cat.label }}
      </button>
    </div>

    <div v-if="!filteredDocs.length" class="empty-state">
      <div class="icon">📭</div>
      <div>还没有文档</div>
      <div class="sub">上传文档后可以进行问答</div>
    </div>

    <div v-else class="doc-items">
      <div v-for="doc in filteredDocs" :key="doc.id" class="doc-item">
        <div class="doc-icon">{{ docIcon(doc) }}</div>
        <div class="doc-info">
          <div class="doc-title">{{ doc.title }}</div>
          <div class="doc-meta">
            <span class="tag tag-gray">{{ doc.category }}</span>
            <span class="meta-item">{{ doc.chunks }} 片段</span>
            <span class="meta-item">{{ doc.chars?.toLocaleString() }} 字</span>
            <span class="meta-item">{{ formatDate(doc.uploadedAt) }}</span>
          </div>
          <div class="doc-preview">{{ doc.preview }}</div>
        </div>
        <button class="btn-delete" @click="confirmDelete(doc)" title="删除文档">
          🗑
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from "vue";
import { useKnowledgeStore } from "@/stores/knowledge.js";

const knStore = useKnowledgeStore();
const activeCategory = ref("");

const filteredDocs = computed(() => {
  if (!activeCategory.value) return knStore.documents;
  return knStore.documents.filter((d) => d.category === activeCategory.value);
});

function switchCategory(cat) {
  activeCategory.value = cat;
  knStore.loadDocuments(cat);
}

function docIcon(doc) {
  const name = doc.fileName || "";
  if (name.endsWith(".pdf")) return "📄";
  if (name.endsWith(".md")) return "📝";
  return "📃";
}

function formatDate(isoStr) {
  if (!isoStr) return "";
  const d = new Date(isoStr);
  const now = new Date();
  const diff = (now - d) / 1000;
  if (diff < 60) return "刚刚";
  if (diff < 3600) return Math.floor(diff / 60) + " 分钟前";
  if (diff < 86400) return Math.floor(diff / 3600) + " 小时前";
  return d.toLocaleDateString("zh-CN", { month: "short", day: "numeric" });
}

async function confirmDelete(doc) {
  if (!confirm(`确定删除「${doc.title}」？删除后无法恢复。`)) return;
  await knStore.deleteDocument(doc.id);
}
</script>
