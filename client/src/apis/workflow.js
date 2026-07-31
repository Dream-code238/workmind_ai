/**
 * @description 工作流模块：模板、启动流、恢复流
 */

import http, { fetchStream } from "@/utils/http.js";

/** 加载工作流模板列表 */
export function fetchTemplates() {
  return http.get("/workflow/templates");
}

/** 流式启动工作流 */
export function startWorkflowStream(workflowId, input, callbacks) {
  return fetchStream(
    "/api/workflow/start/stream",
    { workflowId, input },
    callbacks,
  );
}

/** 流式恢复工作流（注入人工反馈） */
export function resumeWorkflowStream(threadId, feedback, callbacks) {
  return fetchStream(
    "/api/workflow/resume/stream",
    { threadId, feedback },
    callbacks,
  );
}
