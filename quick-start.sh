#!/bin/bash

# Notepad App 快速开始脚本
# 一键安装和启动开发环境

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_header() {
    echo -e "${PURPLE}=== $1 ===${NC}"
}

# 显示欢迎信息
show_welcome() {
    clear
    echo -e "${CYAN}"
    echo "  ███╗   ██╗ ██████╗ ████████╗███████╗██████╗  █████╗ ██████╗ "
    echo "  ████╗  ██║██╔═══██╗╚══██╔══╝██╔════╝██╔══██╗██╔══██╗██╔══██╗"
    echo "  ██╔██╗ ██║██║   ██║   ██║   █████╗  ██████╔╝███████║██║  ██║"
    echo "  ██║╚██╗██║██║   ██║   ██║   ██╔══╝  ██╔═══╝ ██╔══██║██║  ██║"
    echo "  ██║ ╚████║╚██████╔╝   ██║   ███████╗██║     ██║  ██║██████╔╝"
    echo "  ╚═╝  ╚═══╝ ╚═════╝    ╚═╝   ╚══════╝╚═╝     ╚═╝  ╚═╝╚═════╝ "
    echo -e "${NC}"
    echo -e "${PURPLE}                    快速开始脚本 v1.0${NC}"
    echo
    echo -e "${CYAN}欢迎使用 Notepad App！${NC}"
    echo "这个脚本将帮助您快速设置和启动开发环境。"
    echo
}

