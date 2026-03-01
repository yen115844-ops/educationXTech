'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiGet, apiPatch } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import type { Post, Course } from '@/types';

export default function EditPostPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [courseId, setCourseId] = useState('');
  const [type, setType] = useState<'question' | 'share'>('question');
  const [courses, setCourses] = useState<Course[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      apiGet<{ post: Post }>(`/api/posts/${id}`),
      apiGet<{ courses: Course[] }>('/api/courses?published=true&limit=100'),
    ]).then(([pRes, cRes]) => {
      if (pRes.success && pRes.data?.post) {
        const post = pRes.data.post;
        const authorId = typeof post.userId === 'object' ? post.userId?._id : post.userId;
        if (user?._id !== authorId) {
          setForbidden(true);
        } else {
          setTitle(post.title);
          setContent(post.content);
          setType(post.type ?? 'question');
          const cid = post.courseId == null ? '' : typeof post.courseId === 'object' && post.courseId && '_id' in post.courseId ? (post.courseId as { _id: string })._id : String(post.courseId);
          setCourseId(cid || '');
        }
      }
      if (cRes.success && cRes.data?.courses) setCourses(cRes.data.courses);
      setFetchLoading(false);
    });
  }, [id, user?._id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const t = title.trim();
    const c = content.trim();
    if (!t) {
      setError('Vui lòng nhập tiêu đề.');
      return;
    }
    if (!c) {
      setError('Vui lòng nhập nội dung.');
      return;
    }
    setError('');
    setLoading(true);
    const res = await apiPatch<{ post: Post }>(`/api/posts/${id}`, {
      title: t,
      content: c,
      type,
      courseId: courseId.trim() || null,
    });
    setLoading(false);
    if (res.success) {
      router.push(`/community/${id}`);
      router.refresh();
    } else {
      setError(res.message || 'Lưu thất bại');
    }
  };

  if (!user) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10 text-center">
        <p className="text-zinc-600 dark:text-zinc-400">Vui lòng đăng nhập để sửa bài.</p>
        <Link href="/login" className="mt-4 inline-block text-emerald-600 hover:underline">
          Đăng nhập
        </Link>
      </div>
    );
  }

  if (fetchLoading) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10">
        <div className="h-64 animate-pulse rounded-xl bg-zinc-200 dark:bg-zinc-800" />
      </div>
    );
  }

  if (forbidden) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10 text-center">
        <p className="text-zinc-600 dark:text-zinc-400">Bạn không có quyền sửa bài viết này.</p>
        <Link href={`/community/${id}`} className="mt-4 inline-block text-emerald-600 hover:underline">
          Xem bài viết
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <Link href={`/community/${id}`} className="mb-6 inline-block text-sm text-emerald-600 hover:underline dark:text-emerald-400">
        ← Quay lại bài viết
      </Link>
      <h1 className="mb-8 text-2xl font-bold text-zinc-900 dark:text-zinc-100">Sửa bài viết</h1>
      {error && (
        <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950/50 dark:text-red-300">
          {error}
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="title" className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Tiêu đề <span className="text-red-500">*</span>
          </label>
          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ví dụ: Cách debug lỗi async trong JavaScript?"
            maxLength={200}
            className="w-full rounded-lg border border-zinc-300 px-4 py-2 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
          />
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{title.length}/200 ký tự</p>
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Loại bài viết <span className="text-red-500">*</span>
          </label>
          <div className="flex gap-6">
            <label className="flex cursor-pointer items-center gap-2">
              <input type="radio" name="type" checked={type === 'question'} onChange={() => setType('question')} className="text-emerald-600 focus:ring-emerald-500" />
              <span className="text-sm">Hỏi đáp</span>
            </label>
            <label className="flex cursor-pointer items-center gap-2">
              <input type="radio" name="type" checked={type === 'share'} onChange={() => setType('share')} className="text-emerald-600 focus:ring-emerald-500" />
              <span className="text-sm">Chia sẻ</span>
            </label>
          </div>
        </div>
        <div>
          <label htmlFor="courseId" className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Gắn với khóa học (tùy chọn)
          </label>
          <select
            id="courseId"
            value={courseId}
            onChange={(e) => setCourseId(e.target.value)}
            className="w-full rounded-lg border border-zinc-300 px-4 py-2 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
          >
            <option value="">— Không chọn —</option>
            {courses.map((c) => (
              <option key={c._id} value={c._id}>{c.title}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="content" className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Nội dung <span className="text-red-500">*</span>
          </label>
          <textarea
            id="content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Viết nội dung chi tiết..."
            rows={8}
            className="w-full rounded-lg border border-zinc-300 px-4 py-2 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
          />
        </div>
        <div className="flex flex-wrap items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-emerald-600 px-5 py-2.5 font-medium text-white hover:bg-emerald-700 disabled:opacity-50 dark:bg-emerald-500"
          >
            {loading ? 'Đang lưu...' : 'Lưu thay đổi'}
          </button>
          <Link href={`/community/${id}`} className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium dark:border-zinc-600">
            Hủy
          </Link>
        </div>
      </form>
    </div>
  );
}
