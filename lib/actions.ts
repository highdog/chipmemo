'use client';

import { notesApi, todosApi, Note as ApiNote, Todo as ApiTodo } from './api';
import { extractTags, removeTagsFromContent } from './utils';

// 兼容原有的接口定义
export interface Note {
  id: string;
  content: string;
  originalContent: string;
  date: string;
  createdAt: string;
  todos?: TodoItem[];
  tags: string[];
  imageUrl?: string;
}

export interface TodoItem {
  id: string;
  content: string;
  completed: boolean;
}

// 将后端API的Note转换为前端Note格式
function convertApiNoteToNote(apiNote: ApiNote): Note {
  // 从内容中提取todos
  const todos = parseTodos(apiNote.content);
  
  // 从内容中提取图片URL
  const imageRegex = /!\[.*?\]\((.*?)\)/;
  const imageMatch = apiNote.content.match(imageRegex);
  const imageUrl = imageMatch ? imageMatch[1] : undefined;
  
  // 移除内容中的图片markdown，只保留文本内容用于显示
  let contentWithoutImage = apiNote.content.replace(/!\[.*?\]\(.*?\)/g, '').trim();
  
  // 移除标签文字，因为标签已经单独显示
  contentWithoutImage = removeTagsFromContent(contentWithoutImage);
  
  return {
    id: apiNote._id,
    content: contentWithoutImage,
    originalContent: apiNote.content, // 后端已经存储完整内容
    date: new Date(apiNote.createdAt).toISOString().split('T')[0],
    createdAt: apiNote.createdAt,
    todos,
    tags: apiNote.tags,
    imageUrl: imageUrl,
  };
}

// 将前端Note转换为后端API格式
function convertNoteToApiNote(note: Partial<Note>): {
  title: string;
  content: string;
  tags: string[];
} {
  const title = note.originalContent?.split('\n')[0]?.substring(0, 100) || '无标题';
  return {
    title,
    content: note.originalContent || note.content || '',
    tags: note.tags || [],
  };
}

