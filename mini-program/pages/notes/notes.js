// pages/notes/notes.js
const app = getApp();
const api = require('../../utils/api.js');
const util = require('../../utils/util.js');

Page({
  data: {
    // 笔记列表
    notes: [],
    
    // 分页信息
    pagination: {
      page: 1,
      limit: 10,
      total: 0,
      hasMore: true
    },
    
    // 搜索和筛选
    searchQuery: '',
    selectedTag: '',
    showArchived: false,
    sortBy: 'updatedAt',
    sortOrder: 'desc',
    
    // 界面状态
    loading: false,
    refreshing: false,
    loadingMore: false,
    showSearch: false,
    showFilter: false,
    
    // 标签列表
    allTags: [],
    
    // 选择模式
    selectionMode: false,
    selectedNotes: [],
    
    // 排序选项
    sortOptions: [
      { key: 'updatedAt', label: '最近更新', order: 'desc' },
      { key: 'createdAt', label: '创建时间', order: 'desc' },
      { key: 'title', label: '标题', order: 'asc' }
    ]
  },

  onLoad(options) {
    console.log('笔记列表页面加载');
    
    // 检查登录状态
    if (!app.globalData.isLoggedIn) {
      wx.redirectTo({
        url: '/pages/login/login'
      });
      return;
    }
    
    // 检查是否需要显示搜索
    if (options.search === 'true') {
      this.setData({ showSearch: true });
    }
    
    // 加载数据
    this.loadNotes();
    this.loadTags();
  },

  onShow() {
    // 刷新笔记列表（可能有新增或修改）
    if (this.data.notes.length > 0) {
      this.refreshNotes();
    }
  },

  onPullDownRefresh() {
    this.refreshNotes().finally(() => {
      wx.stopPullDownRefresh();
    });
  },

  onReachBottom() {
    if (this.data.pagination.hasMore && !this.data.loadingMore) {
      this.loadMoreNotes();
    }
  },

  // 加载笔记列表
  async loadNotes(reset = true) {
    try {
      if (reset) {
        this.setData({ loading: true });
      } else {
        this.setData({ loadingMore: true });
      }
      
      const params = {
        page: reset ? 1 : this.data.pagination.page + 1,
        limit: this.data.pagination.limit,
        sort: this.data.sortBy,
        order: this.data.sortOrder
      };
      
      // 添加搜索条件
      if (this.data.searchQuery) {
        params.search = this.data.searchQuery;
      }
      
      // 添加标签筛选
      if (this.data.selectedTag) {
        params.tag = this.data.selectedTag;
      }
      
      // 添加归档筛选
      if (this.data.showArchived) {
        params.archived = true;
      }
      
      const result = await api.getNotes(params);
      
      if (result.success) {
        const { notes, pagination } = result.data;
        
        // 格式化笔记数据
        const formattedNotes = notes.map(note => ({
          ...note,
          formattedDate: util.getRelativeTime(note.updatedAt),
          truncatedContent: util.truncateString(note.content, 150)
        }));
        
        if (reset) {
          this.setData({
            notes: formattedNotes,
            pagination: {
              ...pagination,
              hasMore: pagination.page < pagination.totalPages
            }
          });
        } else {
          this.setData({
            notes: [...this.data.notes, ...formattedNotes],
            pagination: {
              ...pagination,
              hasMore: pagination.page < pagination.totalPages
            }
          });
        }
      } else {
        util.showToast(result.error);
      }
    } catch (error) {
      console.error('加载笔记失败:', error);
      util.showToast('加载失败');
    } finally {
      this.setData({
        loading: false,
        loadingMore: false,
        refreshing: false
      });
    }
  },

  // 刷新笔记列表
  async refreshNotes() {
    this.setData({ refreshing: true });
    await this.loadNotes(true);
  },

  // 加载更多笔记
  async loadMoreNotes() {
    await this.loadNotes(false);
  },

  // 加载标签列表
  async loadTags() {
    try {
      const result = await api.getTags();
      if (result.success) {
        this.setData({ allTags: result.data.tags });
      }
    } catch (error) {
      console.error('加载标签失败:', error);
    }
  },

  // 搜索处理
  onSearchInput(e) {
    const query = e.detail.value;
    this.setData({ searchQuery: query });
    
    // 防抖搜索
    if (this.searchTimer) {
      clearTimeout(this.searchTimer);
    }
    
    this.searchTimer = setTimeout(() => {
      this.loadNotes(true);
    }, 500);
  },

  // 清空搜索
  clearSearch() {
    this.setData({ searchQuery: '' });
    this.loadNotes(true);
  },

  // 切换搜索显示
  toggleSearch() {
    this.setData({ showSearch: !this.data.showSearch });
    if (!this.data.showSearch) {
      this.clearSearch();
    }
  },

  // 切换筛选显示
  toggleFilter() {
    this.setData({ showFilter: !this.data.showFilter });
  },

  // 选择标签筛选
  selectTag(e) {
    const tag = e.currentTarget.dataset.tag;
    const selectedTag = this.data.selectedTag === tag ? '' : tag;
    
    this.setData({ 
      selectedTag,
      showFilter: false
    });
    
    this.loadNotes(true);
  },

  // 切换归档显示
  toggleArchived() {
    this.setData({ 
      showArchived: !this.data.showArchived,
      showFilter: false
    });
    this.loadNotes(true);
  },

  // 排序选择
  selectSort(e) {
    const { key, order } = e.currentTarget.dataset;
    
    this.setData({
      sortBy: key,
      sortOrder: order,
      showFilter: false
    });
    
    this.loadNotes(true);
  },

  // 跳转到笔记详情
  goToNoteDetail(e) {
    if (this.data.selectionMode) {
      this.toggleNoteSelection(e);
      return;
    }
    
    const { id } = e.currentTarget.dataset;
    wx.navigateTo({
      url: `/pages/note-detail/note-detail?id=${id}`
    });
  },

  // 跳转到添加笔记
  goToAddNote() {
    wx.switchTab({
      url: '/pages/add-note/add-note'
    });
  },

  // 切换选择模式
  toggleSelectionMode() {
    this.setData({
      selectionMode: !this.data.selectionMode,
      selectedNotes: []
    });
  },

  // 切换笔记选择
  toggleNoteSelection(e) {
    const { id } = e.currentTarget.dataset;
    const selectedNotes = [...this.data.selectedNotes];
    const index = selectedNotes.indexOf(id);
    
    if (index > -1) {
      selectedNotes.splice(index, 1);
    } else {
      selectedNotes.push(id);
    }
    
    this.setData({ selectedNotes });
  },

  // 全选/取消全选
  toggleSelectAll() {
    const allSelected = this.data.selectedNotes.length === this.data.notes.length;
    
    if (allSelected) {
      this.setData({ selectedNotes: [] });
    } else {
      this.setData({ 
        selectedNotes: this.data.notes.map(note => note._id)
      });
    }
  },

  // 批量删除
  async batchDelete() {
    if (this.data.selectedNotes.length === 0) {
      util.showToast('请选择要删除的笔记');
      return;
    }
    
    const confirmed = await util.showConfirm(
      `确定要删除选中的 ${this.data.selectedNotes.length} 篇笔记吗？`,
      '批量删除'
    );
    
    if (!confirmed) return;
    
    try {
      app.showLoading('删除中...');
      
      // 逐个删除（后端可以优化为批量删除接口）
      for (const noteId of this.data.selectedNotes) {
        await api.deleteNote(noteId);
      }
      
      util.showToast('删除成功', 'success');
      
      // 退出选择模式并刷新列表
      this.setData({
        selectionMode: false,
        selectedNotes: []
      });
      
      this.loadNotes(true);
    } catch (error) {
      console.error('批量删除失败:', error);
      util.showToast('删除失败');
    } finally {
      app.hideLoading();
    }
  },

  // 单个删除
  async deleteNote(e) {
    e.stopPropagation();
    
    const { id, title } = e.currentTarget.dataset;
    
    const confirmed = await util.showConfirm(
      `确定要删除笔记「${title || '无标题'}」吗？`,
      '删除笔记'
    );
    
    if (!confirmed) return;
    
    try {
      app.showLoading('删除中...');
      
      const result = await api.deleteNote(id);
      
      if (result.success) {
        util.showToast('删除成功', 'success');
        this.loadNotes(true);
      } else {
        util.showToast(result.error);
      }
    } catch (error) {
      console.error('删除笔记失败:', error);
      util.showToast('删除失败');
    } finally {
      app.hideLoading();
    }
  },

  // 分享笔记
  shareNote(e) {
    e.stopPropagation();
    
    const { id, title } = e.currentTarget.dataset;
    
    wx.showShareMenu({
      withShareTicket: true,
      menus: ['shareAppMessage', 'shareTimeline']
    });
  },

  // 分享应用消息
  onShareAppMessage(e) {
    if (e.target && e.target.dataset.id) {
      const { id, title } = e.target.dataset;
      return {
        title: `分享笔记：${title || '无标题'}`,
        path: `/pages/note-detail/note-detail?id=${id}`,
        imageUrl: '/images/share-note.png'
      };
    }
    
    return {
      title: '我的笔记本',
      path: '/pages/notes/notes',
      imageUrl: '/images/share-cover.png'
    };
  }
});