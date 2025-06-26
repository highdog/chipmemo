"use client"

import React, { useState, useEffect, useCallback, useMemo } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Calendar } from "@/components/ui/calendar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { 
  Home, 
  FileText, 
  Calendar as CalendarIcon, 
  CheckSquare, 
  Target, 
  User,
  Plus,
  Search,
  Edit,
  Trash2,
  Check,
  X,
  Clock,
  Sun,
  Moon
} from "lucide-react"
import { 
  addNote,
  getNotes,
  deleteNote,
  searchNotes,
  type Note
} from "@/lib/actions"
import { 
  notesApi, 
  schedulesApi, 
  todosApi, 
  tagContentsApi,
  type Todo as ApiTodo 
} from "@/lib/api"
import { formatDateShort, getDateKey, formatTime, formatDateOnly, cn, extractTags } from "@/lib/utils"
import { toast } from "@/hooks/use-toast"
import { Toaster } from "@/components/ui/toaster"

// 类型定义
interface Schedule {
  _id: string;
  title: string;
  time: string;
  date: string;
  description?: string;
  type?: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

interface Todo {
  _id: string;
  text: string;
  completed: boolean;
  priority: 'low' | 'medium' | 'high';
  dueDate?: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
  id?: string;
  content?: string;
  tags?: string[];
  startDate?: string;
}

interface TagContent {
  _id: string;
  tag: string;
  content: string;
  isGoalEnabled?: boolean;
  targetCount?: number;
  currentCount?: number;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export default function MobilePage() {
  const { user, logout, loading } = useAuth()
  const { theme, setTheme } = useTheme()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState("notes")
  
  // 控制输入区域显示状态
  const [showNoteInput, setShowNoteInput] = useState(false)
  const [showScheduleInput, setShowScheduleInput] = useState(false)
  const [showGoalInput, setShowGoalInput] = useState(false)
  
  // 笔记相关状态
  const [notes, setNotes] = useState<Note[]>([])
  const [newNote, setNewNote] = useState("")
  const [isAddingNote, setIsAddingNote] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  
  // 日程相关状态
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [newSchedule, setNewSchedule] = useState({ title: "", time: "", description: "" })
  const [isAddingSchedule, setIsAddingSchedule] = useState(false)
  
  // Todo相关状态
  const [todos, setTodos] = useState<Todo[]>([])
  const [newTodo, setNewTodo] = useState("")
  const [newTodoPriority, setNewTodoPriority] = useState<'low' | 'medium' | 'high'>('medium')
  const [isAddingTodo, setIsAddingTodo] = useState(false)
  
  // 目标相关状态
  const [goals, setGoals] = useState<TagContent[]>([])
  const [newGoal, setNewGoal] = useState({ tag: "", content: "", targetCount: 0 })
  const [isAddingGoal, setIsAddingGoal] = useState(false)
  
  // 待办事项标签筛选
  const [selectedTodoTag, setSelectedTodoTag] = useState<string>('All')

  // 加载数据 - 所有 useCallback 必须在条件返回之前
  const loadNotes = useCallback(async () => {
    try {
      const response = await getNotes(1, 50)
      setNotes(response.notes || [])
    } catch (error) {
      console.error('Error loading notes:', error)
      toast({ title: "加载笔记失败", variant: "destructive" })
    }
  }, [])

  const loadSchedules = useCallback(async () => {
    try {
      const response = await schedulesApi.getAll()
      // 转换数据格式以匹配Schedule类型
      const schedulesData = Array.isArray(response.data) ? response.data : 
        (response.data && typeof response.data === 'object' ? Object.values(response.data).flat() : [])
      const schedules = schedulesData.map((item: any) => ({
        _id: item._id || item.id,
        id: item.id,
        title: item.title,
        time: item.time,
        description: item.description,
        type: item.type,
        date: item.date || new Date().toISOString().split('T')[0],
        userId: item.userId || user?.id || '',
        createdAt: item.createdAt || new Date().toISOString(),
        updatedAt: item.updatedAt || new Date().toISOString()
      }))
      setSchedules(schedules)
    } catch (error) {
      console.error('Error loading schedules:', error)
      toast({ title: "加载日程失败", variant: "destructive" })
    }
  }, [user])

  const loadTodos = useCallback(async () => {
    try {
      const response = await todosApi.getAll()
      // 处理不同的响应格式并确保类型匹配
      const todosData = Array.isArray(response.data) ? response.data : response.data?.todos || []
      const todos = todosData.map((item: any) => ({
        ...item,
        createdAt: item.createdAt || new Date().toISOString(),
        updatedAt: item.updatedAt || new Date().toISOString()
      }))
      setTodos(todos)
    } catch (error) {
      console.error('Error loading todos:', error)
      toast({ title: "加载待办失败", variant: "destructive" })
    }
  }, [])

  const loadGoals = useCallback(async () => {
    try {
      const response = await tagContentsApi.getAll()
      // 处理API返回的数据结构，确保类型匹配
      const allTags = response.data || []
      const goalData = allTags.filter((item: any) => item.isGoalEnabled)
      setGoals(goalData as TagContent[])
    } catch (error) {
      console.error('Error loading goals:', error)
      toast({ title: "加载目标失败", variant: "destructive" })
    }
  }, [])

  // 检查用户认证
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])

