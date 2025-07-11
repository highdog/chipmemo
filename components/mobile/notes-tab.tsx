"use client"

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { ImageViewer } from "@/components/image-viewer"
import { TabsContent } from "@/components/ui/tabs"
import { Plus, Search, Edit, Trash2, X, Image, ZoomIn, Tag } from "lucide-react"
import { 
  addNote,
  deleteNote,
  getNotes,
  searchNotesByTag,
  searchNotes,
  type Note as ActionNote
} from "@/lib/actions"
import { formatDateShort, getDateKey, cn, extractTags } from "@/lib/utils"
import { toast as showToast } from "@/components/ui/use-toast"
import { uploadApi } from "@/lib/api"
import { Note } from "./types"

// 提取标签并清理内容的函数
const extractTagsAndCleanContent = (content: string): { cleanContent: string; tags: string[] } => {
  const tagRegex = /#([\u4e00-\u9fa5\w]+)/g
  const tags: string[] = []
  let match
  
  while ((match = tagRegex.exec(content)) !== null) {
    tags.push(match[1])
  }
  
  const cleanContent = content.replace(tagRegex, '').trim()
  return { cleanContent, tags }
}

interface NotesTabProps {
  user?: any;
  theme?: string;
  triggerAdd?: boolean;
  onAddTriggered?: () => void;
}

