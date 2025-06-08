// utils/util.js
// 通用工具函数

/**
 * 格式化时间
 * @param {Date|string|number} date 日期
 * @param {string} format 格式化字符串
 * @returns {string} 格式化后的时间字符串
 */
function formatTime(date, format = 'YYYY-MM-DD HH:mm:ss') {
  const d = new Date(date);
  
  if (isNaN(d.getTime())) {
    return '';
  }
  
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hour = String(d.getHours()).padStart(2, '0');
  const minute = String(d.getMinutes()).padStart(2, '0');
  const second = String(d.getSeconds()).padStart(2, '0');
  
  return format
    .replace('YYYY', year)
    .replace('MM', month)
    .replace('DD', day)
    .replace('HH', hour)
    .replace('mm', minute)
    .replace('ss', second);
}

/**
 * 获取相对时间
 * @param {Date|string|number} date 日期
 * @returns {string} 相对时间字符串
 */
function getRelativeTime(date) {
  const now = new Date();
  const target = new Date(date);
  const diff = now.getTime() - target.getTime();
  
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  const week = 7 * day;
  const month = 30 * day;
  const year = 365 * day;
  
  if (diff < minute) {
    return '刚刚';
  } else if (diff < hour) {
    return `${Math.floor(diff / minute)}分钟前`;
  } else if (diff < day) {
    return `${Math.floor(diff / hour)}小时前`;
  } else if (diff < week) {
    return `${Math.floor(diff / day)}天前`;
  } else if (diff < month) {
    return `${Math.floor(diff / week)}周前`;
  } else if (diff < year) {
    return `${Math.floor(diff / month)}个月前`;
  } else {
    return `${Math.floor(diff / year)}年前`;
  }
}

/**
 * 防抖函数
 * @param {Function} func 要防抖的函数
 * @param {number} wait 等待时间（毫秒）
 * @returns {Function} 防抖后的函数
 */
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * 节流函数
 * @param {Function} func 要节流的函数
 * @param {number} limit 时间间隔（毫秒）
 * @returns {Function} 节流后的函数
 */
