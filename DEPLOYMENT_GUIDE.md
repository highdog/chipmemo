# Notepad App 完整部署指南

本指南提供了 Notepad App 的完整部署方案，支持开发环境和生产环境的一键部署。

## 📋 目录

- [快速开始](#快速开始)
- [部署文件说明](#部署文件说明)
- [环境配置](#环境配置)
- [部署命令](#部署命令)
- [监控和维护](#监控和维护)
- [备份和恢复](#备份和恢复)
- [故障排除](#故障排除)
- [安全配置](#安全配置)
- [性能优化](#性能优化)

## 🚀 快速开始

### 开发环境部署

```bash
# 克隆项目
git clone <your-repo-url>
cd notepad-app

# 一键部署开发环境
chmod +x deploy.sh
./deploy.sh deploy dev

# 访问应用
# 前端: http://localhost:3000
# 后端 API: http://localhost:3001
# Nginx: http://localhost
```

### 生产环境部署

```bash
# 一键部署生产环境
./deploy.sh deploy prod --domain your-domain.com --email admin@your-domain.com --ssl

# 访问应用
# https://your-domain.com
```

## 📁 部署文件说明

### 核心部署文件

| 文件 | 说明 | 用途 |
|------|------|------|
| `deploy.sh` | 主部署脚本 | 一键部署、管理服务 |
| `docker-compose.yml` | 开发环境配置 | Docker 服务编排 |
| `docker-compose.prod.yml` | 生产环境配置 | 生产环境优化配置 |
| `nginx.conf` | 开发环境 Nginx | 反向代理配置 |
| `nginx.prod.conf` | 生产环境 Nginx | 生产环境 Nginx 配置 |
| `.env.example` | 环境变量模板 | 开发环境配置模板 |
| `.env.prod` | 生产环境配置 | 生产环境配置模板 |

### 管理工具

| 文件 | 说明 | 功能 |
|------|------|------|
| `backup.sh` | 数据备份脚本 | 数据库备份和恢复 |
| `monitor.sh` | 监控脚本 | 服务监控和健康检查 |
| `DOCKER_DEPLOYMENT.md` | Docker 部署文档 | 详细部署说明 |

## ⚙️ 环境配置

### 开发环境配置

1. **复制环境变量文件**
   ```bash
   cp .env.example .env
   ```

2. **修改配置**
   ```bash
   # 编辑 .env 文件
   NEXT_PUBLIC_API_URL=http://localhost:3001/api
   MONGODB_URI=mongodb://notepad_user:password123@mongodb:27017/notepad
   JWT_SECRET=your-jwt-secret-key
   ```

### 生产环境配置

1. **复制生产环境配置**
   ```bash
   cp .env.prod .env
   ```

2. **修改关键配置**
   ```bash
   # 必须修改的配置
   NEXT_PUBLIC_API_URL=https://your-domain.com/api
   MONGODB_URI=mongodb://notepad_user:STRONG_PASSWORD@mongodb:27017/notepad
   JWT_SECRET=VERY_STRONG_JWT_SECRET_AT_LEAST_32_CHARACTERS
   MONGO_INITDB_ROOT_PASSWORD=STRONG_MONGODB_PASSWORD
   CORS_ORIGIN=https://your-domain.com
   ```

## 🛠️ 部署命令

### 基本命令

```bash
# 部署应用
./deploy.sh deploy [dev|prod] [选项]

# 服务管理
./deploy.sh start          # 启动服务
./deploy.sh stop           # 停止服务
./deploy.sh restart        # 重启服务
./deploy.sh status         # 查看状态

# 日志查看
./deploy.sh logs           # 查看所有日志
./deploy.sh logs backend   # 查看后端日志
./deploy.sh logs frontend  # 查看前端日志

# 数据管理
./deploy.sh backup         # 创建备份
./deploy.sh restore <file> # 恢复数据

# 维护操作
./deploy.sh update         # 更新应用
./deploy.sh cleanup        # 清理资源
./deploy.sh monitor        # 启动监控
```

### 部署选项

```bash
# 生产环境部署示例
./deploy.sh deploy prod \
  --domain example.com \
  --email admin@example.com \
  --ssl \
  --no-backup \
  --no-monitoring

# 选项说明
--domain DOMAIN      # 设置域名
--email EMAIL        # 设置管理员邮箱
--ssl               # 启用 SSL
--no-backup         # 禁用自动备份
--no-monitoring     # 禁用监控
--force             # 强制重新部署
```

## 📊 监控和维护

### 监控脚本使用

```bash
# 赋予执行权限
chmod +x monitor.sh

# 完整系统检查
./monitor.sh check

# 实时监控
./monitor.sh watch

# 单项检查
./monitor.sh containers    # 检查容器状态
./monitor.sh health       # 检查服务健康
./monitor.sh resources    # 检查系统资源
./monitor.sh logs         # 检查应用日志

# 生成报告
./monitor.sh report

# 自动修复
./monitor.sh repair
```

### 监控指标

- **容器状态**: 检查所有 Docker 容器运行状态
- **服务健康**: HTTP 健康检查端点
- **系统资源**: CPU、内存、磁盘使用率
- **应用日志**: 错误和警告日志分析
- **网络连接**: 端口监听和连接状态

## 💾 备份和恢复

### 备份操作

```bash
# 赋予执行权限
chmod +x backup.sh

# 创建备份
./backup.sh backup

# 列出备份文件
./backup.sh list

# 清理旧备份
./backup.sh cleanup
```

### 恢复操作

```bash
# 从备份恢复
./backup.sh restore ./backups/notepad_backup_20231201_143022.tar.gz

# 注意：恢复操作会覆盖现有数据，请谨慎操作
```

### 自动备份

生产环境建议设置定时备份：

```bash
# 添加到 crontab
crontab -e

# 每天凌晨 2 点自动备份
0 2 * * * /path/to/notepad-app/backup.sh backup

# 每周日清理旧备份
0 3 * * 0 /path/to/notepad-app/backup.sh cleanup
```

## 🔧 故障排除

### 常见问题

#### 1. 容器启动失败

```bash
# 查看容器日志
docker-compose logs [service-name]

# 检查容器状态
docker ps -a

# 重新构建镜像
docker-compose build --no-cache
```

#### 2. 端口冲突

```bash
# 检查端口占用
netstat -tlnp | grep :3000
lsof -i :3000

# 停止占用端口的进程
sudo kill -9 <PID>
```

#### 3. 数据库连接失败

```bash
# 检查 MongoDB 容器
docker exec -it notepad-mongodb mongosh

# 检查网络连接
docker network ls
docker network inspect notepad-network
```

#### 4. SSL 证书问题

```bash
# 检查证书文件
ls -la ssl/

# 验证证书
openssl x509 -in ssl/cert.pem -text -noout

# 重新生成自签名证书
./deploy.sh ssl-setup
```

### 日志分析

```bash
# 查看错误日志
docker-compose logs | grep -i error

# 查看特定时间段日志
docker-compose logs --since="1h" backend

# 实时跟踪日志
docker-compose logs -f --tail=100
```

## 🔒 安全配置

### 生产环境安全检查清单

- [ ] 修改默认密码（MongoDB、JWT Secret）
- [ ] 配置 SSL 证书
- [ ] 设置防火墙规则
- [ ] 启用 HTTPS 重定向
- [ ] 配置安全头
- [ ] 限制 API 请求频率
- [ ] 定期更新依赖
- [ ] 监控异常访问

### 防火墙配置

```bash
# Ubuntu/Debian
sudo ufw allow 22/tcp      # SSH
sudo ufw allow 80/tcp      # HTTP
sudo ufw allow 443/tcp     # HTTPS
sudo ufw enable

# CentOS/RHEL
sudo firewall-cmd --permanent --add-service=ssh
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload
```

### SSL 证书配置

#### Let's Encrypt 证书

```bash
# 安装 Certbot
sudo apt-get install certbot

# 获取证书
sudo certbot certonly --webroot -w ./ssl -d your-domain.com

# 复制证书到项目目录
sudo cp /etc/letsencrypt/live/your-domain.com/fullchain.pem ./ssl/cert.pem
sudo cp /etc/letsencrypt/live/your-domain.com/privkey.pem ./ssl/key.pem

# 设置自动续期
sudo crontab -e
0 12 * * * /usr/bin/certbot renew --quiet
```

## ⚡ 性能优化

### Docker 优化

```bash
# 启用 BuildKit
export DOCKER_BUILDKIT=1

# 多阶段构建缓存
docker-compose build --build-arg BUILDKIT_INLINE_CACHE=1

# 资源限制
# 在 docker-compose.prod.yml 中已配置
```

### 数据库优化

```bash
# MongoDB 配置优化
# 在生产环境中启用认证和日志
# 配置适当的内存和连接池大小
```

### Nginx 优化

```bash
# 启用 Gzip 压缩
# 配置缓存策略
# 设置适当的工作进程数
# 优化缓冲区大小
```

## 📈 扩展部署

### 多服务器部署

```bash
# 数据库服务器
docker-compose -f docker-compose.prod.yml up -d mongodb

# 应用服务器
docker-compose -f docker-compose.prod.yml up -d backend frontend

# 负载均衡器
docker-compose -f docker-compose.prod.yml up -d nginx
```

### 容器编排

```bash
# 使用 Docker Swarm
docker swarm init
docker stack deploy -c docker-compose.prod.yml notepad

# 或使用 Kubernetes
kubectl apply -f k8s/
```

## 📞 支持和帮助

如果在部署过程中遇到问题，请：

1. 查看本文档的故障排除部分
2. 检查应用日志：`./deploy.sh logs`
3. 运行系统检查：`./monitor.sh check`
4. 查看 GitHub Issues
5. 联系技术支持

## 📝 更新日志

- **v2.0** - 完整的一键部署方案
- **v1.1** - 添加监控和备份功能
- **v1.0** - 基础 Docker 部署

---

**注意**: 在生产环境部署前，请务必：
1. 备份现有数据
2. 在测试环境验证
3. 修改默认密码和密钥
4. 配置适当的安全策略