"use client"

import { useState, useEffect } from "react"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Loader2, CheckCircle2, Circle } from "lucide-react"
import { getTodosByDate, toggleTodo, type TodoItem } from "@/lib/actions"
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
      const todosByNote = await getTodosByDate(selectedDate.toISOString())
      const allTodos: TodoWithNote[] = []

      todosByNote.forEach(({ noteId, todos }) => {
        todos.forEach((todo) => {
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

  useEffect(() => {
    loadTodos()
  }, [selectedDate])

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
      ) : todos.length > 0 ? (
        <ScrollArea className="h-48">
          <div className="space-y-2">
            {todos.map((item) => (
              <div
                key={`${item.noteId}-${item.todo.id}`}
                className="flex items-start space-x-2 p-2 rounded-md hover:bg-muted/50 transition-colors"
              >
                <Checkbox
                  id={item.todo.id}
                  checked={item.todo.completed}
                  onCheckedChange={() => handleToggleTodo(item.noteId, item.todo.id)}
                  className="mt-0.5"
                />
                <label
                  htmlFor={item.todo.id}
                  className={`text-sm flex-1 cursor-pointer ${
                    item.todo.completed ? "line-through text-muted-foreground" : "text-foreground"
                  }`}
                >
                  {item.todo.content}
                </label>
                {item.todo.completed ? (
                  <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5" />
                ) : (
                  <Circle className="h-4 w-4 text-muted-foreground mt-0.5" />
                )}
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
