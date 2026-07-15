'use client';

import { useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { LogoMark } from '@/components/ui/logo-mark';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await api.post('/api/auth/forgot-password', { email });
      toast.success('If an account exists with that email, a reset link has been sent.');
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
          <h2 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>Reset your password</h2>
          <p className="text-sm mt-2" style={{ color: 'var(--text-secondary)' }}>We&apos;ll send you a reset link</p>
        </div>

        <div className="card p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input" placeholder="you@example.com" required />
            </div>

            <button type="submit" disabled={isLoading} className="btn btn-primary w-full" style={{ padding: '12px 20px' }}>
              {isLoading ? 'Sending...' : 'Send Reset Link'}
            </button>
          </form>

          <div className="mt-6 pt-6 text-center" style={{ borderTop: '1px solid var(--border-default)' }}>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              Remember your password?{' '}
              <Link href="/login" className="font-medium" style={{ color: 'var(--brand-primary)' }}>Sign in</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
