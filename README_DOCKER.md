# 🐳 Notepad App - Docker 一键部署方案

完整的 Docker 容器化部署解决方案，支持开发环境和生产环境的一键部署。

## ⚡ 快速开始

### 30秒启动开发环境

```bash
# 克隆项目
git clone <your-repo-url>
cd notepad-app

# 一键启动
./quick-start.sh
```

### 生产环境部署

```bash
# 生产环境一键部署
./deploy.sh deploy prod --domain your-domain.com --ssl
```

## 📦 部署方案特性

### 🎯 核心功能
- ✅ **一键部署** - 开发和生产环境零配置启动
- ✅ **Docker 容器化** - 完整的容器编排方案
- ✅ **自动化脚本** - 部署、监控、备份全自动化
- ✅ **环境隔离** - 开发/生产环境完全分离
- ✅ **SSL 支持** - 自动 HTTPS 配置
- ✅ **负载均衡** - Nginx 反向代理
- ✅ **数据持久化** - MongoDB 数据卷管理
- ✅ **健康检查** - 服务状态自动监控

### 🛠️ 管理工具
- 📊 **实时监控** - 系统资源和服务状态监控
- 💾 **数据备份** - 自动化数据库备份和恢复
- 🔄 **服务管理** - 启动、停止、重启、更新
- 📋 **日志管理** - 集中化日志查看和分析
- 🧹 **资源清理** - Docker 资源自动清理

### 🔒 安全特性
- 🛡️ **SSL/TLS 加密** - HTTPS 强制重定向
- 🔐 **密钥管理** - 自动生成安全密钥
- 🚫 **访问控制** - CORS 和安全头配置
- 🔥 **防火墙友好** - 最小端口暴露
- 📝 **审计日志** - 完整的操作日志记录

## 🏗️ 架构概览

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   用户/客户端    │────│   Nginx 代理     │────│   前端应用       │
│   (浏览器/App)  │    │   (负载均衡)     │    │   (Next.js)     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌─────────────────┐    ┌─────────────────┐
                       │   后端 API      │────│   MongoDB       │
                       │   (Express.js)  │    │   (数据库)      │
                       └─────────────────┘    └─────────────────┘
```

## 📁 部署文件结构

```
notepad-app/
├── 🚀 部署脚本
│   ├── quick-start.sh          # 快速开始脚本
│   ├── deploy.sh               # 主部署脚本
│   ├── backup.sh               # 数据备份脚本
│   └── monitor.sh              # 监控脚本
├── 🐳 Docker 配置
│   ├── docker-compose.yml      # 开发环境配置
│   ├── docker-compose.prod.yml # 生产环境配置
│   ├── Dockerfile              # 前端镜像
│   └── backend/Dockerfile      # 后端镜像
├── 🌐 Nginx 配置
│   ├── nginx.conf              # 开发环境 Nginx
│   └── nginx.prod.conf         # 生产环境 Nginx
├── ⚙️ 环境配置
│   ├── .env.example            # 开发环境模板
│   └── .env.prod               # 生产环境模板
└── 📚 文档
    ├── README_DOCKER.md        # 本文件
    ├── DEPLOYMENT_GUIDE.md     # 完整部署指南
    └── DOCKER_DEPLOYMENT.md    # Docker 详细文档
```

## 🎮 使用指南

### 基础命令

```bash
# 🚀 快速开始（推荐新用户）
./quick-start.sh

# 📦 部署管理
./deploy.sh deploy dev          # 开发环境部署
./deploy.sh deploy prod         # 生产环境部署
./deploy.sh start               # 启动服务
./deploy.sh stop                # 停止服务
./deploy.sh restart             # 重启服务
./deploy.sh status              # 查看状态

# 📋 日志管理
./deploy.sh logs                # 查看所有日志
./deploy.sh logs backend        # 查看后端日志
./deploy.sh logs frontend       # 查看前端日志

# 💾 数据管理
./deploy.sh backup              # 创建备份
./deploy.sh restore <file>      # 恢复数据

# 📊 监控管理
./deploy.sh monitor             # 启动实时监控
./monitor.sh check              # 系统健康检查
./monitor.sh watch              # 实时监控面板

