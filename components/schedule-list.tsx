'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Plus, X, Edit2, Calendar as CalendarIcon } from 'lucide-react'
import { format } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { schedulesApi } from '@/lib/api'
import { cn } from '@/lib/utils'

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
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [newSchedule, setNewSchedule] = useState({
    title: '',
    time: '',
    date: format(new Date(), 'yyyy-MM-dd'),
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
    if (!newSchedule.title.trim() || !newSchedule.time.trim() || !newSchedule.date.trim()) return

    try {
      const response = await schedulesApi.create({
        title: newSchedule.title.trim(),
        time: newSchedule.time,
        date: newSchedule.date,
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
        
        // 关闭弹框并重置表单
        setIsDialogOpen(false)
        setNewSchedule({ 
          title: '', 
          time: '', 
          date: format(new Date(), 'yyyy-MM-dd'), 
          description: '', 
          type: 'event' 
        })
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
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
            >
              <Plus className="h-3 w-3" />
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>添加日程</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Input
                placeholder="日程标题"
                value={newSchedule.title}
                onChange={(e) => setNewSchedule(prev => ({ ...prev, title: e.target.value }))}
                autoFocus
              />
              
              {/* 日期选择器 */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !newSchedule.date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {newSchedule.date ? format(new Date(newSchedule.date), 'yyyy年MM月dd日', { locale: zhCN }) : "选择日期"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={newSchedule.date ? new Date(newSchedule.date) : undefined}
                    onSelect={(date) => {
                      if (date) {
                        setNewSchedule(prev => ({ ...prev, date: format(date, 'yyyy-MM-dd') }))
                      }
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              
              <Input
                type="time"
                step="600"
                value={newSchedule.time}
                onChange={(e) => setNewSchedule(prev => ({ ...prev, time: e.target.value }))}
              />
              
              <Input
                placeholder="描述（可选）"
                value={newSchedule.description}
                onChange={(e) => setNewSchedule(prev => ({ ...prev, description: e.target.value }))}
              />
              
              <div className="flex gap-2">
                <Button 
                  onClick={handleAddSchedule} 
                  disabled={!newSchedule.title.trim() || !newSchedule.time.trim() || !newSchedule.date.trim()}
                  className="flex-1"
                >
                  添加
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => {
                    setIsDialogOpen(false)
                    setNewSchedule({ 
                      title: '', 
                      time: '', 
                      date: format(new Date(), 'yyyy-MM-dd'), 
                      description: '', 
                      type: 'event' 
                    })
                  }}
                >
                  取消
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      
      <div className="space-y-1 max-h-48 overflow-y-auto">

        {/* 日程列表 */}
        {schedules.length === 0 ? (
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