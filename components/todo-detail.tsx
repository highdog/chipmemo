"use client"

import React from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { X, Clock, Pause, Tag } from "lucide-react"
import { cn } from "@/lib/utils"

interface TodoDetailProps {
  todo: {
    id: string;
    content: string;
    completed: boolean;
    tags: string[];
    startDate?: string;
    dueDate?: string;
  } | null;
  onClose: () => void;
  onToggleTodo: (todoId: string) => Promise<void>;
  // 计时器相关props
  isTimerRunning?: boolean;
  timerSeconds?: number;
  onStartTimer?: () => void;
  onPauseTimer?: () => void;
  formatTime?: (seconds: number) => string;
}

export function TodoDetail({ 
  todo, 
  onClose, 
  onToggleTodo,
  isTimerRunning = false,
  timerSeconds = 0,
  onStartTimer,
  onPauseTimer,
  formatTime
}: TodoDetailProps) {
  if (!todo) return null;

  const handleToggle = async () => {
    await onToggleTodo(todo.id);
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
            {/* 标签 */}
            {todo.tags.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-2">标签</h3>
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
              </div>
            )}

            {/* Todo内容 */}
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-2">内容</h3>
              <div className={cn(
                "text-base p-3 bg-muted/30 rounded-md",
                todo.completed ? "line-through text-muted-foreground" : "text-foreground"
              )}>
                {todo.content}
              </div>
            </div>

            {/* 正计时按钮 */}
            {(onStartTimer && onPauseTimer && formatTime) && (
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-2">计时</h3>
                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    className="flex items-center gap-2"
                    onClick={() => {
                      if (isTimerRunning) {
                        onPauseTimer()
                      } else {
                        onStartTimer()
                      }
                    }}
                  >
                    {isTimerRunning ? (
                      <>
                        <Pause className="h-4 w-4" />
                        暂停计时
                      </>
                    ) : (
                      <>
                        <Clock className="h-4 w-4" />
                        开始计时
                      </>
                    )}
                  </Button>
                  {timerSeconds > 0 && (
                    <div className="text-lg font-mono font-semibold text-foreground">
                      {formatTime(timerSeconds)}
                    </div>
                  )}
                </div>
              </div>
            )}

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
        <div className="flex items-center justify-end gap-2 p-4 border-t">
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
                : "bg-green-500 hover:bg-green-600"
            )}
          >
            {todo.completed ? "标记为未完成" : "标记为已完成"}
          </Button>
        </div>
      </div>
    </div>
  );
}