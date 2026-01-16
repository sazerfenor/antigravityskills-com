#!/bin/bash
# Antigravity Skills - 开发启动脚本

set -e
cd "$(dirname "$0")"

echo "================================"
echo "  Antigravity Skills Dev"
echo "================================"
echo ""

# 清理 3000 端口
if lsof -ti:3000 > /dev/null 2>&1; then
    echo "🧹 清理 3000 端口..."
    lsof -ti:3000 | xargs kill -9 2>/dev/null || true
    sleep 1
fi

# 检查 cloudflared
if ! command -v cloudflared &> /dev/null; then
    echo "⚠️  cloudflared 未安装，正在安装..."
    brew install cloudflare/cloudflare/cloudflared
fi

# 启动 cloudflared 隧道
echo "🔄 正在创建公网隧道..."
cloudflared tunnel --url http://localhost:3000 > /tmp/cloudflared.log 2>&1 &
TUNNEL_PID=$!

# 等待 URL 生成（最多 10 秒）
for i in {1..10}; do
    TUNNEL_URL=$(grep -o 'https://.*\.trycloudflare\.com' /tmp/cloudflared.log 2>/dev/null | head -1)
    if [ ! -z "$TUNNEL_URL" ]; then
        break
    fi
    sleep 1
done

echo ""
echo "📍 本地访问: http://localhost:3000"
if [ ! -z "$TUNNEL_URL" ]; then
    echo "🌐 公网访问: $TUNNEL_URL"
else
    echo "⚠️  公网隧道启动失败"
fi
echo ""
echo "按 Ctrl+C 停止服务"
echo "--------------------------------"

# 清理函数
cleanup() {
    echo ""
    echo "🛑 正在停止服务..."
    kill $TUNNEL_PID 2>/dev/null || true
    exit 0
}

trap cleanup SIGINT SIGTERM

# 启动 Next.js 开发服务器
pnpm dev
