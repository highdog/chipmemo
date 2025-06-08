// pages/note-edit/note-edit.js
const app = getApp();
const { notesApi } = require('../../utils/api');
const { showToast, showConfirm, parseTagsFromContent, debounce } = require('../../utils/util');

Page({
  data: {
    // 笔记数据
    noteId: '',
    isNew: true,
    title: '',
    content: '',
    tags: [],
    
    // UI状态
    loading: false,
    saving: false,
    hasChanges: false,
    
    // 标签管理
    showTagInput: false,
    tagInput: '',
    availableTags: [],
    
    // 编辑器状态
    titleFocused: false,
    contentFocused: false,
    cursorPosition: 0,
    
    // 工具栏
    showToolbar: false,
    toolbarItems: [
      { key: 'bold', title: '加粗', icon: 'B' },
      { key: 'italic', title: '斜体', icon: 'I' },
      { key: 'list', title: '列表', icon: '•' },
      { key: 'link', title: '链接', icon: '🔗' },
      { key: 'image', title: '图片', icon: '📷' }
    ],
    
    // 自动保存
    autoSaveEnabled: true,
    lastSaveTime: null
  },

  onLoad(options) {
    // 检查登录状态
    if (!app.globalData.isLoggedIn) {
      wx.reLaunch({
        url: '/pages/login/login'
      });
      return;
    }
    
    const { id } = options;
    
    if (id) {
      this.setData({ 
        noteId: id, 
        isNew: false 
      });
      this.loadNote();
    } else {
      this.setData({ isNew: true });
      this.initNewNote();
    }
    
    this.loadAvailableTags();
    this.setupAutoSave();
  },

  onShow() {
    // 检查是否有未保存的更改
    if (this.data.hasChanges) {
      this.showUnsavedChangesHint();
    }
  },

  onHide() {
    // 页面隐藏时自动保存
    if (this.data.hasChanges && this.data.autoSaveEnabled) {
      this.autoSave();
    }
  },

  onUnload() {
    // 页面卸载时清理定时器
    if (this.autoSaveTimer) {
      clearTimeout(this.autoSaveTimer);
    }
  },

  // 加载笔记数据
  async loadNote() {
    try {
      this.setData({ loading: true });
      
      const response = await notesApi.getNote(this.data.noteId);
      if (response.success) {
        const note = response.data;
        this.setData({
          title: note.title,
          content: note.content,
          tags: note.tags || [],
          loading: false
        });
      } else {
        throw new Error(response.message || '加载笔记失败');
      }
    } catch (error) {
      console.error('加载笔记失败:', error);
      this.setData({ loading: false });
      showToast('加载笔记失败', 'error');
      wx.navigateBack();
    }
  },

  // 初始化新笔记
  initNewNote() {
    const now = new Date();
    const defaultTitle = `笔记 ${now.getMonth() + 1}-${now.getDate()}`;
    
    this.setData({
      title: defaultTitle,
      content: '',
      tags: []
    });
  },

  // 加载可用标签
  async loadAvailableTags() {
    try {
      const response = await notesApi.getTags();
      if (response.success) {
        this.setData({ availableTags: response.data });
      }
    } catch (error) {
      console.error('加载标签失败:', error);
    }
  },

  // 设置自动保存
  setupAutoSave() {
    this.debouncedAutoSave = debounce(() => {
      if (this.data.hasChanges && this.data.autoSaveEnabled && !this.data.isNew) {
        this.autoSave();
      }
    }, 3000);
  },

  // 自动保存
  async autoSave() {
    if (this.data.saving || this.data.isNew) return;
    
    try {
      const { title, content, tags } = this.data;
      
      if (!title.trim() || !content.trim()) return;
      
      const response = await notesApi.updateNote(this.data.noteId, {
        title: title.trim(),
        content: content.trim(),
        tags
      });
      
      if (response.success) {
        this.setData({
          hasChanges: false,
          lastSaveTime: new Date().toLocaleTimeString()
        });
      }
    } catch (error) {
      console.error('自动保存失败:', error);
    }
  },

  // 手动保存
  async saveNote() {
    const { title, content, tags, isNew } = this.data;
    
    if (!title.trim()) {
      showToast('标题不能为空', 'error');
      return;
    }
    
    if (!content.trim()) {
      showToast('内容不能为空', 'error');
      return;
    }
    
    try {
      this.setData({ saving: true });
      
      const noteData = {
        title: title.trim(),
        content: content.trim(),
        tags
      };
      
      let response;
      if (isNew) {
        response = await notesApi.createNote(noteData);
      } else {
        response = await notesApi.updateNote(this.data.noteId, noteData);
      }
      
      if (response.success) {
        this.setData({
          hasChanges: false,
          saving: false,
          lastSaveTime: new Date().toLocaleTimeString()
        });
        
        if (isNew) {
          this.setData({
            noteId: response.data.id,
            isNew: false
          });
        }
        
        showToast('保存成功');
        
        // 延迟返回，让用户看到保存成功提示
        setTimeout(() => {
          wx.navigateBack();
        }, 1000);
      } else {
        throw new Error(response.message || '保存失败');
      }
    } catch (error) {
      console.error('保存笔记失败:', error);
      this.setData({ saving: false });
      showToast(error.message || '保存失败', 'error');
    }
  },

  // 输入处理
  onTitleInput(e) {
    const title = e.detail.value;
    this.setData({ 
      title,
      hasChanges: true
    });
    this.debouncedAutoSave();
  },

  onContentInput(e) {
    const content = e.detail.value;
    this.setData({ 
      content,
      hasChanges: true,
      cursorPosition: e.detail.cursor
    });
    
    // 自动提取标签
    this.extractTagsFromContent(content);
    this.debouncedAutoSave();
  },

  onTagInput(e) {
    this.setData({ tagInput: e.detail.value });
  },

  // 焦点处理
  onTitleFocus() {
    this.setData({ titleFocused: true });
  },

  onTitleBlur() {
    this.setData({ titleFocused: false });
  },

  onContentFocus() {
    this.setData({ 
      contentFocused: true,
      showToolbar: true
    });
  },

  onContentBlur() {
    this.setData({ 
      contentFocused: false,
      showToolbar: false
    });
  },

  // 从内容中提取标签
  extractTagsFromContent(content) {
    const extractedTags = parseTagsFromContent(content);
    const currentTags = this.data.tags;
    
    // 合并提取的标签和现有标签
    const allTags = [...new Set([...currentTags, ...extractedTags])];
    
    if (allTags.length !== currentTags.length) {
      this.setData({ tags: allTags });
    }
  },

  // 标签管理
  showTagInput() {
    this.setData({ showTagInput: true });
  },

  hideTagInput() {
    this.setData({ 
      showTagInput: false,
      tagInput: ''
    });
  },

  addTag() {
    const { tagInput, tags } = this.data;
    const tag = tagInput.trim();
    
    if (!tag) {
      showToast('标签不能为空', 'error');
      return;
    }
    
    if (tags.includes(tag)) {
      showToast('标签已存在', 'error');
      return;
    }
    
    this.setData({
      tags: [...tags, tag],
      tagInput: '',
      showTagInput: false,
      hasChanges: true
    });
    
    this.debouncedAutoSave();
  },

  selectAvailableTag(e) {
    const { tag } = e.currentTarget.dataset;
    const { tags } = this.data;
    
    if (tags.includes(tag)) {
      showToast('标签已存在', 'error');
      return;
    }
    
    this.setData({
      tags: [...tags, tag],
      hasChanges: true
    });
    
    this.debouncedAutoSave();
  },

  removeTag(e) {
    const { index } = e.currentTarget.dataset;
    const { tags } = this.data;
    
    tags.splice(index, 1);
    this.setData({ 
      tags,
      hasChanges: true
    });
    
    this.debouncedAutoSave();
  },

  // 工具栏功能
  toggleToolbar() {
    this.setData({ showToolbar: !this.data.showToolbar });
  },

  handleToolbarAction(e) {
    const { action } = e.currentTarget.dataset;
    
    switch (action) {
      case 'bold':
        this.insertText('**', '**');
        break;
      case 'italic':
        this.insertText('*', '*');
        break;
      case 'list':
        this.insertText('\n- ', '');
        break;
      case 'link':
        this.insertText('[', '](url)');
        break;
      case 'image':
        this.chooseImage();
        break;
    }
  },

  // 插入文本
  insertText(before, after) {
    const { content, cursorPosition } = this.data;
    const newContent = content.slice(0, cursorPosition) + before + after + content.slice(cursorPosition);
    
    this.setData({
      content: newContent,
      hasChanges: true
    });
    
    this.debouncedAutoSave();
  },

  // 选择图片
  chooseImage() {
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const tempFilePath = res.tempFilePaths[0];
        this.uploadImage(tempFilePath);
      }
    });
  },

  // 上传图片
  async uploadImage(filePath) {
    try {
      wx.showLoading({ title: '上传中...' });
      
      // 这里应该调用实际的图片上传API
      // const uploadResponse = await uploadApi.uploadImage(filePath);
      
      // 临时处理：直接插入本地路径
      const imageMarkdown = `\n![图片](${filePath})\n`;
      this.insertText(imageMarkdown, '');
      
      showToast('图片插入成功');
    } catch (error) {
      console.error('上传图片失败:', error);
      showToast('上传图片失败', 'error');
    } finally {
      wx.hideLoading();
    }
  },

  // 导航处理
  async goBack() {
    if (this.data.hasChanges) {
      const confirmed = await showConfirm('有未保存的更改，确定要离开吗？', '提示');
      if (!confirmed) return;
    }
    
    wx.navigateBack();
  },

  // 预览笔记
  previewNote() {
    const { title, content, tags } = this.data;
    
    if (!title.trim() || !content.trim()) {
      showToast('请先输入标题和内容', 'error');
      return;
    }
    
    // 跳转到预览页面
    wx.navigateTo({
      url: `/pages/note-preview/note-preview?title=${encodeURIComponent(title)}&content=${encodeURIComponent(content)}&tags=${encodeURIComponent(JSON.stringify(tags))}`
    });
  },

  // 显示未保存更改提示
  showUnsavedChangesHint() {
    if (this.data.autoSaveEnabled && !this.data.isNew) {
      showToast('检测到未保存的更改，已自动保存', 'none');
    }
  },

  // 切换自动保存
  toggleAutoSave() {
    this.setData({ 
      autoSaveEnabled: !this.data.autoSaveEnabled 
    });
    
    showToast(this.data.autoSaveEnabled ? '已开启自动保存' : '已关闭自动保存');
  },

  // 清空内容
  async clearContent() {
    const confirmed = await showConfirm('确定要清空所有内容吗？', '清空确认');
    if (!confirmed) return;
    
    this.setData({
      title: '',
      content: '',
      tags: [],
      hasChanges: true
    });
  },

  // 字数统计
  getWordCount() {
    const { content } = this.data;
    return content.length;
  }
});