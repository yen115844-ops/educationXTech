'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiGet, apiDelete } from '@/lib/api';
import IconButton from '@/components/ui/IconButton';
import Pagination from '@/components/ui/Pagination';
import { Search, Trash2 } from 'lucide-react';
import type { Post } from '@/types';

function formatDate(s: string) {
  return new Date(s).toLocaleDateString('vi-VN');
}

export default function AdminPostsPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [type, setType] = useState('');
  const [courseId, setCourseId] = useState('');
  const [courses, setCourses] = useState<{ _id: string; title: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchPosts = () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (type) params.set('type', type);
    if (courseId) params.set('courseId', courseId);
    apiGet<{ posts: Post[]; total: number }>(`/api/posts?${params}`).then((res) => {
      if (res.success && res.data) {
        setPosts(res.data.posts);
        setTotal(res.data.total);
      }
      setLoading(false);
    });
  };

  useEffect(() => {
    fetchPosts();
  }, [page, type, courseId]);

  useEffect(() => {
    apiGet<{ courses: { _id: string; title: string }[] }>('/api/courses?limit=100').then((res) => {
      if (res.success && res.data?.courses) setCourses(res.data.courses);
    });
  }, []);

  const totalPages = Math.ceil(total / limit) || 1;

  const handleDelete = async (id: string) => {
    if (!confirm('Xóa bài viết này?')) return;
    setDeletingId(id);
    const res = await apiDelete(`/api/posts/${id}`);
    setDeletingId(null);
    if (res.success) {
      setPosts((prev) => prev.filter((p) => p._id !== id));
      setTotal((t) => Math.max(0, t - 1));
    }
  };

  return (
    <div className="min-w-0">
      <h1 className="mb-4 text-xl font-bold text-zinc-900 sm:mb-6 sm:text-2xl dark:text-zinc-100">
        Quản lý bài viết cộng đồng
      </h1>

      <div className="mb-4 flex flex-wrap items-center gap-2 sm:mb-6 sm:gap-3">
        <select
          value={type}
          onChange={(e) => (setType(e.target.value), setPage(1))}
          className="rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
        >
          <option value="">Tất cả loại</option>
          <option value="question">Hỏi đáp</option>
          <option value="share">Chia sẻ</option>
        </select>
        <select
          value={courseId}
          onChange={(e) => (setCourseId(e.target.value), setPage(1))}
          className="min-w-0 flex-1 rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 sm:min-w-[180px] sm:flex-none"
        >
          <option value="">Tất cả khóa học</option>
          {courses.map((c) => (
            <option key={c._id} value={c._id}>{c.title}</option>
          ))}
        </select>
        <IconButton
          icon={<Search className="h-4 w-4" />}
          label="Lọc"
          variant="primary"
          onClick={() => fetchPosts()}
          className="bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600"
        />
      </div>

      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        {loading ? (
          <div className="flex h-48 items-center justify-center sm:h-64">
            <span className="text-zinc-500">Đang tải...</span>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[480px] text-left text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800/50">
                    <th className="px-3 py-2.5 font-medium sm:px-4 sm:py-3">Tiêu đề</th>
                    <th className="hidden px-3 py-2.5 font-medium md:table-cell sm:px-4 sm:py-3">Tác giả</th>
                    <th className="hidden px-3 py-2.5 font-medium sm:table-cell sm:px-4 sm:py-3">Khóa</th>
                    <th className="px-3 py-2.5 font-medium sm:px-4 sm:py-3">Loại</th>
                    <th className="px-3 py-2.5 font-medium sm:px-4 sm:py-3">Ngày</th>
                    <th className="w-16 px-3 py-2.5 font-medium sm:px-4 sm:py-3">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {posts.map((post) => {
                    const author = typeof post.userId === 'object' ? post.userId : null;
                    const course = typeof post.courseId === 'object' ? post.courseId : null;
                    return (
                      <tr key={post._id} className="border-b border-zinc-100 dark:border-zinc-800">
                        <td className="px-3 py-2.5 sm:px-4 sm:py-3">
                          <Link
                            href={`/community/${post._id}`}
                            className="font-medium text-emerald-600 hover:underline dark:text-emerald-400 line-clamp-1 max-w-[160px] sm:max-w-[220px]"
                          >
                            {post.title}
                          </Link>
                        </td>
                        <td className="hidden px-3 py-2.5 md:table-cell sm:px-4 sm:py-3">{author?.name ?? '—'}</td>
                        <td className="hidden px-3 py-2.5 text-zinc-500 sm:table-cell sm:px-4 sm:py-3">{course?.title ?? '—'}</td>
                        <td className="px-3 py-2.5 sm:px-4 sm:py-3">
                          <span className="rounded bg-zinc-100 px-2 py-0.5 text-xs dark:bg-zinc-800">
                            {post.type === 'question' ? 'Hỏi đáp' : 'Chia sẻ'}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-3 py-2.5 text-xs text-zinc-500 dark:text-zinc-400 sm:px-4 sm:py-3">
                          {formatDate(post.createdAt)}
                        </td>
                        <td className="px-3 py-2.5 sm:px-4 sm:py-3">
                          <IconButton
                            icon={<Trash2 className="h-4 w-4" />}
                            label="Xóa"
                            variant="danger"
                            onClick={() => handleDelete(post._id)}
                            disabled={deletingId === post._id}
                          />
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
