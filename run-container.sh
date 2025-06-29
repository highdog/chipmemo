#!/bin/bash

# 一键运行容器脚本

set -e

# 默认参数
VERSION=${1:-"simple"}
CONTAINER_NAME="notepad-app"
PORT_HTTP=${2:-80}
PORT_FRONTEND=${3:-3000}
PORT_BACKEND=${4:-3001}

# 确定镜像名称
if [ "$VERSION" = "simple" ]; then
    IMAGE_NAME="notepad-simple:latest"
    echo "🚀 启动简化版容器"
elif [ "$VERSION" = "full" ]; then
    IMAGE_NAME="notepad-all-in-one:latest"
    echo "🚀 启动完整版容器"
else
    echo "❌ 无效参数。使用方法:"
    echo "  ./run-container.sh simple [http_port] [frontend_port] [backend_port]"
    echo "  ./run-container.sh full [http_port] [frontend_port] [backend_port]"
    echo "  例如: ./run-container.sh simple 8080 3000 3001"
    exit 1
fi

# 检查镜像是否存在
if ! docker images | grep -q "${IMAGE_NAME%:*}"; then
    echo "❌ 镜像 ${IMAGE_NAME} 不存在"
    echo "请先运行构建脚本: ./build-all-in-one.sh ${VERSION}"
    exit 1
fi

# 停止并删除已存在的容器
if docker ps -a | grep -q "${CONTAINER_NAME}"; then
    echo "🛑 停止并删除已存在的容器..."
    docker stop ${CONTAINER_NAME} 2>/dev/null || true
    docker rm ${CONTAINER_NAME} 2>/dev/null || true
fi

# 启动新容器
echo "📦 启动容器: ${CONTAINER_NAME}"
echo "🌐 端口映射: HTTP(${PORT_HTTP}) Frontend(${PORT_FRONTEND}) Backend(${PORT_BACKEND})"

docker run -d \
    -p ${PORT_HTTP}:80 \
    -p ${PORT_FRONTEND}:3000 \
    -p ${PORT_BACKEND}:3001 \
    -v notepad-data:/data/db \
    -v notepad-logs:/var/log \
    --name ${CONTAINER_NAME} \
    ${IMAGE_NAME}

echo "✅ 容器启动成功!"
echo ""
echo "📱 访问地址:"
echo "  - 主应用: http://localhost:${PORT_HTTP}"
echo "  - API接口: http://localhost:${PORT_HTTP}/api"
echo "  - 前端直连: http://localhost:${PORT_FRONTEND}"
echo "  - 后端直连: http://localhost:${PORT_BACKEND}"
echo ""
echo "🔧 管理命令:"
echo "  - 查看日志: docker logs -f ${CONTAINER_NAME}"
echo "  - 查看状态: docker exec -it ${CONTAINER_NAME} supervisorctl status"
echo "  - 进入容器: docker exec -it ${CONTAINER_NAME} bash"
echo "  - 停止容器: docker stop ${CONTAINER_NAME}"
echo ""
echo "⏳ 等待服务启动..."
sleep 5

# 检查服务状态
echo "🔍 检查服务状态:"
docker exec ${CONTAINER_NAME} supervisorctl status 2>/dev/null || echo "  容器可能还在启动中，请稍等片刻"

echo ""
echo "🎉 部署完成! 请访问 http://localhost:${PORT_HTTP} 查看应用"