#!/bin/bash

# Notepad App 一键部署脚本
# 支持开发环境和生产环境部署
# 版本: 2.0
# 更新时间: $(date +%Y-%m-%d)

set -e

# 配置
ENV_MODE="dev"  # dev 或 prod
DOMAIN="localhost"
EMAIL="admin@example.com"
BACKUP_ENABLED="true"
MONITORING_ENABLED="true"
SSL_ENABLED="false"

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

# 显示帮助信息
show_help() {
    echo "Notepad App 一键部署脚本 v2.0"
    echo
    echo "使用方法:"
    echo "  $0 [命令] [选项]"
    echo
    echo "命令:"
    echo "  deploy [dev|prod]            部署应用"
    echo "  start                        启动服务"
    echo "  stop                         停止服务"
    echo "  restart                      重启服务"
    echo "  status                       查看服务状态"
    echo "  logs [service]               查看日志"
    echo "  backup                       备份数据"
    echo "  restore <file>               恢复数据"
    echo "  update                       更新应用"
    echo "  cleanup                      清理资源"
    echo "  monitor                      启动监控"
    echo "  ssl-setup                    配置 SSL 证书"
    echo "  help                         显示帮助信息"
    echo
    echo "部署选项:"
    echo "  --domain DOMAIN              设置域名 (默认: localhost)"
    echo "  --email EMAIL                设置管理员邮箱"
    echo "  --ssl                        启用 SSL (仅生产环境)"
    echo "  --no-backup                  禁用自动备份"
    echo "  --no-monitoring              禁用监控"
    echo "  --force                      强制重新部署"
    echo
    echo "示例:"
    echo "  $0 deploy dev                # 开发环境部署"
    echo "  $0 deploy prod --domain example.com --email admin@example.com --ssl"
    echo "  $0 start                     # 启动所有服务"
    echo "  $0 logs backend              # 查看后端日志"
    echo "  $0 backup                    # 创建数据备份"
    echo "  $0 monitor                   # 启动监控面板"
    echo
}

# 检查依赖
check_dependencies() {
    log_info "检查系统依赖..."
    
    if ! command -v docker &> /dev/null; then
        log_error "Docker 未安装，请先安装 Docker"
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        log_error "Docker Compose 未安装，请先安装 Docker Compose"
        exit 1
    fi
    
    log_success "依赖检查通过"
}

# 生成随机密码
generate_password() {
    openssl rand -base64 32 | tr -d "=+/" | cut -c1-25
}

# 生成JWT密钥
generate_jwt_secret() {
    openssl rand -base64 64 | tr -d "=+/" | cut -c1-50
}

# 配置环境变量
setup_environment() {
    local env_type=$1
    log_info "配置 $env_type 环境变量..."
    
    if [ ! -f .env ]; then
        log_info "创建 .env 文件..."
        cp .env.example .env
        
        # 生成安全的密码和密钥
        local db_password=$(generate_password)
        local jwt_secret=$(generate_jwt_secret)
        
        # 替换默认值
        if [[ "$OSTYPE" == "darwin"* ]]; then
            # macOS
            sed -i '' "s|password123|$db_password|g" .env
            sed -i '' "s|your-super-secret-jwt-key-change-this-in-production|$jwt_secret|g" .env
        else
            # Linux
            sed -i "s|password123|$db_password|g" .env
            sed -i "s|your-super-secret-jwt-key-change-this-in-production|$jwt_secret|g" .env
        fi
        
        if [ "$env_type" = "prod" ]; then
            log_warning "生产环境部署，请手动编辑 .env 文件设置正确的域名和CORS配置"
            log_warning "数据库密码: $db_password"
            log_warning "JWT密钥: $jwt_secret"
        fi
        
        log_success "环境变量配置完成"
    else
        log_info ".env 文件已存在，跳过创建"
    fi
}

# 创建SSL目录
setup_ssl() {
    log_info "创建SSL证书目录..."
    mkdir -p ssl
    
    if [ ! -f ssl/cert.pem ] || [ ! -f ssl/key.pem ]; then
        log_info "生成自签名SSL证书（仅用于开发环境）..."
        openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
            -keyout ssl/key.pem \
            -out ssl/cert.pem \
            -subj "/C=CN/ST=State/L=City/O=Organization/CN=localhost"
        log_success "SSL证书生成完成"
    else
        log_info "SSL证书已存在，跳过生成"
    fi
}

