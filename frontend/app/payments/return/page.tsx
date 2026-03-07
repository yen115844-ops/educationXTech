'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

function ReturnContent() {
  const searchParams = useSearchParams();
  const resultCode = searchParams.get('resultCode');
  const orderId = searchParams.get('orderId');
  const message = searchParams.get('message') || '';
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const success = resultCode === '0' || resultCode === '9000';

  if (!mounted) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <Loader2 className="mx-auto h-12 w-12 animate-spin text-emerald-600 dark:text-emerald-400" />
        <p className="mt-4 text-zinc-600 dark:text-zinc-400">Đang xử lý kết quả...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16 text-center">
      {success ? (
        <>
          <CheckCircle className="mx-auto h-16 w-16 text-emerald-600 dark:text-emerald-400" aria-hidden />
          <h1 className="mt-6 text-xl font-bold text-zinc-900 dark:text-zinc-100">
            Thanh toán thành công
          </h1>
          <p className="mt-2 text-zinc-600 dark:text-zinc-400">
            Khóa học đã được kích hoạt. Bạn có thể vào học ngay.
          </p>
        </>
      ) : (
        <>
          <XCircle className="mx-auto h-16 w-16 text-red-500 dark:text-red-400" aria-hidden />
          <h1 className="mt-6 text-xl font-bold text-zinc-900 dark:text-zinc-100">
            Thanh toán chưa hoàn tất
          </h1>
          <p className="mt-2 text-zinc-600 dark:text-zinc-400">
            {message || 'Giao dịch bị hủy hoặc thất bại. Bạn có thể thử thanh toán lại.'}
          </p>
        </>
      )}
      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
        <Link
          href="/dashboard"
          className="rounded-lg bg-emerald-600 px-5 py-2.5 font-medium text-white hover:bg-emerald-700 dark:bg-emerald-500"
        >
          Khóa học của tôi
        </Link>
        <Link
          href="/courses"
          className="rounded-lg border border-zinc-300 px-5 py-2.5 font-medium dark:border-zinc-600"
        >
          Xem khóa học
        </Link>
      </div>
    </div>
  );
}

export default function PaymentReturnPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-md px-4 py-16 text-center">
          <Loader2 className="mx-auto h-12 w-12 animate-spin text-emerald-600" />
        </div>
      }
    >
      <ReturnContent />
    </Suspense>
  );
}
