/**
 * @description Agent 模块：工具列表、示例、流式执行
 */

import http, { fetchStream } from "@/utils/http.js";

/** 加载工具列表 */
export function fetchTools() {
  return http.get("/agent/tools");
}

/** 加载示例任务 */
export function fetchExamples() {
  return http.get("/agent/examples");
}

/** 流式执行 Agent 任务 */
export function runAgentStream(task, callbacks) {
  return fetchStream("/api/agent/run", { task }, callbacks);
}
