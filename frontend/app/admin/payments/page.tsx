'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiGet } from '@/lib/api';
import Pagination from '@/components/ui/Pagination';
import { Search } from 'lucide-react';
import type { Payment } from '@/types';

function formatDate(s: string | null | undefined) {
  if (s == null) return '—';
  return new Date(s).toLocaleDateString('vi-VN');
}
function formatMoney(n: number) {
  return new Intl.NumberFormat('vi-VN').format(n) + '₫';
}

const STATUS_LABEL: Record<string, string> = {
  pending: 'Chờ xử lý',
  completed: 'Thành công',
  failed: 'Thất bại',
  refunded: 'Hoàn tiền',
};

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchPayments = () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (status) params.set('status', status);
    apiGet<{ payments: Payment[]; total: number }>(`/api/payments/admin?${params}`).then((res) => {
      if (res.success && res.data) {
        setPayments(res.data.payments);
        setTotal(res.data.total);
      }
      setLoading(false);
    });
  };

  useEffect(() => {
    fetchPayments();
  }, [page, status]);

  const totalPages = Math.ceil(total / limit) || 1;

  return (
    <div className="min-w-0">
      <h1 className="mb-4 text-xl font-bold text-zinc-900 sm:mb-6 sm:text-2xl dark:text-zinc-100">
        Quản lý thanh toán
      </h1>

      <div className="mb-4 flex flex-wrap items-center gap-2 sm:mb-6 sm:gap-3">
        <select
          value={status}
          onChange={(e) => (setStatus(e.target.value), setPage(1))}
          className="rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
        >
          <option value="">Tất cả trạng thái</option>
          <option value="pending">Chờ xử lý</option>
          <option value="completed">Thành công</option>
          <option value="failed">Thất bại</option>
          <option value="refunded">Hoàn tiền</option>
        </select>
        <button
          type="button"
          onClick={() => fetchPayments()}
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-500"
          aria-label="Lọc"
          title="Lọc"
        >
          <Search className="h-4 w-4" />
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        {loading ? (
          <div className="flex h-48 items-center justify-center sm:h-64">
            <span className="text-zinc-500">Đang tải...</span>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[500px] text-left text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800/50">
                    <th className="px-3 py-2.5 font-medium sm:px-4 sm:py-3">Người dùng</th>
                    <th className="hidden px-3 py-2.5 font-medium sm:table-cell sm:px-4 sm:py-3">Khóa học</th>
                    <th className="px-3 py-2.5 font-medium sm:px-4 sm:py-3">Số tiền</th>
                    <th className="px-3 py-2.5 font-medium sm:px-4 sm:py-3">Trạng thái</th>
                    <th className="px-3 py-2.5 font-medium sm:px-4 sm:py-3">Ngày</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((p) => {
                    const user = typeof p.userId === 'object' ? p.userId : null;
                    const course = typeof p.courseId === 'object' ? p.courseId : null;
                    return (
                      <tr key={p._id} className="border-b border-zinc-100 dark:border-zinc-800">
                        <td className="px-3 py-2.5 sm:px-4 sm:py-3">
                          <span className="block font-medium">{user?.name ?? '—'}</span>
                          <span className="block truncate max-w-[140px] text-xs text-zinc-500 sm:max-w-none">{user?.email}</span>
                        </td>
                        <td className="hidden px-3 py-2.5 sm:table-cell sm:px-4 sm:py-3">
                          {course ? (
                            <Link href={`/courses/${course._id}`} className="text-emerald-600 hover:underline dark:text-emerald-400 line-clamp-1">
                              {course.title}
                            </Link>
                          ) : '—'}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2.5 text-xs sm:px-4 sm:py-3 sm:text-sm">{formatMoney(p.amount)}</td>
                        <td className="px-3 py-2.5 sm:px-4 sm:py-3">
                          <span
                            className={`inline-block rounded px-2 py-0.5 text-xs ${
                              p.status === 'completed'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300'
                                : p.status === 'failed'
                                  ? 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300'
                                  : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
                            }`}
                          >
                            {STATUS_LABEL[p.status] ?? p.status}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-3 py-2.5 text-zinc-500 dark:text-zinc-400 text-xs sm:px-4 sm:py-3 sm:text-sm">
                          {formatDate(p.paidAt ?? p.createdAt)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="border-t border-zinc-200 px-3 py-2.5 dark:border-zinc-700 sm:px-4 sm:py-3">
              <Pagination page={page} totalPages={totalPages} onPageChange={setPage} total={total} label="Tổng" />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
