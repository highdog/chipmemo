"use client"

import { NoteItem } from "./note-item"
import { formatDateOnly } from "@/lib/date-utils"
import type { Note } from "@/lib/actions"

interface NoteGroupProps {
  date: string
  notes: Note[]
  onDelete: () => void
  searchTerm?: string
  onTagClick?: (tag: string) => void
}

export function NoteGroup({ date, notes, onDelete, searchTerm, onTagClick }: NoteGroupProps) {
  return (
    <div className="mb-6" id={`date-${date}`}>
      {/* 日期标题 - 粘性定位 */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border/40 flex items-center py-2 mb-3">
        <h3 className="text-lg font-semibold text-foreground">{formatDateOnly(date)}</h3>
        <div className="ml-3 text-sm text-muted-foreground">{notes.length} 条笔记</div>
      </div>

      {/* 该日期下的所有笔记 */}
      <div className="space-y-3 ml-4">
        {notes.map((note) => (
          <NoteItem key={note.id} note={note} onDelete={onDelete} searchTerm={searchTerm} onTagClick={onTagClick} />
        ))}
      </div>
    </div>
  )
}
