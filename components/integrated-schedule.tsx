'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, X, Check, Calendar, Edit3 } from 'lucide-react'
import { format, differenceInDays, isAfter, isToday, startOfDay } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { schedulesApi } from '@/lib/api'

interface ScheduleItem {
  id: string
  title: string
  time: string
  date: string
  description?: string
  type: 'meeting' | 'appointment' | 'event' | 'reminder'
}

interface IntegratedScheduleItem extends ScheduleItem {
  daysLeft: number
  displayDate: string
  isToday: boolean
}

interface IntegratedScheduleProps {
  selectedDate: Date
}

const IntegratedSchedule: React.FC<IntegratedScheduleProps> = ({ selectedDate }) => {
  const [allSchedules, setAllSchedules] = useState<IntegratedScheduleItem[]>([])
  const [isAdding, setIsAdding] = useState(false)
  const [newSchedule, setNewSchedule] = useState({
    title: '',
    time: '',
    description: '',
    type: 'event' as ScheduleItem['type']
  })
  const [editingSchedule, setEditingSchedule] = useState<IntegratedScheduleItem | null>(null)
  const [loading, setLoading] = useState(true)

  // 加载所有日程数据并处理显示逻辑
  useEffect(() => {
    const loadAllSchedules = async () => {
      try {
        setLoading(true)
        const response = await schedulesApi.getAll({})
        
        if (response.success && response.data) {
          const today = startOfDay(new Date())
          const processedSchedules: IntegratedScheduleItem[] = []
          
          // 遍历所有日期的日程，只显示今天及以后的日程
          Object.entries(response.data).forEach(([dateKey, schedules]) => {
            const scheduleDate = startOfDay(new Date(dateKey))
            const daySchedules = schedules as ScheduleItem[]
            
            // 只处理今天及以后的日程
            if (scheduleDate >= today) {
              daySchedules.forEach(schedule => {
                const daysLeft = differenceInDays(scheduleDate, today)
                const isScheduleToday = isToday(scheduleDate)
                let displayDate: string
                
                if (isScheduleToday) {
                  displayDate = '今天'
                } else if (daysLeft === 1) {
                  displayDate = '明天'
                } else if (daysLeft > 0) {
                  displayDate = `还剩${daysLeft}天`
                } else {
                  displayDate = '今天'
                }
                
                processedSchedules.push({
                  ...schedule,
                  date: dateKey,
                  daysLeft,
                  displayDate,
                  isToday: isScheduleToday
                })
              })
            }
          })
          
          // 排序：今天的在前面，然后按剩余天数排序，最后按时间排序
          processedSchedules.sort((a, b) => {
            // 今天的日程优先
            if (a.isToday && !b.isToday) return -1
            if (!a.isToday && b.isToday) return 1
            
            // 都是今天的或都不是今天的，按剩余天数排序
            if (a.daysLeft !== b.daysLeft) {
              return a.daysLeft - b.daysLeft
            }
            
            // 剩余天数相同，按时间排序
            return a.time.localeCompare(b.time)
          })
          
          setAllSchedules(processedSchedules)
        } else {
          setAllSchedules([])
        }
      } catch (error) {
        console.error('加载日程数据失败:', error)
        setAllSchedules([])
      } finally {
        setLoading(false)
      }
    }

    loadAllSchedules()
    
    // 监听日程更新事件
    const handleScheduleUpdate = () => {
      loadAllSchedules()
    }
    
    window.addEventListener('scheduleUpdated', handleScheduleUpdate)
    
    return () => {
      window.removeEventListener('scheduleUpdated', handleScheduleUpdate)
    }
  }, [selectedDate])

  const handleAddSchedule = async () => {
    if (!newSchedule.title.trim() || !newSchedule.time.trim()) return

    try {
      const dateKey = format(selectedDate, 'yyyy-MM-dd')
      const response = await schedulesApi.create({
        title: newSchedule.title.trim(),
        time: newSchedule.time,
        date: dateKey,
        description: newSchedule.description.trim() || undefined,
        type: newSchedule.type
      })

      if (response.success && response.data) {
        // 触发自定义事件通知其他组件
        window.dispatchEvent(new CustomEvent('scheduleUpdated'))
        
        setNewSchedule({ title: '', time: '', description: '', type: 'event' })
        setIsAdding(false)
      }
    } catch (error) {
      console.error('添加日程失败:', error)
    }
  }

  const handleDeleteSchedule = async (id: string) => {
    try {
      const response = await schedulesApi.delete(id)
      
      if (response.success) {
        // 触发自定义事件通知其他组件
        window.dispatchEvent(new CustomEvent('scheduleUpdated'))
      }
    } catch (error) {
      console.error('删除日程失败:', error)
    }
  }

  const handleEditSchedule = (schedule: IntegratedScheduleItem) => {
    setEditingSchedule(schedule)
    setNewSchedule({
      title: schedule.title,
      time: schedule.time,
      description: schedule.description || '',
      type: schedule.type
    })
    setIsAdding(false)
  }

  const handleUpdateSchedule = async () => {
    if (!editingSchedule || !newSchedule.title.trim() || !newSchedule.time.trim()) return

    try {
      const response = await schedulesApi.update(editingSchedule.id, {
        title: newSchedule.title.trim(),
        time: newSchedule.time,
        description: newSchedule.description.trim() || undefined,
        type: newSchedule.type
      })

      if (response.success) {
        // 触发自定义事件通知其他组件
        window.dispatchEvent(new CustomEvent('scheduleUpdated'))
        
        setNewSchedule({ title: '', time: '', description: '', type: 'event' })
        setEditingSchedule(null)
      }
    } catch (error) {
      console.error('更新日程失败:', error)
    }
  }

  const handleCancelEdit = () => {
    setEditingSchedule(null)
    setNewSchedule({ title: '', time: '', description: '', type: 'event' })
    setIsAdding(false)
  }

  const getScheduleTypeColor = (type: string) => {
    switch (type) {
      case 'meeting':
        return 'text-blue-600 dark:text-blue-400'
      case 'appointment':
        return 'text-green-600 dark:text-green-400'
      case 'reminder':
        return 'text-orange-600 dark:text-orange-400'
      default:
        return 'text-purple-600 dark:text-purple-400'
    }
  }

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-medium text-sm">日程安排</h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsAdding(true)}
          className="h-6 w-6 p-0"
        >
          <Plus className="h-3 w-3" />
        </Button>
      </div>
      
      <div className="space-y-1 max-h-64 overflow-y-auto">
        {/* 添加/编辑日程表单 */}
        {(isAdding || editingSchedule) && (
          <div className="space-y-2 p-2 border rounded-md bg-muted/50">
            <Input
              placeholder="日程标题"
              value={newSchedule.title}
              onChange={(e) => setNewSchedule(prev => ({ ...prev, title: e.target.value }))}
              className="text-xs h-7"
            />
            <Input
              type="time"
              step="600"
              value={newSchedule.time}
              onChange={(e) => setNewSchedule(prev => ({ ...prev, time: e.target.value }))}
              className="text-xs h-7"
            />
            <div className="flex gap-1">
              <Button
                size="sm"
                onClick={editingSchedule ? handleUpdateSchedule : handleAddSchedule}
                className="h-6 px-2 text-xs"
                disabled={!newSchedule.title.trim() || !newSchedule.time.trim()}
              >
                <Check className="h-3 w-3 mr-1" />
                {editingSchedule ? '更新' : '添加'}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCancelEdit}
                className="h-6 px-2 text-xs"
              >
                <X className="h-3 w-3 mr-1" />
                取消
              </Button>
            </div>
          </div>
        )}

        {/* 日程列表 */}
        {loading ? (
          <div className="text-center py-4 text-sm text-muted-foreground">
            加载中...
          </div>
        ) : allSchedules.length === 0 && !isAdding ? (
          <div className="text-center py-4 text-sm text-muted-foreground">
            暂无日程安排
          </div>
        ) : (
          allSchedules.map((schedule) => (
            <div
              key={`${schedule.id}-${schedule.date}`}
              className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50 transition-colors group"
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <div className="flex items-center justify-between w-full">
                  <div className="flex flex-col items-start gap-1 flex-1 min-w-0">
                    <span className="text-sm font-medium text-primary">
                      {schedule.time}
                    </span>
                    <span className="text-sm text-foreground truncate">
                      {schedule.title}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                    <Button
                       variant="ghost"
                       size="sm"
                       onClick={() => handleEditSchedule(schedule)}
                       className="h-6 w-6 p-0 hover:text-blue-600"
                       title="编辑"
                     >
                       <Edit3 className="h-3 w-3" />
                     </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteSchedule(schedule.id)}
                      className="h-6 w-6 p-0 hover:text-destructive"
                      title="删除"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                  schedule.isToday 
                    ? 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/20' 
                    : 'text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/20'
                }`}>
                  {schedule.displayDate}
                </span>
               </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default IntegratedSchedule