# 构建和启动服务
deploy_services() {
    local env_type=$1
    log_info "构建和启动服务..."
    
    # 停止现有服务
    log_info "停止现有服务..."
    docker-compose down --remove-orphans 2>/dev/null || true
    
    # 清理旧的镜像（可选）
    if [ "$env_type" = "prod" ]; then
        log_info "清理旧的Docker镜像..."
        docker system prune -f
    fi
    
    # 构建并启动服务
    log_info "构建Docker镜像..."
    docker-compose build --no-cache
    
    log_info "启动服务..."
    docker-compose up -d
    
    # 等待服务启动
    log_info "等待服务启动..."
    sleep 10
    
    # 检查服务状态
    check_services
}

# 检查服务状态
check_services() {
    log_info "检查服务状态..."
    
    # 检查容器状态
    if ! docker-compose ps | grep -q "Up"; then
        log_error "部分服务启动失败"
        docker-compose logs
        exit 1
    fi
    
    # 检查后端健康状态
    log_info "检查后端服务健康状态..."
    for i in {1..30}; do
        if curl -f http://localhost:3001/health &>/dev/null; then
            log_success "后端服务健康检查通过"
            break
        fi
        if [ $i -eq 30 ]; then
            log_error "后端服务健康检查失败"
            docker-compose logs backend
            exit 1
        fi
        sleep 2
    done
    
    # 检查前端服务
    log_info "检查前端服务..."
    for i in {1..30}; do
        if curl -f http://localhost:3000 &>/dev/null; then
            log_success "前端服务检查通过"
            break
        fi
        if [ $i -eq 30 ]; then
            log_error "前端服务检查失败"
            docker-compose logs frontend
            exit 1
        fi
        sleep 2
    done
}

# 显示部署信息
show_deployment_info() {
    local env_type=$1
    
    echo
    log_success "=== 部署完成 ==="
    echo
    log_info "服务访问地址:"
    echo "  前端应用: http://localhost:3000"
    echo "  后端API:  http://localhost:3001"
    echo "  Nginx代理: http://localhost (如果启用)"
    echo "  MongoDB: localhost:27017"
    echo
    
    if [ "$env_type" = "prod" ]; then
        log_warning "生产环境部署注意事项:"
        echo "  1. 请配置防火墙，只开放必要端口"
        echo "  2. 请配置SSL证书用于HTTPS访问"
        echo "  3. 请定期备份MongoDB数据"
        echo "  4. 请监控服务运行状态"
        echo
    fi
    
    log_info "常用命令:"
    echo "  查看服务状态: docker-compose ps"
    echo "  查看日志: docker-compose logs -f [service_name]"
    echo "  停止服务: docker-compose down"
    echo "  重启服务: docker-compose restart [service_name]"
    echo "  备份数据库: ./backup.sh"
    echo
}

# 启动服务
start_services() {
    log_info "启动服务..."
    
    if [ "$ENV_MODE" = "prod" ]; then
        docker-compose -f docker-compose.prod.yml up -d
    else
        docker-compose up -d
    fi
    
    log_success "服务启动完成"
    show_status
}

# 停止服务
stop_services() {
    log_info "停止服务..."
    
    if [ "$ENV_MODE" = "prod" ]; then
        docker-compose -f docker-compose.prod.yml down
    else
        docker-compose down
    fi
    
    log_success "服务已停止"
}

# 重启服务
restart_services() {
    log_info "重启服务..."
    stop_services
    sleep 5
    start_services
}

# 查看服务状态
show_status() {
    log_info "服务状态:"
    docker-compose ps
    echo
    
    log_info "端口使用情况:"
    netstat -tlnp | grep -E ':(80|443|3000|3001|27017)' || echo "无相关端口监听"
    echo
}

# 查看日志
show_logs() {
    local service="$1"
    
    if [ -n "$service" ]; then
        log_info "查看 $service 服务日志:"
        docker-compose logs -f "$service"
    else
        log_info "查看所有服务日志:"
        docker-compose logs -f
    fi
}

# 更新应用
update_app() {
    log_info "更新应用..."
    
    # 备份数据
    if [ "$BACKUP_ENABLED" = "true" ]; then
        log_info "创建更新前备份..."
        ./backup.sh backup
    fi
    
    # 拉取最新代码
    if [ -d ".git" ]; then
        log_info "拉取最新代码..."
        git pull
    fi
    
    # 重新构建和部署
    log_info "重新构建镜像..."
    if [ "$ENV_MODE" = "prod" ]; then
        docker-compose -f docker-compose.prod.yml build --no-cache
        docker-compose -f docker-compose.prod.yml up -d
    else
        docker-compose build --no-cache
        docker-compose up -d
    fi
    
    log_success "应用更新完成"
}

