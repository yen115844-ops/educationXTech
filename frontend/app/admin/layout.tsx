'use client';

import { useAuth } from '@/context/AuthContext';
import {
    BookOpen,
    CreditCard,
    Home,
    LayoutDashboard,
    Menu,
    MessageSquare,
    Users,
    X,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

const allSidebarNav = [
  { href: '/admin', label: 'Tổng quan', icon: LayoutDashboard, roles: ['admin'] },
  { href: '/admin/users', label: 'Người dùng', icon: Users, roles: ['admin'] },
  { href: '/admin/courses', label: 'Khóa học', icon: BookOpen, roles: ['admin', 'instructor'] },
  { href: '/admin/payments', label: 'Thanh toán', icon: CreditCard, roles: ['admin'] },
  { href: '/admin/posts', label: 'Bài viết cộng đồng', icon: MessageSquare, roles: ['admin'] },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const isAllowed = user?.role === 'admin' || user?.role === 'instructor';

  useEffect(() => {
    if (loading) return;
    if (!isAllowed) {
      router.replace('/');
    }
    // Instructor khi vào /admin → redirect sang /admin/courses
    if (user?.role === 'instructor' && pathname === '/admin') {
      router.replace('/admin/courses');
    }
  }, [user, loading, router, isAllowed, pathname]);

  const sidebarNav = allSidebarNav.filter((item) => item.roles.includes(user?.role || ''));

  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  if (loading) {
    return (
      <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center">
        <div className="h-12 w-48 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
      </div>
    );
  }

  if (!isAllowed) {
    return null;
  }

  const SidebarContent = () => (
    <div className="flex h-full flex-col">
      <h2 className="mb-4 shrink-0 px-3 text-sm font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
        Quản trị
      </h2>
      <nav className="flex flex-1 flex-col gap-1 overflow-auto">
        {sidebarNav.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
              pathname === href
                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400'
                : 'text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800'
            }`}
          >
            <Icon className="h-5 w-5 shrink-0" aria-hidden />
            <span>{label}</span>
          </Link>
        ))}
      </nav>
      <div className="mt-auto shrink-0 border-t border-zinc-200 pt-4 dark:border-zinc-800">
        <Link
          href="/"
          className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
        >
          <Home className="h-5 w-5 shrink-0" aria-hidden />
          Về trang chủ
        </Link>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)]">
      {/* Desktop sidebar */}
      <aside className="hidden w-56 shrink-0 border-r border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 lg:block">
        <div className="sticky top-14 flex h-[calc(100vh-3.5rem)] flex-col p-4">
          <SidebarContent />
        </div>
      </aside>

      {/* Mobile: menu button + overlay drawer */}
      <div className="fixed left-0 top-14 z-40 lg:hidden">
        <button
          type="button"
          onClick={() => setSidebarOpen(true)}
          className="m-2 flex h-10 w-10 items-center justify-center rounded-lg bg-white shadow border border-zinc-200 text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800"
          aria-label="Mở menu"
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>
      {sidebarOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/50 lg:hidden"
            aria-hidden
            onClick={() => setSidebarOpen(false)}
          />
          <aside className="fixed left-0 top-14 z-50 flex h-[calc(100vh-3.5rem)] w-64 flex-col border-r border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900 lg:hidden">
            <div className="flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => setSidebarOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                aria-label="Đóng menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="min-h-0 flex-1 pt-2">
              <SidebarContent />
            </div>
          </aside>
        </>
      )}

      <div className="min-w-0 flex-1 bg-zinc-50/50 dark:bg-zinc-950/50 pl-0 lg:pl-0">
        <div className="p-4 sm:p-6 md:p-8 pt-14 lg:pt-6">{children}</div>
      </div>
    </div>
  );
}
