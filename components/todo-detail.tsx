"use client"

import React from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { X, Clock, Pause, Tag, Plus, Check, Trash2, Play, GripVertical } from "lucide-react"
import { cn } from "@/lib/utils"
import { Todo, Subtodo } from "@/lib/api"
import { useState } from "react"
// 使用原生HTML5拖拽API，不需要额外依赖

interface TodoDetailProps {
  todo: Todo | null;
  onClose: () => void;
  onToggleTodo: (todoId: string) => Promise<void>;
  // 计时器相关props
  isTimerRunning?: boolean;
  timerSeconds?: number;
  onStartTimer?: () => void;
  onPauseTimer?: () => void;
  formatTime?: (seconds: number) => string;
  onAddSubtodo?: (todoId: string, text: string) => void;
  onToggleSubtodo?: (todoId: string, subtodoId: string) => void;
  onDeleteSubtodo?: (todoId: string, subtodoId: string) => void;
  onReorderSubtodos?: (todoId: string, reorderedSubtodos: Subtodo[]) => void;
}

export function TodoDetail({ 
  todo, 
  onClose, 
  onToggleTodo,
  isTimerRunning = false,
  timerSeconds = 0,
  onStartTimer,
  onPauseTimer,
  formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  },
  onAddSubtodo,
  onToggleSubtodo,
  onDeleteSubtodo,
  onReorderSubtodos
}: TodoDetailProps) {
  const [newSubtodoText, setNewSubtodoText] = useState('')
  const [isAddingSubtodo, setIsAddingSubtodo] = useState(false)

  const handleAddSubtodo = () => {
    if (newSubtodoText.trim() && onAddSubtodo && todo) {
      onAddSubtodo(todo._id, newSubtodoText.trim())
      setNewSubtodoText('')
      setIsAddingSubtodo(false)
    }
  }

  const handleToggleSubtodo = (subtodoId: string) => {
    if (onToggleSubtodo && todo) {
      onToggleSubtodo(todo._id, subtodoId)
    }
  }

  const handleDeleteSubtodo = (subtodoId: string) => {
    if (onDeleteSubtodo && todo) {
      onDeleteSubtodo(todo._id, subtodoId)
    }
  }

  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)

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

  if (!todo) return null;

  const handleToggle = async () => {
    await onToggleTodo(todo._id);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-background rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        {/* 头部 */}
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold">待办详情</h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* 弹窗内容 */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-4">
            {/* Todo内容和标签在同一行 */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <h3 className="text-sm font-medium text-muted-foreground mb-2">内容</h3>
                <div className={cn(
                  "text-base p-3 bg-muted/30 rounded-md",
                  todo.completed ? "line-through text-muted-foreground" : "text-foreground"
                )}>
                  {todo.text}
                </div>
              </div>
              {/* 标签靠右排列 */}
              {todo.tags && todo.tags.length > 0 && (
                <div className="flex-shrink-0">
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">标签</h3>
                  <div className="flex flex-wrap gap-2 justify-end">
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
                </div>
              )}
            </div>

            {/* 子待办事项 */}
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">子待办事项</h3>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsAddingSubtodo(true)}
                  className="h-7 text-xs"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  添加
                </Button>
              </div>

              {/* 添加子待办事项输入框 */}
              {isAddingSubtodo && (
                <div className="mb-3 flex gap-2">
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

              {/* 子待办事项列表 */}
              <div className="space-y-2">
                {todo.subtodos && todo.subtodos.length > 0 ? (
                  todo.subtodos.map((subtodo, index) => (
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
          {(onStartTimer || onPauseTimer) && (
            <div className="flex items-center gap-3">
              <Button
                size="sm"
                variant={isTimerRunning ? "destructive" : "default"}
                onClick={isTimerRunning ? onPauseTimer : onStartTimer}
                className="h-8 w-8 p-0"
              >
                {isTimerRunning ? (
                  <Pause className="h-4 w-4" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
              </Button>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <span className="text-lg font-mono text-blue-900 dark:text-blue-100">
                  {formatTime(timerSeconds)}
                </span>
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