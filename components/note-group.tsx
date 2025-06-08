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
    <div className="mb-6">
      {/* 日期标题 */}
      <div className="flex items-center mb-3">
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
