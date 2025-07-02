'use client'

import React, { useState, useEffect, memo, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { tagContentsApi } from '@/lib/api'

interface TagContent {
  tag: string
  content: string
  updatedAt: string
  isGoalEnabled?: boolean
  targetCount?: number
  currentCount?: number
}

interface GoalsListProps {
  onTagSelect?: (tag: string) => void
}

const GoalsList: React.FC<GoalsListProps> = ({ onTagSelect }) => {
  const [goals, setGoals] = useState<TagContent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchGoals = async () => {
    try {
      const response = await tagContentsApi.getAll()
      
      if (response && response.data) {
        const goalData = response.data
        
        const filteredGoals = goalData.filter((tagContent: TagContent) => {
          return tagContent.isGoalEnabled === true
        })
        
        setGoals(filteredGoals)
      } else {
        console.warn('⚠️ [GoalsList] 响应数据格式异常:', response)
        setGoals([])
      }
    } catch (err) {
      console.error('获取目标列表失败:', err)
      setError('获取目标列表失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchGoals()

    // 监听目标列表刷新事件
    const handleGoalsRefresh = () => {
      fetchGoals()
    }

    window.addEventListener('goalsRefresh', handleGoalsRefresh)

    // 清理事件监听器
    return () => {
      window.removeEventListener('goalsRefresh', handleGoalsRefresh)
    }
  }, [])

  // 移除频繁的渲染日志以避免输入卡顿

  const handleGoalClick = (tag: string) => {
    if (onTagSelect) {
      onTagSelect(tag)
    }
  }

  if (loading) {
    return (
      <div>
        <p>加载中...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div>
         <p className="text-red-500">{error}</p>
       </div>
    )
  }

  if (goals.length === 0) {
    return (
      <div>
         <p className="text-gray-500">暂无设置目标的标签</p>
       </div>
    )
  }
  
  return (
    <div className="space-y-2">
        {goals.map((goal, index) => {
          const progress = goal.targetCount && goal.targetCount > 0 
            ? (goal.currentCount || 0) / goal.targetCount * 100 
            : 0
          
          return (
            <div 
              key={goal.tag} 
              className="space-y-2 p-2 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
              onClick={() => handleGoalClick(goal.tag)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Badge variant="outline">{goal.tag}</Badge>
                  <span className="text-sm text-gray-600">
                    {goal.currentCount || 0} / {goal.targetCount || 0}
                  </span>
                </div>
                <span className="text-sm font-medium">
                  {Math.round(progress)}%
                </span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )
        })}
    </div>
  )
}

export default memo(GoalsList)