// 解析笔记内容中的todo项 - 支持中英文
function parseTodos(content: string): TodoItem[] {
  const todoRegex = /#todo\s+([\s\S]*?)(?=\n#|$)/gi;
  const todos: TodoItem[] = [];
  let match;

  while ((match = todoRegex.exec(content)) !== null) {
    const todoContent = match[1].trim();
    if (todoContent) {
      todos.push({
        id: `todo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        content: todoContent,
        completed: false,
      });
    }
  }

  return todos;
}

// 获取所有笔记
export async function getNotes(): Promise<Note[]> {
  try {
    const response = await notesApi.getAll({ limit: 100 });
    
    if (response.success && response.data) {
      return response.data.notes.map(convertApiNoteToNote);
    } else {
      console.error('Failed to fetch notes:', response.error);
      return [];
    }
  } catch (error) {
    console.error('Error fetching notes:', error);
    return [];
  }
}

// 添加笔记
export async function addNote(
  content: string,
  date: string,
  imageUrl?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!content.trim() && !imageUrl) {
      return { success: false, error: '笔记内容不能为空' };
    }

    let originalContent = content.trim();
    
    // 如果有图片，将图片添加到内容中
    if (imageUrl) {
      originalContent = originalContent + (originalContent ? '\n\n' : '') + `![图片](${imageUrl})`;
    }
    
    const tags = extractTags(originalContent);
    const title = content.trim().split('\n')[0]?.substring(0, 100) || (imageUrl ? '图片笔记' : '无标题');

    const response = await notesApi.create({
      title,
      content: originalContent,
      tags,
      customDate: date,
    });

    if (response.success) {
      return { success: true };
    } else {
      return {
        success: false,
        error: response.error || '添加笔记失败，请重试',
      };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '添加笔记失败，请重试',
    };
  }
}

// 删除笔记
export async function deleteNote(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await notesApi.delete(id);
    
    if (response.success) {
      return { success: true };
    } else {
      return {
        success: false,
        error: response.error || '删除笔记失败，请重试',
      };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '删除笔记失败，请重试',
    };
  }
}

// 切换todo状态
export async function toggleTodo(
  noteId: string,
  todoId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // 由于后端的todo是独立管理的，这里需要先获取笔记，然后更新内容
    // 这是一个临时解决方案，理想情况下应该将todo也迁移到后端独立管理
    
    // 获取当前笔记
    const response = await notesApi.getById(noteId);
    if (!response.success || !response.data) {
      return { success: false, error: '笔记不存在' };
    }

    const note = response.data;
    let content = note.content;
    
    // 在内容中查找并切换todo状态
    // 这是一个简化的实现，实际应用中可能需要更复杂的逻辑
    const todoRegex = /#todo\s+([\s\S]*?)(?=\n#|$)/gi;
    let match;
    let todoIndex = 0;
    
    content = content.replace(todoRegex, (match, todoContent) => {
      const currentTodoId = `todo_${todoIndex}`;
      if (todoId.includes(todoIndex.toString())) {
        // 切换完成状态（这里简化处理）
        if (todoContent.includes('✓')) {
          return match.replace('✓', '☐');
        } else {
          return match.replace(todoContent, `✓ ${todoContent}`);
        }
      }
      todoIndex++;
      return match;
    });

    // 更新笔记内容
    const updateResponse = await notesApi.update(noteId, {
      content,
      title: note.title,
    });

    if (updateResponse.success) {
      return { success: true };
    } else {
      return {
        success: false,
        error: updateResponse.error || '更新todo状态失败',
      };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '更新todo状态失败',
    };
  }
}

// 获取指定日期的todos
export async function getTodosByDate(
  date: string
): Promise<{ noteId: string; todos: TodoItem[] }[]> {
  try {
    // 获取指定日期的笔记
    const response = await notesApi.getAll({ limit: 100 });
    
    if (!response.success || !response.data) {
      return [];
    }

    const targetDate = new Date(date).toDateString();
    
    return response.data.notes
      .filter((note) => {
        const noteDate = new Date(note.createdAt).toDateString();
        return noteDate === targetDate;
      })
      .map((note) => {
        const todos = parseTodos(note.content);
        return {
          noteId: note._id,
          todos,
        };
      })
      .filter((item) => item.todos.length > 0);
  } catch (error) {
    console.error('Error fetching todos by date:', error);
    return [];
  }
}

// 搜索笔记
export async function searchNotes(searchTerm: string): Promise<Note[]> {
  try {
    if (!searchTerm.trim()) {
      return getNotes();
    }

    const response = await notesApi.getAll({ search: searchTerm, limit: 100 });
    
    if (response.success && response.data) {
      return response.data.notes.map(convertApiNoteToNote);
    } else {
      console.error('Failed to search notes:', response.error);
      return [];
    }
  } catch (error) {
    console.error('Error searching notes:', error);
    return [];
  }
}

// 按标签搜索笔记
export async function searchNotesByTag(tag: string): Promise<Note[]> {
  try {
    const response = await notesApi.getAll({ tags: tag, limit: 100 });
    
    if (response.success && response.data) {
      return response.data.notes.map(convertApiNoteToNote);
    } else {
      console.error('Failed to search notes by tag:', response.error);
      return [];
    }
  } catch (error) {
    console.error('Error searching notes by tag:', error);
    return [];
  }
}

// 获取所有标签
export async function getAllTags(): Promise<string[]> {
  try {
    const response = await notesApi.getTags();
    
    if (response.success && response.data) {
      return response.data.map((item) => item.tag);
    } else {
      console.error('Failed to fetch tags:', response.error);
      return [];
    }
  } catch (error) {
    console.error('Error fetching tags:', error);
    return [];
  }
}

// 独立的Todo管理函数（使用后端Todo API）
export const todoActions = {
  // 获取todos
  async getTodos(params?: {
    date?: string;
    completed?: boolean;
    category?: string;
  }) {
    try {
      const response = await todosApi.getAll(params);
      return response.success ? response.data?.todos || [] : [];
    } catch (error) {
      console.error('Error fetching todos:', error);
      return [];
    }
  },

  // 创建todo
  async createTodo(data: {
    text: string;
    priority?: 'low' | 'medium' | 'high';
    dueDate?: string;
    category?: string;
  }) {
    try {
      const response = await todosApi.create(data);
      return {
        success: response.success,
        error: response.error,
        data: response.data,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '创建待办事项失败',
      };
    }
  },

  // 更新todo
  async updateTodo(
    id: string,
    data: {
      text?: string;
      completed?: boolean;
      priority?: 'low' | 'medium' | 'high';
      dueDate?: string;
      category?: string;
    }
  ) {
    try {
      const response = await todosApi.update(id, data);
      return {
        success: response.success,
        error: response.error,
        data: response.data,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '更新待办事项失败',
      };
    }
  },

  // 切换todo完成状态
  async toggleTodo(id: string) {
    try {
      const response = await todosApi.toggle(id);
      return {
        success: response.success,
        error: response.error,
        data: response.data,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '切换待办事项状态失败',
      };
    }
  },

  // 删除todo
  async deleteTodo(id: string) {
    try {
      const response = await todosApi.delete(id);
      return {
        success: response.success,
        error: response.error,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '删除待办事项失败',
      };
    }
  },

  // 获取todo统计
  async getTodoStats() {
    try {
      const response = await todosApi.getStats();
      return response.success ? response.data : null;
    } catch (error) {
      console.error('Error fetching todo stats:', error);
      return null;
    }
  },
};