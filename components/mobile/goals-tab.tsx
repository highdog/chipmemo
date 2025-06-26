"use client"

import React, { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TabsContent } from "@/components/ui/tabs"
import { Plus, Target, Calendar } from "lucide-react"
import { tagContentsApi } from "@/lib/api"
import { cn } from "@/lib/utils"
import { GoalsTabProps } from "./types"
import { toast as showToast } from "@/components/ui/use-toast"

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
}

export function GoalsTab({ user }: GoalsTabProps) {
  const toast = showToast
  // 目标相关状态
  const [goals, setGoals] = useState<Goal[]>([])
  const [newGoal, setNewGoal] = useState({ title: "", description: "", targetDate: "" })
  const [isAddingGoal, setIsAddingGoal] = useState(false)
  const [showGoalInput, setShowGoalInput] = useState(false)

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
          userId: item.userId || user?.id || '',
          createdAt: item.createdAt || new Date().toISOString(),
          updatedAt: item.updatedAt || new Date().toISOString()
        }))
      
      setGoals(goals)
    } catch (error) {
      console.error('Error loading goals:', error)
      toast({ title: '加载目标失败', variant: 'destructive' })
    }
  }, [user, toast])

  useEffect(() => {
    if (user) {
      loadGoals()
    }
  }, [user, loadGoals])

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
        {/* 顶部操作栏 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-medium">我的目标</h2>
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

        {/* 目标列表 */}
        {goals.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            暂无目标，开始设定你的第一个目标吧！
          </div>
        ) : (
          <div className="space-y-3">
            {goals.map((goal) => {
              const daysLeft = goal.targetDate ? getDaysLeft(goal.targetDate) : null
              
              return (
                <Card key={goal._id} className={cn(
                  "border-l-4 cursor-pointer transition-all hover:shadow-md",
                  getGoalStatusColor(goal)
                )}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Target className="h-4 w-4" />
                          <h3 className={cn(
                            "font-medium",
                            goal.completed && "line-through text-muted-foreground"
                          )}>
                            {goal.title}
                          </h3>
                        </div>
                        
                        {goal.description && (
                          <p className="text-sm text-muted-foreground mb-2">
                            {goal.description}
                          </p>
                        )}
                        
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          {goal.targetDate && (
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              <span>{goal.targetDate}</span>
                              {daysLeft !== null && (
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
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <Button
                        variant={goal.completed ? "default" : "outline"}
                        size="sm"
                        onClick={() => toggleGoal(goal._id)}
                        className="ml-2"
                      >
                        {goal.completed ? "已完成" : "标记完成"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </TabsContent>
  )
}