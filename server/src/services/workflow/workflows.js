import { ChatPromptTemplate } from "@langchain/core/prompts";
import { chatModel } from "../model.js";
import { logger } from "../../utils/logger.js";

// ─── 周报生成工作流 ───
const weeklyReportPrompt = ChatPromptTemplate.fromMessages([
  [
    "system",
    `你是一个专业的周报撰写助手。请根据用户本周的工作内容，生成一份结构清晰的周报。

    周报格式：
    ## 本周工作总结
    1. 【项目/任务名称】完成情况...

    ## 关键成果
    - 成果 1
    - 成果 2

    ## 遇到的问题
    - 问题及解决方案

    ## 下周计划
    1. 计划 1

    要求：
    - 语言精炼、数据说话
    - 突出成果和进度
    - 问题和计划要有可行性`,
  ],
  ["human", "{input}"],
]);

export async function generateWeeklyReport(content, onToken) {
  const messages = await weeklyReportPrompt.formatMessages({ input: content });
  const stream = await chatModel.stream(messages);
  let fullText = "";
  for await (const chunk of stream) {
    if (chunk.content) {
      fullText += chunk.content;
      onToken?.(chunk.content);
    }
  }
  return fullText;
}

// ─── 会议纪要生成工作流 ───
const meetingPrompt = ChatPromptTemplate.fromMessages([
  [
    "system",
    `你是一个专业的会议纪要撰写助手。根据会议内容生成结构化的会议纪要。

    格式：
    ## 会议信息
    - 主题：
    - 时间：

    ## 参会人员

    ## 议题讨论
    ### 议题 1：

    ## 决议事项
    1. 决议 1

    ## 待办事项
    - [ ] 待办 1 - 负责人 - 截止时间

    要求：事实准确、不遗漏关键决策、待办事项明确`,
  ],
  ["human", "{input}"],
]);

export async function generateMeetingMinutes(content, onToken) {
  const messages = await meetingPrompt.formatMessages({ input: content });
  const stream = await chatModel.stream(messages);
  let fullText = "";
  for await (const chunk of stream) {
    if (chunk.content) {
      fullText += chunk.content;
      onToken?.(chunk.content);
    }
  }
  return fullText;
}

// ─── 邮件生成工作流 ───
const emailPrompt = ChatPromptTemplate.fromMessages([
  [
    "system",
    `你是一个专业的商务邮件撰写助手。根据用户提供的信息生成邮件。

    格式：
    主题：[邮件主题]

    [收件人称谓]：

    [邮件正文，逻辑清晰、表达得体]

    此致
    敬礼
    [落款]

    要求：
    - 根据收件人角色调整语气
    - 商务邮件要正式但不生硬
    - 重点突出、避免冗长`,
  ],
  ["human", `收件人：{recipient}\n邮件目的：{purpose}\n补充信息：{details}`],
]);

export async function generateEmail(recipient, purpose, details, onToken) {
  const messages = await emailPrompt.formatMessages({
    recipient,
    purpose,
    details: details || "无",
  });
  const stream = await chatModel.stream(messages);
  let fullText = "";
  for await (const chunk of stream) {
    if (chunk.content) {
      fullText += chunk.content;
      onToken?.(chunk.content);
    }
  }
  return fullText;
}

// ─── PRD 生成工作流 ───
const prdPrompt = ChatPromptTemplate.fromMessages([
  [
    "system",
    `你是一个资深产品经理。根据用户需求生成产品需求文档（PRD）。

    PRD 格式：
    ## 1. 产品概述
    ### 1.1 产品背景
    ### 1.2 产品目标

    ## 2. 用户分析
    ### 2.1 目标用户
    ### 2.2 用户痛点

    ## 3. 功能需求
    ### 3.1 核心功能
    ### 3.2 功能详情（含流程图描述）

    ## 4. 非功能性需求
    - 性能
    - 安全

    ## 5. 验收标准

    要求：
    - 以用户价值为导向
    - 功能描述要有具体的交互和逻辑
    - 尽量覆盖边界情况`,
  ],
  ["human", "{input}"],
]);

export async function generatePRD(content, onToken) {
  const messages = await prdPrompt.formatMessages({ input: content });
  const stream = await chatModel.stream(messages);
  let fullText = "";
  for await (const chunk of stream) {
    if (chunk.content) {
      fullText += chunk.content;
      onToken?.(chunk.content);
    }
  }
  return fullText;
}

// 获取所有工作流模板
export function getWorkflowTemplates() {
  return [
    {
      id: "weekly_report",
      name: "周报生成",
      desc: "输入本周工作内容，生成结构清晰的周报",
      icon: "📊",
      fields: [
        {
          key: "content",
          label: "本周工作内容",
          type: "textarea",
          required: true,
        },
      ],
      generate: generateWeeklyReport,
    },
    {
      id: "meeting_minutes",
      name: "会议纪要",
      desc: "输入会议记录，生成结构化会议纪要",
      icon: "📋",
      fields: [
        {
          key: "content",
          label: "会议内容/录音文本",
          type: "textarea",
          required: true,
        },
      ],
      generate: generateMeetingMinutes,
    },
    {
      id: "email",
      name: "邮件撰写",
      desc: "输入收件人和目的，生成专业商务邮件",
      icon: "📧",
      fields: [
        { key: "recipient", label: "收件人", type: "text", required: true },
        { key: "purpose", label: "邮件目的", type: "text", required: true },
        {
          key: "details",
          label: "补充信息",
          type: "textarea",
          required: false,
        },
      ],
      generate: (fields, onToken) =>
        generateEmail(
          fields.recipient,
          fields.purpose,
          fields.details,
          onToken,
        ),
    },
    {
      id: "prd",
      name: "PRD 生成",
      desc: "输入产品需求，生成产品需求文档",
      icon: "📄",
      fields: [
        {
          key: "content",
          label: "产品需求描述",
          type: "textarea",
          required: true,
        },
      ],
      generate: generatePRD,
    },
  ];
}
