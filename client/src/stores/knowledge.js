// 知识库模块状态：文档列表、上传、问答
import { defineStore } from "pinia";
import { ref } from "vue";
import {
  fetchDocuments,
  fetchCategories,
  uploadFile as apiUploadFile,
  uploadText as apiUploadText,
  deleteDocument,
  queryStream,
} from "@/apis/knowledge.js";
import { useAppStore } from "./app.js";

export const useKnowledgeStore = defineStore("knowledge", () => {
  const appStore = useAppStore();

  // ── 文档管理 ───────────────────────────────────────────────
  const documents = ref([]);
  const categories = ref([]);
  const uploading = ref(false);
  const uploadProgress = ref(0); // 0-100

  async function loadDocuments(category = "") {
    const data = await fetchDocuments(category);
    documents.value = data.documents;
  }

  async function loadCategories() {
    const data = await fetchCategories();
    categories.value = data.categories;
  }

  // 上传文件
  async function uploadFile(file, { title, category }) {
    uploading.value = true;
    uploadProgress.value = 0;

    try {
      const result = await apiUploadFile(file, { title, category }, (pct) => {
        uploadProgress.value = pct;
      });
      uploadProgress.value = 100;

      await loadDocuments();
      await loadCategories();
      appStore.toast.success(
        `「${result.document.title}」已成功入库，共 ${result.document.chunks} 个片段`,
      );
      return result.document;
    } catch (err) {
      appStore.toast.error(err.message || "上传失败");
      throw err;
    } finally {
      uploading.value = false;
      uploadProgress.value = 0;
    }
  }

  // 上传纯文本内容
  async function uploadText({ title, category, content }) {
    uploading.value = true;
    try {
      const data = await apiUploadText({ title, category, content });
      await loadDocuments();
      await loadCategories();
      appStore.toast.success(`「${data.document.title}」已成功入库`);
      return data.document;
    } catch (err) {
      appStore.toast.error("入库失败：" + (err.message || "未知错误"));
      throw err;
    } finally {
      uploading.value = false;
    }
  }

  async function deleteDocument(docId) {
    const doc = documents.value.find((d) => d.id === docId);
    await deleteDocument(docId);
    documents.value = documents.value.filter((d) => d.id !== docId);
    appStore.toast.success(`「${doc?.title}」已删除`);
  }

  // ── RAG 问答 ───────────────────────────────────────────────
  const messages = ref([]); // 问答历史
  const querying = ref(false);
  const filterCategory = ref("");

  let msgId = 0;

  async function query(question) {
    if (!question.trim() || querying.value) return;
    querying.value = true;

    messages.value.push({
      id: ++msgId,
      role: "user",
      content: question,
      time: new Date().toISOString(),
    });

    const aiMsg = {
      id: ++msgId,
      role: "assistant",
      content: "",
      sources: [],
      status: "正在检索相关文档...",
      streaming: true,
    };
    messages.value.push(aiMsg);

    await queryStream(question, filterCategory.value || undefined, {
      onToken: (token) => {
        aiMsg.content += token;
        aiMsg.status = "";
      },
      onEvent: (event, data) => {
        if (event === "sources") {
          aiMsg.sources = data.sources;
        }
        if (event === "status") {
          aiMsg.status = data.message;
        }
      },
      onDone: () => {
        aiMsg.streaming = false;
        aiMsg.status = "";
      },
      onError: (err) => {
        aiMsg.streaming = false;
        aiMsg.status = "";
        aiMsg.content = aiMsg.content || "查询失败，请重试。";
        appStore.toast.error(err.message);
      },
    });

    querying.value = false;
  }

  function clearMessages() {
    messages.value = [];
  }

  return {
    documents,
    categories,
    uploading,
    uploadProgress,
    messages,
    querying,
    filterCategory,
    loadDocuments,
    loadCategories,
    uploadFile,
    uploadText,
    deleteDocument,
    query,
    clearMessages,
  };
});
