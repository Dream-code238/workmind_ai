import { tool } from "@langchain/core/tools";
import { z } from "zod";

/**
 * 工具 1：计算器
 * AI 可以调用这个工具做数学计算
 */
export const calculatorTool = tool(
  async ({ expression }) => {
    try {
      // 安全过滤（只允许数学表达式）
      const sanitized = expression.replace(/[^0-9+\-*/().%\s]/g, "");
      const result = Function(`"use strict"; return (${sanitized})`)();
      return String(result);
    } catch (e) {
      return `计算错误: ${e.message}`;
    }
  },
  {
    name: "calculator",
    description: '执行数学计算。输入一个数学表达式，如 "2 + 3 * 4"',
    schema: z.object({
      expression: z.string().describe("要计算的数学表达式"),
    }),
  },
);

/**
 * 工具 2：网页搜索（模拟）
 * 实际项目中可以接入真实的搜索 API
 */
export const webSearchTool = tool(
  async ({ query }) => {
    // 模拟搜索结果
    return `关于"${query}"的搜索结果（模拟）：
    1. 相关文章介绍了该主题的基本概念
    2. 最新的研究表明该领域正在快速发展
    3. 多位专家建议关注该技术的实际应用场景`;
  },
  {
    name: "web_search",
    description: "在互联网上搜索信息。当需要获取最新信息时使用。",
    schema: z.object({
      query: z.string().describe("搜索关键词"),
    }),
  },
);

/**
 * 工具 3：日期时间
 */
export const dateTimeTool = tool(
  async ({}) => {
    const now = new Date();
    return `当前时间：${now.toLocaleString("zh-CN")}
星期：${["日", "一", "二", "三", "四", "五", "六"][now.getDay()]}
时间戳：${now.getTime()}`;
  },
  {
    name: "get_datetime",
    description: "获取当前日期和时间",
    schema: z.object({}),
  },
);

// 工具集合
export const tools = [calculatorTool, webSearchTool, dateTimeTool];
