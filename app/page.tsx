"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Calendar } from "@/components/ui/calendar"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Loader2, RefreshCw, Info, Search, X, Trash2, CheckSquare, Tag, CheckCircle2, Circle, Home } from "lucide-react"
import { NoteGroup } from "@/components/note-group"
import { SearchBar } from "@/components/search-bar"
import { TodoList } from "@/components/todo-list"
import { TagContent } from "@/components/tag-content"
import {
  getNotes,
  addNote,
  searchNotes,
  searchNotesByTag,
  deleteNote,
  toggleTodo,
  getTodosByDate,
  type Note,
  type TodoItem,
} from "@/lib/actions"
import { formatDateShort, getDateKey, formatTime, formatDateOnly } from "@/lib/utils"
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
      handleAddNote()
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

  const todoCount = note.todos?.length || 0
  const completedTodos = note.todos?.filter((todo) => todo.completed).length || 0

  return (
    <div className="p-3 border rounded-lg group hover:shadow-sm transition-shadow bg-white">
      <div className="flex justify-between items-start mb-2">
        {/* 左上角：时间和Todo徽章 */}
        <div className="flex items-center gap-2">
          <div className="text-sm font-medium text-muted-foreground">{formatTime(note.createdAt)}</div>
          {todoCount > 0 && (
            <Badge variant="secondary" className="text-xs">
              <CheckSquare className="h-3 w-3 mr-1" />
              {completedTodos}/{todoCount}
            </Badge>
          )}
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
    <div className="mb-6">
      {/* 日期标题 */}
      <div className="flex items-center mb-3">
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
function TodoList({ selectedDate }: { selectedDate: Date }) {
  const [todos, setTodos] = useState<{ noteId: string; todo: TodoItem }[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const loadTodos = async () => {
    setIsLoading(true)
    try {
      const todosByNote = await getTodosByDate(selectedDate.toISOString())
      const allTodos: { noteId: string; todo: TodoItem }[] = []

      todosByNote.forEach(({ noteId, todos }) => {
        todos.forEach((todo) => {
          allTodos.push({ noteId, todo })
        })
      })

      setTodos(allTodos)
    } catch (error) {
      toast({
        title: "加载失败",
        description: "无法加载Todo列表",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleToggleTodo = async (noteId: string, todoId: string) => {
    try {
      const result = await toggleTodo(noteId, todoId)
      if (result.success) {
        // 更新本地状态
        setTodos((prevTodos) =>
          prevTodos.map((item) =>
            item.todo.id === todoId ? { ...item, todo: { ...item.todo, completed: !item.todo.completed } } : item,
          ),
        )
      } else {
        toast({
          title: "更新失败",
          description: result.error || "未知错误",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "更新失败",
        description: "网络错误，请重试",
        variant: "destructive",
      })
    }
  }

  useEffect(() => {
    loadTodos()
  }, [selectedDate])

  const completedCount = todos.filter((item) => item.todo.completed).length
  const totalCount = todos.length

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
      ) : todos.length > 0 ? (
        <ScrollArea className="h-48">
          <div className="space-y-2">
            {todos.map((item) => (
              <div
                key={`${item.noteId}-${item.todo.id}`}
                className="flex items-start space-x-2 p-2 rounded-md hover:bg-muted/50 transition-colors"
              >
                <Checkbox
                  id={item.todo.id}
                  checked={item.todo.completed}
                  onCheckedChange={() => handleToggleTodo(item.noteId, item.todo.id)}
                  className="mt-0.5"
                />
                <label
                  htmlFor={item.todo.id}
                  className={`text-sm flex-1 cursor-pointer ${
                    item.todo.completed ? "line-through text-muted-foreground" : "text-foreground"
                  }`}
                >
                  {item.todo.content}
                </label>
                {item.todo.completed ? (
                  <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5" />
                ) : (
                  <Circle className="h-4 w-4 text-muted-foreground mt-0.5" />
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
      ) : (
        <div className="text-center py-4 text-sm text-muted-foreground">
          当前日期没有Todo项
          <div className="text-xs mt-1">在笔记中使用 #todo 标签来创建Todo</div>
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
  const [notes, setNotes] = useState<Note[]>([])
  const [inputValue, setInputValue] = useState("")
  const [date, setDate] = useState<Date>(new Date())
  const [isLoading, setIsLoading] = useState(true)
  const [isAdding, setIsAdding] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [isSearching, setIsSearching] = useState(false)
  const [currentTag, setCurrentTag] = useState<string>("") // 当前搜索的标签

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
  const refreshNotes = async () => {
    setIsRefreshing(true)
    try {
      const fetchedNotes = searchTerm ? await searchNotes(searchTerm) : await getNotes()
      setNotes(fetchedNotes)
      toast({
        title: "刷新成功",
        description: "笔记已更新",
      })
    } catch (error) {
      toast({
        title: "刷新失败",
        description: "无法刷新笔记",
        variant: "destructive",
      })
    } finally {
      setIsRefreshing(false)
    }
  }

  // 添加笔记
  const handleAddNote = async () => {
    if (!inputValue.trim()) return

    setIsAdding(true)
    try {
      const result = await addNote(inputValue, date.toISOString())
      if (result.success) {
        setInputValue("")
        // 如果有搜索词，重新搜索；否则重新加载
        if (searchTerm) {
          await handleSearch(searchTerm)
        } else {
          await loadNotes()
        }
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
    } catch (error) {
      toast({
        title: "添加失败",
        description: "网络错误，请重试",
        variant: "destructive",
      })
    } finally {
      setIsAdding(false)
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

  // 初始加载
  useEffect(() => {
    loadNotes()
  }, [])

  const totalTodos = notes.reduce((acc, note) => acc + (note.todos?.length || 0), 0)
  const groupedNotes = groupNotesByDate(notes)

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <header className="border-b p-4">
        <div className="flex justify-between items-center gap-4">
          <h1 className="text-2xl font-bold">网页记事本</h1>

          {/* 搜索框 */}
          <div className="flex-1 flex justify-center">
            <SearchBar onSearch={handleSearch} onClearSearch={handleClearSearch} searchTerm={searchTerm} />
          </div>

          <Button variant="outline" size="sm" onClick={refreshNotes} disabled={isRefreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
            刷新
          </Button>
        </div>

        {/* 搜索状态提示 */}
        {searchTerm && (
          <div className="mt-2 text-sm text-muted-foreground">
            搜索结果: "{searchTerm}" ({notes.length} 条笔记)
          </div>
        )}
      </header>

      <main className="flex flex-1 overflow-hidden">
        {/* 记事本区域 (3/4宽度) */}
        <div className="w-full md:w-3/4 flex flex-col border-r">
          {/* 标签内容区域 - 仅在标签搜索时显示 */}
          {currentTag && (
            <div className="border-b p-4">
              <TagContent tag={currentTag} />
            </div>
          )}
          
          {/* 笔记显示区域 */}
          <ScrollArea className="flex-1 p-4">
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
          </ScrollArea>

          {/* 输入区域 */}
          <div className="p-4 border-t">
            <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
              <Info className="h-3 w-3" />
              <span>使用 #标签 创建标签，#todo 创建待办事项（支持中英文）</span>
            </div>
            <div className="flex gap-2">
              <Textarea
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="输入新笔记... (使用 #学习 #工作 #todo 等)"
                className="flex-1 min-h-[80px] resize-none"
                disabled={isAdding}
              />
              <Button onClick={handleAddNote} disabled={isAdding || !inputValue.trim()}>
                {isAdding ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    保存中
                  </>
                ) : (
                  "添加"
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* 日历和Todo区域 (1/4宽度) */}
        <div className="hidden md:block w-1/4 p-4">
          <Calendar
            mode="single"
            selected={date}
            onSelect={(date) => date && setDate(date)}
            className="rounded-md border"
          />
          <div className="mt-4 text-center">
            <p className="font-medium">已选择日期: {formatDateShort(date)}</p>
            <p className="text-sm text-muted-foreground mt-1">添加的笔记将使用此日期</p>
          </div>

          <div className="mt-4 p-3 bg-muted rounded-lg">
            <p className="text-sm font-medium mb-1">统计信息</p>
            <p className="text-sm text-muted-foreground">总笔记数: {notes.length}</p>
            <p className="text-sm text-muted-foreground">总Todo数: {totalTodos}</p>
            <p className="text-sm text-muted-foreground">日期分组: {groupedNotes.length}</p>
          </div>

          {/* Todo列表 */}
          <TodoList selectedDate={date} />
        </div>
      </main>

      <Toaster />
    </div>
  )
}
