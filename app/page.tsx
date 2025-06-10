"use client"

import type React from "react"

import { useState, useEffect } from "react"
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
import { Image, Loader2, Info, Search, X, Trash2, CheckSquare, Tag, CheckCircle2, CheckCircle, Circle, Home, Sun, Moon, Plus, Edit, Save, XCircle, MoreVertical } from "lucide-react"
// 由于NoteGroup组件已在本文件中定义,移除此导入
// 由于组件已在本文件中定义,移除重复导入
// 由于TodoList组件已在本文件中定义,移除此导入
import { TagContent } from "@/components/tag-content"
import { UserNav } from "@/components/user-nav"
import { NoteItem } from "@/components/note-item"
import {
  addNote,
  getNotes,
  deleteNote,
  searchNotes,
  searchNotesByTag,
  type Note,
} from "@/lib/actions"
import { formatDateShort, getDateKey, formatTime, formatDateOnly, cn } from "@/lib/utils"
import { toast } from "@/hooks/use-toast"
import { apiClient } from "@/lib/api"
import { Toaster } from "@/components/ui/toaster"

// SearchBar Component
function SearchBar({
  onSearch,
  onClearSearch,
  searchTerm,
  placeholder = "搜索笔记内容或标签...",
}: {
  onSearch: (searchTerm: string) => void
  onClearSearch: () => void
  searchTerm: string
  placeholder?: string
}) {
  const [inputValue, setInputValue] = useState("")

  useEffect(() => {
    setInputValue(searchTerm)
  }, [searchTerm])

  const handleSearch = () => {
    onSearch(inputValue)
  }

  const handleClear = () => {
    setInputValue("")
    onSearch("")
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // 不再拦截回车键，允许多行输入
    // 只有当按下Ctrl+Enter或Command+Enter时才提交
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault()
      onSearch(inputValue)
    }
  }

  return (
    <div className="flex items-center gap-2 max-w-md">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="pl-10 pr-10"
        />
        {inputValue && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClear}
            className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>
      <Button onClick={handleSearch} size="sm">
        搜索
      </Button>
      {searchTerm && (
        <Button onClick={onClearSearch} variant="outline" size="sm">
          <Home className="h-4 w-4 mr-1" />
          显示全部
        </Button>
      )}
    </div>
  )
}

// NoteGroup Component
function NoteGroup({
  date,
  notes,
  onDelete,
  searchTerm,
  onTagClick,
  onConvertToTodo,
}: {
  date: string
  notes: Note[]
  onDelete: () => void
  searchTerm?: string
  onTagClick: (tag: string) => void
  onConvertToTodo: (note: Note) => void
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
          <NoteItem key={note.id} note={note} onDelete={onDelete} searchTerm={searchTerm} onTagClick={onTagClick} onConvertToTodo={() => onConvertToTodo(note)} />
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
  onDeleteTodo
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
}) {
  const [isLoading, setIsLoading] = useState(false)
  const [selectedTag, setSelectedTag] = useState<string>('all')
  const [editingTodo, setEditingTodo] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')
  const [editStartDate, setEditStartDate] = useState('')
  const [editDueDate, setEditDueDate] = useState('')
  const [menuOpenTodo, setMenuOpenTodo] = useState<string | null>(null)

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
    console.log('handleEditTodo被调用', todo)
    setEditingTodo(todo.id)
    setEditContent(todo.content)
    setEditStartDate(todo.startDate || '')
    setEditDueDate(todo.dueDate || '')
  }

  const handleSaveEdit = async () => {
    if (!editingTodo) return
    
    try {
      // 调用父组件的更新函数
      onUpdateTodo(editingTodo, {
        content: editContent,
        startDate: editStartDate,
        dueDate: editDueDate
      })
      setEditingTodo(null)
      setEditContent('')
      setEditStartDate('')
      setEditDueDate('')
    } catch (error) {
      console.error('更新todo失败:', error)
    }
  }

  const handleCancelEdit = () => {
    setEditingTodo(null)
    setEditContent('')
    setEditStartDate('')
    setEditDueDate('')
  }

  const handleDeleteTodo = async (todoId: string) => {
    console.log('handleDeleteTodo被调用', todoId)
    
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
          <h3 className="font-medium text-sm">Todo 列表</h3>
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
                          htmlFor={todo.id}
                          className={cn(
                             "text-sm cursor-pointer block",
                             todo.completed ? "line-through text-muted-foreground" : "text-foreground"
                           )}
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
                            console.log('三个小点按钮被点击', todo.id, menuOpenTodo)
                            const newState = menuOpenTodo === todo.id ? null : todo.id
                            console.log('设置菜单状态为:', newState)
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
                                console.log('编辑按钮被点击', todo)
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
                                console.log('删除按钮被点击', todo.id)
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
    </div>
  )
}

