'use client';

import { apiPost } from '@/lib/api';
import Link from 'next/link';
import { useState } from 'react';

type Step = 'email' | 'code' | 'reset' | 'done';

export default function ForgotPasswordPage() {
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  // Bước 1: Gửi email
  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);
    const res = await apiPost<null>('/api/auth/forgot-password', { email });
    setLoading(false);
    if (res.success) {
      setMessage(res.message || 'Mã xác nhận đã được gửi đến email của bạn.');
      setStep('code');
    } else {
      setError(res.message || 'Có lỗi xảy ra');
    }
  };

  // Bước 2: Xác minh mã OTP
  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);
    const res = await apiPost<{ resetToken: string }>('/api/auth/verify-reset-code', { email, code });
    setLoading(false);
    if (res.success && res.data?.resetToken) {
      setResetToken(res.data.resetToken);
      setMessage('Mã xác nhận hợp lệ. Vui lòng nhập mật khẩu mới.');
      setStep('reset');
    } else {
      setError(res.message || 'Mã xác nhận không đúng');
    }
  };

  // Bước 3: Đặt lại mật khẩu
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    if (newPassword.length < 6) {
      setError('Mật khẩu mới tối thiểu 6 ký tự');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Mật khẩu xác nhận không khớp');
      return;
    }
    setLoading(true);
    const res = await apiPost<null>('/api/auth/reset-password', { resetToken, newPassword });
    setLoading(false);
    if (res.success) {
      setStep('done');
    } else {
      setError(res.message || 'Đặt lại mật khẩu thất bại');
    }
  };

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <h1 className="mb-6 text-2xl font-bold text-zinc-900 dark:text-zinc-100">Quên mật khẩu</h1>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950/50 dark:text-red-300">
          {error}
        </div>
      )}
      {message && (
        <div className="mb-4 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">
          {message}
        </div>
      )}

      {/* Bước 1: Nhập email */}
      {step === 'email' && (
        <form onSubmit={handleSendCode} className="space-y-4">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Nhập email đã đăng ký. Chúng tôi sẽ gửi mã xác nhận 6 chữ số để đặt lại mật khẩu.
          </p>
          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-lg border border-zinc-300 px-4 py-2 text-zinc-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
              placeholder="you@example.com"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-emerald-600 py-2.5 font-medium text-white transition-colors hover:bg-emerald-700 disabled:opacity-50 dark:bg-emerald-500 dark:hover:bg-emerald-600"
          >
            {loading ? 'Đang gửi...' : 'Gửi mã xác nhận'}
          </button>
        </form>
      )}

      {/* Bước 2: Nhập mã OTP */}
      {step === 'code' && (
        <form onSubmit={handleVerifyCode} className="space-y-4">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Nhập mã 6 chữ số đã gửi đến <strong>{email}</strong>
          </p>
          <div>
            <label htmlFor="code" className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Mã xác nhận
            </label>
            <input
              id="code"
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              required
              maxLength={6}
              className="w-full rounded-lg border border-zinc-300 px-4 py-2 text-center text-2xl font-bold tracking-[0.5em] text-zinc-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
              placeholder="000000"
            />
          </div>
          <button
            type="submit"
            disabled={loading || code.length !== 6}
            className="w-full rounded-lg bg-emerald-600 py-2.5 font-medium text-white transition-colors hover:bg-emerald-700 disabled:opacity-50 dark:bg-emerald-500 dark:hover:bg-emerald-600"
          >
            {loading ? 'Đang xác minh...' : 'Xác nhận'}
          </button>
          <button
            type="button"
            onClick={() => { setStep('email'); setError(''); setMessage(''); }}
            className="w-full text-center text-sm text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
          >
            Gửi lại mã / Đổi email
          </button>
        </form>
      )}

      {/* Bước 3: Nhập mật khẩu mới */}
      {step === 'reset' && (
        <form onSubmit={handleResetPassword} className="space-y-4">
          <div>
            <label htmlFor="newPassword" className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Mật khẩu mới (tối thiểu 6 ký tự)
            </label>
            <input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={6}
              className="w-full rounded-lg border border-zinc-300 px-4 py-2 text-zinc-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
            />
          </div>
          <div>
            <label htmlFor="confirmPassword" className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Xác nhận mật khẩu mới
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={6}
              className="w-full rounded-lg border border-zinc-300 px-4 py-2 text-zinc-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-emerald-600 py-2.5 font-medium text-white transition-colors hover:bg-emerald-700 disabled:opacity-50 dark:bg-emerald-500 dark:hover:bg-emerald-600"
          >
            {loading ? 'Đang xử lý...' : 'Đặt lại mật khẩu'}
          </button>
        </form>
      )}

      {/* Bước 4: Hoàn tất */}
      {step === 'done' && (
        <div className="space-y-4 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/50">
            <svg className="h-8 w-8 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="text-zinc-700 dark:text-zinc-300">
            Đặt lại mật khẩu thành công! Bạn có thể đăng nhập bằng mật khẩu mới.
          </p>
          <Link
            href="/login"
            className="inline-block w-full rounded-lg bg-emerald-600 py-2.5 font-medium text-white transition-colors hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600"
          >
            Đăng nhập
          </Link>
        </div>
      )}

      {step !== 'done' && (
        <p className="mt-4 text-center text-sm text-zinc-600 dark:text-zinc-400">
          Nhớ mật khẩu rồi?{' '}
          <Link href="/login" className="font-medium text-emerald-600 hover:underline dark:text-emerald-400">
            Đăng nhập
          </Link>
        </p>
      )}
    </div>
  );
}
