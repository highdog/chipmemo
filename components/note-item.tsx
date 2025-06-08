"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Trash2, CheckSquare, Tag } from "lucide-react"
import { deleteNote, type Note } from "@/lib/actions"
import { formatTime } from "@/lib/date-utils"
import { highlightTags } from "@/lib/tag-utils"
import { toast } from "@/hooks/use-toast"

interface NoteItemProps {
  note: Note
  onDelete: () => void
  searchTerm?: string
  onTagClick?: (tag: string) => void
}

export function NoteItem({ note, onDelete, searchTerm, onTagClick }: NoteItemProps) {
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      const result = await deleteNote(note.id)
      if (result.success) {
        onDelete()
        toast({
          title: "删除成功",
          description: "笔记已删除",
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
        title: "删除失败",
        description: "网络错误，请重试",
        variant: "destructive",
      })
    } finally {
      setIsDeleting(false)
    }
  }

  // 高亮搜索内容
  const highlightSearchTerm = (content: string) => {
    if (!searchTerm) return highlightTags(content)

    const regex = new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi")
    const highlighted = content.replace(regex, '<mark class="bg-yellow-200">$1</mark>')
    return highlightTags(highlighted)
  }

  const todoCount = note.todos?.length || 0
  const completedTodos = note.todos?.filter((todo) => todo.completed).length || 0

  return (
    <div className="p-3 border rounded-lg group hover:shadow-sm transition-shadow bg-white">
      <div className="flex justify-between items-start mb-2">
        {/* 左上角：时间和Todo徽章 */}
        <div className="flex items-center gap-2">
          <div className="text-sm font-medium text-muted-foreground">{formatTime(note.createdAt)}</div>
          {todoCount > 0 && (
            <Badge variant="secondary" className="text-xs">
              <CheckSquare className="h-3 w-3 mr-1" />
              {completedTodos}/{todoCount}
            </Badge>
          )}
        </div>

        {/* 右上角：标签和删除按钮 */}
        <div className="flex items-center gap-2">
          {note.tags.length > 0 && (
            <div className="flex items-center gap-1">
              <Tag className="h-3 w-3 text-muted-foreground" />
              <div className="flex gap-1">
                {note.tags.slice(0, 3).map((tag) => (
                  <Badge 
                    key={tag} 
                    variant="outline" 
                    className="text-xs cursor-pointer hover:bg-muted"
                    onClick={() => onTagClick && onTagClick(tag)}
                  >
                    #{tag}
                  </Badge>
                ))}
                {note.tags.length > 3 && (
                  <Badge variant="outline" className="text-xs">
                    +{note.tags.length - 3}
                  </Badge>
                )}
              </div>
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDelete}
            disabled={isDeleting}
            className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>
      <div className="whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: highlightSearchTerm(note.content) }} />
    </div>
  )
}