# 🧹 维护操作
./deploy.sh update              # 更新应用
./deploy.sh cleanup             # 清理资源
```

### 高级配置

```bash
# 🌐 生产环境完整部署
./deploy.sh deploy prod \
  --domain example.com \
  --email admin@example.com \
  --ssl

# 🔧 自定义配置
./deploy.sh deploy dev \
  --no-backup \
  --no-monitoring
```

## 🌍 访问地址

### 开发环境
- 🖥️ **前端应用**: http://localhost:3000
- 🔧 **后端 API**: http://localhost:3001
- 🌐 **Nginx 代理**: http://localhost

### 生产环境
- 🌐 **应用入口**: https://your-domain.com
- 🔒 **自动 HTTPS**: 强制 SSL 重定向

## 📊 监控面板

```bash
# 启动实时监控
./monitor.sh watch
```

监控内容包括：
- 📈 **系统资源**: CPU、内存、磁盘使用率
- 🐳 **容器状态**: 所有服务运行状态
- 🌐 **服务健康**: HTTP 健康检查
- 📋 **错误日志**: 实时错误监控
- 🔄 **自动修复**: 服务异常自动重启

## 💾 备份策略

```bash
# 手动备份
./backup.sh backup

# 查看备份列表
./backup.sh list

# 恢复数据
./backup.sh restore <backup-file>

# 自动备份（推荐生产环境）
crontab -e
# 添加：0 2 * * * /path/to/notepad-app/backup.sh backup
```

## 🔧 故障排除

### 常见问题快速解决

```bash
# 🔍 检查服务状态
./deploy.sh status

# 📋 查看错误日志
./deploy.sh logs | grep -i error

# 🔄 重启所有服务
./deploy.sh restart

# 🧹 清理并重新部署
./deploy.sh cleanup
./deploy.sh deploy dev

# 🏥 自动修复
./monitor.sh repair
```

### 端口冲突解决

```bash
# 检查端口占用
netstat -tlnp | grep :3000
lsof -i :3000

# 停止占用进程
sudo kill -9 <PID>
```

## 🚀 性能优化

### 生产环境优化
- ✅ **资源限制**: 容器内存和 CPU 限制
- ✅ **Gzip 压缩**: 静态资源压缩传输
- ✅ **缓存策略**: 浏览器和 CDN 缓存
- ✅ **连接池**: 数据库连接优化
- ✅ **健康检查**: 服务状态监控

### 扩展部署
```bash
# 多实例部署
docker-compose -f docker-compose.prod.yml up -d --scale backend=3

# 负载均衡
# Nginx 自动负载均衡到多个后端实例
```

## 🔒 安全最佳实践

### 生产环境安全检查清单
- [ ] 修改默认密码和密钥
- [ ] 配置 SSL 证书
- [ ] 设置防火墙规则
- [ ] 启用访问日志
- [ ] 配置备份策略
- [ ] 设置监控告警
- [ ] 定期安全更新

## 📚 详细文档

- 📖 **[完整部署指南](DEPLOYMENT_GUIDE.md)** - 详细的部署和配置说明
- 🐳 **[Docker 部署文档](DOCKER_DEPLOYMENT.md)** - Docker 技术细节
- 🔧 **[API 文档](docs/API.md)** - 后端 API 接口文档
- 🎨 **[前端文档](docs/FRONTEND.md)** - 前端开发指南

## 🆘 获取帮助

```bash
# 查看帮助信息
./deploy.sh help
./backup.sh help
./monitor.sh help

# 系统诊断
./monitor.sh check
```

如果遇到问题：
1. 📋 查看日志：`./deploy.sh logs`
2. 🔍 运行检查：`./monitor.sh check`
3. 📚 查看文档：`DEPLOYMENT_GUIDE.md`
4. 🐛 提交 Issue：GitHub Issues

## 🎉 开始使用

现在就开始体验 Notepad App 的强大功能吧！

```bash
# 一键启动，30秒开始使用
./quick-start.sh
```

---

**💡 提示**: 首次部署可能需要几分钟来下载 Docker 镜像，请耐心等待。

**🔥 推荐**: 生产环境部署前，请先在开发环境测试所有功能。