# 检查系统要求
check_requirements() {
    log_header "检查系统要求"
    
    local missing_deps=()
    
    # 检查 Docker
    if ! command -v docker >/dev/null 2>&1; then
        missing_deps+=("Docker")
    else
        log_success "Docker 已安装: $(docker --version | cut -d' ' -f3 | cut -d',' -f1)"
    fi
    
    # 检查 Docker Compose
    if ! command -v docker-compose >/dev/null 2>&1; then
        missing_deps+=("Docker Compose")
    else
        log_success "Docker Compose 已安装: $(docker-compose --version | cut -d' ' -f3 | cut -d',' -f1)"
    fi
    
    # 检查 Git
    if ! command -v git >/dev/null 2>&1; then
        missing_deps+=("Git")
    else
        log_success "Git 已安装: $(git --version | cut -d' ' -f3)"
    fi
    
    # 检查 Node.js（可选）
    if command -v node >/dev/null 2>&1; then
        log_success "Node.js 已安装: $(node --version)"
    else
        log_warning "Node.js 未安装（可选，用于本地开发）"
    fi
    
    if [ ${#missing_deps[@]} -gt 0 ]; then
        log_error "缺少以下依赖:"
        for dep in "${missing_deps[@]}"; do
            echo "  - $dep"
        done
        echo
        show_installation_guide
        exit 1
    fi
    
    log_success "所有必需依赖已安装"
    echo
}

# 显示安装指南
show_installation_guide() {
    echo -e "${YELLOW}安装指南:${NC}"
    echo
    
    if [[ "$OSTYPE" == "darwin"* ]]; then
        echo "macOS 安装命令:"
        echo "  # 安装 Homebrew（如果未安装）"
        echo "  /bin/bash -c \"\$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)\""
        echo
        echo "  # 安装 Docker Desktop"
        echo "  brew install --cask docker"
        echo
        echo "  # 安装 Git"
        echo "  brew install git"
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        echo "Linux 安装命令:"
        echo "  # Ubuntu/Debian"
        echo "  sudo apt-get update"
        echo "  sudo apt-get install docker.io docker-compose git"
        echo
        echo "  # CentOS/RHEL"
        echo "  sudo yum install docker docker-compose git"
        echo "  sudo systemctl start docker"
        echo "  sudo systemctl enable docker"
    else
        echo "请访问以下链接获取安装指南:"
        echo "  Docker: https://docs.docker.com/get-docker/"
        echo "  Git: https://git-scm.com/downloads"
    fi
    echo
}

# 检查 Docker 服务
check_docker_service() {
    log_header "检查 Docker 服务"
    
    if ! docker info >/dev/null 2>&1; then
        log_error "Docker 服务未运行"
        echo
        echo "请启动 Docker 服务:"
        if [[ "$OSTYPE" == "darwin"* ]]; then
            echo "  - 启动 Docker Desktop 应用"
        elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
            echo "  sudo systemctl start docker"
        fi
        echo
        exit 1
    fi
    
    log_success "Docker 服务运行正常"
    echo
}

# 设置环境变量
setup_environment() {
    log_header "设置环境变量"
    
    if [ ! -f ".env" ]; then
        log_info "创建环境变量文件..."
        cp .env.example .env
        
        # 生成随机密钥
        local jwt_secret=$(openssl rand -base64 32)
        local db_password=$(openssl rand -base64 16 | tr -d '=+/' | cut -c1-16)
        
        # 更新环境变量
        sed -i.bak "s/your-jwt-secret-key/$jwt_secret/g" .env
        sed -i.bak "s/password123/$db_password/g" .env
        
        # 清理备份文件
        rm -f .env.bak
        
        log_success "环境变量文件已创建"
    else
        log_info "环境变量文件已存在"
    fi
    echo
}

# 构建和启动服务
start_services() {
    log_header "构建和启动服务"
    
    log_info "构建 Docker 镜像..."
    docker-compose build
    
    log_info "启动服务..."
    docker-compose up -d
    
    log_success "服务启动完成"
    echo
}

# 等待服务就绪
wait_for_services() {
    log_header "等待服务就绪"
    
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        log_info "检查服务状态... ($attempt/$max_attempts)"
        
        # 检查前端服务
        if curl -f -s "http://localhost:3000" >/dev/null 2>&1; then
            log_success "前端服务已就绪"
            break
        fi
        
        sleep 5
        attempt=$((attempt + 1))
    done
    
    if [ $attempt -gt $max_attempts ]; then
        log_warning "服务启动时间较长，请稍后手动检查"
    fi
    echo
}

# 显示访问信息
show_access_info() {
    log_header "访问信息"
    
    echo -e "${GREEN}🎉 Notepad App 已成功启动！${NC}"
    echo
    echo -e "${CYAN}访问地址:${NC}"
    echo "  📱 前端应用:    http://localhost:3000"
    echo "  🔧 后端 API:    http://localhost:3001"
    echo "  🌐 Nginx 代理:  http://localhost"
    echo
    echo -e "${CYAN}管理命令:${NC}"
    echo "  📊 查看状态:    ./deploy.sh status"
    echo "  📋 查看日志:    ./deploy.sh logs"
    echo "  🔄 重启服务:    ./deploy.sh restart"
    echo "  ⏹️  停止服务:    ./deploy.sh stop"
    echo "  📈 启动监控:    ./deploy.sh monitor"
    echo "  💾 创建备份:    ./deploy.sh backup"
    echo
    echo -e "${CYAN}开发工具:${NC}"
    echo "  📝 API 文档:    http://localhost:3001/api-docs (如果已配置)"
    echo "  🗄️  数据库管理:  MongoDB Compass -> mongodb://localhost:27017"
    echo
    echo -e "${YELLOW}提示:${NC}"
    echo "  - 首次启动可能需要几分钟来下载和构建镜像"
    echo "  - 如果遇到问题，请查看日志: ./deploy.sh logs"
    echo "  - 完整文档请参考: DEPLOYMENT_GUIDE.md"
    echo
}

# 显示下一步操作
show_next_steps() {
    log_header "下一步操作"
    
    echo "现在您可以:"
    echo
    echo "1. 🌐 在浏览器中访问 http://localhost:3000"
    echo "2. 📝 开始使用 Notepad App"
    echo "3. 🔧 查看和修改源代码"
    echo "4. 📚 阅读完整文档: DEPLOYMENT_GUIDE.md"
    echo
    echo "如需帮助，请运行: ./deploy.sh help"
    echo
}

# 主函数
main() {
    show_welcome
    
    # 检查是否在项目目录中
    if [ ! -f "docker-compose.yml" ] || [ ! -f "deploy.sh" ]; then
        log_error "请在 Notepad App 项目根目录中运行此脚本"
        exit 1
    fi
    
    check_requirements
    check_docker_service
    setup_environment
    start_services
    wait_for_services
    show_access_info
    show_next_steps
    
    log_success "快速开始完成！享受使用 Notepad App 吧！ 🚀"
}

# 执行主函数
main "$@"