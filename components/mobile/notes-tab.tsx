"use client"

import React, { useState, useEffect, useCallback, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TabsContent } from "@/components/ui/tabs"
import { Plus, Search, Edit, Trash2 } from "lucide-react"
import { 
  addNote,
  getNotes,
  deleteNote,
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

  // 加载笔记数据
  const loadNotes = useCallback(async () => {
    try {
      const response = await getNotes(1, 50)
      setNotes(response.notes || [])
    } catch (error) {
      console.error('Error loading notes:', error)
      toast({ title: "加载笔记失败", variant: "destructive" })
    }
  }, [])

  useEffect(() => {
    if (user) {
      loadNotes()
    }
  }, [user, loadNotes])

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
      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-6">
          {groupedNotes.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              {searchTerm ? '没有找到相关笔记' : '还没有笔记，点击上方按钮添加第一条笔记吧！'}
            </div>
          ) : (
            groupedNotes.map(([dateKey, dayNotes]) => (
              <div key={dateKey} className="mb-6" id={`date-${dateKey}`}>
                {/* 日期标题 - 粘性定位 */}
                <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border/40 flex items-center py-2 mb-3">
                  <h3 className="text-lg font-semibold text-foreground">{formatDateShort(new Date(dateKey))}</h3>
                  <div className="ml-3 text-sm text-muted-foreground">{dayNotes.length} 条笔记</div>
                </div>

                {/* 该日期下的所有笔记 */}
                <div className="ml-4 space-y-4">
                  {dayNotes.map((note) => {
                    const tags = extractTags(note.content)
                    const contentWithoutTags = note.content.replace(/#\w+/g, '').trim()
                    
                    return (
                      <div key={note.id} className="group">
                        {/* 笔记头部信息 */}
                        <div className="flex items-center justify-between mb-2">
                          <div className="text-xs text-muted-foreground">
                            {new Date(note.createdAt).toLocaleTimeString('zh-CN', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteNote(note.id)}
                              className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                              title="删除笔记"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                            {tags.length > 0 && (
                              <div className="flex items-center gap-1">
                                <div className="flex gap-1">
                                  {tags.slice(0, 3).map((tag, index) => (
                                    <Badge 
                                      key={index} 
                                      variant="outline" 
                                      className="text-xs cursor-pointer hover:bg-muted bg-gray-100 dark:bg-gray-800"
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
                              </div>
                            )}
                          </div>
                        </div>
                        
                        {/* 笔记内容 */}
                        <div 
                          className="text-sm whitespace-pre-wrap break-words mb-3"
                          style={{ whiteSpace: 'pre-wrap', lineHeight: '1.5' }}
                        >
                          {contentWithoutTags}
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
        </div>
      </div>
    </TabsContent>
  )
}