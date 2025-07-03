import React, { useState, useEffect, useCallback, useRef, useMemo } from "react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/components/ui/use-toast"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card"
import { TagSuggestion } from "@/components/tag-suggestion"
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
  editDetailContent, 
  editStartDate, 
  editDueDate, 
  editTags,
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
  setEditDetailContent,
  setEditStartDate,
  setEditDueDate,
  setEditTags,
  setMenuOpenTodo,
  setOrderSelectTodo,
  getPriorityTextColor
}: {
  todo: Todo;
  priorityIndex: number;
  editingTodo: string | null;
  editContent: string;
  editDetailContent: string;
  editStartDate: string;
  editDueDate: string;
  editTags: string;
  menuOpenTodo: string | null;
  orderSelectTodo: string | null;
  allTodos: Todo[];
  onToggleTodo: (id: string, timeRecord?: string) => void;
  onEditTodo: (todo: Todo) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onShowTodoDetail: (todo: Todo) => void;
  onUpdateTodo: (id: string, updates: Partial<Todo>) => void;
  onDeleteTodo: (id: string) => void;
  onLoadTodos: () => Promise<void>;
  setEditContent: (content: string) => void;
  setEditDetailContent: (content: string) => void;
  setEditStartDate: (date: string) => void;
  setEditDueDate: (date: string) => void;
  setEditTags: (tags: string) => void;
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
        return 'border-[#EAB30A] border-2 data-[state=checked]:border-[#EAB30A]'
      case 'low':
        return 'border-gray-400 border-2 data-[state=checked]:border-gray-400'
      case 'none':
        return 'border-gray-300 border-2 data-[state=checked]:border-gray-300'
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
              onCheckedChange={() => {
                // 如果todo未完成且有计时器，计算时间记录
                let timeRecord = undefined
                if (!todo.completed && todo.timer && todo.timer.totalSeconds > 0) {
                  const totalSeconds = todo.timer.totalSeconds
                  // 如果计时器正在运行，需要加上当前运行时间
                  let finalSeconds = totalSeconds
                  if (todo.timer.isRunning && todo.timer.startTime) {
                    const elapsed = Math.floor((new Date().getTime() - new Date(todo.timer.startTime).getTime()) / 1000)
                    finalSeconds += elapsed
                  }
                  
                  const hours = Math.floor(finalSeconds / 3600)
                  const minutes = Math.floor((finalSeconds % 3600) / 60)
                  if (hours > 0) {
                    timeRecord = `用时${hours}小时${minutes}分`
                  } else if (minutes > 0) {
                    timeRecord = `用时${minutes}分`
                  } else {
                    timeRecord = `用时${finalSeconds}秒`
                  }
                }
                onToggleTodo(todo.id || (todo as any)._id, timeRecord)
              }}
              className={cn("mt-0.5", getPriorityCheckboxClass(todo.priority))}
            />
            <Input
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="flex-1 text-sm"
              placeholder="编辑todo标题"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-gray-600">详细内容:</label>
            <Textarea
              value={editDetailContent}
              onChange={(e) => setEditDetailContent(e.target.value)}
              className="text-sm min-h-[60px] resize-none"
              placeholder="编辑todo详细内容"
            />
          </div>
          <div className="flex items-center space-x-1">
            <label className="text-xs text-gray-600 whitespace-nowrap">起始日期:</label>
            <Input
              type="date"
              value={editStartDate}
              onChange={(e) => setEditStartDate(e.target.value)}
              className="flex-1 text-xs"
              placeholder="年/月/日"
            />
          </div>
          <div className="flex items-center space-x-1">
            <label className="text-xs text-gray-600 whitespace-nowrap">截止日期:</label>
            <Input
              type="date"
              value={editDueDate}
              onChange={(e) => setEditDueDate(e.target.value)}
              className="flex-1 text-xs"
              placeholder="年/月/日"
            />
          </div>
          <div className="flex items-center space-x-1">
            <label className="text-xs text-gray-600 whitespace-nowrap">标签:</label>
            <Input
              value={editTags}
              onChange={(e) => setEditTags(e.target.value)}
              className="flex-1 text-xs"
              placeholder="输入标签，用逗号分隔（如：工作, 重要）"
            />
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
              onCheckedChange={() => {
                // 如果todo未完成且有计时器，计算时间记录
                let timeRecord = undefined
                if (!todo.completed && todo.timer && todo.timer.totalSeconds > 0) {
                  const totalSeconds = todo.timer.totalSeconds
                  // 如果计时器正在运行，需要加上当前运行时间
                  let finalSeconds = totalSeconds
                  if (todo.timer.isRunning && todo.timer.startTime) {
                    const elapsed = Math.floor((new Date().getTime() - new Date(todo.timer.startTime).getTime()) / 1000)
                    finalSeconds += elapsed
                  }
                  
                  const hours = Math.floor(finalSeconds / 3600)
                  const minutes = Math.floor((finalSeconds % 3600) / 60)
                  if (hours > 0) {
                    timeRecord = `用时${hours}小时${minutes}分`
                  } else if (minutes > 0) {
                    timeRecord = `用时${minutes}分`
                  } else {
                    timeRecord = `用时${finalSeconds}秒`
                  }
                }
                onToggleTodo(todo.id || (todo as any)._id, timeRecord)
              }}
              className={cn("mt-0.5", getPriorityCheckboxClass(todo.priority))}
            />

          </div>
          <HoverCard>
            <HoverCardTrigger asChild>
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
                  {todo.text || todo.content}
                  {/* 标签跟在文字后面 */}
                  {(todo.tags && todo.tags.length > 0) && (
                    <span className="ml-2">
                      {todo.tags.map((tag: string, index: number) => (
                                     <span
                                       key={index}
                                       className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 ml-1"
                                     >
                                       {tag}
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
            </HoverCardTrigger>
            <HoverCardContent className="w-80" side="right" align="start">
              {/* 只显示详细内容 */}
              {todo.content && todo.content !== todo.text && (
                <div>
                  <p className="text-sm">{todo.content}</p>
                </div>
              )}
            </HoverCardContent>
          </HoverCard>
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
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      onUpdateTodo(todo.id || (todo as any)._id, { priority: 'none' })
                      setMenuOpenTodo(null)
                    }}
                    className={`w-full justify-start h-8 px-2 text-xs ${todo.priority === 'none' ? 'bg-accent' : ''}`}
                  >
                    无优先级
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
  onAddTodo,
  onShowTodoDetail
}: { 
  selectedDate: Date;
  todosByDate: Record<string, Array<{ 
    id: string;
    _id: string;
    content: string;
    text: string;
    completed: boolean;
    tags: string[];
    dueDate?: string;
    startDate?: string;
    priority?: 'low' | 'medium' | 'high' | 'none';
    order?: number;
    userId?: string;
    createdAt?: string;
    updatedAt?: string;
    subtodos?: any[];
    timer?: {
      isRunning: boolean;
      totalSeconds: number;
      startTime?: string;
    };
  }>>;
  onToggleTodo: (todoId: string, timeRecord?: string) => void;
  onUpdateTodo: (todoId: string, updates: { content?: string; text?: string; startDate?: string; dueDate?: string; priority?: 'low' | 'medium' | 'high' | 'none'; tags?: string[] }) => void;
  onDeleteTodo: (todoId: string) => void;
  onLoadTodos: () => Promise<void>;
  onAddTodo: (todo: { content: string; detailContent?: string; priority: 'low' | 'medium' | 'high' | 'none'; startDate?: string; dueDate?: string; tags: string[] }) => Promise<void>;
  onShowTodoDetail: (todo: { id: string; _id: string; content: string; text: string; completed: boolean; tags: string[]; startDate?: string; dueDate?: string; priority?: 'low' | 'medium' | 'high' | 'none'; order?: number; userId?: string; createdAt?: string; updatedAt?: string; subtodos?: any[]; timer?: { isRunning: boolean; totalSeconds: number; startTime?: string; }; }) => void;
}) {
  const [isLoading, setIsLoading] = useState(false)
  const [selectedTag, setSelectedTag] = useState<string>('all')
  const [selectedPriority, setSelectedPriority] = useState<'high' | 'medium' | 'low'>('high')
  const [editingTodo, setEditingTodo] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')
  const [editDetailContent, setEditDetailContent] = useState('')
  const [editStartDate, setEditStartDate] = useState('')
  const [editDueDate, setEditDueDate] = useState('')
  const [editTags, setEditTags] = useState('')
  const [menuOpenTodo, setMenuOpenTodo] = useState<string | null>(null)
  const [orderSelectTodo, setOrderSelectTodo] = useState<string | null>(null)
  const [isLargeTodoListOpen, setIsLargeTodoListOpen] = useState(false)
  const [newTodoTag, setNewTodoTag] = useState<string | null>(null)
  const [newTodoContent, setNewTodoContent] = useState('')
  const [newTodoDetailContent, setNewTodoDetailContent] = useState('')
  const [newTodoPriority, setNewTodoPriority] = useState<'low' | 'medium' | 'high' | 'none'>('medium')
  const [newTodoStartDate, setNewTodoStartDate] = useState('')
  const [newTodoDueDate, setNewTodoDueDate] = useState('')
  const [isAddTodoDialogOpen, setIsAddTodoDialogOpen] = useState(false)
  const tagInputRef = useRef<HTMLInputElement>(null)

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

  // 获取所有标签，按照标签对应的todo数量排序（数量多的在前面）
  const allTags = useMemo(() => {
    const tagSet = new Set(allTodos.flatMap((todo) => todo.tags || []))
    const tagsArray = Array.from(tagSet)
    
    // 计算每个标签的todo数量并排序
    return tagsArray.sort((a, b) => {
      const countA = allTodos.filter(todo => (todo.tags || []).includes(a)).length
      const countB = allTodos.filter(todo => (todo.tags || []).includes(b)).length
      return countB - countA // 降序排列，数量多的在前面
    })
  }, [allTodos])

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
      case 'none':
        return 'text-gray-300 dark:text-gray-700' // 无优先级：更浅的灰色
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
      
      // 按优先级排序：高 > 中 > 低 > 无
      const priorityOrder: Record<'high' | 'medium' | 'low' | 'none', number> = { high: 4, medium: 3, low: 2, none: 1 }
      const sortedTodos = incompleteTodos.sort((a, b) => {
        const aPriority = a.priority ? priorityOrder[a.priority] || 2 : 2
        const bPriority = b.priority ? priorityOrder[b.priority] || 2 : 2
        return bPriority - aPriority
      })
      
      // 只返回第一个（优先级最高的）
      return [sortedTodos[0]]
    } else {
      // 其他模式：正常筛选
      if (selectedTag === 'all') {
        // all列表根据优先级筛选
        // 显示指定优先级的待办事项
        filtered = allTodos.filter((todo) => todo.priority === selectedPriority)
      } else {
        // 标签列表显示所有匹配标签的待办事项，包括无优先级的
        filtered = allTodos.filter((todo) => (todo.tags || []).includes(selectedTag))
      }
    }
    
    // 按优先级排序：高 > 中 > 低，然后按完成状态排序
    return filtered.sort((a, b) => {
      // 首先按完成状态排序，未完成的在前
      if (a.completed !== b.completed) {
        return a.completed ? 1 : -1
      }
      
      // 然后按优先级排序：高 > 中 > 低 > 无优先级
      const priorityOrder = { high: 4, medium: 3, low: 2, none: 1 }
      const aPriority = a.priority ? priorityOrder[a.priority] || 3 : 3 // 默认为中优先级
      const bPriority = b.priority ? priorityOrder[b.priority] || 3 : 3 // 默认为中优先级
      if (aPriority !== bPriority) {
        return bPriority - aPriority
      }
      
      // 同优先级内按order字段排序
      const aOrder = (a as any).order || 0
      const bOrder = (b as any).order || 0
      return aOrder - bOrder
    })
  }, [selectedTag, selectedPriority, allTodos])

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

  const handleToggleTodo = async (todoId: string, passedTimeRecord?: string) => {
    try {
      // 使用传递的时间记录，如果没有传递则计算
      let timeRecord = passedTimeRecord
      
      if (!timeRecord) {
        // 找到对应的todo
        const todo = allTodos.find(t => (t.id || (t as any)._id) === todoId)
        
        // 如果todo未完成且有计时器，计算时间记录
        if (todo && !todo.completed && todo.timer && todo.timer.totalSeconds > 0) {
          const totalSeconds = todo.timer.totalSeconds
          // 如果计时器正在运行，需要加上当前运行时间
          let finalSeconds = totalSeconds
          if (todo.timer.isRunning && todo.timer.startTime) {
            const elapsed = Math.floor((new Date().getTime() - new Date(todo.timer.startTime).getTime()) / 1000)
            finalSeconds += elapsed
          }
          
          const hours = Math.floor(finalSeconds / 3600)
          const minutes = Math.floor((finalSeconds % 3600) / 60)
          if (hours > 0) {
            timeRecord = `用时${hours}小时${minutes}分`
          } else if (minutes > 0) {
            timeRecord = `用时${minutes}分`
          } else {
            timeRecord = `用时${finalSeconds}秒`
          }
        }
      }
      
      onToggleTodo(todoId, timeRecord)
    } catch (error) {
      // 错误处理已在主组件中完成
    }
  }

  const handleEditTodo = (todo: any) => {
    // handleEditTodo被调用
    setEditingTodo(todo.id || (todo as any)._id)
    setEditContent(todo.text || '')
    setEditDetailContent(todo.content || '')
    setEditStartDate(todo.startDate || '')
    setEditDueDate(todo.dueDate || '')
    setEditTags(todo.tags ? todo.tags.join(', ') : '')
  }

  const handleSaveEdit = async () => {
    if (!editingTodo) return
    
    try {
      // 从编辑的标题内容中提取#标签
      const titleContent = editContent.trim()
      const tagRegex = /#([^\s#]+)/g
      const extractedTags: string[] = []
      let match
      
      // 提取所有#标签
      while ((match = tagRegex.exec(titleContent)) !== null) {
        extractedTags.push(match[1])
      }
      
      // 从标题中移除#标签，保留纯文本
      const cleanTitle = titleContent.replace(/#[^\s#]+/g, '').replace(/\s+/g, ' ').trim()
      
      // 处理手动输入的标签：将逗号分隔的字符串转换为数组，并去除空白
      const manualTags = editTags
        .split(',')
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0)
      
      // 合并提取的标签和手动输入的标签，去重
      const allTags = [...new Set([...extractedTags, ...manualTags])]
      
      // 调用父组件的更新函数并等待完成
      await onUpdateTodo(editingTodo, {
        text: cleanTitle, // 使用清理后的标题文本
        content: editDetailContent,
        startDate: editStartDate,
        dueDate: editDueDate,
        tags: allTags // 使用合并后的标签数组
      })
      // 只有在更新成功后才清空编辑状态
      setEditingTodo(null)
      setEditContent('')
      setEditDetailContent('')
      setEditStartDate('')
      setEditDueDate('')
      setEditTags('')
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
    setEditDetailContent('')
    setEditStartDate('')
    setEditDueDate('')
    setEditTags('')
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

  const handleAddTodo = async () => {
    if (!newTodoContent.trim()) return
    
    try {
      // 从内容中提取标签和纯文本
      const content = newTodoContent.trim()
      const tagRegex = /#([^\s#]+)/g
      const tags: string[] = []
      let match
      
      // 提取所有标签
      while ((match = tagRegex.exec(content)) !== null) {
        tags.push(match[1])
      }
      
      // 验证：如果优先级为'none'且没有标签，则不能提交
      if (newTodoPriority === 'none' && tags.length === 0) {
        toast({ title: "优先级为无时，必须添加至少一个标签", variant: "destructive" })
        return
      }
      
      // 移除标签，保留纯文本内容
      const pureContent = content.replace(/#[^\s#]+/g, '').replace(/\s+/g, ' ').trim()
      
      await onAddTodo({
        content: pureContent, // 使用清理后的纯文本内容，不包含#标签
        detailContent: newTodoDetailContent.trim(),
        priority: newTodoPriority,
        startDate: newTodoStartDate || undefined,
        dueDate: newTodoDueDate || undefined,
        tags: tags
      })

      // 重置表单
      setNewTodoContent('')
      setNewTodoDetailContent('')
      setNewTodoPriority('medium')
      setNewTodoStartDate('')
      setNewTodoDueDate('')
      setIsAddTodoDialogOpen(false)
      
      toast({ title: "Todo添加成功" })
    } catch (error) {
      console.error('添加todo失败:', error)
      toast({ title: "添加Todo失败", variant: "destructive" })
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
      <div className="p-2 bg-background">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h3 
              className="font-medium text-sm cursor-pointer hover:text-primary transition-colors"
              onClick={() => setIsLargeTodoListOpen(true)}
              title="点击查看大的Todo列表"
            >
              Todo 列表
            </h3>
            <div className="text-xs text-muted-foreground">
              {totalCount - completedCount}
            </div>
          </div>
          <Dialog open={isAddTodoDialogOpen} onOpenChange={(open) => {
            setIsAddTodoDialogOpen(open)
            if (open) {
              setNewTodoContent('')
              setNewTodoPriority('medium')
              setNewTodoStartDate('')
              setNewTodoDueDate('')
            }
          }}>
            <DialogTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
              >
                <Plus className="h-3 w-3" />
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle className="text-lg font-semibold">添加待办事项</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">标题</label>
                  <div className="relative">
                    <Input
                      ref={tagInputRef}
                      placeholder="请输入待办事项标题，用#开头可添加标签"
                      value={newTodoContent}
                      onChange={(e) => setNewTodoContent(e.target.value)}
                    />
                    <div className="mt-3">
                      <label className="text-sm font-medium mb-2 block">内容</label>
                      <Textarea
                        placeholder="请输入待办事项详细内容..."
                        value={newTodoDetailContent}
                        onChange={(e) => setNewTodoDetailContent(e.target.value)}
                        className="min-h-[80px] resize-none"
                      />
                    </div>
                    <TagSuggestion
                      inputValue={newTodoContent}
                      onTagSelect={(newValue) => {
                        setNewTodoContent(newValue)
                        if (tagInputRef.current) {
                          tagInputRef.current.focus()
                        }
                      }}
                      inputRef={tagInputRef}
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">优先级</label>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant={newTodoPriority === 'low' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setNewTodoPriority('low')}
                      className={newTodoPriority === 'low' ? 'bg-green-600 hover:bg-green-700 text-white' : ''}
                    >
                      低
                    </Button>
                    <Button
                      type="button"
                      variant={newTodoPriority === 'medium' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setNewTodoPriority('medium')}
                      className={newTodoPriority === 'medium' ? 'text-white' : ''}
                      style={newTodoPriority === 'medium' ? { backgroundColor: '#EAB30A', borderColor: '#EAB30A' } : {}}
                    >
                      中
                    </Button>
                    <Button
                      type="button"
                      variant={newTodoPriority === 'high' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setNewTodoPriority('high')}
                      className={newTodoPriority === 'high' ? 'bg-red-600 hover:bg-red-700 text-white' : ''}
                    >
                      高
                    </Button>
                    <Button
                      type="button"
                      variant={newTodoPriority === 'none' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setNewTodoPriority('none')}
                      className={newTodoPriority === 'none' ? 'bg-gray-600 hover:bg-gray-700 text-white' : ''}
                    >
                      无
                    </Button>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">开始日期</label>
                  <Input
                    type="date"
                    value={newTodoStartDate}
                    onChange={(e) => setNewTodoStartDate(e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">截止日期</label>
                  <Input
                    type="date"
                    value={newTodoDueDate}
                    onChange={(e) => setNewTodoDueDate(e.target.value)}
                  />
                </div>
              </div>
              
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsAddTodoDialogOpen(false)
                    setNewTodoContent('')
                    setNewTodoPriority('medium')
                    setNewTodoStartDate('')
                    setNewTodoDueDate('')
                  }}
                >
                  取消
                </Button>
                <Button
                  onClick={handleAddTodo}
                  disabled={!newTodoContent.trim() || (newTodoPriority === 'none' && !/#[^\s#]+/.test(newTodoContent))}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  添加待办事项
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* 标签筛选区域 */}
        <div className="mb-3">
          <div className="flex flex-wrap gap-1">
            <button
              onClick={() => {
                setSelectedTag('all')
                // 智能选择优先级：如果高优先级数量为0，则选择中优先级；如果中优先级也为0，则选择低优先级
                const highCount = allTodos.filter(todo => todo.priority === 'high').length
                const mediumCount = allTodos.filter(todo => todo.priority === 'medium').length
                const lowCount = allTodos.filter(todo => todo.priority === 'low').length
                
                if (highCount > 0) {
                  setSelectedPriority('high')
                } else if (mediumCount > 0) {
                  setSelectedPriority('medium')
                } else {
                  setSelectedPriority('low')
                }
              }}
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
              onClick={() => {
                setSelectedTag('focus')
                setSelectedPriority('high')
              }}
              className={cn(
                "px-2 py-1 text-xs rounded border transition-colors",
                selectedTag === 'focus' 
                  ? "bg-orange-500 text-white border-orange-500" 
                  : "bg-background text-muted-foreground border-border hover:bg-accent"
              )}
            >
              专注
            </button>
            {allTags.map((tag) => {
              // 计算该标签的todo数量
              const tagTodoCount = allTodos.filter(todo => (todo.tags || []).includes(tag)).length
              return (
                <button
                  key={tag}
                  onClick={() => {
                    setSelectedTag(tag)
                    setSelectedPriority('high')
                  }}
                  className={cn(
                    "px-2 py-1 text-xs rounded border transition-colors flex items-center gap-1",
                    selectedTag === tag 
                      ? "bg-primary text-primary-foreground border-primary" 
                      : "bg-background text-muted-foreground border-border hover:bg-accent"
                  )}
                >
                  <span>{tag}</span>
                  <span className={cn(
                    "text-xs font-medium",
                    selectedTag === tag 
                      ? "text-primary-foreground/80" 
                      : "text-blue-500"
                  )}>
                    {tagTodoCount}
                  </span>
                </button>
              )
            })}
          </div>
          
          {/* 优先级筛选 - 仅在选择all标签时显示 */}
          {selectedTag === 'all' && (
            <>
              <Separator className="my-2" />
              <div className="mt-2">
              <Tabs value={selectedPriority} onValueChange={(value) => setSelectedPriority(value as 'high' | 'medium' | 'low')} className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="high" className="text-xs flex items-center gap-1">
                    <span>高</span>
                    <span className="text-xs font-medium text-red-500">
                      {allTodos.filter(todo => todo.priority === 'high').length}
                    </span>
                  </TabsTrigger>
                  <TabsTrigger value="medium" className="text-xs flex items-center gap-1">
                    <span>中</span>
                    <span className="text-xs font-medium" style={{color: '#EAB30A'}}>
                      {allTodos.filter(todo => todo.priority === 'medium').length}
                    </span>
                  </TabsTrigger>
                  <TabsTrigger value="low" className="text-xs flex items-center gap-1">
                    <span>低</span>
                    <span className="text-xs font-medium text-green-500">
                      {allTodos.filter(todo => todo.priority === 'low').length}
                    </span>
                  </TabsTrigger>
                </TabsList>
              </Tabs>
              </div>
            </>
          )}
        </div>
      </div>

      {/* 可滚动的Todo列表区域 */}
      <div className="flex-1 overflow-y-auto scrollbar-hover">
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
                添加 {selectedTag} 标签的Todo
              </Button>
              
              {/* 新建todo区域 - 紧跟在按钮下面 */}
              {newTodoTag && (
                <div className="mt-3 p-3 border rounded-lg bg-accent/20">
                  <Input
                    value={newTodoContent}
                    onChange={(e) => setNewTodoContent(e.target.value)}
                    placeholder={`输入 ${newTodoTag} 标签的todo内容...`}
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
                              ? "text-white" + " border-[#EAB30A]"
                              : "bg-background text-muted-foreground border-border hover:bg-accent"
                          )}
                          style={newTodoPriority === 'medium' ? { backgroundColor: '#EAB30A' } : {}}
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
                      <button
                        onClick={() => setNewTodoPriority('none')}
                        className={cn(
                          "px-2 py-1 text-xs rounded border transition-colors",
                          newTodoPriority === 'none'
                            ? "bg-gray-400 text-white border-gray-400"
                            : "bg-background text-muted-foreground border-border hover:bg-accent"
                        )}
                      >
                        无
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
                          editDetailContent={editDetailContent}
                          editStartDate={editStartDate}
                          editDueDate={editDueDate}
                          editTags={editTags}
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
                          setEditDetailContent={setEditDetailContent}
                          setEditStartDate={setEditStartDate}
                          setEditDueDate={setEditDueDate}
                          setEditTags={setEditTags}
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
                          <h3 className="font-medium text-sm">{tag}</h3>
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
                                         // 如果todo未完成且有计时器，计算时间记录
                                         let timeRecord = undefined
                                         if (!todo.completed && todo.timer && todo.timer.totalSeconds > 0) {
                                           const totalSeconds = todo.timer.totalSeconds
                                           // 如果计时器正在运行，需要加上当前运行时间
                                           let finalSeconds = totalSeconds
                                           if (todo.timer.isRunning && todo.timer.startTime) {
                                             const elapsed = Math.floor((new Date().getTime() - new Date(todo.timer.startTime).getTime()) / 1000)
                                             finalSeconds += elapsed
                                           }
                                           
                                           const hours = Math.floor(finalSeconds / 3600)
                                           const minutes = Math.floor((finalSeconds % 3600) / 60)
                                           if (hours > 0) {
                                             timeRecord = `用时${hours}小时${minutes}分`
                                           } else if (minutes > 0) {
                                             timeRecord = `用时${minutes}分`
                                           } else {
                                             timeRecord = `用时${finalSeconds}秒`
                                           }
                                         }
                                         handleToggleTodo(todo.id || (todo as any)._id, timeRecord)
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