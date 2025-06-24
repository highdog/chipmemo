#!/bin/bash

# 服务监控脚本
# 用于监控 Docker 容器状态、服务健康状况和系统资源

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# 配置
COMPOSE_FILE="docker-compose.yml"
PROD_COMPOSE_FILE="docker-compose.prod.yml"
LOG_FILE="./logs/monitor.log"
ALERT_EMAIL="admin@your-domain.com"
SLACK_WEBHOOK=""  # 可选：Slack 通知

# 服务列表
SERVICES=("mongodb" "backend" "frontend" "nginx")
CONTAINER_NAMES=("notepad-mongodb" "notepad-backend" "notepad-frontend" "notepad-nginx")

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
    echo "$(date '+%Y-%m-%d %H:%M:%S') [INFO] $1" >> "$LOG_FILE"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
    echo "$(date '+%Y-%m-%d %H:%M:%S') [SUCCESS] $1" >> "$LOG_FILE"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
    echo "$(date '+%Y-%m-%d %H:%M:%S') [WARNING] $1" >> "$LOG_FILE"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
    echo "$(date '+%Y-%m-%d %H:%M:%S') [ERROR] $1" >> "$LOG_FILE"
}

log_header() {
    echo -e "${PURPLE}[MONITOR]${NC} $1"
    echo "$(date '+%Y-%m-%d %H:%M:%S') [MONITOR] $1" >> "$LOG_FILE"
}

# 创建日志目录
setup_logging() {
    mkdir -p "$(dirname "$LOG_FILE")"
    if [ ! -f "$LOG_FILE" ]; then
        touch "$LOG_FILE"
    fi
}

# 发送告警通知
send_alert() {
    local message="$1"
    local severity="$2"
    
    log_error "ALERT: $message"
    
    # 邮件通知（需要配置 sendmail 或 mailx）
    if command -v mail >/dev/null 2>&1 && [ -n "$ALERT_EMAIL" ]; then
        echo "$message" | mail -s "[Notepad App] $severity Alert" "$ALERT_EMAIL"
    fi
    
    # Slack 通知（可选）
    if [ -n "$SLACK_WEBHOOK" ]; then
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"🚨 Notepad App Alert: $message\"}" \
            "$SLACK_WEBHOOK" 2>/dev/null || true
    fi
}

# 检查 Docker 是否运行
check_docker() {
    if ! docker info >/dev/null 2>&1; then
        log_error "Docker 未运行或无法访问"
        send_alert "Docker daemon is not running" "CRITICAL"
        return 1
    fi
    log_success "Docker 运行正常"
    return 0
}

