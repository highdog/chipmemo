'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

import { Plus, X, Edit2, Check, Calendar } from 'lucide-react'
import { format } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { schedulesApi } from '@/lib/api'

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
  const [editSchedule, setEditSchedule] = useState({
    title: '',
    time: '',
    date: '',
    description: '',
    type: 'event' as ScheduleItem['type']
  })

  // 从API加载日程数据
  useEffect(() => {
    const loadSchedules = async () => {
      try {
        const dateKey = format(selectedDate, 'yyyy-MM-dd')
        const response = await schedulesApi.getAll({ date: dateKey })
        
        if (response.success && response.data) {
          const daySchedules = (response.data[dateKey] || []).map(schedule => ({
            ...schedule,
            type: schedule.type as ScheduleItem['type']
          }))
          
          // 去重处理：基于id、title、time和date的组合
          const uniqueSchedules = daySchedules.filter((schedule, index, self) => {
            return index === self.findIndex(s => 
              s.id === schedule.id || 
              (s.title === schedule.title && s.time === schedule.time)
            )
          })
          
          console.log(`📅 [日程调试] 原始数据: ${daySchedules.length}, 去重后: ${uniqueSchedules.length}`)
          if (daySchedules.length !== uniqueSchedules.length) {
            console.warn('📅 [日程调试] 发现重复日程数据:', daySchedules.filter((schedule, index, self) => {
              return index !== self.findIndex(s => 
                s.id === schedule.id || 
                (s.title === schedule.title && s.time === schedule.time)
              )
            }))
          }
          
          setSchedules(uniqueSchedules)
        } else {
          setSchedules([])
        }
      } catch (error) {
        console.error('加载日程数据失败:', error)
        setSchedules([])
      }
    }

    loadSchedules()
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
        const newScheduleItem: ScheduleItem = {
          id: response.data.id,
          title: response.data.title,
          time: response.data.time,
          description: response.data.description,
          type: response.data.type as ScheduleItem['type']
        }
        
        const updatedSchedules = [...schedules, newScheduleItem].sort((a, b) => a.time.localeCompare(b.time))
        setSchedules(updatedSchedules)
        
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
        const updatedSchedules = schedules.filter(s => s.id !== id)
        setSchedules(updatedSchedules)
        
        // 触发自定义事件通知其他组件
        window.dispatchEvent(new CustomEvent('scheduleUpdated'))
      }
    } catch (error) {
      console.error('删除日程失败:', error)
    }
  }

  const handleEditSchedule = (schedule: ScheduleItem) => {
    setEditingId(schedule.id)
    setEditSchedule({
      title: schedule.title,
      time: schedule.time,
      date: format(selectedDate, 'yyyy-MM-dd'),
      description: schedule.description || '',
      type: schedule.type
    })
  }

  const handleUpdateSchedule = async () => {
    if (!editSchedule.title.trim() || !editSchedule.time.trim() || !editingId) return

    try {
      const response = await schedulesApi.update(editingId, {
        title: editSchedule.title.trim(),
        time: editSchedule.time,
        date: editSchedule.date,
        description: editSchedule.description.trim() || undefined,
        type: editSchedule.type
      })

      if (response.success && response.data) {
        // 如果日期改变了，需要从当前列表中移除该日程
        if (editSchedule.date !== format(selectedDate, 'yyyy-MM-dd')) {
          const updatedSchedules = schedules.filter(s => s.id !== editingId)
          setSchedules(updatedSchedules)
        } else {
          // 如果日期没变，更新当前列表中的日程
          const updatedSchedules = schedules.map(s => 
            s.id === editingId 
              ? {
                  ...s,
                  title: response.data!.title,
                  time: response.data!.time,
                  description: response.data!.description,
                  type: response.data!.type as ScheduleItem['type']
                }
              : s
          ).sort((a, b) => a.time.localeCompare(b.time))
          setSchedules(updatedSchedules)
        }
        
        // 触发自定义事件通知其他组件
        window.dispatchEvent(new CustomEvent('scheduleUpdated'))
        
        setEditingId(null)
        setEditSchedule({ title: '', time: '', date: '', description: '', type: 'event' })
      }
    } catch (error) {
      console.error('更新日程失败:', error)
    }
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setEditSchedule({ title: '', time: '', date: '', description: '', type: 'event' })
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
      
      <div className="space-y-1 max-h-48 overflow-y-auto">
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