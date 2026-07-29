import { ChatOpenAI } from "@langchain/openai";
import { OpenAIEmbeddings } from "@langchain/openai";
import { ZhipuAIEmbeddings } from "@langchain/community/embeddings/zhipuai";
import { config } from "../config/index.js";

/**
 * 创建对话模型实例
 * @param {object} options
 * @param {number} options.temperature - 随机性：0=确定，1=创意
 * @param {boolean} options.streaming - 是否流式输出
 * @param {array} options.callbacks - LangChain 回调
 */
export function createChatModel({
  temperature = 0.7,
  streaming = false,
  callbacks = [],
} = {}) {
  const instance = new ChatOpenAI({
    model: config.ai.primaryModel, // 'deepseek-chat'
    apiKey: config.ai.deepseekKey,
    configuration: { baseURL: config.ai.baseURL },
    temperature,
    streaming,
    callbacks,
    timeout: 30000,
  });
  // modelName 仅用于 tiktoken 计数，不影响实际调用
  instance.modelName = "gpt-3.5-turbo";
  return instance;
}

/**
 * 创建 Embedding 模型（文本 → 向量，RAG 必用）
 * DeepSeek 暂无 embedding 模型，用智谱 AI 替代
 */

export function createEmbeddings() {
  // 优先使用智谱 AI

  if (config.ai.zhipuKey) {
    return new ZhipuAIEmbeddings({
      apiKey: config.ai.zhipuKey,
      modelName: "embedding-3",
    });
  }

  // 其次使用 OpenAI 兼容接口（如硅基流动）
  if (config.ai.openaiKey) {
    return new OpenAIEmbeddings({
      model: config.ai.embedModel || "BAAI/bge-m3",
      apiKey: config.ai.openaiKey,
      configuration: { baseURL: config.ai.embedBaseURL },
    });
  }

  console.warn("未配置 Embedding API Key，RAG 功能将不可用");
  return null;
}

// ─── 全局单例（应用启动时创建一次，全局复用）───
export const chatModel = createChatModel({ temperature: 0.7, streaming: true });
export const embeddings = createEmbeddings();