# 检查容器状态
check_containers() {
    log_header "检查容器状态"
    
    local failed_containers=()
    
    for container in "${CONTAINER_NAMES[@]}"; do
        if docker ps --format "table {{.Names}}\t{{.Status}}" | grep -q "$container"; then
            local status=$(docker ps --format "{{.Status}}" --filter "name=$container")
            if [[ $status == *"Up"* ]]; then
                log_success "容器 $container: $status"
            else
                log_warning "容器 $container: $status"
                failed_containers+=("$container")
            fi
        else
            log_error "容器 $container: 未运行"
            failed_containers+=("$container")
        fi
    done
    
    if [ ${#failed_containers[@]} -gt 0 ]; then
        send_alert "Containers not running: ${failed_containers[*]}" "HIGH"
        return 1
    fi
    
    return 0
}

# 检查服务健康状态
check_health() {
    log_header "检查服务健康状态"
    
    local unhealthy_services=()
    
    # 检查前端服务
    if curl -f -s "http://localhost:3000" >/dev/null; then
        log_success "前端服务健康检查通过"
    else
        log_error "前端服务健康检查失败"
        unhealthy_services+=("frontend")
    fi
    
    # 检查后端 API
    if curl -f -s "http://localhost:3001/health" >/dev/null; then
        log_success "后端 API 健康检查通过"
    else
        log_error "后端 API 健康检查失败"
        unhealthy_services+=("backend")
    fi
    
    # 检查 Nginx
    if curl -f -s "http://localhost/health" >/dev/null; then
        log_success "Nginx 健康检查通过"
    else
        log_error "Nginx 健康检查失败"
        unhealthy_services+=("nginx")
    fi
    
    # 检查数据库连接
    if docker exec notepad-mongodb mongosh --eval "db.adminCommand('ping')" >/dev/null 2>&1; then
        log_success "MongoDB 连接正常"
    else
        log_error "MongoDB 连接失败"
        unhealthy_services+=("mongodb")
    fi
    
    if [ ${#unhealthy_services[@]} -gt 0 ]; then
        send_alert "Unhealthy services: ${unhealthy_services[*]}" "HIGH"
        return 1
    fi
    
    return 0
}

# 检查系统资源
check_resources() {
    log_header "检查系统资源"
    
    # 检查磁盘空间
    local disk_usage=$(df / | awk 'NR==2 {print $5}' | sed 's/%//')
    if [ "$disk_usage" -gt 90 ]; then
        log_error "磁盘空间不足: ${disk_usage}%"
        send_alert "Disk space critical: ${disk_usage}% used" "HIGH"
    elif [ "$disk_usage" -gt 80 ]; then
        log_warning "磁盘空间警告: ${disk_usage}%"
    else
        log_success "磁盘空间正常: ${disk_usage}%"
    fi
    
    # 检查内存使用
    local memory_usage=$(free | awk 'NR==2{printf "%.0f", $3*100/$2}')
    if [ "$memory_usage" -gt 90 ]; then
        log_error "内存使用过高: ${memory_usage}%"
        send_alert "Memory usage critical: ${memory_usage}%" "HIGH"
    elif [ "$memory_usage" -gt 80 ]; then
        log_warning "内存使用警告: ${memory_usage}%"
    else
        log_success "内存使用正常: ${memory_usage}%"
    fi
    
    # 检查 CPU 负载
    local cpu_load=$(uptime | awk -F'load average:' '{print $2}' | awk '{print $1}' | sed 's/,//')
    local cpu_cores=$(nproc)
    local load_percentage=$(echo "$cpu_load * 100 / $cpu_cores" | bc -l | cut -d. -f1)
    
    if [ "$load_percentage" -gt 90 ]; then
        log_error "CPU 负载过高: ${cpu_load} (${load_percentage}%)"
        send_alert "CPU load critical: ${cpu_load}" "HIGH"
    elif [ "$load_percentage" -gt 70 ]; then
        log_warning "CPU 负载警告: ${cpu_load} (${load_percentage}%)"
    else
        log_success "CPU 负载正常: ${cpu_load} (${load_percentage}%)"
    fi
}

# 检查容器资源使用
check_container_resources() {
    log_header "检查容器资源使用"
    
    echo -e "${CYAN}容器资源使用情况:${NC}"
    printf "%-20s %-15s %-15s %-15s\n" "容器名称" "CPU使用率" "内存使用" "网络I/O"
    printf "%-20s %-15s %-15s %-15s\n" "--------" "--------" "--------" "--------"
    
    for container in "${CONTAINER_NAMES[@]}"; do
        if docker ps --format "{{.Names}}" | grep -q "$container"; then
            local stats=$(docker stats --no-stream --format "table {{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}" "$container" | tail -n 1)
            printf "%-20s %s\n" "$container" "$stats"
        fi
    done
    echo
}

# 检查日志错误
check_logs() {
    log_header "检查应用日志错误"
    
    local error_count=0
    
    for container in "${CONTAINER_NAMES[@]}"; do
        if docker ps --format "{{.Names}}" | grep -q "$container"; then
            local errors=$(docker logs --since="1h" "$container" 2>&1 | grep -i "error\|exception\|fatal" | wc -l)
            if [ "$errors" -gt 10 ]; then
                log_error "容器 $container 在过去1小时内有 $errors 个错误"
                error_count=$((error_count + errors))
            elif [ "$errors" -gt 0 ]; then
                log_warning "容器 $container 在过去1小时内有 $errors 个错误"
            fi
        fi
    done
    
    if [ "$error_count" -gt 50 ]; then
        send_alert "High error rate detected: $error_count errors in last hour" "MEDIUM"
    fi
}

# 生成监控报告
generate_report() {
    local report_file="./logs/monitor_report_$(date +%Y%m%d_%H%M%S).txt"
    
    {
        echo "============================================"
        echo "Notepad App 监控报告"
        echo "生成时间: $(date)"
        echo "============================================"
        echo
        
        echo "容器状态:"
        docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
        echo
        
        echo "系统资源:"
        echo "磁盘使用: $(df -h / | awk 'NR==2 {print $5}')"
        echo "内存使用: $(free -h | awk 'NR==2{printf "%.1f%%", $3*100/$2}')"
        echo "CPU 负载: $(uptime | awk -F'load average:' '{print $2}')"
        echo
        
        echo "容器资源使用:"
        docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}\t{{.BlockIO}}"
        echo
        
        echo "最近的错误日志:"
        tail -n 20 "$LOG_FILE" | grep -i "error\|warning" || echo "无错误或警告"
        
    } > "$report_file"
    
    log_info "监控报告已生成: $report_file"
}

# 自动修复服务
auto_repair() {
    log_header "尝试自动修复服务"
    
    # 重启不健康的容器
    for container in "${CONTAINER_NAMES[@]}"; do
        if ! docker ps --format "{{.Names}}" | grep -q "$container"; then
            log_info "尝试重启容器: $container"
            docker-compose restart "${container#notepad-}" || true
        fi
    done
    
    # 清理 Docker 资源
    log_info "清理 Docker 资源"
    docker system prune -f >/dev/null 2>&1 || true
    
    # 等待服务启动
    sleep 30
    
    # 再次检查
    if check_containers && check_health; then
        log_success "自动修复成功"
        return 0
    else
        log_error "自动修复失败"
        send_alert "Auto-repair failed, manual intervention required" "CRITICAL"
        return 1
    fi
}

# 显示实时监控
watch_mode() {
    log_info "启动实时监控模式 (按 Ctrl+C 退出)"
    
    while true; do
        clear
        echo -e "${PURPLE}=== Notepad App 实时监控 ===${NC}"
        echo -e "${CYAN}更新时间: $(date)${NC}"
        echo
        
        check_containers
        echo
        check_health
        echo
        check_container_resources
        
        sleep 10
    done
}

# 显示帮助信息
show_help() {
    echo "Notepad App 监控脚本"
    echo
    echo "使用方法:"
    echo "  $0 check                     # 执行完整检查"
    echo "  $0 containers                # 检查容器状态"
    echo "  $0 health                    # 检查服务健康状态"
    echo "  $0 resources                 # 检查系统资源"
    echo "  $0 logs                      # 检查应用日志"
    echo "  $0 report                    # 生成监控报告"
    echo "  $0 repair                    # 尝试自动修复"
    echo "  $0 watch                     # 实时监控模式"
    echo "  $0 help                      # 显示帮助"
    echo
    echo "示例:"
    echo "  $0 check                     # 执行所有检查"
    echo "  $0 watch                     # 启动实时监控"
    echo "  $0 repair                    # 自动修复服务"
    echo
}

# 主函数
main() {
    local action="$1"
    
    setup_logging
    
    case "$action" in
        "check")
            log_header "开始完整系统检查"
            check_docker
            check_containers
            check_health
            check_resources
            check_container_resources
            check_logs
            log_header "系统检查完成"
            ;;
        "containers")
            check_docker
            check_containers
            ;;
        "health")
            check_health
            ;;
        "resources")
            check_resources
            check_container_resources
            ;;
        "logs")
            check_logs
            ;;
        "report")
            generate_report
            ;;
        "repair")
            auto_repair
            ;;
        "watch")
            watch_mode
            ;;
        "help"|"--help"|"-h")
            show_help
            ;;
        "")
            log_error "请指定操作类型"
            show_help
            exit 1
            ;;
        *)
            log_error "未知操作: $action"
            show_help
            exit 1
            ;;
    esac
}

# 执行主函数
main "$@"