const { auth } = require('./auth');

// 管理员权限检查中间件
const adminAuth = async (req, res, next) => {
  try {
    // 首先进行普通认证
    await new Promise((resolve, reject) => {
      auth(req, res, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    // 检查用户是否是管理员
    if (!req.user || !req.user.isAdmin) {
      return res.status(403).json({ 
        error: 'Access denied. Admin privileges required.' 
      });
    }

    next();
  } catch (error) {
    res.status(401).json({ 
      error: 'Authentication failed.' 
    });
  }
};

module.exports = { adminAuth };