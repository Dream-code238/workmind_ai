/**
 * @description ERP 模块：解析、审批、申请记录
 */

import http, { fetchStream } from "@/utils/http.js";

/** 解析自然语言为结构化表单 */
export function parseForm(text, formType) {
  return http.post("/erp/parse", { text, formType });
}

/** 流式提交审批 */
export function submitApprovalStream(
  formData,
  formType,
  applicantName,
  callbacks,
) {
  return fetchStream(
    "/api/erp/submit/stream",
    { formData, formType, applicantName },
    callbacks,
  );
}

/** 加载申请记录列表 */
export function fetchApplications() {
  return http.get("/erp/applications");
}
