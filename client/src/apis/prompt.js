/**
 * @description Prompt 调试：测试、A/B 对比、模板管理
 */

import http, { fetchStream } from "@/utils/http.js";

/** 流式单次 Prompt 测试 */
export function testPromptStream(config, callbacks) {
  return fetchStream("/api/prompt/test/stream", config, callbacks);
}

/** A/B 对比测试（非流式，等待完整结果） */
export function runAbTest(config) {
  return http.post("/prompt/ab-test", config);
}

/** 加载模板列表 */
export function fetchTemplates() {
  return http.get("/prompt/templates");
}

/** 保存/更新模板 */
export function saveTemplate(form, editingId) {
  const url = editingId
    ? `/prompt/templates/${editingId}`
    : "/prompt/templates";
  const method = editingId ? "put" : "post";
  return http[method](url, form);
}

/** 删除模板 */
export function deleteTemplate(id) {
  return http.delete(`/prompt/templates/${id}`);
}