export function NotesTab({ user, theme, triggerAdd = false, onAddTriggered }: NotesTabProps) {
  const toast = showToast
  // 笔记相关状态
  const [notes, setNotes] = useState<Note[]>([])
  const [newNote, setNewNote] = useState("")
  const [isAddingNote, setIsAddingNote] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null)
  const [selectedImages, setSelectedImages] = useState<string[]>([])
  const [imageViewerOpen, setImageViewerOpen] = useState(false)
  const [selectedImageIndex, setSelectedImageIndex] = useState(0)
  const [currentNoteImages, setCurrentNoteImages] = useState<string[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [loading, setLoading] = useState(false)
  const NOTES_PER_PAGE = 100
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // 根据用户偏好设置过滤笔记
  const filterNotesByPreferences = useCallback((notes: Note[]) => {
    if (!user?.preferences) return notes
    
    return notes.filter(note => {
      const tags = note.tags || []
      
      // 检查是否需要隐藏打卡笔记
      if (user?.preferences?.hideCheckinNotes && tags.includes('打卡')) {
        return false
      }
      
      // 检查是否需要隐藏待办笔记
      if (user?.preferences?.hideTodoNotes && tags.includes('todo')) {
        return false
      }
      
      // 检查是否需要隐藏目标笔记
      if (user?.preferences?.hideGoalNotes && tags.includes('目标')) {
        return false
      }
      
      return true
    })
  }, [user?.preferences])

  // 加载笔记数据
  const loadNotes = useCallback(async (page = 1, append = false) => {
    if (loading) return
    
    try {
      setLoading(true)
      const response = await getNotes(page, NOTES_PER_PAGE)
      const newNotes = response.notes || []
      
      // 转换ActionNote到Note类型
      const convertedNotes: Note[] = newNotes.map((actionNote: ActionNote) => ({
        _id: actionNote.id,
        title: actionNote.title,
        content: actionNote.content,
        originalContent: actionNote.originalContent || actionNote.content,
        date: actionNote.date,
        tags: actionNote.tags,
        imageUrl: actionNote.imageUrl,
        images: actionNote.imageUrl ? [actionNote.imageUrl] : [],
        userId: '',
        createdAt: actionNote.createdAt,
        updatedAt: actionNote.createdAt,
        attachments: actionNote.attachments
      }))
      
      // 根据用户偏好设置过滤笔记
      const filteredNotes = filterNotesByPreferences(convertedNotes)
      
      if (append) {
        setNotes(prev => [...prev, ...filteredNotes])
      } else {
        setNotes(filteredNotes)
      }
      
      setHasMore(newNotes.length === NOTES_PER_PAGE)
      setCurrentPage(page)
    } catch (error) {
      console.error('Error loading notes:', error)
      toast({ title: "加载笔记失败", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }, [NOTES_PER_PAGE, toast, filterNotesByPreferences])
  
  // 加载更多笔记
  const loadMoreNotes = useCallback(() => {
    if (hasMore && !loading) {
      loadNotes(currentPage + 1, true)
    }
  }, [hasMore, loading, currentPage, loadNotes])

  useEffect(() => {
    if (user) {
      loadNotes()
    }
  }, [user]) // 移除loadNotes依赖，避免无限循环

  // 监听外部触发的添加操作
  useEffect(() => {
    if (triggerAdd) {
      setIsDialogOpen(true)
      onAddTriggered?.()
    }
  }, [triggerAdd, onAddTriggered])
  
  // 清理定时器
  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current)
      }
    }
  }, [])

  // 按日期分组笔记的函数
  const groupNotesByDate = (notes: Note[]) => {
    const groups: { [key: string]: Note[] } = {}
    
    notes.forEach(note => {
      // 优先使用customDate，如果没有则使用createdAt
      const noteDate = note.customDate || note.createdAt
      const dateKey = getDateKey(new Date(noteDate))
      if (!groups[dateKey]) {
        groups[dateKey] = []
      }
      groups[dateKey].push(note)
    })
    
    // 转换为数组并按日期排序（最新的在前）
    const groupedNotes = Object.entries(groups).map(([dateKey, groupNotes]) => {
      // 每组内的笔记按时间排序（最新的在前）
      groupNotes.sort((a, b) => {
        const aDate = a.customDate || a.createdAt
        const bDate = b.customDate || b.createdAt
        return new Date(bDate).getTime() - new Date(aDate).getTime()
      })
      return [dateKey, groupNotes] as [string, Note[]]
    })
    
    // 按日期排序（最新的在前）
    groupedNotes.sort((a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime())
    
    return groupedNotes
  }

  // 过滤和计算数据
  const filteredNotes = useMemo(() => {
    // 检查是否是标签搜索
    const isTagSearch = searchTerm.startsWith('#')
    
    // 只在非标签搜索时应用用户偏好设置过滤
    const preferenceFilteredNotes = isTagSearch ? notes : filterNotesByPreferences(notes)
    
    // 然后应用搜索过滤
    if (!searchTerm) return preferenceFilteredNotes
    return preferenceFilteredNotes.filter(note => 
      note.content.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [notes, searchTerm, filterNotesByPreferences])

  const groupedNotes = useMemo(() => groupNotesByDate(filteredNotes), [filteredNotes])

  // 从内容中提取图片URL
  const extractImageUrls = (content: string): string[] => {
    const imageRegex = /!\[.*?\]\((.*?)\)/g;
    const urls: string[] = [];
    let match;
    
    while ((match = imageRegex.exec(content)) !== null) {
      urls.push(match[1]);
    }
    
    return urls;
  };

  // 渲染图片缩略图组件
  const renderImageThumbnails = (note: Note) => {
    const imageUrls = extractImageUrls(note.originalContent || note.content);
    
    if (imageUrls.length === 0) {
      return null;
    }

    const handleImageClick = (index: number) => {
      setCurrentNoteImages(imageUrls);
      setSelectedImageIndex(index);
      setImageViewerOpen(true);
    };
    
    return (
      <div className="grid grid-cols-3 gap-2 mt-3 mb-2">
        {imageUrls.map((url, index) => (
          <div key={index} className="relative cursor-pointer group" onClick={() => handleImageClick(index)}>
            <img
              src={url}
              className="w-full h-20 object-cover rounded hover:opacity-80 transition-opacity"
              alt={`图片 ${index + 1}`}
              onError={(e) => {
                console.error("图片加载失败:", url);
                e.currentTarget.src = "/placeholder-image.png";
              }}
            />
            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200 rounded flex items-center justify-center">
              <ZoomIn className="h-4 w-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </div>
        ))}
      </div>
    );
  };

  // 处理图片上传
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    // 检查图片数量限制
    if (selectedImages.length + files.length > 10) {
      toast({
        title: "图片数量超限",
        description: "最多只能上传10张图片",
        variant: "destructive",
      })
      return
    }

    try {
      const uploadPromises = Array.from(files).map(async (file) => {
        // 检查文件类型
        if (!file.type.startsWith('image/')) {
          throw new Error(`${file.name} 不是图片文件`)
        }
        
        // 检查文件大小（5MB限制）
        if (file.size > 5 * 1024 * 1024) {
          throw new Error(`${file.name} 文件大小超过5MB`)
        }

        const response = await uploadApi.uploadImage(file)
        console.log('图片上传响应:', response)
        
        // 获取图片URL
        const imageUrl = response.data?.url
        if (!imageUrl) {
          throw new Error(`${file.name} 未获取到图片URL`)
        }

        return imageUrl
      })

      const uploadedUrls = await Promise.all(uploadPromises)
      setSelectedImages(prev => [...prev, ...uploadedUrls])
      
      toast({
        title: "上传成功",
        description: `${uploadedUrls.length}张图片已上传到云存储`,
      })
    } catch (error) {
      console.error('图片上传失败:', error)
      toast({
        title: "上传失败",
        description: error instanceof Error ? error.message : "图片上传失败，请重试",
        variant: "destructive",
      })
    } finally {
      // 清空input值，允许重复选择相同文件
      e.target.value = ''
    }
  }

  // 移除单张图片
  const handleRemoveImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index))
  }

  // 清空所有图片
  const handleClearAllImages = () => {
    setSelectedImages([])
  }

  // 添加笔记
  const handleAddNote = async () => {
    if (!newNote.trim() && selectedImages.length === 0) return
    
    setIsAddingNote(true)
    try {
      // 如果当前在标签搜索模式，自动添加当前标签
      let finalContent = newNote.trim()
      if (searchTerm && searchTerm.startsWith('#')) {
        const currentTag = searchTerm.slice(1)
        // 检查内容中是否已经包含当前标签
        const { tags } = extractTagsAndCleanContent(newNote.trim())
        if (!tags.includes(currentTag)) {
          finalContent = `#${currentTag} ${newNote.trim()}`
        }
      }
      
      // 将多张图片转换为单个图片URL字符串（用于兼容现有API）
      const imageUrl = selectedImages.length > 0 ? selectedImages.join('\n') : undefined
      
      const result = await addNote(finalContent, new Date().toISOString(), imageUrl)
      if (result.success) {
        setNewNote("")
        setSelectedImages([]) // 清除已选择的图片
        setIsDialogOpen(false)
        
        // 如果有搜索词，重新搜索；否则重新加载
        if (searchTerm) {
          // 稍微延迟一下再搜索，确保服务器端数据已经更新
          setTimeout(async () => {
            await searchNotesByTag(searchTerm.startsWith('#') ? searchTerm.slice(1) : searchTerm)
          }, 500)
        } else {
          await loadNotes()
        }
        
        toast({ title: "笔记添加成功" })
      } else {
        throw new Error('添加笔记失败')
      }
    } catch (error) {
      console.error('Error adding note:', error)
      toast({ title: "添加笔记失败", variant: "destructive" })
    } finally {
      setIsAddingNote(false)
    }
  }

  // 删除笔记
  const handleDeleteNote = async (noteId: string) => {
    try {
      await deleteNote(noteId)
      await loadNotes()
      toast({ title: "笔记删除成功" })
    } catch (error) {
      console.error('Error deleting note:', error)
      toast({ title: "删除笔记失败", variant: "destructive" })
    }
  }

  // 处理标签点击
  const handleTagClick = async (tag: string) => {
    const trimmedTag = tag.trim()
    if (!trimmedTag) {
      toast({
        title: "搜索失败",
        description: "标签名称不能为空",
        variant: "destructive",
      })
      return
    }
    
    setSearchTerm(`#${trimmedTag}`)
    
    try {
      const searchResult = await searchNotesByTag(trimmedTag, 1, 1000)
      if (searchResult && searchResult.notes) {
        // 转换ActionNote到Note类型
        const convertedNotes: Note[] = searchResult.notes.map((actionNote: ActionNote) => ({
          _id: actionNote.id,
          title: actionNote.title,
          content: actionNote.content,
          originalContent: actionNote.originalContent || actionNote.content,
          date: actionNote.date,
          tags: actionNote.tags,
          imageUrl: actionNote.imageUrl,
          images: actionNote.imageUrl ? [actionNote.imageUrl] : [],
          userId: '',
          createdAt: actionNote.createdAt,
          updatedAt: actionNote.createdAt,
          attachments: actionNote.attachments
        }))
        
        // 标签搜索时不应用用户偏好设置过滤
        const filteredNotes = convertedNotes
        setNotes(filteredNotes)
        setHasMore(false) // 搜索结果不支持分页
        toast({
          title: "标签搜索",
          description: `找到 ${filteredNotes.length} 条包含 #${trimmedTag} 标签的笔记`,
        })
      } else {
        // 处理返回值为空的情况
        setNotes([])
        setHasMore(false)
        toast({
          title: "标签搜索",
          description: `未找到包含 #${trimmedTag} 标签的笔记`,
        })
      }
    } catch (error) {
      console.error('Error searching notes by tag:', error)
      toast({ title: "搜索失败", variant: "destructive" })
      // 出错时保持当前笔记列表不变
    }
  }

  return (
    <TabsContent value="notes" className="h-full m-0 flex flex-col">
      {/* 固定的顶部区域 */}
      <div className="flex-shrink-0 p-4 space-y-4 bg-background border-b">
        {/* 顶部操作栏 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogContent className="sm:max-w-md fixed top-36 left-1/2 transform -translate-x-1/2">
              <DialogHeader>
                <DialogTitle>添加笔记</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <Textarea
                  placeholder="写下你的想法..."
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  className="min-h-[120px] resize-none"
                  autoFocus
                />
                
                {/* 图片上传区域 */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <label htmlFor="mobile-image-upload" className="cursor-pointer">
                      <Button variant="outline" size="sm" asChild>
                        <span>
                          <Image className="h-4 w-4 mr-2" />
                          添加图片
                        </span>
                      </Button>
                    </label>
                    <input
                      id="mobile-image-upload"
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                    {selectedImages.length > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleClearAllImages}
                        className="text-red-500 hover:text-red-700"
                      >
                        清空图片 ({selectedImages.length})
                      </Button>
                    )}
                  </div>
                  
                  {/* 图片预览 - 缩略图模式 */}
                  {selectedImages.length > 0 && (
                    <div className="grid grid-cols-3 gap-2">
                      {selectedImages.map((imageUrl, index) => (
                        <div key={index} className="relative group">
                          <Dialog>
                            <DialogTrigger asChild>
                              <div className="relative cursor-pointer">
                                <img
                                  src={imageUrl}
                                  alt={`预览图片${index + 1}`}
                                  className="w-full h-20 object-cover rounded hover:opacity-80 transition-opacity"
                                  onError={(e) => {
                                    console.error("图片加载失败:", imageUrl);
                                    e.currentTarget.src = "/placeholder-image.png";
                                  }}
                                />
                                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200 rounded flex items-center justify-center">
                                  <ZoomIn className="h-4 w-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                                </div>
                              </div>
                            </DialogTrigger>
                            <DialogContent className="max-w-4xl max-h-[90vh] p-2">
                              <img
                                src={imageUrl}
                                alt={`预览图片${index + 1}`}
                                className="w-full h-auto max-h-[80vh] object-contain"
                                onError={(e) => {
                                  console.error("图片加载失败:", imageUrl);
                                  e.currentTarget.src = "/placeholder-image.png";
                                }}
                              />
                            </DialogContent>
                          </Dialog>
                          
                          {/* 单张图片删除按钮 */}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveImage(index)}
                            className="absolute -top-2 -right-2 h-6 w-6 p-0 bg-red-500 text-white hover:bg-red-600 rounded-full"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                
                <div className="flex gap-2">
                  <Button 
                    onClick={handleAddNote} 
                    disabled={isAddingNote}
                    className="flex-1"
                  >
                    {isAddingNote ? "添加中..." : "添加"}
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => {
                      setIsDialogOpen(false)
                      setNewNote("")
                      setSelectedImages([])
                    }}
                  >
                    取消
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* 搜索栏 */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="搜索笔记..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* 可滚动的笔记列表区域 */}
      <div 
        className="flex-1 overflow-y-auto p-4 scrollable-area"
        onScroll={(e) => {
          // 清除之前的定时器
          if (scrollTimeoutRef.current) {
            clearTimeout(scrollTimeoutRef.current)
          }
          
          // 设置防抖定时器
          scrollTimeoutRef.current = setTimeout(() => {
            if (!e.currentTarget) return
            const { scrollTop, scrollHeight, clientHeight } = e.currentTarget
            if (scrollHeight - scrollTop <= clientHeight + 100 && hasMore && !loading) {
              loadMoreNotes()
            }
          }, 200) // 200ms 防抖延迟
        }}
      >
        <div className="space-y-6">
          {groupedNotes.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              {searchTerm ? '没有找到相关笔记' : '还没有笔记，点击上方按钮添加第一条笔记吧！'}
            </div>
          ) : (
            groupedNotes.map(([dateKey, dayNotes]) => (
              <div key={dateKey} className="mb-6" id={`date-${dateKey}`}>
                {/* 日期标题 - 粘性定位 */}
                <div className="sticky top-[-1rem] z-10 bg-background border-b border-border/40 flex items-center py-3 -mx-4 px-4 mb-2">
                  <h3 className="text-lg font-semibold text-foreground">{formatDateShort(new Date(dateKey))}</h3>
  
                </div>

                {/* 该日期下的所有笔记 */}
                <div className="ml-4 space-y-4 pt-2">
                  {dayNotes.map((note) => {
                    // 使用note.tags数组而不是从内容中提取
                    const tags = note.tags || []
                    // 显示处理过的内容（已移除标签）
                    const contentWithoutTags = note.content
                    
                    return (
                      <div 
                        key={note._id} 
                        className="cursor-pointer"
                        onClick={() => setSelectedNoteId(selectedNoteId === note._id ? null : note._id)}
                      >
                        {/* 笔记头部 - 时间在左边，删除按钮和标签在右边 */}
                        <div className="flex items-center justify-between mb-2">
                          <div className="text-xs text-muted-foreground">
                            {new Date(note.createdAt).toLocaleTimeString('zh-CN', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </div>
                          <div className="flex items-center gap-2">
                            {selectedNoteId === note._id && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleDeleteNote(note._id)
                                }}
                                className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                                title="删除笔记"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            )}
                            {/* 标签 */}
                            {tags.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {tags.slice(0, 3).map((tag, index) => (
                                  <Badge 
                                    key={index} 
                                    variant="secondary" 
                                    className="text-xs cursor-pointer hover:bg-secondary/80"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleTagClick(tag)
                                    }}
                                  >                                    <Tag className="h-3 w-3 mr-1" />                                    {tag}                                  </Badge>
                                ))}
                                {tags.length > 3 && (
                                  <Badge variant="outline" className="text-xs">
                                    +{tags.length - 3}
                                  </Badge>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                        
                        {/* 笔记内容 */}
                        <div className="mb-3">
                          <div 
                            className="text-sm leading-relaxed whitespace-pre-wrap break-words"
                          >
                            {contentWithoutTags}
                          </div>
                        </div>
                        
                        {/* 图片缩略图区域 */}
                        {renderImageThumbnails(note)}
                        
                        {/* 分割线 */}
                        <div className="border-b border-border/50 my-3" />
                      </div>
                    )
                  })}
                </div>
              </div>
            ))
          )}
          
          {/* 加载更多提示 */}
          {loading && (
            <div className="text-center py-4 text-muted-foreground">
              加载中...
            </div>
          )}
          
          {!hasMore && notes.length > 0 && (
            <div className="text-center py-4 text-muted-foreground">
              已加载全部笔记
            </div>
          )}
        </div>
      </div>
      
      {/* 图片查看器 */}
      <ImageViewer
        images={currentNoteImages}
        initialIndex={selectedImageIndex}
        open={imageViewerOpen}
        onOpenChange={setImageViewerOpen}
        isMobile={true}
      />
    </TabsContent>
  )
}