// ERP 模块状态：表单解析、审批流、申请记录
import { defineStore } from "pinia";
import { ref } from "vue";
import { fetchStream } from "@/utils/http.js";
import http from "@/utils/http.js";
import { useAppStore } from "./app.js";

export const useErpStore = defineStore("erp", () => {
  const appStore = useAppStore();

  // ── 当前表单 ──────────────────────────────────────────────
  const formType = ref("expense"); // 'expense' | 'leave'
  const parsedForm = ref(null); // AI 解析出的结构化表单数据
  const parsing = ref(false);

  // ── 审批流状态 ────────────────────────────────────────────
  const approvalMessages = ref([]); // 审批对话气泡列表
  const approvalSteps = ref([]); // [{ roleId, role, status }]
  const approving = ref(false);
  const finalResult = ref(null); // { approved, status }
  const currentAppId = ref("");

  // ── 申请列表 ──────────────────────────────────────────────
  const applications = ref([]);

  // ── 解析表单（调用后端 AI 解析接口）───────────────────────
  async function parseForm(text) {
    if (!text.trim() || parsing.value) return;
    parsing.value = true;
    parsedForm.value = null;
    try {
      const data = await http.post("/erp/parse", {
        text,
        formType: formType.value,
      });
      parsedForm.value = data.form;
      return data.form;
    } catch (err) {
      appStore.toast.error("解析失败，请重新描述");
    } finally {
      parsing.value = false;
    }
  }

  // ── 提交审批（SSE 流式接收审批过程）─────────────────────
  async function submitApproval(applicantName = "申请人") {
    if (!parsedForm.value || approving.value) return;
    approving.value = true;
    approvalMessages.value = [];
    approvalSteps.value = [];
    finalResult.value = null;

    await fetchStream(
      "/api/erp/submit/stream",
      {
        formData: parsedForm.value,
        formType: formType.value,
        applicantName,
      },
      {
        onEvent: (event, data) => {
          if (event === "start") {
            currentAppId.value = data.appId;
          }

          // 公布审批流程
          if (event === "plan") {
            approvalSteps.value = data.approvers.map((role) => ({
              roleId: role.id,
              role,
              status: "pending",
            }));
          }

          // 某个审批人开始审核
          if (event === "approver_start") {
            const step = approvalSteps.value.find(
              (s) => s.roleId === data.roleId,
            );
            if (step) step.status = "running";
          }

          // 对话消息（最核心的部分）
          if (event === "message") {
            approvalMessages.value.push({
              id: `msg_${Date.now()}_${Math.random()}`,
              from: data.from,
              role: data.role,
              content: data.content,
              type: data.type,
              time: new Date().toISOString(),
            });
          }

          // 某个审批人完成
          if (event === "approver_done") {
            const step = approvalSteps.value.find(
              (s) => s.roleId === data.roleId,
            );
            if (step) step.status = data.approved ? "approved" : "rejected";
          }

          // 最终结果
          if (event === "final") {
            finalResult.value = data;
            approving.value = false;
            loadApplications();
          }

          if (event === "done") {
            approving.value = false;
          }
        },
        onError: (err) => {
          approving.value = false;
          appStore.toast.error(err.message || "审批流程出错");
        },
      },
    );
  }

  // ── 申请记录 ──────────────────────────────────────────────
  async function loadApplications() {
    try {
      const data = await http.get("/erp/applications");
      applications.value = data.applications;
    } catch {}
  }

  function reset() {
    parsedForm.value = null;
    approvalMessages.value = [];
    approvalSteps.value = [];
    finalResult.value = null;
    currentAppId.value = "";
  }

  return {
    formType,
    parsedForm,
    parsing,
    approvalMessages,
    approvalSteps,
    approving,
    finalResult,
    currentAppId,
    applications,
    parseForm,
    submitApproval,
    loadApplications,
    reset,
  };
});
