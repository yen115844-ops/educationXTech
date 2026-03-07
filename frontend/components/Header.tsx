'use client';

import ThemeToggle from '@/components/ThemeToggle';
import { useAuth } from '@/context/AuthContext';
import { toMediaUrl } from '@/lib/media';
import { ChevronDown, CreditCard, GraduationCap, LayoutDashboard, LogOut, Menu, User, X } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

const nav = [
  { href: '/', label: 'Trang chủ' },
  { href: '/courses', label: 'Khóa học' },
  { href: '/community', label: 'Cộng đồng' },
  { href: '/chatbot', label: 'Chatbot' },
];

export default function Header() {
  const pathname = usePathname();
  const { user, logout, loading } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-zinc-200 bg-white/95 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/95">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-2 px-3 sm:px-4">
        <Link href="/" className="shrink-0 text-xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
          X-Tech
        </Link>

        <nav className="hidden items-center gap-5 md:flex">
          {nav.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={`text-sm font-medium transition-colors ${
                pathname === href
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100'
              }`}
            >
              {label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <ThemeToggle />

          {loading ? (
            <span className="text-xs text-zinc-500 sm:text-sm">Đang tải...</span>
          ) : user ? (
            <div className="relative">
              <button
                type="button"
                onClick={() => setUserMenuOpen((o) => !o)}
                className="flex h-10 shrink-0 items-center gap-1.5 rounded-lg border border-zinc-200 px-2.5 text-sm font-medium text-zinc-700 dark:border-zinc-700 dark:text-zinc-300 sm:gap-2 sm:px-3"
              >
                {user.avatar ? (
                  <img
                    src={toMediaUrl(user.avatar)}
                    alt=""
                    className="h-6 w-6 shrink-0 rounded-full object-cover sm:h-7 sm:w-7"
                  />
                ) : (
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-zinc-200 dark:bg-zinc-700 sm:h-7 sm:w-7">
                    <User className="h-3.5 w-3.5 text-zinc-500 sm:h-4 sm:w-4" aria-hidden />
                  </span>
                )}
                <span className="max-w-[80px] truncate sm:max-w-[120px]">{user.name}</span>
                <ChevronDown className="h-4 w-4 shrink-0 text-zinc-400" aria-hidden />
              </button>
              {userMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    aria-hidden
                    onClick={() => setUserMenuOpen(false)}
                  />
                  <div className="absolute right-0 top-full z-20 mt-1.5 w-48 rounded-lg border border-zinc-200 bg-white py-1 shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
                    <Link
                      href="/dashboard"
                      className="flex items-center gap-2 px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                      onClick={() => setUserMenuOpen(false)}
                    >
                      <GraduationCap className="h-4 w-4 shrink-0" aria-hidden />
                      Khóa học của tôi
                    </Link>
                    <Link
                      href="/profile"
                      className="flex items-center gap-2 px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                      onClick={() => setUserMenuOpen(false)}
                    >
                      <User className="h-4 w-4 shrink-0" aria-hidden />
                      Hồ sơ
                    </Link>
                    <Link
                      href="/payments"
                      className="flex items-center gap-2 px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                      onClick={() => setUserMenuOpen(false)}
                    >
                      <CreditCard className="h-4 w-4 shrink-0" aria-hidden />
                      Thanh toán
                    </Link>
                    {(user.role === 'admin' || user.role === 'instructor') && (
                      <Link
                        href={user.role === 'instructor' ? '/admin/courses' : '/admin'}
                        className="flex items-center gap-2 px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                        onClick={() => setUserMenuOpen(false)}
                      >
                        <LayoutDashboard className="h-4 w-4 shrink-0" aria-hidden />
                        {user.role === 'admin' ? 'Quản trị' : 'Quản lý khóa học'}
                      </Link>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        logout();
                        setUserMenuOpen(false);
                      }}
                      className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/50"
                    >
                      <LogOut className="h-4 w-4 shrink-0" aria-hidden />
                      Đăng xuất
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <>
              <Link
                href="/login"
                className="flex h-10 items-center rounded-lg border border-zinc-200 px-3 text-sm font-medium text-zinc-700 dark:border-zinc-700 dark:text-zinc-300"
              >
                Đăng nhập
              </Link>
              <Link
                href="/register"
                className="flex h-10 items-center rounded-lg bg-emerald-600 px-3 text-sm font-medium text-white hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600"
              >
                Đăng ký
              </Link>
            </>
          )}

          <button
            type="button"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800 md:hidden"
            onClick={() => setMenuOpen((o) => !o)}
            aria-label={menuOpen ? 'Đóng menu' : 'Mở menu'}
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>
      {menuOpen && (
        <div className="border-t border-zinc-200 px-4 py-3 md:hidden dark:border-zinc-800">
          {nav.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="block py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300"
              onClick={() => setMenuOpen(false)}
            >
              {label}
            </Link>
          ))}
        </div>
      )}
    </header>
  );
}
