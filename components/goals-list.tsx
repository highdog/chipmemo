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
      console.log('🔍 [GoalsList] 开始获取所有标签内容...')
      const response = await tagContentsApi.getAll()
      console.log('📥 [GoalsList] 获取到的原始数据:', response)
      console.log('📊 [GoalsList] 数据类型:', typeof response)
      console.log('📊 [GoalsList] 数据结构:', Object.keys(response))
      
      if (response && response.data) {
        console.log('📋 [GoalsList] response.data:', response.data)
        console.log('📋 [GoalsList] response.data 类型:', typeof response.data)
        console.log('📋 [GoalsList] response.data 是否为数组:', Array.isArray(response.data))
        
        const goalData = response.data
        console.log('🎯 [GoalsList] goalData:', goalData)
        console.log('🎯 [GoalsList] goalData 长度:', goalData.length)
        
        // 打印每个标签的详细信息
        goalData.forEach((item: TagContent, index: number) => {
          console.log(`📝 [GoalsList] 标签 ${index + 1}:`, {
            tag: item.tag,
            isGoalEnabled: item.isGoalEnabled,
            targetCount: item.targetCount,
            currentCount: item.currentCount,
            hasGoalFields: 'isGoalEnabled' in item,
            goalFieldType: typeof item.isGoalEnabled
          })
        })
        
        // 过滤启用目标的标签
        console.log('🔍 [GoalsList] 开始过滤启用目标的标签...')
        const filteredGoals = goalData.filter((tagContent: TagContent) => {
          const isEnabled = tagContent.isGoalEnabled === true
          console.log(`🎯 [GoalsList] 标签 "${tagContent.tag}" 目标启用状态:`, {
            isGoalEnabled: tagContent.isGoalEnabled,
            isEnabled: isEnabled,
            comparison: `${tagContent.isGoalEnabled} === true`
          })
          return isEnabled
        })
        
        console.log('✅ [GoalsList] 过滤后的目标标签:', filteredGoals)
        console.log('📊 [GoalsList] 过滤后的数量:', filteredGoals.length)
        
        setGoals(filteredGoals)
      } else {
        console.warn('⚠️ [GoalsList] 响应数据格式异常:', response)
        setGoals([])
      }
    } catch (err) {
      console.error('❌ [GoalsList] 获取目标数据失败:', err)
      setError('获取目标数据失败')
    } finally {
      setLoading(false)
      console.log('🏁 [GoalsList] 数据获取流程结束')
    }
  }

  useEffect(() => {
    fetchGoals()

    // 监听目标列表刷新事件
    const handleGoalsRefresh = () => {
      console.log('🔄 [GoalsList] 收到目标列表刷新事件，重新获取数据...')
      setLoading(true)
      fetchGoals()
    }

    window.addEventListener('goals-list-refresh', handleGoalsRefresh)
    console.log('👂 [GoalsList] 已添加目标列表刷新事件监听器')

    // 清理事件监听器
    return () => {
      window.removeEventListener('goals-list-refresh', handleGoalsRefresh)
      console.log('🧹 [GoalsList] 已移除目标列表刷新事件监听器')
    }
  }, [])

  // 移除频繁的渲染日志以避免输入卡顿

  const handleGoalClick = useCallback((tag: string) => {
    console.log('🎯 [GoalsList] 点击目标标签:', tag)
    // 触发标签搜索，类似主页中的标签点击效果
    if (typeof window !== 'undefined') {
      // 触发全局搜索事件
      window.dispatchEvent(new CustomEvent('tag-search', { detail: { tag } }))
    }
    // 如果有回调函数，也调用它
    if (onTagSelect) {
      onTagSelect(tag)
    }
  }, [onTagSelect])

  if (loading) {
    console.log('⏳ [GoalsList] 显示加载状态')
    return (
      <div>
        <p>加载中...</p>
      </div>
    )
  }

  if (error) {
    console.log('❌ [GoalsList] 显示错误状态:', error)
    return (
      <div>
         <p className="text-red-500">{error}</p>
       </div>
    )
  }

  if (goals.length === 0) {
    console.log('📭 [GoalsList] 显示无目标状态')
    return (
      <div>
         <p className="text-gray-500">暂无设置目标的标签</p>
       </div>
    )
  }

  console.log('🎯 [GoalsList] 显示目标列表，共', goals.length, '个目标')
  
  return (
    <div className="space-y-2">
        {goals.map((goal, index) => {
          const progress = goal.targetCount && goal.targetCount > 0 
            ? (goal.currentCount || 0) / goal.targetCount * 100 
            : 0
          
          console.log(`🎯 [GoalsList] 渲染目标 "${goal.tag}":`, {
            targetCount: goal.targetCount,
            currentCount: goal.currentCount,
            progress: progress
          })
          
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