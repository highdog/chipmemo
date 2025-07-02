"use client"

import React from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { X, Clock, Pause, Tag, Plus, Check, Trash2, Play, GripVertical, RotateCcw, Edit, Save } from "lucide-react"
import { cn } from "@/lib/utils"
import { Todo, Subtodo } from "@/lib/api"
import { useState, useEffect, useCallback, useMemo, useRef } from "react"

// 使用原生HTML5拖拽API，不需要额外依赖

// 计时器状态枚举
enum TimerState {
  STOPPED = 'stopped',
  RUNNING = 'running',
  PAUSED = 'paused'
}

// 自定义 Hook：管理计时器逻辑
const useTimer = (todo: Todo | null) => {
  const [, forceUpdate] = useState(0)
  const [error, setError] = useState<string | null>(null)

  // 计算当前显示的时间
  const getDisplayTime = useCallback(() => {
    try {
      // 如果没有todo对象，返回0
      if (!todo) {
        return 0
      }
      
      // 如果没有timer对象但有todo，检查是否有timer数据
      if (!todo.timer) {
        return 0
      }
      
      // 确保 totalSeconds 有默认值，使用 ?? 而不是 ||
      const totalSeconds = todo.timer.totalSeconds ?? 0
      
      // 验证 totalSeconds 是否为有效数字
      if (typeof totalSeconds !== 'number' || isNaN(totalSeconds)) {
        console.warn('Invalid totalSeconds value:', totalSeconds)
        return 0
      }
      
      // 如果计时器正在运行且有开始时间，计算经过的时间
      if (todo.timer.isRunning && todo.timer.startTime) {
        const startTime = new Date(todo.timer.startTime).getTime()
        
        // 验证开始时间是否有效
        if (isNaN(startTime)) {
          console.warn('Invalid startTime value:', todo.timer.startTime)
          return totalSeconds
        }
        
        const now = Date.now()
        const elapsedSeconds = Math.floor((now - startTime) / 1000)
        // 确保 elapsedSeconds 不为负数，防止时间异常
        return totalSeconds + Math.max(0, elapsedSeconds)
      }
      
      // 计时器未运行时，直接返回累计时间
      return totalSeconds
    } catch (err) {
      console.error('Error calculating display time:', err)
      setError('计时器计算错误')
      return 0
    }
  }, [todo, todo?.timer])

  // 获取计时器状态
  const getTimerState = useCallback((): TimerState => {
    if (!todo?.timer) return TimerState.STOPPED
    return todo.timer.isRunning ? TimerState.RUNNING : TimerState.PAUSED
  }, [todo?.timer])

  // 实时更新计时器显示
  useEffect(() => {
    if (!todo?.timer?.isRunning) return

    const interval = setInterval(() => {
      try {
        forceUpdate(prev => prev + 1)
      } catch (err) {
        console.error('Error updating timer:', err)
        setError('计时器更新错误')
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [todo?.timer?.isRunning])

  // 清除错误状态
  useEffect(() => {
    if (error) {
      const timeout = setTimeout(() => setError(null), 5000)
      return () => clearTimeout(timeout)
    }
  }, [error])

  return {
    displayTime: getDisplayTime(),
    timerState: getTimerState(),
    isRunning: todo?.timer?.isRunning ?? false,
    error
  }
}

interface TodoDetailProps {
  todo: Todo | null;
  onClose: () => void;
  onToggleTodo: (todoId: string, timeRecord?: string) => Promise<void>;
  // 计时器相关props
  onStartTimer?: (todoId: string) => void;
  onPauseTimer?: (todoId: string) => void;
  onResetTimer?: (todoId: string) => void;
  formatTime?: (seconds: number) => string;
  onAddSubtodo?: (todoId: string, text: string) => void;
  onToggleSubtodo?: (todoId: string, subtodoId: string) => void;
  onDeleteSubtodo?: (todoId: string, subtodoId: string) => void;
  onReorderSubtodos?: (todoId: string, reorderedSubtodos: Subtodo[]) => void;
  // 编辑相关props
  onUpdateTodo?: (todoId: string, updates: { content?: string; text?: string }) => Promise<void>;
}

export function TodoDetail({ 
  todo, 
  onClose, 
  onToggleTodo,
  onStartTimer,
  onPauseTimer,
  onResetTimer,
  formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  },
  onAddSubtodo,
  onToggleSubtodo,
  onDeleteSubtodo,
  onReorderSubtodos,
  onUpdateTodo
}: TodoDetailProps) {
  const [newSubtodoText, setNewSubtodoText] = useState('')
  const [isAddingSubtodo, setIsAddingSubtodo] = useState(false)
  
  // 编辑相关状态
  const [isEditingContent, setIsEditingContent] = useState(false)
  const [editContent, setEditContent] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const editAreaRef = useRef<HTMLDivElement>(null)
  
  // 使用自定义 Hook 管理计时器逻辑
  const { displayTime, timerState, isRunning, error } = useTimer(todo)

  // 使用 useMemo 优化子待办事项列表
  const subtodosList = useMemo(() => {
    return todo?.subtodos || []
  }, [todo?.subtodos])

  // 使用 useMemo 优化计时器按钮文本
  const timerButtonText = useMemo(() => {
    return isRunning ? '暂停' : '开始'
  }, [isRunning])

  // 初始化编辑内容
  useEffect(() => {
    if (todo && isEditingContent) {
      setEditContent(todo.content || '')
    }
  }, [todo, isEditingContent])
  
  // 点击外部区域自动保存
  useEffect(() => {
    if (!isEditingContent) return
    
    const handleClickOutside = (event: MouseEvent) => {
      if (editAreaRef.current && !editAreaRef.current.contains(event.target as Node)) {
        handleSaveContent()
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isEditingContent, editContent])
  
  // 开始编辑内容
  const handleStartEditContent = () => {
    if (todo) {
      setEditContent(todo.content || '')
      setIsEditingContent(true)
    }
  }
  
  // 保存编辑内容
  const handleSaveContent = async () => {
    if (!todo || !onUpdateTodo) return
    
    setIsSaving(true)
    try {
      await onUpdateTodo(todo._id, { content: editContent.trim() })
      setIsEditingContent(false)
    } catch (error) {
      console.error('保存内容失败:', error)
    } finally {
      setIsSaving(false)
    }
  }
  
  // 取消编辑内容
  const handleCancelEditContent = () => {
    setIsEditingContent(false)
    setEditContent('')
  }

  // 所有 useCallback hooks 必须在条件返回之前定义
  const handleAddSubtodo = useCallback(() => {
    if (newSubtodoText.trim() && onAddSubtodo && todo) {
      onAddSubtodo(todo._id, newSubtodoText.trim())
      setNewSubtodoText('')
      setIsAddingSubtodo(false)
    }
  }, [newSubtodoText, onAddSubtodo, todo])

  const handleToggleSubtodo = useCallback((subtodoId: string) => {
    if (onToggleSubtodo && todo) {
      onToggleSubtodo(todo._id, subtodoId)
    }
  }, [onToggleSubtodo, todo])

  const handleDeleteSubtodo = useCallback((subtodoId: string) => {
    if (onDeleteSubtodo && todo) {
      onDeleteSubtodo(todo._id, subtodoId)
    }
  }, [onDeleteSubtodo, todo])

  // 拖拽相关状态
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)

  // 拖拽处理函数
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    setDragOverIndex(index)
  }

  const handleDragLeave = () => {
    setDragOverIndex(null)
  }

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault()
    
    if (draggedIndex === null || !todo || !onReorderSubtodos) {
      return
    }

    const items = Array.from(todo.subtodos || [])
    const [reorderedItem] = items.splice(draggedIndex, 1)
    items.splice(dropIndex, 0, reorderedItem)

    // 更新order字段
    const reorderedSubtodos = items.map((item, index) => ({
      ...item,
      order: index
    }))

    onReorderSubtodos(todo._id, reorderedSubtodos)
    setDraggedIndex(null)
    setDragOverIndex(null)
  }

  const handleDragEnd = () => {
    setDraggedIndex(null)
    setDragOverIndex(null)
  }

  const handleToggle = async () => {
    if (!todo) return
    
    // 如果待办事项有计时记录且大于0秒，在完成时需要传递计时信息
    if (!todo.completed && todo.timer && todo.timer.totalSeconds && todo.timer.totalSeconds > 0) {
      // 计算用时记录
      const totalSeconds = todo.timer.totalSeconds
      const hours = Math.floor(totalSeconds / 3600)
      const minutes = Math.floor((totalSeconds % 3600) / 60)
      const finalSeconds = totalSeconds % 60
      
      let timeRecord = ''
      if (hours > 0) {
        timeRecord = `用时${hours}小时${minutes}分`
      } else if (minutes > 0) {
        timeRecord = `用时${minutes}分`
      } else {
        timeRecord = `用时${finalSeconds}秒`
      }
      
      // 将计时信息传递给父组件
      await onToggleTodo(todo._id, timeRecord);
    } else {
      await onToggleTodo(todo._id);
    }
    onClose();
  }

  // 如果没有todo数据，不渲染任何内容
  if (!todo) {
    return null
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="bg-background rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>


        {/* 弹窗内容 */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-4">
            {/* 待办事项标题和标签 */}
            <div className="flex items-center justify-between mb-4">
              <h2 className={cn(
                "text-base font-semibold",
                todo.completed && "line-through text-gray-500"
              )}>
                待办事项：{todo.text}
              </h2>
              {/* 标签 */}
              {todo.tags && todo.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {todo.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-2 py-1 rounded text-sm bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                    >
                      <Tag className="h-3 w-3 mr-1" />
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* 待办事项内容 */}
            <div className="mb-6">
              
              {isEditingContent ? (
                <div ref={editAreaRef} className="space-y-2">
                  <Textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    placeholder="添加待办事项的详细内容..."
                    className="min-h-[100px] resize-none"
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={handleSaveContent}
                      disabled={isSaving}
                      className="h-7 px-3 text-xs"
                    >
                      {isSaving ? (
                        <>
                          <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin mr-1" />
                          保存中
                        </>
                      ) : (
                        <>
                          <Save className="w-3 h-3 mr-1" />
                          保存
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCancelEditContent}
                      disabled={isSaving}
                      className="h-7 px-3 text-xs"
                    >
                      取消
                    </Button>
                  </div>
                </div>
              ) : (
                <div 
                  className="bg-gray-50 rounded-lg p-3 min-h-[60px] cursor-pointer hover:bg-gray-100 transition-colors"
                  onDoubleClick={handleStartEditContent}
                >
                  {todo.content ? (
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{todo.content}</p>
                  ) : (
                    <p className="text-sm text-gray-400 italic">双击添加内容...</p>
                  )}
                </div>
              )}
            </div>



            {/* 子待办事项 */}
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">

              {/* 子待办事项列表 */}
              <div className="space-y-2 mb-4">
                {subtodosList.length > 0 ? (
                  subtodosList.map((subtodo, index) => (
                    <div
                      key={subtodo._id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, index)}
                      onDragOver={(e) => handleDragOver(e, index)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, index)}
                      onDragEnd={handleDragEnd}
                      className={cn(
                        "flex items-center gap-3 p-2 bg-white dark:bg-gray-700 rounded-md border border-gray-200 dark:border-gray-600 cursor-move transition-all",
                        draggedIndex === index && "opacity-50",
                        dragOverIndex === index && "border-blue-400 bg-blue-50 dark:bg-blue-900/30"
                      )}
                    >
                      <div
                        className="flex-shrink-0 p-1 text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing"
                      >
                        <GripVertical className="h-3 w-3" />
                      </div>
                      <button
                        onClick={() => handleToggleSubtodo(subtodo._id)}
                        className={cn(
                          "flex-shrink-0 w-4 h-4 rounded border-2 flex items-center justify-center transition-colors",
                          subtodo.completed
                            ? "bg-black border-black text-white"
                            : "border-gray-300 dark:border-gray-500 hover:border-black"
                        )}
                      >
                        {subtodo.completed && <Check className="h-3 w-3" />}
                      </button>
                      <span
                        className={cn(
                          "flex-1 text-sm",
                          subtodo.completed
                            ? "line-through text-gray-500 dark:text-gray-400"
                            : "text-gray-900 dark:text-gray-100"
                        )}
                      >
                        {subtodo.text}
                      </span>
                      <button
                        onClick={() => handleDeleteSubtodo(subtodo._id)}
                        className="flex-shrink-0 p-1 text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-2">
                    暂无子待办事项
                  </p>
                )}
              </div>

              {/* 添加子待办事项输入框 */}
              {isAddingSubtodo && (
                <div className="mb-4 flex gap-2">
                  <input
                    type="text"
                    value={newSubtodoText}
                    onChange={(e) => setNewSubtodoText(e.target.value)}
                    placeholder="输入子待办事项..."
                    className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        handleAddSubtodo()
                      } else if (e.key === 'Escape') {
                        setIsAddingSubtodo(false)
                        setNewSubtodoText('')
                      }
                    }}
                    autoFocus
                  />
                  <Button size="sm" onClick={handleAddSubtodo} className="h-8">
                    <Check className="h-3 w-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setIsAddingSubtodo(false)
                      setNewSubtodoText('')
                    }}
                    className="h-8"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              )}

              {/* 添加按钮 - 居中显示 */}
              <div className="flex justify-center">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsAddingSubtodo(true)}
                  className="h-7 text-xs"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  添加子待办事项
                </Button>
              </div>
            </div>

            {/* 日期信息 */}
            {(todo.startDate || todo.dueDate) && (
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-2">日期</h3>
                <div className="space-y-2">
                  {todo.startDate && (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-muted-foreground">开始日期:</span>
                      <span className="font-medium">
                        {new Date(todo.startDate).toLocaleDateString('zh-CN', { 
                          year: 'numeric', 
                          month: '2-digit', 
                          day: '2-digit' 
                        })}
                      </span>
                    </div>
                  )}
                  {todo.dueDate && (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-muted-foreground">截止日期:</span>
                      <span className="font-medium">
                        {new Date(todo.dueDate).toLocaleDateString('zh-CN', { 
                          year: 'numeric', 
                          month: '2-digit', 
                          day: '2-digit' 
                        })}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 弹窗底部操作按钮 */}
        <div className="flex items-center justify-between p-4 border-t">
          {/* 计时器按钮 */}
          {(onStartTimer || onPauseTimer) && todo && (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                {onResetTimer && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onResetTimer(todo._id)}
                    className="h-8 w-8 p-0 rounded-full border border-gray-300 hover:bg-gray-100"
                    title="重置计时器"
                  >
                    <RotateCcw className="h-4 w-4 text-black" />
                  </Button>
                )}
                <Button
                  size="sm"
                  onClick={() => {
                    if (todo.timer?.isRunning) {
                      onPauseTimer?.(todo._id)
                    } else {
                      onStartTimer?.(todo._id)
                    }
                  }}
                  className="h-8 w-8 p-0 rounded-full bg-black hover:bg-gray-800 text-white border-0"
                >
                  {todo.timer?.isRunning ? (
                    <Pause className="h-4 w-4 fill-white" />
                  ) : (
                    <Play className="h-4 w-4 fill-white" />
                  )}
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600 dark:text-gray-400">计时：</span>
                <span className="text-lg font-mono text-black dark:text-black">
                  {formatTime(displayTime)}
                </span>
                {error && (
                  <span className="text-xs text-red-500 ml-2">
                    {error}
                  </span>
                )}
              </div>
            </div>
          )}
          
          {/* 右侧操作按钮 */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={onClose}
            >
              关闭
            </Button>
            <Button
                onClick={handleToggle}
                className={cn(
                  todo.completed 
                    ? "bg-orange-500 hover:bg-orange-600" 
                    : "bg-black hover:bg-gray-800 text-white"
                )}
              >
                {todo.completed ? "标记为未完成" : "标记为已完成"}
              </Button>
          </div>
        </div>
      </div>
    </div>
  );
}