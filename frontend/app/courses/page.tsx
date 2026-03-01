'use client';

import { useEffect, useState } from 'react';
import { apiGet } from '@/lib/api';
import CourseCard from '@/components/CourseCard';
import Pagination from '@/components/ui/Pagination';
import { Search } from 'lucide-react';
import type { Course } from '@/types';

const SORT_OPTIONS = [
  { value: '', label: 'Mới nhất' },
  { value: 'price_asc', label: 'Giá thấp → cao' },
  { value: 'price_desc', label: 'Giá cao → thấp' },
];

const PRICE_OPTIONS = [
  { value: '', label: 'Tất cả giá' },
  { value: 'free', label: 'Miễn phí' },
  { value: 'paid', label: 'Có phí' },
];

export default function CoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [price, setPrice] = useState('');
  const [sort, setSort] = useState('');
  const [loading, setLoading] = useState(true);
  const limit = 12;

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit),
      published: 'true',
    });
    if (search) params.set('search', search);
    if (price) params.set('price', price);
    if (sort) params.set('sort', sort);
    apiGet<{ courses: Course[]; total: number }>(`/api/courses?${params}`)
      .then((res) => {
        if (res.success && res.data) {
          setCourses(res.data.courses);
          setTotal(res.data.total);
        }
      })
      .finally(() => setLoading(false));
  }, [page, search, price, sort]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
  };

  const totalPages = Math.ceil(total / limit) || 1;

  return (
    <div className="mx-auto max-w-6xl px-3 py-6 sm:px-4 sm:py-8 md:py-10">
      <h1 className="mb-6 text-2xl font-bold text-zinc-900 sm:mb-8 sm:text-3xl dark:text-zinc-100">
        Khóa học
      </h1>

      <div className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:flex-wrap sm:items-center">
        <form onSubmit={handleSearch} className="flex min-w-0 flex-1 gap-2">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm khóa học..."
            className="min-w-0 flex-1 rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 sm:px-4"
          />
          <button
            type="submit"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-500 sm:h-10 sm:w-auto sm:px-4"
            aria-label="Tìm kiếm"
            title="Tìm kiếm"
          >
            <Search className="h-4 w-4 shrink-0" />
            <span className="ml-1 hidden sm:inline">Tìm</span>
          </button>
        </form>
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={price}
            onChange={(e) => (setPrice(e.target.value), setPage(1))}
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
          >
            {PRICE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <select
            value={sort}
            onChange={(e) => (setSort(e.target.value), setPage(1))}
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="h-72 animate-pulse rounded-xl bg-zinc-200 dark:bg-zinc-800"
            />
          ))}
        </div>
      ) : courses.length === 0 ? (
        <p className="text-zinc-500 dark:text-zinc-400">Không tìm thấy khóa học nào.</p>
      ) : (
        <>
          <p className="mb-4 text-sm text-zinc-500 dark:text-zinc-400">
            Tìm thấy {total} khóa học
          </p>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {courses.map((course) => (
              <CourseCard key={course._id} course={course} />
            ))}
          </div>
          {totalPages > 1 && (
            <div className="mt-6 sm:mt-8">
              <Pagination
                page={page}
                totalPages={totalPages}
                onPageChange={setPage}
                total={total}
                label="Tìm thấy"
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