  useEffect(() => {
    if (user) {
      loadNotes()
      loadSchedules()
      loadTodos()
      loadGoals()
    }
  }, [user, loadNotes, loadSchedules, loadTodos, loadGoals])

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

  // 过滤和计算数据 - 所有 useMemo 必须在条件返回之前
  const filteredNotes = useMemo(() => {
    if (!searchTerm) return notes
    return notes.filter(note => 
      note.content.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [notes, searchTerm])

  const groupedNotes = useMemo(() => groupNotesByDate(filteredNotes), [filteredNotes])

  // 获取所有待办事项标签
  const allTodoTags = useMemo(() => {
    const tags = new Set<string>()
    todos.forEach(todo => {
      if (todo.tags && Array.isArray(todo.tags)) {
        todo.tags.forEach(tag => tags.add(tag))
      }
    })
    return Array.from(tags).sort()
  }, [todos])
  
  // 筛选待办事项
  const filteredTodos = useMemo(() => {
    if (selectedTodoTag === 'All') {
      return todos
    }
    return todos.filter(todo => 
      todo.tags && Array.isArray(todo.tags) && todo.tags.includes(selectedTodoTag)
    )
  }, [todos, selectedTodoTag])

  const upcomingSchedules = useMemo(() => {
    const today = new Date()
    const todayStr = today.toISOString().split('T')[0]
    
    return schedules
      .filter(schedule => schedule.date >= todayStr) // 只显示今天及以后的日程
      .map(schedule => {
        const scheduleDate = new Date(schedule.date)
        const diffTime = scheduleDate.getTime() - today.getTime()
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
        
        let displayDate: string
        if (diffDays === 0) {
          displayDate = '今天'
        } else if (diffDays === 1) {
          displayDate = '明天'
        } else {
          displayDate = `还剩${diffDays}天`
        }
        
        return {
          ...schedule,
          daysLeft: diffDays,
          displayDate,
          isToday: diffDays === 0
        }
      })
      .sort((a, b) => {
        // 今天的日程优先
        if (a.isToday && !b.isToday) return -1
        if (!a.isToday && b.isToday) return 1
        
        // 按剩余天数排序
        if (a.daysLeft !== b.daysLeft) {
          return a.daysLeft - b.daysLeft
        }
        
        // 剩余天数相同，按时间排序
        return a.time.localeCompare(b.time)
      })
  }, [schedules])

  const pendingTodos = useMemo(() => {
    return todos.filter(todo => !todo.completed)
  }, [todos])

  // 如果正在加载认证状态，显示加载界面
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">加载中...</p>
        </div>
      </div>
    )
  }

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

  // 添加日程
  const handleAddSchedule = async () => {
    if (!newSchedule.title.trim() || !newSchedule.time.trim()) return
    
    setIsAddingSchedule(true)
    try {
      await schedulesApi.create({
        title: newSchedule.title,
        time: newSchedule.time,
        date: selectedDate.toISOString().split('T')[0],
        description: newSchedule.description
      })
      setNewSchedule({ title: "", time: "", description: "" })
      setShowScheduleInput(false)
      await loadSchedules()
      toast({ title: "日程添加成功" })
    } catch (error) {
      console.error('Error adding schedule:', error)
      toast({ title: "添加日程失败", variant: "destructive" })
    } finally {
      setIsAddingSchedule(false)
    }
  }

