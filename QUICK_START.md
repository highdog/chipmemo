# 🚀 一体化部署快速入门

这个方案将前端、后端、数据库、反向代理全部打包到一个Docker镜像中，实现真正的一键部署。

## ⚡ 超快速开始（3步搞定）

```bash
# 1. 构建镜像
./build-all-in-one.sh simple

# 2. 运行容器
./run-container.sh simple

# 3. 访问应用
# 打开浏览器访问 http://localhost
```

## 📋 详细步骤

### 1. 构建Docker镜像

**简化版（推荐用于开发测试）:**
```bash
./build-all-in-one.sh simple
```

**完整版（用于生产环境）:**
```bash
./build-all-in-one.sh full
```

### 2. 运行容器

**基础运行:**
```bash
./run-container.sh simple
```

**自定义端口:**
```bash
./run-container.sh simple 8080 3000 3001
```

**手动运行:**
```bash
docker run -d -p 80:80 -p 3000:3000 -p 3001:3001 \
  -v notepad-data:/data/db \
  --name notepad-app \
  notepad-simple:latest
```

### 3. 访问应用

- **主应用**: http://localhost
- **API接口**: http://localhost/api  
- **前端直连**: http://localhost:3000
- **后端直连**: http://localhost:3001

## 🔧 管理命令

```bash
# 查看容器状态
docker ps

# 查看应用日志
docker logs -f notepad-app

# 查看服务状态
docker exec -it notepad-app supervisorctl status

# 进入容器调试
docker exec -it notepad-app bash

# 重启服务
docker exec -it notepad-app supervisorctl restart backend
docker exec -it notepad-app supervisorctl restart frontend

# 停止容器
docker stop notepad-app

# 删除容器
docker rm notepad-app
```

## 📦 包含的服务

| 服务 | 端口 | 说明 |
|------|------|------|
| Nginx | 80 | 反向代理，统一入口 |
| Next.js前端 | 3000 | React应用 |
| Node.js后端 | 3001 | Express API |
| MongoDB | 27017 | 数据库（内部访问） |

## 🎯 优势

✅ **一键部署** - 只需要一个Docker镜像  
✅ **零配置** - 所有服务预配置完成  
✅ **资源优化** - 单容器运行，减少开销  
✅ **简化运维** - 只需管理一个容器  
✅ **快速启动** - 无需等待多容器协调  
✅ **数据持久化** - 自动挂载数据卷  

## 🔒 默认配置

- **MongoDB管理员**: admin / password123
- **MongoDB应用用户**: notepad_user / notepad_password  
- **JWT密钥**: your-super-secret-jwt-key-change-this-in-production

> ⚠️ **生产环境请务必修改默认密码！**

## 🐛 故障排除

### 容器启动失败
```bash
docker logs notepad-app
```

### 服务无法访问
```bash
# 检查服务状态
docker exec -it notepad-app supervisorctl status

# 检查端口
docker exec -it notepad-app netstat -tlnp
```

### 数据库连接问题
```bash
# 测试MongoDB连接
docker exec -it notepad-app mongosh --eval "db.adminCommand('ping')"
```

### 重新构建
```bash
# 删除旧镜像
docker rmi notepad-simple:latest

# 重新构建
./build-all-in-one.sh simple
```

## 🌐 生产部署建议

1. **使用完整版镜像**
   ```bash
   ./build-all-in-one.sh full
   ```

2. **配置资源限制**
   ```bash
   docker run -d -p 80:80 \
     --memory="2g" \
     --cpus="1.5" \
     --restart unless-stopped \
     -v /data/notepad:/data/db \
     --name notepad-prod \
     notepad-all-in-one:latest
   ```

3. **定期备份数据**
   ```bash
   docker exec notepad-prod mongodump --out /data/backups/$(date +%Y%m%d)
   ```

4. **监控和日志**
   ```bash
   # 设置日志轮转
   docker run -d \
     --log-driver json-file \
     --log-opt max-size=10m \
     --log-opt max-file=3 \
     # ... 其他参数
   ```

## 📞 技术支持

如果遇到问题，请检查：
1. Docker是否正常运行
2. 端口是否被占用
3. 磁盘空间是否充足
4. 内存是否足够（建议2GB+）

---

🎉 **恭喜！你现在拥有了一个完全自包含的Web应用！**