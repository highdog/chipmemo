"use client"

import React, { useState, useEffect, useCallback, useRef, useMemo } from "react"
import { useRouter } from "next/navigation"
import { useTheme } from "next-themes"
import { useAuth } from "@/lib/auth-context"
import { Calendar } from "@/components/ui/calendar"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { MarkdownEditor } from "@/components/markdown-editor"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Image, Loader2, Info, Search, X, Trash2, CheckSquare, Tag, CheckCircle2, CheckCircle, Circle, Home, Sun, Moon, Plus, Edit, Save, XCircle, MoreVertical, Download, Upload, Check, Clock, Pause, ChevronUp, ChevronDown, Hash } from "lucide-react"
// 由于NoteGroup组件已在本文件中定义,移除此导入
// 由于组件已在本文件中定义,移除重复导入
import { TodoList } from "@/components/todo-list2"
import { TagContent } from "@/components/tag-content"
import { tagContentsApi } from "@/lib/api"
import { UserNav } from "@/components/user-nav"
import { NoteItem } from "@/components/note-item"
import { SearchBar } from "@/components/search-bar"

import IntegratedSchedule from "@/components/integrated-schedule"
import GoalsList from "@/components/goals-list"
import CheckInList from "@/components/checkin-list"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import LargeCalendar from "@/components/large-calendar"
import {
  addNote,
  getNotes,
  deleteNote,
  searchNotes,
  searchNotesByTag,
  type Note,
} from "@/lib/actions"
import { formatDateShort, getDateKey, formatTime, formatDateOnly, cn, extractTags } from "@/lib/utils"
import { format } from 'date-fns'
import { toast } from "@/hooks/use-toast"
import { apiClient, notesApi, schedulesApi, todosApi, type Todo as ApiTodo } from "@/lib/api"
import { Toaster } from "@/components/ui/toaster"

// 添加缺失的类型定义
interface Schedule {
  _id: string;
  title: string;
  time: string;
  date: string;
  description?: string;
  type?: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

// 更新Todo接口以匹配API返回的数据结构
interface Todo {
  _id: string;
  text: string;
  completed: boolean;
  priority: 'low' | 'medium' | 'high';
  dueDate?: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
  // 兼容导入数据的字段
  id?: string;
  content?: string;
  tags?: string[];
  startDate?: string;
}

interface TagContent {
  _id: string;
  tag: string;
  content: string;
  isGoalEnabled?: boolean;
  targetCount?: number;
  currentCount?: number;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

// 添加缺失的函数声明
const getTodos = async (page: number = 1, limit: number = 50) => {
  return todosApi.getAll();
};

const getSchedules = async (page: number = 1, limit: number = 50) => {
  return schedulesApi.getAll();
};

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

// TagProgressInputField组件
function TagProgressInputField({ currentTag, progressInput, setProgressInput, isAdding }: {
  currentTag: string
  progressInput: number
  setProgressInput: (value: number) => void
  isAdding: boolean
}) {
  const [tagData, setTagData] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)

  const loadTagData = async () => {
    if (!currentTag) return
    
    setIsLoading(true)
    try {
      const response = await tagContentsApi.get(currentTag)
      setTagData(response.data)
    } catch (error) {
      console.error('Error loading tag data:', error)
      setTagData(null)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadTagData()
  }, [currentTag])

  // 监听标签更新事件
  useEffect(() => {
    if (!currentTag) return
    
    const handleTagUpdate = () => {
      loadTagData()
    }

    window.addEventListener(`tag-updated-${currentTag}`, handleTagUpdate)
    
    return () => {
      window.removeEventListener(`tag-updated-${currentTag}`, handleTagUpdate)
    }
  }, [currentTag])

  if (isLoading || !tagData?.isGoalEnabled) {
    return null
  }

