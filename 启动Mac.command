#!/bin/bash
# WealthVault 启动脚本
cd "$(dirname "$0")"
clear

echo ""
echo "  💰  WealthVault 私人账本"
echo "  ──────────────────────────"
echo ""

# 检查 Python3
if ! command -v python3 &>/dev/null; then
    echo "  ❌ 未找到 Python3"
    echo "  请前往 https://www.python.org/downloads/ 下载安装"
    echo ""
    read -p "  按回车键关闭..."
    exit 1
fi

# 若已在运行，直接打开浏览器
if lsof -ti:8181 &>/dev/null; then
    echo "  ✅ 服务已在运行"
    echo "  🌐 正在打开浏览器..."
    open "https://localhost:8181"
    exit 0
fi

# 启动服务器
echo "  🚀 正在启动服务器..."
python3 server.py &
SERVER_PID=$!
echo $SERVER_PID > /tmp/wealthvault.pid

# 等待服务就绪（最多 8 秒）
for i in {1..16}; do
    sleep 0.5
    if lsof -ti:8181 &>/dev/null; then
        break
    fi
done

if ! lsof -ti:8181 &>/dev/null; then
    echo "  ❌ 启动失败，请检查下方错误信息"
    wait $SERVER_PID
    read -p "  按回车键关闭..."
    exit 1
fi

echo "  ✅ 服务器就绪"
echo "  🌐 正在打开浏览器..."
echo ""
open "https://localhost:8181"

echo "  ┌──────────────────────────┐"
echo "  │  关闭此窗口即停止服务器   │"
echo "  └──────────────────────────┘"
echo ""

# 捕获关闭信号，停止服务器
trap "kill $SERVER_PID 2>/dev/null; rm -f /tmp/wealthvault.pid; echo '  🛑 服务器已停止'; exit 0" INT TERM
wait $SERVER_PID
