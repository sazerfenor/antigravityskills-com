#!/bin/bash

# 清理 3000 端口占用
echo "🔍 Checking port 3000..."
PORT_PID=$(lsof -ti :3000)

if [ ! -z "$PORT_PID" ]; then
  echo "⚠️  Port 3000 is occupied by PID: $PORT_PID"
  echo "🔪 Killing process..."
  kill -9 $PORT_PID
  sleep 1
  echo "✅ Port 3000 freed"
else
  echo "✅ Port 3000 is available"
fi

# 启动开发服务器
echo "🚀 Starting development server on port 3000..."
pnpm dev
