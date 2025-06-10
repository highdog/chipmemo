# 日历同步长期方案实现指南

## 概述

本文档详细说明如何实现与Apple日历（以及其他主流日历应用）的数据同步功能。基于当前的技术栈（Next.js + Express + MongoDB），我们提供三种渐进式的实现方案。

## 当前系统分析

### 技术栈
- **前端**: Next.js 15.2.4, React 19, TypeScript
- **后端**: Express.js, MongoDB, Node.js
- **日程数据结构**:
```typescript
interface ScheduleItem {
  id: string
  title: string
  time: string
  description?: string
  type: 'meeting' | 'appointment' | 'event' | 'reminder'
}
```

### 当前存储方式
- 使用 `localStorage` 进行本地存储
- 按日期分组存储：`schedules_YYYY-MM-DD`
- 实时同步机制：自定义事件 `scheduleUpdated`

## 实现方案

### 方案一：ICS文件导入/导出（短期 - 2-4周）

#### 1.1 安装依赖
```bash
npm install ical-generator ical-parser node-ical
npm install @types/node-ical --save-dev
```

#### 1.2 后端API实现

**创建 `/backend/src/routes/calendar.js`**:
```javascript
const express = require('express');
const ical = require('ical-generator');
const ICAL = require('node-ical');
const router = express.Router();

// 导出ICS文件
router.get('/export/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { startDate, endDate } = req.query;
    
    // 从数据库获取用户的日程数据
    const schedules = await getSchedulesByDateRange(userId, startDate, endDate);
    
    const calendar = ical({ name: 'My Notepad Calendar' });
    
    schedules.forEach(schedule => {
      calendar.createEvent({
        start: new Date(`${schedule.date} ${schedule.time}`),
        end: new Date(`${schedule.date} ${schedule.time}`), // 可以添加duration
        summary: schedule.title,
        description: schedule.description,
        categories: [schedule.type]
      });
    });
    
    res.setHeader('Content-Type', 'text/calendar');
    res.setHeader('Content-Disposition', 'attachment; filename="calendar.ics"');
    res.send(calendar.toString());
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 导入ICS文件
router.post('/import/:userId', upload.single('icsFile'), async (req, res) => {
  try {
    const { userId } = req.params;
    const icsContent = req.file.buffer.toString();
    
    const events = ICAL.parseICS(icsContent);
    const schedules = [];
    
    for (let k in events) {
      if (events.hasOwnProperty(k)) {
        const ev = events[k];
        if (ev.type === 'VEVENT') {
          schedules.push({
            title: ev.summary,
            time: ev.start.toTimeString().slice(0, 5),
            date: ev.start.toISOString().split('T')[0],
            description: ev.description,
            type: 'event',
            userId: userId,
            externalId: ev.uid
          });
        }
      }
    }
    
    // 保存到数据库
    await saveImportedSchedules(schedules);
    
    res.json({ success: true, imported: schedules.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
```

#### 1.3 前端组件实现

**创建 `/components/calendar-sync.tsx`**:
```typescript
'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Download, Upload, Calendar } from 'lucide-react'

interface CalendarSyncProps {
  userId: string
}

const CalendarSync: React.FC<CalendarSyncProps> = ({ userId }) => {
  const [isExporting, setIsExporting] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  const handleExport = async () => {
    setIsExporting(true)
    try {
      const response = await fetch(`/api/calendar/export/${userId}?startDate=2024-01-01&endDate=2024-12-31`)
      const blob = await response.blob()
      
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'my-calendar.ics'
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('导出失败:', error)
    } finally {
      setIsExporting(false)
    }
  }

  const handleImport = async () => {
    if (!selectedFile) return
    
    setIsImporting(true)
    try {
      const formData = new FormData()
      formData.append('icsFile', selectedFile)
      
      const response = await fetch(`/api/calendar/import/${userId}`, {
        method: 'POST',
        body: formData
      })
      
      const result = await response.json()
      if (result.success) {
        alert(`成功导入 ${result.imported} 个日程`)
        // 触发日程数据刷新
        window.dispatchEvent(new CustomEvent('scheduleUpdated'))
      }
    } catch (error) {
      console.error('导入失败:', error)
    } finally {
      setIsImporting(false)
      setSelectedFile(null)
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          日历同步
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Button 
            onClick={handleExport} 
            disabled={isExporting}
            className="w-full"
            variant="outline"
          >
            <Download className="h-4 w-4 mr-2" />
            {isExporting ? '导出中...' : '导出到ICS文件'}
          </Button>
          <p className="text-sm text-gray-500 mt-1">
            导出后可导入到Apple日历、Google日历等
          </p>
        </div>
        
        <div>
          <Input
            type="file"
            accept=".ics"
            onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
            className="mb-2"
          />
          <Button 
            onClick={handleImport} 
            disabled={isImporting || !selectedFile}
            className="w-full"
          >
            <Upload className="h-4 w-4 mr-2" />
            {isImporting ? '导入中...' : '从ICS文件导入'}
          </Button>
          <p className="text-sm text-gray-500 mt-1">
            支持从Apple日历、Google日历导出的ICS文件
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

export default CalendarSync
```