# 清理资源
cleanup_resources() {
    log_info "清理 Docker 资源..."
    
    # 停止所有容器
    docker-compose down --remove-orphans
    
    # 清理未使用的镜像
    docker image prune -f
    
    # 清理未使用的卷
    docker volume prune -f
    
    # 清理未使用的网络
    docker network prune -f
    
    log_success "资源清理完成"
}

# 配置 SSL 证书
setup_ssl_new() {
    log_info "配置 SSL 证书..."
    
    mkdir -p ssl
    
    if [ "$ENV_MODE" = "prod" ]; then
        log_info "生产环境 SSL 配置"
        echo "请将您的 SSL 证书文件放置在以下位置:"
        echo "  - 证书文件: ./ssl/cert.pem"
        echo "  - 私钥文件: ./ssl/key.pem"
        echo
        echo "或者使用 Let's Encrypt 自动获取证书:"
        echo "  certbot certonly --webroot -w ./ssl -d $DOMAIN"
    else
        log_info "生成自签名证书用于开发环境..."
        openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
            -keyout ssl/key.pem \
            -out ssl/cert.pem \
            -subj "/C=CN/ST=State/L=City/O=Organization/CN=$DOMAIN"
        log_success "自签名证书生成完成"
    fi
}

# 启动监控
start_monitoring() {
    if [ "$MONITORING_ENABLED" = "true" ]; then
        log_info "启动监控..."
        chmod +x monitor.sh
        ./monitor.sh watch &
        log_success "监控已启动"
    fi
}

# 开发环境部署
deploy_development() {
    echo
    log_info "=== 开发环境部署 ==="
    echo
    
    check_dependencies
    setup_environment "dev"
    setup_ssl
    deploy_services "dev"
    show_deployment_info "dev"
    
    log_success "开发环境部署完成！"
}

# 生产环境部署
deploy_production() {
    echo
    log_info "=== 生产环境部署 ==="
    echo
    
    check_dependencies
    setup_environment "prod"
    setup_ssl
    deploy_services "prod"
    show_deployment_info "prod"
    
    log_success "生产环境部署完成！"
}

# 主函数
main() {
    local command="$1"
    shift || true
    
    # 检测环境模式
    if [ -f ".env.prod" ] && [ "$ENV_MODE" = "dev" ]; then
        ENV_MODE="prod"
    fi
    
    case "$command" in
        "deploy")
            local env="$1"
            shift || true
            
            # 解析部署参数
            while [[ $# -gt 0 ]]; do
                case $1 in
                    --domain)
                        DOMAIN="$2"
                        shift 2
                        ;;
                    --email)
                        EMAIL="$2"
                        shift 2
                        ;;
                    --ssl)
                        SSL_ENABLED="true"
                        shift
                        ;;
                    --no-backup)
                        BACKUP_ENABLED="false"
                        shift
                        ;;
                    --no-monitoring)
                        MONITORING_ENABLED="false"
                        shift
                        ;;
                    --force)
                        FORCE_DEPLOY="true"
                        shift
                        ;;
                    *)
                        log_error "未知选项: $1"
                        show_help
                        exit 1
                        ;;
                esac
            done
            
            case "$env" in
                "dev")
                    ENV_MODE="dev"
                    deploy_development
                    ;;
                "prod")
                    ENV_MODE="prod"
                    deploy_production
                    ;;
                *)
                    log_error "请指定部署环境 (dev 或 prod)"
                    show_help
                    exit 1
                    ;;
            esac
            ;;
        "start")
            start_services
            ;;
        "stop")
            stop_services
            ;;
        "restart")
            restart_services
            ;;
        "status")
            show_status
            ;;
        "logs")
            show_logs "$1"
            ;;
        "backup")
            chmod +x backup.sh
            ./backup.sh backup
            ;;
        "restore")
            if [ -z "$1" ]; then
                log_error "请指定备份文件"
                exit 1
            fi
            chmod +x backup.sh
            ./backup.sh restore "$1"
            ;;
        "update")
            update_app
            ;;
        "cleanup")
            cleanup_resources
            ;;
        "monitor")
            chmod +x monitor.sh
            ./monitor.sh watch
            ;;
        "ssl-setup")
            setup_ssl_new
            ;;
        "help"|"--help"|"-h")
            show_help
            ;;
        "")
            log_error "请指定命令"
            show_help
            exit 1
            ;;
        *)
            log_error "未知命令: $command"
            show_help
            exit 1
            ;;
    esac
}

# 执行主函数
main "$@"