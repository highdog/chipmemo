#!/bin/bash

# MongoDB 数据备份脚本
# 使用方法: ./backup.sh [backup|restore] [backup_file]

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
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

# 配置
BACKUP_DIR="./backups"
DATE=$(date +%Y%m%d_%H%M%S)
CONTAINER_NAME="notepad-mongodb"
DB_NAME="notepad"

# 创建备份目录
setup_backup_dir() {
    if [ ! -d "$BACKUP_DIR" ]; then
        log_info "创建备份目录: $BACKUP_DIR"
        mkdir -p "$BACKUP_DIR"
    fi
}

# 检查MongoDB容器状态
check_mongodb_container() {
    if ! docker ps | grep -q "$CONTAINER_NAME"; then
        log_error "MongoDB容器 '$CONTAINER_NAME' 未运行"
        log_info "请先启动服务: docker-compose up -d"
        exit 1
    fi
    log_info "MongoDB容器状态正常"
}

# 备份数据库
backup_database() {
    local backup_file="$BACKUP_DIR/notepad_backup_$DATE.tar.gz"
    
    log_info "开始备份数据库..."
    log_info "备份文件: $backup_file"
    
    # 创建临时备份目录
    local temp_dir="$BACKUP_DIR/temp_$DATE"
    mkdir -p "$temp_dir"
    
    # 执行mongodump
    docker exec "$CONTAINER_NAME" mongodump \
        --db "$DB_NAME" \
        --out /tmp/backup_$DATE
    
    # 复制备份文件到主机
    docker cp "$CONTAINER_NAME:/tmp/backup_$DATE" "$temp_dir/"
    
    # 压缩备份文件
    tar -czf "$backup_file" -C "$temp_dir" .
    
    # 清理临时文件
    rm -rf "$temp_dir"
    docker exec "$CONTAINER_NAME" rm -rf "/tmp/backup_$DATE"
    
    # 获取备份文件大小
    local file_size=$(du -h "$backup_file" | cut -f1)
    
    log_success "数据库备份完成"
    log_info "备份文件: $backup_file"
    log_info "文件大小: $file_size"
    
    # 清理旧备份（保留最近10个）
    cleanup_old_backups
}

# 恢复数据库
restore_database() {
    local backup_file="$1"
    
    if [ -z "$backup_file" ]; then
        log_error "请指定备份文件"
        log_info "使用方法: $0 restore <backup_file>"
        exit 1
    fi
    
    if [ ! -f "$backup_file" ]; then
        log_error "备份文件不存在: $backup_file"
        exit 1
    fi
    
    log_warning "即将恢复数据库，这将覆盖现有数据！"
    read -p "确认继续？(y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_info "操作已取消"
        exit 0
    fi
    
    log_info "开始恢复数据库..."
    log_info "备份文件: $backup_file"
    
    # 创建临时目录
    local temp_dir="$BACKUP_DIR/restore_temp_$DATE"
    mkdir -p "$temp_dir"
    
    # 解压备份文件
    tar -xzf "$backup_file" -C "$temp_dir"
    
    # 复制到容器
    docker cp "$temp_dir/." "$CONTAINER_NAME:/tmp/restore_$DATE/"
    
    # 删除现有数据库（可选）
    log_info "删除现有数据库..."
    docker exec "$CONTAINER_NAME" mongosh --eval "db.getSiblingDB('$DB_NAME').dropDatabase()"
    
    # 执行mongorestore
    log_info "恢复数据库数据..."
    docker exec "$CONTAINER_NAME" mongorestore \
        --db "$DB_NAME" \
        "/tmp/restore_$DATE/backup_*/notepad"
    
    # 清理临时文件
    rm -rf "$temp_dir"
    docker exec "$CONTAINER_NAME" rm -rf "/tmp/restore_$DATE"
    
    log_success "数据库恢复完成"
}

# 清理旧备份
cleanup_old_backups() {
    log_info "清理旧备份文件（保留最近10个）..."
    
    # 查找并删除旧备份文件
    find "$BACKUP_DIR" -name "notepad_backup_*.tar.gz" -type f | \
        sort -r | \
        tail -n +11 | \
        while read file; do
            log_info "删除旧备份: $(basename "$file")"
            rm "$file"
        done
}

# 列出备份文件
list_backups() {
    log_info "可用的备份文件:"
    
    if [ ! -d "$BACKUP_DIR" ] || [ -z "$(ls -A "$BACKUP_DIR"/*.tar.gz 2>/dev/null)" ]; then
        log_warning "没有找到备份文件"
        return
    fi
    
    echo
    printf "%-30s %-10s %-20s\n" "文件名" "大小" "创建时间"
    printf "%-30s %-10s %-20s\n" "-----" "----" "--------"
    
    find "$BACKUP_DIR" -name "notepad_backup_*.tar.gz" -type f | \
        sort -r | \
        while read file; do
            local filename=$(basename "$file")
            local filesize=$(du -h "$file" | cut -f1)
            local filetime=$(stat -c %y "$file" 2>/dev/null || stat -f %Sm "$file" 2>/dev/null || echo "Unknown")
            printf "%-30s %-10s %-20s\n" "$filename" "$filesize" "$filetime"
        done
    echo
}

# 显示帮助信息
show_help() {
    echo "MongoDB 数据备份脚本"
    echo
    echo "使用方法:"
    echo "  $0 backup                    # 创建新备份"
    echo "  $0 restore <backup_file>     # 从备份恢复"
    echo "  $0 list                      # 列出所有备份"
    echo "  $0 cleanup                   # 清理旧备份"
    echo "  $0 help                      # 显示帮助"
    echo
    echo "示例:"
    echo "  $0 backup"
    echo "  $0 restore ./backups/notepad_backup_20231201_143022.tar.gz"
    echo "  $0 list"
    echo
}

# 主函数
main() {
    local action="$1"
    local backup_file="$2"
    
    case "$action" in
        "backup")
            setup_backup_dir
            check_mongodb_container
            backup_database
            ;;
        "restore")
            check_mongodb_container
            restore_database "$backup_file"
            ;;
        "list")
            list_backups
            ;;
        "cleanup")
            cleanup_old_backups
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