'use client'

import React from 'react'
import MDEditor from '@uiw/react-md-editor'
import '@uiw/react-md-editor/markdown-editor.css'
import '@uiw/react-markdown-preview/markdown.css'

interface MarkdownEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  onKeyDown?: (event: React.KeyboardEvent) => void
  className?: string
}

export function MarkdownEditor({
  value,
  onChange,
  placeholder = "输入Markdown内容...",
  disabled = false,
  onKeyDown,
  className = ""
}: MarkdownEditorProps) {
  const handleChange = (val?: string) => {
    onChange(val || '')
  }

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (onKeyDown) {
      onKeyDown(event)
    }
  }

  return (
    <div className={`markdown-editor ${className}`} onKeyDown={handleKeyDown}>
      <MDEditor
        value={value}
        onChange={handleChange}
        preview="live"
        hideToolbar={false}
        textareaProps={{
          placeholder,
          disabled,
          style: {
            fontSize: 14,
            lineHeight: 1.6,
            fontFamily: 'inherit'
          }
        }}
        height={120}
        data-color-mode="light"
      />
    </div>
  )
}