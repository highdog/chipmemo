'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { toast } from '@/components/ui/use-toast';
import { Users, FileText, CheckSquare, Calendar, Tag, TrendingUp } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { adminApi, SystemConfig } from '@/lib/api';

interface UserStats {
  _id: string;
  username: string;
  email: string;
  password: string;
  isAdmin: boolean;
  createdAt: string;
  notesCount: number;
  todosCount: number;
  schedulesCount: number;
  tagContentsCount: number;
  totalItems: number;
}

interface AdminStats {
  summary: {
    totalUsers: number;
    totalNotes: number;
    totalTodos: number;
    totalSchedules: number;
    totalTagContents: number;
    totalItems: number;
  };
  users: UserStats[];
}

interface UserDetail {
  user: {
    _id: string;
    username: string;
    email: string;
    createdAt: string;
    preferences: {
      theme: string;
      language: string;
    };
  };
  recentData: {
    notes: any[];
    todos: any[];
    schedules: any[];
    tagContents: any[];
  };
}

export default function AdminPage() {
  const { user: currentUser } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [selectedUser, setSelectedUser] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [userDetailLoading, setUserDetailLoading] = useState(false);
  const [editingUser, setEditingUser] = useState<UserStats | null>(null);
  const [editForm, setEditForm] = useState({ username: '', email: '', isAdmin: false });
  const [passwordForm, setPasswordForm] = useState({ userId: '', password: '', confirmPassword: '' });
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  
  // 系统配置相关状态
  const [systemConfigs, setSystemConfigs] = useState<SystemConfig[]>([]);
  const [configLoading, setConfigLoading] = useState(false);
  const [tencentCloudConfig, setTencentCloudConfig] = useState({
    secretId: '',
    secretKey: '',
    region: 'ap-beijing',
    bucket: '',
    domain: ''
  });

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (!currentUser || !token) {
      router.push('/login');
      return;
    }

    if (!currentUser.isAdmin) {
      router.push('/');
      return;
    }

    fetchStats();
    fetchSystemConfigs();
  }, [currentUser, router]);

  const fetchStats = async () => {
    try {
      const response = await adminApi.getStats();
      if (response.success && response.data) {
        setStats(response.data);
      } else {
        console.error('Failed to fetch admin stats:', response.error);
      }
    } catch (error) {
      console.error('Error fetching admin stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSystemConfigs = async () => {
    setConfigLoading(true);
    try {
      const response = await adminApi.getSystemConfigs('storage');
      if (response.success && response.data) {
        setSystemConfigs(response.data);
        
        // 解析腾讯云配置
        const configs = response.data;
        const newConfig = { ...tencentCloudConfig };
        
        configs.forEach(config => {
          switch (config.key) {
            case 'tencent_cloud_secret_id':
              newConfig.secretId = config.value || '';
              break;
            case 'tencent_cloud_secret_key':
              newConfig.secretKey = config.value || '';
              break;
            case 'tencent_cloud_region':
              newConfig.region = config.value || 'ap-beijing';
              break;
            case 'tencent_cloud_bucket':
              newConfig.bucket = config.value || '';
              break;
            case 'tencent_cloud_domain':
              newConfig.domain = config.value || '';
              break;
          }
        });
        
        setTencentCloudConfig(newConfig);
      }
    } catch (error) {
      console.error('Error fetching system configs:', error);
    } finally {
      setConfigLoading(false);
    }
  };

  const handleSaveTencentCloudConfig = async () => {
    setConfigLoading(true);
    try {
      const configUpdates = [
        {
          key: 'tencent_cloud_secret_id',
          value: tencentCloudConfig.secretId,
          description: '腾讯云访问密钥ID',
          category: 'storage'
        },
        {
          key: 'tencent_cloud_secret_key',
          value: tencentCloudConfig.secretKey,
          description: '腾讯云访问密钥Key',
          category: 'storage'
        },
        {
          key: 'tencent_cloud_region',
          value: tencentCloudConfig.region,
          description: '腾讯云存储区域',
          category: 'storage'
        },
        {
          key: 'tencent_cloud_bucket',
          value: tencentCloudConfig.bucket,
          description: '腾讯云存储桶名称',
          category: 'storage'
        },
        {
          key: 'tencent_cloud_domain',
          value: tencentCloudConfig.domain,
          description: '腾讯云CDN域名',
          category: 'storage'
        }
      ];

      for (const config of configUpdates) {
        await adminApi.updateSystemConfig(config.key, {
          value: config.value,
          description: config.description,
          category: config.category
        });
      }

      toast({
        title: "成功",
        description: "腾讯云配置已保存",
      });
      
      fetchSystemConfigs(); // 刷新配置
    } catch (error) {
      toast({
        title: "错误",
        description: "保存腾讯云配置失败",
        variant: "destructive",
      });
    } finally {
      setConfigLoading(false);
    }
  };

  const fetchUserDetail = async (userId: string) => {
    setUserDetailLoading(true);
    try {
      const response = await adminApi.getUserDetail(userId);
      if (response.success && response.data) {
        setSelectedUser(response.data);
      } else {
        console.error('Failed to fetch user detail:', response.error);
      }
    } catch (error) {
      console.error('Error fetching user detail:', error);
    } finally {
      setUserDetailLoading(false);
    }
  };

  const handleEditUser = (user: UserStats) => {
    setEditingUser(user);
    setEditForm({
      username: user.username,
      email: user.email,
      isAdmin: user.isAdmin
    });
    setShowEditDialog(true);
  };

  const handleUpdateUser = async () => {
    if (!editingUser) return;
    
    try {
      const response = await adminApi.updateUser(editingUser._id, editForm);
      if (response.success) {
        toast({
          title: "成功",
          description: "用户信息已更新",
        });
        setShowEditDialog(false);
        fetchStats(); // 刷新数据
      } else {
        toast({
          title: "错误",
          description: response.error || "更新用户信息失败",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "错误",
        description: "更新用户信息失败",
        variant: "destructive",
      });
    }
  };

  const handleDeleteUser = async (userId: string, username: string) => {
    try {
      const response = await adminApi.deleteUser(userId);
      if (response.success) {
        toast({
          title: "成功",
          description: `用户 ${username} 已删除`,
        });
        fetchStats(); // 刷新数据
      } else {
        toast({
          title: "错误",
          description: response.error || "删除用户失败",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "错误",
        description: "删除用户失败",
        variant: "destructive",
      });
    }
  };

  const handleChangePassword = (userId: string) => {
    setPasswordForm({ userId, password: '', confirmPassword: '' });
    setShowPasswordDialog(true);
  };

  const handleUpdatePassword = async () => {
    if (passwordForm.password !== passwordForm.confirmPassword) {
      toast({
        title: "错误",
        description: "两次输入的密码不一致",
        variant: "destructive",
      });
      return;
    }
    
    if (passwordForm.password.length < 6) {
      toast({
        title: "错误",
        description: "密码长度至少为6位",
        variant: "destructive",
      });
      return;
    }
    
    try {
      const response = await adminApi.updateUserPassword(passwordForm.userId, passwordForm.password);
      if (response.success) {
        toast({
          title: "成功",
          description: "密码已更新",
        });
        setShowPasswordDialog(false);
        setPasswordForm({ userId: '', password: '', confirmPassword: '' });
      } else {
        toast({
          title: "错误",
          description: response.error || "更新密码失败",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "错误",
        description: "更新密码失败",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div>加载中...</div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div>无法加载管理员数据</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">管理员面板</h1>
        <Badge variant="default">管理员</Badge>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">用户数</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.summary.totalUsers}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">笔记数</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.summary.totalNotes}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">待办事项</CardTitle>
            <CheckSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.summary.totalTodos}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">日程安排</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.summary.totalSchedules}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">标签内容</CardTitle>
            <Tag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.summary.totalTagContents}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">总数据量</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.summary.totalItems}</div>
          </CardContent>
        </Card>
      </div>

      {/* 主要内容区域 */}
      <Tabs defaultValue="users" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="users">用户管理</TabsTrigger>
          <TabsTrigger value="config">系统配置</TabsTrigger>
        </TabsList>
        
        <TabsContent value="users" className="space-y-6">
          {/* 用户详情表格 */}
          <Card>
        <CardHeader>
          <CardTitle>用户数据统计</CardTitle>
          <CardDescription>
            查看每个用户的数据使用情况
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>用户名</TableHead>
                <TableHead>邮箱</TableHead>
                <TableHead>密码哈希</TableHead>
                <TableHead>管理员</TableHead>
                <TableHead>注册时间</TableHead>
                <TableHead>笔记</TableHead>
                <TableHead>待办</TableHead>
                <TableHead>日程</TableHead>
                <TableHead>标签</TableHead>
                <TableHead>总计</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stats.users.map((user) => (
                <TableRow key={user._id}>
                  <TableCell className="font-medium">{user.username}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell className="font-mono text-xs max-w-[200px] truncate" title={user.password}>
                    {user.password ? user.password.substring(0, 20) + '...' : '未设置'}
                  </TableCell>
                  <TableCell>
                    <Badge variant={user.isAdmin ? "default" : "secondary"}>
                      {user.isAdmin ? '是' : '否'}
                    </Badge>
                  </TableCell>
                  <TableCell>{new Date(user.createdAt).toLocaleDateString('zh-CN')}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{user.notesCount}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{user.todosCount}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{user.schedulesCount}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{user.tagContentsCount}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="default">{user.totalItems}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => fetchUserDetail(user._id)}
                          >
                            查看详情
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle>用户详情 - {user.username}</DialogTitle>
                            <DialogDescription>
                              查看用户的详细信息和最近数据
                            </DialogDescription>
                          </DialogHeader>
                          {userDetailLoading ? (
                            <div className="flex items-center justify-center p-8">
                              <div>加载中...</div>
                            </div>
                          ) : selectedUser ? (
                            <div className="space-y-6">
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <h4 className="font-semibold mb-2">基本信息</h4>
                                  <div className="space-y-1 text-sm">
                                    <p><strong>用户名:</strong> {selectedUser.user.username}</p>
                                    <p><strong>邮箱:</strong> {selectedUser.user.email}</p>
                                    <p><strong>注册时间:</strong> {new Date(selectedUser.user.createdAt).toLocaleString('zh-CN')}</p>
                                    <p><strong>主题:</strong> {selectedUser.user.preferences.theme}</p>
                                  </div>
                                </div>
                                <div>
                                  <h4 className="font-semibold mb-2">数据统计</h4>
                                  <div className="grid grid-cols-2 gap-2 text-sm">
                                    <div className="flex items-center space-x-2">
                                      <FileText className="h-4 w-4" />
                                      <span>笔记: {selectedUser.recentData.notes.length}</span>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                      <CheckSquare className="h-4 w-4" />
                                      <span>待办: {selectedUser.recentData.todos.length}</span>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                      <Calendar className="h-4 w-4" />
                                      <span>日程: {selectedUser.recentData.schedules.length}</span>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                      <Tag className="h-4 w-4" />
                                      <span>标签: {selectedUser.recentData.tagContents.length}</span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                              
                              <Tabs defaultValue="notes" className="w-full">
                                <TabsList className="grid w-full grid-cols-4">
                                  <TabsTrigger value="notes">最近笔记</TabsTrigger>
                                  <TabsTrigger value="todos">最近待办</TabsTrigger>
                                  <TabsTrigger value="schedules">最近日程</TabsTrigger>
                                  <TabsTrigger value="tags">最近标签</TabsTrigger>
                                </TabsList>
                                
                                <TabsContent value="notes" className="space-y-2">
                                  {selectedUser.recentData.notes.length > 0 ? (
                                    selectedUser.recentData.notes.map((note) => (
                                      <div key={note._id} className="p-3 border rounded-lg">
                                        <h5 className="font-medium">{note.title}</h5>
                                        <p className="text-sm text-muted-foreground mt-1">
                                          {note.content.substring(0, 100)}...
                                        </p>
                                        <p className="text-xs text-muted-foreground mt-2">
                                          创建时间: {new Date(note.createdAt).toLocaleString('zh-CN')}
                                        </p>
                                      </div>
                                    ))
                                  ) : (
                                    <p className="text-muted-foreground">暂无笔记数据</p>
                                  )}
                                </TabsContent>
                                
                                <TabsContent value="todos" className="space-y-2">
                                  {selectedUser.recentData.todos.length > 0 ? (
                                    selectedUser.recentData.todos.map((todo) => (
                                      <div key={todo._id} className="p-3 border rounded-lg">
                                        <div className="flex items-center space-x-2">
                                          <CheckSquare className={`h-4 w-4 ${todo.completed ? 'text-green-500' : 'text-gray-400'}`} />
                                          <span className={todo.completed ? 'line-through' : ''}>{todo.title}</span>
                                        </div>
                                        <p className="text-xs text-muted-foreground mt-2">
                                          创建时间: {new Date(todo.createdAt).toLocaleString('zh-CN')}
                                        </p>
                                      </div>
                                    ))
                                  ) : (
                                    <p className="text-muted-foreground">暂无待办数据</p>
                                  )}
                                </TabsContent>
                                
                                <TabsContent value="schedules" className="space-y-2">
                                  {selectedUser.recentData.schedules.length > 0 ? (
                                    selectedUser.recentData.schedules.map((schedule) => (
                                      <div key={schedule._id} className="p-3 border rounded-lg">
                                        <h5 className="font-medium">{schedule.title}</h5>
                                        <p className="text-sm text-muted-foreground mt-1">{schedule.description}</p>
                                        <p className="text-xs text-muted-foreground mt-2">
                                          时间: {new Date(schedule.date).toLocaleString('zh-CN')}
                                        </p>
                                      </div>
                                    ))
                                  ) : (
                                    <p className="text-muted-foreground">暂无日程数据</p>
                                  )}
                                </TabsContent>
                                
                                <TabsContent value="tags" className="space-y-2">
                                  {selectedUser.recentData.tagContents.length > 0 ? (
                                    selectedUser.recentData.tagContents.map((tag) => (
                                      <div key={tag._id} className="p-3 border rounded-lg">
                                        <div className="flex items-center space-x-2">
                                          <Badge variant="outline">{tag.tag}</Badge>
                                          <span className="font-medium">{tag.title}</span>
                                        </div>
                                        <p className="text-sm text-muted-foreground mt-1">
                                          {tag.content.substring(0, 100)}...
                                        </p>
                                        <p className="text-xs text-muted-foreground mt-2">
                                          创建时间: {new Date(tag.createdAt).toLocaleString('zh-CN')}
                                        </p>
                                      </div>
                                    ))
                                  ) : (
                                    <p className="text-muted-foreground">暂无标签数据</p>
                                  )}
                                </TabsContent>
                              </Tabs>
                            </div>
                          ) : (
                            <div>无法加载用户详情</div>
                          )}
                        </DialogContent>
                      </Dialog>
                      
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleEditUser(user)}
                      >
                        编辑
                      </Button>
                      
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleChangePassword(user._id)}
                      >
                        改密码
                      </Button>
                      
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button 
                            variant="destructive" 
                            size="sm"
                            disabled={user._id === currentUser?._id}
                          >
                            删除
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>确认删除用户</AlertDialogTitle>
                            <AlertDialogDescription>
                              您确定要删除用户 "{user.username}" 吗？此操作将永久删除该用户及其所有数据，且无法撤销。
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>取消</AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={() => handleDeleteUser(user._id, user.username)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              确认删除
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      {/* 编辑用户对话框 */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>编辑用户</DialogTitle>
            <DialogDescription>
              修改用户的基本信息和权限设置
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">用户名</Label>
              <Input
                id="username"
                value={editForm.username}
                onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
                placeholder="请输入用户名"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">邮箱</Label>
              <Input
                id="email"
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                placeholder="请输入邮箱"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="isAdmin"
                checked={editForm.isAdmin}
                onCheckedChange={(checked) => setEditForm({ ...editForm, isAdmin: checked })}
              />
              <Label htmlFor="isAdmin">管理员权限</Label>
            </div>
          </div>
          <div className="flex justify-end space-x-2 mt-6">
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              取消
            </Button>
            <Button onClick={handleUpdateUser}>
              保存
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* 修改密码对话框 */}
      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>修改密码</DialogTitle>
            <DialogDescription>
              为用户设置新的登录密码
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">新密码</Label>
              <Input
                id="password"
                type="password"
                value={passwordForm.password}
                onChange={(e) => setPasswordForm({ ...passwordForm, password: e.target.value })}
                placeholder="请输入新密码（至少6位）"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">确认密码</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={passwordForm.confirmPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                placeholder="请再次输入新密码"
              />
            </div>
          </div>
          <div className="flex justify-end space-x-2 mt-6">
            <Button variant="outline" onClick={() => setShowPasswordDialog(false)}>
              取消
            </Button>
            <Button onClick={handleUpdatePassword}>
              更新密码
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      
        </TabsContent>
        
        <TabsContent value="config" className="space-y-6">
          {/* 腾讯云配置 */}
          <Card>
            <CardHeader>
              <CardTitle>腾讯云存储配置</CardTitle>
              <CardDescription>
                配置腾讯云COS存储服务，用于笔记图片上传
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="secretId">Secret ID</Label>
                  <Input
                    id="secretId"
                    type="password"
                    value={tencentCloudConfig.secretId}
                    onChange={(e) => setTencentCloudConfig({ ...tencentCloudConfig, secretId: e.target.value })}
                    placeholder="请输入腾讯云Secret ID"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="secretKey">Secret Key</Label>
                  <Input
                    id="secretKey"
                    type="password"
                    value={tencentCloudConfig.secretKey}
                    onChange={(e) => setTencentCloudConfig({ ...tencentCloudConfig, secretKey: e.target.value })}
                    placeholder="请输入腾讯云Secret Key"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="region">存储区域</Label>
                  <Input
                    id="region"
                    value={tencentCloudConfig.region}
                    onChange={(e) => setTencentCloudConfig({ ...tencentCloudConfig, region: e.target.value })}
                    placeholder="例如：ap-beijing"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bucket">存储桶名称</Label>
                  <Input
                    id="bucket"
                    value={tencentCloudConfig.bucket}
                    onChange={(e) => setTencentCloudConfig({ ...tencentCloudConfig, bucket: e.target.value })}
                    placeholder="请输入存储桶名称"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="domain">CDN域名（可选）</Label>
                  <Input
                    id="domain"
                    value={tencentCloudConfig.domain}
                    onChange={(e) => setTencentCloudConfig({ ...tencentCloudConfig, domain: e.target.value })}
                    placeholder="例如：https://your-domain.com"
                  />
                </div>
              </div>
              
              <div className="flex justify-end space-x-2 pt-4">
                <Button 
                  variant="outline" 
                  onClick={fetchSystemConfigs}
                  disabled={configLoading}
                >
                  重置
                </Button>
                <Button 
                  onClick={handleSaveTencentCloudConfig}
                  disabled={configLoading}
                >
                  {configLoading ? '保存中...' : '保存配置'}
                </Button>
              </div>
            </CardContent>
          </Card>
          
          {/* 配置列表 */}
          <Card>
            <CardHeader>
              <CardTitle>当前配置</CardTitle>
              <CardDescription>
                查看所有系统配置项
              </CardDescription>
            </CardHeader>
            <CardContent>
              {configLoading ? (
                <div className="flex items-center justify-center p-8">
                  <div>加载中...</div>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>配置项</TableHead>
                      <TableHead>描述</TableHead>
                      <TableHead>值</TableHead>
                      <TableHead>更新时间</TableHead>
                      <TableHead>更新人</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {systemConfigs.map((config) => (
                      <TableRow key={config._id}>
                        <TableCell className="font-medium">{config.key}</TableCell>
                        <TableCell>{config.description}</TableCell>
                        <TableCell className="max-w-[200px] truncate">
                          {config.key.includes('secret') || config.key.includes('key') 
                            ? '••••••••' 
                            : String(config.value)
                          }
                        </TableCell>
                        <TableCell>{new Date(config.updatedAt).toLocaleString('zh-CN')}</TableCell>
                        <TableCell>{config.updatedBy?.username || '未知'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}