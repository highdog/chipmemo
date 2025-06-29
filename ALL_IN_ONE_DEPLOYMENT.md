# 一体化 Docker 部署指南

这个方案将前端（Next.js）、后端（Node.js/Express）、数据库（MongoDB）和反向代理（Nginx）全部打包到一个 Docker 镜像中，实现真正的一键部署。

## 🎯 优势

- **一键部署**: 只需要一个 Docker 镜像，无需复杂的容器编排
- **零配置**: 所有服务都预配置好，开箱即用
- **资源优化**: 所有服务在同一个容器中运行，减少资源开销
- **简化运维**: 只需要管理一个容器
- **快速启动**: 无需等待多个容器启动和网络连接

## 📦 包含的服务

- **MongoDB 7.0**: 数据库服务
- **Node.js 18**: 后端 API 服务（端口 3001）
- **Next.js**: 前端应用（端口 3000）
- **Nginx**: 反向代理和负载均衡（端口 80）
- **Supervisor**: 进程管理器，确保所有服务正常运行

## 🚀 快速开始

### 1. 构建镜像

```bash
# 给构建脚本执行权限
chmod +x build-all-in-one.sh

# 运行构建脚本
./build-all-in-one.sh
```

或者手动构建：

```bash
docker build -f Dockerfile.all-in-one -t notepad-all-in-one:latest .
```

### 2. 运行容器

```bash
# 基础运行
docker run -d -p 80:80 --name notepad-app notepad-all-in-one:latest

# 带数据持久化
docker run -d -p 80:80 \
  -v notepad-data:/data/db \
  -v notepad-logs:/var/log \
  --name notepad-app \
  notepad-all-in-one:latest

# 自定义环境变量
docker run -d -p 80:80 \
  -e JWT_SECRET="your-custom-secret" \
  -e MONGODB_PASSWORD="your-custom-password" \
  --name notepad-app \
  notepad-all-in-one:latest
```

### 3. 访问应用

- **主应用**: http://localhost
- **API 接口**: http://localhost/api
- **健康检查**: http://localhost/health

## 🔧 容器管理

### 查看容器状态
```bash
docker ps
docker logs notepad-app
```

### 进入容器调试
```bash
# 进入容器
docker exec -it notepad-app bash

# 查看服务状态
docker exec -it notepad-app supervisorctl status

# 查看 MongoDB 状态
docker exec -it notepad-app mongosh --eval "db.adminCommand('ping')"
```

### 重启服务
```bash
# 重启特定服务
docker exec -it notepad-app supervisorctl restart backend
docker exec -it notepad-app supervisorctl restart frontend
docker exec -it notepad-app supervisorctl restart nginx

# 重启所有服务
docker restart notepad-app
```

### 停止和清理
```bash
# 停止容器
docker stop notepad-app

# 删除容器
docker rm notepad-app

# 删除镜像
docker rmi notepad-all-in-one:latest
```

## 📊 监控和日志

### 查看日志
```bash
# 容器总日志
docker logs notepad-app

# 特定服务日志
docker exec -it notepad-app tail -f /var/log/supervisor/backend.log
docker exec -it notepad-app tail -f /var/log/supervisor/frontend.log
docker exec -it notepad-app tail -f /var/log/supervisor/nginx.log
docker exec -it notepad-app tail -f /var/log/mongodb/mongod.log
```

### 服务状态监控
```bash
# 查看所有服务状态
docker exec -it notepad-app supervisorctl status

# 查看资源使用
docker stats notepad-app
```

## 🔒 安全配置

### 默认配置
- MongoDB 管理员用户: `admin` / `password123`
- MongoDB 应用用户: `notepad_user` / `notepad_password`
- JWT Secret: `your-super-secret-jwt-key-change-this-in-production`

### 生产环境建议
```bash
# 使用强密码和自定义配置
docker run -d -p 80:80 \
  -e MONGODB_ADMIN_PASSWORD="$(openssl rand -base64 32)" \
  -e JWT_SECRET="$(openssl rand -base64 64)" \
  -e NODE_ENV="production" \
  -v notepad-data:/data/db \
  --name notepad-app \
  notepad-all-in-one:latest
```

## 🌐 生产部署

### 1. 服务器部署
```bash
# 在服务器上拉取镜像
docker pull your-registry/notepad-all-in-one:latest

# 运行生产容器
docker run -d \
  -p 80:80 \
  -p 443:443 \
  -v /data/notepad:/data/db \
  -v /logs/notepad:/var/log \
  --restart unless-stopped \
  --name notepad-prod \
  your-registry/notepad-all-in-one:latest
```

### 2. 域名和 SSL
如果需要 HTTPS，可以在容器外部使用 Nginx 或 Cloudflare 等服务提供 SSL 终止。

### 3. 备份策略
```bash
# 数据库备份
docker exec notepad-app mongodump --out /data/backups/$(date +%Y%m%d)

# 复制备份到主机
docker cp notepad-app:/data/backups ./backups
```

## 🐛 故障排除

### 常见问题

1. **容器启动失败**
   ```bash
   docker logs notepad-app
   ```

2. **服务无法访问**
   ```bash
   docker exec -it notepad-app supervisorctl status
   docker exec -it notepad-app netstat -tlnp
   ```

3. **数据库连接问题**
   ```bash
   docker exec -it notepad-app mongosh --eval "db.adminCommand('ping')"
   ```

4. **前端构建失败**
   - 检查 Node.js 版本兼容性
   - 确保所有依赖都已正确安装

### 性能优化

1. **内存限制**
   ```bash
   docker run -d -p 80:80 --memory="2g" --name notepad-app notepad-all-in-one:latest
   ```

2. **CPU 限制**
   ```bash
   docker run -d -p 80:80 --cpus="1.5" --name notepad-app notepad-all-in-one:latest
   ```

## 📝 注意事项

1. **资源需求**: 建议至少 2GB 内存和 2 CPU 核心
2. **数据持久化**: 生产环境务必挂载数据卷
3. **安全性**: 修改默认密码和密钥
4. **监控**: 建议配置外部监控系统
5. **备份**: 定期备份数据库和重要文件

## 🔄 更新和维护

### 更新应用
```bash
# 构建新镜像
./build-all-in-one.sh

# 停止旧容器
docker stop notepad-app
docker rm notepad-app

# 启动新容器
docker run -d -p 80:80 -v notepad-data:/data/db --name notepad-app notepad-all-in-one:latest
```

### 数据迁移
```bash
# 导出数据
docker exec notepad-app mongodump --out /tmp/backup
docker cp notepad-app:/tmp/backup ./backup

# 导入数据到新容器
docker cp ./backup notepad-new:/tmp/backup
docker exec notepad-new mongorestore /tmp/backup
```

这个一体化方案特别适合小到中型项目的快速部署，能够显著简化部署和运维复杂度。