"use client"

import React, { useState, useEffect, useCallback, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { TabsContent } from "@/components/ui/tabs"
import { Plus, Tag } from "lucide-react"
import { todosApi } from "@/lib/api"
import { cn } from "@/lib/utils"
import { Todo, TagContent, TodoTabProps } from "./types"
import { toast as showToast } from "@/components/ui/use-toast"

export function TodoTab({ user }: TodoTabProps) {
  const toast = showToast
  // 待办相关状态
  const [todos, setTodos] = useState<Todo[]>([])
  const [newTodo, setNewTodo] = useState("")
  const [newTodoPriority, setNewTodoPriority] = useState<'low' | 'medium' | 'high'>('medium')
  const [isAddingTodo, setIsAddingTodo] = useState(false)
  const [selectedTag, setSelectedTag] = useState("All")
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  // 加载待办数据
  const loadTodos = useCallback(async () => {
    try {
      const response = await todosApi.getAll()
      // 转换数据格式以匹配Todo类型
      const todosData = Array.isArray(response.data) ? response.data : 
        (response.data && typeof response.data === 'object' ? Object.values(response.data).flat() : [])
      const todos = todosData.map((item: any) => ({
        _id: item._id || item.id,
        id: item.id,
        text: item.text,
        completed: item.completed || false,
        priority: item.priority || 'medium',
        tags: Array.isArray(item.tags) ? item.tags : [],
        userId: item.userId || user?._id || '',
        createdAt: item.createdAt || new Date().toISOString(),
        updatedAt: item.updatedAt || new Date().toISOString()
      }))
      setTodos(todos)
    } catch (error) {
      console.error('Error loading todos:', error)
      toast({ title: "加载待办失败", variant: "destructive" })
    }
  }, [user, toast])

  useEffect(() => {
    if (user) {
      loadTodos()
    }
  }, [user, loadTodos])

  // 计算标签内容
  const tagContents = useMemo(() => {
    const tagCounts: { [key: string]: number } = {}
    todos.forEach(todo => {
      if (todo.tags && Array.isArray(todo.tags)) {
        todo.tags.forEach(tag => {
          tagCounts[tag] = (tagCounts[tag] || 0) + 1
        })
      }
    })
    
    const contents: TagContent[] = [
      { 
        _id: 'all',
        tag: 'All',
        name: "All", 
        count: todos.length,
        content: '',
        userId: user._id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ]
    
    Object.entries(tagCounts).forEach(([tag, count]) => {
      contents.push({ 
        _id: `tag-${tag}`,
        tag: tag,
        name: tag, 
        count,
        content: '',
        userId: user._id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })
    })
    
    return contents
  }, [todos])

  // 过滤待办
  const filteredTodos = useMemo(() => {
    if (selectedTag === "All") {
      return todos
    }
    return todos.filter(todo => 
      todo.tags && Array.isArray(todo.tags) && todo.tags.includes(selectedTag)
    )
  }, [todos, selectedTag])

  // 添加待办
  const handleAddTodo = async () => {
    if (!newTodo.trim()) return
    
    setIsAddingTodo(true)
    try {
      await todosApi.create({
        text: newTodo,
        priority: newTodoPriority,
        tags: []
      })
      setNewTodo("")
      setNewTodoPriority('medium')
      setIsDialogOpen(false)
      await loadTodos()
      toast({ title: "待办添加成功" })
    } catch (error) {
      console.error('Error adding todo:', error)
      toast({ title: "添加待办失败", variant: "destructive" })
    } finally {
      setIsAddingTodo(false)
    }
  }

  // 切换待办完成状态
  const toggleTodo = async (todoId: string) => {
    try {
      const todo = todos.find(t => t._id === todoId)
      if (!todo) return
      
      await todosApi.update(todoId, {
        ...todo,
        completed: !todo.completed
      })
      await loadTodos()
    } catch (error) {
      console.error('Error toggling todo:', error)
      toast({ title: "更新待办失败", variant: "destructive" })
    }
  }

  // 获取优先级颜色
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'border-l-red-500'
      case 'medium': return 'border-l-yellow-500'
      case 'low': return 'border-l-green-500'
      default: return 'border-l-gray-300'
    }
  }

  return (
    <TabsContent value="todo" className="h-full m-0 flex flex-col">
      {/* 固定的顶部区域 */}
      <div className="flex-shrink-0 p-4 space-y-4">
        {/* 顶部操作栏 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-medium">我的待办</h2>
            <span className="text-sm text-muted-foreground">({todos.length})</span>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="shrink-0">
                <Plus className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>添加待办事项</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <Input
                  placeholder="输入待办内容"
                  value={newTodo}
                  onChange={(e) => setNewTodo(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      handleAddTodo()
                    }
                  }}
                  autoFocus
                />
                <div className="space-y-2">
                  <label className="text-sm font-medium">优先级</label>
                  <Select value={newTodoPriority} onValueChange={(value: 'low' | 'medium' | 'high') => setNewTodoPriority(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">低优先级</SelectItem>
                      <SelectItem value="medium">中优先级</SelectItem>
                      <SelectItem value="high">高优先级</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2">
                  <Button 
                    onClick={handleAddTodo} 
                    disabled={isAddingTodo || !newTodo.trim()}
                    className="flex-1"
                  >
                    {isAddingTodo ? "添加中..." : "添加"}
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => {
                      setIsDialogOpen(false)
                      setNewTodo("")
                      setNewTodoPriority('medium')
                    }}
                  >
                    取消
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* 标签筛选 */}
        <div className="flex flex-wrap gap-2">
          {tagContents.map((tag) => (
            <Button
              key={tag.name}
              variant={selectedTag === tag.name ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedTag(tag.name)}
              className="text-xs"
            >
              <Tag className="h-3 w-3 mr-1" />
              {tag.name} ({tag.count})
            </Button>
          ))}
        </div>
      </div>

      {/* 可滚动的待办列表 */}
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {filteredTodos.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            {selectedTag === "All" ? "暂无待办事项" : `暂无"${selectedTag}"标签的待办事项`}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredTodos.map((todo) => (
              <div key={todo._id}>
                <div className="flex items-start gap-3 p-3">
                  <Checkbox
                    checked={todo.completed}
                    onCheckedChange={() => toggleTodo(todo._id)}
                    className="mt-1"
                  />
                  <div className="flex flex-1">
                    {/* 待办内容 */}
                    <div className="flex-1">
                      <div className={cn(
                        "text-sm border-l-4 pl-3",
                        getPriorityColor(todo.priority),
                        todo.completed && "line-through text-muted-foreground opacity-60"
                      )}>
                        {todo.text}
                      </div>
                    </div>
                    
                    {/* 标签 - 放在右侧 */}
                    {todo.tags && todo.tags.length > 0 && (
                      <div className="flex flex-col items-end gap-1 ml-2 min-w-[80px]">
                        {todo.tags.slice(0, 3).map((tag, index) => (
                          <Badge 
                            key={index} 
                            variant="outline" 
                            className="text-xs cursor-pointer hover:bg-muted bg-gray-100 dark:bg-gray-800 transition-colors"
                            onClick={() => setSelectedTag(tag)}
                          >
                            #{tag}
                          </Badge>
                        ))}
                        {todo.tags.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{todo.tags.length - 3}
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                
                {/* 分割线 */}
                <div className="border-b border-border/50 my-3" />
              </div>
            ))}
          </div>
        )}
      </div>
    </TabsContent>
  )
}