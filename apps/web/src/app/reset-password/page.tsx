'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { LogoMark } from '@/components/ui/logo-mark';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--surface-page)' }}>
        <div className="text-center">
          <h1 className="text-2xl font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Invalid Reset Link</h1>
          <p className="mb-4" style={{ color: 'var(--text-secondary)' }}>This password reset link is invalid or has expired.</p>
          <Link href="/forgot-password" className="font-medium" style={{ color: 'var(--brand-primary)' }}>Request a new link</Link>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    setIsLoading(true);
    try {
      await api.post('/api/auth/reset-password', { token, password });
      toast.success('Password reset successful! Redirecting to login...');
      setTimeout(() => router.push('/login'), 2000);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--surface-page)' }}>
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-3 mb-6">
            <LogoMark className="w-11 h-11" iconClassName="w-6 h-6" />
            <span className="text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>AgentLab</span>
          </Link>
          <h2 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>Set new password</h2>
        </div>

        <div className="card p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>New Password</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="input" minLength={8} required />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Confirm Password</label>
              <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="input" minLength={8} required />
            </div>

            <button type="submit" disabled={isLoading} className="btn btn-primary w-full" style={{ padding: '12px 20px' }}>
              {isLoading ? 'Resetting...' : 'Reset Password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--surface-page)', color: 'var(--text-primary)' }}>Loading...</div>}>
      <ResetPasswordForm />
    </Suspense>
  );
}
