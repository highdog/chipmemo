"use client"

import type React from "react"

import { useState, useEffect, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import { useTheme } from "next-themes"
import { useAuth } from "@/lib/auth-context"
import { Calendar } from "@/components/ui/calendar"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { MarkdownEditor } from "@/components/markdown-editor"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Image, Loader2, Info, Search, X, Trash2, CheckSquare, Tag, CheckCircle2, CheckCircle, Circle, Home, Sun, Moon, Plus, Edit, Save, XCircle, MoreVertical, Download, Upload, Check, Clock, Pause } from "lucide-react"
// 由于NoteGroup组件已在本文件中定义,移除此导入
// 由于组件已在本文件中定义,移除重复导入
// 由于TodoList组件已在本文件中定义,移除此导入
import { TagContent } from "@/components/tag-content"
import { UserNav } from "@/components/user-nav"
import { NoteItem } from "@/components/note-item"
import { SearchBar } from "@/components/search-bar"
import { TagSuggestion } from "@/components/tag-suggestion"
import ScheduleList from "@/components/schedule-list"
import LargeCalendar from "@/components/large-calendar"
import {
  addNote,
  getNotes,
  deleteNote,
  searchNotes,
  searchNotesByTag,
  type Note,
} from "@/lib/actions"
import { formatDateShort, getDateKey, formatTime, formatDateOnly, cn, extractTags } from "@/lib/utils"
import { format } from 'date-fns'
import { toast } from "@/hooks/use-toast"
import { apiClient, notesApi, schedulesApi } from "@/lib/api"
import { Toaster } from "@/components/ui/toaster"

// 提取标签和清理内容的函数
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



