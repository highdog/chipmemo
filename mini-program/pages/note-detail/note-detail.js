// pages/note-detail/note-detail.js
const app = getApp();
const { notesApi } = require('../../utils/api');
const { formatTime, showToast, showConfirm, copyToClipboard, parseTagsFromContent, truncateString } = require('../../utils/util');

Page({
  data: {
    noteId: '',
    note: null,
    loading: true,
    error: '',
    
    // 编辑模式
    isEditing: false,
    editTitle: '',
    editContent: '',
    editTags: [],
    
    // UI状态
    showActions: false,
    showTagInput: false,
    tagInput: '',
    
    // 分享相关
    shareModalVisible: false,
    shareOptions: [
      { key: 'copy', title: '复制链接', icon: 'copy' },
      { key: 'qr', title: '生成二维码', icon: 'qrcode' },
      { key: 'wechat', title: '分享给朋友', icon: 'wechat' }
    ]
  },

  onLoad(options) {
    const { id } = options;
    if (!id) {
      showToast('笔记ID不能为空', 'error');
      wx.navigateBack();
      return;
    }
    
    this.setData({ noteId: id });
    this.loadNote();
  },

  onShow() {
    // 从编辑页面返回时刷新数据
    if (this.data.noteId && !this.data.isEditing) {
      this.loadNote();
    }
  },

  onPullDownRefresh() {
    this.loadNote().finally(() => {
      wx.stopPullDownRefresh();
    });
  },

  onShareAppMessage() {
    const { note } = this.data;
    return {
      title: note ? `${note.title} - 我的笔记` : '分享笔记',
      path: `/pages/note-detail/note-detail?id=${this.data.noteId}`,
      imageUrl: ''
    };
  },

  onShareTimeline() {
    const { note } = this.data;
    return {
      title: note ? `${note.title} - 我的笔记` : '分享笔记',
      query: `id=${this.data.noteId}`,
      imageUrl: ''
    };
  },

  // 加载笔记详情
  async loadNote() {
    try {
      this.setData({ loading: true, error: '' });
      
      const response = await notesApi.getNote(this.data.noteId);
      if (response.success) {
        this.setData({
          note: response.data,
          loading: false
        });
      } else {
        throw new Error(response.message || '加载笔记失败');
      }
    } catch (error) {
      console.error('加载笔记失败:', error);
      this.setData({
        loading: false,
        error: error.message || '加载笔记失败'
      });
      showToast('加载笔记失败', 'error');
    }
  },

  // 进入编辑模式
  enterEditMode() {
    const { note } = this.data;
    if (!note) return;
    
    this.setData({
      isEditing: true,
      editTitle: note.title,
      editContent: note.content,
      editTags: [...(note.tags || [])],
      showActions: false
    });
  },

  // 退出编辑模式
  exitEditMode() {
    this.setData({
      isEditing: false,
      editTitle: '',
      editContent: '',
      editTags: [],
      showTagInput: false,
      tagInput: ''
    });
  },

  // 保存编辑
  async saveEdit() {
    const { editTitle, editContent, editTags } = this.data;
    
    if (!editTitle.trim()) {
      showToast('标题不能为空', 'error');
      return;
    }
    
    if (!editContent.trim()) {
      showToast('内容不能为空', 'error');
      return;
    }
    
    try {
      wx.showLoading({ title: '保存中...' });
      
      const updateData = {
        title: editTitle.trim(),
        content: editContent.trim(),
        tags: editTags
      };
      
      const response = await notesApi.updateNote(this.data.noteId, updateData);
      if (response.success) {
        this.setData({
          note: response.data,
          isEditing: false,
          editTitle: '',
          editContent: '',
          editTags: []
        });
        showToast('保存成功');
      } else {
        throw new Error(response.message || '保存失败');
      }
    } catch (error) {
      console.error('保存笔记失败:', error);
      showToast(error.message || '保存失败', 'error');
    } finally {
      wx.hideLoading();
    }
  },

  // 删除笔记
  async deleteNote() {
    const confirmed = await showConfirm('确定要删除这篇笔记吗？', '删除确认');
    if (!confirmed) return;
    
    try {
      wx.showLoading({ title: '删除中...' });
      
      const response = await notesApi.deleteNote(this.data.noteId);
      if (response.success) {
        showToast('删除成功');
        wx.navigateBack();
      } else {
        throw new Error(response.message || '删除失败');
      }
    } catch (error) {
      console.error('删除笔记失败:', error);
      showToast(error.message || '删除失败', 'error');
    } finally {
      wx.hideLoading();
    }
  },

  // 归档/取消归档笔记
  async toggleArchive() {
    const { note } = this.data;
    if (!note) return;
    
    const action = note.archived ? '取消归档' : '归档';
    const confirmed = await showConfirm(`确定要${action}这篇笔记吗？`, `${action}确认`);
    if (!confirmed) return;
    
    try {
      wx.showLoading({ title: `${action}中...` });
      
      const response = await notesApi.updateNote(this.data.noteId, {
        archived: !note.archived
      });
      
      if (response.success) {
        this.setData({
          note: response.data,
          showActions: false
        });
        showToast(`${action}成功`);
      } else {
        throw new Error(response.message || `${action}失败`);
      }
    } catch (error) {
      console.error(`${action}笔记失败:`, error);
      showToast(error.message || `${action}失败`, 'error');
    } finally {
      wx.hideLoading();
    }
  },

  // 输入处理
  onTitleInput(e) {
    this.setData({ editTitle: e.detail.value });
  },

  onContentInput(e) {
    this.setData({ editContent: e.detail.value });
  },

  onTagInput(e) {
    this.setData({ tagInput: e.detail.value });
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
    const { tagInput, editTags } = this.data;
    const tag = tagInput.trim();
    
    if (!tag) {
      showToast('标签不能为空', 'error');
      return;
    }
    
    if (editTags.includes(tag)) {
      showToast('标签已存在', 'error');
      return;
    }
    
    this.setData({
      editTags: [...editTags, tag],
      tagInput: '',
      showTagInput: false
    });
  },

  removeTag(e) {
    const { index } = e.currentTarget.dataset;
    const { editTags } = this.data;
    
    editTags.splice(index, 1);
    this.setData({ editTags });
  },

  // UI交互
  toggleActions() {
    this.setData({ showActions: !this.data.showActions });
  },

  hideActions() {
    this.setData({ showActions: false });
  },

  // 分享功能
  showShareModal() {
    this.setData({ 
      shareModalVisible: true,
      showActions: false
    });
  },

  hideShareModal() {
    this.setData({ shareModalVisible: false });
  },

  async handleShare(e) {
    const { type } = e.currentTarget.dataset;
    const { note } = this.data;
    
    if (!note) return;
    
    switch (type) {
      case 'copy':
        const shareUrl = `https://your-domain.com/notes/${this.data.noteId}`;
        await copyToClipboard(shareUrl);
        showToast('链接已复制到剪贴板');
        break;
        
      case 'qr':
        // 生成二维码逻辑
        showToast('二维码功能开发中');
        break;
        
      case 'wechat':
        // 微信分享
        wx.shareAppMessage({
          title: note.title,
          path: `/pages/note-detail/note-detail?id=${this.data.noteId}`
        });
        break;
    }
    
    this.hideShareModal();
  },

  // 导航
  goToEdit() {
    wx.navigateTo({
      url: `/pages/note-edit/note-edit?id=${this.data.noteId}`
    });
  },

  goBack() {
    wx.navigateBack();
  },

  // 重试加载
  retryLoad() {
    this.loadNote();
  },

  // 预览图片
  previewImage(e) {
    const { url } = e.currentTarget.dataset;
    if (url) {
      wx.previewImage({
        urls: [url],
        current: url
      });
    }
  },

  // 复制内容
  async copyContent() {
    const { note } = this.data;
    if (!note) return;
    
    const content = `${note.title}\n\n${note.content}`;
    await copyToClipboard(content);
    showToast('内容已复制到剪贴板');
    this.setData({ showActions: false });
  },

  // 导出笔记
  exportNote() {
    const { note } = this.data;
    if (!note) return;
    
    // 导出功能实现
    showToast('导出功能开发中');
    this.setData({ showActions: false });
  }
});