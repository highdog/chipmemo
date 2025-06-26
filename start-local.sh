#!/bin/bash

# 本地开发环境启动脚本

echo "正在启动本地开发环境..."

# 检查是否安装了必要的依赖
if ! command -v nginx &> /dev/null; then
    echo "错误: nginx 未安装。请先安装 nginx:"
    echo "brew install nginx"
    exit 1
fi

if ! command -v node &> /dev/null; then
    echo "错误: Node.js 未安装。请先安装 Node.js"
    exit 1
fi

# 停止可能正在运行的nginx
echo "停止现有的nginx进程..."
sudo nginx -s stop 2>/dev/null || true

# 启动后端服务
echo "启动后端服务..."
cd backend
npm install
npm run dev &
BACKEND_PID=$!
cd ..

# 等待后端启动
echo "等待后端服务启动..."
sleep 3

# 启动前端服务
echo "启动前端服务..."
npm install
npm run dev &
FRONTEND_PID=$!

# 等待前端启动
echo "等待前端服务启动..."
sleep 5

# 启动nginx
echo "启动nginx代理..."
sudo nginx -c $(pwd)/nginx.local.conf

echo "本地开发环境启动完成!"
echo "访问地址: http://localhost:8080"
echo "前端直接访问: http://localhost:3000"
echo "后端API: http://localhost:3001/api"
echo ""
echo "按 Ctrl+C 停止所有服务"

# 等待用户中断
trap 'echo "\n正在停止服务..."; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; sudo nginx -s stop 2>/dev/null; echo "所有服务已停止"; exit 0' INT

# 保持脚本运行
while true; do
    sleep 1
done