const mongoose = require('mongoose');
const SystemConfig = require('../models/SystemConfig');
const User = require('../models/User');
require('dotenv').config();

// 连接数据库
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/notepad')
  .then(() => console.log('数据库连接成功'))
  .catch(err => console.error('数据库连接失败:', err));

async function initTencentConfig() {
  try {
    // 查找管理员用户
    const adminUser = await User.findOne({ isAdmin: true });
    if (!adminUser) {
      console.error('未找到管理员用户，请先创建管理员账户');
      process.exit(1);
    }

    const configs = [
      {
        key: 'tencent_cloud_secret_id',
        value: process.env.TENCENT_CLOUD_SECRET_ID || '',
        description: '腾讯云SecretId',
        category: 'tencent_cloud'
      },
      {
        key: 'tencent_cloud_secret_key',
        value: process.env.TENCENT_CLOUD_SECRET_KEY || '',
        description: '腾讯云SecretKey',
        category: 'tencent_cloud',
        isEncrypted: true
      },
      {
        key: 'tencent_cloud_region',
        value: process.env.TENCENT_CLOUD_REGION || 'ap-beijing',
        description: '腾讯云地域',
        category: 'tencent_cloud'
      },
      {
        key: 'tencent_cloud_bucket',
        value: process.env.TENCENT_CLOUD_BUCKET || '',
        description: '腾讯云存储桶名称',
        category: 'tencent_cloud'
      },
      {
        key: 'tencent_cloud_domain',
        value: process.env.TENCENT_CLOUD_DOMAIN || '',
        description: '腾讯云自定义域名（可选）',
        category: 'tencent_cloud'
      }
    ];

    for (const configData of configs) {
      await SystemConfig.findOneAndUpdate(
        { key: configData.key },
        {
          ...configData,
          updatedBy: adminUser._id
        },
        { upsert: true, new: true }
      );
      console.log(`配置项 ${configData.key} 已更新`);
    }

    console.log('\n腾讯云配置初始化完成！');
    console.log('\n请确保以下环境变量已设置：');
    console.log('- TENCENT_CLOUD_SECRET_ID: 腾讯云SecretId');
    console.log('- TENCENT_CLOUD_SECRET_KEY: 腾讯云SecretKey');
    console.log('- TENCENT_CLOUD_REGION: 腾讯云地域（默认：ap-beijing）');
    console.log('- TENCENT_CLOUD_BUCKET: 腾讯云存储桶名称');
    console.log('- TENCENT_CLOUD_DOMAIN: 腾讯云自定义域名（可选）');
    console.log('\n或者通过管理后台进行配置。');

  } catch (error) {
    console.error('初始化配置失败:', error);
  } finally {
    mongoose.disconnect();
  }
}

initTencentConfig();