# Docker 部署指南

本项目支持使用 Docker 和 Docker Compose 进行完整的容器化部署，包括前端、后端和数据库服务。

## 前置要求

- Docker (版本 20.10+)
- Docker Compose (版本 2.0+)
- 至少 2GB 可用内存
- 至少 5GB 可用磁盘空间

## 快速开始

### 1. 克隆项目并进入目录

```bash
git clone <your-repo-url>
cd notepad-app
```

### 2. 配置环境变量

```bash
# 复制环境变量模板
cp .env.example .env

# 编辑环境变量（重要：修改生产环境的密码和密钥）
vim .env
```

### 3. 构建并启动所有服务

```bash
# 构建并启动所有服务
docker-compose up -d

# 查看服务状态
docker-compose ps

# 查看日志
docker-compose logs -f
```

### 4. 访问应用

- **前端应用**: http://localhost:3000
- **后端 API**: http://localhost:3001
- **Nginx 代理**: http://localhost (可选)
- **MongoDB**: localhost:27017

## 服务架构

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Nginx Proxy   │    │   Frontend      │    │   Backend API   │
│   (Port 80)     │───▶│   (Port 3000)   │───▶│   (Port 3001)   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                                        │
                                                        ▼
                                               ┌─────────────────┐
                                               │   MongoDB       │
                                               │   (Port 27017)  │
                                               └─────────────────┘
```

## 详细配置

### 服务说明

1. **MongoDB**: 数据库服务
   - 镜像: `mongo:7.0`
   - 端口: `27017`
   - 数据持久化: `mongodb_data` volume

2. **Backend**: Node.js API 服务
   - 基于 `node:18-alpine`
   - 端口: `3001`
   - 健康检查: `/health` 端点

3. **Frontend**: Next.js 应用
   - 基于 `node:18-alpine`
   - 端口: `3000`
   - 使用 standalone 输出模式

4. **Nginx**: 反向代理（可选）
   - 镜像: `nginx:alpine`
   - 端口: `80`, `443`
   - 代理前端和 API 请求

### 环境变量配置

#### 前端环境变量
- `NEXT_PUBLIC_API_URL`: 后端 API 地址

#### 后端环境变量
- `NODE_ENV`: 运行环境
- `PORT`: 服务端口
- `MONGODB_URI`: MongoDB 连接字符串
- `JWT_SECRET`: JWT 签名密钥
- `CORS_ORIGIN`: 允许的跨域来源

#### 数据库环境变量
- `MONGO_INITDB_ROOT_USERNAME`: MongoDB 管理员用户名
- `MONGO_INITDB_ROOT_PASSWORD`: MongoDB 管理员密码
- `MONGO_INITDB_DATABASE`: 初始数据库名

## 常用命令

### 启动和停止

```bash
# 启动所有服务
docker-compose up -d

# 停止所有服务
docker-compose down

# 停止并删除数据卷
docker-compose down -v

# 重新构建并启动
docker-compose up --build -d
```

### 日志查看

```bash
# 查看所有服务日志
docker-compose logs -f

# 查看特定服务日志
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f mongodb
```

### 服务管理

```bash
# 重启特定服务
docker-compose restart backend

# 查看服务状态
docker-compose ps

# 进入容器
docker-compose exec backend sh
docker-compose exec mongodb mongosh
```

### 数据备份和恢复

```bash
# 备份 MongoDB 数据
docker-compose exec mongodb mongodump --db notepad --out /data/backup

# 恢复 MongoDB 数据
docker-compose exec mongodb mongorestore --db notepad /data/backup/notepad
```

## 生产环境部署

### 1. 安全配置

```bash
# 修改默认密码和密钥
vim .env
```

重要配置项：
- `JWT_SECRET`: 使用强随机字符串
- `MONGO_INITDB_ROOT_PASSWORD`: 使用强密码
- `CORS_ORIGIN`: 设置为实际域名

### 2. SSL 证书配置

```bash
# 创建 SSL 证书目录
mkdir ssl

# 将证书文件放入 ssl 目录
# ssl/cert.pem
# ssl/key.pem

# 取消注释 nginx.conf 中的 HTTPS 配置
```

### 3. 域名配置

修改 `nginx.conf` 中的 `server_name` 为实际域名。

### 4. 资源限制

在 `docker-compose.yml` 中添加资源限制：

```yaml
services:
  backend:
    # ... 其他配置
    deploy:
      resources:
        limits:
          memory: 512M
          cpus: '0.5'
```

## 故障排除

### 常见问题

1. **端口冲突**
   ```bash
   # 检查端口占用
   lsof -i :3000
   lsof -i :3001
   lsof -i :27017
   ```

2. **权限问题**
   ```bash
   # 检查 Docker 权限
   sudo usermod -aG docker $USER
   ```

3. **内存不足**
   ```bash
   # 清理未使用的镜像和容器
   docker system prune -a
   ```

4. **数据库连接失败**
   ```bash
   # 检查 MongoDB 服务状态
   docker-compose logs mongodb
   
   # 测试数据库连接
   docker-compose exec mongodb mongosh --eval "db.adminCommand('ping')"
   ```

### 性能优化

1. **启用 Docker BuildKit**
   ```bash
   export DOCKER_BUILDKIT=1
   ```

2. **使用多阶段构建缓存**
   ```bash
   docker-compose build --parallel
   ```

3. **配置 Docker 镜像加速器**（中国用户）
   ```json
   {
     "registry-mirrors": [
       "https://mirror.ccs.tencentyun.com"
     ]
   }
   ```

## 监控和维护

### 健康检查

```bash
# 检查服务健康状态
curl http://localhost:3001/health
curl http://localhost:3000
```

### 日志轮转

在 `docker-compose.yml` 中配置日志轮转：

```yaml
services:
  backend:
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

### 自动重启

所有服务都配置了 `restart: unless-stopped`，确保容器异常退出时自动重启。

## 小程序部署注意事项

由于小程序有域名白名单限制，部署到生产环境后需要：

1. 在微信小程序后台配置服务器域名
2. 更新小程序中的 API 地址
3. 确保使用 HTTPS 协议

```javascript
// mini-program/utils/api.js
this.baseUrl = 'https://your-domain.com/api';
```

## 支持

如果遇到问题，请检查：
1. Docker 和 Docker Compose 版本
2. 系统资源（内存、磁盘空间）
3. 网络连接
4. 防火墙设置
5. 日志输出

更多帮助请查看项目文档或提交 Issue。