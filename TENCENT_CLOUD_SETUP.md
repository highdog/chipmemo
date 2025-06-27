# 腾讯云图片上传配置指南

本应用支持将图片上传到腾讯云对象存储（COS），以下是配置步骤：

## 1. 腾讯云COS配置

### 1.1 创建存储桶
1. 登录 [腾讯云控制台](https://console.cloud.tencent.com/)
2. 进入 [对象存储 COS](https://console.cloud.tencent.com/cos5)
3. 创建存储桶，记录存储桶名称和地域
4. 设置存储桶权限为公有读私有写

### 1.2 获取API密钥
1. 进入 [访问管理控制台](https://console.cloud.tencent.com/cam/capi)
2. 创建或查看API密钥
3. 记录SecretId和SecretKey

### 1.3 配置自定义域名（可选）
1. 在存储桶设置中配置自定义域名
2. 配置CDN加速（推荐）

## 2. 应用配置

### 方法一：环境变量配置

在后端项目根目录创建或编辑 `.env` 文件：

```bash
# 腾讯云配置
TENCENT_CLOUD_SECRET_ID=your_secret_id
TENCENT_CLOUD_SECRET_KEY=your_secret_key
TENCENT_CLOUD_REGION=ap-beijing
TENCENT_CLOUD_BUCKET=your_bucket_name
TENCENT_CLOUD_DOMAIN=https://your-custom-domain.com
```

然后运行初始化脚本：

```bash
cd backend
node src/scripts/init-tencent-config.js
```

### 方法二：管理后台配置

1. 登录应用管理后台
2. 进入系统配置页面
3. 配置以下项目：
   - `tencent_cloud_secret_id`: 腾讯云SecretId
   - `tencent_cloud_secret_key`: 腾讯云SecretKey
   - `tencent_cloud_region`: 腾讯云地域（如：ap-beijing）
   - `tencent_cloud_bucket`: 存储桶名称
   - `tencent_cloud_domain`: 自定义域名（可选）

## 3. 测试配置

1. 重启后端服务
2. 在应用中尝试上传图片
3. 检查后端日志，确认配置正确

## 4. 常见问题

### 4.1 上传失败
- 检查API密钥是否正确
- 确认存储桶名称和地域是否匹配
- 查看后端日志获取详细错误信息

### 4.2 图片无法访问
- 确认存储桶权限设置为公有读
- 检查自定义域名配置是否正确
- 验证图片URL是否可以直接访问

### 4.3 配置检查
运行以下命令检查配置状态：

```bash
# 查看后端日志
npm run dev

# 尝试上传图片，观察控制台输出
```

## 5. 安全建议

1. 定期轮换API密钥
2. 使用RAM子账号，仅授予必要的COS权限
3. 配置存储桶防盗链
4. 启用CDN和HTTPS

## 6. 费用说明

腾讯云COS按使用量计费，包括：
- 存储费用
- 请求费用
- 流量费用

建议查看 [腾讯云COS计费说明](https://cloud.tencent.com/document/product/436/16871) 了解详细费用。