  // 添加Todo
  const handleAddTodo = async () => {
    if (!newTodo.trim()) return
    
    setIsAddingTodo(true)
    try {
      await todosApi.create({
        text: newTodo,
        priority: newTodoPriority
      })
      setNewTodo("")
      setNewTodoPriority('medium')
      await loadTodos()
      toast({ title: "待办添加成功" })
    } catch (error) {
      console.error('Error adding todo:', error)
      toast({ title: "添加待办失败", variant: "destructive" })
    } finally {
      setIsAddingTodo(false)
    }
  }

  // 切换Todo状态 - 删除待办事项并添加笔记
  const handleToggleTodo = async (todoId: string) => {
    try {
      const todo = todos.find(t => t._id === todoId)
      if (!todo) return
      
      // 如果todo从未完成变为完成，则删除todo并创建笔记
      if (!todo.completed) {
        // 创建笔记内容，包含原todo的内容和标签
        const noteContent = todo.text + (todo.tags && todo.tags.length > 0 ? ' ' + todo.tags.map((tag: string) => `#${tag}`).join(' ') : '')
        
        // 调用addNote API创建新笔记
        const result = await addNote(noteContent, new Date().toISOString())
        if (result.success) {
          // 创建笔记成功后，删除待办事项
          await todosApi.delete(todoId)
          // 重新加载todos数据
          await loadTodos()
          toast({ title: "Todo已完成并转换为笔记" })
        } else {
          toast({ title: "创建笔记失败", variant: "destructive" })
        }
      } else {
        // 如果是从完成变为未完成，调用更新API
        await todosApi.update(todoId, { completed: !todo.completed })
        await loadTodos()
        toast({ title: "标记为未完成" })
      }
    } catch (error) {
      console.error('Error toggling todo:', error)
      toast({ title: "操作失败", variant: "destructive" })
    }
  }

  // 添加目标
  const handleAddGoal = async () => {
    if (!newGoal.tag.trim() || !newGoal.content.trim() || newGoal.targetCount <= 0) return
    
    setIsAddingGoal(true)
    try {
      await tagContentsApi.save(newGoal.tag, newGoal.content, {
        isGoalEnabled: true,
        targetCount: newGoal.targetCount,
        currentCount: 0
      })
      setNewGoal({ tag: "", content: "", targetCount: 0 })
      setShowGoalInput(false)
      await loadGoals()
      toast({ title: "目标添加成功" })
    } catch (error) {
      console.error('Error adding goal:', error)
      toast({ title: "添加目标失败", variant: "destructive" })
    } finally {
      setIsAddingGoal(false)
    }
  }





  if (!user) {
    return <div className="flex items-center justify-center min-h-screen">加载中...</div>
  }

  // 获取当前tab的标题
  const getTabTitle = () => {
    switch (activeTab) {
      case 'notes': return '笔记'
      case 'schedule': return '日程'
      case 'todo': return '待办'
      case 'goals': return '目标'
      case 'profile': return '我的'
      default: return '笔记本'
    }
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* 主内容区域 */}
      <div className="flex-1 overflow-hidden">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
          {/* Tab内容 */}
          <div className="flex-1 overflow-hidden">
            {/* 笔记Tab */}
            <TabsContent value="notes" className="h-full m-0 p-4 overflow-y-auto">
              <div className="space-y-4">
                {/* 顶部操作栏 */}
                <div className="flex items-center gap-3">
                  {/* 搜索框 */}
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="搜索笔记..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  {/* 添加按钮 */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowNoteInput(!showNoteInput)}
                    className="shrink-0"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>

