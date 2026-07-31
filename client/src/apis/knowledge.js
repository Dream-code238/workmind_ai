/**
 * @description 知识库模块：文档 CRUD、上传、RAG 问答
 */

import http, { fetchStream } from "@/utils/http.js";

/** 加载文档列表（可选分类筛选） */
export function fetchDocuments(category = "") {
  const params = category ? `?category=${category}` : "";
  return http.get(`/knowledge/documents${params}`);
}

/** 加载分类列表 */
export function fetchCategories() {
  return http.get("/knowledge/categories");
}

/**
 * 上传文件（FormData，带进度监听）
 * @param {File} file
 * @param {{ title: string, category: string }} meta
 * @param {(pct: number) => void} onProgress  上传进度回调 0-80
 * @returns {Promise<object>} { document: { id, title, chunks } }
 */
export function uploadFile(file, { title, category }, onProgress) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("title", title || file.name.replace(/\.[^.]+$/, ""));
  formData.append("category", category || "通用");

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/knowledge/documents");

    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable) {
        onProgress?.(Math.round((e.loaded / e.total) * 80));
      }
    });

    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(JSON.parse(xhr.responseText));
      } else {
        reject(
          new Error(JSON.parse(xhr.responseText)?.error?.message || "上传失败"),
        );
      }
    });

    xhr.addEventListener("error", () => reject(new Error("网络错误")));
    xhr.send(formData);
  });
}

/** 上传纯文本内容 */
export function uploadText({ title, category, content }) {
  return http.post("/knowledge/documents", { title, category, content });
}

/** 删除文档 */
export function deleteDocument(docId) {
  return http.delete(`/knowledge/documents/${docId}`);
}

/** RAG 流式问答 */
export function queryStream(question, category, callbacks) {
  return fetchStream(
    "/api/knowledge/query/stream",
    { question, category: category || undefined },
    callbacks,
  );
}