### 方案二：CalDAV协议集成（中期 - 6-8周）

#### 2.1 安装CalDAV依赖
```bash
npm install caldav-client dav
npm install @types/dav --save-dev
```

#### 2.2 CalDAV服务实现

**创建 `/backend/src/services/caldav.js`**:
```javascript
const { DAVClient } = require('dav');

class CalDAVService {
  constructor() {
    this.clients = new Map(); // 存储用户的CalDAV客户端
  }

  async connectToAppleCalendar(userId, username, password) {
    try {
      const client = new DAVClient({
        serverUrl: 'https://caldav.icloud.com',
        credentials: {
          username: username,
          password: password // 应该是App专用密码
        },
        authMethod: 'Basic',
        defaultAccountType: 'caldav'
      });

      await client.login();
      const calendars = await client.fetchCalendars();
      
      this.clients.set(userId, { client, calendars });
      
      return { success: true, calendars: calendars.map(cal => ({
        id: cal.url,
        name: cal.displayName,
        color: cal.color
      })) };
    } catch (error) {
      console.error('CalDAV连接失败:', error);
      return { success: false, error: error.message };
    }
  }

  async syncSchedulesToCalDAV(userId, schedules) {
    const clientData = this.clients.get(userId);
    if (!clientData) {
      throw new Error('未找到CalDAV连接');
    }

    const { client, calendars } = clientData;
    const targetCalendar = calendars[0]; // 使用第一个日历

    const events = schedules.map(schedule => ({
      type: 'VEVENT',
      uid: `notepad-${schedule.id}@example.com`,
      summary: schedule.title,
      description: schedule.description,
      dtstart: new Date(`${schedule.date} ${schedule.time}`),
      dtend: new Date(`${schedule.date} ${schedule.time}`),
      categories: [schedule.type]
    }));

    try {
      await client.createCalendarObjects({
        calendar: targetCalendar,
        calendarObjects: events
      });
      return { success: true, synced: events.length };
    } catch (error) {
      console.error('同步到CalDAV失败:', error);
      return { success: false, error: error.message };
    }
  }

  async fetchFromCalDAV(userId) {
    const clientData = this.clients.get(userId);
    if (!clientData) {
      throw new Error('未找到CalDAV连接');
    }

    const { client, calendars } = clientData;
    
    try {
      const events = [];
      for (const calendar of calendars) {
        const calendarObjects = await client.fetchCalendarObjects({
          calendar: calendar,
          timeRange: {
            start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30天前
            end: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)   // 365天后
          }
        });
        events.push(...calendarObjects);
      }
      
      return events.map(event => ({
        id: event.uid,
        title: event.summary,
        time: event.dtstart.toTimeString().slice(0, 5),
        date: event.dtstart.toISOString().split('T')[0],
        description: event.description,
        type: 'event',
        source: 'caldav'
      }));
    } catch (error) {
      console.error('从CalDAV获取数据失败:', error);
      return [];
    }
  }
}

module.exports = new CalDAVService();
```

#### 2.3 双向同步机制

