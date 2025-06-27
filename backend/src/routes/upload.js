const express = require('express');
const multer = require('multer');
const COS = require('cos-nodejs-sdk-v5');
const { auth } = require('../middleware/auth');
const SystemConfig = require('../models/SystemConfig');
const crypto = require('crypto');
const path = require('path');

const router = express.Router();

// 配置multer用于处理文件上传
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB限制
  },
  fileFilter: (req, file, cb) => {
    // 只允许图片文件
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('只允许上传图片文件'), false);
    }
  }
});

// 获取腾讯云配置
const getTencentCloudConfig = async () => {
  const configs = await SystemConfig.find({
    key: {
      $in: [
        'tencent_cloud_secret_id',
        'tencent_cloud_secret_key',
        'tencent_cloud_region',
        'tencent_cloud_bucket',
        'tencent_cloud_domain'
      ]
    }
  });
  
  const configMap = {};
  configs.forEach(config => {
    configMap[config.key] = config.value;
  });
  
  return {
    secretId: configMap.tencent_cloud_secret_id,
    secretKey: configMap.tencent_cloud_secret_key,
    region: configMap.tencent_cloud_region || 'ap-beijing',
    bucket: configMap.tencent_cloud_bucket,
    domain: configMap.tencent_cloud_domain
  };
};

// 上传图片到腾讯云
router.post('/image', auth, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '没有上传文件' });
    }
    
    // 获取腾讯云配置
    const config = await getTencentCloudConfig();
    console.log('腾讯云配置状态:', {
      hasSecretId: !!config.secretId,
      hasSecretKey: !!config.secretKey,
      hasBucket: !!config.bucket,
      region: config.region,
      hasDomain: !!config.domain
    });
    
    if (!config.secretId || !config.secretKey || !config.bucket) {
      console.error('腾讯云配置不完整:', config);
      return res.status(500).json({ error: '腾讯云配置不完整，请联系管理员' });
    }
    
    // 初始化COS客户端
    const cos = new COS({
      SecretId: config.secretId,
      SecretKey: config.secretKey,
    });
    
    // 生成唯一文件名
    const fileExtension = path.extname(req.file.originalname);
    const fileName = `images/${Date.now()}-${crypto.randomBytes(8).toString('hex')}${fileExtension}`;
    
    // 上传到腾讯云COS
    const uploadResult = await new Promise((resolve, reject) => {
      cos.putObject({
        Bucket: config.bucket,
        Region: config.region,
        Key: fileName,
        Body: req.file.buffer,
        ContentType: req.file.mimetype,
      }, (err, data) => {
        if (err) {
          reject(err);
        } else {
          resolve(data);
        }
      });
    });
    
    // 构建访问URL
    let imageUrl;
    if (config.domain) {
      // 使用自定义域名
      imageUrl = `${config.domain.replace(/\/$/, '')}/${fileName}`;
    } else {
      // 使用默认域名
      imageUrl = `https://${config.bucket}.cos.${config.region}.myqcloud.com/${fileName}`;
    }
    
    res.json({
      success: true,
      data: {
        url: imageUrl,
        fileName: fileName,
        size: req.file.size,
        mimetype: req.file.mimetype
      }
    });
    
  } catch (error) {
    console.error('Upload image error:', error);
    res.status(500).json({ error: '图片上传失败: ' + error.message });
  }
});

module.exports = router;