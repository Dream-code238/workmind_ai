import { StateGraph, END } from "@langchain/langgraph";
import { HumanMessage, AIMessage, ToolMessage } from "@langchain/core/messages";
import { chatModel } from "../model.js";
import { tools } from "./tools.js";

/**
 * 创建一个 ReAct Agent
 *
 * 图结构：
 * ┌──────────┐
 * │  agent   │ ← 入口：AI 决定下一步做什么
 * └────┬─────┘
 *      │
 *      ├─ 判断是否需要调用工具 ─┐
 *      │                      ↓
 *      │              ┌──────────────┐
 *      │              │    tools     │ ← 执行工具
 *      │              └──────┬───────┘
 *      │                     │
 *      │                     ↓
 *      │              ┌──────────────┐
 *      │              │   summarize  │ ← 汇总工具结果并回答
 *      │              └──────────────┘
 *      ↓
 *  END
 */

export function createAgent() {
  // 把聊天模型绑定工具
  const modelWithTools = chatModel.bindTools(tools);

  // 定义 Agent 节点
  async function agentNode(state) {
    const messages = state.messages || [];
    const response = await modelWithTools.invoke(messages);
    return { messages: [response] };
  }

  // 定义工具执行节点
  async function toolNode(state) {
    const messages = state.messages;
    const lastMessage = messages[messages.length - 1];

    const toolCalls = lastMessage.tool_calls || [];
    const results = [];

    for (const call of toolCalls) {
      const tool = tools.find((t) => t.name === call.name);
      if (tool) {
        const result = await tool.invoke(call.args);
        results.push(
          new ToolMessage({
            content: result,
            tool_call_id: call.id,
          }),
        );
      }
    }

    return { messages: results };
  }

  // 路由函数：判断是否需要调用工具
  function shouldContinue(state) {
    const messages = state.messages;
    const lastMessage = messages[messages.length - 1];

    // AI 消息中含有 tool_calls → 去执行工具
    if (lastMessage.tool_calls?.length) {
      return "tools";
    }
    // 没有 tool_calls → 结束
    return END;
  }

  // 构建状态图
  const graph = new StateGraph({
    channels: {
      messages: { value: (a, b) => (a || []).concat(b || []) },
    },
  })
    .addNode("agent", agentNode)
    .addNode("tools", toolNode)
    .addEdge("__start__", "agent")
    .addConditionalEdges("agent", shouldContinue, {
      tools: "tools",
      [END]: END,
    })
    .addEdge("tools", "agent"); // 工具执行完回到 agent

  return graph.compile();
}
