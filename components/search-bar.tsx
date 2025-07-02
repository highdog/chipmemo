"use client"

import React from "react"

import { useState, useEffect, useRef } from "react"
import { createPortal } from "react-dom"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Search, X, Hash } from "lucide-react"
import { getAllTags } from "@/lib/actions"

interface SearchBarProps {
  onSearch: (searchTerm: string) => void
  onClearSearch: () => void
  searchTerm: string
  placeholder?: string
  showClearButton?: boolean
}

export const SearchBar = React.memo(function SearchBar({ 
  onSearch, 
  onClearSearch, 
  searchTerm, 
  placeholder = "搜索笔记内容或标签...",
  showClearButton = false
}: SearchBarProps) {
  const [inputValue, setInputValue] = useState("")
  const [allTags, setAllTags] = useState<string[]>([])
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 })
  const inputRef = useRef<HTMLInputElement>(null)
  const suggestionsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setInputValue(searchTerm)
  }, [searchTerm])

  // 加载所有标签
  useEffect(() => {
    const loadTags = async () => {
      try {
        const tags = await getAllTags()
    
        setAllTags(tags)
      } catch (error) {
        console.error('Failed to load tags:', error)
      }
    }
    loadTags()
  }, [])

  // 更新下拉菜单位置
  const updateDropdownPosition = () => {
    if (inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect()
      setDropdownPosition({
        top: rect.bottom + window.scrollY + 4,
        left: rect.left + window.scrollX,
        width: rect.width
      })
    }
  }

  // 处理输入变化和标签建议
  const handleInputChange = (value: string) => {
    setInputValue(value)
    
    // 如果输入以#开头，显示标签建议
    if (value.startsWith('#')) {
      const tagQuery = value.slice(1).toLowerCase()
      let filteredTags = allTags.filter(tag => 
        tag.toLowerCase().includes(tagQuery)
      ).slice(0, 8) // 最多显示8个建议
      
      // 如果没有标签数据，显示提示信息
      if (allTags.length === 0) {
        filteredTags = ['暂无标签']
      } else if (filteredTags.length === 0 && tagQuery === '') {
        // 如果只输入了#，显示所有标签
        filteredTags = allTags.slice(0, 8)
      }
      setSuggestions(filteredTags)
      updateDropdownPosition()
      setShowSuggestions(true) // 总是显示建议列表
      setSelectedIndex(-1)
    } else {
      setShowSuggestions(false)
      setSuggestions([])
      setSelectedIndex(-1)
    }
  }

  const handleSearch = () => {
    onSearch(inputValue)
    setShowSuggestions(false)
  }

  const handleClear = () => {
    setInputValue("")
    onSearch("")
    onClearSearch()
    setShowSuggestions(false)
    setSuggestions([])
    setSelectedIndex(-1)
  }

  const handleSuggestionClick = (tag: string) => {
    // 如果是提示信息，不执行任何操作
    if (tag === '暂无标签') {
      return
    }
    const newValue = `#${tag}`
    setInputValue(newValue)
    onSearch(newValue)
    setShowSuggestions(false)
    setSelectedIndex(-1)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (showSuggestions && suggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : 0
        )
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex(prev => 
          prev > 0 ? prev - 1 : suggestions.length - 1
        )
      } else if (e.key === 'Enter') {
        e.preventDefault()
        if (selectedIndex >= 0) {
          handleSuggestionClick(suggestions[selectedIndex])
        } else {
          handleSearch()
        }
      } else if (e.key === 'Escape') {
        setShowSuggestions(false)
        setSelectedIndex(-1)
      }
    } else if (e.key === "Enter") {
      handleSearch()
    }
  }

  // 监听键盘事件
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!showSuggestions || suggestions.length === 0) return
      
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          setSelectedIndex(prev => 
            prev < suggestions.length - 1 ? prev + 1 : 0
          )
          break
        case 'ArrowUp':
          e.preventDefault()
          setSelectedIndex(prev => 
            prev > 0 ? prev - 1 : suggestions.length - 1
          )
          break
        case 'Enter':
          e.preventDefault()
          if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
            handleSuggestionClick(suggestions[selectedIndex])
          }
          break
        case 'Escape':
          setShowSuggestions(false)
          setSelectedIndex(-1)
          break
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [showSuggestions, suggestions, selectedIndex])

  // 监听窗口滚动和resize事件，更新下拉菜单位置
  useEffect(() => {
    if (!showSuggestions) return

    const handleScroll = () => updateDropdownPosition()
    const handleResize = () => updateDropdownPosition()

    window.addEventListener('scroll', handleScroll, true)
    window.addEventListener('resize', handleResize)
    
    return () => {
      window.removeEventListener('scroll', handleScroll, true)
      window.removeEventListener('resize', handleResize)
    }
  }, [showSuggestions])

  // 点击外部关闭建议
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target as Node) &&
          inputRef.current && !inputRef.current.contains(event.target as Node)) {
        setShowSuggestions(false)
        setSelectedIndex(-1)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])



  return (
    <div className="w-full">
      <div className="flex items-center gap-2">
        <div className="relative flex-1 isolate">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            ref={inputRef}
            value={inputValue}
            onChange={(e) => handleInputChange(e.target.value)}
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
          
          {/* 标签建议下拉列表使用Portal */}
          {showSuggestions && suggestions.length > 0 && typeof window !== 'undefined' && createPortal(
            <div 
              ref={suggestionsRef}
              className="fixed bg-background border border-border rounded-md shadow-lg z-[99999] max-h-48 overflow-y-auto"
              style={{
                top: dropdownPosition.top,
                left: dropdownPosition.left,
                width: dropdownPosition.width
              }}
            >
              {suggestions.map((tag, index) => (
                <div
                  key={tag}
                  className={`flex items-center gap-2 px-3 py-2 transition-colors ${
                    tag === '暂无标签' 
                      ? 'text-muted-foreground cursor-default' 
                      : `cursor-pointer hover:bg-accent ${
                          index === selectedIndex ? 'bg-accent' : ''
                        }`
                  }`}
                  onClick={() => handleSuggestionClick(tag)}
                >
                  <Hash className="h-3 w-3 text-muted-foreground" />
                  <span className="text-sm">{tag}</span>
                </div>
              ))}
            </div>,
            document.body
          )}
        </div>
        
        <Button onClick={handleSearch} size="sm">
          搜索
        </Button>
        
        {showClearButton && (
          <Button onClick={onClearSearch} size="sm" variant="outline">
            显示全部
          </Button>
        )}
      </div>
    </div>
  )
})
