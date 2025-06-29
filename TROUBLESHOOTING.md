# 🔧 故障排除指南

本指南帮助你解决一体化Docker部署过程中可能遇到的常见问题。

## 🚨 构建阶段问题

### 1. 文件路径错误

**错误信息：**
```
ERROR: failed to solve: failed to compute cache key: "/backend/src": not found
```

**原因：** Dockerfile中的COPY指令引用了不存在的路径

**解决方案：**
```bash
# 检查项目结构
ls -la
ls -la backend/

# 确保在项目根目录执行构建
pwd
# 应该显示: /path/to/notepad-app

# 重新构建
./build-all-in-one.sh simple
```

### 2. 依赖安装失败

**错误信息：**
```
npm ERR! code ENOENT
npm ERR! syscall open
npm ERR! path /app/package.json
```

**解决方案：**
```bash
# 清理Docker缓存
docker system prune -f
docker builder prune -f

# 重新构建（不使用缓存）
docker build --no-cache -f Dockerfile.simple -t notepad-simple:latest .
```

### 3. 权限问题

**错误信息：**
```
permission denied while trying to connect to the Docker daemon socket
```

**解决方案：**
```bash
# macOS/Linux
sudo chmod +x build-all-in-one.sh run-container.sh

# 或者添加用户到docker组
sudo usermod -aG docker $USER
# 然后重新登录
```

## 🐳 容器运行问题

### 1. 端口冲突

**错误信息：**
```
Error response from daemon: driver failed programming external connectivity
```

**解决方案：**
```bash
# 检查端口占用
lsof -i :80
lsof -i :3000
lsof -i :3001

# 停止占用端口的进程
sudo kill -9 <PID>

# 或者使用不同端口运行
./run-container.sh simple 8080 3000 3001
```

### 2. 服务启动失败

**检查服务状态：**
```bash
# 进入容器
docker exec -it notepad-app bash

# 检查Supervisor状态
supervisorctl status

# 查看服务日志
supervisorctl tail -f mongodb
supervisorctl tail -f backend
supervisorctl tail -f frontend
supervisorctl tail -f nginx

# 手动重启服务
supervisorctl restart mongodb
supervisorctl restart backend
```

### 3. MongoDB连接问题

**检查MongoDB状态：**
```bash
# 进入容器
docker exec -it notepad-app bash

# 检查MongoDB进程
ps aux | grep mongod

# 检查MongoDB日志
tail -f /var/log/mongodb/mongod.log

# 测试MongoDB连接
mongosh --eval "db.adminCommand('ismaster')"

# 检查数据库初始化
mongosh --eval "show dbs"
```

**常见MongoDB问题：**
```bash
# 权限问题
chown -R mongodb:mongodb /data/db
chmod 755 /data/db

# 重新初始化数据库
rm -rf /data/db/*
rm -f /data/.mongo-initialized
supervisorctl restart mongodb
```

### 4. 前端/后端服务问题

**检查Node.js服务：**
```bash
# 检查端口监听
netstat -tlnp | grep :3000
netstat -tlnp | grep :3001

# 检查环境变量
env | grep NODE
env | grep MONGO

# 手动启动服务（调试用）
cd /app && npm start
cd /app/backend && npm start
```

### 5. Nginx代理问题

**检查Nginx配置：**
```bash
# 测试配置文件
nginx -t

# 查看Nginx日志
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log

# 重新加载配置
nginx -s reload
```

## 🌐 网络连接问题

### 1. API请求失败

**测试API连接：**
```bash
# 从容器内部测试
docker exec -it notepad-app bash
curl http://localhost:3001/api/health
curl http://localhost/api/health

# 从宿主机测试
curl http://localhost/api/health
curl http://localhost:8080/api/health  # 如果使用了自定义端口
```

### 2. 前端页面无法加载

**检查步骤：**
```bash
# 检查前端服务
curl http://localhost:3000

# 检查Nginx代理
curl -I http://localhost/

# 检查浏览器控制台错误
# 打开浏览器开发者工具，查看Network和Console标签
```

## 📊 性能问题

### 1. 容器资源不足

**监控资源使用：**
```bash
# 查看容器资源使用
docker stats notepad-app

# 进入容器查看系统资源
docker exec -it notepad-app bash
top
free -h
df -h
```

