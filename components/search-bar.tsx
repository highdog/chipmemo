"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Search, X } from "lucide-react"

interface SearchBarProps {
  onSearch: (searchTerm: string) => void
  onClearSearch: () => void
  searchTerm: string
  placeholder?: string
}

export function SearchBar({ 
  onSearch, 
  onClearSearch, 
  searchTerm, 
  placeholder = "搜索笔记内容或标签..." 
}: SearchBarProps) {
  const [inputValue, setInputValue] = useState("")

  useEffect(() => {
    setInputValue(searchTerm)
  }, [searchTerm])

  const handleSearch = () => {
    onSearch(inputValue)
  }

  const handleClear = () => {
    setInputValue("")
    onSearch("")
    onClearSearch()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch()
    }
  }



  return (
    <div className="w-full">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="pl-10 pr-10"
          />
          {inputValue && (
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
    </div>
  )
}
