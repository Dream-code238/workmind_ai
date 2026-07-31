FROM node:20-alpine

WORKDIR /app

# 复制依赖文件
COPY package.json ./
RUN npm install --production

# 复制源码
COPY src/ ./src/

# 暴露端口
EXPOSE 3000

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

CMD ["node", "src/index.js"]