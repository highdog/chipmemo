'use client'

import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Hash } from 'lucide-react'
import { getAllTags } from '@/lib/actions'

interface TagSuggestionProps {
  inputValue: string
  onTagSelect: (tag: string) => void
  inputRef: React.RefObject<HTMLInputElement | HTMLTextAreaElement>
  disabled?: boolean
}

export function TagSuggestion({ inputValue, onTagSelect, inputRef, disabled = false }: TagSuggestionProps) {
  const [allTags, setAllTags] = useState<string[]>([])
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 })
  const suggestionsRef = useRef<HTMLDivElement>(null)

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

  // 处理标签建议 - 添加防抖以提高输入性能
  useEffect(() => {
    if (disabled) {
      setShowSuggestions(false)
      return
    }

    // 如果不包含#字符，直接隐藏建议，避免不必要的处理
    if (!inputValue.includes('#')) {
      setShowSuggestions(false)
      return
    }

    // 使用防抖延迟处理，避免频繁触发
    const debounceTimer = setTimeout(() => {
      const lastHashIndex = inputValue.lastIndexOf('#')
      const tagPart = inputValue.substring(lastHashIndex + 1)
      
      // 检查#后面是否有空格，如果有则不显示建议
      if (tagPart.includes(' ')) {
        setShowSuggestions(false)
        return
      }
      
      if (tagPart.length >= 0) {
        const filteredSuggestions = allTags.filter(tag => 
          tag.toLowerCase().includes(tagPart.toLowerCase())
        ).slice(0, 8)
        
        if (allTags.length === 0) {
          setSuggestions(['暂无标签'])
        } else if (filteredSuggestions.length === 0 && tagPart === '') {
          setSuggestions(allTags.slice(0, 8))
        } else {
          setSuggestions(filteredSuggestions)
        }
        
        updateDropdownPosition()
        setShowSuggestions(true)
        setSelectedIndex(-1)
      } else {
        setShowSuggestions(false)
      }
    }, 300) // 增加防抖延迟到300ms

    // 清理定时器
    return () => clearTimeout(debounceTimer)
  }, [inputValue, allTags, disabled])

  // 处理建议点击
  const handleSuggestionClick = (tag: string) => {
    if (tag === '暂无标签') return
    
    const lastHashIndex = inputValue.lastIndexOf('#')
    const beforeHash = inputValue.substring(0, lastHashIndex)
    const newValue = beforeHash + '#' + tag + ' '
    
    onTagSelect(newValue)
    setShowSuggestions(false)
    setSelectedIndex(-1)
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
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false)
        setSelectedIndex(-1)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // 渲染标签建议下拉列表
  return (
    <>
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
    </>
  )
}