function throttle(func, limit) {
  let inThrottle;
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

/**
 * 深拷贝对象
 * @param {any} obj 要拷贝的对象
 * @returns {any} 拷贝后的对象
 */
function deepClone(obj) {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  
  if (obj instanceof Date) {
    return new Date(obj.getTime());
  }
  
  if (obj instanceof Array) {
    return obj.map(item => deepClone(item));
  }
  
  if (typeof obj === 'object') {
    const clonedObj = {};
    for (let key in obj) {
      if (obj.hasOwnProperty(key)) {
        clonedObj[key] = deepClone(obj[key]);
      }
    }
    return clonedObj;
  }
}

/**
 * 生成唯一ID
 * @returns {string} 唯一ID
 */
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

/**
 * 验证邮箱格式
 * @param {string} email 邮箱地址
 * @returns {boolean} 是否有效
 */
function validateEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

/**
 * 验证密码强度
 * @param {string} password 密码
 * @returns {object} 验证结果
 */
function validatePassword(password) {
  const result = {
    isValid: false,
    strength: 'weak',
    errors: []
  };
  
  if (!password) {
    result.errors.push('密码不能为空');
    return result;
  }
  
  if (password.length < 6) {
    result.errors.push('密码长度至少6位');
  }
  
  if (password.length > 20) {
    result.errors.push('密码长度不能超过20位');
  }
  
  const hasLower = /[a-z]/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  
  let strengthScore = 0;
  if (hasLower) strengthScore++;
  if (hasUpper) strengthScore++;
  if (hasNumber) strengthScore++;
  if (hasSpecial) strengthScore++;
  
  if (strengthScore >= 3) {
    result.strength = 'strong';
  } else if (strengthScore >= 2) {
    result.strength = 'medium';
  }
  
  result.isValid = result.errors.length === 0 && password.length >= 6;
  
  return result;
}

/**
 * 截取字符串
 * @param {string} str 原字符串
 * @param {number} length 截取长度
 * @param {string} suffix 后缀
 * @returns {string} 截取后的字符串
 */
function truncateString(str, length, suffix = '...') {
  if (!str || str.length <= length) {
    return str;
  }
  return str.substring(0, length) + suffix;
}

/**
 * 高亮搜索关键词
 * @param {string} text 原文本
 * @param {string} keyword 关键词
 * @returns {string} 高亮后的文本
 */
function highlightKeyword(text, keyword) {
  if (!keyword || !text) {
    return text;
  }
  
  const regex = new RegExp(`(${keyword})`, 'gi');
  return text.replace(regex, '<span class="highlight">$1</span>');
}

/**
 * 解析标签字符串
 * @param {string} tagsString 标签字符串
 * @returns {Array} 标签数组
 */
function parseTags(tagsString) {
  if (!tagsString) {
    return [];
  }
  
  return tagsString
    .split(/[,，\s]+/)
    .map(tag => tag.trim())
    .filter(tag => tag.length > 0)
    .slice(0, 10); // 限制最多10个标签
}

/**
 * 格式化文件大小
 * @param {number} bytes 字节数
 * @returns {string} 格式化后的大小
 */
function formatFileSize(bytes) {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * 获取文件扩展名
 * @param {string} filename 文件名
 * @returns {string} 扩展名
 */
function getFileExtension(filename) {
  if (!filename) return '';
  const lastDot = filename.lastIndexOf('.');
  return lastDot > 0 ? filename.substring(lastDot + 1).toLowerCase() : '';
}

/**
 * 检查是否为图片文件
 * @param {string} filename 文件名
 * @returns {boolean} 是否为图片
 */
function isImageFile(filename) {
  const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'];
  const ext = getFileExtension(filename);
  return imageExtensions.includes(ext);
}

/**
 * 存储数据到本地
 * @param {string} key 键名
 * @param {any} data 数据
 * @returns {boolean} 是否成功
 */
function setStorage(key, data) {
  try {
    wx.setStorageSync(key, data);
    return true;
  } catch (error) {
    console.error('存储数据失败:', error);
    return false;
  }
}

/**
 * 从本地获取数据
 * @param {string} key 键名
 * @param {any} defaultValue 默认值
 * @returns {any} 数据
 */
function getStorage(key, defaultValue = null) {
  try {
    const data = wx.getStorageSync(key);
    return data !== '' ? data : defaultValue;
  } catch (error) {
    console.error('获取数据失败:', error);
    return defaultValue;
  }
}

/**
 * 删除本地数据
 * @param {string} key 键名
 * @returns {boolean} 是否成功
 */
function removeStorage(key) {
  try {
    wx.removeStorageSync(key);
    return true;
  } catch (error) {
    console.error('删除数据失败:', error);
    return false;
  }
}

/**
 * 显示提示消息
 * @param {string} title 消息内容
 * @param {string} icon 图标类型
 * @param {number} duration 持续时间
 */
function showToast(title, icon = 'none', duration = 2000) {
  wx.showToast({
    title,
    icon,
    duration
  });
}

/**
 * 显示确认对话框
 * @param {string} content 内容
 * @param {string} title 标题
 * @returns {Promise<boolean>} 用户选择结果
 */
function showConfirm(content, title = '提示') {
  return new Promise((resolve) => {
    wx.showModal({
      title,
      content,
      success: (res) => {
        resolve(res.confirm);
      },
      fail: () => {
        resolve(false);
      }
    });
  });
}

/**
 * 复制文本到剪贴板
 * @param {string} text 要复制的文本
 * @returns {Promise<boolean>} 是否成功
 */
function copyToClipboard(text) {
  return new Promise((resolve) => {
    wx.setClipboardData({
      data: text,
      success: () => {
        showToast('已复制到剪贴板', 'success');
        resolve(true);
      },
      fail: () => {
        showToast('复制失败');
        resolve(false);
      }
    });
  });
}

/**
 * 导出所有工具函数
 */
module.exports = {
  formatTime,
  getRelativeTime,
  debounce,
  throttle,
  deepClone,
  generateId,
  validateEmail,
  validatePassword,
  truncateString,
  highlightKeyword,
  parseTags,
  formatFileSize,
  getFileExtension,
  isImageFile,
  setStorage,
  getStorage,
  removeStorage,
  showToast,
  showConfirm,
  copyToClipboard
};