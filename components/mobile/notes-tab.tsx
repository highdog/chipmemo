"use client"

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TabsContent } from "@/components/ui/tabs"
import { Plus, Search, Edit, Trash2, X } from "lucide-react"
import { 
  addNote,
  deleteNote,
  getNotes,
  searchNotesByTag,
  searchNotes,
  type Note
} from "@/lib/actions"
import { formatDateShort, getDateKey, cn, extractTags } from "@/lib/utils"
import { NotesTabProps } from "./types"
import { toast as showToast } from "@/components/ui/use-toast"

export function NotesTab({ user }: NotesTabProps) {
  const toast = showToast
  // 笔记相关状态
  const [notes, setNotes] = useState<Note[]>([])
  const [newNote, setNewNote] = useState("")
  const [isAddingNote, setIsAddingNote] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [showNoteInput, setShowNoteInput] = useState(false)
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [loading, setLoading] = useState(false)
  const NOTES_PER_PAGE = 100
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // 加载笔记数据
  const loadNotes = useCallback(async (page = 1, append = false) => {
    if (loading) return
    
    try {
      setLoading(true)
      const response = await getNotes(page, NOTES_PER_PAGE)
      const newNotes = response.notes || []
      
      if (append) {
        setNotes(prev => [...prev, ...newNotes])
      } else {
        setNotes(newNotes)
      }
      
      setHasMore(newNotes.length === NOTES_PER_PAGE)
      setCurrentPage(page)
    } catch (error) {
      console.error('Error loading notes:', error)
      toast({ title: "加载笔记失败", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }, [NOTES_PER_PAGE, toast])
  
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
      const dateKey = getDateKey(new Date(note.createdAt))
      if (!groups[dateKey]) {
        groups[dateKey] = []
      }
      groups[dateKey].push(note)
    })
    
    // 转换为数组并按日期排序（最新的在前）
    const groupedNotes = Object.entries(groups).map(([dateKey, groupNotes]) => {
      // 每组内的笔记按创建时间排序（最新的在前）
      groupNotes.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      return [dateKey, groupNotes] as [string, Note[]]
    })
    
    // 按日期排序（最新的在前）
    groupedNotes.sort((a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime())
    
    return groupedNotes
  }

  // 过滤和计算数据
  const filteredNotes = useMemo(() => {
    if (!searchTerm) return notes
    return notes.filter(note => 
      note.content.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [notes, searchTerm])

  const groupedNotes = useMemo(() => groupNotesByDate(filteredNotes), [filteredNotes])

  // 添加笔记
  const handleAddNote = async () => {
    if (!newNote.trim()) return
    
    setIsAddingNote(true)
    try {
      await addNote(newNote, '')
      setNewNote("")
      setShowNoteInput(false)
      await loadNotes()
      toast({ title: "笔记添加成功" })
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
      const searchResult = await searchNotesByTag(trimmedTag, 1, 5000)
      if (searchResult && searchResult.notes) {
        setNotes(searchResult.notes)
        setHasMore(false) // 搜索结果不支持分页
        toast({
          title: "标签搜索",
          description: `找到 ${searchResult.notes.length} 条包含 #${trimmedTag} 标签的笔记`,
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
            <h2 className="text-lg font-medium">我的笔记</h2>
            <span className="text-sm text-muted-foreground">({notes.length})</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowNoteInput(!showNoteInput)}
            className="shrink-0"
          >
            <Plus className="h-4 w-4" />
          </Button>
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

        {/* 添加笔记输入区域 */}
        {showNoteInput && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">添加笔记</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Textarea
                placeholder="写下你的想法..."
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                className="min-h-[120px]"
              />
              <div className="flex gap-2">
                <Button 
                  onClick={handleAddNote} 
                  disabled={isAddingNote || !newNote.trim()}
                  className="flex-1"
                >
                  {isAddingNote ? "添加中..." : "添加笔记"}
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => {
                    setShowNoteInput(false)
                    setNewNote("")
                  }}
                >
                  取消
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
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
                <div className="sticky top-0 z-10 bg-background border-b border-border/40 flex items-center py-3 -mx-4 px-4 -mb-4">
                  <h3 className="text-lg font-semibold text-foreground">{formatDateShort(new Date(dateKey))}</h3>
                  <div className="ml-3 text-sm text-muted-foreground">{dayNotes.length} 条笔记</div>
                </div>

                {/* 该日期下的所有笔记 */}
                <div className="ml-4 space-y-4">
                  {dayNotes.map((note) => {
                    // 使用note.tags数组而不是从内容中提取
                    const tags = note.tags || []
                    // 显示处理过的内容（已移除标签）
                    const contentWithoutTags = note.content
                    
                    return (
                      <div 
                        key={note.id} 
                        className="cursor-pointer"
                        onClick={() => setSelectedNoteId(selectedNoteId === note.id ? null : note.id)}
                      >
                        {/* 笔记头部信息 */}
                        <div className="flex items-center justify-between mb-2">
                          <div className="text-xs text-muted-foreground">
                            {new Date(note.createdAt).toLocaleTimeString('zh-CN', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </div>
                          <div className="flex items-center gap-2">
                            {selectedNoteId === note.id && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleDeleteNote(note.id)
                                }}
                                className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive transition-colors"
                                title="删除笔记"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        </div>
                        
                        {/* 笔记内容和标签 */}
                        <div className="flex mb-3">
                          {/* 笔记内容 */}
                          <div 
                            className="text-sm whitespace-pre-wrap break-words flex-1"
                            style={{ whiteSpace: 'pre-wrap', lineHeight: '1.5' }}
                          >
                            {contentWithoutTags}
                          </div>
                          
                          {/* 标签 - 放在右侧 */}
                          {tags.length > 0 && (
                            <div className="flex flex-col items-end gap-1 ml-2 min-w-[80px]">
                              {tags.slice(0, 3).map((tag, index) => (
                                <Badge 
                                  key={index} 
                                  variant="outline" 
                                  className="text-xs cursor-pointer hover:bg-muted bg-gray-100 dark:bg-gray-800 transition-colors"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleTagClick(tag)
                                  }}
                                >
                                  #{tag}
                                </Badge>
                              ))}
                              {tags.length > 3 && (
                                <Badge variant="outline" className="text-xs">
                                  +{tags.length - 3}
                                </Badge>
                              )}
                            </div>
                          )}  
                        </div>
                        
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
    </TabsContent>
  )
}