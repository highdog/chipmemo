"use client"

import type React from "react"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search, X } from "lucide-react"

interface SearchBarProps {
  onSearch: (searchTerm: string) => void
  placeholder?: string
}

export function SearchBar({ onSearch, placeholder = "搜索笔记内容或标签..." }: SearchBarProps) {
  const [searchTerm, setSearchTerm] = useState("")

  const handleSearch = () => {
    onSearch(searchTerm)
  }

  const handleClear = () => {
    setSearchTerm("")
    onSearch("")
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch()
    }
  }

  return (
    <div className="flex items-center gap-2 max-w-md">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="pl-10 pr-10"
        />
        {searchTerm && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClear}
            className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>
      <Button onClick={handleSearch} size="sm">
        搜索
      </Button>
    </div>
  )
}
