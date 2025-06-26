"use client"

import { useState, useEffect } from "react"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { Loader2, CheckCircle2, Circle, MoreHorizontal, ChevronUp, ChevronDown } from "lucide-react"
import { getTodosByDate, toggleTodo, type TodoItem } from "@/lib/actions-new"
import { todosApi } from "@/lib/api"
import { formatDateShort } from "@/lib/date-utils"
import { toast } from "@/hooks/use-toast"

interface TodoListProps {
  selectedDate: Date
}

interface TodoWithNote {
  noteId: string
  todo: TodoItem
}

export function TodoList({ selectedDate }: TodoListProps) {
  const [todos, setTodos] = useState<TodoWithNote[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const loadTodos = async () => {
    setIsLoading(true)
    try {
      const todosByNote: { noteId: string; todos: TodoItem[] }[] = await getTodosByDate(selectedDate.toISOString())
      const allTodos: TodoWithNote[] = []

      todosByNote.forEach(({ noteId, todos }: { noteId: string; todos: TodoItem[] }) => {
        todos.forEach((todo: TodoItem) => {
          allTodos.push({ noteId, todo })
        })
      })

      setTodos(allTodos)
    } catch (error) {
      toast({
        title: "加载失败",
        description: "无法加载Todo列表",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleToggleTodo = async (noteId: string, todoId: string) => {
    try {
      const result = await toggleTodo(noteId, todoId)
      if (result.success) {
        // 更新本地状态
        setTodos((prevTodos) =>
          prevTodos.map((item) =>
            item.todo.id === todoId ? { ...item, todo: { ...item.todo, completed: !item.todo.completed } } : item,
          ),
        )
      } else {
        toast({
          title: "更新失败",
          description: result.error || "未知错误",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "更新失败",
        description: "网络错误，请重试",
        variant: "destructive",
      })
    }
  }

  const handleUpdatePriority = async (noteId: string, todoId: string, priority: 'low' | 'medium' | 'high') => {
    try {
      // 更新本地状态
      setTodos((prevTodos) =>
        prevTodos.map((item) =>
          item.todo.id === todoId ? { ...item, todo: { ...item.todo, priority } } : item,
        ),
      )
      
      toast({
        title: "优先级已更新",
        description: `已设置为${priority === 'high' ? '高' : priority === 'medium' ? '中' : '低'}优先级`,
      })
    } catch (error) {
      toast({
        title: "更新失败",
        description: "网络错误，请重试",
        variant: "destructive",
      })
    }
  }

  const handleReorderTodo = async (noteId: string, todoId: string, direction: 'up' | 'down') => {
    try {
      const result = await todosApi.reorder(todoId, direction)
      if (result.success) {
        // 重新加载todos以获取最新的排序
        await loadTodos()
        toast({
          title: "排序已更新",
          description: `待办事项已${direction === 'up' ? '上移' : '下移'}`,
        })
      } else {
        toast({
          title: "排序失败",
          description: result.error || "未知错误",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "排序失败",
        description: "网络错误，请重试",
        variant: "destructive",
      })
    }
  }

  useEffect(() => {
    loadTodos()
  }, [selectedDate])

  // 按优先级排序todos
  const sortedTodos = todos.sort((a, b) => {
    const priorityOrder = { high: 3, medium: 2, low: 1 }
    const aPriority = a.todo.priority || 'medium'
    const bPriority = b.todo.priority || 'medium'
    return priorityOrder[bPriority] - priorityOrder[aPriority]
  })

  // 获取优先级对应的透明度
  const getPriorityOpacity = (priority: 'low' | 'medium' | 'high' | undefined) => {
    switch (priority) {
      case 'high':
        return 'opacity-100'
      case 'medium':
        return 'opacity-50'
      case 'low':
        return 'opacity-25'
      default:
        return 'opacity-50' // 默认中等优先级
    }
  }

  // 获取优先级显示文本
  const getPriorityText = (priority: 'low' | 'medium' | 'high' | undefined) => {
    switch (priority) {
      case 'high':
        return '高优先级'
      case 'medium':
        return '中优先级'
      case 'low':
        return '低优先级'
      default:
        return '中优先级'
    }
  }

  const completedCount = todos.filter((item) => item.todo.completed).length
  const totalCount = todos.length

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-medium text-sm">Todo 列表</h3>
        <div className="text-xs text-muted-foreground">
          {completedCount}/{totalCount}
        </div>
      </div>

      <div className="text-xs text-muted-foreground mb-2">{formatDateShort(selectedDate)}</div>

      {isLoading ? (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
          <span className="text-sm">加载中...</span>
        </div>
      ) : sortedTodos.length > 0 ? (
        <ScrollArea className="h-48">
          <div className="space-y-2">
            {sortedTodos.map((item) => (
              <div
                key={`${item.noteId}-${item.todo.id}`}
                className={`flex items-start space-x-2 p-2 rounded-md hover:bg-muted/50 transition-colors ${getPriorityOpacity(item.todo.priority)}`}
              >
                <Checkbox
                  id={item.todo.id}
                  checked={item.todo.completed}
                  onCheckedChange={() => handleToggleTodo(item.noteId, item.todo.id)}
                  className="mt-0.5"
                />
                <label
                  className={`text-sm flex-1 ${
                    item.todo.completed ? "line-through text-muted-foreground" : "text-foreground"
                  }`}
                >
                  {item.todo.content}
                </label>
                <div className="flex items-center space-x-1">
                  {item.todo.completed ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5" />
                  ) : (
                    <Circle className="h-4 w-4 text-muted-foreground mt-0.5" />
                  )}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                        <MoreHorizontal className="h-3 w-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => handleReorderTodo(item.noteId, item.todo.id, 'up')}
                      >
                        <ChevronUp className="h-4 w-4 mr-2" />
                        上移
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleReorderTodo(item.noteId, item.todo.id, 'down')}
                      >
                        <ChevronDown className="h-4 w-4 mr-2" />
                        下移
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleUpdatePriority(item.noteId, item.todo.id, 'high')}
                        className={item.todo.priority === 'high' ? 'bg-accent' : ''}
                      >
                        高优先级
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleUpdatePriority(item.noteId, item.todo.id, 'medium')}
                        className={item.todo.priority === 'medium' || !item.todo.priority ? 'bg-accent' : ''}
                      >
                        中优先级
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleUpdatePriority(item.noteId, item.todo.id, 'low')}
                        className={item.todo.priority === 'low' ? 'bg-accent' : ''}
                      >
                        低优先级
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      ) : (
        <div className="text-center py-4 text-sm text-muted-foreground">
          当前日期没有Todo项
          <div className="text-xs mt-1">在笔记中使用 #todo 标签来创建Todo</div>
        </div>
      )}

      {totalCount > 0 && (
        <div className="mt-3 pt-2 border-t">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>进度</span>
            <span>{Math.round((completedCount / totalCount) * 100)}%</span>
          </div>
          <div className="w-full bg-muted rounded-full h-1.5 mt-1">
            <div
              className="bg-primary h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${(completedCount / totalCount) * 100}%` }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
