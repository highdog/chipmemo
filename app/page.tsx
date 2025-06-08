"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useTheme } from "next-themes"
import { Calendar } from "@/components/ui/calendar"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Image, Loader2, Info, Search, X, Trash2, CheckSquare, Tag, CheckCircle2, CheckCircle, Circle, Home, Sun, Moon, Plus } from "lucide-react"
// 由于NoteGroup组件已在本文件中定义,移除此导入
// 由于组件已在本文件中定义,移除重复导入
// 由于TodoList组件已在本文件中定义,移除此导入
import { TagContent } from "@/components/tag-content"
import { UserNav } from "@/components/user-nav"
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

// NoteItem Component
function NoteItem({
  note,
  onDelete,
  searchTerm,
  onTagClick,
}: {
  note: Note
  onDelete: () => void
  searchTerm?: string
  onTagClick: (tag: string) => void
}) {
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      const result = await deleteNote(note.id)
      if (result.success) {
        onDelete()
        toast({
          title: "删除成功",
          description: "笔记已删除",
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
        title: "删除失败",
        description: "网络错误，请重试",
        variant: "destructive",
      })
    } finally {
      setIsDeleting(false)
    }
  }

  // 高亮搜索内容
  const highlightSearchTerm = (content: string) => {
    if (!searchTerm) return content

    // 移除搜索词前面的#号（如果有的话）
    const cleanSearchTerm = searchTerm.replace(/^#/, "")
    const regex = new RegExp(`(${cleanSearchTerm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi")
    return content.replace(regex, '<mark class="bg-yellow-200">$1</mark>')
  }



  return (
    <div className="p-3 border rounded-lg group hover:shadow-sm transition-shadow bg-card">
      <div className="flex justify-between items-start mb-2">
        {/* 左上角：时间和Todo徽章 */}
        <div className="flex items-center gap-2">
          <div className="text-sm font-medium text-muted-foreground">{formatTime(note.createdAt)}</div>

        </div>

        {/* 右上角：标签和删除按钮 */}
        <div className="flex items-center gap-2">
          {note.tags.length > 0 && (
            <div className="flex items-center gap-1">
              <Tag className="h-3 w-3 text-muted-foreground" />
              <div className="flex gap-1 flex-wrap">
                {note.tags.slice(0, 4).map((tag) => (
                  <Badge
                    key={tag}
                    variant="outline"
                    className="text-xs cursor-pointer hover:bg-blue-50 hover:border-blue-300 transition-colors"
                    onClick={() => onTagClick(tag)}
                    title={`点击搜索 #${tag} 标签`}
                  >
                    #{tag}
                  </Badge>
                    ))}
                {note.tags.length > 4 && (
                  <Badge variant="outline" className="text-xs">
                    +{note.tags.length - 4}
                  </Badge>
                    )}
                              </div>
                </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDelete}
            disabled={isDeleting}
            className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>
      <div className="whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: highlightSearchTerm(note.content) }} />
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
}: {
  date: string
  notes: Note[]
  onDelete: () => void
  searchTerm?: string
  onTagClick: (tag: string) => void
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
          <NoteItem key={note.id} note={note} onDelete={onDelete} searchTerm={searchTerm} onTagClick={onTagClick} />
        ))}
      </div>
    </div>
  )
}

