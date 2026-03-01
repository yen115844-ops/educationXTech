'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiGet } from '@/lib/api';
import {
  Users,
  BookOpen,
  CreditCard,
  MessageSquare,
  GraduationCap,
  ChevronRight,
  DollarSign,
  TrendingUp,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface Stats {
  users: number;
  courses: number;
  payments: number;
  posts: number;
  enrollments: number;
  paymentsCompleted: number;
  coursesPublished: number;
  revenueCompleted?: number;
}

interface ChartData {
  usersByDay: { date: string; count: number }[];
  paymentsByDay: { date: string; count: number; amount: number }[];
  enrollmentsByDay: { date: string; count: number }[];
  userRoles: { role: string; count: number }[];
  paymentStatus: { status: string; count: number }[];
  topCoursesByEnrollments: { title: string; count: number }[];
}

const ROLE_LABELS: Record<string, string> = {
  admin: 'Quản trị',
  instructor: 'Giảng viên',
  student: 'Học viên',
};

const STATUS_LABELS: Record<string, string> = {
  pending: 'Chờ xử lý',
  completed: 'Thành công',
  failed: 'Thất bại',
  refunded: 'Hoàn tiền',
};

const CHART_COLORS = ['#059669', '#2563eb', '#d97706', '#dc2626', '#7c3aed'];

function fillMissingDays(
  days: number,
  data: { date: string; [k: string]: unknown }[],
  keys: string[],
  fillValue = 0
): { date: string; amount?: number }[] {
  const map = new Map(data.map((d) => [d.date, { ...d }]));
  const result: { date: string; amount?: number }[] = [];
  const today = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    const row = map.get(dateStr) || { date: dateStr };
    const entry: { date: string; amount?: number } = { date: dateStr };
    for (const k of keys) {
      (entry as unknown as Record<string, number>)[k] = Number((row as Record<string, unknown>)[k]) || fillValue;
    }
    result.push(entry);
  }
  return result;
}