                {/* 添加笔记输入区域 */}
                {showNoteInput && (
                  <Card>
                    <CardContent className="p-4">
                      <Textarea
                        placeholder="写下你的想法..."
                        value={newNote}
                        onChange={(e) => setNewNote(e.target.value)}
                        className="min-h-[100px] mb-3"
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

                {/* 按日期分组的笔记列表 */}
                <div className="space-y-6">
                  {groupedNotes.map(([dateKey, groupNotes]) => (
                    <div key={dateKey} className="space-y-3">
                      {/* 日期标题 */}
                      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border/40 flex items-center py-2">
                        <h3 className="text-lg font-semibold text-foreground">{formatDateOnly(dateKey)}</h3>
                        <div className="ml-3 text-sm text-muted-foreground">{groupNotes.length} 条笔记</div>
                      </div>
                      
                      {/* 该日期下的所有笔记 */}
                      <div className="space-y-3 ml-2">
                        {groupNotes.map((note) => (
                          <div key={note.id} className="border-b border-border/50 pb-3 last:border-b-0">
                            {/* 笔记头部：时间和标签 */}
                            <div className="flex items-start justify-between mb-2">
                              <div className="text-xs text-muted-foreground">
                                {formatTime(new Date(note.createdAt))}
                              </div>
                              {note.tags && note.tags.length > 0 && (
                                <div className="flex items-center gap-1 ml-2">
                                  <div className="flex gap-1 flex-wrap">
                                    {note.tags.slice(0, 3).map((tag, index) => (
                                      <Badge key={index} variant="outline" className="text-xs cursor-pointer hover:bg-muted">
                                        #{tag}
                                      </Badge>
                                    ))}
                                    {note.tags.length > 3 && (
                                      <Badge variant="outline" className="text-xs">
                                        +{note.tags.length - 3}
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                            
                            {/* 笔记内容 */}
                            <div className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                              {note.content}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>

            {/* 日程Tab */}
            <TabsContent value="schedule" className="h-full m-0 p-4 overflow-y-auto">
              <div className="space-y-4">
                {/* 顶部操作栏 */}
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-medium">选择日期</h2>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowScheduleInput(!showScheduleInput)}
                    className="shrink-0"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>

                {/* 日历 */}
                <Card>
                  <CardContent className="p-4">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={(date) => date && setSelectedDate(date)}
                      className="rounded-md border"
                    />
                  </CardContent>
                </Card>

                {/* 添加日程输入区域 */}
                {showScheduleInput && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">添加日程</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <Input
                        placeholder="日程标题"
                        value={newSchedule.title}
                        onChange={(e) => setNewSchedule(prev => ({ ...prev, title: e.target.value }))}
                      />
                      <Input
                        type="time"
                        value={newSchedule.time}
                        onChange={(e) => setNewSchedule(prev => ({ ...prev, time: e.target.value }))}
                      />
                      <Textarea
                        placeholder="描述（可选）"
                        value={newSchedule.description}
                        onChange={(e) => setNewSchedule(prev => ({ ...prev, description: e.target.value }))}
                        className="min-h-[80px]"
                      />
                      <div className="flex gap-2">
                        <Button 
                          onClick={handleAddSchedule} 
                          disabled={isAddingSchedule || !newSchedule.title.trim() || !newSchedule.time.trim()}
                          className="flex-1"
                        >
                          {isAddingSchedule ? "添加中..." : "添加日程"}
                        </Button>
                        <Button 
                          variant="outline"
                          onClick={() => {
                            setShowScheduleInput(false)
                            setNewSchedule({ title: "", time: "", description: "" })
                          }}
                        >
                          取消
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* 即将到来的日程 */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">即将到来的日程</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {upcomingSchedules.length === 0 ? (
                      <div className="text-center text-muted-foreground py-4">
                        暂无即将到来的日程
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {upcomingSchedules.map((schedule) => (
                          <div key={schedule._id} className={cn(
                            "flex items-start gap-3 p-3 rounded-lg border",
                            schedule.isToday 
                              ? "bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800" 
                              : schedule.daysLeft <= 3 
                                ? "bg-orange-50 dark:bg-orange-950 border-orange-200 dark:border-orange-800"
                                : "bg-muted/30 border-border"
                          )}>
                            <Clock className="h-4 w-4 mt-1 text-muted-foreground" />
                            <div className="flex-1">
                              <div className="flex items-center justify-between mb-1">
                                <div className="font-medium">{schedule.title}</div>
                                <div className={cn(
                                  "text-xs px-2 py-1 rounded-full",
                                  schedule.isToday
                                    ? "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300"
                                    : schedule.daysLeft <= 3
                                      ? "bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300"
                                      : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
                                )}>
                                  {schedule.displayDate}
                                </div>
                              </div>
                              <div className="text-sm text-muted-foreground">{schedule.time}</div>
                              {schedule.description && (
                                <div className="text-sm text-muted-foreground mt-1">
                                  {schedule.description}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Todo Tab */}
            <TabsContent value="todo" className="h-full m-0 flex flex-col">
              {/* 固定的顶部区域 */}
              <div className="p-4 bg-background border-b space-y-4">
                {/* 顶部操作栏 */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-medium">待办事项</h2>
                    <span className="text-sm text-muted-foreground">({filteredTodos.filter(t => !t.completed).length})</span>
                  </div>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="shrink-0"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px]">
                      <DialogHeader>
                        <DialogTitle>添加待办事项</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 pt-4">
                        <div className="space-y-2">
                          <label className="text-sm font-medium">待办内容</label>
                          <Input
                            placeholder="输入待办事项..."
                            value={newTodo}
                            onChange={(e) => setNewTodo(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleAddTodo()}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">优先级</label>
                          <Select value={newTodoPriority} onValueChange={(value: 'low' | 'medium' | 'high') => setNewTodoPriority(value)}>
                            <SelectTrigger>
                              <SelectValue placeholder="选择优先级" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="low">低优先级</SelectItem>
                              <SelectItem value="medium">中优先级</SelectItem>
                              <SelectItem value="high">高优先级</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            onClick={handleAddTodo} 
                            disabled={isAddingTodo || !newTodo.trim()}
                            className="flex-1"
                          >
                            {isAddingTodo ? "添加中..." : "添加待办"}
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
                
                {/* 标签筛选区域 */}
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant={selectedTodoTag === 'All' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedTodoTag('All')}
                    className="h-8 text-xs"
                  >
                    All
                  </Button>
                  {allTodoTags.map((tag) => (
                    <Button
                      key={tag}
                      variant={selectedTodoTag === tag ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setSelectedTodoTag(tag)}
                      className="h-8 text-xs"
                    >
                      {tag}
                    </Button>
                  ))}
                </div>
              </div>

              {/* 可滚动的Todo列表区域 */}
              <div className="flex-1 overflow-y-auto p-4">
                <div className="space-y-3">
                  {filteredTodos.length === 0 ? (
                    <div className="text-center text-muted-foreground py-8">
                      {selectedTodoTag === 'All' ? '暂无待办事项' : `暂无标签为 "${selectedTodoTag}" 的待办事项`}
                    </div>
                  ) : (
                    filteredTodos.map((todo) => (
                      <div key={todo._id} className="flex items-start gap-3 p-3 bg-background rounded-lg border relative overflow-hidden">
                        {/* 左侧优先级颜色条 */}
                        <div className={cn(
                          "absolute left-0 top-0 bottom-0 w-1",
                          todo.priority === 'high' ? 'bg-red-500' : 
                          todo.priority === 'medium' ? 'bg-yellow-500' : 
                          'bg-green-500'
                        )} />
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleTodo(todo._id)}
                          className="p-0 h-auto ml-2"
                        >
                          {todo.completed ? (
                            <Check className="h-5 w-5 text-green-500" />
                          ) : (
                            <div className="h-5 w-5 border-2 border-muted-foreground rounded" />
                          )}
                        </Button>
                        
                        <div className="flex-1 min-w-0">
                          <div className={cn(
                            "text-sm leading-relaxed",
                            todo.completed ? "line-through text-muted-foreground" : "text-foreground"
                          )}>
                            {todo.text}
                          </div>
                          
                          {/* 标签显示 */}
                          {todo.tags && todo.tags.length > 0 && (
                            <div className="flex gap-1 mt-2 flex-wrap">
                              {todo.tags.slice(0, 2).map((tag, index) => (
                                <Badge key={index} variant="outline" className="text-xs px-1.5 py-0.5">
                                  {tag}
                                </Badge>
                              ))}
                              {todo.tags.length > 2 && (
                                <Badge variant="outline" className="text-xs px-1.5 py-0.5">
                                  +{todo.tags.length - 2}
                                </Badge>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </TabsContent>

            {/* 目标Tab */}
            <TabsContent value="goals" className="h-full m-0 p-4 overflow-y-auto">
              <div className="space-y-4">
                {/* 顶部操作栏 */}
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-medium">我的目标</h2>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowGoalInput(!showGoalInput)}
                    className="shrink-0"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>

                {/* 添加目标输入区域 */}
                {showGoalInput && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">添加目标</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <Input
                        placeholder="目标标签"
                        value={newGoal.tag}
                        onChange={(e) => setNewGoal(prev => ({ ...prev, tag: e.target.value }))}
                      />
                      <Textarea
                        placeholder="目标描述"
                        value={newGoal.content}
                        onChange={(e) => setNewGoal(prev => ({ ...prev, content: e.target.value }))}
                        className="min-h-[80px]"
                      />
                      <Input
                        type="number"
                        placeholder="目标数量"
                        value={newGoal.targetCount || ''}
                        onChange={(e) => setNewGoal(prev => ({ ...prev, targetCount: parseInt(e.target.value) || 0 }))}
                      />
                      <div className="flex gap-2">
                        <Button 
                          onClick={handleAddGoal} 
                          disabled={isAddingGoal || !newGoal.tag.trim() || !newGoal.content.trim() || newGoal.targetCount <= 0}
                          className="flex-1"
                        >
                          {isAddingGoal ? "添加中..." : "添加目标"}
                        </Button>
                        <Button 
                          variant="outline"
                          onClick={() => {
                            setShowGoalInput(false)
                            setNewGoal({ tag: "", content: "", targetCount: 0 })
                          }}
                        >
                          取消
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* 目标列表 */}
                <div className="space-y-3">
                  {goals.map((goal) => (
                    <Card key={goal._id}>
                      <CardContent className="p-4">
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <Badge variant="outline">#{goal.tag}</Badge>
                            <div className="text-sm text-muted-foreground">
                              {goal.currentCount || 0} / {goal.targetCount}
                            </div>
                          </div>
                          <div className="w-full bg-muted rounded-full h-2">
                            <div 
                              className="bg-primary h-2 rounded-full transition-all duration-300"
                              style={{ 
                                width: `${Math.min(((goal.currentCount || 0) / (goal.targetCount || 1)) * 100, 100)}%` 
                              }}
                            />
                          </div>
                          <div className="text-xs text-muted-foreground">
                            进度: {Math.round(((goal.currentCount || 0) / (goal.targetCount || 1)) * 100)}%
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </TabsContent>

            {/* 我的Tab */}
            <TabsContent value="profile" className="h-full m-0 p-4 overflow-y-auto">
              <div className="space-y-4">
                {/* 用户信息 */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">用户信息</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 bg-primary/10 rounded-full flex items-center justify-center">
                        <User className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <div className="font-medium">{user.username}</div>
                        <div className="text-sm text-muted-foreground">{user.email}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* 数据统计 */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">数据统计</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-3 bg-muted/30 rounded-lg">
                        <div className="text-2xl font-bold text-primary">{notes.length}</div>
                        <div className="text-sm text-muted-foreground">笔记</div>
                      </div>
                      <div className="text-center p-3 bg-muted/30 rounded-lg">
                        <div className="text-2xl font-bold text-primary">{schedules.length}</div>
                        <div className="text-sm text-muted-foreground">日程</div>
                      </div>
                      <div className="text-center p-3 bg-muted/30 rounded-lg">
                        <div className="text-2xl font-bold text-primary">{todos.length}</div>
                        <div className="text-sm text-muted-foreground">待办</div>
                      </div>
                      <div className="text-center p-3 bg-muted/30 rounded-lg">
                        <div className="text-2xl font-bold text-primary">{goals.length}</div>
                        <div className="text-sm text-muted-foreground">目标</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* 操作按钮 */}
                <Card>
                  <CardContent className="p-4 space-y-3">
                    <Button 
                      variant="outline" 
                      className="w-full justify-start"
                      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                    >
                      {theme === 'dark' ? (
                        <Sun className="h-4 w-4 mr-2" />
                      ) : (
                        <Moon className="h-4 w-4 mr-2" />
                      )}
                      {theme === 'dark' ? '切换到浅色模式' : '切换到深色模式'}
                    </Button>
                    <Button 
                      variant="destructive" 
                      className="w-full justify-start"
                      onClick={logout}
                    >
                      <X className="h-4 w-4 mr-2" />
                      退出登录
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </div>

          {/* 底部Tab导航 */}
          <TabsList className="grid w-full grid-cols-5 h-16 bg-background border-t">
            <TabsTrigger value="notes" className="flex flex-col gap-1 h-full">
              <FileText className="h-5 w-5" />
              <span className="text-xs">笔记</span>
            </TabsTrigger>
            <TabsTrigger value="schedule" className="flex flex-col gap-1 h-full">
              <CalendarIcon className="h-5 w-5" />
              <span className="text-xs">日程</span>
            </TabsTrigger>
            <TabsTrigger value="todo" className="flex flex-col gap-1 h-full">
              <CheckSquare className="h-5 w-5" />
              <span className="text-xs">待办</span>
            </TabsTrigger>
            <TabsTrigger value="goals" className="flex flex-col gap-1 h-full">
              <Target className="h-5 w-5" />
              <span className="text-xs">目标</span>
            </TabsTrigger>
            <TabsTrigger value="profile" className="flex flex-col gap-1 h-full">
              <User className="h-5 w-5" />
              <span className="text-xs">我的</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <Toaster />
    </div>
  )
}