**增加资源限制：**
```bash
# 停止当前容器
docker stop notepad-app
docker rm notepad-app

# 使用更多资源重新运行
docker run -d \
  --name notepad-app \
  --memory=2g \
  --cpus=2 \
  -p 80:80 \
  -p 3000:3000 \
  -p 3001:3001 \
  -v notepad_data:/data/db \
  notepad-simple:latest
```

### 2. 数据库性能问题

**优化MongoDB：**
```bash
# 检查数据库状态
mongosh --eval "db.serverStatus()"

# 查看慢查询
mongosh --eval "db.setProfilingLevel(2, {slowms: 100})"
mongosh --eval "db.system.profile.find().sort({ts: -1}).limit(5)"

# 创建索引（根据你的查询模式）
mongosh notepad --eval "db.users.createIndex({email: 1})"
mongosh notepad --eval "db.notes.createIndex({userId: 1, createdAt: -1})"
```

## 🔍 调试技巧

### 1. 详细日志查看

```bash
# 查看容器启动日志
docker logs notepad-app

# 实时跟踪日志
docker logs -f notepad-app

# 查看特定服务日志
docker exec -it notepad-app tail -f /var/log/supervisor/mongodb.log
docker exec -it notepad-app tail -f /var/log/supervisor/backend.log
docker exec -it notepad-app tail -f /var/log/supervisor/frontend.log
```

### 2. 交互式调试

```bash
# 进入容器进行调试
docker exec -it notepad-app bash

# 检查文件系统
ls -la /app
ls -la /app/backend
ls -la /data/db

# 检查进程
ps aux

# 检查网络
netstat -tlnp
```

### 3. 健康检查脚本

```bash
# 创建健康检查脚本
cat > health-check.sh << 'EOF'
#!/bin/bash
echo "🔍 Health Check Starting..."

# 检查容器状态
if ! docker ps | grep -q notepad-app; then
    echo "❌ Container is not running"
    exit 1
fi

# 检查端口
for port in 80 3000 3001; do
    if curl -f http://localhost:$port/health > /dev/null 2>&1; then
        echo "✅ Port $port is responding"
    else
        echo "❌ Port $port is not responding"
    fi
done

# 检查API
if curl -f http://localhost/api/health > /dev/null 2>&1; then
    echo "✅ API is healthy"
else
    echo "❌ API is not responding"
fi

echo "🎉 Health Check Completed"
EOF

chmod +x health-check.sh
./health-check.sh
```

## 🆘 紧急恢复

### 完全重置

```bash
# 停止并删除容器
docker stop notepad-app
docker rm notepad-app

# 删除数据卷（注意：这会删除所有数据）
docker volume rm notepad_data

# 删除镜像
docker rmi notepad-simple:latest
docker rmi notepad-full:latest

# 清理Docker缓存
docker system prune -a -f

# 重新构建和运行
./build-all-in-one.sh simple
./run-container.sh simple
```

### 数据备份恢复

```bash
# 备份数据
docker exec notepad-app mongodump --out /tmp/backup
docker cp notepad-app:/tmp/backup ./mongodb-backup

# 恢复数据
docker cp ./mongodb-backup notepad-app:/tmp/restore
docker exec notepad-app mongorestore /tmp/restore
```

## 📞 获取帮助

如果以上方法都无法解决问题，请：

1. **收集信息：**
   ```bash
   # 生成诊断报告
   echo "=== System Info ===" > debug-report.txt
   uname -a >> debug-report.txt
   docker version >> debug-report.txt
   echo "\n=== Container Status ===" >> debug-report.txt
   docker ps -a >> debug-report.txt
   echo "\n=== Container Logs ===" >> debug-report.txt
   docker logs notepad-app >> debug-report.txt 2>&1
   ```

2. **检查常见问题：**
   - 确保Docker服务正在运行
   - 确保有足够的磁盘空间
   - 确保网络连接正常
   - 检查防火墙设置

3. **社区支持：**
   - 查看项目文档
   - 搜索相关错误信息
   - 提交Issue时附上诊断报告

记住：大多数问题都可以通过重新构建和重新部署来解决！