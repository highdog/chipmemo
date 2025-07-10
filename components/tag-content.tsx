"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Pencil, Save, X, Target, Loader2, Zap, Bold, Italic, Link, Code, Heading1, Heading2, Heading3, List } from "lucide-react"
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkBreaks from 'remark-breaks'

import { toast } from "sonner"
import { tagContentsApi, apiClient } from "@/lib/api"
import NoteHeatmap from "@/components/note-heatmap"


interface TagContentProps {
  tag: string
  onSave?: (tag: string, content: string) => void
}



export function TagContent({ tag, onSave }: TagContentProps) {
  const router = useRouter()
  const [isEditing, setIsEditing] = useState(false)
  const [content, setContent] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  
  // 标签编辑相关状态
  const [isEditingTag, setIsEditingTag] = useState(false)
  const [editingTagName, setEditingTagName] = useState(tag)
  const [isRenamingTag, setIsRenamingTag] = useState(false)
  
  // 目标相关状态
  const [isGoalEnabled, setIsGoalEnabled] = useState(false)
  const [targetCount, setTargetCount] = useState(10)
  const [currentCount, setCurrentCount] = useState(0)
  const [checkedBoxes, setCheckedBoxes] = useState<boolean[]>([])
  
  // 打卡相关状态
  const [isCheckInEnabled, setIsCheckInEnabled] = useState(false)
  const [checkInCount, setCheckInCount] = useState(0)
  const [isCheckingIn, setIsCheckingIn] = useState(false)
  const [showCheckInPreview, setShowCheckInPreview] = useState(false)
  const [previewNoteContent, setPreviewNoteContent] = useState('')
  const [editableNoteContent, setEditableNoteContent] = useState('')
  


  // 加载标签内容
  const loadTagContent = async () => {
    setIsLoading(true)
    try {
      const response = await tagContentsApi.get(tag)
      if (response.success && response.data) {
        setContent(response.data.content)
        // 加载目标设置数据
        setIsGoalEnabled(response.data.isGoalEnabled || false)
        setTargetCount(response.data.targetCount || 0)
        setCurrentCount(response.data.currentCount || 0)
        // 加载打卡设置数据
        setIsCheckInEnabled(response.data.isCheckInEnabled || false)
        setCheckInCount(response.data.checkInCount || 0)
        // 初始化勾选框状态
        const boxes = new Array(response.data.targetCount || 0).fill(false)
        for (let i = 0; i < (response.data.currentCount || 0); i++) {
          boxes[i] = true
        }
        setCheckedBoxes(boxes)
      } else {
        // 如果没有找到内容，设置默认内容
        setContent(`这是关于 #${tag} 标签的基本内容。点击编辑按钮来自定义这个内容。`)
        setIsGoalEnabled(false)
        setTargetCount(0)
        setCurrentCount(0)
        setIsCheckInEnabled(false)
        setCheckInCount(0)
        setCheckedBoxes([])
      }
    } catch (error) {
      console.error('Error loading tag content:', error)
      setContent(`这是关于 #${tag} 标签的基本内容。点击编辑按钮来自定义这个内容。`)
      setIsGoalEnabled(false)
      setTargetCount(0)
      setCurrentCount(0)
      setIsCheckInEnabled(false)
      setCheckInCount(0)
      setCheckedBoxes([])
      toast.error('加载标签内容失败')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadTagContent()
    setEditingTagName(tag)
  }, [tag])

  // 添加一个用于外部刷新的方法
  
  // 键盘快捷键处理函数
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const textarea = e.currentTarget
    const { selectionStart, selectionEnd, value } = textarea
    const selectedText = value.substring(selectionStart, selectionEnd)
    
    // Ctrl/Cmd + B: 加粗
    if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
      e.preventDefault()
      const newText = selectedText ? `**${selectedText}**` : '**粗体文本**'
      const beforeText = value.substring(0, selectionStart)
      const afterText = value.substring(selectionEnd)
      const newContent = beforeText + newText + afterText
      setContent(newContent)
      
      // 设置光标位置
      setTimeout(() => {
        if (selectedText) {
          textarea.setSelectionRange(selectionStart + 2, selectionStart + 2 + selectedText.length)
        } else {
          textarea.setSelectionRange(selectionStart + 2, selectionStart + 8)
        }
      }, 0)
      return
    }
    
    // Ctrl/Cmd + I: 斜体
    if ((e.ctrlKey || e.metaKey) && e.key === 'i') {
      e.preventDefault()
      const newText = selectedText ? `*${selectedText}*` : '*斜体文本*'
      const beforeText = value.substring(0, selectionStart)
      const afterText = value.substring(selectionEnd)
      const newContent = beforeText + newText + afterText
      setContent(newContent)
      
      setTimeout(() => {
        if (selectedText) {
          textarea.setSelectionRange(selectionStart + 1, selectionStart + 1 + selectedText.length)
        } else {
          textarea.setSelectionRange(selectionStart + 1, selectionStart + 5)
        }
      }, 0)
      return
    }
    
    // Ctrl/Cmd + K: 链接
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault()
      const linkText = selectedText || '链接文本'
      const newText = `[${linkText}](url)`
      const beforeText = value.substring(0, selectionStart)
      const afterText = value.substring(selectionEnd)
      const newContent = beforeText + newText + afterText
      setContent(newContent)
      
      setTimeout(() => {
        const urlStart = selectionStart + linkText.length + 3
        textarea.setSelectionRange(urlStart, urlStart + 3)
      }, 0)
      return
    }
    
    // Ctrl/Cmd + 1-6: 标题级别
    if ((e.ctrlKey || e.metaKey) && /^[1-6]$/.test(e.key)) {
      e.preventDefault()
      const level = parseInt(e.key)
      const hashes = '#'.repeat(level)
      
      // 找到当前行的开始位置
      const lines = value.split('\n')
      let currentLineStart = 0
      let currentLineIndex = 0
      
      for (let i = 0; i < lines.length; i++) {
        if (currentLineStart + lines[i].length >= selectionStart) {
          currentLineIndex = i
          break
        }
        currentLineStart += lines[i].length + 1
      }
      
      const currentLine = lines[currentLineIndex]
      // 移除现有的标题标记
      const cleanLine = currentLine.replace(/^#+\s*/, '')
      const newLine = `${hashes} ${cleanLine}`
      
      lines[currentLineIndex] = newLine
      const newContent = lines.join('\n')
      setContent(newContent)
      
      setTimeout(() => {
        const newPosition = currentLineStart + newLine.length
        textarea.setSelectionRange(newPosition, newPosition)
      }, 0)
      return
    }
    
    // Ctrl/Cmd + L: 无序列表
    if ((e.ctrlKey || e.metaKey) && e.key === 'l') {
      e.preventDefault()
      const lines = value.split('\n')
      let currentLineStart = 0
      let currentLineIndex = 0
      
      for (let i = 0; i < lines.length; i++) {
        if (currentLineStart + lines[i].length >= selectionStart) {
          currentLineIndex = i
          break
        }
        currentLineStart += lines[i].length + 1
      }
      
      const currentLine = lines[currentLineIndex]
      const newLine = currentLine.startsWith('- ') ? currentLine.substring(2) : `- ${currentLine}`
      
      lines[currentLineIndex] = newLine
      const newContent = lines.join('\n')
      setContent(newContent)
      
      setTimeout(() => {
        const newPosition = currentLineStart + newLine.length
        textarea.setSelectionRange(newPosition, newPosition)
      }, 0)
      return
    }
    
    // Ctrl/Cmd + Shift + L: 有序列表
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'L') {
      e.preventDefault()
      const lines = value.split('\n')
      let currentLineStart = 0
      let currentLineIndex = 0
      
      for (let i = 0; i < lines.length; i++) {
        if (currentLineStart + lines[i].length >= selectionStart) {
          currentLineIndex = i
          break
        }
        currentLineStart += lines[i].length + 1
      }
      
      const currentLine = lines[currentLineIndex]
      const orderMatch = currentLine.match(/^(\d+)\. /)
      const newLine = orderMatch ? currentLine.replace(/^\d+\. /, '') : `1. ${currentLine}`
      
      lines[currentLineIndex] = newLine
      const newContent = lines.join('\n')
      setContent(newContent)
      
      setTimeout(() => {
        const newPosition = currentLineStart + newLine.length
        textarea.setSelectionRange(newPosition, newPosition)
      }, 0)
      return
    }
    
    // Ctrl/Cmd + E: 代码块
    if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
      e.preventDefault()
      const newText = selectedText ? `\`${selectedText}\`` : '`代码`'
      const beforeText = value.substring(0, selectionStart)
      const afterText = value.substring(selectionEnd)
      const newContent = beforeText + newText + afterText
      setContent(newContent)
      
      setTimeout(() => {
        if (selectedText) {
          textarea.setSelectionRange(selectionStart + 1, selectionStart + 1 + selectedText.length)
        } else {
          textarea.setSelectionRange(selectionStart + 1, selectionStart + 3)
        }
      }, 0)
      return
    }
    
    // Ctrl/Cmd + Shift + E: 代码块（多行）
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'E') {
      e.preventDefault()
      const newText = selectedText ? `\`\`\`\n${selectedText}\n\`\`\`` : '```\n代码块\n```'
      const beforeText = value.substring(0, selectionStart)
      const afterText = value.substring(selectionEnd)
      const newContent = beforeText + newText + afterText
      setContent(newContent)
      
      setTimeout(() => {
        if (selectedText) {
          textarea.setSelectionRange(selectionStart + 4, selectionStart + 4 + selectedText.length)
        } else {
          textarea.setSelectionRange(selectionStart + 4, selectionStart + 7)
        }
      }, 0)
      return
    }
  }

  // 工具栏按钮处理函数
  const handleToolbarAction = (action: string) => {
    const textarea = document.querySelector('textarea') as HTMLTextAreaElement
    if (!textarea) return

    const selectionStart = textarea.selectionStart
    const selectionEnd = textarea.selectionEnd
    const selectedText = content.substring(selectionStart, selectionEnd)
    const value = content

    let newText = ''
    let newContent = ''
    let newSelectionStart = selectionStart
    let newSelectionEnd = selectionEnd

    switch (action) {
      case 'bold':
        newText = selectedText ? `**${selectedText}**` : '**粗体文本**'
        newContent = value.substring(0, selectionStart) + newText + value.substring(selectionEnd)
        newSelectionStart = selectionStart + 2
        newSelectionEnd = selectedText ? selectionStart + 2 + selectedText.length : selectionStart + 6
        break
      case 'italic':
        newText = selectedText ? `*${selectedText}*` : '*斜体文本*'
        newContent = value.substring(0, selectionStart) + newText + value.substring(selectionEnd)
        newSelectionStart = selectionStart + 1
        newSelectionEnd = selectedText ? selectionStart + 1 + selectedText.length : selectionStart + 5
        break
      case 'link':
        newText = selectedText ? `[${selectedText}](url)` : '[链接文本](url)'
        newContent = value.substring(0, selectionStart) + newText + value.substring(selectionEnd)
        newSelectionStart = selectedText ? selectionStart + selectedText.length + 3 : selectionStart + 7
        newSelectionEnd = selectedText ? selectionStart + selectedText.length + 6 : selectionStart + 10
        break
      case 'code':
        newText = selectedText ? `\`${selectedText}\`` : '`代码`'
        newContent = value.substring(0, selectionStart) + newText + value.substring(selectionEnd)
        newSelectionStart = selectionStart + 1
        newSelectionEnd = selectedText ? selectionStart + 1 + selectedText.length : selectionStart + 3
        break
      case 'h1':
      case 'h2':
      case 'h3':
        const level = action.charAt(1)
        const hashes = '#'.repeat(parseInt(level))
        const lines = value.split('\n')
        let currentLineStart = 0
        let currentLineIndex = 0
        
        for (let i = 0; i < lines.length; i++) {
          if (currentLineStart + lines[i].length >= selectionStart) {
            currentLineIndex = i
            break
          }
          currentLineStart += lines[i].length + 1
        }
        
        const currentLine = lines[currentLineIndex]
        const headerMatch = currentLine.match(/^#+\s*/)
        const newLine = headerMatch ? currentLine.replace(/^#+\s*/, `${hashes} `) : `${hashes} ${currentLine}`
        
        lines[currentLineIndex] = newLine
        newContent = lines.join('\n')
        newSelectionStart = currentLineStart + hashes.length + 1
        newSelectionEnd = newSelectionStart
        break
      case 'list':
        const listLines = value.split('\n')
        let listLineStart = 0
        let listLineIndex = 0
        
        for (let i = 0; i < listLines.length; i++) {
          if (listLineStart + listLines[i].length >= selectionStart) {
            listLineIndex = i
            break
          }
          listLineStart += listLines[i].length + 1
        }
        
        const listLine = listLines[listLineIndex]
        const newListLine = listLine.startsWith('- ') ? listLine.substring(2) : `- ${listLine}`
        
        listLines[listLineIndex] = newListLine
        newContent = listLines.join('\n')
        newSelectionStart = listLineStart + newListLine.length
        newSelectionEnd = newSelectionStart
        break
      default:
        return
    }

    setContent(newContent)
    
    setTimeout(() => {
      textarea.focus()
      textarea.setSelectionRange(newSelectionStart, newSelectionEnd)
    }, 0)
  }

  useEffect(() => {
    const handleTagUpdate = () => {
      loadTagContent()
    }

    // 监听自定义事件来刷新标签内容
    window.addEventListener(`tag-updated-${tag}`, handleTagUpdate)
    
    return () => {
      window.removeEventListener(`tag-updated-${tag}`, handleTagUpdate)
    }
  }, [tag])
  
  const handleSave = async () => {
    if (!tag) return
    

    
    try {
      setIsSaving(true)
      
      const goalSettings = {
        isGoalEnabled,
        targetCount: isGoalEnabled ? targetCount : 0,
        currentCount: isGoalEnabled ? currentCount : 0,
        isCheckInEnabled,
        checkInCount: isCheckInEnabled ? checkInCount : 0
      }
      
      const result = await tagContentsApi.save(tag, content, goalSettings)
      
      if (result.success) {
        setIsEditing(false)
        
        // 触发目标列表刷新
        window.dispatchEvent(new CustomEvent('goals-list-refresh'))
        
        // 显示成功提示
        toast.success('内容和目标设置已保存')
        
        if (onSave) {
          onSave(tag, content)
        }
      } else {
        console.error('❌ [TagContent] 保存失败:', result.error)
        toast.error(result.error || '保存失败')
      }
    } catch (error) {
      console.error('💥 [TagContent] 保存异常:', error)
      toast.error('网络错误或服务器异常')
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    // 重新加载原始内容
    const loadOriginalContent = async () => {
      try {
        const response = await tagContentsApi.get(tag)
        if (response.success && response.data) {
          setContent(response.data.content)
        } else {
          setContent(`这是关于 #${tag} 标签的基本内容。点击编辑按钮来自定义这个内容。`)
        }
      } catch (error) {
        setContent(`这是关于 #${tag} 标签的基本内容。点击编辑按钮来自定义这个内容。`)
      }
    }
    loadOriginalContent()
    setIsEditing(false)
  }

  // 处理勾选框点击
  const handleCheckboxClick = async (index: number) => {
    if (!isGoalEnabled) {
      return
    }
    
    const newCheckedBoxes = [...checkedBoxes]
    const wasChecked = newCheckedBoxes[index]
    
    // 切换勾选状态
    newCheckedBoxes[index] = !wasChecked
    setCheckedBoxes(newCheckedBoxes)
    
    // 计算新的进度
    const newCurrentCount = newCheckedBoxes.filter(Boolean).length
    setCurrentCount(newCurrentCount)
    
    try {
      // 保存进度到后端
      const goalSettings = {
        isGoalEnabled,
        targetCount,
        currentCount: newCurrentCount
      }
      
      const saveResult = await tagContentsApi.save(tag, content, goalSettings)
      
      // 如果是勾选（进度+1），自动创建笔记
      if (!wasChecked) {
        const noteTitle = `${tag} 目标进度 +1`
        const noteContent = `完成了 ${tag.replace('#', '')} 的一个目标进度，当前进度：${newCurrentCount}/${targetCount}`
        
        // 为完成的目标事项自动添加'目标'标签
        const noteTags = [tag]
        if (!noteTags.includes('目标')) {
          noteTags.push('目标')
        }
        
        const noteData = {
          title: noteTitle,
          content: noteContent,
          tags: noteTags,
          color: 'blue'
        }
        
        const createResult = await apiClient.createNote(noteData)
        
        toast.success(`进度 +1，已自动创建笔记`)
        
        // 触发笔记列表刷新，传递当前标签信息
        window.dispatchEvent(new CustomEvent('notes-refresh', {
          detail: { currentTag: tag }
        }))
      } else {
        toast.success(`进度已更新：${newCurrentCount}/${targetCount}`)
      }
      
      // 触发目标列表刷新
      window.dispatchEvent(new CustomEvent('goals-list-refresh'))
      
    } catch (error: any) {
      console.error('勾选框操作失败:', error)
      
      // 回滚状态
      newCheckedBoxes[index] = wasChecked
      setCheckedBoxes(newCheckedBoxes)
      setCurrentCount(checkedBoxes.filter(Boolean).length)
      toast.error('更新进度失败: ' + (error?.message || '未知错误'))
    }
  }

  // 当目标数量或当前进度改变时，更新勾选框数组
  useEffect(() => {
    if (isGoalEnabled) {
      const newBoxes = new Array(targetCount).fill(false)
      for (let i = 0; i < Math.min(currentCount, targetCount); i++) {
        newBoxes[i] = true
      }
      setCheckedBoxes(newBoxes)
    } else {
      setCheckedBoxes([])
    }
  }, [targetCount, currentCount, isGoalEnabled])

  // 处理打卡功能
  const handleCheckIn = async () => {
    if (!isCheckInEnabled) {
      toast.error('打卡功能未启用')
      return
    }

    // 设置默认打卡内容
    const defaultContent = `${tag}打卡，已打卡${checkInCount + 1}次`
    setEditableNoteContent(defaultContent)
    setShowCheckInPreview(true)
  }

  // 确认打卡
  const handleConfirmCheckIn = async () => {
    setIsCheckingIn(true)
    try {
      const result = await tagContentsApi.checkInWithContent(tag, editableNoteContent)
      if (result.success && result.data) {
        setCheckInCount(result.data.checkInCount)
        toast.success(`打卡成功！已打卡${result.data.checkInCount}次`)
        
        // 触发笔记列表刷新
        window.dispatchEvent(new CustomEvent('notes-refresh', {
          detail: { currentTag: tag }
        }))
        
        setShowCheckInPreview(false)
      } else {
        toast.error(result.error || '打卡失败')
      }
    } catch (error: any) {
      console.error('打卡失败:', error)
      toast.error('打卡失败: ' + (error?.message || '未知错误'))
    } finally {
      setIsCheckingIn(false)
    }
  }

  // 处理标签重命名
  const handleRenameTag = async () => {
    if (!editingTagName.trim() || editingTagName === tag) {
      setIsEditingTag(false)
      setEditingTagName(tag)
      return
    }

    setIsRenamingTag(true)
    try {
      const result = await tagContentsApi.rename(tag, editingTagName.trim())
      if (result.success) {
        toast.success(`标签已重命名为 "${editingTagName.trim()}"`)
        setIsEditingTag(false)
        
        // 导航到新标签页面
        router.push(`/tag/${encodeURIComponent(editingTagName.trim())}`)
      } else {
        toast.error(result.error || '重命名失败')
        setEditingTagName(tag)
      }
    } catch (error: any) {
      console.error('重命名失败:', error)
      toast.error('重命名失败: ' + (error?.message || '未知错误'))
      setEditingTagName(tag)
    } finally {
      setIsRenamingTag(false)
    }
  }

  // 取消标签编辑
  const handleCancelTagEdit = () => {
    setIsEditingTag(false)
    setEditingTagName(tag)
  }





  return (
    <>
      <Card className="h-full flex flex-col">
      <CardHeader className="pb-2 flex-shrink-0">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            {isEditingTag ? (
              <div className="flex items-center gap-2">
                <Input
                  value={editingTagName}
                  onChange={(e) => setEditingTagName(e.target.value)}
                  className="text-lg font-semibold h-8 w-40"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleRenameTag()
                    } else if (e.key === 'Escape') {
                      handleCancelTagEdit()
                    }
                  }}
                  disabled={isRenamingTag}
                  autoFocus
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleRenameTag}
                  disabled={isRenamingTag || !editingTagName.trim()}
                >
                  {isRenamingTag ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCancelTagEdit}
                  disabled={isRenamingTag}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <CardTitle className="text-lg">{tag}</CardTitle>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setIsEditingTag(true)}
                  className="h-6 w-6 p-0"
                >
                  <Pencil className="h-3 w-3" />
                </Button>
              </div>
            )}
            {/* 目标设置区域 - 移到标题右边 */}
            {isEditing && (
              <div className="flex items-center gap-3">
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id={`goal-${tag}`}
                      checked={isGoalEnabled}
                      onCheckedChange={(checked) => {
                        const isChecked = checked as boolean
                        setIsGoalEnabled(isChecked)
                        if (isChecked) {
                          setIsCheckInEnabled(false)
                        }
                      }}
                    />
                    <Label htmlFor={`goal-${tag}`} className="text-sm">
                      设置为目标标签
                    </Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id={`checkin-${tag}`}
                      checked={isCheckInEnabled}
                      onCheckedChange={(checked) => {
                        const isChecked = checked as boolean
                        setIsCheckInEnabled(isChecked)
                        if (isChecked) {
                          setIsGoalEnabled(false)
                        }
                      }}
                    />
                    <Label htmlFor={`checkin-${tag}`} className="text-sm">
                      设置为打卡标签
                    </Label>
                  </div>
                </div>
                
                {isGoalEnabled && (
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      <Label className="text-xs text-muted-foreground whitespace-nowrap">
                        目标
                      </Label>
                      <Input
                        type="number"
                        min="1"
                        value={targetCount}
                        onChange={(e) => setTargetCount(parseInt(e.target.value) || 1)}
                        className="h-7 w-16 text-xs"
                      />
                    </div>
                    <div className="flex items-center gap-1">
                      <Label className="text-xs text-muted-foreground whitespace-nowrap">
                        进度
                      </Label>
                      <Input
                        type="number"
                        min="0"
                        value={currentCount}
                        onChange={(e) => setCurrentCount(parseInt(e.target.value) || 0)}
                        className="h-7 w-16 text-xs"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
            {/* 非编辑模式下的目标进度显示 */}
            {!isEditing && isGoalEnabled && (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">
                    {currentCount}/{targetCount}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-40 bg-gray-200 rounded-full h-2 dark:bg-gray-700">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                      style={{ width: `${Math.min((currentCount / targetCount) * 100, 100)}%` }}
                    ></div>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {Math.min((currentCount / targetCount) * 100, 100).toFixed(0)}%
                  </span>
                </div>
              </div>
            )}
            
            {/* 非编辑模式下的打卡功能显示 */}
            {!isEditing && isCheckInEnabled && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">
                  已打卡{checkInCount}次
                </span>
                <Button
                  onClick={handleCheckIn}
                  disabled={isCheckingIn}
                  size="sm"
                  className="flex items-center gap-1"
                >
                  {isCheckingIn ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Zap className="h-4 w-4" />
                  )}
                  打卡
                </Button>
              </div>
            )}

          </div>
          {isEditing ? (
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={handleCancel}>
                <X className="h-4 w-4 mr-1" />
                取消
              </Button>
              <Button size="sm" onClick={handleSave} disabled={isSaving || isLoading}>
                <Save className="h-4 w-4 mr-1" />
                {isSaving ? '保存中...' : '保存'}
              </Button>
            </div>
          ) : (
            <Button size="sm" variant="outline" onClick={() => setIsEditing(true)}>
              <Pencil className="h-4 w-4 mr-1" />
              编辑
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col">
        {isEditing ? (
          <div className="flex-1 flex flex-col gap-4">
            {/* Markdown工具栏 */}
            <div className="flex items-center gap-1 p-2 bg-muted/30 rounded border">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleToolbarAction('bold')}
                className="h-8 w-8 p-0"
                title="加粗 (Ctrl/Cmd + B)"
              >
                <Bold className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleToolbarAction('italic')}
                className="h-8 w-8 p-0"
                title="斜体 (Ctrl/Cmd + I)"
              >
                <Italic className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleToolbarAction('link')}
                className="h-8 w-8 p-0"
                title="链接 (Ctrl/Cmd + K)"
              >
                <Link className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleToolbarAction('code')}
                className="h-8 w-8 p-0"
                title="代码 (Ctrl/Cmd + E)"
              >
                <Code className="h-4 w-4" />
              </Button>
              <Separator orientation="vertical" className="h-6 mx-1" />
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleToolbarAction('h1')}
                className="h-8 w-8 p-0"
                title="一级标题 (Ctrl/Cmd + 1)"
              >
                <Heading1 className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleToolbarAction('h2')}
                className="h-8 w-8 p-0"
                title="二级标题 (Ctrl/Cmd + 2)"
              >
                <Heading2 className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleToolbarAction('h3')}
                className="h-8 w-8 p-0"
                title="三级标题 (Ctrl/Cmd + 3)"
              >
                <Heading3 className="h-4 w-4" />
              </Button>
              <Separator orientation="vertical" className="h-6 mx-1" />
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleToolbarAction('list')}
                className="h-8 w-8 p-0"
                title="列表 (Ctrl/Cmd + L)"
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1 font-mono text-sm resize-none"
              placeholder={`输入关于 #${tag} 标签的描述内容...`}
              disabled={isLoading}
            />
          </div>
        ) : (
          <div className="flex-1 flex flex-col gap-4">
            <div className="prose prose-sm max-w-none flex-1 overflow-y-auto text-sm">
              <ReactMarkdown
                remarkPlugins={[remarkGfm, remarkBreaks]}
              >
                {content}
              </ReactMarkdown>
            </div>
            
            {/* 目标进度勾选框区域 */}
            {isGoalEnabled && targetCount > 0 && (
              <div className="border-t pt-4">
                <div className="flex items-center gap-2 mb-3">
                  <Target className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium text-gray-700">目标进度</span>
                  <span className="text-xs text-gray-500">({currentCount}/{targetCount})</span>
                </div>
                <div className="grid grid-cols-12 gap-1">
                  {Array.from({ length: targetCount }, (_, index) => (
                    <div key={index} className="flex flex-col items-center">
                      <Checkbox
                        id={`goal-checkbox-${tag}-${index}`}
                        checked={checkedBoxes[index] || false}
                        onCheckedChange={() => handleCheckboxClick(index)}
                        className="h-4 w-4"
                      />
                      <span className="text-xs text-gray-400 mt-0.5">{index + 1}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-3 text-xs text-gray-500">
                  点击勾选框来更新进度，每次勾选会自动创建一条进度笔记
                </div>
              </div>
            )}
            
            {/* 笔记统计热力图 */}
            <div className="border-t pt-4">
              <NoteHeatmap tag={tag} />
            </div>
          </div>
        )}
      </CardContent>
      </Card>

      {/* 打卡预览对话框 */}
    <Dialog open={showCheckInPreview} onOpenChange={setShowCheckInPreview}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{tag}-打卡</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="note-content" className="text-sm font-medium">
              笔记内容
            </Label>
            <Textarea
              id="note-content"
              value={editableNoteContent}
              onChange={(e) => setEditableNoteContent(e.target.value)}
              className="mt-2 min-h-[300px]"
              placeholder="请输入打卡笔记内容..."
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setShowCheckInPreview(false)}
            disabled={isCheckingIn}
          >
            取消
          </Button>
          <Button
            onClick={handleConfirmCheckIn}
            disabled={isCheckingIn || !editableNoteContent.trim()}
          >
            {isCheckingIn ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                打卡中...
              </>
            ) : (
              '确认打卡'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  )
}