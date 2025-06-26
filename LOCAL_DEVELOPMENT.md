# 本地开发环境设置指南

## 问题说明

原有的 `nginx.conf` 配置文件是为 Docker 环境设计的，使用了容器名称（`frontend:3000` 和 `backend:3001`）作为上游服务器地址。在本地开发环境中，这些容器名称无法解析，导致登录失败。

## 解决方案

### 方案一：使用自动启动脚本（推荐）

1. 确保已安装必要的依赖：
   ```bash
   # 安装 nginx（如果未安装）
   brew install nginx
   
   # 确保 Node.js 已安装
   node --version
   npm --version
   ```

2. 运行自动启动脚本：
   ```bash
   ./start-local.sh
   ```

3. 访问应用：
   - 主应用地址：http://localhost:8080
   - 前端直接访问：http://localhost:3000
   - 后端API：http://localhost:3001/api

### 方案二：手动启动服务

1. **启动后端服务**：
   ```bash
   cd backend
   npm install
   npm run dev
   ```
   后端将在 http://localhost:3001 运行

2. **启动前端服务**（新终端窗口）：
   ```bash
   npm install
   npm run dev
   ```
   前端将在 http://localhost:3000 运行

3. **启动 nginx 代理**（新终端窗口）：
   ```bash
   sudo nginx -c $(pwd)/nginx.local.conf
   ```
   nginx 将在 http://localhost:8080 提供代理服务

4. **访问应用**：
   打开浏览器访问 http://localhost:8080

### 方案三：直接访问前端（无代理）

如果不想使用 nginx 代理，可以直接访问前端服务：

1. 启动后端：
   ```bash
   cd backend
   npm run dev
   ```

2. 启动前端：
   ```bash
   npm run dev
   ```

3. 直接访问：http://localhost:3000

## 停止服务

- 如果使用自动启动脚本：按 `Ctrl+C`
- 如果手动启动：
  ```bash
  # 停止 nginx
  sudo nginx -s stop
  
  # 停止前端和后端：在各自终端按 Ctrl+C
  ```

## 配置文件说明

- `nginx.conf`：Docker 环境配置（使用容器名称）
- `nginx.local.conf`：本地开发环境配置（使用 localhost）
- `start-local.sh`：自动启动脚本

## 常见问题

1. **端口被占用**：
   - 检查端口使用情况：`lsof -i :3000` 或 `lsof -i :3001`
   - 杀死占用进程：`kill -9 <PID>`

2. **nginx 权限问题**：
   - 确保使用 `sudo` 运行 nginx 命令

3. **依赖安装失败**：
   - 删除 `node_modules` 和 `package-lock.json`，重新安装
   - 使用 `npm cache clean --force` 清理缓存

## 环境变量

确保后端 `.env` 文件配置正确：
```env
PORT=3001
MONGODB_URI=mongodb://localhost:27017/notepad
JWT_SECRET=your-secret-key
FRONTEND_URL=http://localhost:3000
```