// TodoList Component
function TodoList({ 
  selectedDate, 
  todosByDate, 
  onToggleTodo 
}: { 
  selectedDate: Date;
  todosByDate: Record<string, Array<{ 
    id: string; 
    content: string; 
    completed: boolean;
    tags: string[];
    dueDate?: string;
  }>>;
  onToggleTodo: (todoId: string) => void;
}) {
  const [isLoading, setIsLoading] = useState(false)

  const dateKey = selectedDate.toDateString()
  // 获取当前日期的todos，以及没有截止日期的todos
  const currentTodos = todosByDate[dateKey] || []
  const allTodosWithoutDueDate = Object.values(todosByDate)
    .flat()
    .filter(todo => !todo.dueDate)
    .filter((todo, index, self) => 
      self.findIndex(t => t.content === todo.content && t.tags.join(',') === todo.tags.join(',')) === index
    )
  
  const displayTodos = [...currentTodos, ...allTodosWithoutDueDate.filter(todo => 
    !currentTodos.some(ct => ct.id === todo.id)
  )]

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

  useEffect(() => {
    loadTodos()
  }, [selectedDate])

  const completedCount = displayTodos.filter(todo => todo.completed).length
  const totalCount = displayTodos.length

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-medium text-sm">Todo 列表</h3>
        <div className="text-xs text-muted-foreground">
          {completedCount}/{totalCount}
        </div>
      </div>

      <div className="text-xs text-muted-foreground mb-2">{formatDateShort(selectedDate)}</div>

      {isLoading ? (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
          <span className="text-sm">加载中...</span>
        </div>
      ) : displayTodos.length > 0 ? (
        <ScrollArea className="h-48">
          <div className="space-y-2">
            {displayTodos.map((todo) => (
              <div
                key={todo.id}
                className="flex items-start space-x-2 p-2 rounded border bg-card hover:bg-accent/50 transition-colors"
              >
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
                </div>
                {/* 显示截止日期，不需要日历图标 */}
                {todo.dueDate && (
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {new Date(todo.dueDate).toLocaleDateString('zh-CN')}
                  </div>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
      ) : (
        <div className="text-center py-4 text-sm text-muted-foreground">
          暂无Todo事项
        </div>
      )}

      {totalCount > 0 && (
        <div className="mt-3 pt-2 border-t">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>进度</span>
            <span>{Math.round((completedCount / totalCount) * 100)}%</span>
          </div>
          <div className="w-full bg-muted rounded-full h-1.5 mt-1">
            <div
              className="bg-primary h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${(completedCount / totalCount) * 100}%` }}
            />
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
  const [inputValue, setInputValue] = useState("")
  const [date, setDate] = useState<Date>(new Date())
  const [isLoading, setIsLoading] = useState(true)
  const [isAdding, setIsAdding] = useState(false)
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)
  const [inputMode, setInputMode] = useState<'note' | 'todo'>('note')
  const [todoDueDate, setTodoDueDate] = useState('')
  const [todosByDate, setTodosByDate] = useState<Record<string, Array<{ 
    id: string; 
    content: string; 
    completed: boolean;
    tags: string[];
    dueDate?: string;
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
      toast({
        title: "已跳转",
        description: `跳转到 ${formatDateOnly(dateKey)} 的笔记`,
      })
    } else {
      toast({
        title: "未找到笔记",
        description: `${formatDateOnly(dateKey)} 没有笔记`,
        variant: "destructive",
      })
    }
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
      const searchResults = await searchNotes(term)
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
      setSelectedImage(event.target?.result as string)
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
          dueDate: todoDueDate || undefined
        }
        
        // 如果没有截止日期，添加到所有日期；否则只添加到截止日期
        const targetDate = todoDueDate ? new Date(todoDueDate) : date
        const dateKey = targetDate.toDateString()
        
        setTodosByDate(prev => ({
          ...prev,
          [dateKey]: [...(prev[dateKey] || []), newTodo]
        }))
        
        // 如果没有截止日期，也添加到当前选中日期（如果不同）
        if (!todoDueDate && date.toDateString() !== dateKey) {
          const currentDateKey = date.toDateString()
          setTodosByDate(prev => ({
            ...prev,
            [currentDateKey]: [...(prev[currentDateKey] || []), { ...newTodo, id: (Date.now() + 1).toString() }]
          }))
        }
        
        setInputValue('')
        setTodoDueDate('')
        
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
    // 找到要完成的todo
    let completedTodo = null
    let todoDateKey = null
    
    Object.keys(todosByDate).forEach(dateKey => {
      const todo = todosByDate[dateKey].find(t => t.id === todoId)
      if (todo) {
        completedTodo = todo
        todoDateKey = dateKey
      }
    })
    
    if (!completedTodo) return
    
    try {
      // 创建笔记内容
      let noteContent = completedTodo.content
      if (completedTodo.tags.length > 0) {
        noteContent += ' ' + completedTodo.tags.map(tag => `#${tag}`).join(' ')
      }
      
      // 调用API创建笔记
      const result = await addNote(noteContent, new Date().toISOString())
      
      if (result.success) {
        // 删除todo
        setTodosByDate(prev => {
          const newTodosByDate = { ...prev }
          Object.keys(newTodosByDate).forEach(dateKey => {
            newTodosByDate[dateKey] = newTodosByDate[dateKey].filter(todo => todo.id !== todoId)
          })
          return newTodosByDate
        })
        
        // 重新加载笔记
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
          description: "创建笔记失败",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "错误",
        description: "操作失败，请重试",
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

  // 检查用户登录状态
  useEffect(() => {
    const checkAuth = () => {
      const userId = localStorage.getItem("userId")
      if (!userId) {
        // 用户未登录，重定向到登录页面
        router.push("/login")
        return
      }
      setIsLoggedIn(true)
      setIsCheckingAuth(false)
    }

    checkAuth()
  }, [router])

  // 处理用户登出
  const handleLogout = () => {
    localStorage.removeItem("userId")
    setIsLoggedIn(false)
    router.push("/login")
  }

  // 组件加载时获取笔记（仅在已登录时）
  useEffect(() => {
    if (isLoggedIn && !isCheckingAuth) {
      loadNotes()
    }
  }, [isLoggedIn, isCheckingAuth])


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
        <div className="container mx-auto py-3 px-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-bold">笔记应用</h1>
              </div>
          <UserNav onLogout={handleLogout} />
        </div>
      </header>
      
      {/* 搜索栏区域 - 固定在顶部 */}
      <div className="flex-shrink-0 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto p-4 max-w-7xl">
          <div className="flex justify-between items-center gap-4">
            {/* 搜索框移到左侧原标题位置 */}
            <div className="flex-1">
              <SearchBar onSearch={handleSearch} onClearSearch={handleClearSearch} searchTerm={searchTerm} />
                </div>

            {/* 明暗主题切换按钮 */}
            <Button variant="outline" size="sm" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
              {theme === 'dark' ? (
                <Sun className="h-4 w-4 mr-2" />
                  ) : (
                <Moon className="h-4 w-4 mr-2" />
                  )}
              {theme === 'dark' ? '浅色' : '深色'}
            </Button>
              </div>

          {/* 搜索状态提示 */}
          {searchTerm && (
            <div className="mt-2 text-sm text-muted-foreground">
              搜索结果: "{searchTerm}" ({notes.length} 条笔记)
                </div>
          )}
        </div>
      </div>

      <main className="flex-1 flex overflow-hidden">
        <div className="container mx-auto max-w-7xl flex-1 flex flex-col">
          <div className="flex flex-1 overflow-hidden">
            {/* 记事本区域 (3/4宽度) */}
            <div className="w-full md:w-3/4 flex flex-col border-r bg-background">
              {/* 标签内容区域 - 仅在标签搜索时显示 */}
              {currentTag && (
                <div className="border-b p-4 flex-shrink-0">
                  <TagContent tag={currentTag} />
                </div>
              )}
              
              {/* 笔记显示区域 - 占满剩余空间并可滚动 */}
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
              
              {/* 固定在笔记区域底部的输入区域 */}
              <div className="flex-shrink-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-t p-4 shadow-lg">
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Info className="h-3 w-3" />
                    <span>使用 #标签 创建标签（支持中英文）</span>
                  </div>
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
                </div>
                <div className="flex flex-col space-y-2">
                  <Textarea
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={inputMode === 'note' ? "输入新笔记... (使用 #学习 #工作 等)" : "输入新Todo... (使用 #标签)"}
                    className="flex-1 min-h-[80px] resize-none"
                    disabled={isAdding}
                  />
                  
                  {/* Todo模式下显示截止日期输入框 */}
                  {inputMode === 'todo' && (
                    <Input
                      type="date"
                      value={todoDueDate}
                      onChange={(e) => setTodoDueDate(e.target.value)}
                      placeholder="截止日期 (可选)"
                      className="text-sm"
                      disabled={isAdding}
                    />
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

            {/* 日历和Todo区域 (1/4宽度) - 确保其独立滚动 */}
            <div className="hidden md:flex md:flex-col w-1/4 bg-background">
              <div className="flex-1 overflow-y-auto">
                <div className="p-4">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={handleDateSelect}
                    className="rounded-md border"
                  />

                  {/* Todo列表 */}
                  <TodoList 
                    selectedDate={date} 
                    todosByDate={todosByDate}
                    onToggleTodo={handleToggleTodo}
                  />
                </div>
              </div>
            </div>
              </div>
        </div>
      </main>
    </div>
  )
}
