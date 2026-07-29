import crypto from "crypto";
import { config } from "../config/index.js";

class ExactCache {
  constructor() {
    this.store = new Map(); // key → { content, ts, tokens }
    this.stats = { hits: 0, misses: 0, savedTokens: 0 };
  }

  // 用 MD5 把 system + message 组合成 key
  _key(systemPrompt, message) {
    return crypto
      .createHash("md5")
      .update(`${systemPrompt || ""}||${message}`)
      .digest("hex");
  }

  get(systemPrompt, message) {
    const k = this._key(systemPrompt, message);
    const entry = this.store.get(k);

    if (!entry) {
      this.stats.misses++;
      return null;
    }

    // 检查是否过期
    if (Date.now() - entry.ts > config.cache.ttl) {
      this.store.delete(k);
      this.stats.misses++;
      return null;
    }

    this.stats.hits++;
    this.stats.savedTokens += entry.tokens || 0;
    return entry;
  }

  set(systemPrompt, message, { content, tokens = 0 }) {
    const k = this._key(systemPrompt, message);
    this.store.set(k, { content, tokens, ts: Date.now() });

    // 超过 500 条时清除最老的 50 条（简单 LRU）
    if (this.store.size > 500) {
      const oldest = [...this.store.entries()]
        .sort((a, b) => a[1].ts - b[1].ts)
        .slice(0, 50)
        .map(([k]) => k);
      oldest.forEach((k) => this.store.delete(k));
    }
  }

  getStats() {
    const total = this.stats.hits + this.stats.misses;

    return {
      size: this.store.size,
      hits: this.stats.hits,
      misses: this.stats.misses,
      hitRate:
        total === 0 ? "0%" : `${((this.stats.hits / total) * 100).toFixed(1)}%`,
      savedTokens: this.stats.savedTokens,
    };
  }
}

export const cache = new ExactCache();