// Main Component
export default function NotePad() {
  const { theme, setTheme } = useTheme()
  const router = useRouter()
  const [notes, setNotes] = useState<Note[]>([])
  const [inputValue, setInputValue] = useState("")
  const [date, setDate] = useState<Date>(new Date())
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

    // 按日期排序，最早的在前面
    const sortedGroups = Object.entries(groups).sort(([a], [b]) => {
      return new Date(a).getTime() - new Date(b).getTime()
    })

    // 每组内的笔记按时间排序，最早的在前面
    sortedGroups.forEach(([, groupNotes]) => {
      groupNotes.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    })

    return sortedGroups
  }

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
      setDate(selectedDate)
      // 如果不是在搜索状态，则跳转到对应日期的笔记
      if (!searchTerm) {
        scrollToDate(selectedDate)
      }
    }
  }

  // 加载笔记
  const loadNotes = async () => {
    try {
      const fetchedNotes = await getNotes()
      setNotes(fetchedNotes)
    } catch (error) {
      toast({
        title: "加载失败",
        description: "无法加载笔记，请刷新页面重试",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // 搜索笔记
  const handleSearch = async (term: string) => {
    setSearchTerm(term)
    setIsSearching(true)

    try {
      let searchResults: Note[]
      
      // 检查是否是标签搜索（以#开头）
      if (term.startsWith('#')) {
        const tag = term.substring(1) // 移除#前缀
        setCurrentTag(tag) // 设置当前标签
        searchResults = await searchNotesByTag(tag)
      } else {
        setCurrentTag("") // 清除当前标签
        searchResults = await searchNotes(term)
      }
      
      setNotes(searchResults)
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

    try {
      const allNotes = await getNotes()
      setNotes(allNotes)
      toast({
        title: "已显示全部笔记",
        description: `共 ${allNotes.length} 条笔记`,
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

  // 添加笔记
  const handleAddNote = async () => {
    if (!inputValue.trim() && !selectedImage) return

    setIsAdding(true)
    try {
      if (inputMode === 'todo') {
        // Todo模式：添加到TodoList
        const { cleanContent, tags } = extractTags(inputValue.trim())
        const newTodo = {
          id: Date.now().toString(),
          content: cleanContent,
          completed: false,
          tags,
          dueDate: todoDueDate || undefined,
          startDate: todoStartDate || undefined
        }
        
        // 将todo添加到所有相关日期
        const currentDateKey = date.toDateString()
        setTodosByDate(prev => ({
          ...prev,
          [currentDateKey]: [...(prev[currentDateKey] || []), newTodo]
        }))
        
        setInputValue('')
        setTodoDueDate('')
        setTodoStartDate('')
        
        toast({
          title: "成功",
          description: "Todo已添加",
        })
      } else {
        // 笔记模式：原有逻辑
        const result = await addNote(inputValue, date.toISOString(), selectedImage || undefined)
        if (result.success) {
          setInputValue("")
          setSelectedImage(null) // 清除已选择的图片
          // 如果有搜索词，重新搜索；否则重新加载
          if (searchTerm) {
            await handleSearch(searchTerm)
          } else {
            await loadNotes()
          }
          // 强制更新日期以触发TodoList重新加载
          setDate(new Date(date))
          
          // 自动滚动到最新添加的笔记
          setTimeout(() => {
            // 重新加载笔记后，找到最新的笔记进行滚动
            const allNoteElements = document.querySelectorAll('[id^="note-"]')
            if (allNoteElements.length > 0) {
              const lastNote = allNoteElements[allNoteElements.length - 1]
              lastNote.scrollIntoView({ behavior: 'smooth', block: 'center' })
            } else {
              // 如果没有找到笔记元素，回退到日期滚动
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
  
  const extractTags = (content: string): { cleanContent: string; tags: string[] } => {
     const tagRegex = /#([\u4e00-\u9fa5\w]+)/g
     const tags: string[] = []
     let match
     
     while ((match = tagRegex.exec(content)) !== null) {
       tags.push(match[1])
     }
     
     const cleanContent = content.replace(tagRegex, '').trim()
     return { cleanContent, tags }
   }
   
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
        // 删除todo
        setTodosByDate(prev => {
          const newTodosByDate = { ...prev }
          for (const dateKey in newTodosByDate) {
            newTodosByDate[dateKey] = newTodosByDate[dateKey].filter(todo => todo.id !== todoId)
          }
          return newTodosByDate
        })
        
        // 创建笔记内容，包含原todo的内容和标签
        const noteContent = targetTodo.content + (targetTodo.tags && targetTodo.tags.length > 0 ? ' ' + targetTodo.tags.map((tag: string) => `#${tag}`).join(' ') : '')
        
        // 调用addNote API创建新笔记
        const result = await addNote(noteContent, new Date().toISOString())
        if (result.success) {
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
            title: "错误",
            description: "创建笔记失败：" + (result.error || "未知错误"),
            variant: "destructive",
          })
          // 如果创建笔记失败，恢复todo
          setTodosByDate(prev => {
            const newTodosByDate = { ...prev }
            const currentDateKey = date.toDateString()
            newTodosByDate[currentDateKey] = [...(newTodosByDate[currentDateKey] || []), targetTodo]
            return newTodosByDate
          })
        }
      } else {
        // 如果是从完成变为未完成，只切换状态
        setTodosByDate(prev => {
          const newTodosByDate = { ...prev }
          for (const dateKey in newTodosByDate) {
            newTodosByDate[dateKey] = newTodosByDate[dateKey].map(todo =>
              todo.id === todoId ? { ...todo, completed: false } : todo
            )
          }
          return newTodosByDate
        })
        toast({
          title: "成功",
          description: "Todo状态已更新",
        })
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
      // 在所有日期中查找并更新todo
      setTodosByDate(prev => {
        const newTodosByDate = { ...prev }
        for (const dateKey in newTodosByDate) {
          newTodosByDate[dateKey] = newTodosByDate[dateKey].map(todo =>
            todo.id === todoId ? { ...todo, ...updates } : todo
          )
        }
        return newTodosByDate
      })
      toast({
        title: "成功",
        description: "Todo已更新",
      })
    } catch (error) {
      toast({
        title: "错误",
        description: "更新Todo失败",
        variant: "destructive",
      })
    }
  }

  const handleDeleteTodo = async (todoId: string) => {
    try {
      // 调用后端API删除todo
      const result = await apiClient.deleteTodo(todoId)
      if (result.success) {
        // 在所有日期中查找并删除todo
        setTodosByDate(prev => {
          const newTodosByDate = { ...prev }
          for (const dateKey in newTodosByDate) {
            newTodosByDate[dateKey] = newTodosByDate[dateKey].filter(todo => todo.id !== todoId)
          }
          return newTodosByDate
        })
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
    // 不再拦截回车键，允许多行输入
    // 只有当按下Ctrl+Enter或Command+Enter时才提交
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

  // 处理笔记转换为Todo
  const handleConvertToTodo = async (note: Note) => {
    try {
      // 创建todo
      const todoResult = await apiClient.createTodo({
        text: note.content,
        tags: note.tags,
        priority: 'medium'
      })
      
      if (todoResult.success) {
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
      loadNotes().then(() => {
        // 页面加载完成后自动滚动到最新笔记
        setTimeout(() => {
          // 查找最新的笔记元素
          const noteElements = document.querySelectorAll('[id^="note-"]')
          if (noteElements.length > 0) {
            const lastNote = noteElements[noteElements.length - 1]
            lastNote.scrollIntoView({ behavior: 'smooth', block: 'center' })
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
    }
  }, [isLoggedIn, isCheckingAuth])

  // 加载todo数据
  const loadTodosData = async () => {
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
      console.error('加载todos失败:', error)
    }
  }


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
             {/* 左侧：土豆笔记标题和搜索框 */}
             <div className="flex items-center gap-4 flex-1">
               <h1 className="text-xl font-bold whitespace-nowrap">土豆笔记</h1>
               <div className="flex-1 max-w-md">
                 <SearchBar onSearch={handleSearch} onClearSearch={handleClearSearch} searchTerm={searchTerm} />
               </div>
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
               <UserNav onLogout={handleLogout} />
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
            {/* 记事本区域 (3/4宽度) */}
            <div className="w-full md:w-3/4 flex flex-col border-r bg-background">
              {/* 当点击标签时，显示左右布局 */}
              {currentTag ? (
                <div className="flex-1 flex overflow-hidden">
                  {/* 左侧：固定的标签内容区域 */}
                  <div className="w-2/3 border-r bg-background flex-shrink-0">
                    <div className="p-4 h-full overflow-y-auto">
                      <TagContent tag={currentTag} />
                    </div>
                  </div>
                  
                  {/* 右侧：可滚动的有日期笔记区域 */}
                  <div className="flex-1 flex flex-col">
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
                              />
                            ))}
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
                          />
                        ))}
                      </div>
                    ) : (
                      <div className="h-full flex items-center justify-center text-muted-foreground">
                        {searchTerm ? "没有找到匹配的笔记" : "暂无笔记，开始添加吧"}
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {/* 固定在笔记区域底部的输入区域 */}
              <div className="flex-shrink-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-t p-4 shadow-lg">
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
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Info className="h-3 w-3" />
                    <span>使用 #标签 创建标签（支持中英文）</span>
                  </div>
                </div>
                <div className="flex flex-col space-y-2">
                  <Textarea
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={inputMode === 'note' ? "输入新笔记... (支持Markdown格式，使用 #学习 #工作 等标签)" : "输入新Todo... (使用 #标签)"}
                    className="flex-1 min-h-[120px] resize-none font-mono text-sm"
                    disabled={isAdding}
                  />
                  
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
                  
                  <div className="flex justify-end">
                    <Button onClick={handleAddNote} disabled={isAdding || (!inputValue.trim() && (inputMode === 'note' && !selectedImage))}>
                      {isAdding ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          {inputMode === 'todo' ? 'Todo添加中' : '保存中'}
                        </>
                      ) : (
                        inputMode === 'todo' ? '添加Todo' : '添加笔记'
                      )}
                    </Button>
                  </div>
                                </div>
                              </div>
                </div>

            {/* 日历和Todo区域 (1/4宽度) - 日历固定，Todo列表独立滚动 */}
            <div className="hidden md:flex md:flex-col w-1/4 bg-background">
              {/* 日历区域 - 固定不滚动 */}
              <div className="p-4 border-b">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={handleDateSelect}
                  className="rounded-md border"
                />
              </div>
              
              {/* Todo列表区域 - 独立滚动 */}
              <div className="flex-1 overflow-hidden">
                <TodoList 
                  selectedDate={date} 
                  todosByDate={todosByDate}
                  onToggleTodo={handleToggleTodo}
                  onUpdateTodo={handleUpdateTodo}
                  onDeleteTodo={handleDeleteTodo}
                />
              </div>
            </div>
              </div>
        </div>
      </main>
    </div>
  )
}