**创建 `/backend/src/services/sync.js`**:
```javascript
const CalDAVService = require('./caldav');
const Schedule = require('../models/Schedule');

class SyncService {
  async performBidirectionalSync(userId) {
    try {
      // 1. 获取本地数据
      const localSchedules = await Schedule.find({ userId });
      
      // 2. 获取CalDAV数据
      const remoteSchedules = await CalDAVService.fetchFromCalDAV(userId);
      
      // 3. 比较和合并数据
      const syncResult = this.mergeSchedules(localSchedules, remoteSchedules);
      
      // 4. 更新本地数据库
      await this.updateLocalSchedules(userId, syncResult.toUpdate);
      
      // 5. 推送到CalDAV
      await CalDAVService.syncSchedulesToCalDAV(userId, syncResult.toPush);
      
      return {
        success: true,
        localUpdated: syncResult.toUpdate.length,
        remotePushed: syncResult.toPush.length
      };
    } catch (error) {
      console.error('同步失败:', error);
      return { success: false, error: error.message };
    }
  }

  mergeSchedules(local, remote) {
    const toUpdate = [];
    const toPush = [];
    
    // 简化的合并逻辑 - 实际应用中需要更复杂的冲突解决
    const remoteIds = new Set(remote.map(r => r.id));
    const localIds = new Set(local.map(l => l.id));
    
    // 需要推送到远程的本地数据
    local.forEach(schedule => {
      if (!remoteIds.has(schedule.id) && !schedule.source) {
        toPush.push(schedule);
      }
    });
    
    // 需要更新到本地的远程数据
    remote.forEach(schedule => {
      if (!localIds.has(schedule.id)) {
        toUpdate.push(schedule);
      }
    });
    
    return { toUpdate, toPush };
  }

  async updateLocalSchedules(userId, schedules) {
    for (const schedule of schedules) {
      await Schedule.findOneAndUpdate(
        { id: schedule.id, userId },
        { ...schedule, userId },
        { upsert: true }
      );
    }
  }
}

module.exports = new SyncService();
```

### 方案三：第三方服务集成（长期 - 8-12周）

#### 3.1 Google Calendar API集成

```bash
npm install googleapis
```

**创建 `/backend/src/services/google-calendar.js`**:
```javascript
const { google } = require('googleapis');

class GoogleCalendarService {
  constructor() {
    this.oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );
  }

  async getAuthUrl() {
    const scopes = ['https://www.googleapis.com/auth/calendar'];
    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes
    });
  }

  async exchangeCodeForTokens(code) {
    const { tokens } = await this.oauth2Client.getToken(code);
    this.oauth2Client.setCredentials(tokens);
    return tokens;
  }

  async syncSchedules(userId, schedules, accessToken) {
    this.oauth2Client.setCredentials({ access_token: accessToken });
    const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });

    const results = [];
    for (const schedule of schedules) {
      try {
        const event = {
          summary: schedule.title,
          description: schedule.description,
          start: {
            dateTime: new Date(`${schedule.date} ${schedule.time}`).toISOString(),
            timeZone: 'Asia/Shanghai'
          },
          end: {
            dateTime: new Date(`${schedule.date} ${schedule.time}`).toISOString(),
            timeZone: 'Asia/Shanghai'
          }
        };

        const response = await calendar.events.insert({
          calendarId: 'primary',
          resource: event
        });

        results.push({ success: true, eventId: response.data.id });
      } catch (error) {
        results.push({ success: false, error: error.message });
      }
    }

    return results;
  }
}

module.exports = new GoogleCalendarService();
```

## 数据库模型扩展

**创建 `/backend/src/models/Schedule.js`**:
```javascript
const mongoose = require('mongoose');

const scheduleSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  time: { type: String, required: true },
  date: { type: String, required: true },
  description: String,
  type: {
    type: String,
    enum: ['meeting', 'appointment', 'event', 'reminder'],
    default: 'event'
  },
  userId: { type: String, required: true },
  
  // 同步相关字段
  source: {
    type: String,
    enum: ['local', 'caldav', 'google', 'apple'],
    default: 'local'
  },
  externalId: String, // 外部系统的ID
  lastSyncAt: Date,
  syncStatus: {
    type: String,
    enum: ['pending', 'synced', 'error'],
    default: 'pending'
  },
  
  // 冲突解决
  version: { type: Number, default: 1 },
  lastModified: { type: Date, default: Date.now }
}, {
  timestamps: true
});

scheduleSchema.index({ userId: 1, date: 1 });
scheduleSchema.index({ externalId: 1 });

module.exports = mongoose.model('Schedule', scheduleSchema);
```

## 前端集成组件

