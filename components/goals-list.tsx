'use client'

import React, { useState, useEffect } from 'react'
import { Target, TrendingUp } from 'lucide-react'
import { Progress } from '@/components/ui/progress'
import { tagContentsApi } from '@/lib/api'

interface Goal {
  tag: string
  targetCount: number
  currentCount: number
  isActive: boolean
}

interface GoalsListProps {
  className?: string
  onTagSelect?: (tag: string) => void
}

const GoalsList: React.FC<GoalsListProps> = ({ className, onTagSelect }) => {
  const [goals, setGoals] = useState<Goal[]>([])
  const [loading, setLoading] = useState(true)

  // 加载目标数据
  const loadGoals = async () => {
     try {
       setLoading(true)
       // 从标签内容中获取目标数据
       const response = await tagContentsApi.getAll()
       if (response.success && response.data) {
         // 过滤出启用了目标设置的标签内容
          const goalData = response.data
            .filter((tagContent: any) => tagContent.isGoalEnabled)
            .map((tagContent: any) => ({
              tag: tagContent.tag,
              targetCount: tagContent.targetCount || 0,
              currentCount: tagContent.currentCount || 0,
              isActive: true
            }))
         setGoals(goalData)
       } else {
         setGoals([])
       }
     } catch (error) {
       console.error('加载目标数据失败:', error)
       setGoals([])
     } finally {
       setLoading(false)
     }
   }

  useEffect(() => {
    loadGoals()
  }, [])

  // 监听标签更新事件，实时刷新目标列表
  useEffect(() => {
    const handleTagUpdate = () => {
      loadGoals()
    }

    // 监听所有标签的更新事件
    const handleGlobalTagUpdate = (event: CustomEvent) => {
      loadGoals()
    }

    // 添加全局标签更新监听器
    window.addEventListener('goals-list-refresh', handleGlobalTagUpdate as EventListener)
    
    return () => {
      window.removeEventListener('goals-list-refresh', handleGlobalTagUpdate as EventListener)
    }
  }, [])

  const calculateProgress = (current: number, target: number) => {
    return Math.min((current / target) * 100, 100)
  }

  const getProgressColor = (progress: number) => {
    if (progress >= 100) return 'bg-green-500'
    if (progress >= 75) return 'bg-blue-500'
    if (progress >= 50) return 'bg-yellow-500'
    return 'bg-gray-400'
  }

  if (loading) {
    return (
      <div className="mt-4">
        <div className="flex items-center gap-2 mb-3">
          <Target className="h-4 w-4 text-muted-foreground" />
          <h3 className="font-medium text-sm">目标进度</h3>
        </div>
        <div className="text-center py-4 text-sm text-muted-foreground">
          加载中...
        </div>
      </div>
    )
  }

  return (
    <div className="mt-4">
      <div className="flex items-center gap-2 mb-3">
        <Target className="h-4 w-4 text-muted-foreground" />
        <h3 className="font-medium text-sm">目标进度</h3>
      </div>
      
      <div className="space-y-1 max-h-48 overflow-y-auto">
        {goals.length === 0 ? (
          <div className="text-center py-4 text-sm text-muted-foreground">
            暂无设置目标
          </div>
        ) : (
          goals.filter(goal => goal.isActive).map((goal) => {
            const progress = calculateProgress(goal.currentCount, goal.targetCount)
            return (
              <div
                key={goal.tag}
                className="p-3 rounded-md border bg-card hover:bg-muted/50 transition-colors cursor-pointer"
                onClick={() => onTagSelect?.(goal.tag)}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">#{goal.tag}</span>
                    <TrendingUp className="h-3 w-3 text-muted-foreground" />
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {goal.currentCount}/{goal.targetCount}
                  </span>
                </div>
                
                <div className="space-y-1">
                  <Progress 
                    value={progress} 
                    className="h-2"
                  />
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">
                      进度: {progress.toFixed(0)}%
                    </span>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      progress >= 100 
                        ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                        : progress >= 75
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                        : progress >= 50
                        ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300'
                        : 'bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300'
                    }`}>
                      {progress >= 100 ? '已完成' : 
                       progress >= 75 ? '接近完成' :
                       progress >= 50 ? '进行中' : '刚开始'}
                    </span>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

export default GoalsList