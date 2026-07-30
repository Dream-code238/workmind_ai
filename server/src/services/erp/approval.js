import { chatModel } from "../model.js";

// 审批节点角色
const APPROVERS = {
  manager: {
    name: "直属经理",
    prompt: `你是一个部门经理，负责审批员工的报销和请假申请。
审核要点：
- 金额是否合理（大于 5000 元需特别注意）
- 原因是否正当
- 是否符合公司政策
回复格式：{"approved": true/false, "comment": "审批意见"}`,
  },
  finance: {
    name: "财务",
    prompt: `你是财务审批人员，负责审核报销申请。
审核要点：
- 费用类别是否符合预算
- 金额是否在预算范围内
- 发票信息是否合规
回复格式：{"approved": true/false, "comment": "财务审核意见"}`,
  },
  hr: {
    name: "HR",
    prompt: `你是 HR 审批人员，负责审核请假申请。
审核要点：
- 请假类型是否合理
- 是否有足够的假期余额
- 是否提前申请
回复格式：{"approved": true/false, "comment": "HR 审核意见"}`,
  },
};

/**
 * 执行审批流程
 * 报销：经理 → 财务
 * 请假：经理 → HR
 */
export async function runApproval(formData, onProgress) {
  const type = formData.type;
  const steps = [];

  // 确定审批链
  const approverKeys =
    type === "请假" ? ["manager", "hr"] : ["manager", "finance"];

  for (const key of approverKeys) {
    const approver = APPROVERS[key];
    onProgress?.({ step: approver.name, status: "pending" });

    // 构造给审批 Agent 的输入
    const input = JSON.stringify(formData, null, 2);

    const model = chatModel.withStructuredOutput({
      type: "object",
      properties: {
        approved: { type: "boolean" },
        comment: { type: "string" },
      },
      required: ["approved", "comment"],
    });

    const result = await model.invoke([
      { role: "system", content: approver.prompt },
      { role: "user", content: `请审核以下申请：\n${input}` },
    ]);

    steps.push({
      approver: approver.name,
      approved: result.approved,
      comment: result.comment,
    });

    onProgress?.({
      step: approver.name,
      status: result.approved ? "approved" : "rejected",
      comment: result.comment,
    });

    // 如果某个环节被拒，流程终止
    if (!result.approved) break;
  }

  return {
    finalApproved: steps.every((s) => s.approved),
    steps,
  };
}
