'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/lib/auth-context';
import { Eye, EyeOff, Loader2, Check, X } from 'lucide-react';

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const { register } = useAuth();
  const router = useRouter();

  // 密码强度验证
  const passwordValidation = {
    length: formData.password.length >= 6,
    match: formData.password === formData.confirmPassword && formData.confirmPassword !== '',
  };

  const isFormValid = 
    formData.username.length >= 3 &&
    formData.email.includes('@') &&
    passwordValidation.length &&
    passwordValidation.match;

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError(''); // 清除错误信息
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const result = await register(formData.username, formData.email, formData.password);
      
      if (result.success) {
        router.push('/');
      } else {
        setError(result.error || '注册失败，请重试');
      }
    } catch (error) {
      setError('注册失败，请检查网络连接');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">注册账户</CardTitle>
          <CardDescription className="text-center">
            创建您的笔记账户，开始记录美好生活
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="username">用户名</Label>
              <Input
                id="username"
                type="text"
                placeholder="输入用户名（至少3个字符）"
                value={formData.username}
                onChange={(e) => handleInputChange('username', e.target.value)}
                required
                disabled={isLoading}
                minLength={3}
              />
              {formData.username && (
                <div className="flex items-center text-sm">
                  {formData.username.length >= 3 ? (
                    <><Check className="h-3 w-3 text-green-500 mr-1" />用户名长度符合要求</>
                  ) : (
                    <><X className="h-3 w-3 text-red-500 mr-1" />用户名至少需要3个字符</>
                  )}
                </div>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email">邮箱</Label>
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">密码</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="输入密码（至少6个字符）"
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  required
                  disabled={isLoading}
                  className="pr-10"
                  minLength={6}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isLoading}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
              {formData.password && (
                <div className="flex items-center text-sm">
                  {passwordValidation.length ? (
                    <><Check className="h-3 w-3 text-green-500 mr-1" />密码长度符合要求</>
                  ) : (
                    <><X className="h-3 w-3 text-red-500 mr-1" />密码至少需要6个字符</>
                  )}
                </div>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">确认密码</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="再次输入密码"
                  value={formData.confirmPassword}
                  onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                  required
                  disabled={isLoading}
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  disabled={isLoading}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
              {formData.confirmPassword && (
                <div className="flex items-center text-sm">
                  {passwordValidation.match ? (
                    <><Check className="h-3 w-3 text-green-500 mr-1" />密码匹配</>
                  ) : (
                    <><X className="h-3 w-3 text-red-500 mr-1" />密码不匹配</>
                  )}
                </div>
              )}
            </div>
            
            <Button 
              type="submit" 
              className="w-full" 
              disabled={isLoading || !isFormValid}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  注册中...
                </>
              ) : (
                '注册账户'
              )}
            </Button>
          </form>
          
          <div className="mt-6 text-center text-sm">
            <span className="text-muted-foreground">已有账户？</span>
            <Link 
              href="/login" 
              className="ml-1 text-primary hover:underline font-medium"
            >
              立即登录
            </Link>
          </div>
          
          <div className="mt-4 text-center">
            <Link 
              href="/" 
              className="text-sm text-muted-foreground hover:text-primary"
            >
              返回首页
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}