**创建 `/components/sync-settings.tsx`**:
```typescript
'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Settings, Sync, CheckCircle, AlertCircle } from 'lucide-react'

interface SyncProvider {
  id: string
  name: string
  connected: boolean
  lastSync?: Date
  status: 'idle' | 'syncing' | 'error'
}

const SyncSettings: React.FC = () => {
  const [providers, setProviders] = useState<SyncProvider[]>([
    { id: 'google', name: 'Google Calendar', connected: false, status: 'idle' },
    { id: 'apple', name: 'Apple Calendar (CalDAV)', connected: false, status: 'idle' },
    { id: 'outlook', name: 'Outlook Calendar', connected: false, status: 'idle' }
  ])
  const [autoSync, setAutoSync] = useState(false)

  const handleConnect = async (providerId: string) => {
    setProviders(prev => prev.map(p => 
      p.id === providerId ? { ...p, status: 'syncing' } : p
    ))

    try {
      // 实际的连接逻辑
      const response = await fetch(`/api/calendar/connect/${providerId}`, {
        method: 'POST'
      })
      
      if (response.ok) {
        setProviders(prev => prev.map(p => 
          p.id === providerId 
            ? { ...p, connected: true, status: 'idle', lastSync: new Date() }
            : p
        ))
      }
    } catch (error) {
      setProviders(prev => prev.map(p => 
        p.id === providerId ? { ...p, status: 'error' } : p
      ))
    }
  }

  const handleSync = async (providerId: string) => {
    setProviders(prev => prev.map(p => 
      p.id === providerId ? { ...p, status: 'syncing' } : p
    ))

    try {
      const response = await fetch(`/api/calendar/sync/${providerId}`, {
        method: 'POST'
      })
      
      if (response.ok) {
        setProviders(prev => prev.map(p => 
          p.id === providerId 
            ? { ...p, status: 'idle', lastSync: new Date() }
            : p
        ))
        
        // 触发日程数据刷新
        window.dispatchEvent(new CustomEvent('scheduleUpdated'))
      }
    } catch (error) {
      setProviders(prev => prev.map(p => 
        p.id === providerId ? { ...p, status: 'error' } : p
      ))
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          日历同步设置
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium">自动同步</h3>
            <p className="text-sm text-gray-500">每小时自动同步日程数据</p>
          </div>
          <Switch checked={autoSync} onCheckedChange={setAutoSync} />
        </div>
        
        <div className="space-y-4">
          <h3 className="font-medium">连接的日历服务</h3>
          {providers.map(provider => (
            <div key={provider.id} className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{provider.name}</span>
                    {provider.connected && (
                      <Badge variant="secondary" className="text-green-600">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        已连接
                      </Badge>
                    )}
                    {provider.status === 'error' && (
                      <Badge variant="destructive">
                        <AlertCircle className="h-3 w-3 mr-1" />
                        错误
                      </Badge>
                    )}
                  </div>
                  {provider.lastSync && (
                    <p className="text-sm text-gray-500">
                      上次同步: {provider.lastSync.toLocaleString()}
                    </p>
                  )}
                </div>
              </div>
              
              <div className="flex gap-2">
                {!provider.connected ? (
                  <Button 
                    size="sm" 
                    onClick={() => handleConnect(provider.id)}
                    disabled={provider.status === 'syncing'}
                  >
                    {provider.status === 'syncing' ? '连接中...' : '连接'}
                  </Button>
                ) : (
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => handleSync(provider.id)}
                    disabled={provider.status === 'syncing'}
                  >
                    <Sync className="h-4 w-4 mr-1" />
                    {provider.status === 'syncing' ? '同步中...' : '同步'}
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

export default SyncSettings
```

## 实施时间线

### 第1-2周：基础架构
- [ ] 扩展数据库模型
- [ ] 创建同步相关API路由
- [ ] 实现基础的ICS导入/导出功能

### 第3-4周：ICS功能完善
- [ ] 完善ICS文件处理
- [ ] 添加前端导入/导出界面
- [ ] 测试与主流日历应用的兼容性

### 第5-8周：CalDAV集成
- [ ] 实现CalDAV客户端
- [ ] 开发双向同步机制
- [ ] 添加冲突解决策略
- [ ] Apple日历专用密码支持

### 第9-12周：第三方服务
- [ ] Google Calendar API集成
- [ ] Microsoft Graph API (Outlook)
- [ ] 统一的同步管理界面
- [ ] 自动同步和错误处理

## 安全考虑

1. **凭据存储**: 使用加密存储用户的日历凭据
2. **权限控制**: 最小权限原则，只请求必要的日历权限
3. **数据加密**: 传输和存储过程中的数据加密
4. **错误处理**: 优雅的错误处理和用户提示

## 测试策略

1. **单元测试**: 同步逻辑的单元测试
2. **集成测试**: 与各个日历服务的集成测试
3. **端到端测试**: 完整的同步流程测试
4. **性能测试**: 大量数据同步的性能测试

## 部署注意事项

1. **环境变量**: 配置各个服务的API密钥
2. **HTTPS**: 确保生产环境使用HTTPS
3. **监控**: 添加同步状态和错误监控
4. **备份**: 实施数据备份策略

这个实现方案提供了从简单的文件导入/导出到完整的实时双向同步的渐进式升级路径，可以根据实际需求和资源情况选择合适的实施阶段。