// NoteGroup Component
function NoteGroup({
  date,
  notes,
  onDelete,
  searchTerm,
  onTagClick,
  onConvertToTodo,
  onUpdate,
}: {
  date: string
  notes: Note[]
  onDelete: () => void
  searchTerm?: string
  onTagClick: (tag: string) => void
  onConvertToTodo: (note: Note) => void
  onUpdate: (noteId: string, content: string, tags: string[]) => Promise<void>
}) {
  return (
    <div id={`date-group-${date}`} className="mb-6">
      {/* 日期标题 - 粘性定位 */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-b border-border/40 flex items-center mb-3 py-2 -mx-4 px-4">
        <h3 className="text-lg font-semibold text-foreground">{formatDateOnly(date)}</h3>
        <div className="ml-3 text-sm text-muted-foreground">{notes.length} 条笔记</div>
      </div>

      {/* 该日期下的所有笔记 */}
      <div className="space-y-3 ml-4">
        {notes.map((note) => (
          <NoteItem 
            key={note.id} 
            note={note} 
            onDelete={onDelete} 
            searchTerm={searchTerm} 
            onTagClick={onTagClick} 
            onConvertToTodo={() => onConvertToTodo(note)} 
            onUpdate={onUpdate}
          />
        ))}
      </div>
    </div>
  )
}

// TodoList Component
function TodoList({ 
  selectedDate, 
  todosByDate, 
  onToggleTodo,
  onUpdateTodo,
  onDeleteTodo,
  onLoadTodos,
  onShowTodoDetail
}: { 
  selectedDate: Date;
  todosByDate: Record<string, Array<{ 
    id: string; 
    content: string; 
    completed: boolean;
    tags: string[];
    dueDate?: string;
    startDate?: string;
  }>>;
  onToggleTodo: (todoId: string) => void;
  onUpdateTodo: (todoId: string, updates: { content?: string; startDate?: string; dueDate?: string }) => void;
  onDeleteTodo: (todoId: string) => void;
  onLoadTodos: () => Promise<void>;
  onShowTodoDetail: (todo: { id: string; content: string; completed: boolean; tags: string[]; startDate?: string; dueDate?: string }) => void;
}) {
  const [isLoading, setIsLoading] = useState(false)
  const [selectedTag, setSelectedTag] = useState<string>('all')
  const [editingTodo, setEditingTodo] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')
  const [editStartDate, setEditStartDate] = useState('')
  const [editDueDate, setEditDueDate] = useState('')
  const [menuOpenTodo, setMenuOpenTodo] = useState<string | null>(null)
  const [isLargeTodoListOpen, setIsLargeTodoListOpen] = useState(false)
  const [newTodoTag, setNewTodoTag] = useState<string | null>(null)
  const [newTodoContent, setNewTodoContent] = useState('')

  const selectedDateObj = new Date(selectedDate)
  
  // 获取所有todos并根据日期范围过滤
  const allTodos = Object.values(todosByDate)
    .flat()
    .filter((todo, index, self) => 
      // 去重
      self.findIndex(t => t.id === todo.id) === index
    )
    .filter(todo => {
      const hasStartDate = todo.startDate
      const hasDueDate = todo.dueDate
      
      if (hasStartDate && hasDueDate) {
         // 有起始日期和截止日期：点击日期在起始日期前一天或之后显示
         const startDate = new Date(todo.startDate!)
         startDate.setDate(startDate.getDate() - 1)
         return selectedDateObj >= startDate
      } else if (hasStartDate && !hasDueDate) {
         // 只有起始日期：点击日期在起始日期前一天或之后则显示
         const startDate = new Date(todo.startDate!)
         startDate.setDate(startDate.getDate() - 1)
         return selectedDateObj >= startDate
       } else if (!hasStartDate && hasDueDate) {
         // 只有截止日期：点击日期在截止日期前一天或之后则显示
         const dueDate = new Date(todo.dueDate!)
         dueDate.setDate(dueDate.getDate() - 1)
         return selectedDateObj >= dueDate
      } else {
        // 没有日期限制：总是显示
        return true
      }
    })

  // 获取所有标签
  const allTags = Array.from(new Set(allTodos.flatMap(todo => todo.tags)))

  // 根据选中的标签筛选todos
  const displayTodos = selectedTag === 'all' 
    ? allTodos 
    : allTodos.filter(todo => todo.tags.includes(selectedTag))

  const loadTodos = async () => {
    setIsLoading(true)
    try {
      // 这里可以调用后端API获取todos
      // 暂时保持现有数据不变
    } catch (error) {
      toast({
        title: "错误",
        description: "无法加载Todo列表",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleToggleTodo = async (todoId: string) => {
    try {
      onToggleTodo(todoId)
    } catch (error) {
      // 错误处理已在主组件中完成
    }
  }

  const handleEditTodo = (todo: any) => {
    // handleEditTodo被调用
    setEditingTodo(todo.id)
    setEditContent(todo.content)
    setEditStartDate(todo.startDate || '')
    setEditDueDate(todo.dueDate || '')
  }

  const handleSaveEdit = async () => {
    if (!editingTodo) return
    
    try {
      // 调用父组件的更新函数并等待完成
      await onUpdateTodo(editingTodo, {
        content: editContent,
        startDate: editStartDate,
        dueDate: editDueDate
      })
      // 只有在更新成功后才清空编辑状态
      setEditingTodo(null)
      setEditContent('')
      setEditStartDate('')
      setEditDueDate('')
    } catch (error) {
      console.error('更新todo失败:', error)
      // 可以在这里添加错误提示
      toast({
        title: "更新失败",
        description: "保存Todo时发生错误，请重试",
        variant: "destructive",
      })
    }
  }

  const handleCancelEdit = () => {
    setEditingTodo(null)
    setEditContent('')
    setEditStartDate('')
    setEditDueDate('')
  }

  const handleDeleteTodo = async (todoId: string) => {
    // handleDeleteTodo被调用
    
    try {
      // 调用父组件的删除函数
      onDeleteTodo(todoId)
    } catch (error) {
      console.error('删除todo失败:', error)
    }
  }

  useEffect(() => {
    loadTodos()
  }, [selectedDate])

  // 点击外部区域关闭菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuOpenTodo) {
        const target = event.target as Element
        // 检查点击的元素是否在菜单内部
        const menuElement = target.closest('.todo-menu')
        if (!menuElement) {
          setMenuOpenTodo(null)
        }
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [menuOpenTodo])

  const completedCount = displayTodos.filter(todo => todo.completed).length
  const totalCount = displayTodos.length

  return (
    <div className="flex flex-col h-full">
      {/* 固定的标题和标签筛选区域 */}
      <div className="p-4 border-b bg-background">
        <div className="flex items-center justify-between mb-3">
          <h3 
            className="font-medium text-sm cursor-pointer hover:text-primary transition-colors"
            onClick={() => setIsLargeTodoListOpen(true)}
            title="点击查看大的Todo列表"
          >
            Todo 列表
          </h3>
          <div className="text-xs text-muted-foreground">
            {completedCount}/{totalCount}
          </div>
        </div>

        {/* 标签筛选区域 */}
        <div className="mb-3">
          <div className="flex flex-wrap gap-1">
            <button
              onClick={() => setSelectedTag('all')}
              className={cn(
                "px-2 py-1 text-xs rounded border transition-colors",
                selectedTag === 'all' 
                  ? "bg-primary text-primary-foreground border-primary" 
                  : "bg-background text-muted-foreground border-border hover:bg-accent"
              )}
            >
              All
            </button>
            {allTags.map((tag) => (
              <button
                key={tag}
                onClick={() => setSelectedTag(tag)}
                className={cn(
                  "px-2 py-1 text-xs rounded border transition-colors",
                  selectedTag === tag 
                    ? "bg-primary text-primary-foreground border-primary" 
                    : "bg-background text-muted-foreground border-border hover:bg-accent"
                )}
              >
                #{tag}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 可滚动的Todo列表区域 */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4">
          {/* 添加新Todo按钮 - 仅在选择了特定标签时显示 */}
          {selectedTag !== 'all' && (
            <div className="mb-3">
              <Button
                onClick={() => setNewTodoTag(selectedTag)}
                className="w-full flex items-center justify-center py-1 text-sm"
                variant="outline"
              >
                <Plus className="h-3 w-3 mr-1" />
                添加 #{selectedTag} 标签的Todo
              </Button>
              
              {/* 新建todo区域 - 紧跟在按钮下面 */}
              {newTodoTag && (
                <div className="mt-3 p-3 border rounded-lg bg-accent/20">
                  <Input
                    value={newTodoContent}
                    onChange={(e) => setNewTodoContent(e.target.value)}
                    placeholder={`输入 #${newTodoTag} 标签的todo内容...`}
                    className="text-sm h-8 mb-2"
                    onKeyDown={async (e) => {
                      // 禁用回车键添加功能，只允许多行输入
                      // 只有当按下Ctrl+Enter或Command+Enter时才提交
                      if (e.key === 'Enter' && !(e.ctrlKey || e.metaKey)) {
                        // 允许普通回车键进行换行，不做任何处理
                        return
                      }
                      
                      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && newTodoContent.trim()) {
                        e.preventDefault()
                        try {
                          const todoResult = await apiClient.createTodo({
                             text: newTodoContent.trim(),
                             tags: [newTodoTag]
                           })
                          
                          if (!todoResult.error) {
                            await onLoadTodos()
                            setNewTodoContent('')
                            setNewTodoTag(null)
                            toast({
                              title: "成功",
                              description: "Todo已添加",
                            })
                          } else {
                            toast({
                              title: "错误",
                              description: todoResult.error || "添加Todo失败",
                              variant: "destructive"
                            })
                          }
                        } catch (error) {
                          console.error('Create todo error:', error)
                          toast({
                            title: "错误",
                            description: error instanceof Error ? error.message : "添加Todo失败",
                            variant: "destructive"
                          })
                        }
                      } else if (e.key === 'Escape') {
                        setNewTodoTag(null)
                        setNewTodoContent('')
                      }
                    }}
                    autoFocus
                  />
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-6 px-2 text-xs"
                      onClick={async () => {
                        if (newTodoContent.trim()) {
                          try {
                            const todoResult = await apiClient.createTodo({
                               text: newTodoContent.trim(),
                               tags: [newTodoTag]
                             })
                            
                            if (!todoResult.error) {
                              await onLoadTodos()
                              setNewTodoContent('')
                              setNewTodoTag(null)
                              toast({
                                title: "成功",
                                description: "Todo已添加",
                              })
                            } else {
                              toast({
                                title: "错误",
                                description: todoResult.error || "添加Todo失败",
                                variant: "destructive"
                              })
                            }
                          } catch (error) {
                            console.error('Create todo error:', error)
                            toast({
                              title: "错误",
                              description: error instanceof Error ? error.message : "添加Todo失败",
                              variant: "destructive"
                            })
                          }
                        }
                      }}
                    >
                      <Save className="h-3 w-3 mr-1" />
                      保存
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 px-2 text-xs"
                      onClick={() => {
                        setNewTodoTag(null)
                        setNewTodoContent('')
                      }}
                    >
                      <XCircle className="h-3 w-3 mr-1" />
                      取消
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
          
          {isLoading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              <span className="text-sm">加载中...</span>
            </div>
          ) : displayTodos.length > 0 ? (
            <div className="space-y-2">
              {displayTodos.map((todo) => (
                <div
                  key={todo.id}
                  className="p-2 rounded border bg-card hover:bg-accent/50 transition-colors"
                >
                  {editingTodo === todo.id ? (
                    // 编辑模式
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          checked={todo.completed}
                          onCheckedChange={() => handleToggleTodo(todo.id)}
                          className="mt-0.5"
                        />
                        <Input
                          value={editContent}
                          onChange={(e) => setEditContent(e.target.value)}
                          className="flex-1 text-sm"
                          placeholder="编辑todo内容"
                        />
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="flex items-center space-x-1 flex-1">
                          <label className="text-xs text-gray-600 whitespace-nowrap">起始日期:</label>
                          <Input
                            type="date"
                            value={editStartDate}
                            onChange={(e) => setEditStartDate(e.target.value)}
                            className="flex-1 text-xs"
                            placeholder="年/月/日"
                          />
                        </div>
                        <div className="flex items-center space-x-1 flex-1">
                          <label className="text-xs text-gray-600 whitespace-nowrap">截止日期:</label>
                          <Input
                            type="date"
                            value={editDueDate}
                            onChange={(e) => setEditDueDate(e.target.value)}
                            className="flex-1 text-xs"
                            placeholder="年/月/日"
                          />
                        </div>
                      </div>
                      <div className="flex justify-end space-x-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleCancelEdit}
                          className="h-6 px-2"
                        >
                          <XCircle className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          onClick={handleSaveEdit}
                          className="h-6 px-2"
                        >
                          <Save className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    // 显示模式
                    <div className="flex items-start space-x-2">
                      <Checkbox
                        id={todo.id}
                        checked={todo.completed}
                        onCheckedChange={() => handleToggleTodo(todo.id)}
                        className="mt-0.5"
                      />
                      <div className="flex-1">
                        <label
                          className={cn(
                             "text-sm block cursor-pointer hover:bg-accent/50 p-1 rounded transition-colors",
                             todo.completed ? "line-through text-muted-foreground" : "text-foreground"
                           )}
                          onClick={() => onShowTodoDetail({
                            id: todo.id,
                            content: todo.content,
                            completed: todo.completed,
                            tags: todo.tags,
                            startDate: todo.startDate,
                            dueDate: todo.dueDate
                          })}
                        >
                          {todo.content}
                          {/* 标签跟在文字后面 */}
                          {todo.tags.length > 0 && (
                            <span className="ml-2">
                              {todo.tags.map((tag, index) => (
                                <span
                                  key={index}
                                  className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 ml-1"
                                >
                                  #{tag}
                                </span>
                              ))}
                            </span>
                          )}
                        </label>
                        {/* 显示日期信息 */}
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {todo.startDate && todo.dueDate ? (
                            <span>
                              {new Date(todo.startDate).toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '/')} - {new Date(todo.dueDate).toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '/')}
                            </span>
                          ) : todo.startDate ? (
                            <span>起始: {new Date(todo.startDate).toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '/')}</span>
                          ) : todo.dueDate ? (
                            <span>截止: {new Date(todo.dueDate).toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '/')}</span>
                          ) : null}
                        </div>
                      </div>
                      <div className="relative">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            // 三个小点按钮被点击
                            const newState = menuOpenTodo === todo.id ? null : todo.id
                            // 设置菜单状态
                            setMenuOpenTodo(newState)
                          }}
                          className="h-6 w-6 p-0"
                        >
                          <MoreVertical className="h-3 w-3" />
                        </Button>
                        {menuOpenTodo === todo.id && (
                          <div className="todo-menu absolute right-0 top-6 bg-background border rounded-md shadow-lg z-10 min-w-[80px]">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                // 编辑按钮被点击
                                handleEditTodo(todo)
                                setMenuOpenTodo(null)
                              }}
                              className="w-full justify-start h-8 px-2 text-xs"
                            >
                              <Edit className="h-3 w-3 mr-1" />
                              编辑
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                // 删除按钮被点击
                                handleDeleteTodo(todo.id)
                                setMenuOpenTodo(null)
                              }}
                              className="w-full justify-start h-8 px-2 text-xs text-red-500 hover:text-red-700"
                            >
                              <Trash2 className="h-3 w-3 mr-1" />
                              删除
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-4 text-sm text-muted-foreground">
              暂无Todo事项
            </div>
          )}
        </div>
      </div>
      
      {/* 大的Todo列表弹窗 */}
      {isLargeTodoListOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-background rounded-lg shadow-xl w-full max-w-7xl h-[80vh] flex flex-col">
            {/* 弹窗标题栏 */}
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">Todo 列表总览</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsLargeTodoListOpen(false)}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            {/* 按标签分列的Todo内容 */}
             <div className="flex-1 overflow-hidden p-2">
               {allTags.length > 0 ? (
                 <div className="grid gap-2 h-full" style={{ gridTemplateColumns: `repeat(${allTags.filter(tag => allTodos.filter(todo => todo.tags.includes(tag) && todo.tags[0] === tag).length > 0).length}, 1fr)` }}>
                  {allTags.map((tag) => {
                      const tagTodos = allTodos.filter(todo => todo.tags.includes(tag) && todo.tags[0] === tag)
                     if (tagTodos.length === 0) return null
                     return (
                       <div key={tag} className="border rounded-lg p-2 flex flex-col">
                        <div className="flex items-center justify-between mb-3 pb-2 border-b">
                          <h3 className="font-medium text-sm">#{tag}</h3>
                          <span className="text-xs text-muted-foreground">
                            {tagTodos.filter(t => t.completed).length}/{tagTodos.length}
                          </span>
                        </div>
                        <div className="flex-1 overflow-y-auto">
                           {tagTodos.map((todo, index) => (
                             <div key={todo.id}>
                               <div
                                  className="p-2 hover:bg-accent/50 transition-colors cursor-pointer relative"
                                 onClick={() => {
                                   const newState = menuOpenTodo === todo.id ? null : todo.id
                                   setMenuOpenTodo(newState)
                                 }}
                               >
                                 <div
                                   className={cn(
                                     "text-sm",
                                     todo.completed ? "line-through text-muted-foreground" : "text-foreground"
                                   )}
                                 >
                                   {todo.content}
                                 </div>
                                 {/* 显示日期信息 */}
                                 <div className="text-xs text-muted-foreground mt-1">
                                   {todo.startDate && todo.dueDate ? (
                                     <span>
                                       {new Date(todo.startDate).toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' })} - {new Date(todo.dueDate).toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' })}
                                     </span>
                                   ) : todo.startDate ? (
                                     <span>起始: {new Date(todo.startDate).toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' })}</span>
                                   ) : todo.dueDate ? (
                                     <span>截止: {new Date(todo.dueDate).toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' })}</span>
                                   ) : null}
                                 </div>
                                 
                                 {/* 菜单 */}
                                 {menuOpenTodo === todo.id && (
                                   <div className="todo-menu absolute right-2 top-2 bg-background border rounded-md shadow-lg z-10 min-w-[100px]">
                                     <Button
                                       size="sm"
                                       variant="ghost"
                                       onClick={(e) => {
                                         e.stopPropagation()
                                         handleEditTodo(todo)
                                         setMenuOpenTodo(null)
                                       }}
                                       className="w-full justify-start h-8 px-3 text-xs"
                                     >
                                       <Edit className="h-3 w-3 mr-2" />
                                       编辑
                                     </Button>
                                     <Button
                                       size="sm"
                                       variant="ghost"
                                       onClick={(e) => {
                                         e.stopPropagation()
                                         handleDeleteTodo(todo.id)
                                         setMenuOpenTodo(null)
                                       }}
                                       className="w-full justify-start h-8 px-3 text-xs text-red-500 hover:text-red-700"
                                     >
                                       <Trash2 className="h-3 w-3 mr-2" />
                                       删除
                                     </Button>
                                     <Button
                                       size="sm"
                                       variant="ghost"
                                       onClick={(e) => {
                                         e.stopPropagation()
                                         handleToggleTodo(todo.id)
                                         setMenuOpenTodo(null)
                                       }}
                                       className="w-full justify-start h-8 px-3 text-xs"
                                     >
                                       <Check className="h-3 w-3 mr-2" />
                                       {todo.completed ? '取消完成' : '完成'}
                                     </Button>
                                   </div>
                                 )}
                               </div>
                               {/* 分割线 */}
                               {index < tagTodos.length - 1 && (
                                 <div className="border-b border-border/50" />
                               )}
                             </div>
                           ))}
                          {tagTodos.length === 0 && (
                            <div className="text-center py-4 text-xs text-muted-foreground">
                              暂无Todo
                            </div>
                          )}
                          
                          {/* 新建todo区域 */}
                          {newTodoTag === tag ? (
                            <div className="mt-2 p-2 border-t">
                              <Input
                                value={newTodoContent}
                                onChange={(e) => setNewTodoContent(e.target.value)}
                                placeholder="输入todo内容..."
                                className="text-xs h-8 mb-2"
                                onKeyDown={async (e) => {
                                  if (e.key === 'Enter' && newTodoContent.trim()) {
                                    try {
                                      const todoResult = await apiClient.createTodo({
                                         text: newTodoContent.trim(),
                                         tags: [tag]
                                       })
                                      
                                      if (!todoResult.error) {
                                        await onLoadTodos()
                                        setNewTodoContent('')
                                        setNewTodoTag(null)
                                        toast({
                                          title: "成功",
                                          description: "Todo已添加",
                                        })
                                      } else {
                                        toast({
                                          title: "错误",
                                          description: todoResult.error || "添加Todo失败",
                                          variant: "destructive"
                                        })
                                      }
                                    } catch (error) {
                                      console.error('Create todo error:', error)
                                      toast({
                                        title: "错误",
                                        description: error instanceof Error ? error.message : "添加Todo失败",
                                        variant: "destructive"
                                      })
                                    }
                                  } else if (e.key === 'Escape') {
                                    setNewTodoTag(null)
                                    setNewTodoContent('')
                                  }
                                }}
                                autoFocus
                              />
                              <div className="flex gap-1">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-6 px-2 text-xs"
                                  onClick={async () => {
                                    if (newTodoContent.trim()) {
                                      try {
                                        const todoResult = await apiClient.createTodo({
                                           text: newTodoContent.trim(),
                                           tags: [tag]
                                         })
                                        
                                        if (!todoResult.error) {
                                          await onLoadTodos()
                                          setNewTodoContent('')
                                          setNewTodoTag(null)
                                          toast({
                                            title: "成功",
                                            description: "Todo已添加",
                                          })
                                        } else {
                                          toast({
                                            title: "错误",
                                            description: todoResult.error || "添加Todo失败",
                                            variant: "destructive"
                                          })
                                        }
                                      } catch (error) {
                                        console.error('Create todo error:', error)
                                        toast({
                                          title: "错误",
                                          description: error instanceof Error ? error.message : "添加Todo失败",
                                          variant: "destructive"
                                        })
                                      }
                                    }
                                  }}
                                >
                                  确定
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-6 px-2 text-xs"
                                  onClick={() => {
                                    setNewTodoTag(null)
                                    setNewTodoContent('')
                                  }}
                                >
                                  取消
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div className="mt-2 border-t pt-2">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="w-full h-8 text-xs text-muted-foreground hover:text-foreground"
                                onClick={() => {
                                  setNewTodoTag(tag)
                                  setNewTodoContent('')
                                }}
                              >
                                <Plus className="h-3 w-3 mr-1" />
                                {/* 添加Todo */}
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  暂无Todo标签
                </div>
              )}
            </div>
            
          </div>
        </div>
      )}
    </div>
  )
}

// Main Component
export default function NotePad() {
  const { theme, setTheme } = useTheme()
  const router = useRouter()
  const [notes, setNotes] = useState<Note[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [hasMoreNotes, setHasMoreNotes] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [inputValue, setInputValue] = useState("")
  const [date, setDate] = useState<Date>(new Date())
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isAdding, setIsAdding] = useState(false)
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)
  const [inputMode, setInputMode] = useState<'note' | 'todo'>('note')
  const [todoDueDate, setTodoDueDate] = useState('')
  const [todoStartDate, setTodoStartDate] = useState('')
  const [todosByDate, setTodosByDate] = useState<Record<string, Array<{ 
    id: string; 
    content: string; 
    completed: boolean;
    tags: string[];
    dueDate?: string;
    startDate?: string;
  }>>>({})

  const [searchTerm, setSearchTerm] = useState("")
  const [isSearching, setIsSearching] = useState(false)
  const [currentTag, setCurrentTag] = useState<string>("") // 当前搜索的标签
  const [selectedImage, setSelectedImage] = useState<string | null>(null) // 选择的图片
  const [isLoggedIn, setIsLoggedIn] = useState(false) // 用户登录状态
  const [isLargeCalendarOpen, setIsLargeCalendarOpen] = useState(false) // 大日历弹窗状态
  const [schedulesByDate, setSchedulesByDate] = useState<Record<string, any[]>>({}) // 日程数据
  const [isExporting, setIsExporting] = useState(false) // 导出状态
  const [isImporting, setIsImporting] = useState(false) // 导入状态
  const [searchHistory, setSearchHistory] = useState<string[]>([]) // 搜索历史记录
  const [selectedTodoDetail, setSelectedTodoDetail] = useState<{
    id: string;
    content: string;
    completed: boolean;
    tags: string[];
    startDate?: string;
    dueDate?: string;
  } | null>(null) // 选中的todo详情
  
  // 计时相关状态
  const [isTimerRunning, setIsTimerRunning] = useState(false)
  const [timerSeconds, setTimerSeconds] = useState(0)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  // 加载所有日程数据
  const loadAllSchedules = useCallback(async () => {
    try {
      const response = await schedulesApi.getAll()
      if (response.success) {
        setSchedulesByDate(response.data)
      }
    } catch (error) {
      console.error('加载日程失败:', error)
    }
  }, [])

  // 监听自定义事件，实时更新日程数据
  useEffect(() => {
    const handleScheduleUpdate = () => {
      loadAllSchedules()
    }

    window.addEventListener('scheduleUpdated', handleScheduleUpdate)
    
    return () => {
      window.removeEventListener('scheduleUpdated', handleScheduleUpdate)
    }
  }, [loadAllSchedules])

  // 按日期分组笔记
  const groupNotesByDate = (notes: Note[]) => {
    const groups: { [key: string]: Note[] } = {}

    notes.forEach((note) => {
      const dateKey = getDateKey(note.createdAt)
      if (!groups[dateKey]) {
        groups[dateKey] = []
      }
      groups[dateKey].push(note)
    })

    // 按日期排序，最新的在前面
    const sortedGroups = Object.entries(groups).sort(([a], [b]) => {
      return new Date(b).getTime() - new Date(a).getTime()
    })

    // 每组内的笔记按时间排序，最新的在前面
    sortedGroups.forEach(([, groupNotes]) => {
      groupNotes.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    })

    return sortedGroups
  }

  // 计时器相关函数
  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const startTimer = () => {
    setIsTimerRunning(true)
    timerRef.current = setInterval(() => {
      setTimerSeconds(prev => prev + 1)
    }, 1000)
  }

  const pauseTimer = () => {
    setIsTimerRunning(false)
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }

  const resetTimer = () => {
    setIsTimerRunning(false)
    setTimerSeconds(0)
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }

  // 清理计时器
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [])

  // 滚动到指定日期的笔记
  const scrollToDate = (targetDate: Date) => {
    const dateKey = getDateKey(targetDate.toISOString())
    const element = document.getElementById(`date-group-${dateKey}`)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
    // 移除未找到笔记的警告提示
  }

  // 处理日历日期选择
  const handleDateSelect = (selectedDate: Date | undefined) => {
    if (selectedDate) {
      // 保留当前时间，只更新日期部分
      const currentTime = new Date()
      const newDate = new Date(selectedDate)
      newDate.setHours(currentTime.getHours(), currentTime.getMinutes(), currentTime.getSeconds(), currentTime.getMilliseconds())
      
      setDate(newDate)
      // 如果不是在搜索状态，则跳转到对应日期的笔记
      if (!searchTerm) {
        scrollToDate(newDate)
      }
      // 显示提示信息，告知用户现在可以添加笔记到选中的日期
      toast({
        title: "日期已选择",
        description: `现在添加的笔记将保存到 ${newDate.toLocaleDateString('zh-CN')}`,
        duration: 2000,
      })
    }
  }

  // 加载笔记
  const loadNotes = useCallback(async (reset: boolean = true) => {
    try {
      if (reset) {
        setCurrentPage(1)
        setHasMoreNotes(true)
      }
      
      const result = await getNotes(reset ? 1 : currentPage, 100)
      
      if (reset) {
        setNotes(result.notes)
      } else {
        setNotes(prev => [...prev, ...result.notes])
      }
      
      // 检查是否还有更多数据
      setHasMoreNotes(result.pagination && result.pagination.current < result.pagination.pages)
      
      if (!reset) {
        setCurrentPage(prev => prev + 1)
      }
    } catch (error) {
      toast({
        title: "加载失败",
        description: "无法加载笔记，请刷新页面重试",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
      setIsLoadingMore(false)
    }
  }, [currentPage])

  // 加载更多笔记
  const loadMoreNotes = useCallback(async () => {
    if (isLoadingMore || !hasMoreNotes) return
    
    setIsLoadingMore(true)
    await loadNotes(false)
  }, [isLoadingMore, hasMoreNotes, loadNotes])

  // 搜索笔记
  const handleSearch = async (term: string) => {
    setSearchTerm(term)
    setIsSearching(true)
    setCurrentPage(1)
    setHasMoreNotes(true)

    // 更新搜索历史记录
    if (term.trim()) {
      const updatedHistory = [term, ...searchHistory.filter(item => item !== term)].slice(0, 10)
      setSearchHistory(updatedHistory)
      localStorage.setItem('searchHistory', JSON.stringify(updatedHistory))
    }

    try {
      let searchResult: { notes: Note[]; pagination: any }
      
      // 检查是否是标签搜索（以#开头）
      if (term.startsWith('#')) {
        const tag = term.substring(1) // 移除#前缀
        setCurrentTag(tag) // 设置当前标签
        searchResult = await searchNotesByTag(tag, 1, 100)
      } else {
        setCurrentTag("") // 清除当前标签
        searchResult = await searchNotes(term, 1, 100)
      }
      
      setNotes(searchResult.notes)
      setHasMoreNotes(searchResult.pagination && searchResult.pagination.current < searchResult.pagination.pages)
    } catch (error) {
      toast({
        title: "搜索失败",
        description: "搜索时出现错误",
        variant: "destructive",
      })
    } finally {
      setIsSearching(false)
    }
  }

  // 清除搜索，显示全部笔记
  const handleClearSearch = async () => {
    setSearchTerm("")
    setCurrentTag("") // 清除当前标签
    setIsSearching(true)
    setCurrentPage(1)
    setHasMoreNotes(true)

    try {
      const result = await getNotes(1, 100)
      setNotes(result.notes)
      setHasMoreNotes(result.pagination && result.pagination.current < result.pagination.pages)
      toast({
        title: "已显示全部笔记",
        description: `共显示 ${result.notes.length} 条笔记`,
      })
    } catch (error) {
      toast({
        title: "加载失败",
        description: "无法加载笔记",
        variant: "destructive",
      })
    } finally {
      setIsSearching(false)
    }
  }

  // 标签点击搜索
  const handleTagClick = async (tag: string) => {
    setSearchTerm(`#${tag}`)
    setCurrentTag(tag) // 设置当前标签
    setIsSearching(true)

    try {
      const searchResults = await searchNotesByTag(tag)
      setNotes(searchResults)
      toast({
        title: "标签搜索",
        description: `找到 ${searchResults.length} 条包含 #${tag} 标签的笔记`,
      })
    } catch (error) {
      toast({
        title: "搜索失败",
        description: "标签搜索时出现错误",
        variant: "destructive",
      })
    } finally {
      setIsSearching(false)
    }
  }

  // 刷新笔记


  // 处理图片上传
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // 检查文件类型
    if (!file.type.startsWith('image/')) {
      toast({
        title: "上传失败",
        description: "请选择图片文件",
        variant: "destructive",
      })
      return
    }

    // 检查文件大小（限制为5MB）
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "上传失败",
        description: "图片大小不能超过5MB",
        variant: "destructive",
      })
      return
    }

    const reader = new FileReader()
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string
      
      // 检查Data URL大小（限制为90KB，确保不超过后端100000字符限制）
      if (dataUrl && dataUrl.length > 90000) {
        toast({
          title: "上传失败",
          description: "图片过大，请选择更小的图片或降低图片质量",
          variant: "destructive",
        })
        return
      }
      
      setSelectedImage(dataUrl)
    }
    reader.readAsDataURL(file)
  }

  // 移除已选择的图片
  const handleRemoveImage = () => {
    setSelectedImage(null)
  }

  // 导出笔记、Todo和日程为Markdown文档
  const handleExportNotes = async () => {
    setIsExporting(true)
    try {
      // 获取要导出的笔记
      const notesToExport = searchTerm ? notes : await getNotes()
      
      // 获取所有Todo数据
      const allTodos = Object.values(todosByDate).flat()
      
      // 获取所有日程数据
      const allSchedules = Object.values(schedulesByDate).flat()
      
      if (notesToExport.length === 0 && allTodos.length === 0 && allSchedules.length === 0) {
        toast({
          title: "导出失败",
          description: "没有可导出的数据",
          variant: "destructive",
        })
        return
      }

      // 生成Markdown内容
      let markdownContent = `# 土豆笔记完整导出\n\n`
      markdownContent += `导出时间: ${new Date().toLocaleString('zh-CN')}\n\n`
      markdownContent += `包含内容:\n`
      markdownContent += `- 笔记: ${notesToExport.length} 条\n`
      markdownContent += `- Todo事项: ${allTodos.length} 条\n`
      markdownContent += `- 日程安排: ${allSchedules.length} 条\n\n`
      markdownContent += `---\n\n`

      // 按日期分组并排序笔记
      const groupedNotes = groupNotesByDate(notesToExport)
      
      // 按日期分组Todo
      const groupedTodos: Record<string, any[]> = {}
      Object.entries(todosByDate).forEach(([dateKey, todos]) => {
        if (todos.length > 0) {
          groupedTodos[dateKey] = todos
        }
      })
      
      // 按日期分组日程
      const groupedSchedules: Record<string, any[]> = {}
      Object.entries(schedulesByDate).forEach(([dateKey, schedules]) => {
        if (schedules.length > 0) {
          groupedSchedules[dateKey] = schedules
        }
      })
      
      // 获取所有有数据的日期并排序
      const allDates = new Set([
        ...groupedNotes.map(([dateKey]) => dateKey),
        ...Object.keys(groupedTodos),
        ...Object.keys(groupedSchedules)
      ])
      
      const sortedDates = Array.from(allDates).sort((a, b) => new Date(b).getTime() - new Date(a).getTime())
      
      sortedDates.forEach(dateKey => {
        const date = new Date(dateKey)
        const formattedDate = date.toLocaleDateString('zh-CN', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          weekday: 'long'
        })
        
        markdownContent += `## ${formattedDate}\n\n`
        
        // 添加该日期的笔记
        const dayNotes = groupedNotes.find(([key]) => key === dateKey)?.[1] || []
        if (dayNotes.length > 0) {
          markdownContent += `### 📝 笔记 (${dayNotes.length}条)\n\n`
          dayNotes.forEach((note, index) => {
            const noteTime = new Date(note.createdAt).toLocaleTimeString('zh-CN', {
              hour: '2-digit',
              minute: '2-digit'
            })
            
            markdownContent += `#### ${noteTime} - 笔记 ${index + 1}\n\n`
            
            // 添加标签
            if (note.tags && note.tags.length > 0) {
              markdownContent += `**标签:** ${note.tags.map(tag => `#${tag}`).join(' ')}\n\n`
            }
            
            // 添加笔记内容
            markdownContent += `${note.originalContent || note.content}\n\n`
          })
        }
        
        // 添加该日期的Todo事项
        const dayTodos = groupedTodos[dateKey] || []
        if (dayTodos.length > 0) {
          markdownContent += `### ✅ Todo事项 (${dayTodos.length}条)\n\n`
          dayTodos.forEach((todo, index) => {
            const status = todo.completed ? '✅' : '⬜'
            markdownContent += `${index + 1}. ${status} ${todo.content}\n`
            
            if (todo.tags && todo.tags.length > 0) {
              markdownContent += `   **标签:** ${todo.tags.map((tag: string) => `#${tag}`).join(' ')}\n`
            }
            
            if (todo.dueDate) {
              markdownContent += `   **截止日期:** ${todo.dueDate}\n`
            }
            
            if (todo.startDate) {
              markdownContent += `   **开始日期:** ${todo.startDate}\n`
            }
            
            markdownContent += `\n`
          })
          markdownContent += `\n`
        }
        
        // 添加该日期的日程安排
        const daySchedules = groupedSchedules[dateKey] || []
        if (daySchedules.length > 0) {
          markdownContent += `### 📅 日程安排 (${daySchedules.length}条)\n\n`
          daySchedules.forEach((schedule, index) => {
            markdownContent += `${index + 1}. **${schedule.time}** - ${schedule.title}\n`
            
            if (schedule.description) {
              markdownContent += `   ${schedule.description}\n`
            }
            
            if (schedule.type) {
              markdownContent += `   **类型:** ${schedule.type}\n`
            }
            
            markdownContent += `\n`
          })
          markdownContent += `\n`
        }
        
        markdownContent += `---\n\n`
      })

      // 创建并下载文件
      const blob = new Blob([markdownContent], { type: 'text/markdown;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      
      // 生成文件名
      const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-')
      const filename = searchTerm 
        ? `土豆笔记-搜索结果-${searchTerm}-${timestamp}.md`
        : `土豆笔记-全部-${timestamp}.md`
      
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      toast({
        title: "导出成功",
        description: `已导出 ${notesToExport.length} 条笔记到 ${filename}`,
      })
    } catch (error) {
      console.error('导出失败:', error)
      toast({
        title: "导出失败",
        description: "导出过程中出现错误，请重试",
        variant: "destructive",
      })
    } finally {
      setIsExporting(false)
    }
  }

  // 导入笔记、Todo和日程从Markdown文档
  const handleImportNotes = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.md,.markdown,.txt'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return

      setIsImporting(true)
      try {
        const text = await file.text()
        const { notes: importedNotes, todos: importedTodos, schedules: importedSchedules } = parseMarkdownToData(text)
        
        if (importedNotes.length === 0 && importedTodos.length === 0 && importedSchedules.length === 0) {
          toast({
            title: "导入失败",
            description: "文件中没有找到有效的数据",
            variant: "destructive",
          })
          return
        }

        let notesSuccessCount = 0
        let todosSuccessCount = 0
        let schedulesSuccessCount = 0

        // 批量添加笔记
        for (const noteData of importedNotes) {
          try {
            // 重新构建包含标签的内容
            let contentWithTags = noteData.content
            if (noteData.tags.length > 0) {
              contentWithTags += '\n\n' + noteData.tags.map(tag => `#${tag}`).join(' ')
            }
            
            // 使用完整的ISO时间字符串
            const customDate = noteData.createdAt.toISOString()
            
            // 直接调用API而不是通过addNote函数，以便传递customDate
            // 使用utils.ts中的extractTags函数，返回string[]格式
            const tags = extractTags(contentWithTags)
            // 确保title不为空且不超过200字符
            const firstLine = contentWithTags.trim().split('\n')[0] || ''
            const title = firstLine.length > 0 ? firstLine.substring(0, 200) : '导入的笔记'
            
            const response = await notesApi.create({
              title,
              content: contentWithTags,
              tags,
              customDate
            })
            
            if (response.success) {
              notesSuccessCount++
            } else {
              console.error('添加笔记失败:', response.error)
            }
          } catch (error) {
            console.error('添加笔记失败:', error)
          }
        }

        // 批量添加Todo事项
        for (const todoData of importedTodos) {
          try {
            const dateKey = todoData.date
            setTodosByDate(prev => ({
              ...prev,
              [dateKey]: [...(prev[dateKey] || []), todoData.todo]
            }))
            todosSuccessCount++
          } catch (error) {
            console.error('添加Todo失败:', error)
          }
        }

        // 批量添加日程安排
        for (const scheduleData of importedSchedules) {
          try {
            const response = await schedulesApi.create({
              title: scheduleData.schedule.title,
              time: scheduleData.schedule.time,
              date: scheduleData.date,
              description: scheduleData.schedule.description,
              type: scheduleData.schedule.type
            })
            
            if (response.success) {
              schedulesSuccessCount++
            }
          } catch (error) {
            console.error('添加日程失败:', error)
          }
        }

        // 重新加载数据
        await loadNotes()
        await loadAllSchedules()
        
        // 触发日程更新事件
        window.dispatchEvent(new CustomEvent('scheduleUpdated'))
        
        const totalSuccess = notesSuccessCount + todosSuccessCount + schedulesSuccessCount
        let description = `成功导入 ${totalSuccess} 条数据`
        if (notesSuccessCount > 0) description += `\n- 笔记: ${notesSuccessCount} 条`
        if (todosSuccessCount > 0) description += `\n- Todo: ${todosSuccessCount} 条`
        if (schedulesSuccessCount > 0) description += `\n- 日程: ${schedulesSuccessCount} 条`
        
        toast({
          title: "导入成功",
          description,
        })
      } catch (error) {
        console.error('导入失败:', error)
        toast({
          title: "导入失败",
          description: "文件解析失败，请检查文件格式",
          variant: "destructive",
        })
      } finally {
        setIsImporting(false)
      }
    }
    input.click()
  }

  // 解析Markdown文本为笔记、Todo和日程数据
  const parseMarkdownToData = (text: string) => {
    const notes: Array<{ content: string; tags: string[]; createdAt: Date }> = []
    const todos: Array<{ date: string; todo: any }> = []
    const schedules: Array<{ date: string; schedule: any }> = []
    const lines = text.split('\n')
    
    let currentDate: Date | null = null
    let currentDateKey: string = ''
    let currentTime: string | null = null
    let currentContent = ''
    let currentTags: string[] = []
    let inNoteContent = false
    let currentSection: 'notes' | 'todos' | 'schedules' | null = null
    
    // 开始解析文件
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()
      
      // 匹配日期标题 (## 2024年1月1日 星期一 或 ## 2024年1月1日星期一)
      const dateMatch = line.match(/^##\s*(.+)$/) && !line.match(/^###\s*[📝✅📅]/)
      if (dateMatch) {
        const actualDateMatch = line.match(/^##\s*(.+)$/)
        // 找到日期行
        
        // 保存上一个笔记
        if (currentContent.trim() && currentDate && currentTime && currentSection === 'notes') {
          const [hours, minutes] = currentTime.split(':')
          const noteDate = new Date(currentDate)
          noteDate.setHours(parseInt(hours), parseInt(minutes))
          
          notes.push({
            content: currentContent.trim(),
            tags: [...currentTags],
            createdAt: noteDate
          })
        }
        
        // 重置状态
        currentContent = ''
        currentTags = []
        currentTime = null
        inNoteContent = false
        currentSection = null
        
        // 尝试解析日期 - 支持多种格式
        try {
          const dateStr = actualDateMatch![1]
          
          // 匹配 "2024年1月1日 星期一" 或 "2024年1月1日星期一" 格式
          const dateRegex = /(\d{4})年(\d{1,2})月(\d{1,2})日/
          const match = dateStr.match(dateRegex)
          if (match) {
            const [, year, month, day] = match
            currentDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
            currentDateKey = currentDate.toDateString()
          } else {
            // 尝试其他日期格式
            const isoMatch = dateStr.match(/(\d{4})-(\d{1,2})-(\d{1,2})/)
            if (isoMatch) {
              const [, year, month, day] = isoMatch
              currentDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
              currentDateKey = currentDate.toDateString()
            }
          }
        } catch (error) {
          console.error('日期解析失败:', error)
        }
        continue
      }
      
      // 匹配章节标题
      const sectionMatch = line.match(/^###\s*([📝✅📅])\s*(.+)$/)
      if (sectionMatch) {
        const emoji = sectionMatch[1]
        if (emoji === '📝') {
          currentSection = 'notes'
        } else if (emoji === '✅') {
          currentSection = 'todos'
        } else if (emoji === '📅') {
          currentSection = 'schedules'
        }
        continue
      }
      
      // 匹配笔记时间标题 (#### 14:30 - 笔记 1)
      const noteTimeMatch = line.match(/^####\s*(\d{1,2}:\d{2})\s*-\s*笔记\s*\d+$/)
      if (noteTimeMatch && currentSection === 'notes') {
        // 保存上一个笔记
        if (currentContent.trim() && currentDate && currentTime) {
          const [hours, minutes] = currentTime.split(':')
          const noteDate = new Date(currentDate)
          noteDate.setHours(parseInt(hours), parseInt(minutes))
          
          notes.push({
            content: currentContent.trim(),
            tags: [...currentTags],
            createdAt: noteDate
          })
        }
        
        // 重置笔记内容和标签
        currentContent = ''
        currentTags = []
        currentTime = noteTimeMatch[1]
        inNoteContent = false
        continue
      }
      
      // 匹配Todo项目
      const todoMatch = line.match(/^(\d+)\. ([✅⬜])\s*(.+)$/)
      if (todoMatch && currentSection === 'todos' && currentDate) {
        const [, , status, content] = todoMatch
        const completed = status === '✅'
        
        // 创建todo对象
        const todo = {
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          content: content.trim(),
          completed,
          tags: [] as string[],
          dueDate: undefined as string | undefined,
          startDate: undefined as string | undefined
        }
        
        // 检查接下来的几行是否有标签、截止日期等信息
        let nextLineIndex = i + 1
        while (nextLineIndex < lines.length) {
          const nextLine = lines[nextLineIndex].trim()
          if (nextLine.startsWith('**标签:**')) {
            const tagStr = nextLine.replace('**标签:**', '').trim()
            todo.tags = tagStr.split(/\s+/).filter(tag => tag.startsWith('#')).map(tag => tag.slice(1))
            i = nextLineIndex
          } else if (nextLine.startsWith('**截止日期:**')) {
            todo.dueDate = nextLine.replace('**截止日期:**', '').trim()
            i = nextLineIndex
          } else if (nextLine.startsWith('**开始日期:**')) {
            todo.startDate = nextLine.replace('**开始日期:**', '').trim()
            i = nextLineIndex
          } else if (nextLine === '' || nextLine.match(/^\d+\. [✅⬜]/)) {
            break
          } else {
            break
          }
          nextLineIndex++
        }
        
        todos.push({ date: currentDateKey, todo })
        continue
      }
      
      // 匹配日程项目
      const scheduleMatch = line.match(/^(\d+)\. \*\*([^*]+)\*\*\s*-\s*(.+)$/)
      if (scheduleMatch && currentSection === 'schedules' && currentDate) {
        const [, , time, title] = scheduleMatch
        
        // 创建schedule对象
        const schedule = {
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          title: title.trim(),
          time: time.trim(),
          description: undefined as string | undefined,
          type: 'event' as 'meeting' | 'appointment' | 'event' | 'reminder'
        }
        
        // 检查接下来的几行是否有描述、类型等信息
        let nextLineIndex = i + 1
        while (nextLineIndex < lines.length) {
          const nextLine = lines[nextLineIndex].trim()
          if (nextLine.startsWith('**类型:**')) {
            const typeStr = nextLine.replace('**类型:**', '').trim()
            if (['meeting', 'appointment', 'event', 'reminder'].includes(typeStr)) {
              schedule.type = typeStr as any
            }
            i = nextLineIndex
          } else if (!nextLine.startsWith('**') && nextLine !== '' && !nextLine.match(/^\d+\. \*\*/)) {
            // 这是描述内容
            schedule.description = nextLine
            i = nextLineIndex
          } else if (nextLine === '' || nextLine.match(/^\d+\. \*\*/)) {
            break
          } else {
            break
          }
          nextLineIndex++
        }
        
        schedules.push({ date: currentDateKey, schedule })
        continue
      }
      
      // 匹配标签行 (**标签:** #tag1 #tag2)
      const tagMatch = line.match(/^\*\*标签:\*\*\s*(.+)$/)
      if (tagMatch && currentSection === 'notes') {
        const tagStr = tagMatch[1]
        currentTags = tagStr.split(/\s+/).filter(tag => tag.startsWith('#')).map(tag => tag.slice(1))
        inNoteContent = true
        continue
      }
      
      // 跳过分隔线、空行和标题行
      if (line === '---' || line === '' || line.startsWith('#')) {
        if (line === '---' && inNoteContent) {
          inNoteContent = false
        }
        continue
      }
      
      // 收集笔记内容（仅在notes section中）
      if (currentSection === 'notes' && currentTime && line !== '') {
        if (!inNoteContent && !line.startsWith('**')) {
          inNoteContent = true
        }
        
        if (inNoteContent && !line.startsWith('**')) {
          if (currentContent) currentContent += '\n'
          currentContent += lines[i] // 使用原始行，保持格式
        }
      }
    }
    
    // 保存最后一个笔记
    if (currentContent.trim() && currentDate && currentTime && currentSection === 'notes') {
      const [hours, minutes] = currentTime.split(':')
      const noteDate = new Date(currentDate)
      noteDate.setHours(parseInt(hours), parseInt(minutes))
      
      notes.push({
        content: currentContent.trim(),
        tags: [...currentTags],
        createdAt: noteDate
      })
    }
    
    // 解析完成，返回所有数据
    return { notes, todos, schedules }
  }

  // 添加笔记
  const handleAddNote = async () => {
    if (!inputValue.trim() && !selectedImage) return

    setIsAdding(true)
    try {
      if (inputMode === 'todo') {
        // Todo模式：添加到TodoList
        const { cleanContent, tags } = extractTagsAndCleanContent(inputValue.trim())
        
        // 调用后端API创建todo
        const todoResult = await apiClient.createTodo({
          text: cleanContent,
          tags,
          dueDate: todoDueDate || undefined,
          startDate: todoStartDate || undefined
        })
        
        if (!todoResult.error) {
          // 重新加载todos数据以确保同步
          await loadTodosData()
          
          setInputValue('')
          setTodoDueDate('')
          setTodoStartDate('')
          
          toast({
            title: "成功",
            description: "Todo已添加并保存到服务器",
          })
        } else {
          throw new Error(todoResult.error || '创建Todo失败')
        }
      } else {
        // 笔记模式：原有逻辑
        let noteContent = inputValue
        
        // 如果是标签搜索模式，自动添加当前标签
        if (searchTerm.startsWith('#')) {
          const currentTag = searchTerm.slice(1) // 移除#号
          // 检查内容中是否已包含该标签
          if (!noteContent.includes(searchTerm)) {
            noteContent = noteContent + ' ' + searchTerm
          }
        }
        
        const result = await addNote(noteContent, new Date().toISOString(), selectedImage || undefined)
        if (result.success) {
          setInputValue("")
          setSelectedImage(null) // 清除已选择的图片
          // 如果有搜索词，重新搜索；否则重新加载
          if (searchTerm) {
            // 稍微延迟一下再搜索，确保服务器端数据已经更新
            setTimeout(async () => {
              await handleSearch(searchTerm)
            }, 500)
          } else {
            await loadNotes()
          }
          // 强制更新日期以触发TodoList重新加载
          setDate(new Date(date))
          
          // 自动滚动到最新添加的笔记
          setTimeout(() => {
            if (notes.length > 0) {
              // 找到最新的笔记（按创建时间排序）
              const latestNote = notes.reduce((latest, current) => {
                return new Date(current.createdAt) > new Date(latest.createdAt) ? current : latest
              })
              
              // 滚动到最新笔记
              const noteElement = document.getElementById(`note-${latestNote.id}`)
              if (noteElement) {
                noteElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
              }
            } else {
              // 如果没有笔记，滚动到当前日期
              const currentDateString = date.toDateString()
              const dateElement = document.getElementById(`date-${currentDateString}`) || 
                                 document.getElementById(`date-group-${currentDateString}`)
              if (dateElement) {
                dateElement.scrollIntoView({ behavior: 'smooth', block: 'start' })
              }
            }
          }, 300)
          
          toast({
            title: "添加成功",
            description: "笔记已保存到服务器",
          })
        } else {
          toast({
            title: "添加失败",
            description: result.error || "未知错误",
            variant: "destructive",
          })
        }
      }
    } catch (error) {
      toast({
        title: "添加失败",
        description: inputMode === 'todo' ? "添加Todo失败" : "网络错误，请重试",
        variant: "destructive",
      })
    } finally {
      setIsAdding(false)
    }
  }
  
  // extractTagsAndCleanContent函数已移到组件外部
   
   const handleToggleTodo = async (todoId: string) => {
    try {
      // 在所有日期中查找todo
      let targetTodo: any = null
      for (const dateKey in todosByDate) {
        const todo = todosByDate[dateKey].find(t => t.id === todoId)
        if (todo) {
          targetTodo = todo
          break
        }
      }
      
      if (!targetTodo) return
      
      // 如果todo从未完成变为完成，则删除todo并创建笔记
      if (!targetTodo.completed) {
        // 创建笔记内容，包含原todo的内容和标签
        const noteContent = targetTodo.content + (targetTodo.tags && targetTodo.tags.length > 0 ? ' ' + targetTodo.tags.map((tag: string) => `#${tag}`).join(' ') : '')
        
        // 调用addNote API创建新笔记
        const result = await addNote(noteContent, new Date().toISOString())
        if (result.success) {
          // 创建笔记成功后，删除后端的todo
          const deleteResult = await apiClient.deleteTodo(todoId)
          if (deleteResult.success) {
            // 重新加载todos数据以确保同步
            await loadTodosData()
            
            // 重新加载笔记列表
            if (searchTerm) {
              await handleSearch(searchTerm)
            } else {
              await loadNotes()
            }
            toast({
              title: "成功",
              description: "Todo已完成并转换为笔记",
            })
          } else {
            toast({
              title: "警告",
              description: "笔记已创建，但删除Todo失败",
              variant: "destructive",
            })
          }
        } else {
          toast({
            title: "错误",
            description: "创建笔记失败：" + (result.error || "未知错误"),
            variant: "destructive",
          })
        }
      } else {
        // 如果是从完成变为未完成，调用后端API切换状态
        const toggleResult = await apiClient.toggleTodo(todoId)
        if (toggleResult.success) {
          // 重新加载todos数据以确保同步
          await loadTodosData()
          toast({
            title: "成功",
            description: "Todo状态已更新",
          })
        } else {
          toast({
            title: "错误",
            description: "更新Todo状态失败",
            variant: "destructive",
          })
        }
      }
    } catch (error) {
      toast({
        title: "错误",
        description: "操作失败",
        variant: "destructive",
      })
    }
  }

  const handleUpdateTodo = async (todoId: string, updates: { content?: string; startDate?: string; dueDate?: string }) => {
    try {
      // 调用后端API更新todo
      const updateData: any = {}
      if (updates.content !== undefined) updateData.text = updates.content
      if (updates.startDate !== undefined) updateData.startDate = updates.startDate
      if (updates.dueDate !== undefined) updateData.dueDate = updates.dueDate
      
      const result = await apiClient.updateTodo(todoId, updateData)
      if (result.success) {
        // 重新加载todos数据以确保同步
        await loadTodosData()
        toast({
          title: "成功",
          description: "Todo已更新",
        })
      } else {
        // 抛出错误以便上层捕获
        const errorMessage = result.error || "未知错误"
        toast({
          title: "更新失败",
          description: errorMessage,
          variant: "destructive",
        })
        throw new Error(errorMessage)
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "更新Todo失败"
      toast({
        title: "错误",
        description: errorMessage,
        variant: "destructive",
      })
      throw error // 重新抛出错误以便上层捕获
    }
  }

  const handleDeleteTodo = async (todoId: string) => {
    try {
      // 调用后端API删除todo
      const result = await apiClient.deleteTodo(todoId)
      if (result.success) {
        // 重新加载todos数据以确保同步
        await loadTodosData()
        toast({
          title: "成功",
          description: "Todo已删除",
        })
      } else {
        toast({
          title: "删除失败",
          description: result.error || "未知错误",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "错误",
        description: "删除Todo失败",
        variant: "destructive",
      })
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // 禁用回车键添加功能，只允许多行输入
    // 只有当按下Ctrl+Enter或Command+Enter时才提交
    if (e.key === "Enter" && !(e.ctrlKey || e.metaKey)) {
      // 允许普通回车键进行换行，不做任何处理
      return
    }
    
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault()
      handleAddNote()
    }
  }

  const handleNoteDelete = () => {
    // 如果有搜索词，重新搜索；否则重新加载
    if (searchTerm) {
      handleSearch(searchTerm)
    } else {
      loadNotes()
    }
  }

  // 处理笔记更新
  const handleUpdateNote = async (noteId: string, content: string, tags: string[]) => {
    try {
      const result = await apiClient.updateNote(noteId, {
        content,
        tags
      })
      
      if (result.success) {
        // 刷新笔记列表
        if (searchTerm) {
          handleSearch(searchTerm)
        } else {
          loadNotes()
        }
        toast({
          title: "更新成功",
          description: "笔记已更新",
        })
      } else {
        toast({
          title: "更新失败",
          description: result.error || "未知错误",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "错误",
        description: "更新笔记失败",
        variant: "destructive",
      })
    }
  }

  // 处理笔记转换为Todo
  const handleConvertToTodo = async (note: Note) => {
    try {
      // 创建todo
      const todoResult = await apiClient.createTodo({
        text: note.content,
        tags: note.tags,
        priority: 'medium'
      })
      
      if (!todoResult.error) {
        // 删除笔记
        const deleteResult = await deleteNote(note.id)
        if (deleteResult.success) {
          // 刷新笔记列表
          if (searchTerm) {
            handleSearch(searchTerm)
          } else {
            loadNotes()
          }
          // 刷新todo列表
          loadTodosData()
          toast({
            title: "转换成功",
            description: "笔记已转换为Todo事项并删除原笔记",
          })
        } else {
          toast({
            title: "转换失败",
            description: "Todo创建成功但删除笔记失败",
            variant: "destructive",
          })
        }
      } else {
        toast({
          title: "转换失败",
          description: todoResult.error || "创建Todo失败",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('转换笔记为todo时发生错误:', error)
      toast({
        title: "转换失败",
        description: `网络错误: ${error instanceof Error ? error.message : '请重试'}`,
        variant: "destructive",
      })
    }
  }

  // 使用认证上下文
  const { user, loading: authLoading, isAuthenticated, logout } = useAuth()

  // 检查用户登录状态
  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated) {
        // 用户未登录，重定向到登录页面
        router.push("/login")
        return
      }
      
      setIsLoggedIn(true)
      setIsCheckingAuth(false)
    }
  }, [authLoading, isAuthenticated, router])

  // 处理用户登出
  const handleLogout = () => {
    logout()
    setIsLoggedIn(false)
    router.push("/login")
  }

  // 组件加载时获取笔记和todos（仅在已登录时）
  useEffect(() => {
    if (isLoggedIn && !isCheckingAuth) {
      // 加载搜索历史记录
      const savedSearchHistory = localStorage.getItem('searchHistory')
      if (savedSearchHistory) {
        setSearchHistory(JSON.parse(savedSearchHistory))
      }
      
      loadNotes().then(() => {
        // 页面加载完成后自动滚动到最新笔记
        setTimeout(() => {
          if (notes.length > 0) {
            // 找到最新的笔记（按创建时间排序）
            const latestNote = notes.reduce((latest, current) => {
              return new Date(current.createdAt) > new Date(latest.createdAt) ? current : latest
            })
            
            // 滚动到最新笔记
            const noteElement = document.getElementById(`note-${latestNote.id}`)
            if (noteElement) {
              noteElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
            }
          } else {
            // 如果没有笔记，滚动到今天的日期
            const today = new Date().toDateString()
            const todayElement = document.getElementById(`date-${today}`) || 
                                document.getElementById(`date-group-${today}`)
            if (todayElement) {
              todayElement.scrollIntoView({ behavior: 'smooth', block: 'start' })
            }
          }
        }, 300)
      })
      loadTodosData()
      loadAllSchedules() // 加载日程数据
    }
  }, [isLoggedIn, isCheckingAuth])

  // 加载todo数据
  const loadTodosData = useCallback(async () => {
    try {
      // 获取所有todos并按日期分组
      const response = await apiClient.getTodos({ limit: 100 })
      if (response.success && response.data) {
        const todosByDateMap: Record<string, Array<{
          id: string;
          content: string;
          completed: boolean;
          tags: string[];
          dueDate?: string;
          startDate?: string;
        }>> = {}
        
        response.data.todos.forEach((todo: any) => {
          const dateKey = todo.dueDate ? getDateKey(todo.dueDate) : getDateKey(new Date().toISOString())
          if (!todosByDateMap[dateKey]) {
            todosByDateMap[dateKey] = []
          }
          todosByDateMap[dateKey].push({
            id: todo._id,
            content: todo.text,
            completed: todo.completed || false,
            tags: todo.tags || [],
            dueDate: todo.dueDate,
            startDate: todo.startDate
          })
        })
        
        setTodosByDate(todosByDateMap)
      }
    } catch (error) {
      // 加载todos失败
    }
  }, [])


  const groupedNotes = groupNotesByDate(notes)

  // 如果正在检查认证状态，显示加载界面
  if (isCheckingAuth) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">正在验证登录状态...</p>
        </div>
      </div>
    )
  }

  // 如果未登录，不渲染主界面（因为会重定向到登录页面）
  if (!isLoggedIn) {
    return null
  }

  return (
    <div className="h-screen flex flex-col">
      <Toaster />
      
      {/* 导航栏 - 固定在顶部 */}
      <header className="flex-shrink-0 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto py-3 px-4 max-w-7xl">
          <div className="flex items-center justify-between gap-4">
             {/* 左侧：土豆笔记标题 */}
             <div className="flex items-center">
               <h1 className="text-xl font-bold whitespace-nowrap">土豆笔记</h1>
             </div>
             
             {/* 中间：搜索框 */}
             <div className="flex-1 max-w-md">
               <SearchBar 
                 onSearch={handleSearch} 
                 onClearSearch={handleClearSearch} 
                 searchTerm={searchTerm}
               />
             </div>
             
             {/* 右侧：深浅色切换按钮和用户图标 */}
             <div className="flex items-center gap-2">
               <Button variant="outline" size="sm" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
                 {theme === 'dark' ? (
                   <Sun className="h-4 w-4 mr-2" />
                 ) : (
                   <Moon className="h-4 w-4 mr-2" />
                 )}
                 {theme === 'dark' ? '浅色' : '深色'}
               </Button>
               <UserNav 
                 onLogout={handleLogout}
                 onExport={handleExportNotes}
                 onImport={handleImportNotes}
                 isExporting={isExporting}
                 isImporting={isImporting}
               />
             </div>
          </div>
          
          {/* 搜索状态提示 */}
          {searchTerm && (
            <div className="mt-2 text-sm text-muted-foreground">
              搜索结果: "{searchTerm}" ({notes.length} 条笔记)
            </div>
          )}
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden">
        <div className="container mx-auto max-w-7xl flex-1 flex flex-col">
          <div className="flex flex-1 overflow-hidden">
            {/* 日历和日程区域 (1/4宽度) - 最左边 - 标签搜索时隐藏 */}
            {!searchTerm.startsWith('#') && (
            <div className="hidden md:flex md:flex-col w-1/4 bg-background border-r">
              {/* 日历区域 - 固定不滚动 */}
              <div className="p-4 border-b">
                <div className="relative">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={handleDateSelect}
                    className="rounded-md border"
                  />
                  {/* 月份点击区域覆盖层 */}
                  <div 
                    className="absolute top-2 left-2 right-2 h-8 cursor-pointer z-10 hover:bg-muted/20 rounded transition-colors"
                    onClick={() => setIsLargeCalendarOpen(true)}
                    title="点击查看大日历"
                  />
                </div>
              </div>
              
              {/* 日程区域 - 固定不滚动 */}
              <div className="p-4 border-b">
                <ScheduleList selectedDate={date} />
              </div>
              
              {/* 常用标签区域 - 标签搜索时隐藏 */}
              {!searchTerm.startsWith('#') && searchHistory.filter(item => item.startsWith('#')).length > 0 && (
                <div className="p-4 border-b">
                  <div className="mb-2">
                    <span className="text-sm text-muted-foreground">常用标签</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {searchHistory.filter(item => item.startsWith('#')).map(item => item.substring(1)).slice(0, 8).map((tag) => (
                      <Badge
                        key={tag}
                        variant="outline"
                        className="text-xs cursor-pointer hover:bg-muted bg-gray-100 dark:bg-gray-800"
                        onClick={() => {
                          const tagSearch = `#${tag}`
                          setSearchTerm(tagSearch)
                          handleSearch(tagSearch)
                        }}
                      >
                        #{tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
            )}

            {/* 记事本区域 - 中间，标签搜索时扩展宽度 */}
            <div className={`w-full flex flex-col border-r bg-background ${
              searchTerm.startsWith('#') ? 'md:w-full' : 'md:w-2/4'
            }`}>
              {/* 输入区域 - 放在最上面 - 标签搜索时隐藏 */}
              {!searchTerm.startsWith('#') && (
              <div className="flex-shrink-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-b p-3 relative z-10">
                <div className="mb-2 flex items-center justify-between">
                  {/* 模式切换按钮 */}
                  <div className="flex items-center gap-1 bg-muted rounded-md p-1">
                    <Button
                      variant={inputMode === 'note' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setInputMode('note')}
                      className="h-6 px-2 text-xs"
                    >
                      笔记
                    </Button>
                    <Button
                      variant={inputMode === 'todo' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setInputMode('todo')}
                      className="h-6 px-2 text-xs"
                    >
                      Todo
                    </Button>
                  </div>
                  {/* 添加按钮移到这里 */}
                  <Button onClick={handleAddNote} disabled={isAdding || (!inputValue.trim() && (inputMode === 'note' && !selectedImage))} size="sm" className="h-7 px-3 text-xs">
                    {isAdding ? (
                      <>
                        <Loader2 className="h-3 w-3 animate-spin mr-1" />
                        <span className="text-xs">{inputMode === 'todo' ? 'Todo添加中' : '保存中'}</span>
                      </>
                    ) : (
                      <span className="text-xs">{inputMode === 'todo' ? '添加Todo' : '添加笔记'}</span>
                    )}
                  </Button>
                </div>
                <div className="flex flex-col space-y-2">
                  <div className="relative">
                    <Textarea
                      ref={textareaRef}
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder={inputMode === 'note' ? "输入新笔记... (支持Markdown格式，使用 #学习 #工作 等标签)" : "输入新Todo... (使用 #标签)"}
                      className="flex-1 min-h-[80px] resize-none font-mono text-sm"
                      disabled={isAdding}
                    />
                    <TagSuggestion
                      inputValue={inputValue}
                      onTagSelect={setInputValue}
                      inputRef={textareaRef}
                      disabled={isAdding}
                    />
                  </div>
                  
                  {/* Todo模式下显示起始日期和截止日期输入框 */}
                  {inputMode === 'todo' && (
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-2 flex-1">
                        <label className="text-sm text-gray-600 whitespace-nowrap">起始日期:</label>
                        <Input
                          type="date"
                          value={todoStartDate}
                          onChange={(e) => setTodoStartDate(e.target.value)}
                          placeholder="年/月/日"
                          className="text-sm flex-1"
                          disabled={isAdding}
                        />
                      </div>
                      <div className="flex items-center space-x-2 flex-1">
                        <label className="text-sm text-gray-600 whitespace-nowrap">截止日期:</label>
                        <Input
                          type="date"
                          value={todoDueDate}
                          onChange={(e) => setTodoDueDate(e.target.value)}
                          placeholder="年/月/日"
                          className="text-sm flex-1"
                          disabled={isAdding}
                        />
                      </div>
                    </div>
                  )}
            
                  {/* 图片上传和预览区域 - 仅在笔记模式下显示 */}
                  {inputMode === 'note' && (
                    <>
                      <div className="flex items-center space-x-2">
                        <label htmlFor="image-upload" className="cursor-pointer">
                          <div className="flex items-center space-x-1 text-sm text-muted-foreground hover:text-primary transition-colors">
                            <Image className="h-4 w-4" />
                            <span>添加图片</span>
                          </div>
                          <input
                            id="image-upload"
                            type="file"
                            accept="image/*"
                            onChange={handleImageUpload}
                            className="hidden"
                          />
                        </label>
                        
                        {selectedImage && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleRemoveImage}
                            className="h-6 px-2 text-xs text-destructive"
                          >
                            <X className="h-3 w-3 mr-1" />
                            移除图片
                          </Button>
                        )}
                      </div>
                      
                      {/* 图片预览 */}
                      {selectedImage && (
                        <div className="relative border rounded-md p-2 mt-2">
                          <img 
                            src={selectedImage} 
                            alt="预览图片" 
                            className="max-h-48 object-contain mx-auto" 
                          />
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
              )}
              

              
              {/* 当点击标签时，显示左右布局 */}
              {currentTag ? (
                <div className="flex-1 flex overflow-hidden">
                  {/* 左侧：固定的标签内容区域 */}
                  <div className="w-2/3 border-r bg-background flex-shrink-0 flex flex-col">
                    <div className="p-4 flex-1 flex flex-col">
                      <TagContent tag={currentTag} />
                    </div>
                  </div>
                  
                  {/* 右侧：可滚动的有日期笔记区域 */}
                  <div className="flex-1 flex flex-col">
                    {/* 标签搜索时的简化笔记输入区域 - 只在右侧显示 */}
                    {searchTerm.startsWith('#') && (
                      <div className="flex-shrink-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-b p-3">
                        <div className="flex items-center space-x-2">
                          <Textarea
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder={`输入新笔记... ( ${searchTerm})`}
                            className="flex-1 min-h-[60px] resize-none font-mono text-sm"
                            disabled={isAdding}
                          />
                          <Button 
                            onClick={handleAddNote} 
                            disabled={isAdding || !inputValue.trim()} 
                            size="sm" 
                            className="h-[60px] px-4"
                          >
                            {isAdding ? (
                              <>
                                <Loader2 className="h-4 w-4 animate-spin mr-1" />
                                <span>保存中</span>
                              </>
                            ) : (
                              <span>添加笔记</span>
                            )}
                          </Button>
                        </div>
                      </div>
                    )}
                    <div className="flex-1 overflow-y-auto">
                      <div className="p-4">
                        {isLoading || isSearching ? (
                          <div className="h-full flex items-center justify-center">
                            <Loader2 className="h-6 w-6 animate-spin mr-2" />
                            <span>{isSearching ? "搜索中..." : "加载笔记中..."}</span>
                          </div>
                        ) : groupedNotes.length > 0 ? (
                          <div className="space-y-6">
                            {groupedNotes.map(([dateKey, groupNotes]) => (
                              <NoteGroup
                                key={dateKey}
                                date={dateKey}
                                notes={groupNotes}
                                onDelete={handleNoteDelete}
                                searchTerm={searchTerm}
                                onTagClick={handleTagClick}
                                onConvertToTodo={handleConvertToTodo}
                                onUpdate={handleUpdateNote}
                              />
                            ))}
                            {hasMoreNotes && (
                              <div className="flex justify-center py-4">
                                <Button
                                  variant="outline"
                                  onClick={loadMoreNotes}
                                  disabled={isLoadingMore}
                                  className="flex items-center gap-2"
                                >
                                  {isLoadingMore ? (
                                    <>
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                      加载中...
                                    </>
                                  ) : (
                                    <>
                                      <Plus className="h-4 w-4" />
                                      加载更多
                                    </>
                                  )}
                                </Button>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="h-full flex items-center justify-center text-muted-foreground">
                            {searchTerm ? "没有找到匹配的笔记" : "暂无笔记，开始添加吧"}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* 正常布局：没有选择标签时的垂直布局 */
                <div className="flex-1 overflow-y-auto">
                  <div className="p-4">
                    {isLoading || isSearching ? (
                      <div className="h-full flex items-center justify-center">
                        <Loader2 className="h-6 w-6 animate-spin mr-2" />
                        <span>{isSearching ? "搜索中..." : "加载笔记中..."}</span>
                      </div>
                    ) : groupedNotes.length > 0 ? (
                      <div className="space-y-6">
                        {groupedNotes.map(([dateKey, groupNotes]) => (
                          <NoteGroup
                            key={dateKey}
                            date={dateKey}
                            notes={groupNotes}
                            onDelete={handleNoteDelete}
                            searchTerm={searchTerm}
                            onTagClick={handleTagClick}
                            onConvertToTodo={handleConvertToTodo}
                            onUpdate={handleUpdateNote}
                          />
                        ))}
                        {hasMoreNotes && (
                          <div className="flex justify-center py-4">
                            <Button
                              variant="outline"
                              onClick={loadMoreNotes}
                              disabled={isLoadingMore}
                              className="flex items-center gap-2"
                            >
                              {isLoadingMore ? (
                                <>
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                  加载中...
                                </>
                              ) : (
                                <>
                                  <Plus className="h-4 w-4" />
                                  加载更多
                                </>
                              )}
                            </Button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="h-full flex items-center justify-center text-muted-foreground">
                        {searchTerm ? "没有找到匹配的笔记" : "暂无笔记，开始添加吧"}
                      </div>
                    )}
                  </div>
                </div>
              )}

                </div>

            {/* Todo区域 (1/4宽度) - 最右边，标签搜索时隐藏 */}
            {!searchTerm.startsWith('#') && (
              <div className="hidden md:flex md:flex-col w-1/4 bg-background">
                {/* Todo列表区域 - 独立滚动 */}
                <div className="flex-1 overflow-hidden">
                  <TodoList 
                    selectedDate={date} 
                    todosByDate={todosByDate}
                    onToggleTodo={handleToggleTodo}
                    onUpdateTodo={handleUpdateTodo}
                    onDeleteTodo={handleDeleteTodo}
                    onLoadTodos={loadTodosData}
                    onShowTodoDetail={setSelectedTodoDetail}
                  />
                </div>
              </div>
            )}
              </div>
        </div>
      </main>
      
      {/* 大日历弹窗 */}
         <LargeCalendar
           isOpen={isLargeCalendarOpen}
           onClose={() => setIsLargeCalendarOpen(false)}
           selectedDate={date}
           onDateSelect={setDate}
           schedulesByDate={schedulesByDate}
         />

      {/* Todo详情弹框 */}
      {selectedTodoDetail && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-background rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
            {/* 弹窗标题栏 */}
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">Todo 详情</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedTodoDetail(null)}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            {/* 弹窗内容 */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-4">
                {/* 标签 */}
                {selectedTodoDetail.tags.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-2">标签</h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedTodoDetail.tags.map((tag, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center px-2 py-1 rounded text-sm bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Todo内容 */}
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">内容</h3>
                  <div className={cn(
                    "text-base p-3 bg-muted/30 rounded-md",
                    selectedTodoDetail.completed ? "line-through text-muted-foreground" : "text-foreground"
                  )}>
                    {selectedTodoDetail.content}
                  </div>
                </div>

                {/* 正计时按钮 */}
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">计时</h3>
                  <div className="flex items-center gap-3">
                    <Button
                      variant="outline"
                      className="flex items-center gap-2"
                      onClick={() => {
                        if (isTimerRunning) {
                          pauseTimer()
                        } else {
                          startTimer()
                        }
                      }}
                    >
                      {isTimerRunning ? (
                        <>
                          <Pause className="h-4 w-4" />
                          暂停计时
                        </>
                      ) : (
                        <>
                          <Clock className="h-4 w-4" />
                          开始计时
                        </>
                      )}
                    </Button>
                    {timerSeconds > 0 && (
                      <div className="text-lg font-mono font-semibold text-foreground">
                        {formatTime(timerSeconds)}
                      </div>
                    )}
                  </div>
                </div>

                {/* 日期信息 */}
                {(selectedTodoDetail.startDate || selectedTodoDetail.dueDate) && (
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-2">日期</h3>
                    <div className="space-y-2">
                      {selectedTodoDetail.startDate && (
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-muted-foreground">开始日期:</span>
                          <span className="font-medium">
                            {new Date(selectedTodoDetail.startDate).toLocaleDateString('zh-CN', { 
                              year: 'numeric', 
                              month: '2-digit', 
                              day: '2-digit' 
                            })}
                          </span>
                        </div>
                      )}
                      {selectedTodoDetail.dueDate && (
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-muted-foreground">截止日期:</span>
                          <span className="font-medium">
                            {new Date(selectedTodoDetail.dueDate).toLocaleDateString('zh-CN', { 
                              year: 'numeric', 
                              month: '2-digit', 
                              day: '2-digit' 
                            })}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 弹窗底部操作按钮 */}
            <div className="flex items-center justify-end gap-2 p-4 border-t">
              <Button
                variant="outline"
                onClick={() => setSelectedTodoDetail(null)}
              >
                关闭
              </Button>
              <Button
                onClick={() => {
                  handleToggleTodo(selectedTodoDetail.id)
                  setSelectedTodoDetail(null)
                }}
                className={cn(
                  selectedTodoDetail.completed 
                    ? "bg-orange-500 hover:bg-orange-600" 
                    : "bg-green-500 hover:bg-green-600"
                )}
              >
                {selectedTodoDetail.completed ? "标记为未完成" : "标记为已完成"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
