import React, { useState, useEffect, useCallback, useRef, useMemo } from "react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/components/ui/use-toast"
import { Loader2, Plus, Save, XCircle, CheckSquare, Clock, CheckCircle, Edit, Info, Trash2, MoreVertical, ChevronUp, ChevronDown, Hash, X, Check, GripVertical } from "lucide-react"
import { apiClient } from "@/lib/api"
import { type Todo } from "@/components/mobile/types"
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import {
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

// 可拖拽的TodoItem组件
function SortableTodoItem({ 
  todo, 
  priorityIndex, 
  editingTodo, 
  editContent, 
  editStartDate, 
  editDueDate, 
  menuOpenTodo, 
  orderSelectTodo, 
  allTodos,
  onToggleTodo, 
  onEditTodo, 
  onSaveEdit, 
  onCancelEdit, 
  onShowTodoDetail, 
  onUpdateTodo, 
  onDeleteTodo, 
  onLoadTodos,
  setEditContent,
  setEditStartDate,
  setEditDueDate,
  setMenuOpenTodo,
  setOrderSelectTodo,
  getPriorityTextColor
}: {
  todo: Todo;
  priorityIndex: number;
  editingTodo: string | null;
  editContent: string;
  editStartDate: string;
  editDueDate: string;
  menuOpenTodo: string | null;
  orderSelectTodo: string | null;
  allTodos: Todo[];
  onToggleTodo: (id: string) => void;
  onEditTodo: (todo: Todo) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onShowTodoDetail: (todo: Todo) => void;
  onUpdateTodo: (id: string, updates: Partial<Todo>) => void;
  onDeleteTodo: (id: string) => void;
  onLoadTodos: () => Promise<void>;
  setEditContent: (content: string) => void;
  setEditStartDate: (date: string) => void;
  setEditDueDate: (date: string) => void;
  setMenuOpenTodo: (id: string | null) => void;
  setOrderSelectTodo: (id: string | null) => void;
  getPriorityTextColor: (priority?: string, priorityIndex?: number) => string;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: todo.id || (todo as any)._id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }



  const handleDeleteTodo = async (todoId: string) => {
    try {
      await onDeleteTodo(todoId)
      toast({
        title: "成功",
        description: "Todo已删除",
      })
    } catch (error) {
      toast({
        title: "错误",
        description: "删除失败",
        variant: "destructive",
      })
    }
  }

  const getPriorityCheckboxClass = (priority?: string) => {
    switch (priority) {
      case 'high':
        return 'border-red-500 border-2 data-[state=checked]:border-red-500'
      case 'medium':
        return 'border-yellow-500 border-2 data-[state=checked]:border-yellow-500'
      case 'low':
        return 'border-gray-400 border-2 data-[state=checked]:border-gray-400'
      default:
        return 'border-gray-300 border-2 data-[state=checked]:border-gray-300'
    }
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "p-2 bg-card hover:bg-accent/50 transition-colors border-b border-border",
        isDragging && "shadow-lg z-50"
      )}
    >
      {editingTodo === todo.id ? (
        // 编辑模式
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <Checkbox
              checked={todo.completed}
              onCheckedChange={() => onToggleTodo(todo.id || (todo as any)._id)}
              className={cn("mt-0.5", getPriorityCheckboxClass(todo.priority))}
            />
            <Input
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="flex-1 text-sm"
              placeholder="编辑todo内容"
            />
          </div>
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-1 flex-1">
              <label className="text-xs text-gray-600 whitespace-nowrap">起始日期:</label>
              <Input
                type="date"
                value={editStartDate}
                onChange={(e) => setEditStartDate(e.target.value)}
                className="flex-1 text-xs"
                placeholder="年/月/日"
              />
            </div>
            <div className="flex items-center space-x-1 flex-1">
              <label className="text-xs text-gray-600 whitespace-nowrap">截止日期:</label>
              <Input
                type="date"
                value={editDueDate}
                onChange={(e) => setEditDueDate(e.target.value)}
                className="flex-1 text-xs"
                placeholder="年/月/日"
              />
            </div>
          </div>
          <div className="flex justify-end space-x-1">
            <Button
              size="sm"
              variant="outline"
              onClick={onCancelEdit}
              className="h-6 px-2"
            >
              <XCircle className="h-3 w-3" />
            </Button>
            <Button
              size="sm"
              onClick={onSaveEdit}
              className="h-6 px-2"
            >
              <Save className="h-3 w-3" />
            </Button>
          </div>
        </div>
      ) : (
        // 显示模式
        <div className="flex items-start p-2 transition-colors">
          <div className="flex flex-col items-center mr-2">
            <Checkbox
              id={todo.id || (todo as any)._id}
              checked={todo.completed}
              onCheckedChange={() => onToggleTodo(todo.id || (todo as any)._id)}
              className={cn("mt-0.5", getPriorityCheckboxClass(todo.priority))}
            />

          </div>
          <div 
            className="flex-1 cursor-grab active:cursor-grabbing hover:bg-accent/50 transition-colors"
            {...attributes}
            {...listeners}
          >
            <label
              className={cn(
                "text-sm block",
                todo.completed ? "line-through text-muted-foreground" : getPriorityTextColor(todo.priority, priorityIndex)
              )}
            >
              {todo.content || todo.text}
              {/* 标签跟在文字后面 */}
              {(todo.tags && todo.tags.length > 0) && (
                <span className="ml-2">
                  {todo.tags.map((tag: string, index: number) => (
                                 <span
                                   key={index}
                                   className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 ml-1"
                                 >
                                   #{tag}
                                 </span>
                               ))}
                </span>
              )}
            </label>
            {/* 显示日期信息 */}
            <div className="text-xs text-muted-foreground mt-0.5">
              {todo.startDate && todo.dueDate ? (
                <span>
                  {new Date(todo.startDate!).toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '/')} - {new Date(todo.dueDate!).toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '/')}
                </span>
              ) : todo.startDate ? (
                <span>起始: {new Date(todo.startDate!).toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '/')}</span>
              ) : todo.dueDate ? (
                <span>截止: {new Date(todo.dueDate!).toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '/')}</span>
              ) : null}
            </div>
          </div>
          <div className="flex items-center">
            <div className="relative">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  const newState = menuOpenTodo === (todo.id || (todo as any)._id) ? null : (todo.id || (todo as any)._id)
                  setMenuOpenTodo(newState)
                }}
                className="h-6 w-6 p-0"
              >
                <MoreVertical className="h-3 w-3" />
              </Button>
              {menuOpenTodo === (todo.id || (todo as any)._id) && (
                <div className="todo-menu absolute right-0 top-6 bg-background border rounded-md shadow-lg z-10 min-w-[120px]">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      onShowTodoDetail(todo)
                      setMenuOpenTodo(null)
                    }}
                    className="w-full justify-start h-8 px-2 text-xs"
                  >
                    <Info className="h-3 w-3 mr-1" />
                    查看详情
                  </Button>
                  <div className="border-t my-1"></div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      onEditTodo(todo)
                      setMenuOpenTodo(null)
                    }}
                    className="w-full justify-start h-8 px-2 text-xs"
                  >
                    <Edit className="h-3 w-3 mr-1" />
                    编辑
                  </Button>

                  <div className="border-t my-1"></div>
                  <div className="px-2 py-1 text-xs text-muted-foreground">优先级</div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      onUpdateTodo(todo.id || (todo as any)._id, { priority: 'high' })
                      setMenuOpenTodo(null)
                    }}
                    className={`w-full justify-start h-8 px-2 text-xs ${todo.priority === 'high' ? 'bg-accent' : ''}`}
                  >
                    高优先级
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      onUpdateTodo(todo.id || (todo as any)._id, { priority: 'medium' })
                      setMenuOpenTodo(null)
                    }}
                    className={`w-full justify-start h-8 px-2 text-xs ${todo.priority === 'medium' || !todo.priority ? 'bg-accent' : ''}`}
                  >
                    中优先级
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      onUpdateTodo(todo.id || (todo as any)._id, { priority: 'low' })
                      setMenuOpenTodo(null)
                    }}
                    className={`w-full justify-start h-8 px-2 text-xs ${todo.priority === 'low' ? 'bg-accent' : ''}`}
                  >
                    低优先级
                  </Button>
                  <div className="border-t my-1"></div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      handleDeleteTodo(todo.id || (todo as any)._id)
                      setMenuOpenTodo(null)
                    }}
                    className="w-full justify-start h-8 px-2 text-xs text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="h-3 w-3 mr-1" />
                    删除
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// TodoList Component
export const TodoList = React.memo(function TodoList({ 
  selectedDate, 
  todosByDate, 
  onToggleTodo,
  onUpdateTodo,
  onDeleteTodo,
  onLoadTodos,
  onShowTodoDetail
}: { 
  selectedDate: Date;
  todosByDate: Record<string, Array<{ 
    id: string; 
    content: string; 
    completed: boolean;
    tags: string[];
    dueDate?: string;
    startDate?: string;
    priority: 'low' | 'medium' | 'high';
  }>>;
  onToggleTodo: (todoId: string) => void;
  onUpdateTodo: (todoId: string, updates: { content?: string; startDate?: string; dueDate?: string; priority?: 'low' | 'medium' | 'high' }) => void;
  onDeleteTodo: (todoId: string) => void;
  onLoadTodos: () => Promise<void>;
  onShowTodoDetail: (todo: { id: string; content: string; completed: boolean; tags: string[]; startDate?: string; dueDate?: string; priority: 'low' | 'medium' | 'high' }) => void;
}) {
  const [isLoading, setIsLoading] = useState(false)
  const [selectedTag, setSelectedTag] = useState<string>('all')
  const [editingTodo, setEditingTodo] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')
  const [editStartDate, setEditStartDate] = useState('')
  const [editDueDate, setEditDueDate] = useState('')
  const [menuOpenTodo, setMenuOpenTodo] = useState<string | null>(null)
  const [orderSelectTodo, setOrderSelectTodo] = useState<string | null>(null)
  const [isLargeTodoListOpen, setIsLargeTodoListOpen] = useState(false)
  const [newTodoTag, setNewTodoTag] = useState<string | null>(null)
  const [newTodoContent, setNewTodoContent] = useState('')
  const [newTodoPriority, setNewTodoPriority] = useState<'low' | 'medium' | 'high'>('medium')

  // 拖拽传感器配置
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // 处理拖拽结束事件
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event

    if (!over || active.id === over.id) {
      return
    }

    const activeIndex = displayTodos.findIndex((todo: any) => (todo.id || todo._id) === active.id)
    const overIndex = displayTodos.findIndex((todo: any) => (todo.id || todo._id) === over.id)

    if (activeIndex !== -1 && overIndex !== -1) {
      // 重新排列本地数组
      const newTodos = arrayMove(displayTodos, activeIndex, overIndex)
      
      try {
        // 调用后端API更新顺序
        const activeTodo = displayTodos[activeIndex]
        const targetOrder = overIndex + 1
        
        const result = await apiClient.setTodoOrder(activeTodo.id || (activeTodo as any)._id, targetOrder)
        if (!result.error) {
          await onLoadTodos()
          toast({
            title: "成功",
            description: "Todo顺序已更新",
          })
        } else {
          toast({
            title: "错误",
            description: result.error || "更新顺序失败",
            variant: "destructive",
          })
        }
      } catch (error) {
        toast({
          title: "错误",
          description: "更新顺序失败",
          variant: "destructive",
        })
      }
    }
  }

  const selectedDateObj = new Date(selectedDate)
  
  // 获取所有todos并根据日期范围过滤
  const allTodos = Object.values(todosByDate)
    .flat()
    .filter((todo, index, self) => 
      // 去重
      self.findIndex(t => (t.id || (t as any)._id) === (todo.id || (todo as any)._id)) === index
    )
    .filter((todo) => {
      const hasStartDate = todo.startDate
      const hasDueDate = todo.dueDate
      
      if (hasStartDate && hasDueDate) {
         // 有起始日期和截止日期：点击日期在起始日期前一天或之后显示
         const startDate = new Date(todo.startDate!)
         startDate.setDate(startDate.getDate() - 1)
         return selectedDateObj >= startDate
      } else if (hasStartDate && !hasDueDate) {
         // 只有起始日期：点击日期在起始日期前一天或之后则显示
         const startDate = new Date(todo.startDate!)
         startDate.setDate(startDate.getDate() - 1)
         return selectedDateObj >= startDate
       } else if (!hasStartDate && hasDueDate) {
         // 只有截止日期：点击日期在截止日期前一天或之后则显示
         const dueDate = new Date(todo.dueDate!)
         dueDate.setDate(dueDate.getDate() - 1)
         return selectedDateObj >= dueDate
      } else {
        // 没有日期限制：总是显示
        return true
      }
    })

  // 获取所有标签
  const allTags = useMemo(() => Array.from(new Set(allTodos.flatMap((todo) => todo.tags || []))), [allTodos])

  // 根据优先级和序号获取文字颜色
  const getPriorityTextColor = (priority?: string, priorityIndex?: number) => {
    switch (priority) {
      case 'high':
        return 'text-gray-900 dark:text-gray-100 font-medium' // 高优先级：黑色，加粗
      case 'medium':
        // 中优先级：只有序号1的加粗，其他为灰色
        return priorityIndex === 1 
          ? 'text-gray-900 dark:text-gray-100 font-medium' 
          : 'text-gray-400 dark:text-gray-600'
      case 'low':
        return 'text-gray-400 dark:text-gray-600' // 低优先级：浅灰色
      default:
        // 默认为中优先级逻辑
        return priorityIndex === 1 
          ? 'text-gray-900 dark:text-gray-100 font-medium' 
          : 'text-gray-400 dark:text-gray-600'
    }
  }

  // 根据选中的标签筛选todos，并按优先级排序
  const displayTodos = useMemo(() => {
    let filtered
    
    if (selectedTag === 'focus') {
      // 专注模式：只显示一个优先级最高的未完成todo
      const incompleteTodos = allTodos.filter(todo => !todo.completed)
      
      if (incompleteTodos.length === 0) {
        return []
      }
      
      // 按优先级排序：高 > 中 > 低
      const priorityOrder = { high: 3, medium: 2, low: 1 }
      const sortedTodos = incompleteTodos.sort((a, b) => {
        const aPriority = a.priority ? priorityOrder[a.priority] || 2 : 2
        const bPriority = b.priority ? priorityOrder[b.priority] || 2 : 2
        return bPriority - aPriority
      })
      
      // 只返回第一个（优先级最高的）
      return [sortedTodos[0]]
    } else {
      // 其他模式：正常筛选
      filtered = selectedTag === 'all' 
        ? allTodos 
        : allTodos.filter((todo) => (todo.tags || []).includes(selectedTag))
    }
    
    // 按优先级排序：高 > 中 > 低，然后按完成状态排序
    return filtered.sort((a, b) => {
      // 首先按完成状态排序，未完成的在前
      if (a.completed !== b.completed) {
        return a.completed ? 1 : -1
      }
      
      // 然后按优先级排序：高 > 中 > 低
      const priorityOrder = { high: 3, medium: 2, low: 1 }
      const aPriority = a.priority ? priorityOrder[a.priority] || 2 : 2 // 默认为中优先级
      const bPriority = b.priority ? priorityOrder[b.priority] || 2 : 2 // 默认为中优先级
      if (aPriority !== bPriority) {
        return bPriority - aPriority
      }
      
      // 同优先级内按order字段排序
      const aOrder = (a as any).order || 0
      const bOrder = (b as any).order || 0
      return aOrder - bOrder
    })
  }, [selectedTag, allTodos])

  const loadTodos = async () => {
    setIsLoading(true)
    try {
      // 这里可以调用后端API获取todos
      // 暂时保持现有数据不变
    } catch (error) {
      toast({
        title: "错误",
        description: "无法加载Todo列表",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleToggleTodo = async (todoId: string) => {
    try {
      onToggleTodo(todoId)
    } catch (error) {
      // 错误处理已在主组件中完成
    }
  }

  const handleEditTodo = (todo: any) => {
    // handleEditTodo被调用
    setEditingTodo(todo.id || (todo as any)._id)
    setEditContent(todo.content || todo.text)
    setEditStartDate(todo.startDate || '')
    setEditDueDate(todo.dueDate || '')
  }

  const handleSaveEdit = async () => {
    if (!editingTodo) return
    
    try {
      // 调用父组件的更新函数并等待完成
      await onUpdateTodo(editingTodo, {
        content: editContent,
        startDate: editStartDate,
        dueDate: editDueDate
      })
      // 只有在更新成功后才清空编辑状态
      setEditingTodo(null)
      setEditContent('')
      setEditStartDate('')
      setEditDueDate('')
    } catch (error) {
      console.error('更新todo失败:', error)
      // 可以在这里添加错误提示
      toast({
        title: "更新失败",
        description: "保存Todo时发生错误，请重试",
        variant: "destructive",
      })
    }
  }

  const handleCancelEdit = () => {
    setEditingTodo(null)
    setEditContent('')
    setEditStartDate('')
    setEditDueDate('')
  }

  const handleDeleteTodo = async (todoId: string) => {
    // handleDeleteTodo被调用
    
    try {
      // 调用父组件的删除函数
      onDeleteTodo(todoId)
    } catch (error) {
      console.error('删除todo失败:', error)
    }
  }



  useEffect(() => {
    loadTodos()
  }, [selectedDate])

  // 点击外部区域关闭菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuOpenTodo) {
        const target = event.target as Element
        // 检查点击的元素是否在菜单内部
        const menuElement = target.closest('.todo-menu')
        if (!menuElement) {
          setMenuOpenTodo(null)
        }
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [menuOpenTodo])

  const completedCount = useMemo(() => displayTodos.filter(todo => todo.completed).length, [displayTodos])
  const totalCount = useMemo(() => displayTodos.length, [displayTodos])

  return (
    <div className="flex flex-col h-full">
      {/* 固定的标题和标签筛选区域 */}
      <div className="p-2 border-b bg-background">
        <div className="flex items-center justify-between mb-3">
          <h3 
            className="font-medium text-sm cursor-pointer hover:text-primary transition-colors"
            onClick={() => setIsLargeTodoListOpen(true)}
            title="点击查看大的Todo列表"
          >
            Todo 列表
          </h3>
          <div className="text-xs text-muted-foreground">
            {completedCount}/{totalCount}
          </div>
        </div>

        {/* 标签筛选区域 */}
        <div className="mb-3">
          <div className="flex flex-wrap gap-1">
            <button
              onClick={() => setSelectedTag('all')}
              className={cn(
                "px-2 py-1 text-xs rounded border transition-colors",
                selectedTag === 'all' 
                  ? "bg-primary text-primary-foreground border-primary" 
                  : "bg-background text-muted-foreground border-border hover:bg-accent"
              )}
            >
              All
            </button>
            <button
              onClick={() => setSelectedTag('focus')}
              className={cn(
                "px-2 py-1 text-xs rounded border transition-colors",
                selectedTag === 'focus' 
                  ? "bg-orange-500 text-white border-orange-500" 
                  : "bg-background text-muted-foreground border-border hover:bg-accent"
              )}
            >
              专注
            </button>
            {allTags.map((tag) => (
              <button
                key={tag}
                onClick={() => setSelectedTag(tag)}
                className={cn(
                  "px-2 py-1 text-xs rounded border transition-colors",
                  selectedTag === tag 
                    ? "bg-primary text-primary-foreground border-primary" 
                    : "bg-background text-muted-foreground border-border hover:bg-accent"
                )}
              >
                #{tag}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 可滚动的Todo列表区域 */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-2">
          {/* 添加新Todo按钮 - 仅在选择了特定标签时显示，但不包括专注模式 */}
          {selectedTag !== 'all' && selectedTag !== 'focus' && (
            <div className="mb-3">
              <Button
                onClick={() => setNewTodoTag(selectedTag)}
                className="w-full flex items-center justify-center py-1 text-sm"
                variant="outline"
              >
                <Plus className="h-3 w-3 mr-1" />
                添加 #{selectedTag} 标签的Todo
              </Button>
              
              {/* 新建todo区域 - 紧跟在按钮下面 */}
              {newTodoTag && (
                <div className="mt-3 p-3 border rounded-lg bg-accent/20">
                  <Input
                    value={newTodoContent}
                    onChange={(e) => setNewTodoContent(e.target.value)}
                    placeholder={`输入 #${newTodoTag} 标签的todo内容...`}
                    className="text-sm h-8 mb-2"
                    onKeyDown={async (e) => {
                      // 禁用回车键添加功能，只允许多行输入
                      // 只有当按下Ctrl+Enter或Command+Enter时才提交
                      if (e.key === 'Enter' && !(e.ctrlKey || e.metaKey)) {
                        // 允许普通回车键进行换行，不做任何处理
                        return
                      }
                      
                      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && newTodoContent.trim()) {
                        e.preventDefault()
                        try {
                          const todoResult = await apiClient.createTodo({
                             text: newTodoContent.trim(),
                             tags: [newTodoTag],
                             priority: newTodoPriority
                           })
                          
                          if (!todoResult.error) {
                            await onLoadTodos()
                            setNewTodoContent('')
                            setNewTodoTag(null)
                            setNewTodoPriority('medium')
                            toast({
                              title: "成功",
                              description: "Todo已添加",
                            })
                          } else {
                            toast({
                              title: "错误",
                              description: todoResult.error || "添加Todo失败",
                              variant: "destructive"
                            })
                          }
                        } catch (error) {
                          console.error('Create todo error:', error)
                          toast({
                            title: "错误",
                            description: error instanceof Error ? error.message : "添加Todo失败",
                            variant: "destructive"
                          })
                        }
                      } else if (e.key === 'Escape') {
                        setNewTodoTag(null)
                        setNewTodoContent('')
                        setNewTodoPriority('medium')
                      }
                    }}
                    autoFocus
                  />
                  {/* 优先级选择器 */}
                  <div className="mb-2">
                    <label className="text-xs text-muted-foreground mb-1 block">优先级:</label>
                    <div className="flex gap-1">
                      <button
                        onClick={() => setNewTodoPriority('high')}
                        className={cn(
                          "px-2 py-1 text-xs rounded border transition-colors",
                          newTodoPriority === 'high'
                            ? "bg-red-500 text-white border-red-500"
                            : "bg-background text-muted-foreground border-border hover:bg-accent"
                        )}
                      >
                        高
                      </button>
                      <button
                        onClick={() => setNewTodoPriority('medium')}
                        className={cn(
                          "px-2 py-1 text-xs rounded border transition-colors",
                          newTodoPriority === 'medium'
                            ? "bg-yellow-500 text-white border-yellow-500"
                            : "bg-background text-muted-foreground border-border hover:bg-accent"
                        )}
                      >
                        中
                      </button>
                      <button
                        onClick={() => setNewTodoPriority('low')}
                        className={cn(
                          "px-2 py-1 text-xs rounded border transition-colors",
                          newTodoPriority === 'low'
                            ? "bg-gray-500 text-white border-gray-500"
                            : "bg-background text-muted-foreground border-border hover:bg-accent"
                        )}
                      >
                        低
                      </button>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-6 px-2 text-xs"
                      onClick={async () => {
                        if (newTodoContent.trim()) {
                          try {
                            const todoResult = await apiClient.createTodo({
                               text: newTodoContent.trim(),
                               tags: [newTodoTag],
                               priority: newTodoPriority
                             })
                            
                            if (!todoResult.error) {
                              await onLoadTodos()
                              setNewTodoContent('')
                              setNewTodoTag(null)
                              setNewTodoPriority('medium')
                              toast({
                                title: "成功",
                                description: "Todo已添加",
                              })
                            } else {
                              toast({
                                title: "错误",
                                description: todoResult.error || "添加Todo失败",
                                variant: "destructive"
                              })
                            }
                          } catch (error) {
                            console.error('Create todo error:', error)
                            toast({
                              title: "错误",
                              description: error instanceof Error ? error.message : "添加Todo失败",
                              variant: "destructive"
                            })
                          }
                        }
                      }}
                    >
                      <Save className="h-3 w-3 mr-1" />
                      保存
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 px-2 text-xs"
                      onClick={() => {
                        setNewTodoTag(null)
                        setNewTodoContent('')
                        setNewTodoPriority('medium')
                      }}
                    >
                      <XCircle className="h-3 w-3 mr-1" />
                      取消
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
          
          {isLoading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              <span className="text-sm">加载中...</span>
            </div>
          ) : displayTodos.length > 0 ? (
            <div className="space-y-2">

              {/* 专注模式提示 */}
              {selectedTag === 'focus' && (
                <div className="mb-4 p-3 bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 rounded-lg">
                  <div className="flex items-center gap-2 text-orange-700 dark:text-orange-300">
                    <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
                    <span className="text-sm font-medium">专注模式：当前最重要的任务</span>
                  </div>
                  <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                    完成这个任务后，系统会自动显示下一个优先级最高的任务
                  </p>
                </div>
              )}
              
              {/* 拖拽上下文 */}
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={displayTodos.map(todo => todo.id || (todo as any)._id).filter(Boolean)}
                  strategy={verticalListSortingStrategy}
                >
                  {displayTodos.map((todo, index) => {
                    // 计算当前todo在其优先级组内的序号
                    const samePriorityTodos = allTodos.filter(t => 
                      t.priority === todo.priority && t.completed === todo.completed
                    ).sort((a, b) => ((a as any).order || 0) - ((b as any).order || 0))
                    const priorityIndex = samePriorityTodos.findIndex(t => (t.id || (t as any)._id) === (todo.id || (todo as any)._id)) + 1
                    
                    return (
                      <div
                        key={todo.id || (todo as any)._id}
                        className={cn(
                          selectedTag === 'focus' && "ring-2 ring-orange-200 dark:ring-orange-800 bg-orange-50/50 dark:bg-orange-950/10"
                        )}
                      >
                        <SortableTodoItem
                          todo={todo as any}
                          priorityIndex={priorityIndex}
                          editingTodo={editingTodo}
                          editContent={editContent}
                          editStartDate={editStartDate}
                          editDueDate={editDueDate}
                          menuOpenTodo={menuOpenTodo}
                          orderSelectTodo={orderSelectTodo}
                          allTodos={allTodos as any}
                          onToggleTodo={handleToggleTodo}
                          onEditTodo={handleEditTodo}
                          onSaveEdit={handleSaveEdit}
                          onCancelEdit={handleCancelEdit}
                          onShowTodoDetail={onShowTodoDetail as any}
                          onUpdateTodo={onUpdateTodo}
                          onDeleteTodo={onDeleteTodo}
                          onLoadTodos={onLoadTodos}
                          setOrderSelectTodo={setOrderSelectTodo}
                          setEditContent={setEditContent}
                          setEditStartDate={setEditStartDate}
                          setEditDueDate={setEditDueDate}
                          setMenuOpenTodo={setMenuOpenTodo}
                          getPriorityTextColor={getPriorityTextColor}
                        />
                      </div>
                    )
                  })}
                </SortableContext>
              </DndContext>
            </div>
          ) : (
            <div className="text-center py-4 text-sm text-muted-foreground">
              {selectedTag === 'focus' ? (
                <div className="space-y-2">
                  <div className="text-green-600 dark:text-green-400 font-medium">
                    🎉 太棒了！
                  </div>
                  <div>
                    所有任务都已完成，可以休息一下了
                  </div>
                </div>
              ) : (
                <div>
                  暂无Todo事项
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      
      {/* 大的Todo列表弹窗 */}
      {isLargeTodoListOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-background rounded-lg shadow-xl w-full max-w-none h-[80vh] flex flex-col">
            {/* 弹窗标题栏 */}
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">Todo 列表总览</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsLargeTodoListOpen(false)}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            {/* 按标签分列的Todo内容 */}
             <div className="flex-1 overflow-hidden p-2">
               {allTags.length > 0 ? (
                 <div className="grid gap-2 h-full" style={{ gridTemplateColumns: `repeat(${allTags.filter(tag => allTodos.filter(todo => (todo.tags || []).includes(tag) && (todo.tags || [])[0] === tag).length > 0).length}, 1fr)` }}>
                  {allTags.map((tag) => {
                      const tagTodos = allTodos.filter(todo => (todo.tags || []).includes(tag) && (todo.tags || [])[0] === tag)
                     if (tagTodos.length === 0) return null
                     return (
                       <div key={tag} className="border rounded-lg p-2 flex flex-col">
                        <div className="flex items-center justify-between mb-3 pb-2 border-b">
                          <h3 className="font-medium text-sm">#{tag}</h3>
                          <span className="text-xs text-muted-foreground">
                            {tagTodos.filter(t => t.completed).length}/{tagTodos.length}
                          </span>
                        </div>
                        <div className="flex-1 overflow-y-auto">
                           {tagTodos.map((todo: any, index) => {
                             // 计算当前todo在其优先级组内的序号
                              const samePriorityTodos = allTodos.filter(t => 
                                t.priority === todo.priority && t.completed === todo.completed
                              ).sort((a, b) => ((a as any).order || 0) - ((b as any).order || 0))
                              const priorityIndex = samePriorityTodos.findIndex(t => (t.id || (t as any)._id) === (todo.id || (todo as any)._id)) + 1
                             
                             return (
                             <div key={todo.id || (todo as any)._id}>
                               <div
                                  className="p-2 hover:bg-accent/50 transition-colors cursor-pointer relative"
                                 onClick={() => {
                                   const newState = menuOpenTodo === (todo.id || (todo as any)._id) ? null : (todo.id || (todo as any)._id)
                                   setMenuOpenTodo(newState)
                                 }}
                               >
                                 <div className="flex items-start space-x-2">

                                   <div
                                     className={cn(
                                       "text-sm flex-1",
                                       todo.completed ? "line-through text-muted-foreground" : getPriorityTextColor(todo.priority, priorityIndex)
                                     )}
                                   >
                                     {todo.content}
                                   </div>
                                 </div>
                                 {/* 显示日期信息 */}
                                 <div className="text-xs text-muted-foreground mt-1">
                                   {todo.startDate && todo.dueDate ? (
                                     <span>
                                       {new Date(todo.startDate).toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' })} - {new Date(todo.dueDate).toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' })}
                                     </span>
                                   ) : todo.startDate ? (
                                     <span>起始: {new Date(todo.startDate).toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' })}</span>
                                   ) : todo.dueDate ? (
                                     <span>截止: {new Date(todo.dueDate).toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' })}</span>
                                   ) : null}
                                 </div>
                                 
                                 {/* 菜单 */}
                                 {menuOpenTodo === todo.id && (
                                   <div className="todo-menu absolute right-2 top-2 bg-background border rounded-md shadow-lg z-10 min-w-[100px]">
                                     <Button
                                       size="sm"
                                       variant="ghost"
                                       onClick={(e) => {
                                         e.stopPropagation()
                                         handleEditTodo(todo)
                                         setMenuOpenTodo(null)
                                       }}
                                       className="w-full justify-start h-8 px-3 text-xs"
                                     >
                                       <Edit className="h-3 w-3 mr-2" />
                                       编辑
                                     </Button>
                                     <Button
                                       size="sm"
                                       variant="ghost"
                                       onClick={async (e) => {
                                         e.stopPropagation()
                                         try {
                                           const result = await apiClient.reorderTodo(todo.id || (todo as any)._id, 'up')
                                           if (!result.error) {
                                             await onLoadTodos()
                                             toast({
                                               title: "成功",
                                               description: "Todo已上移",
                                             })
                                           } else {
                                             toast({
                                               title: "错误",
                                               description: result.error || "上移失败",
                                               variant: "destructive",
                                             })
                                           }
                                         } catch (error) {
                                           toast({
                                             title: "错误",
                                             description: "上移失败",
                                             variant: "destructive",
                                           })
                                         }
                                         setMenuOpenTodo(null)
                                       }}
                                       className="w-full justify-start h-8 px-3 text-xs"
                                     >
                                       <ChevronUp className="h-3 w-3 mr-2" />
                                       上移
                                     </Button>
                                     <Button
                                       size="sm"
                                       variant="ghost"
                                       onClick={async (e) => {
                                         e.stopPropagation()
                                         try {
                                           const result = await apiClient.reorderTodo(todo.id || (todo as any)._id, 'down')
                                           if (!result.error) {
                                             await onLoadTodos()
                                             toast({
                                               title: "成功",
                                               description: "Todo已下移",
                                             })
                                           } else {
                                             toast({
                                               title: "错误",
                                               description: result.error || "下移失败",
                                               variant: "destructive",
                                             })
                                           }
                                         } catch (error) {
                                           toast({
                                             title: "错误",
                                             description: "下移失败",
                                             variant: "destructive",
                                           })
                                         }
                                         setMenuOpenTodo(null)
                                       }}
                                       className="w-full justify-start h-8 px-3 text-xs"
                                     >
                                       <ChevronDown className="h-3 w-3 mr-2" />
                                       下移
                                     </Button>
                                     <Button
                                       size="sm"
                                       variant="ghost"
                                       onClick={(e) => {
                                         e.stopPropagation()
                                         handleDeleteTodo(todo.id)
                                         setMenuOpenTodo(null)
                                       }}
                                       className="w-full justify-start h-8 px-3 text-xs text-red-500 hover:text-red-700"
                                     >
                                       <Trash2 className="h-3 w-3 mr-2" />
                                       删除
                                     </Button>
                                     <Button
                                       size="sm"
                                       variant="ghost"
                                       onClick={(e) => {
                                         e.stopPropagation()
                                         handleToggleTodo(todo.id || (todo as any)._id)
                                         setMenuOpenTodo(null)
                                       }}
                                       className="w-full justify-start h-8 px-3 text-xs"
                                     >
                                       <Check className="h-3 w-3 mr-2" />
                                       {todo.completed ? '取消完成' : '完成'}
                                     </Button>
                                   </div>
                                 )}
                               </div>
                               {/* 分割线 */}
                               {index < tagTodos.length - 1 && (
                                 <div className="border-b border-border/50" />
                               )}
                             </div>
                             )
                           })}
                          {tagTodos.length === 0 && (
                            <div className="text-center py-4 text-xs text-muted-foreground">
                              暂无Todo
                            </div>
                          )}
                          
                          {/* 新建todo区域 */}
                          {newTodoTag === tag ? (
                            <div className="mt-2 p-2 border-t">
                              <Input
                                value={newTodoContent}
                                onChange={(e) => setNewTodoContent(e.target.value)}
                                placeholder="输入todo内容..."
                                className="text-xs h-8 mb-2"
                                onKeyDown={async (e) => {
                                  if (e.key === 'Enter' && newTodoContent.trim()) {
                                    try {
                                      const todoResult = await apiClient.createTodo({
                                         text: newTodoContent.trim(),
                                         tags: [tag]
                                       })
                                      
                                      if (!todoResult.error) {
                                        await onLoadTodos()
                                        setNewTodoContent('')
                                        setNewTodoTag(null)
                                        toast({
                                          title: "成功",
                                          description: "Todo已添加",
                                        })
                                      } else {
                                        toast({
                                          title: "错误",
                                          description: todoResult.error || "添加Todo失败",
                                          variant: "destructive"
                                        })
                                      }
                                    } catch (error) {
                                      console.error('Create todo error:', error)
                                      toast({
                                        title: "错误",
                                        description: error instanceof Error ? error.message : "添加Todo失败",
                                        variant: "destructive"
                                      })
                                    }
                                  } else if (e.key === 'Escape') {
                                    setNewTodoTag(null)
                                    setNewTodoContent('')
                                  }
                                }}
                                autoFocus
                              />
                              <div className="flex gap-1">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-6 px-2 text-xs"
                                  onClick={async () => {
                                    if (newTodoContent.trim()) {
                                      try {
                                        const todoResult = await apiClient.createTodo({
                                           text: newTodoContent.trim(),
                                           tags: [tag]
                                         })
                                        
                                        if (!todoResult.error) {
                                          await onLoadTodos()
                                          setNewTodoContent('')
                                          setNewTodoTag(null)
                                          toast({
                                            title: "成功",
                                            description: "Todo已添加",
                                          })
                                        } else {
                                          toast({
                                            title: "错误",
                                            description: todoResult.error || "添加Todo失败",
                                            variant: "destructive"
                                          })
                                        }
                                      } catch (error) {
                                        console.error('Create todo error:', error)
                                        toast({
                                          title: "错误",
                                          description: error instanceof Error ? error.message : "添加Todo失败",
                                          variant: "destructive"
                                        })
                                      }
                                    }
                                  }}
                                >
                                  确定
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-6 px-2 text-xs"
                                  onClick={() => {
                                    setNewTodoTag(null)
                                    setNewTodoContent('')
                                  }}
                                >
                                  取消
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div className="mt-2 border-t pt-2">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="w-full h-8 text-xs text-muted-foreground hover:text-foreground"
                                onClick={() => {
                                  setNewTodoTag(tag)
                                  setNewTodoContent('')
                                }}
                              >
                                <Plus className="h-3 w-3 mr-1" />
                                {/* 添加Todo */}
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  暂无Todo标签
                </div>
              )}
            </div>
            
          </div>
        </div>
      )}
    </div>
  )
})

export default TodoList