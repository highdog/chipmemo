"use client"

import React, { useState, useEffect, useCallback, useMemo } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Calendar } from "@/components/ui/calendar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
  Clock
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
  const router = useRouter()
  const [activeTab, setActiveTab] = useState("notes")
  
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
  const [isAddingTodo, setIsAddingTodo] = useState(false)
  
  // 目标相关状态
  const [goals, setGoals] = useState<TagContent[]>([])
  const [newGoal, setNewGoal] = useState({ tag: "", content: "", targetCount: 0 })
  const [isAddingGoal, setIsAddingGoal] = useState(false)

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

  // 过滤和计算数据 - 所有 useMemo 必须在条件返回之前
  const filteredNotes = useMemo(() => {
    if (!searchTerm) return notes
    return notes.filter(note => 
      note.content.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [notes, searchTerm])

  const todaySchedules = useMemo(() => {
    const today = new Date().toISOString().split('T')[0]
    return schedules.filter(schedule => schedule.date === today)
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
        priority: 'medium'
      })
      setNewTodo("")
      await loadTodos()
      toast({ title: "待办添加成功" })
    } catch (error) {
      console.error('Error adding todo:', error)
      toast({ title: "添加待办失败", variant: "destructive" })
    } finally {
      setIsAddingTodo(false)
    }
  }

  // 切换Todo状态
  const handleToggleTodo = async (todoId: string) => {
    try {
      const todo = todos.find(t => t._id === todoId)
      if (!todo) return
      
      await todosApi.update(todoId, { completed: !todo.completed })
      await loadTodos()
      toast({ title: todo.completed ? "标记为未完成" : "标记为已完成" })
    } catch (error) {
      console.error('Error toggling todo:', error)
      toast({ title: "更新待办失败", variant: "destructive" })
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

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* 顶部标题栏 */}
      <div className="flex items-center justify-between p-4 border-b bg-background/95 backdrop-blur">
        <h1 className="text-xl font-bold">笔记本</h1>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push('/')}
          className="text-sm"
        >
          桌面版
        </Button>
      </div>

      {/* 主内容区域 */}
      <div className="flex-1 overflow-hidden">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
          {/* Tab内容 */}
          <div className="flex-1 overflow-hidden">
            {/* 笔记Tab */}
            <TabsContent value="notes" className="h-full m-0 p-4 overflow-y-auto">
              <div className="space-y-4">
                {/* 搜索框 */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="搜索笔记..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>

                {/* 添加笔记 */}
                <Card>
                  <CardContent className="p-4">
                    <Textarea
                      placeholder="写下你的想法..."
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                      className="min-h-[100px] mb-3"
                    />
                    <Button 
                      onClick={handleAddNote} 
                      disabled={isAddingNote || !newNote.trim()}
                      className="w-full"
                    >
                      {isAddingNote ? "添加中..." : "添加笔记"}
                    </Button>
                  </CardContent>
                </Card>

                {/* 笔记列表 */}
                <div className="space-y-3">
                  {filteredNotes.map((note) => (
                    <Card key={note.id}>
                      <CardContent className="p-4">
                        <div className="text-sm text-muted-foreground mb-2">
                          {formatDateShort(new Date(note.createdAt))}
                        </div>
                        <div className="text-sm leading-relaxed">
                          {note.content}
                        </div>
                        {note.tags && note.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {note.tags.map((tag, index) => (
                              <Badge key={index} variant="secondary" className="text-xs">
                                #{tag}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </TabsContent>

            {/* 日程Tab */}
            <TabsContent value="schedule" className="h-full m-0 p-4 overflow-y-auto">
              <div className="space-y-4">
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

                {/* 添加日程 */}
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
                    <Button 
                      onClick={handleAddSchedule} 
                      disabled={isAddingSchedule || !newSchedule.title.trim() || !newSchedule.time.trim()}
                      className="w-full"
                    >
                      {isAddingSchedule ? "添加中..." : "添加日程"}
                    </Button>
                  </CardContent>
                </Card>

                {/* 今日日程 */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">今日日程</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {todaySchedules.length === 0 ? (
                      <div className="text-center text-muted-foreground py-4">
                        今日暂无日程
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {todaySchedules.map((schedule) => (
                          <div key={schedule._id} className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
                            <Clock className="h-4 w-4 mt-1 text-muted-foreground" />
                            <div className="flex-1">
                              <div className="font-medium">{schedule.title}</div>
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
            <TabsContent value="todo" className="h-full m-0 p-4 overflow-y-auto">
              <div className="space-y-4">
                {/* 添加Todo */}
                <Card>
                  <CardContent className="p-4">
                    <div className="flex gap-2">
                      <Input
                        placeholder="添加待办事项..."
                        value={newTodo}
                        onChange={(e) => setNewTodo(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleAddTodo()}
                        className="flex-1"
                      />
                      <Button 
                        onClick={handleAddTodo} 
                        disabled={isAddingTodo || !newTodo.trim()}
                        size="sm"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Todo列表 */}
                <div className="space-y-3">
                  {todos.map((todo) => (
                    <Card key={todo._id}>
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggleTodo(todo._id)}
                            className="p-0 h-auto"
                          >
                            {todo.completed ? (
                              <Check className="h-5 w-5 text-green-500" />
                            ) : (
                              <div className="h-5 w-5 border-2 border-muted-foreground rounded" />
                            )}
                          </Button>
                          <div className="flex-1">
                            <div className={cn(
                              "text-sm",
                              todo.completed ? "line-through text-muted-foreground" : "text-foreground"
                            )}>
                              {todo.text}
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                              {formatDateShort(new Date(todo.createdAt))}
                            </div>
                          </div>
                          <Badge 
                            variant={todo.priority === 'high' ? 'destructive' : todo.priority === 'medium' ? 'default' : 'secondary'}
                            className="text-xs"
                          >
                            {todo.priority === 'high' ? '高' : todo.priority === 'medium' ? '中' : '低'}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </TabsContent>

            {/* 目标Tab */}
            <TabsContent value="goals" className="h-full m-0 p-4 overflow-y-auto">
              <div className="space-y-4">
                {/* 添加目标 */}
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
                    <Button 
                      onClick={handleAddGoal} 
                      disabled={isAddingGoal || !newGoal.tag.trim() || !newGoal.content.trim() || newGoal.targetCount <= 0}
                      className="w-full"
                    >
                      {isAddingGoal ? "添加中..." : "添加目标"}
                    </Button>
                  </CardContent>
                </Card>

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
                          <div className="text-sm">{goal.content}</div>
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
                      onClick={() => router.push('/')}
                    >
                      <Home className="h-4 w-4 mr-2" />
                      返回桌面版
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