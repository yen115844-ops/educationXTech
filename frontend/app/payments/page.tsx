'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiGet } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import type { Payment } from '@/types';

function formatDate(s: string | null | undefined) {
  if (s == null) return '—';
  return new Date(s).toLocaleDateString('vi-VN');
}

function formatMoney(n: number) {
  return new Intl.NumberFormat('vi-VN').format(n) + '₫';
}

export default function PaymentsPage() {
  const { user, loading: authLoading } = useAuth();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    apiGet<{ payments: Payment[] }>('/api/payments').then((res) => {
      if (res.success && res.data?.payments) setPayments(res.data.payments);
      setLoading(false);
    });
  }, [user]);

  if (authLoading || !user) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10">
        <div className="h-12 w-48 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="mb-8 text-2xl font-bold text-zinc-900 dark:text-zinc-100">
        Lịch sử thanh toán
      </h1>
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl bg-zinc-200 dark:bg-zinc-800" />
          ))}
        </div>
      ) : payments.length === 0 ? (
        <div className="rounded-xl border border-zinc-200 bg-white p-12 text-center dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-zinc-500 dark:text-zinc-400">Chưa có giao dịch nào.</p>
          <Link href="/courses" className="mt-4 inline-block text-emerald-600 hover:underline">
            Xem khóa học
          </Link>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800/50">
                <th className="px-4 py-3 font-medium text-zinc-700 dark:text-zinc-300">Khóa học</th>
                <th className="px-4 py-3 font-medium text-zinc-700 dark:text-zinc-300">Số tiền</th>
                <th className="px-4 py-3 font-medium text-zinc-700 dark:text-zinc-300">Trạng thái</th>
                <th className="px-4 py-3 font-medium text-zinc-700 dark:text-zinc-300">Ngày</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => {
                const course = typeof p.courseId === 'object' ? p.courseId : null;
                return (
                  <tr key={p._id} className="border-b border-zinc-100 dark:border-zinc-800">
                    <td className="px-4 py-3">
                      {course ? (
                        <Link
                          href={`/courses/${course._id}`}
                          className="font-medium text-emerald-600 hover:underline dark:text-emerald-400"
                        >
                          {course.title}
                        </Link>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-4 py-3">{formatMoney(p.amount)}</td>
                    <td className="px-4 py-3">
                      <span
                        className={
                          p.status === 'completed'
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : p.status === 'failed'
                              ? 'text-red-600 dark:text-red-400'
                              : 'text-zinc-500'
                        }
                      >
                        {p.status === 'completed'
                          ? 'Thành công'
                          : p.status === 'pending'
                            ? 'Chờ xử lý'
                            : p.status === 'failed'
                              ? 'Thất bại'
                              : p.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-zinc-500 dark:text-zinc-400">
                      {formatDate(p.paidAt ?? p.createdAt)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
