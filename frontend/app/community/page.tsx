'use client';

import Pagination from '@/components/ui/Pagination';
import { useAuth } from '@/context/AuthContext';
import { apiGet } from '@/lib/api';
import { toMediaUrl } from '@/lib/media';
import type { Course, Post } from '@/types';
import { Search, User } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useMemo, useState } from 'react';

function formatDate(s: string) {
  return new Date(s).toLocaleDateString('vi-VN');
}

const TYPE_OPTIONS = [
  { value: '', label: 'Tất cả' },
  { value: 'question', label: 'Hỏi đáp' },
  { value: 'share', label: 'Chia sẻ' },
];

export default function CommunityPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-4xl px-3 py-6"><div className="space-y-4">{[1,2,3,4].map(i=><div key={i} className="h-28 animate-pulse rounded-xl bg-zinc-200 dark:bg-zinc-800"/>)}</div></div>}>
      <CommunityContent />
    </Suspense>
  );
}

function CommunityContent() {
  const searchParams = useSearchParams();
  const courseIdFromUrl = useMemo(() => searchParams.get('courseId') || '', [searchParams]);
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [type, setType] = useState('');
  const [courseId, setCourseId] = useState(courseIdFromUrl);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const limit = 15;

  useEffect(() => {
    setCourseId(courseIdFromUrl);
  }, [courseIdFromUrl]);

  useEffect(() => {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (search) params.set('search', search);
    if (type) params.set('type', type);
    if (courseId) params.set('courseId', courseId);
    apiGet<{ posts: Post[]; total: number }>(`/api/posts?${params}`).then((res) => {
      if (res.success && res.data) {
        setPosts(res.data.posts);
        setTotal(res.data.total);
      }
      setLoading(false);
    });
  }, [page, search, type, courseId]);

  useEffect(() => {
    apiGet<{ courses: Course[] }>('/api/courses?published=true&limit=50').then((res) => {
      if (res.success && res.data?.courses) setCourses(res.data.courses);
    });
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
  };

  const totalPages = Math.ceil(total / limit) || 1;

  return (
    <div className="mx-auto max-w-4xl px-3 py-6 sm:px-4 sm:py-8 md:py-10">
      <div className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-bold text-zinc-900 sm:text-2xl dark:text-zinc-100">Cộng đồng</h1>
        {user && (
          <Link
            href="/community/new"
            className="rounded-lg bg-emerald-600 px-4 py-2 font-medium text-white hover:bg-emerald-700 dark:bg-emerald-500 shrink-0"
          >
            Viết bài
          </Link>
        )}
      </div>

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center">
        <form onSubmit={handleSearch} className="flex min-w-0 flex-1 gap-2">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tiêu đề, nội dung..."
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
            value={type}
            onChange={(e) => (setType(e.target.value), setPage(1))}
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
          >
            {TYPE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <select
            value={courseId}
            onChange={(e) => (setCourseId(e.target.value), setPage(1))}
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 min-w-[180px]"
          >
            <option value="">Tất cả khóa học</option>
            {courses.map((c) => (
              <option key={c._id} value={c._id}>{c.title}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-xl bg-zinc-200 dark:bg-zinc-800" />
          ))}
        </div>
      ) : posts.length === 0 ? (
        <div className="rounded-xl border border-zinc-200 bg-white p-12 text-center dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-zinc-500 dark:text-zinc-400">Không tìm thấy bài viết nào.</p>
          {user && (
            <Link href="/community/new" className="mt-4 inline-block text-emerald-600 hover:underline">
              Viết bài đầu tiên
            </Link>
          )}
        </div>
      ) : (
        <>
          <p className="mb-4 text-sm text-zinc-500 dark:text-zinc-400">
            Tìm thấy {total} bài viết
          </p>
          <ul className="space-y-4">
            {posts.map((post) => {
              const author = typeof post.userId === 'object' ? post.userId : null;
              const course = typeof post.courseId === 'object' ? post.courseId : null;
              return (
                <li
                  key={post._id}
                  className="rounded-xl border border-zinc-200 bg-white p-4 transition-shadow hover:shadow dark:border-zinc-800 dark:bg-zinc-900"
                >
                  <Link href={`/community/${post._id}`}>
                    <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">
                      {post.title}
                    </h2>
                    <p className="mt-1 line-clamp-2 text-sm text-zinc-600 dark:text-zinc-400">
                      {post.content}
                    </p>
                    <div className="mt-2 flex items-center gap-3 text-xs text-zinc-500 dark:text-zinc-400">
                      {author && (
                        <span className="flex items-center gap-1.5">
                          <span className="flex h-5 w-5 shrink-0 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700">
                            {author.avatar ? (
                              <img src={toMediaUrl(author.avatar)} alt="" className="h-full w-full object-cover" />
                            ) : (
                              <span className="flex h-full w-full items-center justify-center"><User className="h-3 w-3 text-zinc-400" aria-hidden /></span>
                            )}
                          </span>
                          {author.name}
                        </span>
                      )}
                      {course && <span>· {course.title}</span>}
                      <span>{formatDate(post.createdAt)}</span>
                      <span className="rounded bg-zinc-100 px-1.5 py-0.5 dark:bg-zinc-800">
                        {post.type === 'question' ? 'Hỏi đáp' : 'Chia sẻ'}
                      </span>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
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
