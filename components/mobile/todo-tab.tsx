"use client"

import React, { useState, useEffect, useCallback, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { TabsContent } from "@/components/ui/tabs"
import { Plus, Tag, Trash2 } from "lucide-react"
import { todosApi, notesApi } from "@/lib/api"
import { cn } from "@/lib/utils"
import { Todo, TagContent } from "./types"
import { toast as showToast } from "@/components/ui/use-toast"

// 提取标签和清理内容的函数
const extractTagsAndCleanContent = (content: string): { cleanContent: string; tags: string[] } => {
  const tagRegex = /#([\u4e00-\u9fa5\w]+)/g
  const tags: string[] = []
  let match
  
  while ((match = tagRegex.exec(content)) !== null) {
    tags.push(match[1])
  }
  
  const cleanContent = content.replace(tagRegex, '').trim()
  return { cleanContent, tags }
}

interface TodoTabProps {
  user: any;
  theme?: string;
  triggerAdd?: boolean;
  onAddTriggered?: () => void;
}

export function TodoTab({ user, theme, triggerAdd = false, onAddTriggered }: TodoTabProps) {
  const toast = showToast
  // 待办相关状态
  const [todos, setTodos] = useState<Todo[]>([])
  const [newTodo, setNewTodo] = useState("")
  const [newTodoContent, setNewTodoContent] = useState("")
  const [newTodoPriority, setNewTodoPriority] = useState<'low' | 'medium' | 'high' | 'none'>('medium')
  const [isAddingTodo, setIsAddingTodo] = useState(false)
  const [selectedTag, setSelectedTag] = useState("All")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedTodoId, setSelectedTodoId] = useState<string | null>(null)
  const [isDeletingTodo, setIsDeletingTodo] = useState(false)

  // 加载待办数据
  const loadTodos = useCallback(async () => {
    try {
      const response = await todosApi.getAll()
      // 转换数据格式以匹配Todo类型，确保与网页端一致
      if (response.success && response.data && response.data.todos) {
        const todos = response.data.todos.map((item: any) => ({
          _id: item._id,
          id: item._id, // 使用_id作为id
          text: item.text,
          content: item.content || '', // 确保包含content字段
          completed: item.completed || false,
          priority: item.priority || 'medium',
          tags: Array.isArray(item.tags) ? item.tags : [],
          userId: item.userId || user?._id || '',
          createdAt: item.createdAt || new Date().toISOString(),
          updatedAt: item.updatedAt || new Date().toISOString()
        }))
        setTodos(todos)
      } else {
        setTodos([])
      }
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

  // 监听外部触发的添加操作
  useEffect(() => {
    if (triggerAdd) {
      setIsDialogOpen(true)
      onAddTriggered?.()
    }
  }, [triggerAdd, onAddTriggered])

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
    
    // 将标签按照数量排序（数量多的在前面）
    const sortedTagEntries = Object.entries(tagCounts).sort(([, countA], [, countB]) => countB - countA)
    
    sortedTagEntries.forEach(([tag, count]) => {
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

  // 过滤和排序待办
  const filteredTodos = useMemo(() => {
    let filtered = todos
    if (selectedTag !== "All") {
      filtered = todos.filter(todo => 
        todo.tags && Array.isArray(todo.tags) && todo.tags.includes(selectedTag)
      )
    }
    
    // 根据优先级排序：high > medium > low > none
    const priorityOrder: Record<'high' | 'medium' | 'low' | 'none', number> = { 'high': 4, 'medium': 3, 'low': 2, 'none': 1 }
    return filtered.sort((a, b) => {
      const aPriority = priorityOrder[a.priority || 'medium'] || 3
      const bPriority = priorityOrder[b.priority || 'medium'] || 3
      return bPriority - aPriority
    })
  }, [todos, selectedTag])

  // 添加待办
  const handleAddTodo = async () => {
    if (!newTodo.trim()) return
    
    setIsAddingTodo(true)
    try {
      // 解析输入内容中的标签
      const { cleanContent, tags } = extractTagsAndCleanContent(newTodo.trim())
      
      // 验证：如果优先级为'none'且没有标签，则不能提交
      if (newTodoPriority === 'none' && tags.length === 0) {
        toast({ title: "优先级为无时，必须添加至少一个标签", variant: "destructive" })
        setIsAddingTodo(false)
        return
      }
      
      await todosApi.create({
        text: cleanContent,
        content: newTodoContent.trim(),
        priority: newTodoPriority,
        tags: tags
      })
      setNewTodo("")
      setNewTodoContent("")
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
      
      // 如果todo从未完成变为完成，则删除todo并创建笔记
      if (!todo.completed) {
        // 创建笔记内容，包含原todo的标题和标签
        const noteContent = todo.text + (todo.tags && todo.tags.length > 0 ? ' ' + todo.tags.map((tag: string) => `#${tag}`).join(' ') : '')
        
        // 为完成的待办事项自动添加'todo'标签
        const noteTags = [...(todo.tags || [])]
        if (!noteTags.includes('todo')) {
          noteTags.push('todo')
        }
        
        // 调用notesApi创建新笔记
         const result = await notesApi.create({
           title: todo.text.length > 50 ? todo.text.substring(0, 50) + '...' : todo.text,
           content: noteContent,
           tags: noteTags
         })
        
        if (result.success) {
          // 创建笔记成功后，删除待办
          const deleteResult = await todosApi.delete(todoId)
          if (deleteResult.success) {
            // 重新加载todos数据
            await loadTodos()
            toast({ title: "待办已完成并转换为笔记" })
          } else {
            toast({ title: "笔记已创建，但删除待办失败", variant: "destructive" })
          }
        } else {
          toast({ title: "创建笔记失败", variant: "destructive" })
        }
      } else {
        // 如果是从完成变为未完成，调用API切换状态
        await todosApi.update(todoId, {
          ...todo,
          completed: !todo.completed
        })
        await loadTodos()
        toast({ title: "待办状态已更新" })
      }
    } catch (error) {
      console.error('Error toggling todo:', error)
      toast({ title: "更新待办失败", variant: "destructive" })
    }
  }

  // 删除待办
  const deleteTodo = async (todoId: string) => {
    setIsDeletingTodo(true)
    try {
      await todosApi.delete(todoId)
      await loadTodos()
      setSelectedTodoId(null)
      toast({ title: "待办删除成功" })
    } catch (error) {
      console.error('Error deleting todo:', error)
      toast({ title: "删除待办失败", variant: "destructive" })
    } finally {
      setIsDeletingTodo(false)
    }
  }

  // 处理待办事项点击
  const handleTodoClick = (todoId: string) => {
    if (selectedTodoId === todoId) {
      setSelectedTodoId(null)
    } else {
      setSelectedTodoId(todoId)
    }
  }

  // 获取优先级勾选框颜色
  const getPriorityCheckboxColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'border-red-500 data-[state=checked]:bg-red-500 data-[state=checked]:border-red-500'
      case 'medium': return 'data-[state=checked]:border-[#EAB30A]' + ' border-[#EAB30A] data-[state=checked]:bg-[#EAB30A]'
      case 'low': return 'border-green-500 data-[state=checked]:bg-green-500 data-[state=checked]:border-green-500'
      case 'none': return 'border-gray-300 data-[state=checked]:bg-gray-400 data-[state=checked]:border-gray-400'
      default: return 'border-gray-300 data-[state=checked]:bg-gray-500 data-[state=checked]:border-gray-500'
    }
  }

  return (
    <TabsContent value="todo" className="h-full m-0 flex flex-col">
      {/* 固定的顶部区域 */}
      <div className="flex-shrink-0 p-4 space-y-4">
        {/* 顶部操作栏 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogContent className="sm:max-w-md fixed top-36 left-1/2 transform -translate-x-1/2">
              <DialogHeader>
                <DialogTitle>添加待办事项</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">标题</label>
                  <Textarea
                    placeholder="输入待办标题"
                    value={newTodo}
                    onChange={(e) => setNewTodo(e.target.value)}
                    className="min-h-[60px] resize-none"
                    autoFocus
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">内容</label>
                  <Textarea
                    placeholder="输入待办详细内容（可选）"
                    value={newTodoContent}
                    onChange={(e) => setNewTodoContent(e.target.value)}
                    className="min-h-[80px] resize-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">优先级</label>
                  <div className="flex gap-2">
                    <Button
                      variant={newTodoPriority === 'low' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setNewTodoPriority('low')}
                      className={cn(
                        "flex-1",
                        newTodoPriority === 'low' && "bg-green-500 hover:bg-green-600 text-white"
                      )}
                    >
                      低
                    </Button>
                    <Button
                      variant={newTodoPriority === 'medium' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setNewTodoPriority('medium')}
                      className={cn(
                        "flex-1",
                        newTodoPriority === 'medium' && "text-white"
                      )}
                      style={newTodoPriority === 'medium' ? { backgroundColor: '#EAB30A', borderColor: '#EAB30A' } : {}}
                    >
                      中
                    </Button>
                    <Button
                      variant={newTodoPriority === 'high' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setNewTodoPriority('high')}
                      className={cn(
                        "flex-1",
                        newTodoPriority === 'high' && "bg-red-500 hover:bg-red-600 text-white"
                      )}
                    >
                      高
                    </Button>
                    <Button
                      variant={newTodoPriority === 'none' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setNewTodoPriority('none')}
                      className={cn(
                        "flex-1",
                        newTodoPriority === 'none' && "bg-gray-500 hover:bg-gray-600 text-white"
                      )}
                    >
                      无
                    </Button>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button 
                    onClick={handleAddTodo} 
                    disabled={isAddingTodo || !newTodo.trim() || (newTodoPriority === 'none' && !/#[^\s#]+/.test(newTodo))}
                    className="flex-1"
                  >
                    {isAddingTodo ? "添加中..." : "添加"}
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => {
                      setIsDialogOpen(false)
                      setNewTodo("")
                      setNewTodoContent("")
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
        <div className="flex flex-wrap gap-1">
          {tagContents.map((tag) => (
            <Button
              key={tag.name}
              variant={selectedTag === tag.name ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedTag(tag.name)}
              className="text-xs px-2 py-1"
            >
              {tag.name}
            </Button>
          ))}
        </div>
      </div>

      {/* 可滚动的待办列表 */}
      <div className="flex-1 overflow-y-auto px-4 pb-4 scrollable-area">
        {filteredTodos.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            {selectedTag === "All" ? "暂无待办事项" : `暂无"${selectedTag}"标签的待办事项`}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredTodos.map((todo) => (
              <div key={todo._id}>
                <div 
                  className="flex items-start gap-3 p-3 cursor-pointer hover:bg-muted/50 transition-colors rounded-lg"
                  onClick={() => handleTodoClick(todo._id)}
                >
                  <Checkbox
                    checked={todo.completed}
                    onCheckedChange={() => toggleTodo(todo._id)}
                    onClick={(e) => e.stopPropagation()}
                    className={cn(
                      "mt-1 border-2",
                      getPriorityCheckboxColor(todo.priority || 'medium')
                    )}
                  />
                  
                  <div className="flex flex-1">
                    {/* 待办内容 */}
                    <div className="flex-1">
                      <div className={cn(
                        "text-sm",
                        todo.completed && "line-through text-muted-foreground opacity-60"
                      )}>
                        {todo.text}
                      </div>
                    </div>
                    
                    {/* 标签 - 放在右侧 */}
                    {todo.tags && todo.tags.length > 0 && (
                      <div className="flex flex-col items-end gap-0.5 ml-2 min-w-[80px]">
                        {todo.tags.slice(0, 3).map((tag, index) => (
                          <Badge 
                            key={index} 
                            variant="outline" 
                            className="text-xs cursor-pointer hover:bg-muted bg-gray-100 dark:bg-gray-800 transition-colors px-1.5 py-0.5"
                            onClick={(e) => {
                              e.stopPropagation()
                              setSelectedTag(tag)
                            }}
                          >
                            #{tag}
                          </Badge>
                        ))}
                        {todo.tags.length > 3 && (
                          <Badge variant="outline" className="text-xs px-1.5 py-0.5">
                            +{todo.tags.length - 3}
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                
                {/* 待办详情 - 只在选中时显示 */}
                {selectedTodoId === todo._id && (
                  <div className="px-3 pb-3 space-y-3">
                    {/* 待办内容 */}
                    {todo.content && (
                      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
                        <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">内容</div>
                        <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                          {todo.content}
                        </div>
                      </div>
                    )}
                    
                    {/* 删除按钮 */}
                    <Button 
                      variant="destructive" 
                      size="sm" 
                      onClick={() => deleteTodo(todo._id)}
                      disabled={isDeletingTodo}
                      className="w-full flex items-center gap-2"
                    >
                      <Trash2 className="h-4 w-4" />
                      {isDeletingTodo ? "删除中..." : "删除待办"}
                    </Button>
                  </div>
                )}
                
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