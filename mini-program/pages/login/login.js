// pages/login/login.js
const app = getApp();
const util = require('../../utils/util.js');

Page({
  data: {
    // 表单数据
    formData: {
      email: '',
      password: ''
    },
    
    // 注册表单数据
    registerData: {
      username: '',
      email: '',
      password: '',
      confirmPassword: ''
    },
    
    // 界面状态
    isLogin: true, // true: 登录模式, false: 注册模式
    showPassword: false,
    showConfirmPassword: false,
    loading: false,
    
    // 验证错误
    errors: {
      email: '',
      password: '',
      username: '',
      confirmPassword: ''
    }
  },

  onLoad(options) {
    console.log('登录页面加载');
    
    // 检查是否已登录
    if (app.globalData.isLoggedIn) {
      this.redirectToHome();
      return;
    }
    
    // 检查是否从注册页面跳转过来
    if (options.mode === 'register') {
      this.setData({ isLogin: false });
    }
  },

  onShow() {
    // 清空表单数据
    this.clearForm();
  },

  // 切换登录/注册模式
  toggleMode() {
    this.setData({
      isLogin: !this.data.isLogin
    });
    this.clearForm();
  },

  // 清空表单
  clearForm() {
    this.setData({
      formData: {
        email: '',
        password: ''
      },
      registerData: {
        username: '',
        email: '',
        password: '',
        confirmPassword: ''
      },
      errors: {
        email: '',
        password: '',
        username: '',
        confirmPassword: ''
      },
      showPassword: false,
      showConfirmPassword: false
    });
  },

  // 输入处理
  onEmailInput(e) {
    const email = e.detail.value;
    if (this.data.isLogin) {
      this.setData({
        'formData.email': email,
        'errors.email': ''
      });
    } else {
      this.setData({
        'registerData.email': email,
        'errors.email': ''
      });
    }
  },

  onPasswordInput(e) {
    const password = e.detail.value;
    if (this.data.isLogin) {
      this.setData({
        'formData.password': password,
        'errors.password': ''
      });
    } else {
      this.setData({
        'registerData.password': password,
        'errors.password': ''
      });
    }
  },

  onUsernameInput(e) {
    this.setData({
      'registerData.username': e.detail.value,
      'errors.username': ''
    });
  },

  onConfirmPasswordInput(e) {
    this.setData({
      'registerData.confirmPassword': e.detail.value,
      'errors.confirmPassword': ''
    });
  },

  // 切换密码显示
  togglePasswordVisibility() {
    this.setData({
      showPassword: !this.data.showPassword
    });
  },

  toggleConfirmPasswordVisibility() {
    this.setData({
      showConfirmPassword: !this.data.showConfirmPassword
    });
  },

  // 表单验证
  validateLoginForm() {
    const { email, password } = this.data.formData;
    const errors = {};
    let isValid = true;

    // 验证邮箱
    if (!email) {
      errors.email = '请输入邮箱地址';
      isValid = false;
    } else if (!util.validateEmail(email)) {
      errors.email = '请输入有效的邮箱地址';
      isValid = false;
    }

    // 验证密码
    if (!password) {
      errors.password = '请输入密码';
      isValid = false;
    } else if (password.length < 6) {
      errors.password = '密码长度至少6位';
      isValid = false;
    }

    this.setData({ errors });
    return isValid;
  },

  validateRegisterForm() {
    const { username, email, password, confirmPassword } = this.data.registerData;
    const errors = {};
    let isValid = true;

    // 验证用户名
    if (!username) {
      errors.username = '请输入用户名';
      isValid = false;
    } else if (username.length < 2) {
      errors.username = '用户名长度至少2位';
      isValid = false;
    } else if (username.length > 20) {
      errors.username = '用户名长度不能超过20位';
      isValid = false;
    }

    // 验证邮箱
    if (!email) {
      errors.email = '请输入邮箱地址';
      isValid = false;
    } else if (!util.validateEmail(email)) {
      errors.email = '请输入有效的邮箱地址';
      isValid = false;
    }

    // 验证密码
    const passwordValidation = util.validatePassword(password);
    if (!passwordValidation.isValid) {
      errors.password = passwordValidation.errors[0];
      isValid = false;
    }

    // 验证确认密码
    if (!confirmPassword) {
      errors.confirmPassword = '请确认密码';
      isValid = false;
    } else if (password !== confirmPassword) {
      errors.confirmPassword = '两次输入的密码不一致';
      isValid = false;
    }

    this.setData({ errors });
    return isValid;
  },

  // 登录
  async handleLogin() {
    if (!this.validateLoginForm()) {
      return;
    }

    try {
      this.setData({ loading: true });
      
      const { email, password } = this.data.formData;
      const result = await app.login(email, password);

      if (result.success) {
        util.showToast('登录成功', 'success');
        this.redirectToHome();
      } else {
        util.showToast(result.error);
      }
    } catch (error) {
      console.error('登录失败:', error);
      util.showToast('登录失败，请重试');
    } finally {
      this.setData({ loading: false });
    }
  },

  // 注册
  async handleRegister() {
    if (!this.validateRegisterForm()) {
      return;
    }

    try {
      this.setData({ loading: true });
      
      const { username, email, password } = this.data.registerData;
      const result = await app.register(username, email, password);

      if (result.success) {
        util.showToast('注册成功', 'success');
        this.redirectToHome();
      } else {
        util.showToast(result.error);
      }
    } catch (error) {
      console.error('注册失败:', error);
      util.showToast('注册失败，请重试');
    } finally {
      this.setData({ loading: false });
    }
  },

  // 提交表单
  onSubmit() {
    if (this.data.loading) {
      return;
    }

    if (this.data.isLogin) {
      this.handleLogin();
    } else {
      this.handleRegister();
    }
  },

  // 跳转到首页
  redirectToHome() {
    wx.switchTab({
      url: '/pages/index/index'
    });
  },

  // 返回首页
  goBack() {
    wx.switchTab({
      url: '/pages/index/index'
    });
  },

  // 忘记密码
  forgotPassword() {
    wx.showModal({
      title: '忘记密码',
      content: '请联系管理员重置密码，或通过邮箱找回密码功能。',
      showCancel: false,
      confirmText: '知道了'
    });
  },

  // 快速登录（演示用）
  quickLogin() {
    this.setData({
      'formData.email': 'demo@example.com',
      'formData.password': '123456'
    });
  },

  // 微信授权登录（预留）
  wechatLogin() {
    wx.showToast({
      title: '功能开发中',
      icon: 'none'
    });
  }
});