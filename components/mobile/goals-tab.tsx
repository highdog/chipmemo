"use client"

import React, { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TabsContent, Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Plus, Target, Calendar, Zap, Loader2 } from "lucide-react"
import { tagContentsApi, apiClient } from "@/lib/api"
import { cn } from "@/lib/utils"
import { GoalsTabProps } from "./types"
import { toast as showToast } from "@/components/ui/use-toast"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { Separator } from "@/components/ui/separator"

interface Goal {
  _id: string
  id?: string
  title: string
  description: string
  completed: boolean
  targetDate?: string
  userId: string
  createdAt: string
  updatedAt: string
  // 添加进度相关字段
  tag: string
  targetCount: number
  currentCount: number
}

interface CheckInTag {
  _id: string
  tag: string
  content: string
  updatedAt: string
  isCheckInEnabled?: boolean
  checkInCount?: number
}

export function GoalsTab({ user }: GoalsTabProps) {
  const toast = showToast
  
  // Tab状态
  const [activeTab, setActiveTab] = useState("goals")
  
  // 目标相关状态
  const [goals, setGoals] = useState<Goal[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showGoalInput, setShowGoalInput] = useState(false)
  const [newGoal, setNewGoal] = useState({ title: "", description: "", targetDate: "" })
  const [isAddingGoal, setIsAddingGoal] = useState(false)
  
  // 弹框相关状态
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null)
  const [showGoalDialog, setShowGoalDialog] = useState(false)
  const [checkedBoxes, setCheckedBoxes] = useState<boolean[]>([])
  
  // 打卡相关状态
  const [checkInTags, setCheckInTags] = useState<CheckInTag[]>([])
  const [checkInLoading, setCheckInLoading] = useState(true)
  const [checkInError, setCheckInError] = useState<string | null>(null)
  const [checkingInTags, setCheckingInTags] = useState<Set<string>>(new Set())

  // 加载目标数据
  const loadGoals = useCallback(async () => {
    try {
      const response = await tagContentsApi.getAll()
      console.log('Goals response:', response)
      const goalsData = Array.isArray(response.data) ? response.data :
        (response.data && typeof response.data === 'object' ? Object.values(response.data).flat() : [])
      
      const goals = goalsData
        .filter((item: any) => item.isGoalEnabled)
        .map((item: any) => ({
          _id: item._id || item.id || Math.random().toString(),
          id: item.id,
          title: item.title || item.name || item.tag || '未命名目标',
          description: item.description || item.content || '',
          completed: (item.currentCount || 0) >= (item.targetCount || 1),
          targetDate: item.targetDate || item.dueDate,
          userId: item.userId || user?._id || '',
          createdAt: item.createdAt || new Date().toISOString(),
          updatedAt: item.updatedAt || new Date().toISOString(),
          // 添加进度相关字段
          tag: item.tag || item.title || item.name || '未命名目标',
          targetCount: item.targetCount || 1,
          currentCount: item.currentCount || 0
        }))
      
      setGoals(goals)
    } catch (error) {
      console.error('Error loading goals:', error)
      toast({ title: '加载目标失败', variant: 'destructive' })
    }
  }, [user, toast])

  // 加载打卡标签数据
  const loadCheckInTags = useCallback(async () => {
    try {
      setCheckInLoading(true)
      const response = await tagContentsApi.getAll()
      
      if (response && response.data) {
        const checkInData = response.data.filter((item: any) => item.isCheckInEnabled)
        setCheckInTags(checkInData as any)
        setCheckInError(null)
      } else {
        setCheckInError('数据格式错误')
      }
    } catch (err: any) {
      setCheckInError(err.message || '获取数据失败')
    } finally {
      setCheckInLoading(false)
    }
  }, [])

  // 处理打卡
  const handleCheckIn = async (tag: string) => {
    try {
      setCheckingInTags(prev => new Set([...prev, tag]))
      
      const response = await tagContentsApi.checkIn(tag)
      
      if (response.success) {
        toast({ title: '打卡成功！', description: `已为 #${tag} 创建打卡笔记` })
        
        // 更新本地状态
        setCheckInTags(prev => 
          prev.map(item => 
            item.tag === tag 
              ? { ...item, checkInCount: (item.checkInCount || 0) + 1 }
              : item
          )
        )
        
        // 触发笔记刷新事件
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('notes-refresh'))
        }
      } else {
        toast({ title: '打卡失败', description: '请稍后重试', variant: 'destructive' })
      }
    } catch (error: any) {
      toast({ title: '打卡失败', description: error.message || '请稍后重试', variant: 'destructive' })
    } finally {
      setCheckingInTags(prev => {
        const newSet = new Set(prev)
        newSet.delete(tag)
        return newSet
      })
    }
  }

  // 处理标签点击
  const handleTagClick = (tag: string) => {
    // 触发标签搜索事件，在当前页面显示标签内容
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('tag-search', { detail: { tag } }))
    }
  }

  useEffect(() => {
    if (user) {
      loadGoals()
      loadCheckInTags()
    }
  }, [user, loadGoals, loadCheckInTags])

  // 监听打卡列表刷新事件
  useEffect(() => {
    const handleCheckInRefresh = () => {
      setCheckInLoading(true)
      loadCheckInTags()
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('checkin-refresh', handleCheckInRefresh)
      return () => {
        window.removeEventListener('checkin-refresh', handleCheckInRefresh)
      }
    }
  }, [loadCheckInTags])

  // 添加目标
  const handleAddGoal = async () => {
    if (!newGoal.title.trim()) return
    
    setIsAddingGoal(true)
    try {
      await tagContentsApi.save(newGoal.title, newGoal.description, {
        isGoalEnabled: true,
        targetCount: 1,
        currentCount: 0
      })
      setNewGoal({ title: "", description: "", targetDate: "" })
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

  // 处理目标点击，打开弹框
  const handleGoalClick = (goal: Goal) => {
    setSelectedGoal(goal)
    setShowGoalDialog(true)
    
    // 初始化勾选框状态
    const boxes = new Array(goal.targetCount || 0).fill(false)
    for (let i = 0; i < (goal.currentCount || 0); i++) {
      boxes[i] = true
    }
    setCheckedBoxes(boxes)
  }

  // 处理勾选框点击
  const handleCheckboxClick = async (index: number) => {
    if (!selectedGoal) return
    
    const newCheckedBoxes = [...checkedBoxes]
    const wasChecked = newCheckedBoxes[index]
    newCheckedBoxes[index] = !wasChecked
    
    // 更新本地状态
    setCheckedBoxes(newCheckedBoxes)
    const newCurrentCount = newCheckedBoxes.filter(Boolean).length
    
    try {
      // 保存进度到后端
      const goalSettings = {
        isGoalEnabled: true,
        targetCount: selectedGoal.targetCount || 0,
        currentCount: newCurrentCount
      }
      
      await tagContentsApi.save(selectedGoal.tag, '', goalSettings)
      
      // 如果是勾选（进度+1），自动创建笔记
      if (!wasChecked) {
        const noteTitle = `${selectedGoal.tag} 目标进度 +1`
        const noteContent = `完成了 #${selectedGoal.tag} 标签的一个目标项目，当前进度：${newCurrentCount}/${selectedGoal.targetCount}`
        
        const noteData = {
          title: noteTitle,
          content: noteContent,
          tags: [selectedGoal.tag],
          color: 'blue'
        }
        
        await apiClient.createNote(noteData)
        toast({ title: `进度 +1，已自动创建笔记` })
        
        // 触发笔记列表刷新
        window.dispatchEvent(new CustomEvent('notes-refresh', {
          detail: { currentTag: selectedGoal.tag }
        }))
      } else {
        toast({ title: `进度已更新：${newCurrentCount}/${selectedGoal.targetCount}` })
      }
      
      // 更新目标列表中的当前目标
      setGoals(goals.map(g => 
        g._id === selectedGoal._id 
          ? { ...g, currentCount: newCurrentCount }
          : g
      ))
      
      // 更新选中的目标
      setSelectedGoal({ ...selectedGoal, currentCount: newCurrentCount })
      
      // 触发目标列表刷新
      window.dispatchEvent(new CustomEvent('goals-list-refresh'))
      
    } catch (error: any) {
      console.error('更新进度失败:', error)
      
      // 回滚状态
      newCheckedBoxes[index] = wasChecked
      setCheckedBoxes(newCheckedBoxes)
      toast({ title: '更新进度失败: ' + (error?.message || '未知错误'), variant: "destructive" })
    }
  }

  // 切换目标完成状态
  const toggleGoal = async (goalId: string) => {
    try {
      const goal = goals.find(g => g._id === goalId)
      if (!goal) return
      
      // 对于基于标签内容的目标，我们需要更新 currentCount
      const tagContent = goal.title // 假设 title 就是 tag
      const newCurrentCount = goal.completed ? 0 : 1
      
      await tagContentsApi.save(tagContent, goal.description || '', {
        isGoalEnabled: true,
        targetCount: 1,
        currentCount: newCurrentCount
      })
      
      await loadGoals()
      toast({ title: goal.completed ? "目标标记为未完成" : "目标标记为已完成" })
    } catch (error) {
      console.error('Error toggling goal:', error)
      toast({ title: "更新目标失败", variant: "destructive" })
    }
  }

  // 计算目标的剩余天数
  const getDaysLeft = (targetDate: string) => {
    if (!targetDate) return null
    const today = new Date()
    const target = new Date(targetDate)
    const diffTime = target.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  // 获取目标状态颜色
  const getGoalStatusColor = (goal: Goal) => {
    if (goal.completed) {
      return "border-green-500 bg-green-50 dark:bg-green-950"
    }
    
    if (goal.targetDate) {
      const daysLeft = getDaysLeft(goal.targetDate)
      if (daysLeft !== null) {
        if (daysLeft < 0) {
          return "border-red-500 bg-red-50 dark:bg-red-950" // 已过期
        } else if (daysLeft <= 7) {
          return "border-orange-500 bg-orange-50 dark:bg-orange-950" // 即将到期
        }
      }
    }
    
    return "border-blue-500 bg-blue-50 dark:bg-blue-950" // 正常
  }

  return (
    <TabsContent value="goals" className="h-full m-0 p-4 overflow-y-auto">
      <div className="space-y-4">
        {/* Tab 切换 */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="goals" className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              目标
            </TabsTrigger>
            <TabsTrigger value="checkin" className="flex items-center gap-2">
              <Zap className="h-4 w-4" />
              打卡
            </TabsTrigger>
          </TabsList>

          {/* 目标 Tab 内容 */}
          <TabsContent value="goals" className="space-y-4 mt-4">
            {/* 顶部操作栏 */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">({goals.length})</span>
              </div>
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
                placeholder="目标标题"
                value={newGoal.title}
                onChange={(e) => setNewGoal(prev => ({ ...prev, title: e.target.value }))}
              />
              <Textarea
                placeholder="目标描述（可选）"
                value={newGoal.description}
                onChange={(e) => setNewGoal(prev => ({ ...prev, description: e.target.value }))}
                className="min-h-[80px]"
              />
              <div className="space-y-2">
                <label className="text-sm font-medium">目标日期（可选）</label>
                <Input
                  type="date"
                  value={newGoal.targetDate}
                  onChange={(e) => setNewGoal(prev => ({ ...prev, targetDate: e.target.value }))}
                />
              </div>
              <div className="flex gap-2">
                <Button 
                  onClick={handleAddGoal} 
                  disabled={isAddingGoal || !newGoal.title.trim()}
                  className="flex-1"
                >
                  {isAddingGoal ? "添加中..." : "添加目标"}
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => {
                    setShowGoalInput(false)
                    setNewGoal({ title: "", description: "", targetDate: "" })
                  }}
                >
                  取消
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
        
        {/* 目标进度弹框 */}
        <Dialog open={showGoalDialog} onOpenChange={setShowGoalDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-blue-600" />
                目标进度
              </DialogTitle>
            </DialogHeader>
            
            {selectedGoal && (
              <div className="space-y-4">
                {/* 目标信息 */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline">{selectedGoal.tag}</Badge>
                    <span className="text-sm font-medium">
                      {selectedGoal.currentCount || 0} / {selectedGoal.targetCount || 0}
                    </span>
                  </div>
                  
                  {selectedGoal.description && !selectedGoal.description.includes('这是关于') && !selectedGoal.description.includes('标签的基本内容') && (
                    <p className="text-sm text-muted-foreground">
                      {selectedGoal.description}
                    </p>
                  )}
                  
                  {selectedGoal.targetDate && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      <span>{selectedGoal.targetDate}</span>
                    </div>
                  )}
                </div>
                
                <Separator />
                
                {/* 进度勾选框 */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Target className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium text-gray-700">目标进度</span>
                    <span className="text-xs text-gray-500">
                      ({selectedGoal.currentCount || 0}/{selectedGoal.targetCount || 0})
                    </span>
                  </div>
                  
                  <div className="max-h-48 overflow-y-auto">
                    <div className="grid grid-cols-6 gap-2">
                      {Array.from({ length: selectedGoal.targetCount || 0 }, (_, index) => (
                        <div key={index} className="flex flex-col items-center">
                          <Checkbox
                            id={`goal-checkbox-${selectedGoal.tag}-${index}`}
                            checked={checkedBoxes[index] || false}
                            onCheckedChange={() => handleCheckboxClick(index)}
                            className="h-4 w-4"
                          />
                          <span className="text-xs text-gray-400 mt-0.5">{index + 1}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="text-xs text-gray-500">
                    点击勾选框来更新进度，每次勾选会自动创建一条进度笔记
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* 目标列表 */}
        {goals.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            暂无目标，开始设定你的第一个目标吧！
          </div>
        ) : (
          <div className="space-y-0">
            {goals.map((goal, index) => {
              const progress = goal.targetCount && goal.targetCount > 0 
                ? (goal.currentCount || 0) / goal.targetCount * 100 
                : 0
              
              return (
                <div key={goal._id}>
                  <div 
                    className="space-y-3 p-4 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors"
                    onClick={() => handleGoalClick(goal)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline">{goal.tag}</Badge>
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          {goal.currentCount || 0} / {goal.targetCount || 0}
                        </span>
                      </div>
                      <span className="text-sm font-medium">
                        {Math.round(progress)}%
                      </span>
                    </div>
                    <Progress value={progress} className="h-2" />
                    
                    {/* 额外信息区域 */}
                    {(goal.description || goal.targetDate) && (
                      <div className="space-y-2 pt-2">
                        {goal.description && !goal.description.includes('这是关于') && !goal.description.includes('标签的基本内容') && (
                          <p className="text-sm text-muted-foreground">
                            {goal.description}
                          </p>
                        )}
                        
                        {goal.targetDate && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            <span>{goal.targetDate}</span>
                            {(() => {
                              const daysLeft = getDaysLeft(goal.targetDate)
                              if (daysLeft !== null) {
                                return (
                                  <span className={cn(
                                    "ml-1 px-2 py-1 rounded-full",
                                    daysLeft < 0 
                                      ? "bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300"
                                      : daysLeft <= 7
                                        ? "bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300"
                                        : "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300"
                                  )}>
                                    {daysLeft < 0 
                                      ? `已过期${Math.abs(daysLeft)}天`
                                      : daysLeft === 0
                                        ? "今天到期"
                                        : `还剩${daysLeft}天`
                                    }
                                  </span>
                                )
                              }
                              return null
                            })()} 
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  {index < goals.length - 1 && <Separator />}
                </div>
              )
            })}
          </div>
        )}
          </TabsContent>

          {/* 打卡 Tab 内容 */}
          <TabsContent value="checkin" className="space-y-4 mt-4">
            {/* 顶部标题 */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">({checkInTags.length})</span>
            </div>

            {/* 打卡列表内容 */}
            {checkInLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span className="ml-2">加载中...</span>
              </div>
            ) : checkInError ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>{checkInError}</p>
              </div>
            ) : checkInTags.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Zap className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>暂无打卡标签</p>
                <p className="text-sm">创建标签内容并启用打卡功能后，即可在此处打卡</p>
              </div>
            ) : (
              <div className="space-y-3">
                {checkInTags.map((tag) => (
                  <Card key={tag._id} className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1">
                        <Badge 
                          variant="secondary" 
                          className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                          onClick={() => handleTagClick(tag.tag)}
                        >
                          #{tag.tag}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          已打卡 {tag.checkInCount || 0} 次
                        </span>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleCheckIn(tag.tag)}
                        disabled={checkingInTags.has(tag.tag)}
                        className="shrink-0"
                      >
                        {checkingInTags.has(tag.tag) ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin mr-1" />
                            打卡中
                          </>
                        ) : (
                          <>
                            <Zap className="h-4 w-4 mr-1" />
                            打卡
                          </>
                        )}
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </TabsContent>
  )
}