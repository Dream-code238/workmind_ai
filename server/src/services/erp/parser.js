import { ChatPromptTemplate } from "@langchain/core/prompts";
import { chatModel } from "../model.js";
import { z } from "zod";

/**
 * 用结构化输出来解析自然语言
 * 这是 withStructuredOutput 的又一个实际应用
 */
export async function parseExpense(text) {
  const model = chatModel.withStructuredOutput(
    z.object({
      type: z.enum(["报销", "请假", "unknown"]).describe("单据类型"),
      // 报销字段
      category: z.string().optional().describe("费用类别：差旅/办公/招待/其他"),
      amount: z.number().optional().describe("金额，单位元"),
      date: z.string().optional().describe("费用日期，YYYY-MM-DD"),
      description: z.string().optional().describe("费用说明"),
      // 请假字段
      leaveType: z
        .string()
        .optional()
        .describe("请假类型：年假/事假/病假/调休"),
      startDate: z.string().optional().describe("开始日期"),
      endDate: z.string().optional().describe("结束日期"),
      reason: z.string().optional().describe("请假原因"),
    }),
  );

  const prompt = ChatPromptTemplate.fromMessages([
    [
      "system",
      `从用户的自然语言输入中提取单据信息。
    将中文日期（如"下周一"、"明天"、"3月15日"）统一转为 YYYY-MM-DD 格式。
    如果没有明确金额、日期等数字信息，填写为 0 或 null。`,
    ],
    ["human", "{input}"],
  ]);

  const messages = await prompt.formatMessages({ input: text });
  const result = await model.invoke(messages);

  return result;
}
