'use client';

import { useState, useEffect, useRef } from 'react';
import { apiPatch, apiPost, apiUpload } from '@/lib/api';
import { toMediaUrl } from '@/lib/media';
import { useAuth } from '@/context/AuthContext';
import { Camera, User } from 'lucide-react';

export default function ProfilePage() {
  const { user, refreshUser, loading: authLoading } = useAuth();
  const [name, setName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  useEffect(() => {
    if (user?.name) setName(user.name);
    if (user?.avatar) setAvatarUrl(user.avatar);
    else setAvatarUrl(null);
  }, [user]);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    const res = await apiPatch<{ user: unknown }>('/api/users/profile', { name });
    setSaving(false);
    if (res.success) {
      setMessage('Đã cập nhật hồ sơ.');
      refreshUser();
    } else {
      setError(res.message || 'Cập nhật thất bại');
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    setUploadingAvatar(true);
    const formData = new FormData();
    formData.append('avatar', file);
    const res = await apiUpload<{ url: string }>('/api/upload/avatar', formData);
    setUploadingAvatar(false);
    e.target.value = '';
    if (res.success && res.data?.url) {
      setAvatarUrl(res.data.url);
      const patchRes = await apiPatch<{ user: unknown }>('/api/users/profile', { avatar: res.data.url });
      if (patchRes.success) {
        setMessage('Đã cập nhật ảnh đại diện.');
        refreshUser();
      } else {
        setError(patchRes.message || 'Cập nhật avatar thất bại');
      }
    } else {
      setError(res.message || 'Tải ảnh lên thất bại');
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (newPassword.length < 6) {
      setError('Mật khẩu mới tối thiểu 6 ký tự');
      return;
    }
    setSaving(true);
    const res = await apiPost<unknown>('/api/users/change-password', {
      currentPassword,
      newPassword,
    });
    setSaving(false);
    if (res.success) {
      setMessage('Đã đổi mật khẩu.');
      setCurrentPassword('');
      setNewPassword('');
    } else {
      setError(res.message || 'Đổi mật khẩu thất bại');
    }
  };

  if (authLoading || !user) {
    return (
      <div className="px-4 py-10 sm:px-6 lg:px-8">
        <div className="h-72 animate-pulse rounded-2xl bg-zinc-200/80 dark:bg-zinc-800/80" />
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-3.5rem)]">
      {/* Banner + avatar */}
      <div className="relative bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 px-4 pb-24 pt-8 dark:from-emerald-800 dark:via-emerald-900 dark:to-teal-950 sm:px-6 sm:pb-28 sm:pt-10 lg:px-8">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(255,255,255,0.15),transparent)] dark:bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(255,255,255,0.06),transparent)]" aria-hidden />
        <h1 className="relative text-2xl font-bold tracking-tight text-white sm:text-3xl">Hồ sơ</h1>
        <p className="relative mt-1 text-emerald-100/90 dark:text-emerald-200/80">Quản lý thông tin và bảo mật</p>
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2">
          <div className="relative">
            <div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-2xl border-4 border-white bg-zinc-100 shadow-xl dark:border-zinc-800 dark:bg-zinc-800">
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={toMediaUrl(avatarUrl)}
                  alt="Avatar"
                  className="h-full w-full object-cover"
                />
              ) : (
                <User className="h-14 w-14 text-zinc-400" aria-hidden />
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              className="sr-only"
              onChange={handleAvatarChange}
              disabled={uploadingAvatar}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingAvatar}
              className="absolute -bottom-1 -right-1 flex h-9 w-9 items-center justify-center rounded-full bg-white text-emerald-600 shadow-md ring-2 ring-emerald-600 hover:bg-emerald-50 disabled:opacity-50 dark:bg-zinc-800 dark:text-emerald-400 dark:ring-emerald-500 dark:hover:bg-zinc-700"
              title="Đổi ảnh đại diện"
            >
              <Camera className="h-4 w-4" aria-hidden />
            </button>
          </div>
        </div>
      </div>

      <div className="px-4 pb-12 pt-16 sm:px-6 sm:pt-20 lg:px-8">
        {message && (
          <div className="mb-6 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">
            {message}
          </div>
        )}
        {error && (
          <div className="mb-6 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950/50 dark:text-red-300">
            {error}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Thông tin cá nhân */}
          <div className="rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/80 sm:p-8">
            <h2 className="mb-6 flex items-center gap-2 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/50">
                <User className="h-4 w-4 text-emerald-600 dark:text-emerald-400" aria-hidden />
              </span>
              Thông tin cá nhân
            </h2>
            <form onSubmit={handleUpdateProfile} className="space-y-5">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-zinc-600 dark:text-zinc-400">Email</label>
                <p className="rounded-lg bg-zinc-50 px-4 py-2.5 text-zinc-700 dark:bg-zinc-800/80 dark:text-zinc-300">{user.email}</p>
              </div>
              <div>
                <label htmlFor="name" className="mb-1.5 block text-sm font-medium text-zinc-600 dark:text-zinc-400">Họ tên</label>
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 transition focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
                />
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {uploadingAvatar ? 'Đang tải ảnh lên...' : 'Ảnh đại diện: nhấn nút camera phía trên (JPEG, PNG, GIF, WebP, tối đa 2MB).'}
              </p>
              <button
                type="submit"
                disabled={saving}
                className="w-full rounded-xl bg-emerald-600 py-3 font-medium text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50 dark:bg-emerald-500 dark:hover:bg-emerald-600"
              >
                {saving ? 'Đang lưu...' : 'Cập nhật thông tin'}
              </button>
            </form>
          </div>

          {/* Đổi mật khẩu */}
          <div className="rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/80 sm:p-8">
            <h2 className="mb-6 text-lg font-semibold text-zinc-900 dark:text-zinc-100">Bảo mật</h2>
            <form onSubmit={handleChangePassword} className="space-y-5">
              <div>
                <label htmlFor="currentPassword" className="mb-1.5 block text-sm font-medium text-zinc-600 dark:text-zinc-400">Mật khẩu hiện tại</label>
                <input
                  id="currentPassword"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                  className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 transition focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
                />
              </div>
              <div>
                <label htmlFor="newPassword" className="mb-1.5 block text-sm font-medium text-zinc-600 dark:text-zinc-400">Mật khẩu mới (tối thiểu 6 ký tự)</label>
                <input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 transition focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
                />
              </div>
              <button
                type="submit"
                disabled={saving}
                className="w-full rounded-xl border-2 border-zinc-200 py-3 font-medium text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                {saving ? 'Đang xử lý...' : 'Đổi mật khẩu'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
