'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

import { Plus, X, Edit2, Check } from 'lucide-react'
import { format } from 'date-fns'
import { zhCN } from 'date-fns/locale'

interface ScheduleItem {
  id: string
  title: string
  time: string
  description?: string
  type: 'meeting' | 'appointment' | 'event' | 'reminder'
}

interface ScheduleListProps {
  selectedDate: Date
}

const ScheduleList: React.FC<ScheduleListProps> = ({ selectedDate }) => {
  const [schedules, setSchedules] = useState<ScheduleItem[]>([])
  const [isAdding, setIsAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [newSchedule, setNewSchedule] = useState({
    title: '',
    time: '',
    description: '',
    type: 'event' as ScheduleItem['type']
  })

  // 从localStorage加载日程数据
  useEffect(() => {
    const dateKey = format(selectedDate, 'yyyy-MM-dd')
    const savedSchedules = localStorage.getItem(`schedules_${dateKey}`)
    
    if (savedSchedules) {
      try {
        const parsedSchedules = JSON.parse(savedSchedules)
        setSchedules(parsedSchedules)
      } catch (error) {
        console.error('解析日程数据失败:', error)
        setSchedules([])
      }
    } else {
      // 如果是今天且没有保存的数据，显示默认示例数据
      const today = new Date()
      if (selectedDate.toDateString() === today.toDateString()) {
        const mockSchedules: ScheduleItem[] = [
          {
            id: '1',
            title: '团队会议',
            time: '09:00',
            description: '讨论项目进度',
            type: 'meeting'
          },
          {
            id: '2',
            title: '客户拜访',
            time: '14:30',
            description: '产品演示',
            type: 'appointment'
          }
        ]
        setSchedules(mockSchedules)
        // 保存示例数据到localStorage
        localStorage.setItem(`schedules_${dateKey}`, JSON.stringify(mockSchedules))
      } else {
        setSchedules([])
      }
    }
  }, [selectedDate])

  const handleAddSchedule = () => {
    if (!newSchedule.title.trim() || !newSchedule.time.trim()) return

    const schedule: ScheduleItem = {
      id: Date.now().toString(),
      title: newSchedule.title.trim(),
      time: newSchedule.time,
      description: newSchedule.description.trim() || undefined,
      type: newSchedule.type
    }

    const updatedSchedules = [...schedules, schedule].sort((a, b) => a.time.localeCompare(b.time))
    setSchedules(updatedSchedules)
    
    // 保存到localStorage
    const dateKey = format(selectedDate, 'yyyy-MM-dd')
    localStorage.setItem(`schedules_${dateKey}`, JSON.stringify(updatedSchedules))
    
    // 触发自定义事件通知其他组件
    window.dispatchEvent(new CustomEvent('scheduleUpdated', { detail: { dateKey, schedules: updatedSchedules } }))
    
    setNewSchedule({ title: '', time: '', description: '', type: 'event' })
    setIsAdding(false)
  }

  const handleDeleteSchedule = (id: string) => {
    const updatedSchedules = schedules.filter(s => s.id !== id)
    setSchedules(updatedSchedules)
    
    // 保存到localStorage
    const dateKey = format(selectedDate, 'yyyy-MM-dd')
    localStorage.setItem(`schedules_${dateKey}`, JSON.stringify(updatedSchedules))
    
    // 触发自定义事件通知其他组件
    window.dispatchEvent(new CustomEvent('scheduleUpdated', { detail: { dateKey, schedules: updatedSchedules } }))
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
      
      <div className="space-y-2 max-h-48 overflow-y-auto">
        {/* 添加新日程表单 */}
        {isAdding && (
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
                onClick={handleAddSchedule}
                className="h-6 px-2 text-xs"
                disabled={!newSchedule.title.trim() || !newSchedule.time.trim()}
              >
                <Check className="h-3 w-3 mr-1" />
                添加
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setIsAdding(false)
                  setNewSchedule({ title: '', time: '', description: '', type: 'event' })
                }}
                className="h-6 px-2 text-xs"
              >
                <X className="h-3 w-3 mr-1" />
                取消
              </Button>
            </div>
          </div>
        )}

        {/* 日程列表 */}
        {schedules.length === 0 && !isAdding ? (
          <div className="text-center py-4 text-sm text-muted-foreground">
            当前日期没有日程安排
          </div>
        ) : (
          schedules.map((schedule) => (
            <div
              key={schedule.id}
              className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50 transition-colors group"
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <span className="text-sm font-medium text-primary">
                  {schedule.time}
                </span>
                <span className="text-sm text-foreground">
                  {schedule.title}
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDeleteSchedule(schedule.id)}
                className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 hover:text-destructive flex-shrink-0"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default ScheduleList