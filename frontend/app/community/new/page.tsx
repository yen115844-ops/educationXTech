'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { apiGet, apiPost } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import type { Course } from '@/types';

export default function NewPostPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [courseId, setCourseId] = useState('');
  const [type, setType] = useState<'question' | 'share'>('question');
  const [courses, setCourses] = useState<Course[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    apiGet<{ courses: Course[] }>('/api/courses?published=true&limit=100').then((res) => {
      if (res.success && res.data?.courses) setCourses(res.data.courses);
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
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
    const res = await apiPost<{ post: { _id: string } }>('/api/posts', {
      title: t,
      content: c,
      type,
      courseId: courseId.trim() || undefined,
    });
    setLoading(false);
    if (res.success && res.data?.post) {
      router.push(`/community/${res.data.post._id}`);
      router.refresh();
    } else {
      setError(res.message || 'Đăng bài thất bại');
    }
  };

  if (!user) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10 text-center">
        <p className="text-zinc-600 dark:text-zinc-400">Vui lòng đăng nhập để viết bài.</p>
        <Link href="/login" className="mt-4 inline-block text-emerald-600 hover:underline">
          Đăng nhập
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <Link href="/community" className="mb-6 inline-block text-sm text-emerald-600 hover:underline dark:text-emerald-400">
        ← Cộng đồng
      </Link>
      <h1 className="mb-8 text-2xl font-bold text-zinc-900 dark:text-zinc-100">Viết bài</h1>
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
              <input
                type="radio"
                name="type"
                checked={type === 'question'}
                onChange={() => setType('question')}
                className="text-emerald-600 focus:ring-emerald-500"
              />
              <span className="text-sm">Hỏi đáp</span>
            </label>
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="radio"
                name="type"
                checked={type === 'share'}
                onChange={() => setType('share')}
                className="text-emerald-600 focus:ring-emerald-500"
              />
              <span className="text-sm">Chia sẻ</span>
            </label>
          </div>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            Hỏi đáp: đặt câu hỏi về bài học, bài tập. Chia sẻ: chia sẻ kinh nghiệm, tài liệu.
          </p>
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
              <option key={c._id} value={c._id}>
                {c.title}
              </option>
            ))}
          </select>
          {courses.length === 0 && (
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">Chưa có khóa học nào được công bố.</p>
          )}
        </div>
        <div>
          <label htmlFor="content" className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Nội dung <span className="text-red-500">*</span>
          </label>
          <textarea
            id="content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Viết nội dung chi tiết: mô tả vấn đề, câu hỏi hoặc nội dung chia sẻ..."
            rows={8}
            className="w-full rounded-lg border border-zinc-300 px-4 py-2 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
          />
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">Nội dung rõ ràng giúp mọi người hỗ trợ bạn tốt hơn.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-emerald-600 px-5 py-2.5 font-medium text-white hover:bg-emerald-700 disabled:opacity-50 dark:bg-emerald-500"
          >
            {loading ? 'Đang đăng...' : 'Đăng bài'}
          </button>
          <Link
            href="/community"
            className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium dark:border-zinc-600"
          >
            Hủy
          </Link>
        </div>
      </form>
    </div>
  );
}