  return (
    <div className="flex items-center gap-1">
      <Input
        type="number"
        min="0"
        max={tagData.targetCount}
        value={progressInput}
        onChange={(e) => setProgressInput(parseInt(e.target.value) || 0)}
        className="h-[60px] w-16 text-sm"
        placeholder="+进度"
        disabled={isAdding}
      />
    </div>
  )
}



// NoteGroup Component
const NoteGroup = React.memo(function NoteGroup({
  date,
  notes,
  onDelete,
  searchTerm,
  onTagClick,
  onConvertToTodo,
  onUpdate,
}: {
  date: string
  notes: Note[]
  onDelete: () => void
  searchTerm?: string
  onTagClick: (tag: string) => void
  onConvertToTodo: (note: Note) => void
  onUpdate: (noteId: string, content: string, tags: string[]) => Promise<void>
}) {
  return (
    <div id={`date-group-${date}`} className="mb-6">
      {/* 日期标题 - 粘性定位 */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-b border-border/40 flex items-center mb-3 py-2 -mx-4 px-4">
        <h3 className="text-lg font-semibold text-foreground">{formatDateOnly(date)}</h3>
        <div className="ml-3 text-sm text-muted-foreground">{notes.length} 条笔记</div>
      </div>

      {/* 该日期下的所有笔记 */}
      <div className="space-y-2 ml-4">
        {notes.map((note) => (
          <NoteItem 
            key={note.id} 
            note={note} 
            onDelete={onDelete} 
            searchTerm={searchTerm} 
            onTagClick={onTagClick} 
            onConvertToTodo={() => onConvertToTodo(note)} 
            onUpdate={onUpdate}
          />
        ))}
      </div>
    </div>
  )
})



// Main Component
export default function NotePad() {
  const { theme, setTheme } = useTheme()
  const router = useRouter()
  const [notes, setNotes] = useState<Note[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [hasMoreNotes, setHasMoreNotes] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [inputValue, setInputValue] = useState("")
  const [date, setDate] = useState<Date>(new Date())
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isAdding, setIsAdding] = useState(false)
  // 移除重复的认证状态，直接使用AuthContext的状态
  const [inputMode, setInputMode] = useState<'note' | 'todo'>('note')
  const [todoDueDate, setTodoDueDate] = useState('')
  const [todoStartDate, setTodoStartDate] = useState('')
  const [todosByDate, setTodosByDate] = useState<Record<string, Array<{
    id: string; 
    content: string; 
    completed: boolean;
    tags: string[];
    dueDate?: string;
    startDate?: string;
    priority: 'low' | 'medium' | 'high';
    order?: number;
  }>>>({})

  const [searchTerm, setSearchTerm] = useState("")
  const [isSearching, setIsSearching] = useState(false)
  const [currentTag, setCurrentTag] = useState<string>("") // 当前搜索的标签
  const [selectedTag, setSelectedTag] = useState<string>('all') // 目标列表选中的标签
  const [selectedImage, setSelectedImage] = useState<string | null>(null) // 选择的图片
  // 移除重复的登录状态，直接使用AuthContext的isAuthenticated
  const [isLargeCalendarOpen, setIsLargeCalendarOpen] = useState(false) // 大日历弹窗状态
  const [schedulesByDate, setSchedulesByDate] = useState<Record<string, any[]>>({}) // 日程数据
  const [isExporting, setIsExporting] = useState(false) // 导出状态
  const [isImporting, setIsImporting] = useState(false) // 导入状态
  const [searchHistory, setSearchHistory] = useState<string[]>([]) // 搜索历史记录
  const [tagNoteInput, setTagNoteInput] = useState('') // 标签页面的笔记输入
  const [tagProgressInput, setTagProgressInput] = useState(0) // 标签页面的进度输入
  const [isTagNoteAdding, setIsTagNoteAdding] = useState(false) // 标签页面添加笔记状态
  
  // Memoized button disabled states to optimize performance
  const isMainButtonDisabled = useMemo(() => {
    const isInputEmpty = !inputValue.trim()
    return isAdding || (isInputEmpty && (inputMode === 'note' && !selectedImage))
  }, [inputValue, isAdding, inputMode, selectedImage])
  
  const isSearchButtonDisabled = useMemo(() => {
    const isInputEmpty = !inputValue.trim()
    return isAdding || isInputEmpty
  }, [inputValue, isAdding])
  
  const [selectedTodoDetail, setSelectedTodoDetail] = useState<{
    id: string;
    content: string;
    completed: boolean;
    tags: string[];
    startDate?: string;
    dueDate?: string;
  } | null>(null) // 选中的todo详情
  
  // 计时相关状态
  const [isTimerRunning, setIsTimerRunning] = useState(false)
  const [timerSeconds, setTimerSeconds] = useState(0)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  // 加载所有日程数据
  const loadAllSchedules = useCallback(async () => {
    try {
      const response = await schedulesApi.getAll()
      if (response.success && response.data) {
        setSchedulesByDate(response.data)
      }
    } catch (error) {
      console.error('加载日程失败:', error)
    }
  }, [])

  // 监听自定义事件，实时更新日程数据
  useEffect(() => {
    const handleScheduleUpdate = () => {
      loadAllSchedules()
    }

    window.addEventListener('scheduleUpdated', handleScheduleUpdate)
    
    return () => {
      window.removeEventListener('scheduleUpdated', handleScheduleUpdate)
    }
  }, [loadAllSchedules])

  // 监听目标点击事件
  useEffect(() => {
    const handleTagSearch = (event: CustomEvent) => {
      const { tag } = event.detail
      console.log('🎯 [HomePage] 收到目标标签搜索事件:', tag)
      handleTagClick(tag)
    }

    window.addEventListener('tag-search', handleTagSearch as EventListener)
    
    return () => {
      window.removeEventListener('tag-search', handleTagSearch as EventListener)
    }
  }, [])

  // 监听笔记刷新事件
  useEffect(() => {
    const handleNotesRefresh = async (event: any) => {
      console.log('📝 [HomePage] 收到笔记刷新事件，重新加载笔记列表')
      
      // 从事件中获取标签信息，如果没有则使用当前页面的标签状态
      const eventTag = event.detail?.currentTag
      const targetTag = eventTag || currentTag
      
      console.log('📝 [HomePage] 事件标签:', eventTag, '当前标签:', currentTag, '目标标签:', targetTag)
      
      // 如果有标签信息，则重新执行标签搜索
      if (targetTag) {
        console.log('📝 [HomePage] 重新加载标签笔记:', targetTag)
        try {
          const searchResult = await searchNotesByTag(targetTag, 1, 5000)
          setNotes(searchResult.notes)
          setHasMoreNotes(searchResult.pagination && searchResult.pagination.current < searchResult.pagination.pages)
          // 如果事件传递了标签但当前页面标签状态不一致，更新当前标签状态
          if (eventTag && eventTag !== currentTag) {
            setCurrentTag(eventTag)
          }
        } catch (error) {
          console.error('📝 [HomePage] 标签笔记刷新失败:', error)
          // 如果标签搜索失败，回退到加载全部笔记
          loadNotes()
        }
      } else {
        // 没有标签筛选，加载全部笔记
        console.log('📝 [HomePage] 加载全部笔记')
        loadNotes()
      }
    }

    window.addEventListener('notes-refresh', handleNotesRefresh)
    
    return () => {
      window.removeEventListener('notes-refresh', handleNotesRefresh)
    }
  }, []) // 空依赖数组，直接调用 loadNotes 避免依赖问题

  // 按日期分组笔记
  const groupNotesByDate = (notes: Note[]) => {
    const groups: { [key: string]: Note[] } = {}

    notes.forEach((note) => {
      const dateKey = getDateKey(note.createdAt)
      if (!groups[dateKey]) {
        groups[dateKey] = []
      }
      groups[dateKey].push(note)
    })

    // 按日期排序，最新的在前面
    const sortedGroups = Object.entries(groups).sort(([a], [b]) => {
      return new Date(b).getTime() - new Date(a).getTime()
    })

    // 每组内的笔记按时间排序，最新的在前面
    sortedGroups.forEach(([, groupNotes]) => {
      groupNotes.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    })

    return sortedGroups
  }

  // 计时器相关函数
  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const startTimer = () => {
    setIsTimerRunning(true)
    timerRef.current = setInterval(() => {
      setTimerSeconds(prev => prev + 1)
    }, 1000)
  }

  const pauseTimer = () => {
    setIsTimerRunning(false)
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }

  const resetTimer = () => {
    setIsTimerRunning(false)
    setTimerSeconds(0)
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }

  // 清理计时器
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [])

  // 滚动到指定日期的笔记
  const scrollToDate = (targetDate: Date) => {
    const dateKey = getDateKey(targetDate.toISOString())
    const element = document.getElementById(`date-group-${dateKey}`)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
    // 移除未找到笔记的警告提示
  }

  // 处理日历日期选择
  const handleDateSelect = (selectedDate: Date | undefined) => {
    if (selectedDate) {
      // 保留当前时间，只更新日期部分
      const currentTime = new Date()
      const newDate = new Date(selectedDate)
      newDate.setHours(currentTime.getHours(), currentTime.getMinutes(), currentTime.getSeconds(), currentTime.getMilliseconds())
      
      // 检查点击的日期是否有日程
      const dateKey = format(selectedDate, 'yyyy-MM-dd')
      const hasScheduleOnDate = schedulesByDate[dateKey] && schedulesByDate[dateKey].length > 0
      
      let targetDate = newDate
      
      // 如果当前日期没有日程，找到该日期之后最近的有日程的日期
      if (!hasScheduleOnDate) {
        const clickedDate = new Date(selectedDate)
        const futureScheduleDates = Object.keys(schedulesByDate)
          .filter(scheduleDate => {
            const scheduleDateTime = new Date(scheduleDate + 'T00:00:00')
            return scheduleDateTime > clickedDate && schedulesByDate[scheduleDate].length > 0
          })
          .sort((a, b) => new Date(a + 'T00:00:00').getTime() - new Date(b + 'T00:00:00').getTime())
        
        if (futureScheduleDates.length > 0) {
          // 找到了未来有日程的日期，选择该日期
          const targetDateTime = new Date(futureScheduleDates[0] + 'T00:00:00')
          targetDateTime.setHours(currentTime.getHours(), currentTime.getMinutes(), currentTime.getSeconds(), currentTime.getMilliseconds())
          targetDate = targetDateTime
          
          toast({
            title: "智能定位",
            description: `该日期无日程，已自动定位到 ${targetDate.toLocaleDateString('zh-CN')} 的日程`,
            duration: 3000,
          })
        } else {
          // 没有找到未来的日程，选择点击的日期
          toast({
            title: "日期已选择",
            description: `现在添加的笔记将保存到 ${newDate.toLocaleDateString('zh-CN')}`,
            duration: 2000,
          })
        }
      } else {
        // 有日程，直接选择该日期
        toast({
          title: "日期已选择",
          description: `现在添加的笔记将保存到 ${newDate.toLocaleDateString('zh-CN')}`,
          duration: 2000,
        })
      }
      
      setDate(targetDate)
      // 如果不是在搜索状态，则跳转到对应日期的笔记
      if (!searchTerm) {
        scrollToDate(targetDate)
      }
    }
  }

  // 加载笔记
  const loadNotes = useCallback(async (reset: boolean = true) => {
    try {
      if (reset) {
        setCurrentPage(1)
        setHasMoreNotes(true)
      }
      
      const result = await getNotes(reset ? 1 : currentPage, 100)
      
      if (reset) {
        setNotes(result.notes)
      } else {
        // 合并新笔记时，去重以避免重复的笔记ID
        setNotes(prev => {
          const existingIds = new Set(prev.map(note => note.id))
          const newNotes = result.notes.filter(note => !existingIds.has(note.id))
          return [...prev, ...newNotes]
        })
      }
      
      // 检查是否还有更多数据
      setHasMoreNotes(result.pagination && result.pagination.current < result.pagination.pages)
      
      if (!reset) {
        setCurrentPage(prev => prev + 1)
      }
    } catch (error) {
      toast({
        title: "加载失败",
        description: "无法加载笔记，请刷新页面重试",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
      setIsLoadingMore(false)
    }
  }, [currentPage])

  // 加载更多笔记
  const loadMoreNotes = useCallback(async () => {
    if (isLoadingMore || !hasMoreNotes) return
    
    // 如果在搜索状态下，不加载更多笔记
    if (searchTerm || currentTag) {
      return
    }
    
    setIsLoadingMore(true)
    await loadNotes(false)
  }, [isLoadingMore, hasMoreNotes, loadNotes, searchTerm, currentTag])

  // 无限滚动监听
  useEffect(() => {
    const handleScroll = () => {
      // 只在有更多数据且不在加载中时检查
      if (!hasMoreNotes || isLoadingMore || isLoading) return
      
      const scrollableElement = document.querySelector('.flex-1.overflow-y-auto')
      if (!scrollableElement) return
      
      const { scrollTop, scrollHeight, clientHeight } = scrollableElement
      // 当滚动到距离底部100px时触发加载
      if (scrollTop + clientHeight >= scrollHeight - 100) {
        loadMoreNotes()
      }
    }

    const scrollableElement = document.querySelector('.flex-1.overflow-y-auto')
    if (scrollableElement) {
      scrollableElement.addEventListener('scroll', handleScroll)
      return () => scrollableElement.removeEventListener('scroll', handleScroll)
    }
  }, [hasMoreNotes, isLoadingMore, isLoading, loadMoreNotes])

  // 搜索笔记
  const handleSearch = useCallback(async (term: string) => {
    setSearchTerm(term)
    setIsSearching(true)
    setCurrentPage(1)
    setHasMoreNotes(true)

    // 更新搜索历史记录
    if (term.trim()) {
      const updatedHistory = [term, ...searchHistory.filter(item => item !== term)].slice(0, 10)
      setSearchHistory(updatedHistory)
      localStorage.setItem('searchHistory', JSON.stringify(updatedHistory))
    }

    try {
      let searchResult: { notes: Note[]; pagination: any }
      
      // 检查是否是标签搜索（以#开头）
      if (term.startsWith('#')) {
        const tag = term.substring(1).trim() // 移除#前缀并去除空格
        if (!tag) {
          throw new Error('标签名称不能为空');
        }
        setCurrentTag(tag) // 设置当前标签
        searchResult = await searchNotesByTag(tag, 1, 5000) // 增加搜索限制到1000条
      } else {
        setCurrentTag("") // 清除当前标签
        searchResult = await searchNotes(term, 1, 5000) // 增加搜索限制到1000条
      }
      
      setNotes(searchResult.notes)
      setHasMoreNotes(searchResult.pagination ? searchResult.pagination.current < searchResult.pagination.pages : false)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "搜索时出现错误";
      toast({
        title: "搜索失败",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsSearching(false)
    }
  }, [searchHistory, toast])

  // 清除搜索，显示全部笔记
  const handleClearSearch = useCallback(async () => {
    setSearchTerm("")
    setCurrentTag("") // 清除当前标签
    setIsSearching(true)
    setCurrentPage(1)
    setHasMoreNotes(true)

    try {
      const result = await getNotes(1, 100)
      setNotes(result.notes)
      setHasMoreNotes(result.pagination && result.pagination.current < result.pagination.pages)
      toast({
        title: "已显示全部笔记",
        description: `共显示 ${result.notes.length} 条笔记`,
      })
    } catch (error) {
      toast({
        title: "加载失败",
        description: "无法加载笔记",
        variant: "destructive",
      })
    } finally {
      setIsSearching(false)
    }
  }, [toast])

  // 标签点击搜索
  const handleTagClick = async (tag: string) => {
    const trimmedTag = tag.trim();
    if (!trimmedTag) {
      toast({
        title: "搜索失败",
        description: "标签名称不能为空",
        variant: "destructive",
      })
      return;
    }
    
    setSearchTerm(`#${trimmedTag}`)
    setCurrentTag(trimmedTag) // 设置当前标签
    setIsSearching(true)

    try {
      const searchResult = await searchNotesByTag(trimmedTag, 1, 5000)
      setNotes(searchResult.notes)
      setHasMoreNotes(searchResult.pagination && searchResult.pagination.current < searchResult.pagination.pages)
      toast({
          title: "标签搜索",
          description: `找到 ${searchResult.notes.length} 条包含 #${trimmedTag} 标签的笔记`,
        })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "标签搜索时出现错误";
      toast({
        title: "搜索失败",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsSearching(false)
    }
  }

  // 刷新笔记


  // 处理图片上传
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // 检查文件类型
    if (!file.type.startsWith('image/')) {
      toast({
        title: "上传失败",
        description: "请选择图片文件",
        variant: "destructive",
      })
      return
    }

    // 检查文件大小（限制为5MB）
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "上传失败",
        description: "图片大小不能超过5MB",
        variant: "destructive",
      })
      return
    }

    const reader = new FileReader()
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string
      
      // 检查Data URL大小（限制为90KB，确保不超过后端100000字符限制）
      if (dataUrl && dataUrl.length > 90000) {
        toast({
          title: "上传失败",
          description: "图片过大，请选择更小的图片或降低图片质量",
          variant: "destructive",
        })
        return
      }
      
      setSelectedImage(dataUrl)
    }
    reader.readAsDataURL(file)
  }

  // 移除已选择的图片
  const handleRemoveImage = () => {
    setSelectedImage(null)
  }

  // 统一导出所有数据为一个Markdown文档
  const handleExportAll = async () => {
    setIsExporting(true)
    try {
      // 获取所有数据
      let notesToExport
      if (searchTerm) {
        notesToExport = notes
      } else {
        // 分页获取所有笔记
        let allNotes: Note[] = []
        let currentPage = 1
        const limit = 1000
        
        while (true) {
          const notesResponse = await getNotes(currentPage, limit)
          if (notesResponse.notes.length === 0) break
          
          allNotes = [...allNotes, ...notesResponse.notes]
          
          // 如果返回的笔记数量少于limit，说明已经是最后一页
          if (notesResponse.notes.length < limit) break
          
          currentPage++
        }
        
        notesToExport = allNotes
      }
      
      // 分页获取所有待办事项
      let allTodos: Todo[] = []
      try {
        let currentPage = 1
        const limit = 100
        
        while (true) {
          const todosResponse = await todosApi.getAll()
          if (!todosResponse.success || !todosResponse.data?.todos || todosResponse.data.todos.length === 0) break
          
          // 转换API Todo到本地Todo格式
          const convertedTodos: Todo[] = todosResponse.data.todos.map((apiTodo: ApiTodo) => ({
            _id: apiTodo._id,
            text: apiTodo.text,
            completed: apiTodo.completed,
            priority: apiTodo.priority,
            dueDate: apiTodo.dueDate,
            userId: apiTodo.userId,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }))
          allTodos = [...allTodos, ...convertedTodos]
          
          // 如果返回的待办事项数量少于limit，说明已经是最后一页
          if (todosResponse.data.todos.length < limit) break
          
          currentPage++
        }
      } catch (error) {
        console.error('获取待办事项失败:', error)
        // 转换当前页面的待办事项格式
        const currentTodos = Object.values(todosByDate).flat()
        allTodos = currentTodos.map((todo: any) => ({
          _id: todo.id || todo._id || '',
          text: todo.content || todo.text || '',
          completed: todo.completed || false,
          priority: todo.priority || 'medium',
          dueDate: todo.dueDate,
          userId: '',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        })) as Todo[]
      }
      
      const allSchedules = Object.values(schedulesByDate).flat()
      
      // 获取所有标签的固定内容和目标设置
      const tagContentsResponse = await tagContentsApi.getAll()
      let allTagContents: Array<{ tag: string; content: string; updatedAt: string; isGoalEnabled?: boolean; targetCount?: number; currentCount?: number }> = []
      console.log('🔍 [导出调试] 标签固定内容API响应:', tagContentsResponse)
      if (tagContentsResponse.success && tagContentsResponse.data) {
        allTagContents = tagContentsResponse.data
        console.log('🔍 [导出调试] 处理后的标签固定内容数组:', allTagContents)
      } else {
        console.error('🔍 [导出调试] 标签固定内容API请求失败:', tagContentsResponse.error)
      }
      
      // 检查是否有数据可导出
      if (notesToExport.length === 0 && allTodos.length === 0 && allSchedules.length === 0 && allTagContents.length === 0) {
        toast({
          title: "导出失败",
          description: "没有可导出的数据",
          variant: "destructive",
        })
        return
      }

      // 生成统一的Markdown内容
      let markdownContent = `# 土豆笔记本完整导出\n\n`
      markdownContent += `导出时间: ${new Date().toLocaleString('zh-CN')}\n\n`
      
      // 统计目标相关信息
      const enabledGoals = allTagContents.filter(tc => tc.isGoalEnabled)
      const totalTargetCount = enabledGoals.reduce((sum, tc) => sum + (tc.targetCount || 0), 0)
      const totalCurrentCount = enabledGoals.reduce((sum, tc) => sum + (tc.currentCount || 0), 0)
      
      markdownContent += `数据统计:\n`
      markdownContent += `- 笔记: ${notesToExport.length} 条\n`
      markdownContent += `- 待办事项: ${allTodos.length} 条 (已完成: ${allTodos.filter(t => t.completed).length} 条)\n`
      markdownContent += `- 日程安排: ${allSchedules.length} 条\n`
      markdownContent += `- 标签固定内容: ${allTagContents.length} 个\n`
      markdownContent += `- 启用目标的标签: ${enabledGoals.length} 个\n`
      markdownContent += `- 总目标数量: ${totalTargetCount}\n`
      markdownContent += `- 总完成进度: ${totalCurrentCount}\n`
      markdownContent += `- 整体完成率: ${totalTargetCount > 0 ? Math.round(totalCurrentCount / totalTargetCount * 100) : 0}%\n\n`
      markdownContent += `---\n\n`

      // 收集所有日期并按日期组织数据
      const allDates = new Set<string>()
      
      // 收集笔记日期
      notesToExport.forEach(note => {
        const dateKey = new Date(note.createdAt).toISOString().split('T')[0]
        allDates.add(dateKey)
      })
      
      // 收集Todo日期
      allTodos.forEach(todo => {
        const dateKey = todo.dueDate ? new Date(todo.dueDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
        allDates.add(dateKey)
      })
      
      // 收集日程日期
      Object.keys(schedulesByDate).forEach(dateKey => {
        if (schedulesByDate[dateKey].length > 0) {
          allDates.add(dateKey)
        }
      })
      
      // 按日期排序（最新的在前）
      const sortedDates = Array.from(allDates).sort((a, b) => new Date(b).getTime() - new Date(a).getTime())
      
      // 按日期组织内容
      sortedDates.forEach(dateKey => {
        const date = new Date(dateKey)
        const formattedDate = date.toLocaleDateString('zh-CN', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          weekday: 'long'
        })
        
        markdownContent += `## ${formattedDate}\n\n`
        
        // 当日笔记
        const dayNotes = notesToExport.filter(note => {
          const noteDate = new Date(note.createdAt).toISOString().split('T')[0]
          return noteDate === dateKey
        })
        
        if (dayNotes.length > 0) {
          markdownContent += `### 📝 笔记 (${dayNotes.length}条)\n\n`
          dayNotes.forEach((note, index) => {
            const noteTime = new Date(note.createdAt).toLocaleTimeString('zh-CN', {
              hour: '2-digit',
              minute: '2-digit'
            })
            
            markdownContent += `#### ${noteTime} - 笔记 ${index + 1}\n\n`
            
            // 添加标签
            if (note.tags && note.tags.length > 0) {
              markdownContent += `**标签:** ${note.tags.map((tag: string) => `#${tag}`).join(' ')}\n\n`
            }
            
            // 添加笔记内容
            markdownContent += `${note.originalContent || note.content}\n\n`
          })
        }
        
        // 当日Todo事项
        const dayTodos = allTodos.filter(todo => {
          const todoDate = todo.dueDate ? new Date(todo.dueDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
          return todoDate === dateKey
        })
        if (dayTodos.length > 0) {
          markdownContent += `### ✅ Todo事项 (${dayTodos.length}条)\n\n`
          dayTodos.forEach((todo, index) => {
            const status = todo.completed ? '✅' : '⬜'
            markdownContent += `${index + 1}. ${status} ${todo.text}\n`
            
            if (todo.priority) {
              const priorityMap: { [key: string]: string } = { low: '低', medium: '中', high: '高' }
              markdownContent += `   **优先级:** ${priorityMap[todo.priority]}\n`
            }
            
            if (todo.dueDate) {
              markdownContent += `   **截止日期:** ${new Date(todo.dueDate).toLocaleDateString('zh-CN')}\n`
            }
            
            markdownContent += `\n`
          })
        }
        
        // 当日日程安排
        const daySchedules = schedulesByDate[dateKey] || []
        if (daySchedules.length > 0) {
          markdownContent += `### 📅 日程安排 (${daySchedules.length}条)\n\n`
          daySchedules.forEach((schedule, index) => {
            markdownContent += `${index + 1}. **${schedule.time}** - ${schedule.title}\n`
            
            if (schedule.description) {
              markdownContent += `   ${schedule.description}\n`
            }
            
            if (schedule.type) {
              markdownContent += `   **类型:** ${schedule.type}\n`
            }
            
            markdownContent += `\n`
          })
        }
        
        markdownContent += `---\n\n`
      })
      
      // 添加标签汇总部分
      const tagMap = new Map<string, Array<{ type: 'note' | 'todo', content: string, date: string, time?: string }>>()
      
      // 从笔记中收集标签
      notesToExport.forEach(note => {
        if (note.tags && note.tags.length > 0) {
          note.tags.forEach(tag => {
            if (!tagMap.has(tag)) {
              tagMap.set(tag, [])
            }
            tagMap.get(tag)!.push({
              type: 'note',
              content: note.originalContent || note.content,
              date: new Date(note.createdAt).toLocaleDateString('zh-CN'),
              time: new Date(note.createdAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
            })
          })
        }
      })
      
      // 从Todo中收集标签（Todo本身不包含标签，但可以从文本中提取）
      allTodos.forEach(todo => {
        const todoTags = extractTags(todo.text)
        if (todoTags.length > 0) {
          todoTags.forEach((tag: string) => {
            if (!tagMap.has(tag)) {
              tagMap.set(tag, [])
            }
            tagMap.get(tag)!.push({
              type: 'todo',
              content: todo.text,
              date: todo.dueDate ? new Date(todo.dueDate).toLocaleDateString('zh-CN') : new Date().toLocaleDateString('zh-CN')
            })
          })
        }
      })
      
      if (tagMap.size > 0) {
        markdownContent += `# 📋 标签汇总\n\n`
        markdownContent += `标签数量: ${tagMap.size} 个\n\n`
        markdownContent += `---\n\n`

        // 按标签名排序
        const sortedTags = Array.from(tagMap.keys()).sort()
        
        // 合并所有标签（包括有固定内容但没有关联笔记/待办的标签）
        const allTagsSet = new Set([...sortedTags, ...allTagContents.map(tc => tc.tag)])
        const allSortedTags = Array.from(allTagsSet).sort()
        
        allSortedTags.forEach(tag => {
          markdownContent += `## #${tag}\n\n`
          
          // 添加标签的固定内容和目标设置
          const tagContent = allTagContents.find(tc => tc.tag === tag)
          if (tagContent) {
            if (tagContent.content && tagContent.content.trim()) {
              markdownContent += `**标签固定内容:**\n\n`
              markdownContent += `${tagContent.content}\n\n`
            }
            
            // 添加目标相关信息
            if (tagContent.isGoalEnabled) {
              markdownContent += `**目标设置:**\n\n`
              markdownContent += `- 目标功能: 已启用\n`
              markdownContent += `- 目标数量: ${tagContent.targetCount || 0}\n`
              markdownContent += `- 当前进度: ${tagContent.currentCount || 0}\n`
              const progress = tagContent.targetCount ? Math.round((tagContent.currentCount || 0) / tagContent.targetCount * 100) : 0
              markdownContent += `- 完成进度: ${progress}%\n\n`
            }
            
            if ((tagContent.content && tagContent.content.trim()) || tagContent.isGoalEnabled) {
              markdownContent += `---\n\n`
            }
          }
          
          // 添加关联的笔记和待办
          const items = tagMap.get(tag)
          if (items && items.length > 0) {
            markdownContent += `**关联内容:** 包含 ${items.length} 条\n\n`
            
            items.forEach((item, index) => {
              markdownContent += `${index + 1}. ${item.type === 'note' ? '📝' : '✅'} ${item.content.substring(0, 100)}${item.content.length > 100 ? '...' : ''}\n`
            })
          } else if (!tagContent || (!tagContent.content?.trim() && !tagContent.isGoalEnabled)) {
            markdownContent += `暂无关联内容\n`
          }
          
          markdownContent += `\n`
        })
      }

      // 创建并下载文件
      const blob = new Blob([markdownContent], { type: 'text/markdown;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      
      // 生成文件名
      const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-')
      const filename = searchTerm 
        ? `土豆笔记本-搜索结果-${searchTerm}-${timestamp}.md`
        : `土豆笔记本-完整导出-${timestamp}.md`
      
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      const totalItems = notesToExport.length + allTodos.length + allSchedules.length
      toast({
        title: "导出成功",
        description: `已导出 ${totalItems} 条数据到 ${filename}`,
      })
    } catch (error) {
      console.error('导出失败:', error)
      toast({
        title: "导出失败",
        description: "导出过程中出现错误，请重试",
        variant: "destructive",
      })
    } finally {
      setIsExporting(false)
    }
  }

  // 导入数据从Markdown文档（支持统一格式和旧格式）
  const handleImportNotes = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.md,.markdown,.txt'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return

      setIsImporting(true)
      try {
        const text = await file.text()
        console.log('🔍 [导入调试] 文件内容长度:', text.length)
        console.log('🔍 [导入调试] 文件内容预览:', text.substring(0, 500) + '...')
        
        // 检测是否为新的统一格式
        const isUnifiedFormat = text.includes('土豆笔记本完整导出') || text.includes('数据统计:')
        console.log('🔍 [导入调试] 是否为统一格式:', isUnifiedFormat)
        
        let importedNotes: any[] = []
        let importedTodos: any[] = []
        let importedSchedules: any[] = []
        let importedTagContents: any[] = []
        
        if (isUnifiedFormat) {
          // 解析新的统一格式
          const { notes, todos, schedules, tagContents } = parseUnifiedMarkdownToData(text)
          importedNotes = notes
          importedTodos = todos
          importedSchedules = schedules
          importedTagContents = tagContents || []
        } else {
          // 兼容旧格式
          const importType = detectImportType(text)
          console.log('🔍 [导入调试] 检测到的导入类型:', importType)
          
          if (importType === 'notes' || importType === 'mixed') {
            const { notes } = parseMarkdownToData(text)
            importedNotes = notes
          }
          
          if (importType === 'todos' || importType === 'mixed') {
            const { todos } = parseMarkdownToData(text)
            importedTodos = todos
          }
          
          if (importType === 'schedules' || importType === 'mixed') {
            const { schedules } = parseMarkdownToData(text)
            importedSchedules = schedules
          }
          
          if (importType === 'tags') {
            // 标签文件的导入逻辑稍有不同，需要解析标签格式
            const { notes: tagNotes } = parseTagMarkdownToData(text)
            importedNotes = tagNotes
          }
        }
        
        console.log('🔍 [导入调试] 解析结果:', {
          notesCount: importedNotes.length,
          todosCount: importedTodos.length,
          schedulesCount: importedSchedules.length,
          tagContentsCount: importedTagContents.length
        })
        
        if (importedNotes.length > 0) {
          console.log('🔍 [导入调试] 解析到的笔记样例:', importedNotes.slice(0, 2).map((note, index) => ({
            index,
            contentPreview: note.content.substring(0, 100) + '...',
            tags: note.tags,
            createdAt: note.createdAt
          })))
        }
        
        if (importedNotes.length === 0 && importedTodos.length === 0 && importedSchedules.length === 0 && importedTagContents.length === 0) {
          console.log('❌ [导入调试] 没有解析到任何数据')
          toast({
            title: "导入失败",
            description: "文件中没有找到有效的数据",
            variant: "destructive",
          })
          return
        }

        let notesSuccessCount = 0
        let todosSuccessCount = 0
        let schedulesSuccessCount = 0
        let tagContentsSuccessCount = 0

        // 批量添加笔记
        console.log('🔍 [导入调试] 开始批量导入笔记，总数:', importedNotes.length)
        if (importedNotes.length > 0) {
          try {
            // 获取现有笔记用于重复检查
            let existingNotes: Note[] = []
            try {
              let currentPage = 1
              const limit = 1000
              
              while (true) {
                const notesResponse = await getNotes(currentPage, limit)
                if (notesResponse.notes.length === 0) break
                
                existingNotes = [...existingNotes, ...notesResponse.notes]
                
                if (notesResponse.notes.length < limit) break
                currentPage++
              }
            } catch (error) {
              console.warn('🔍 [导入调试] 获取现有笔记失败，将跳过重复检查:', error)
            }
            
            console.log('🔍 [导入调试] 现有笔记数量:', existingNotes.length)
            
            // 准备批量数据，过滤重复项
            const notesToCreate = importedNotes.filter((noteData, i) => {
              // 检查是否存在重复笔记（基于标题和内容）
              const isDuplicate = existingNotes.some(existingNote => {
                const existingTitle = (existingNote.title || '').trim().toLowerCase()
                const existingContent = (existingNote.originalContent || existingNote.content || '').trim()
                const importTitle = (noteData.title || '').trim().toLowerCase()
                const importContent = (noteData.content || '').trim()
                
                // 如果标题和内容都相同，认为是重复
                return existingTitle === importTitle && existingContent === importContent
              })
              
              if (isDuplicate) {
                console.log(`🔍 [导入调试] 跳过重复笔记 ${i + 1}:`, {
                  title: noteData.title?.substring(0, 30) + '...',
                  content: noteData.content?.substring(0, 50) + '...'
                })
                return false
              }
              
              return true
            }).map((noteData, i) => {
              console.log(`🔍 [导入调试] 处理第 ${i + 1} 条笔记:`, {
                originalContent: noteData.content ? noteData.content.substring(0, 100) + '...' : 'undefined',
                tags: noteData.tags,
                createdAt: noteData.createdAt
              })
              
              // 重新构建包含标签的内容
              let contentWithTags = noteData.content || ''
              if (noteData.tags && noteData.tags.length > 0) {
                contentWithTags += '\n\n' + noteData.tags.map((tag: string) => `#${tag}`).join(' ')
              }
              
              // 确保内容不为空且符合后端验证要求
              if (!contentWithTags.trim()) {
                contentWithTags = '导入的空笔记'
              }
              
              // 使用完整的ISO时间字符串
              const customDate = noteData.createdAt ? noteData.createdAt.toISOString() : new Date().toISOString()
              
              // 使用utils.ts中的extractTags函数，返回string[]格式
              const tags = extractTags(contentWithTags) || []
              // 确保title不为空且不超过200字符
              const firstLine = contentWithTags.trim().split('\n')[0] || ''
              const title = firstLine.length > 0 ? firstLine.substring(0, 200) : '导入的笔记'
              
              const noteToCreate = {
                title: (title.trim() || '导入的笔记').substring(0, 200), // 确保不超过200字符
                content: (contentWithTags.trim() || '导入的空笔记').substring(0, 100000), // 确保不超过100000字符
                tags: Array.isArray(tags) ? tags.filter(tag => typeof tag === 'string' && tag.trim().length > 0) : [], // 确保tags数组中只包含有效字符串
                color: 'default', // 添加默认颜色
                customDate: customDate // 确保customDate是有效的ISO字符串
              }
              
              // 额外验证数据完整性
              if (!noteToCreate.title || noteToCreate.title.trim().length === 0) {
                noteToCreate.title = '导入的笔记'
              }
              if (!noteToCreate.content || noteToCreate.content.trim().length === 0) {
                noteToCreate.content = '导入的空笔记'
              }
              
              console.log(`🔍 [导入调试] 第 ${i + 1} 条笔记准备的数据:`, {
                title: noteToCreate.title.substring(0, 50),
                contentLength: noteToCreate.content.length,
                tagsCount: noteToCreate.tags.length,
                color: noteToCreate.color,
                customDate: noteToCreate.customDate
              })
              
              return noteToCreate
            }).filter(note => {
              // 更严格的数据验证
              const isValid = note.title && 
                            note.title.trim().length > 0 && 
                            note.title.length <= 200 &&
                            note.content && 
                            note.content.trim().length > 0 &&
                            note.content.length <= 100000 &&
                            Array.isArray(note.tags) &&
                            (note.color === undefined || ['default', 'red', 'orange', 'yellow', 'green', 'blue', 'purple', 'pink'].includes(note.color)) &&
                            (note.customDate === undefined || typeof note.customDate === 'string')
              
              if (!isValid) {
                console.warn(`⚠️ [导入调试] 过滤掉无效笔记:`, note)
              }
              
              return isValid
            })
            
            console.log(`🔍 [导入调试] 准备批量创建笔记:`, notesToCreate.length)
            console.log(`🔍 [导入调试] 第一条笔记示例:`, notesToCreate[0])
            
            if (notesToCreate.length === 0) {
              console.warn('⚠️ [导入调试] 没有有效的笔记数据可以创建')
              return
            }
            
            // 分批处理，每批最多500条
            const BATCH_SIZE = 500
            const totalBatches = Math.ceil(notesToCreate.length / BATCH_SIZE)
            console.log(`🔍 [导入调试] 将分 ${totalBatches} 批处理，每批最多 ${BATCH_SIZE} 条`)
            
            let totalCreated = 0
            let totalFailed = 0
            
            for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
              const startIndex = batchIndex * BATCH_SIZE
              const endIndex = Math.min(startIndex + BATCH_SIZE, notesToCreate.length)
              const batchNotes = notesToCreate.slice(startIndex, endIndex)
              
              console.log(`🔍 [导入调试] 处理第 ${batchIndex + 1}/${totalBatches} 批，包含 ${batchNotes.length} 条笔记`)
              
              try {
                // 在发送前再次验证每条笔记的数据格式
                const validatedNotes = batchNotes.map((note, index) => {
                  const validated = {
                    title: String(note.title || '导入的笔记').substring(0, 200),
                    content: String(note.content || '导入的空笔记').substring(0, 100000),
                    tags: Array.isArray(note.tags) ? note.tags.filter(tag => typeof tag === 'string' && tag.trim().length > 0) : [],
                    color: note.color || 'default',
                    customDate: note.customDate
                  }
                  
                  // 验证customDate格式
                  if (validated.customDate) {
                    try {
                      new Date(validated.customDate).toISOString()
                    } catch (e) {
                      console.warn(`⚠️ [导入调试] 第 ${batchIndex + 1} 批第 ${index + 1} 条笔记的customDate格式无效:`, validated.customDate)
                      validated.customDate = new Date().toISOString()
                    }
                  }
                  
                  return validated
                })
                
                const requestBody = { notes: validatedNotes }
                console.log(`🔍 [导入调试] 第 ${batchIndex + 1} 批发送请求体:`, JSON.stringify(requestBody, null, 2).substring(0, 500) + '...')
                console.log(`🔍 [导入调试] 第 ${batchIndex + 1} 批第一条笔记完整数据:`, JSON.stringify(validatedNotes[0], null, 2))
                
                const response = await fetch('http://localhost:3001/api/notes/batch', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
                  },
                  body: JSON.stringify(requestBody)
                })
                
                if (response.ok) {
                  const result = await response.json()
                  console.log(`🔍 [导入调试] 第 ${batchIndex + 1} 批创建笔记响应:`, result)
                  
                  if (result.success) {
                    totalCreated += result.data.summary.created
                    totalFailed += result.data.summary.failed || 0
                    console.log(`✅ [导入调试] 第 ${batchIndex + 1} 批创建笔记成功: ${result.data.summary.created}/${result.data.summary.total}`)
                    
                    if (result.data.failed && result.data.failed.length > 0) {
                      console.warn(`⚠️ [导入调试] 第 ${batchIndex + 1} 批部分笔记创建失败:`, result.data.failed)
                    }
                  }
                } else {
                  const errorText = await response.text()
                  console.error(`❌ [导入调试] 第 ${batchIndex + 1} 批创建笔记失败:`, response.status, response.statusText)
                  console.error(`❌ [导入调试] 错误详情:`, errorText)
                  
                  totalFailed += validatedNotes.length
                  
                  try {
                    const errorJson = JSON.parse(errorText)
                    if (errorJson.errors) {
                      console.error(`❌ [导入调试] 验证错误详情:`)
                      errorJson.errors.forEach((error: any, index: number) => {
                         console.error(`  错误 ${index + 1}:`, {
                           type: error.type,
                           field: error.path || error.param,
                           message: error.msg || error.message,
                           value: error.value ? JSON.stringify(error.value).substring(0, 200) + '...' : 'undefined'
                         })
                       })
                      
                      // 显示导致错误的数据样本
                      console.error(`❌ [导入调试] 第 ${batchIndex + 1} 批数据样本 (前3条):`, validatedNotes.slice(0, 3).map(note => ({
                        title: note.title.substring(0, 50) + '...',
                        contentLength: note.content.length,
                        tagsCount: note.tags.length,
                        color: note.color,
                        customDate: note.customDate
                      })))
                    }
                  } catch (e) {
                    console.error(`❌ [导入调试] 无法解析错误响应:`, e)
                  }
                }
              } catch (error) {
                console.error(`❌ [导入调试] 第 ${batchIndex + 1} 批处理异常:`, error)
                totalFailed += batchNotes.length
              }
              
              // 批次间稍作延迟，避免服务器压力过大
              if (batchIndex < totalBatches - 1) {
                await new Promise(resolve => setTimeout(resolve, 100))
              }
            }
            
            notesSuccessCount = totalCreated
            console.log(`✅ [导入调试] 所有批次处理完成，总计成功: ${totalCreated}，失败: ${totalFailed}`)
          } catch (error) {
            console.error(`❌ [导入调试] 批量创建笔记异常:`, error)
          }
        }
        console.log('🔍 [导入调试] 笔记导入完成，成功数量:', notesSuccessCount)

        // 批量添加Todo事项
        console.log('🔍 [导入调试] 开始批量导入待办事项，总数:', importedTodos.length)
        if (importedTodos.length > 0) {
          try {
            // 获取现有待办事项用于重复检查
            let existingTodos: Todo[] = []
            try {
              let currentPage = 1
              const limit = 1000
              
              while (true) {
                const todosResponse = await getTodos(currentPage, limit)
                if (!todosResponse.data?.todos || todosResponse.data.todos.length === 0) break
                
                // 转换API Todo到本地Todo格式
                const convertedTodos: Todo[] = todosResponse.data.todos.map((apiTodo: ApiTodo) => ({
                  _id: apiTodo._id,
                  text: apiTodo.text,
                  completed: apiTodo.completed,
                  priority: apiTodo.priority,
                  dueDate: apiTodo.dueDate,
                  userId: apiTodo.userId,
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString()
                }))
                existingTodos = [...existingTodos, ...convertedTodos]
                
                if (todosResponse.data.todos.length < limit) break
                currentPage++
              }
            } catch (error) {
              console.warn('🔍 [导入调试] 获取现有待办事项失败，将跳过重复检查:', error)
            }
            
            console.log('🔍 [导入调试] 现有待办事项数量:', existingTodos.length)
            
            // 准备批量数据，过滤重复项
            const todosToCreate = importedTodos.filter((todoData, i) => {
              // 检查是否存在重复待办事项（基于内容和截止日期）
              const isDuplicate = existingTodos.some(existingTodo => {
                const existingText = (existingTodo.text || '').trim()
                const importText = (todoData.todo.content || '').trim()
                const existingDueDate = existingTodo.dueDate ? new Date(existingTodo.dueDate).getTime() : null
                const importDueDate = todoData.todo.dueDate ? new Date(todoData.todo.dueDate).getTime() : null
                
                // 如果内容相同且截止日期相同，认为是重复
                return existingText === importText && existingDueDate === importDueDate
              })
              
              if (isDuplicate) {
                console.log(`🔍 [导入调试] 跳过重复待办事项 ${i + 1}:`, todoData.todo.content?.substring(0, 50) + '...')
                return false
              }
              
              return true
            }).map(todoData => ({
              text: todoData.todo.content,
              tags: todoData.todo.tags || [],
              dueDate: todoData.todo.dueDate,
              startDate: todoData.todo.startDate,
              completed: todoData.todo.completed || false
            }))
            
            console.log(`🔍 [导入调试] 准备批量创建待办事项:`, todosToCreate.length)
            
            if (todosToCreate.length === 0) {
              console.warn('⚠️ [导入调试] 没有有效的待办事项数据可以创建')
            } else {
              // 分批处理，每批最多500条
              const BATCH_SIZE = 500
              const totalBatches = Math.ceil(todosToCreate.length / BATCH_SIZE)
              console.log(`🔍 [导入调试] 将分 ${totalBatches} 批处理待办事项，每批最多 ${BATCH_SIZE} 条`)
              
              let totalCreated = 0
              let totalFailed = 0
              
              for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
                const startIndex = batchIndex * BATCH_SIZE
                const endIndex = Math.min(startIndex + BATCH_SIZE, todosToCreate.length)
                const batchTodos = todosToCreate.slice(startIndex, endIndex)
                
                console.log(`🔍 [导入调试] 处理第 ${batchIndex + 1}/${totalBatches} 批待办事项，包含 ${batchTodos.length} 条`)
                
                try {
                  const response = await fetch('http://localhost:3001/api/todos/batch', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
                    },
                    body: JSON.stringify({ todos: batchTodos })
                  })
                  
                  if (response.ok) {
                    const result = await response.json()
                    console.log(`🔍 [导入调试] 第 ${batchIndex + 1} 批创建待办事项响应:`, result)
                    
                    if (result.success) {
                      totalCreated += result.data.summary.created
                      totalFailed += result.data.summary.failed || 0
                      console.log(`✅ [导入调试] 第 ${batchIndex + 1} 批创建待办事项成功: ${result.data.summary.created}/${result.data.summary.total}`)
                      
                      if (result.data.failed && result.data.failed.length > 0) {
                        console.warn(`⚠️ [导入调试] 第 ${batchIndex + 1} 批部分待办事项创建失败:`, result.data.failed)
                      }
                    }
                  } else {
                    const errorText = await response.text()
                    console.error(`❌ [导入调试] 第 ${batchIndex + 1} 批创建待办事项失败:`, response.status, response.statusText)
                    console.error(`❌ [导入调试] 错误详情:`, errorText)
                    totalFailed += batchTodos.length
                  }
                } catch (error) {
                  console.error(`❌ [导入调试] 第 ${batchIndex + 1} 批处理待办事项异常:`, error)
                  totalFailed += batchTodos.length
                }
                
                // 批次间稍作延迟
                if (batchIndex < totalBatches - 1) {
                  await new Promise(resolve => setTimeout(resolve, 100))
                }
              }
              
              todosSuccessCount = totalCreated
              console.log(`✅ [导入调试] 所有待办事项批次处理完成，总计成功: ${totalCreated}，失败: ${totalFailed}`)
            }
          } catch (error) {
            console.error(`❌ [导入调试] 批量创建待办事项异常:`, error)
          }
        }

        // 批量添加日程安排
        console.log('🔍 [导入调试] 开始批量导入日程安排，总数:', importedSchedules.length)
        if (importedSchedules.length > 0) {
          try {
            // 获取现有日程安排用于重复检查
            let existingSchedules: Schedule[] = []
            try {
              let currentPage = 1
              const limit = 1000
              
              while (true) {
                const schedulesResponse = await getSchedules(currentPage, limit)
                if (!schedulesResponse.data || Object.keys(schedulesResponse.data).length === 0) break
                
                const schedules = Object.values(schedulesResponse.data).flat()
                // 转换为本地Schedule格式
                const convertedSchedules: Schedule[] = schedules.map((schedule: any) => ({
                  _id: schedule.id || schedule._id || '',
                  title: schedule.title || '',
                  time: schedule.time || '',
                  date: schedule.date || '',
                  description: schedule.description,
                  type: schedule.type,
                  userId: '',
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString()
                }))
                existingSchedules = [...existingSchedules, ...convertedSchedules]
                
                if (schedules.length < limit) break
                currentPage++
              }
            } catch (error) {
              console.warn('🔍 [导入调试] 获取现有日程安排失败，将跳过重复检查:', error)
            }
            
            console.log('🔍 [导入调试] 现有日程安排数量:', existingSchedules.length)
            
            // 调试：打印现有日程样本
            if (existingSchedules.length > 0) {
              console.log('🔍 [导入调试] 现有日程样本:', existingSchedules.slice(0, 3))
            }
            
            // 调试：打印导入日程样本
            if (importedSchedules.length > 0) {
              console.log('🔍 [导入调试] 导入日程样本:', importedSchedules.slice(0, 3))
            }
            
            // 准备批量数据，过滤重复项
            const schedulesToCreate = importedSchedules.filter((scheduleData, i) => {
              // 检查是否存在重复日程安排（基于标题、日期和时间）
              const isDuplicate = existingSchedules.some(existingSchedule => {
                const existingTitle = (existingSchedule.title || '').trim().toLowerCase()
                const importTitle = (scheduleData.schedule.title || '').trim().toLowerCase()
                const existingDate = existingSchedule.date
                const importDate = scheduleData.date
                const existingTime = (existingSchedule.time || '').trim()
                const importTime = (scheduleData.schedule.time || '').trim()
                
                // 标准化时间格式（去除秒数，统一格式）
                const normalizeTime = (time: string) => {
                  if (!time) return ''
                  // 处理 HH:MM:SS 格式，只保留 HH:MM
                  const timeMatch = time.match(/^(\d{1,2}):(\d{2})/)
                  if (timeMatch) {
                    const [, hours, minutes] = timeMatch
                    return `${hours.padStart(2, '0')}:${minutes}`
                  }
                  return time
                }
                
                const normalizedExistingTime = normalizeTime(existingTime)
                const normalizedImportTime = normalizeTime(importTime)
                
                // 如果标题、日期和时间都相同，认为是重复
                const isMatch = existingTitle === importTitle && 
                               existingDate === importDate && 
                               normalizedExistingTime === normalizedImportTime
                
                if (isMatch) {
                  console.log(`🔍 [导入调试] 发现重复日程:`, {
                    existing: { title: existingTitle, date: existingDate, time: normalizedExistingTime },
                    import: { title: importTitle, date: importDate, time: normalizedImportTime }
                  })
                }
                
                return isMatch
              })
              
              if (isDuplicate) {
                console.log(`🔍 [导入调试] 跳过重复日程安排 ${i + 1}:`, scheduleData.schedule.title?.substring(0, 50) + '...')
                return false
              }
              
              return true
            }).map(scheduleData => ({
              title: scheduleData.schedule.title,
              time: scheduleData.schedule.time,
              date: scheduleData.date,
              description: scheduleData.schedule.description,
              type: scheduleData.schedule.type
            }))
            
            console.log(`🔍 [导入调试] 准备批量创建日程安排:`, schedulesToCreate.length)
            
            if (schedulesToCreate.length === 0) {
              console.warn('⚠️ [导入调试] 没有有效的日程安排数据可以创建')
            } else {
              // 分批处理，每批最多500条
              const BATCH_SIZE = 500
              const totalBatches = Math.ceil(schedulesToCreate.length / BATCH_SIZE)
              console.log(`🔍 [导入调试] 将分 ${totalBatches} 批处理日程安排，每批最多 ${BATCH_SIZE} 条`)
              
              let totalCreated = 0
              let totalFailed = 0
              
              for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
                const startIndex = batchIndex * BATCH_SIZE
                const endIndex = Math.min(startIndex + BATCH_SIZE, schedulesToCreate.length)
                const batchSchedules = schedulesToCreate.slice(startIndex, endIndex)
                
                console.log(`🔍 [导入调试] 处理第 ${batchIndex + 1}/${totalBatches} 批日程安排，包含 ${batchSchedules.length} 条`)
                
                try {
                  const response = await fetch('http://localhost:3001/api/schedules/batch', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
                    },
                    body: JSON.stringify({ schedules: batchSchedules })
                  })
                  
                  if (response.ok) {
                    const result = await response.json()
                    console.log(`🔍 [导入调试] 第 ${batchIndex + 1} 批创建日程安排响应:`, result)
                    
                    if (result.success) {
                      totalCreated += result.data.summary.created
                      totalFailed += result.data.summary.failed || 0
                      console.log(`✅ [导入调试] 第 ${batchIndex + 1} 批创建日程安排成功: ${result.data.summary.created}/${result.data.summary.total}`)
                      
                      if (result.data.failed && result.data.failed.length > 0) {
                        console.warn(`⚠️ [导入调试] 第 ${batchIndex + 1} 批部分日程安排创建失败:`, result.data.failed)
                      }
                    }
                  } else {
                    const errorText = await response.text()
                    console.error(`❌ [导入调试] 第 ${batchIndex + 1} 批创建日程安排失败:`, response.status, response.statusText)
                    console.error(`❌ [导入调试] 错误详情:`, errorText)
                    totalFailed += batchSchedules.length
                  }
                } catch (error) {
                  console.error(`❌ [导入调试] 第 ${batchIndex + 1} 批处理日程安排异常:`, error)
                  totalFailed += batchSchedules.length
                }
                
                // 批次间稍作延迟
                if (batchIndex < totalBatches - 1) {
                  await new Promise(resolve => setTimeout(resolve, 100))
                }
              }
              
              schedulesSuccessCount = totalCreated
              console.log(`✅ [导入调试] 所有日程安排批次处理完成，总计成功: ${totalCreated}，失败: ${totalFailed}`)
            }
          } catch (error) {
            console.error(`❌ [导入调试] 批量创建日程安排异常:`, error)
          }
        }

        // 批量添加标签固定内容
        console.log('🔍 [导入调试] 开始批量导入标签内容，总数:', importedTagContents.length)
        if (importedTagContents.length > 0) {
          try {
            // 获取现有标签内容用于重复检查
            let existingTagContents: TagContent[] = []
            try {
              const tagContentsResponse = await fetch('http://localhost:3001/api/tag-contents', {
                headers: {
                  'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
                }
              })
              
              if (tagContentsResponse.ok) {
                const result = await tagContentsResponse.json()
                existingTagContents = result.data || []
              }
            } catch (error) {
              console.warn('🔍 [导入调试] 获取现有标签内容失败，将跳过重复检查:', error)
            }
            
            console.log('🔍 [导入调试] 现有标签内容数量:', existingTagContents.length)
            
            // 准备批量数据，过滤重复项和无效数据
            const tagContentsToCreate = importedTagContents.filter((tagContentData, i) => {
              // 检查内容是否有效
              if (!tagContentData.content || tagContentData.content.trim().length === 0) {
                console.log(`🔍 [导入调试] 跳过空内容标签 ${i + 1}:`, tagContentData.tag)
                return false
              }
              
              // 检查是否存在重复标签内容（基于标签名）
              const isDuplicate = existingTagContents.some(existingTagContent => {
                return existingTagContent.tag === tagContentData.tag
              })
              
              if (isDuplicate) {
                console.log(`🔍 [导入调试] 跳过重复标签内容 ${i + 1}:`, tagContentData.tag)
                return false
              }
              
              return true
            }).map(tagContentData => ({
              tag: tagContentData.tag || '未命名标签',
              content: (tagContentData.content || '').trim() || '默认标签内容',
              isGoalEnabled: tagContentData.isGoalEnabled || false,
              targetCount: tagContentData.targetCount || 0,
              currentCount: tagContentData.currentCount || 0
            })).filter(tagContent => {
              // 最终验证：确保content字段符合后端要求（1-100000字符）
              const isValid = tagContent.content.length >= 1 && tagContent.content.length <= 100000
              if (!isValid) {
                console.warn(`⚠️ [导入调试] 过滤掉无效标签内容:`, tagContent.tag, '内容长度:', tagContent.content.length)
              }
              return isValid
            })
            
            console.log(`🔍 [导入调试] 准备批量创建标签内容:`, tagContentsToCreate.length)
            console.log(`🔍 [导入调试] 第一条标签内容完整数据:`, JSON.stringify(tagContentsToCreate[0], null, 2))
            
            const requestBody = { tagContents: tagContentsToCreate }
            console.log(`🔍 [导入调试] 发送标签内容请求体:`, JSON.stringify(requestBody, null, 2).substring(0, 1000) + '...')
            
            // 调用批量创建API
            const response = await fetch('http://localhost:3001/api/tag-contents/batch', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
              },
              body: JSON.stringify(requestBody)
            })
            
            if (response.ok) {
              const result = await response.json()
              console.log(`🔍 [导入调试] 批量创建标签内容响应:`, result)
              
              if (result.success) {
                tagContentsSuccessCount = result.data.summary.created
                console.log(`✅ [导入调试] 批量创建标签内容成功: ${result.data.summary.created}/${result.data.summary.total}`)
                
                if (result.data.failed.length > 0) {
                  console.warn(`⚠️ [导入调试] 部分标签内容创建失败:`, result.data.failed)
                }
              }
            } else {
              const errorText = await response.text()
              console.error(`❌ [导入调试] 批量创建标签内容失败:`, response.status, response.statusText)
              console.error(`❌ [导入调试] 错误详情:`, errorText)
              
              try {
                const errorJson = JSON.parse(errorText)
                if (errorJson.errors) {
                  console.error(`❌ [导入调试] 验证错误:`, errorJson.errors)
                }
              } catch (e) {
                console.error(`❌ [导入调试] 无法解析错误响应:`, e)
              }
            }
          } catch (error) {
            console.error(`❌ [导入调试] 批量创建标签内容异常:`, error)
          }
        }

        // 重新加载数据
        await loadNotes()
        await loadAllSchedules()
        await loadTodosData()
        
        // 触发日程更新事件
        window.dispatchEvent(new CustomEvent('scheduleUpdated'))
        
        const totalSuccess = notesSuccessCount + todosSuccessCount + schedulesSuccessCount + tagContentsSuccessCount
        const totalSkipped = (importedNotes.length - notesSuccessCount) + (importedTodos.length - todosSuccessCount) + (importedSchedules.length - schedulesSuccessCount) + (importedTagContents.length - tagContentsSuccessCount)
        
        let description = `成功导入 ${totalSuccess} 条数据`
        if (totalSkipped > 0) description += `，跳过重复项 ${totalSkipped} 条`
        
        if (notesSuccessCount > 0) {
          const notesSkipped = importedNotes.length - notesSuccessCount
          description += `\n- 笔记: ${notesSuccessCount} 条`
          if (notesSkipped > 0) description += ` (跳过 ${notesSkipped} 条重复)`
        }
        if (todosSuccessCount > 0) {
          const todosSkipped = importedTodos.length - todosSuccessCount
          description += `\n- Todo: ${todosSuccessCount} 条`
          if (todosSkipped > 0) description += ` (跳过 ${todosSkipped} 条重复)`
        }
        if (schedulesSuccessCount > 0) {
          const schedulesSkipped = importedSchedules.length - schedulesSuccessCount
          description += `\n- 日程: ${schedulesSuccessCount} 条`
          if (schedulesSkipped > 0) description += ` (跳过 ${schedulesSkipped} 条重复)`
        }
        if (tagContentsSuccessCount > 0) {
          const tagContentsSkipped = importedTagContents.length - tagContentsSuccessCount
          description += `\n- 标签固定内容: ${tagContentsSuccessCount} 条`
          if (tagContentsSkipped > 0) description += ` (跳过 ${tagContentsSkipped} 条重复)`
        }
        
        toast({
          title: "导入成功",
          description,
        })
      } catch (error) {
        console.error('导入失败:', error)
        toast({
          title: "导入失败",
          description: "文件解析失败，请检查文件格式",
          variant: "destructive",
        })
      } finally {
        setIsImporting(false)
      }
    }
    input.click()
  }

  // 检测导入文件类型
  const detectImportType = (text: string): 'notes' | 'todos' | 'schedules' | 'tags' | 'mixed' => {
    const hasNotes = text.includes('# 土豆笔记导出') || text.includes('📝 笔记')
    const hasTodos = text.includes('# 土豆Todo事项导出') || text.includes('✅ Todo事项')
    const hasSchedules = text.includes('# 土豆日程安排导出') || text.includes('📅 日程安排')
    const hasTags = text.includes('# 土豆标签内容导出')
    
    if (hasTags) return 'tags'
    
    const typeCount = [hasNotes, hasTodos, hasSchedules].filter(Boolean).length
    if (typeCount > 1) return 'mixed'
    
    if (hasNotes) return 'notes'
    if (hasTodos) return 'todos'
    if (hasSchedules) return 'schedules'
    
    // 默认按笔记格式解析
    return 'notes'
  }

  // 解析标签Markdown文档为笔记数据
  const parseTagMarkdownToData = (text: string) => {
    console.log('🔍 [标签解析调试] 开始解析标签Markdown文本')
    const notes: Array<{ content: string; tags: string[]; createdAt: Date }> = []
    const lines = text.split('\n')
    console.log('🔍 [标签解析调试] 总行数:', lines.length)
    
    let currentTag: string | null = null
    let currentContent = ''
    let currentDate: Date | null = null
    let inContent = false
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()
      
      // 匹配标签标题 (## #标签名)
      const tagMatch = line.match(/^##\s*#(.+)$/)
      if (tagMatch) {
        // 保存上一个内容
        if (currentContent.trim() && currentTag && currentDate) {
          notes.push({
            content: currentContent.trim(),
            tags: [currentTag],
            createdAt: currentDate
          })
        }
        
        currentTag = tagMatch[1]
        currentContent = ''
        currentDate = null
        inContent = false
        continue
      }
      
      // 匹配内容项标题 (### 1. 📝 笔记 或 ### 1. ✅ Todo)
      const itemMatch = line.match(/^###\s*\d+\.\s*[📝✅]/)
      if (itemMatch) {
        // 保存上一个内容
        if (currentContent.trim() && currentTag && currentDate) {
          notes.push({
            content: currentContent.trim(),
            tags: [currentTag],
            createdAt: currentDate
          })
        }
        
        currentContent = ''
        currentDate = null
        inContent = false
        continue
      }
      
      // 匹配日期行 (**日期:** 2024年1月1日 14:30)
      const dateMatch = line.match(/^\*\*日期:\*\*\s*(.+)$/)
      if (dateMatch && currentTag) {
        try {
          const dateStr = dateMatch[1]
          // 解析日期和时间
          const dateTimeMatch = dateStr.match(/(\d{4})年(\d{1,2})月(\d{1,2})日\s*(\d{1,2}):(\d{2})/)
          if (dateTimeMatch) {
            const [, year, month, day, hour, minute] = dateTimeMatch
            currentDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), parseInt(hour), parseInt(minute))
          } else {
            // 只有日期没有时间
            const dateOnlyMatch = dateStr.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/)
            if (dateOnlyMatch) {
              const [, year, month, day] = dateOnlyMatch
              currentDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
            }
          }
        } catch (error) {
          console.error('标签文件日期解析失败:', error)
        }
        inContent = true
        continue
      }
      
      // 收集内容
      if (inContent && currentTag && line !== '' && !line.startsWith('**') && !line.startsWith('#') && line !== '---') {
        if (currentContent) currentContent += '\n'
        currentContent += lines[i] // 使用原始行，保持格式
      }
    }
    
    // 保存最后一个内容
    if (currentContent.trim() && currentTag && currentDate) {
      notes.push({
        content: currentContent.trim(),
        tags: [currentTag],
        createdAt: currentDate
      })
    }
    
    console.log('🔍 [标签解析调试] 解析完成，笔记数量:', notes.length)
    return { notes }
  }

  // 解析Markdown文本为笔记、Todo和日程数据
  const parseMarkdownToData = (text: string) => {
    console.log('🔍 [解析调试] 开始解析Markdown文本')
    const notes: Array<{ content: string; tags: string[]; createdAt: Date }> = []
    const todos: Array<{ date: string; todo: any }> = []
    const schedules: Array<{ date: string; schedule: any }> = []
    const lines = text.split('\n')
    console.log('🔍 [解析调试] 总行数:', lines.length)
    
    let currentDate: Date | null = null
    let currentDateKey: string = ''
    let currentTime: string | null = null
    let currentContent = ''
    let currentTags: string[] = []
    let inNoteContent = false
    let currentSection: 'notes' | 'todos' | 'schedules' | null = null
    
    // 开始解析文件
    console.log('🔍 [解析调试] 开始逐行解析...')
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()
      
      // 匹配日期标题 (## 2024年1月1日 星期一 或 ## 2024年1月1日星期一)
      // 确保不匹配章节标题 (### 📝 笔记) 和笔记时间标题 (#### 14:30)
      const dateMatch = line.match(/^##\s*(.+)$/) && !line.match(/^###/) && !line.match(/^####/)
      if (dateMatch) {
        console.log(`🔍 [解析调试] 第${i+1}行 - 发现日期行:`, line)
        const actualDateMatch = line.match(/^##\s*(.+)$/)
        // 找到日期行
        
        // 保存上一个笔记
        if (currentContent.trim() && currentDate && currentTime && currentSection === 'notes') {
          console.log('🔍 [解析调试] 保存上一个笔记:', {
            content: currentContent.trim().substring(0, 50) + '...',
            tags: currentTags,
            time: currentTime
          })
          const [hours, minutes] = currentTime.split(':')
          const noteDate = new Date(currentDate)
          noteDate.setHours(parseInt(hours), parseInt(minutes))
          
          notes.push({
            content: currentContent.trim(),
            tags: [...currentTags],
            createdAt: noteDate
          })
        }
        
        // 重置状态
        currentContent = ''
        currentTags = []
        currentTime = null
        inNoteContent = false
        // 不重置 currentSection，让它在同一日期内保持有效
        
        // 尝试解析日期 - 支持多种格式
        try {
          const dateStr = actualDateMatch![1]
          
          // 匹配 "2024年1月1日 星期一" 或 "2024年1月1日星期一" 格式
          const dateRegex = /(\d{4})年(\d{1,2})月(\d{1,2})日/
          const match = dateStr.match(dateRegex)
          if (match) {
            const [, year, month, day] = match
            currentDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
            currentDateKey = currentDate.toDateString()
          } else {
            // 尝试其他日期格式
            const isoMatch = dateStr.match(/(\d{4})-(\d{1,2})-(\d{1,2})/)
            if (isoMatch) {
              const [, year, month, day] = isoMatch
              currentDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
              currentDateKey = currentDate.toDateString()
            }
          }
        } catch (error) {
          console.error('日期解析失败:', error)
        }
        continue
      }
      
      // 匹配章节标题
      const sectionMatch = line.match(/^###\s*([📝✅📅])\s*(.+)$/)
      if (sectionMatch) {
        console.log(`🔍 [解析调试] 第${i+1}行 - 发现章节:`, line)
        console.log(`🔍 [解析调试] 章节匹配结果:`, sectionMatch)
        const emoji = sectionMatch[1]
        
        // 保存上一个笔记（如果有的话）
        if (currentContent.trim() && currentDate && currentTime && currentSection === 'notes') {
          const [hours, minutes] = currentTime.split(':')
          const noteDate = new Date(currentDate)
          noteDate.setHours(parseInt(hours), parseInt(minutes))
          
          notes.push({
            content: currentContent.trim(),
            tags: [...currentTags],
            createdAt: noteDate
          })
        }
        
        // 重置笔记相关状态
        currentContent = ''
        currentTags = []
        currentTime = null
        inNoteContent = false
        
        // 设置新的章节 - 修复emoji匹配问题
        console.log('🔍 [解析调试] emoji值:', emoji, 'emoji长度:', emoji.length, 'emoji编码:', emoji.charCodeAt(0))
        if (line.includes('📝')) {
          currentSection = 'notes'
          console.log('🔍 [解析调试] 进入笔记章节，设置 currentSection =', currentSection)
        } else if (line.includes('✅')) {
          currentSection = 'todos'
          console.log('🔍 [解析调试] 进入Todo章节，设置 currentSection =', currentSection)
        } else if (line.includes('📅')) {
          currentSection = 'schedules'
          console.log('🔍 [解析调试] 进入日程章节，设置 currentSection =', currentSection)
        }
        continue
      }
      
      // 匹配笔记时间标题 (#### 14:30 - 笔记 1) - 使用更宽松的匹配
      if (line.startsWith('####')) {
        console.log(`🔍 [解析调试] 第${i+1}行 - 发现####行:`, line, '当前章节:', currentSection)
      }
      const noteTimeMatch = line.match(/^####\s*(\d{1,2}:\d{2})\s*-\s*笔记/)
      if (line.startsWith('####') && currentSection === 'notes') {
        console.log(`🔍 [解析调试] 第${i+1}行 - 检查笔记时间行:`, line, '匹配结果:', noteTimeMatch)
      }
      if (noteTimeMatch && currentSection === 'notes') {
        console.log(`🔍 [解析调试] 第${i+1}行 - 发现笔记时间:`, line, '时间:', noteTimeMatch[1])
        // 保存上一个笔记
        if (currentContent.trim() && currentDate && currentTime) {
          const [hours, minutes] = currentTime.split(':')
          const noteDate = new Date(currentDate)
          noteDate.setHours(parseInt(hours), parseInt(minutes))
          
          notes.push({
            content: currentContent.trim(),
            tags: [...currentTags],
            createdAt: noteDate
          })
        }
        
        // 重置笔记内容和标签
        currentContent = ''
        currentTags = []
        currentTime = noteTimeMatch[1]
        inNoteContent = false
        continue
      }
      
      // 匹配Todo项目
      const todoMatch = line.match(/^(\d+)\. ([✅⬜])\s*(.+)$/)
      if (todoMatch && currentSection === 'todos' && currentDate) {
        const [, , status, content] = todoMatch
        const completed = status === '✅'
        
        // 创建todo对象
        const todo = {
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          content: content.trim(),
          completed,
          tags: [] as string[],
          dueDate: undefined as string | undefined,
          startDate: undefined as string | undefined
        }
        
        // 检查接下来的几行是否有标签、截止日期等信息
        let nextLineIndex = i + 1
        while (nextLineIndex < lines.length) {
          const nextLine = lines[nextLineIndex].trim()
          if (nextLine.startsWith('**标签:**')) {
            const tagStr = nextLine.replace('**标签:**', '').trim()
            todo.tags = tagStr.split(/\s+/).filter((tag: string) => tag.startsWith('#')).map((tag: string) => tag.slice(1))
            i = nextLineIndex
          } else if (nextLine.startsWith('**截止日期:**')) {
            todo.dueDate = nextLine.replace('**截止日期:**', '').trim()
            i = nextLineIndex
          } else if (nextLine.startsWith('**开始日期:**')) {
            todo.startDate = nextLine.replace('**开始日期:**', '').trim()
            i = nextLineIndex
          } else if (nextLine === '' || nextLine.match(/^\d+\. [✅⬜]/)) {
            break
          } else {
            break
          }
          nextLineIndex++
        }
        
        todos.push({ date: currentDateKey, todo })
        continue
      }
      
      // 匹配日程项目
      const scheduleMatch = line.match(/^(\d+)\. \*\*([^*]+)\*\*\s*-\s*(.+)$/)
      if (scheduleMatch && currentSection === 'schedules' && currentDate) {
        const [, , time, title] = scheduleMatch
        
        // 创建schedule对象
        const schedule = {
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          title: title.trim(),
          time: time.trim(),
          description: undefined as string | undefined,
          type: 'event' as 'meeting' | 'appointment' | 'event' | 'reminder'
        }
        
        // 检查接下来的几行是否有描述、类型等信息
        let nextLineIndex = i + 1
        while (nextLineIndex < lines.length) {
          const nextLine = lines[nextLineIndex].trim()
          if (nextLine.startsWith('**类型:**')) {
            const typeStr = nextLine.replace('**类型:**', '').trim()
            if (['meeting', 'appointment', 'event', 'reminder'].includes(typeStr)) {
              schedule.type = typeStr as any
            }
            i = nextLineIndex
          } else if (!nextLine.startsWith('**') && nextLine !== '' && !nextLine.match(/^\d+\. \*\*/)) {
            // 这是描述内容
            schedule.description = nextLine
            i = nextLineIndex
          } else if (nextLine === '' || nextLine.match(/^\d+\. \*\*/)) {
            break
          } else {
            break
          }
          nextLineIndex++
        }
        
        schedules.push({ date: currentDateKey, schedule })
        continue
      }
      
      // 匹配标签行 (**标签:** #tag1 #tag2)
      const tagMatch = line.match(/^\*\*标签:\*\*\s*(.+)$/)
      if (tagMatch && currentSection === 'notes') {
        const tagStr = tagMatch[1]
        currentTags = tagStr.split(/\s+/).filter((tag: string) => tag.startsWith('#')).map((tag: string) => tag.slice(1))
        inNoteContent = true
        continue
      }
      
      // 跳过分隔线、空行和标题行
      if (line === '---' || line === '' || line.startsWith('#')) {
        if (line === '---' && inNoteContent) {
          inNoteContent = false
        }
        continue
      }
      
      // 收集笔记内容（仅在notes section中）
      if (currentSection === 'notes' && currentTime && line !== '') {
        if (!inNoteContent && !line.startsWith('**')) {
          inNoteContent = true
          console.log(`🔍 [解析调试] 第${i+1}行 - 开始收集笔记内容`)
        }
        
        if (inNoteContent && !line.startsWith('**')) {
          if (currentContent) currentContent += '\n'
          currentContent += lines[i] // 使用原始行，保持格式
          console.log(`🔍 [解析调试] 第${i+1}行 - 添加内容:`, lines[i].substring(0, 50) + '...')
        }
      }
    }
    
    // 保存最后一个笔记
    if (currentContent.trim() && currentDate && currentTime && currentSection === 'notes') {
      console.log('🔍 [解析调试] 保存最后一个笔记:', {
        content: currentContent.trim().substring(0, 50) + '...',
        tags: currentTags,
        time: currentTime
      })
      const [hours, minutes] = currentTime.split(':')
      const noteDate = new Date(currentDate)
      noteDate.setHours(parseInt(hours), parseInt(minutes))
      
      notes.push({
        content: currentContent.trim(),
        tags: [...currentTags],
        createdAt: noteDate
      })
    }
    
    // 解析完成，返回所有数据
    console.log('🔍 [解析调试] 解析完成，最终结果:', {
      notesCount: notes.length,
      todosCount: todos.length,
      schedulesCount: schedules.length
    })
    return { notes, todos, schedules }
  }

  // 解析统一导出格式的Markdown文本
  const parseUnifiedMarkdownToData = (text: string) => {
    console.log('🔍 [统一解析调试] 开始解析统一导出格式')
    const notes: Array<{ content: string; tags: string[]; createdAt: Date }> = []
    const todos: Array<{ date: string; todo: any }> = []
    const schedules: Array<{ date: string; schedule: any }> = []
    const tagContents: Array<{ tag: string; content: string; isGoalEnabled?: boolean; targetCount?: number; currentCount?: number }> = []
    const lines = text.split('\n')
    
    let currentDate: Date | null = null
    let currentDateKey: string = ''
    let currentSection: 'notes' | 'todos' | 'schedules' | 'tags' | null = null
    let currentTime: string | null = null
    let currentContent = ''
    let currentTags: string[] = []
    let inContent = false
    let currentTag: string = ''
    let inTagSection = false
    let currentTagContent = ''
    let currentTagGoalEnabled = false
    let currentTagTargetCount = 0
    let currentTagCurrentCount = 0
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()
      
      // 跳过标题和统计信息
      if (line.startsWith('# 土豆笔记本完整导出') || line.startsWith('## 数据统计') || line.startsWith('**导出时间:**')) {
        continue
      }
      
      // 检测标签汇总部分
      if (line.includes('# 📋 标签汇总')) {
        inTagSection = true
        currentSection = 'tags'
        continue
      }
      
      // 处理标签固定内容
      if (inTagSection) {
        const tagMatch = line.match(/^## (.+)$/)
        if (tagMatch) {
          // 保存上一个标签的内容（只有当内容不为空时）
          if (currentTag && currentTagContent.trim()) {
            tagContents.push({
              tag: currentTag.replace('#', ''), // 移除可能的#前缀
              content: currentTagContent.trim(),
              isGoalEnabled: currentTagGoalEnabled,
              targetCount: currentTagTargetCount,
              currentCount: currentTagCurrentCount
            })
          }
          // 重置当前标签状态
          currentTag = tagMatch[1].replace('#', '') // 移除可能的#前缀
          currentTagContent = ''
          currentTagGoalEnabled = false
          currentTagTargetCount = 0
          currentTagCurrentCount = 0
          continue
        }
        
        // 解析目标设置信息
        if (line.includes('**目标设置:**')) {
          continue // 跳过标题行
        }
        
        const goalEnabledMatch = line.match(/- 目标功能:\s*已启用/)
        if (goalEnabledMatch) {
          currentTagGoalEnabled = true
          continue
        }
        
        const targetCountMatch = line.match(/- 目标数量:\s*(\d+)/)
        if (targetCountMatch) {
          currentTagTargetCount = parseInt(targetCountMatch[1])
          continue
        }
        
        const currentCountMatch = line.match(/- 当前进度:\s*(\d+)/)
        if (currentCountMatch) {
          currentTagCurrentCount = parseInt(currentCountMatch[1])
          continue
        }
        
        // 跳过完成进度行和分隔线
        if (line.includes('- 完成进度:') || line === '---' || line.includes('**关联内容:**') || line.match(/^\d+\. [📝✅]/)) {
          continue
        }
        
        // 收集标签固定内容（跳过标签固定内容标题）
        if (currentTag && line.trim() && !line.startsWith('#') && !line.includes('**标签固定内容:**')) {
          if (currentTagContent) currentTagContent += '\n'
          currentTagContent += line
        }
        continue
      }
      
      // 匹配日期标题 (## 2024年1月1日 星期一)
      const dateMatch = line.match(/^##\s*(.+)$/)
      if (dateMatch && !line.match(/^###/) && !line.match(/^####/) && !line.includes('数据统计') && !line.includes('标签汇总')) {
        // 保存上一个内容
        if (currentContent.trim() && currentDate && currentTime && currentSection === 'notes') {
          const [hours, minutes] = currentTime.split(':')
          const noteDate = new Date(currentDate)
          noteDate.setHours(parseInt(hours), parseInt(minutes))
          notes.push({
            content: currentContent.trim(),
            tags: [...currentTags],
            createdAt: noteDate
          })
        }
        
        // 重置状态
        currentContent = ''
        currentTags = []
        currentTime = null
        inContent = false
        
        // 解析日期
        try {
          const dateStr = dateMatch[1]
          const dateRegex = /(\d{4})年(\d{1,2})月(\d{1,2})日/
          const match = dateStr.match(dateRegex)
          if (match) {
            const [, year, month, day] = match
            currentDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
            currentDateKey = currentDate.toDateString()
          }
        } catch (error) {
          console.error('统一格式日期解析失败:', error)
        }
        continue
      }
      
      // 匹配章节标题 (### 📝 笔记、### ✅ Todo事项、### 📅 日程安排)
      const sectionMatch = line.match(/^###\s*([📝✅📅])\s*(.+)$/)
      if (sectionMatch) {
        // 保存上一个笔记
        if (currentContent.trim() && currentDate && currentTime && currentSection === 'notes') {
          const [hours, minutes] = currentTime.split(':')
          const noteDate = new Date(currentDate)
          noteDate.setHours(parseInt(hours), parseInt(minutes))
          notes.push({
            content: currentContent.trim(),
            tags: [...currentTags],
            createdAt: noteDate
          })
        }
        
        // 重置状态
        currentContent = ''
        currentTags = []
        currentTime = null
        inContent = false
        
        // 设置章节类型
        if (line.includes('📝')) {
          currentSection = 'notes'
        } else if (line.includes('✅')) {
          currentSection = 'todos'
        } else if (line.includes('📅')) {
          currentSection = 'schedules'
        }
        continue
      }
      
      // 匹配笔记时间标题 (#### 14:30 - 笔记 1)
      const noteTimeMatch = line.match(/^####\s*(\d{1,2}:\d{2})\s*-\s*笔记/)
      if (noteTimeMatch && currentSection === 'notes') {
        // 保存上一个笔记
        if (currentContent.trim() && currentDate && currentTime) {
          const [hours, minutes] = currentTime.split(':')
          const noteDate = new Date(currentDate)
          noteDate.setHours(parseInt(hours), parseInt(minutes))
          notes.push({
            content: currentContent.trim(),
            tags: [...currentTags],
            createdAt: noteDate
          })
        }
        
        // 重置笔记内容和标签
        currentContent = ''
        currentTags = []
        currentTime = noteTimeMatch[1]
        inContent = false
        continue
      }
      
      // 匹配Todo项目
      const todoMatch = line.match(/^(\d+)\. ([✅⬜])\s*(.+)$/)
      if (todoMatch && currentSection === 'todos' && currentDate) {
        const [, , status, content] = todoMatch
        const completed = status === '✅'
        
        const todo = {
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          content: content.trim(),
          completed,
          tags: [] as string[],
          dueDate: undefined as string | undefined,
          startDate: undefined as string | undefined
        }
        
        // 检查接下来的几行是否有标签、截止日期等信息
        let nextLineIndex = i + 1
        while (nextLineIndex < lines.length) {
          const nextLine = lines[nextLineIndex].trim()
          if (nextLine.startsWith('**标签:**')) {
            const tagStr = nextLine.replace('**标签:**', '').trim()
            todo.tags = tagStr.split(/\s+/).filter((tag: string) => tag.startsWith('#')).map((tag: string) => tag.slice(1))
            i = nextLineIndex
          } else if (nextLine.startsWith('**截止日期:**')) {
            todo.dueDate = nextLine.replace('**截止日期:**', '').trim()
            i = nextLineIndex
          } else if (nextLine.startsWith('**开始日期:**')) {
            todo.startDate = nextLine.replace('**开始日期:**', '').trim()
            i = nextLineIndex
          } else if (nextLine === '' || nextLine.match(/^\d+\. [✅⬜]/)) {
            break
          } else {
            break
          }
          nextLineIndex++
        }
        
        todos.push({ date: currentDateKey, todo })
        continue
      }
      
      // 匹配日程项目
      const scheduleMatch = line.match(/^(\d+)\. \*\*([^*]+)\*\*\s*-\s*(.+)$/)
      if (scheduleMatch && currentSection === 'schedules' && currentDate) {
        const [, , time, title] = scheduleMatch
        
        const schedule = {
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          title: title.trim(),
          time: time.trim(),
          description: undefined as string | undefined,
          type: 'event' as 'meeting' | 'appointment' | 'event' | 'reminder'
        }
        
        // 检查接下来的几行是否有描述、类型等信息
        let nextLineIndex = i + 1
        while (nextLineIndex < lines.length) {
          const nextLine = lines[nextLineIndex].trim()
          if (nextLine.startsWith('**类型:**')) {
            const typeStr = nextLine.replace('**类型:**', '').trim()
            if (['meeting', 'appointment', 'event', 'reminder'].includes(typeStr)) {
              schedule.type = typeStr as any
            }
            i = nextLineIndex
          } else if (!nextLine.startsWith('**') && nextLine !== '' && !nextLine.match(/^\d+\. \*\*/)) {
            schedule.description = nextLine
            i = nextLineIndex
          } else if (nextLine === '' || nextLine.match(/^\d+\. \*\*/)) {
            break
          } else {
            break
          }
          nextLineIndex++
        }
        
        schedules.push({ date: currentDateKey, schedule })
        continue
      }
      
      // 匹配标签行 (**标签:** #tag1 #tag2)
      const tagMatch = line.match(/^\*\*标签:\*\*\s*(.+)$/)
      if (tagMatch && currentSection === 'notes') {
        const tagStr = tagMatch[1]
        currentTags = tagStr.split(/\s+/).filter((tag: string) => tag.startsWith('#')).map((tag: string) => tag.slice(1))
        inContent = true
        continue
      }
      
      // 跳过分隔线、空行和标题行
      if (line === '---' || line === '' || line.startsWith('#')) {
        if (line === '---' && inContent) {
          inContent = false
        }
        continue
      }
      
      // 收集笔记内容
      if (currentSection === 'notes' && currentTime && line !== '') {
        if (!inContent && !line.startsWith('**')) {
          inContent = true
        }
        
        if (inContent && !line.startsWith('**')) {
          if (currentContent) currentContent += '\n'
          currentContent += lines[i]
        }
      }
    }
    
    // 保存最后一个笔记
    if (currentContent.trim() && currentDate && currentTime && currentSection === 'notes') {
      const [hours, minutes] = currentTime.split(':')
      const noteDate = new Date(currentDate)
      noteDate.setHours(parseInt(hours), parseInt(minutes))
      notes.push({
        content: currentContent.trim(),
        tags: [...currentTags],
        createdAt: noteDate
      })
    }
    
    // 保存最后一个标签的内容（只有当内容不为空时）
    if (currentTag && inTagSection && currentTagContent.trim()) {
      tagContents.push({
        tag: currentTag.replace('#', ''), // 移除可能的#前缀
        content: currentTagContent.trim(),
        isGoalEnabled: currentTagGoalEnabled,
        targetCount: currentTagTargetCount,
        currentCount: currentTagCurrentCount
      })
    }
    
    console.log('🔍 [统一解析调试] 解析完成:', {
      notesCount: notes.length,
      todosCount: todos.length,
      schedulesCount: schedules.length,
      tagContentsCount: tagContents.length
    })
    
    return { notes, todos, schedules, tagContents }
  }

  // 添加笔记
  const handleAddNote = async () => {
    if (!inputValue.trim() && !selectedImage) return

    setIsAdding(true)
    try {
      if (inputMode === 'todo') {
        // Todo模式：添加到TodoList
        const { cleanContent, tags } = extractTagsAndCleanContent(inputValue.trim())
        
        // 调用后端API创建todo
        const todoResult = await apiClient.createTodo({
          text: cleanContent,
          tags,
          dueDate: todoDueDate || undefined
        })
        
        if (!todoResult.error) {
          // 重新加载todos数据以确保同步
          await loadTodosData()
          
          setInputValue('')
          setTodoDueDate('')
          setTodoStartDate('')
          
          toast({
            title: "成功",
            description: "Todo已添加并保存到服务器",
          })
        } else {
          throw new Error(todoResult.error || '创建Todo失败')
        }
      } else {
        // 笔记模式：原有逻辑
        let noteContent = inputValue
        
        // 如果是标签搜索模式，自动添加当前标签
        if (searchTerm.startsWith('#')) {
          const currentTag = searchTerm.slice(1) // 移除#号
          // 检查内容中是否已包含该标签
          if (!noteContent.includes(searchTerm)) {
            noteContent = noteContent + ' ' + searchTerm
          }
        }
        
        const result = await addNote(noteContent, new Date().toISOString(), selectedImage || undefined)
        if (result.success) {
          setInputValue("")
          setSelectedImage(null) // 清除已选择的图片
          // 如果有搜索词，重新搜索；否则重新加载
          if (searchTerm) {
            // 稍微延迟一下再搜索，确保服务器端数据已经更新
            setTimeout(async () => {
              await handleSearch(searchTerm)
            }, 500)
          } else {
            await loadNotes()
          }
          // 强制更新日期以触发TodoList重新加载
          setDate(new Date(date))
          
          // 自动滚动到最新添加的笔记
          setTimeout(() => {
            if (notes.length > 0) {
              // 找到最新的笔记（按创建时间排序）
              const latestNote = notes.reduce((latest, current) => {
                return new Date(current.createdAt) > new Date(latest.createdAt) ? current : latest
              })
              
              // 滚动到最新笔记
              const noteElement = document.getElementById(`note-${latestNote.id}`)
              if (noteElement) {
                noteElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
              }
            } else {
              // 如果没有笔记，滚动到当前日期
              const currentDateString = date.toDateString()
              const dateElement = document.getElementById(`date-${currentDateString}`) || 
                                 document.getElementById(`date-group-${currentDateString}`)
              if (dateElement) {
                dateElement.scrollIntoView({ behavior: 'smooth', block: 'start' })
              }
            }
          }, 300)
          
          toast({
            title: "添加成功",
            description: "笔记已保存到服务器",
          })
        } else {
          toast({
            title: "添加失败",
            description: result.error || "未知错误",
            variant: "destructive",
          })
        }
      }
    } catch (error) {
      toast({
        title: "添加失败",
        description: inputMode === 'todo' ? "添加Todo失败" : "网络错误，请重试",
        variant: "destructive",
      })
    } finally {
      setIsAdding(false)
    }
  }
  
  // extractTagsAndCleanContent函数已移到组件外部
  
  // 标签页面添加笔记函数
  const handleTagAddNote = async () => {
    if (!tagNoteInput.trim() && tagProgressInput === 0) return

    setIsTagNoteAdding(true)
    try {
      let noteContent = tagNoteInput.trim()
      
      // 获取当前标签的目标设置
      const tagResponse = await tagContentsApi.get(currentTag)
      const tagData = tagResponse.data
      
      // 如果有进度输入且标签启用了目标功能，添加进度文字并更新进度
      if (tagProgressInput > 0 && tagData?.isGoalEnabled) {
        const progressText = `增加进度${tagProgressInput}`
        noteContent = noteContent ? `${noteContent} ${progressText}` : progressText
        
        // 更新当前进度
        const newCurrentCount = (tagData.currentCount || 0) + tagProgressInput
        
        // 保存更新的进度到标签内容
        await tagContentsApi.save(currentTag, tagData.content || '', {
          isGoalEnabled: tagData.isGoalEnabled,
          targetCount: tagData.targetCount || 1,
          currentCount: newCurrentCount
        })
        
        // 触发标签内容更新事件，让TagContent组件立即刷新
        window.dispatchEvent(new CustomEvent(`tag-updated-${currentTag}`))
        
        // 触发目标列表刷新事件
        window.dispatchEvent(new CustomEvent('goals-list-refresh'))
      }
      
      // 添加标签到笔记内容
      if (!noteContent.includes(`#${currentTag}`)) {
        noteContent = `${noteContent} #${currentTag}`
      }
      
      // 调用添加笔记的API
      const result = await addNote(noteContent, new Date().toISOString())
      
      if (result.success) {
        // 清空输入
        setTagNoteInput('')
        setTagProgressInput(0)
        
        // 重新加载笔记
        await handleSearch(`#${currentTag}`)
        
        toast({
          title: "添加成功",
          description: "笔记已保存到服务器",
        })
      } else {
        throw new Error(result.error || '添加笔记失败')
      }
    } catch (error) {
      console.error('Error adding tag note:', error)
      toast({
        title: "添加失败",
        description: "添加笔记失败，请重试",
        variant: "destructive",
      })
    } finally {
      setIsTagNoteAdding(false)
    }
  }
   
   const handleToggleTodo = async (todoId: string) => {
    try {
      // 在所有日期中查找todo
      let targetTodo: any = null
      for (const dateKey in todosByDate) {
        const todo = todosByDate[dateKey].find(t => t.id === todoId)
        if (todo) {
          targetTodo = todo
          break
        }
      }
      
      if (!targetTodo) return
      
      // 如果todo从未完成变为完成，则删除todo并创建笔记
      if (!targetTodo.completed) {
        // 创建笔记内容，包含原todo的内容和标签
        const noteContent = targetTodo.content + (targetTodo.tags && targetTodo.tags.length > 0 ? ' ' + targetTodo.tags.map((tag: string) => `#${tag}`).join(' ') : '')
        
        // 调用addNote API创建新笔记
        const result = await addNote(noteContent, new Date().toISOString())
        if (result.success) {
          // 创建笔记成功后，删除后端的todo
          const deleteResult = await apiClient.deleteTodo(todoId)
          if (deleteResult.success) {
            // 重新加载todos数据以确保同步
            await loadTodosData()
            
            // 重新加载笔记列表
            if (searchTerm) {
              await handleSearch(searchTerm)
            } else {
              await loadNotes()
            }
            toast({
              title: "成功",
              description: "Todo已完成并转换为笔记",
            })
          } else {
            toast({
              title: "警告",
              description: "笔记已创建，但删除Todo失败",
              variant: "destructive",
            })
          }
        } else {
          toast({
            title: "错误",
            description: "创建笔记失败：" + (result.error || "未知错误"),
            variant: "destructive",
          })
        }
      } else {
        // 如果是从完成变为未完成，调用后端API切换状态
        const toggleResult = await apiClient.toggleTodo(todoId)
        if (toggleResult.success) {
          // 重新加载todos数据以确保同步
          await loadTodosData()
          toast({
            title: "成功",
            description: "Todo状态已更新",
          })
        } else {
          toast({
            title: "错误",
            description: "更新Todo状态失败",
            variant: "destructive",
          })
        }
      }
    } catch (error) {
      toast({
        title: "错误",
        description: "操作失败",
        variant: "destructive",
      })
    }
  }

  const handleUpdateTodo = async (todoId: string, updates: { content?: string; startDate?: string; dueDate?: string; priority?: 'low' | 'medium' | 'high' }) => {
    try {
      // 调用后端API更新todo
      const updateData: any = {}
      if (updates.content !== undefined) updateData.text = updates.content
      if (updates.startDate !== undefined) updateData.startDate = updates.startDate
      if (updates.dueDate !== undefined) updateData.dueDate = updates.dueDate
      if (updates.priority !== undefined) updateData.priority = updates.priority
      
      const result = await apiClient.updateTodo(todoId, updateData)
      if (result.success) {
        // 重新加载todos数据以确保同步
        await loadTodosData()
        toast({
          title: "成功",
          description: "Todo已更新",
        })
      } else {
        // 抛出错误以便上层捕获
        const errorMessage = result.error || "未知错误"
        toast({
          title: "更新失败",
          description: errorMessage,
          variant: "destructive",
        })
        throw new Error(errorMessage)
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "更新Todo失败"
      toast({
        title: "错误",
        description: errorMessage,
        variant: "destructive",
      })
      throw error // 重新抛出错误以便上层捕获
    }
  }

  const handleDeleteTodo = async (todoId: string) => {
    try {
      // 调用后端API删除todo
      const result = await apiClient.deleteTodo(todoId)
      if (result.success) {
        // 重新加载todos数据以确保同步
        await loadTodosData()
        toast({
          title: "成功",
          description: "Todo已删除",
        })
      } else {
        toast({
          title: "删除失败",
          description: result.error || "未知错误",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "错误",
        description: "删除Todo失败",
        variant: "destructive",
      })
    }
  }

  // 优化输入处理函数，使用useCallback避免重新创建
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value)
  }, [])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    // 禁用回车键添加功能，只允许多行输入
    // 只有当按下Ctrl+Enter或Command+Enter时才提交
    if (e.key === "Enter" && !(e.ctrlKey || e.metaKey)) {
      // 允许普通回车键进行换行，不做任何处理
      return
    }
    
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault()
      handleAddNote()
    }
  }, [handleAddNote])

  const handleNoteDelete = () => {
    // 如果有标签搜索，重新执行标签搜索
    if (currentTag) {
      handleTagClick(currentTag)
    } else if (searchTerm) {
      // 如果有文本搜索，重新执行文本搜索
      handleSearch(searchTerm)
    } else {
      // 否则重新加载全部笔记
      loadNotes()
    }
  }

  // 处理笔记更新
  const handleUpdateNote = async (noteId: string, content: string, tags: string[]) => {
    try {
      const result = await apiClient.updateNote(noteId, {
        content,
        tags
      })
      
      if (result.success) {
        // 刷新笔记列表
        if (currentTag) {
          handleTagClick(currentTag)
        } else if (searchTerm) {
          handleSearch(searchTerm)
        } else {
          loadNotes()
        }
        toast({
          title: "更新成功",
          description: "笔记已更新",
        })
      } else {
        toast({
          title: "更新失败",
          description: result.error || "未知错误",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "错误",
        description: "更新笔记失败",
        variant: "destructive",
      })
    }
  }

  // 处理笔记转换为Todo
  const handleConvertToTodo = async (note: Note) => {
    try {
      // 创建todo
      const todoResult = await apiClient.createTodo({
        text: note.content,
        tags: note.tags,
        priority: 'medium'
      })
      
      if (!todoResult.error) {
        // 删除笔记
        const deleteResult = await deleteNote(note.id)
        if (deleteResult.success) {
          // 刷新笔记列表
          if (currentTag) {
            handleTagClick(currentTag)
          } else if (searchTerm) {
            handleSearch(searchTerm)
          } else {
            loadNotes()
          }
          // 刷新todo列表
          loadTodosData()
          toast({
            title: "转换成功",
            description: "笔记已转换为Todo事项并删除原笔记",
          })
        } else {
          toast({
            title: "转换失败",
            description: "Todo创建成功但删除笔记失败",
            variant: "destructive",
          })
        }
      } else {
        toast({
          title: "转换失败",
          description: todoResult.error || "创建Todo失败",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('转换笔记为todo时发生错误:', error)
      toast({
        title: "转换失败",
        description: `网络错误: ${error instanceof Error ? error.message : '请重试'}`,
        variant: "destructive",
      })
    }
  }

  // 使用认证上下文
  const { user, loading: authLoading, isAuthenticated, logout } = useAuth()

  // 检查用户登录状态
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      // 用户未登录，重定向到登录页面
      router.push("/login")
    }
  }, [authLoading, isAuthenticated, router])

  // 处理用户登出
  const handleLogout = () => {
    logout()
    router.push("/login")
  }

  // 组件加载时获取笔记和todos（仅在已登录时）
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      // 加载搜索历史记录
      const savedSearchHistory = localStorage.getItem('searchHistory')
      if (savedSearchHistory) {
        setSearchHistory(JSON.parse(savedSearchHistory))
      }
      
      // 只有在没有搜索状态时才加载全部笔记
      if (!searchTerm && !currentTag) {
        loadNotes().then(() => {
        // 页面加载完成后自动滚动到最新笔记
        setTimeout(() => {
          if (notes.length > 0) {
            // 找到最新的笔记（按创建时间排序）
            const latestNote = notes.reduce((latest, current) => {
              return new Date(current.createdAt) > new Date(latest.createdAt) ? current : latest
            })
            
            // 滚动到最新笔记
            const noteElement = document.getElementById(`note-${latestNote.id}`)
            if (noteElement) {
              noteElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
            }
          } else {
            // 如果没有笔记，滚动到今天的日期
            const today = new Date().toDateString()
            const todayElement = document.getElementById(`date-${today}`) || 
                                document.getElementById(`date-group-${today}`)
            if (todayElement) {
              todayElement.scrollIntoView({ behavior: 'smooth', block: 'start' })
            }
          }
        }, 300)
        })
      }
      loadTodosData()
      loadAllSchedules() // 加载日程数据
    }
  }, [authLoading, isAuthenticated])

  // 加载todo数据
  const loadTodosData = useCallback(async () => {
    try {
      // 获取所有todos并按日期分组
      const response = await apiClient.getTodos({ limit: 100 })
      if (response.success && response.data) {
        const todosByDateMap: Record<string, Array<{
          id: string;
          content: string;
          completed: boolean;
          tags: string[];
          dueDate?: string;
          startDate?: string;
          priority: 'low' | 'medium' | 'high';
          order?: number;
        }>> = {}
        
        response.data.todos.forEach((todo: any) => {
          const dateKey = todo.dueDate ? getDateKey(todo.dueDate) : getDateKey(new Date().toISOString())
          if (!todosByDateMap[dateKey]) {
            todosByDateMap[dateKey] = []
          }
          todosByDateMap[dateKey].push({
            id: todo._id,
            content: todo.text,
            completed: todo.completed || false,
            tags: todo.tags || [],
            dueDate: todo.dueDate,
            startDate: todo.startDate,
            priority: todo.priority || 'medium',
            order: todo.order
          })
        })
        
        setTodosByDate(todosByDateMap)
      }
    } catch (error) {
      // 加载todos失败
    }
  }, [])


  const groupedNotes = useMemo(() => groupNotesByDate(notes), [notes])

  // 如果正在检查认证状态，显示加载界面
  if (authLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">正在验证登录状态...</p>
        </div>
      </div>
    )
  }

  // 如果未登录，不渲染主界面（因为会重定向到登录页面）
  if (!isAuthenticated) {
    return null
  }

  return (
    <div className="h-screen flex flex-col">
      <Toaster />
      
      {/* 导航栏 - 固定在顶部 */}
      <header className="flex-shrink-0 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto py-3 px-4 max-w-7xl">
          <div className="flex items-center justify-between gap-4">
             {/* 左侧：土豆笔记标题 */}
             <div className="flex items-center">
               <h1 className="text-xl font-bold whitespace-nowrap">土豆笔记</h1>
             </div>
             
             {/* 中间：搜索框 */}
             <div className="flex-1 max-w-md">
               <SearchBar 
                 onSearch={handleSearch} 
                 onClearSearch={handleClearSearch} 
                 searchTerm={searchTerm}
                 showClearButton={!!(searchTerm || currentTag)}
               />
             </div>
             
             {/* 右侧：用户名和用户图标 */}
             <div className="flex items-center gap-3">
               {user && (
                 <span className="text-sm font-medium text-muted-foreground">
                   {user.username}
                 </span>
               )}
               <UserNav 
                 onLogout={handleLogout}
                 onExport={handleExportAll}
                 onImport={handleImportNotes}
                 isExporting={isExporting}
                 isImporting={isImporting}
               />
             </div>
          </div>
          
          {/* 搜索状态提示 */}
          {(searchTerm || currentTag) && (
            <div className="mt-2">
              <div className="text-sm text-muted-foreground">
                {currentTag ? (
                  <>标签搜索: "#{currentTag}" ({notes.length} 条笔记)</>
                ) : (
                  <>搜索结果: "{searchTerm}" ({notes.length} 条笔记)</>
                )}
              </div>
            </div>
          )}
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden">
        <div className="container mx-auto max-w-7xl flex-1 flex flex-col">
          <div className="flex flex-1 overflow-hidden">
            {/* 日历和日程区域 (1/4宽度) - 最左边 - 标签搜索时隐藏 */}
            {!searchTerm.startsWith('#') && (
            <div className="hidden md:flex md:flex-col w-1/4 bg-background border-r">
              {/* 日历区域 - 固定不滚动 */}
              <div className="p-4 border-b">
                <div className="relative">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={handleDateSelect}
                    className="rounded-md border"
                    modifiers={{
                      hasSchedule: (date) => {
                        const dateKey = format(date, 'yyyy-MM-dd')
                        return schedulesByDate[dateKey] && schedulesByDate[dateKey].length > 0
                      }
                    }}
                    modifiersClassNames={{
                      hasSchedule: "relative after:absolute after:bottom-1 after:left-1/2 after:transform after:-translate-x-1/2 after:w-1 after:h-1 after:bg-blue-500 after:rounded-full after:content-['']"
                    }}
                  />
                  {/* 月份点击区域覆盖层 */}
                  <div 
                    className="absolute top-2 left-2 right-2 h-8 cursor-pointer z-10 hover:bg-muted/20 rounded transition-colors"
                    onClick={() => setIsLargeCalendarOpen(true)}
                    title="点击查看大日历"
                  />
                </div>
              </div>
              
              {/* 整合日程区域 - 固定不滚动 */}
              <div className="p-4 border-b">
                <IntegratedSchedule selectedDate={date} />
              </div>
              
              {/* 目标和打卡区域 */}
              <div className="p-4 border-b">
                <Tabs defaultValue="goals" className="w-full">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-medium text-sm">目标与打卡</h3>
                    <TabsList className="grid w-32 grid-cols-2">
                      <TabsTrigger value="goals" className="text-xs">目标</TabsTrigger>
                      <TabsTrigger value="checkin" className="text-xs">打卡</TabsTrigger>
                    </TabsList>
                  </div>
                  <TabsContent value="goals" className="mt-0">
                    <GoalsList onTagSelect={setSelectedTag} />
                  </TabsContent>
                  <TabsContent value="checkin" className="mt-0">
                    <CheckInList onTagSelect={setSelectedTag} />
                  </TabsContent>
                </Tabs>
              </div>
            </div>
            )}

            {/* 记事本区域 - 中间，标签搜索时扩展宽度 */}
            <div className={`w-full flex flex-col border-r bg-background ${
              searchTerm.startsWith('#') ? 'md:w-full' : 'md:w-2/4'
            }`}>
              {/* 输入区域 - 放在最上面 - 标签搜索时隐藏 */}
              {!searchTerm.startsWith('#') && (
              <div className="flex-shrink-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-b p-3 relative z-10">
                <div className="mb-2 flex items-center justify-between">
                  {/* 模式切换按钮 */}
                  <div className="flex items-center gap-1 bg-muted rounded-md p-1">
                    <Button
                      variant={inputMode === 'note' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setInputMode('note')}
                      className="h-6 px-2 text-xs"
                    >
                      笔记
                    </Button>
                    <Button
                      variant={inputMode === 'todo' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setInputMode('todo')}
                      className="h-6 px-2 text-xs"
                    >
                      Todo
                    </Button>
                  </div>
                  {/* 添加按钮移到这里 */}
                  <Button onClick={handleAddNote} disabled={isMainButtonDisabled} size="sm" className="h-7 px-3 text-xs">
                    {isAdding ? (
                      <>
                        <Loader2 className="h-3 w-3 animate-spin mr-1" />
                        <span className="text-xs">{inputMode === 'todo' ? 'Todo添加中' : '保存中'}</span>
                      </>
                    ) : (
                      <span className="text-xs">{inputMode === 'todo' ? '添加Todo' : '添加笔记'}</span>
                    )}
                  </Button>
                </div>
                <div className="flex flex-col space-y-2">
                  <div className="relative">
                    <Textarea
                      ref={textareaRef}
                      value={inputValue}
                      onChange={handleInputChange}
                      onKeyDown={handleKeyDown}
                      placeholder={inputMode === 'note' ? "输入新笔记... (支持Markdown格式，使用 #学习 #工作 等标签)" : "输入新Todo... (使用 #标签)"}
                      className="flex-1 min-h-[80px] resize-none font-mono text-sm"
                      disabled={isAdding}
                    />

                  </div>
                  
                  {/* Todo模式下显示起始日期和截止日期输入框 */}
                  {inputMode === 'todo' && (
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-2 flex-1">
                        <label className="text-sm text-gray-600 whitespace-nowrap">起始日期:</label>
                        <Input
                          type="date"
                          value={todoStartDate}
                          onChange={(e) => setTodoStartDate(e.target.value)}
                          placeholder="年/月/日"
                          className="text-sm flex-1"
                          disabled={isAdding}
                        />
                      </div>
                      <div className="flex items-center space-x-2 flex-1">
                        <label className="text-sm text-gray-600 whitespace-nowrap">截止日期:</label>
                        <Input
                          type="date"
                          value={todoDueDate}
                          onChange={(e) => setTodoDueDate(e.target.value)}
                          placeholder="年/月/日"
                          className="text-sm flex-1"
                          disabled={isAdding}
                        />
                      </div>
                    </div>
                  )}
            
                  {/* 图片上传和预览区域 - 仅在笔记模式下显示 */}
                  {inputMode === 'note' && (
                    <>
                      <div className="flex items-center space-x-2">
                        <label htmlFor="image-upload" className="cursor-pointer">
                          <div className="flex items-center space-x-1 text-sm text-muted-foreground hover:text-primary transition-colors">
                            <Image className="h-4 w-4" />
                            <span>添加图片</span>
                          </div>
                          <input
                            id="image-upload"
                            type="file"
                            accept="image/*"
                            onChange={handleImageUpload}
                            className="hidden"
                          />
                        </label>
                        
                        {selectedImage && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleRemoveImage}
                            className="h-6 px-2 text-xs text-destructive"
                          >
                            <X className="h-3 w-3 mr-1" />
                            移除图片
                          </Button>
                        )}
                      </div>
                      
                      {/* 图片预览 */}
                      {selectedImage && (
                        <div className="relative border rounded-md p-2 mt-2">
                          <img 
                            src={selectedImage} 
                            alt="预览图片" 
                            className="max-h-48 object-contain mx-auto" 
                          />
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
              )}
              

              
              {/* 当点击标签时，显示左右布局 */}
              {currentTag ? (
                <div className="flex-1 flex overflow-hidden">
                  {/* 左侧：固定的标签内容区域 */}
                  <div className="w-2/3 border-r bg-background flex-shrink-0 flex flex-col">
                    <div className="p-4 flex-1 flex flex-col">
                      <TagContent tag={currentTag} />
                    </div>
                  </div>
                  
                  {/* 右侧：可滚动的有日期笔记区域 */}
                  <div className="flex-1 flex flex-col">
                    {/* 标签页面的笔记输入区域 - 在右侧笔记列表顶部 */}
                    <div className="flex-shrink-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-b p-3">
                      <div className="flex items-center space-x-2">
                        <Textarea
                          value={tagNoteInput}
                          onChange={(e) => setTagNoteInput(e.target.value)}
                          placeholder={`输入新笔记... (#${currentTag})`}
                          className="flex-1 min-h-[60px] resize-none font-mono text-sm"
                          disabled={isTagNoteAdding}
                        />
                        {/* 进度输入框 - 需要动态检查当前标签是否启用目标功能 */}
                         <TagProgressInputField 
                           currentTag={currentTag}
                           progressInput={tagProgressInput}
                           setProgressInput={setTagProgressInput}
                           isAdding={isTagNoteAdding}
                         />
                        <Button 
                          onClick={handleTagAddNote} 
                          disabled={isTagNoteAdding || (!tagNoteInput.trim() && tagProgressInput === 0)} 
                          size="sm" 
                          className="h-[60px] px-4"
                        >
                          {isTagNoteAdding ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin mr-1" />
                              <span>保存中</span>
                            </>
                          ) : (
                            <span>添加笔记</span>
                          )}
                        </Button>
                      </div>
                    </div>
                    <div className="flex-1 overflow-y-auto">
                      <div className="p-4">
                        {isLoading || isSearching ? (
                          <div className="h-full flex items-center justify-center">
                            <Loader2 className="h-6 w-6 animate-spin mr-2" />
                            <span>{isSearching ? "搜索中..." : "加载笔记中..."}</span>
                          </div>
                        ) : groupedNotes.length > 0 ? (
                          <div className="space-y-6">
                            {groupedNotes.map(([dateKey, groupNotes]) => (
                              <NoteGroup
                                key={dateKey}
                                date={dateKey}
                                notes={groupNotes}
                                onDelete={handleNoteDelete}
                                searchTerm={searchTerm}
                                onTagClick={handleTagClick}
                                onConvertToTodo={handleConvertToTodo}
                                onUpdate={handleUpdateNote}
                              />
                            ))}
                            {hasMoreNotes && (
                              <div className="flex justify-center py-4">
                                {isLoadingMore ? (
                                  <div className="flex items-center gap-2 text-muted-foreground">
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    <span>正在加载更多...</span>
                                  </div>
                                ) : (
                                  <Button
                                    variant="outline"
                                    onClick={loadMoreNotes}
                                    className="flex items-center gap-2 text-sm"
                                  >
                                    <Plus className="h-4 w-4" />
                                    点击加载更多
                                  </Button>
                                )}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="h-full flex items-center justify-center text-muted-foreground">
                            {searchTerm ? "没有找到匹配的笔记" : "暂无笔记，开始添加吧"}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* 正常布局：没有选择标签时的垂直布局 */
                <div className="flex-1 overflow-y-auto">
                  <div className="p-4">
                    {isLoading || isSearching ? (
                      <div className="h-full flex items-center justify-center">
                        <Loader2 className="h-6 w-6 animate-spin mr-2" />
                        <span>{isSearching ? "搜索中..." : "加载笔记中..."}</span>
                      </div>
                    ) : groupedNotes.length > 0 ? (
                      <div className="space-y-6">
                        {groupedNotes.map(([dateKey, groupNotes]) => (
                          <NoteGroup
                            key={dateKey}
                            date={dateKey}
                            notes={groupNotes}
                            onDelete={handleNoteDelete}
                            searchTerm={searchTerm}
                            onTagClick={handleTagClick}
                            onConvertToTodo={handleConvertToTodo}
                            onUpdate={handleUpdateNote}
                          />
                        ))}
                        {hasMoreNotes && (
                          <div className="flex justify-center py-4">
                            {isLoadingMore ? (
                              <div className="flex items-center gap-2 text-muted-foreground">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                <span>正在加载更多...</span>
                              </div>
                            ) : (
                              <Button
                                variant="outline"
                                onClick={loadMoreNotes}
                                className="flex items-center gap-2 text-sm"
                              >
                                <Plus className="h-4 w-4" />
                                点击加载更多
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="h-full flex items-center justify-center text-muted-foreground">
                        {searchTerm ? "没有找到匹配的笔记" : "暂无笔记，开始添加吧"}
                      </div>
                    )}
                  </div>
                </div>
              )}

                </div>

            {/* Todo区域 (1/4宽度) - 最右边，标签搜索时隐藏 */}
            {!searchTerm.startsWith('#') && (
              <div className="hidden md:flex md:flex-col w-1/4 bg-background">
                {/* Todo列表区域 - 独立滚动 */}
                <div className="flex-1 overflow-hidden">
                  <TodoList 
                    selectedDate={date} 
                    todosByDate={todosByDate}
                    onToggleTodo={handleToggleTodo}
                    onUpdateTodo={handleUpdateTodo}
                    onDeleteTodo={handleDeleteTodo}
                    onLoadTodos={loadTodosData}
                    onShowTodoDetail={setSelectedTodoDetail}
                  />
                </div>
              </div>
            )}
              </div>
        </div>
      </main>
      
      {/* 大日历弹窗 */}
         <LargeCalendar
           isOpen={isLargeCalendarOpen}
           onClose={() => setIsLargeCalendarOpen(false)}
           selectedDate={date}
           onDateSelect={setDate}
           schedulesByDate={schedulesByDate}
         />

      {/* Todo详情弹框 */}
      {selectedTodoDetail && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-background rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
            {/* 弹窗标题栏 */}
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">Todo 详情</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedTodoDetail(null)}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            {/* 弹窗内容 */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-4">
                {/* 标签 */}
                {selectedTodoDetail.tags.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-2">标签</h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedTodoDetail.tags.map((tag, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center px-2 py-1 rounded text-sm bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                        >
                          #{tag}
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
                    selectedTodoDetail.completed ? "line-through text-muted-foreground" : "text-foreground"
                  )}>
                    {selectedTodoDetail.content}
                  </div>
                </div>

                {/* 正计时按钮 */}
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">计时</h3>
                  <div className="flex items-center gap-3">
                    <Button
                      variant="outline"
                      className="flex items-center gap-2"
                      onClick={() => {
                        if (isTimerRunning) {
                          pauseTimer()
                        } else {
                          startTimer()
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

                {/* 日期信息 */}
                {(selectedTodoDetail.startDate || selectedTodoDetail.dueDate) && (
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-2">日期</h3>
                    <div className="space-y-2">
                      {selectedTodoDetail.startDate && (
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-muted-foreground">开始日期:</span>
                          <span className="font-medium">
                            {new Date(selectedTodoDetail.startDate).toLocaleDateString('zh-CN', { 
                              year: 'numeric', 
                              month: '2-digit', 
                              day: '2-digit' 
                            })}
                          </span>
                        </div>
                      )}
                      {selectedTodoDetail.dueDate && (
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-muted-foreground">截止日期:</span>
                          <span className="font-medium">
                            {new Date(selectedTodoDetail.dueDate).toLocaleDateString('zh-CN', { 
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
                onClick={() => setSelectedTodoDetail(null)}
              >
                关闭
              </Button>
              <Button
                onClick={() => {
                  handleToggleTodo(selectedTodoDetail.id)
                  setSelectedTodoDetail(null)
                }}
                className={cn(
                  selectedTodoDetail.completed 
                    ? "bg-orange-500 hover:bg-orange-600" 
                    : "bg-green-500 hover:bg-green-600"
                )}
              >
                {selectedTodoDetail.completed ? "标记为未完成" : "标记为已完成"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
