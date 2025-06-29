#!/bin/bash

# 构建一体化 Docker 镜像的脚本

set -e

echo "🚀 开始构建一体化 Docker 镜像..."

# 检查参数
VERSION=${1:-"simple"}

if [ "$VERSION" = "simple" ]; then
    DOCKERFILE="Dockerfile.simple"
    IMAGE_NAME="notepad-simple"
    echo "📦 构建简化版镜像（适用于开发测试）"
elif [ "$VERSION" = "full" ]; then
    DOCKERFILE="Dockerfile.all-in-one"
    IMAGE_NAME="notepad-all-in-one"
    echo "📦 构建完整版镜像（适用于生产环境）"
else
    echo "❌ 无效参数。使用方法:"
    echo "  ./build-all-in-one.sh simple   # 构建简化版"
    echo "  ./build-all-in-one.sh full     # 构建完整版"
    exit 1
fi

# 镜像标签
IMAGE_TAG="latest"
FULL_IMAGE_NAME="${IMAGE_NAME}:${IMAGE_TAG}"

# 构建镜像
echo "📦 构建 Docker 镜像: ${FULL_IMAGE_NAME}"
docker build -f ${DOCKERFILE} -t ${FULL_IMAGE_NAME} .

echo "✅ 镜像构建完成!"
echo "📋 镜像信息:"
docker images | grep ${IMAGE_NAME}

echo ""
echo "🎉 构建完成! 现在你可以使用以下命令运行容器:"
echo "docker run -d -p 80:80 -p 3000:3000 -p 3001:3001 --name notepad-app ${FULL_IMAGE_NAME}"
echo ""
echo "📱 访问应用:"
echo "  - 前端: http://localhost"
echo "  - API: http://localhost/api"
echo "  - 直接前端: http://localhost:3000"
echo "  - 直接后端: http://localhost:3001"
echo ""
echo "🔧 管理容器:"
echo "  - 查看日志: docker logs notepad-app"
echo "  - 停止容器: docker stop notepad-app"
echo "  - 删除容器: docker rm notepad-app"
echo "  - 进入容器: docker exec -it notepad-app bash"
echo "  - 查看服务状态: docker exec -it notepad-app supervisorctl status"
echo ""
echo "💡 提示:"
if [ "$VERSION" = "simple" ]; then
    echo "  - 当前构建的是简化版，适合开发测试"
    echo "  - 如需生产版本，请运行: ./build-all-in-one.sh full"
else
    echo "  - 当前构建的是完整版，适合生产环境"
    echo "  - 如需开发版本，请运行: ./build-all-in-one.sh simple"
fi