function formatVND(n: number) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n);
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [chartData, setChartData] = useState<ChartData | null>(null);
  const [loading, setLoading] = useState(true);
  const [chartsLoading, setChartsLoading] = useState(true);

  useEffect(() => {
    apiGet<Stats>('/api/admin/stats').then((res) => {
      if (res.success && res.data) setStats(res.data);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    apiGet<ChartData>('/api/admin/charts').then((res) => {
      if (res.success && res.data) setChartData(res.data);
      setChartsLoading(false);
    });
  }, []);

  const statCards = [
    {
      label: 'Người dùng',
      value: stats?.users ?? 0,
      href: '/admin/users',
      icon: Users,
      color: 'emerald',
    },
    {
      label: 'Khóa học',
      value: stats?.courses ?? 0,
      sub: `${stats?.coursesPublished ?? 0} đã công bố`,
      href: '/admin/courses',
      icon: BookOpen,
      color: 'blue',
    },
    {
      label: 'Thanh toán',
      value: stats?.payments ?? 0,
      sub: `${stats?.paymentsCompleted ?? 0} thành công`,
      href: '/admin/payments',
      icon: CreditCard,
      color: 'amber',
    },
    {
      label: 'Doanh thu',
      value: stats?.revenueCompleted != null ? formatVND(stats.revenueCompleted) : '—',
      href: '/admin/payments',
      icon: DollarSign,
      color: 'green',
    },
    {
      label: 'Bài viết',
      value: stats?.posts ?? 0,
      href: '/admin/posts',
      icon: MessageSquare,
      color: 'violet',
    },
    {
      label: 'Đăng ký khóa',
      value: stats?.enrollments ?? 0,
      icon: GraduationCap,
      color: 'sky',
    },
  ];

  const activityData =
    chartData &&
    (() => {
      const usersMap = new Map(chartData.usersByDay.map((x) => [x.date, x.count]));
      const payMap = new Map(chartData.paymentsByDay.map((x) => [x.date, x.count]));
      const enrollMap = new Map(chartData.enrollmentsByDay.map((x) => [x.date, x.count]));
      const result: { date: string; users: number; payments: number; enrollments: number }[] = [];
      const today = new Date();
      for (let i = 29; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().slice(0, 10);
        result.push({
          date: dateStr.slice(5),
          users: usersMap.get(dateStr) ?? 0,
          payments: payMap.get(dateStr) ?? 0,
          enrollments: enrollMap.get(dateStr) ?? 0,
        });
      }
      return result;
    })();

  const revenueData =
    chartData &&
    fillMissingDays(30, chartData.paymentsByDay, ['amount']).map((d) => ({
      ...d,
      date: d.date.slice(5),
    }));

  const rolePieData =
    chartData?.userRoles.map((r) => ({
      name: ROLE_LABELS[r.role] || r.role,
      value: r.count,
    })) ?? [];

  const statusPieData =
    chartData?.paymentStatus.map((s) => ({
      name: STATUS_LABELS[s.status] || s.status,
      value: s.count,
    })) ?? [];

  if (loading) {
    return (
      <div className="min-w-0 space-y-6">
        <div className="h-8 w-48 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-xl bg-zinc-200 dark:bg-zinc-800" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-w-0 space-y-8">
      <h1 className="text-xl font-bold text-zinc-900 sm:text-2xl dark:text-zinc-100">
        Tổng quan
      </h1>

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3 xl:grid-cols-6">
        {statCards.map((c) => {
          const Icon = c.icon;
          return (
            <div
              key={c.label}
              className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:p-5"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">{c.label}</p>
                  <p className="mt-1 text-xl font-bold text-zinc-900 dark:text-zinc-100 sm:text-2xl">
                    {c.value}
                  </p>
                  {c.sub && (
                    <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">{c.sub}</p>
                  )}
                  {c.href && (
                    <Link
                      href={c.href}
                      className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-emerald-600 hover:underline dark:text-emerald-400"
                    >
                      Chi tiết
                      <ChevronRight className="h-3.5 w-3.5 shrink-0" aria-hidden />
                    </Link>
                  )}
                </div>
                <div className="rounded-lg bg-zinc-100 p-2 dark:bg-zinc-800">
                  <Icon className="h-5 w-5 text-zinc-500 dark:text-zinc-400 sm:h-6 sm:w-6" aria-hidden />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts */}
      {chartsLoading ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="h-80 animate-pulse rounded-xl bg-zinc-200 dark:bg-zinc-800" />
          <div className="h-80 animate-pulse rounded-xl bg-zinc-200 dark:bg-zinc-800" />
        </div>
      ) : (
        <>
          {/* Activity over time (users, payments, enrollments) */}
          <section className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900 sm:p-6">
            <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-zinc-900 dark:text-zinc-100">
              <TrendingUp className="h-5 w-5 text-emerald-600 dark:text-emerald-400" aria-hidden />
              Hoạt động 30 ngày qua
            </h2>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={activityData ?? []} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-zinc-200 dark:stroke-zinc-700" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11 }}
                    className="text-zinc-500 dark:text-zinc-400"
                  />
                  <YAxis tick={{ fontSize: 11 }} className="text-zinc-500 dark:text-zinc-400" />
                  <Tooltip
                    contentStyle={{
                      borderRadius: '8px',
                      border: '1px solid var(--border)',
                    }}
                    labelStyle={{ color: 'var(--text)' }}
                  />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="users"
                    name="Người dùng mới"
                    stackId="1"
                    stroke="#059669"
                    fill="#059669"
                    fillOpacity={0.5}
                  />
                  <Area
                    type="monotone"
                    dataKey="enrollments"
                    name="Đăng ký khóa"
                    stackId="1"
                    stroke="#2563eb"
                    fill="#2563eb"
                    fillOpacity={0.5}
                  />
                  <Area
                    type="monotone"
                    dataKey="payments"
                    name="Thanh toán"
                    stackId="1"
                    stroke="#d97706"
                    fill="#d97706"
                    fillOpacity={0.5}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </section>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Revenue by day */}
            <section className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900 sm:p-6">
              <h2 className="mb-4 text-base font-semibold text-zinc-900 dark:text-zinc-100">
                Doanh thu theo ngày
              </h2>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={revenueData ?? []} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-zinc-200 dark:stroke-zinc-700" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 10 }}
                      className="text-zinc-500 dark:text-zinc-400"
                    />
                    <YAxis
                      tick={{ fontSize: 10 }}
                      tickFormatter={(v) => (v >= 1e6 ? `${v / 1e6}M` : `${v / 1e3}k`)}
                      className="text-zinc-500 dark:text-zinc-400"
                    />
                    <Tooltip
                      formatter={(v: number | undefined) => (v != null ? formatVND(v) : '')}
                      contentStyle={{
                        borderRadius: '8px',
                        border: '1px solid var(--border)',
                      }}
                    />
                    <Bar dataKey="amount" name="Doanh thu" fill="#059669" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>

            {/* User roles pie */}
            <section className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900 sm:p-6">
              <h2 className="mb-4 text-base font-semibold text-zinc-900 dark:text-zinc-100">
                Phân loại người dùng
              </h2>
              <div className="h-64 w-full">
                {rolePieData.length === 0 ? (
                  <div className="flex h-64 items-center justify-center text-sm text-zinc-500 dark:text-zinc-400">
                    Chưa có dữ liệu
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={rolePieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={2}
                        dataKey="value"
                        nameKey="name"
                        label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                      >
                        {rolePieData.map((_, i) => (
                          <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v: number | undefined) => [v ?? 0, 'Số lượng']} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </section>

            {/* Payment status pie */}
            <section className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900 sm:p-6">
              <h2 className="mb-4 text-base font-semibold text-zinc-900 dark:text-zinc-100">
                Trạng thái thanh toán
              </h2>
              <div className="h-64 w-full">
                {statusPieData.length === 0 ? (
                  <div className="flex h-64 items-center justify-center text-sm text-zinc-500 dark:text-zinc-400">
                    Chưa có dữ liệu
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={statusPieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={2}
                        dataKey="value"
                        nameKey="name"
                        label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                      >
                        {statusPieData.map((_, i) => (
                          <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v: number | undefined) => [v ?? 0, 'Số giao dịch']} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </section>

            {/* Top courses by enrollments */}
            <section className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900 sm:p-6">
              <h2 className="mb-4 text-base font-semibold text-zinc-900 dark:text-zinc-100">
                Top khóa học theo số đăng ký
              </h2>
              <div className="h-64 w-full">
                {!chartData?.topCoursesByEnrollments?.length ? (
                  <div className="flex h-64 items-center justify-center text-sm text-zinc-500 dark:text-zinc-400">
                    Chưa có dữ liệu
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={chartData.topCoursesByEnrollments}
                      layout="vertical"
                      margin={{ top: 4, right: 8, left: 0, bottom: 4 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" className="stroke-zinc-200 dark:stroke-zinc-700" />
                      <XAxis type="number" tick={{ fontSize: 10 }} />
                      <YAxis
                        type="category"
                        dataKey="title"
                        width={120}
                        tick={{ fontSize: 10 }}
                        tickFormatter={(v) => (v.length > 18 ? v.slice(0, 18) + '…' : v)}
                      />
                      <Tooltip
                        contentStyle={{
                          borderRadius: '8px',
                          border: '1px solid var(--border)',
                        }}
                      />
                      <Bar dataKey="count" name="Đăng ký" fill="#2563eb" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </section>
          </div>
        </>
      )}
    </div>
  );
}
