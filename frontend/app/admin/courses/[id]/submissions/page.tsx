'use client';

import { apiGet } from '@/lib/api';
import type { Course, Exercise, Submission } from '@/types';
import {
    Award,
    ChevronLeft,
    FileText,
    Filter,
    TrendingUp,
    Users,
} from 'lucide-react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

interface PopulatedSubmission extends Omit<Submission, 'userId' | 'exerciseId'> {
  userId: { _id: string; name: string; email: string; avatar?: string };
  exerciseId: { _id: string; title: string; type: string };
}

export default function CourseSubmissionsPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const courseId = params.id as string;
  const [course, setCourse] = useState<Course | null>(null);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [submissions, setSubmissions] = useState<PopulatedSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterExerciseId, setFilterExerciseId] = useState<string>(searchParams.get('exercise') || '');

  useEffect(() => {
    if (!courseId) return;
    Promise.all([
      apiGet<{ course: Course }>(`/api/courses/${courseId}`),
      apiGet<{ exercises: Exercise[] }>(`/api/exercises/course/${courseId}`),
      apiGet<{ submissions: PopulatedSubmission[] }>(`/api/submissions/course/${courseId}/all`),
    ]).then(([cRes, eRes, sRes]) => {
      if (cRes.success && cRes.data?.course) setCourse(cRes.data.course);
      if (eRes.success && eRes.data?.exercises) setExercises(eRes.data.exercises);
      if (sRes.success && sRes.data?.submissions) setSubmissions(sRes.data.submissions);
      setLoading(false);
    });
  }, [courseId]);

  const filtered = useMemo(() => {
    if (!filterExerciseId) return submissions;
    return submissions.filter(
      (s) =>
        (typeof s.exerciseId === 'object' ? s.exerciseId._id : s.exerciseId) === filterExerciseId,
    );
  }, [submissions, filterExerciseId]);

  // Stats
  const stats = useMemo(() => {
    const uniqueStudents = new Set(filtered.map((s) => (typeof s.userId === 'object' ? s.userId._id : s.userId)));
    const avgScore = filtered.length > 0 ? Math.round(filtered.reduce((sum, s) => sum + s.percentage, 0) / filtered.length) : 0;
    const passCount = filtered.filter((s) => s.percentage >= 50).length;
    return {
      totalSubmissions: filtered.length,
      uniqueStudents: uniqueStudents.size,
      avgScore,
      passRate: filtered.length > 0 ? Math.round((passCount / filtered.length) * 100) : 0,
    };
  }, [filtered]);

  const scoreColor = (pct: number) => {
    if (pct >= 80) return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300';
    if (pct >= 50) return 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300';
    return 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300';
  };

  if (loading) {
    return (
      <div className="min-w-0">
        <div className="h-10 w-64 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
        <div className="mt-6 h-64 animate-pulse rounded-xl bg-zinc-200 dark:bg-zinc-800" />
      </div>
    );
  }

  return (
    <div className="min-w-0">
      {/* Breadcrumb */}
      <nav className="mb-4 flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
        <Link
          href="/admin/courses"
          className="inline-flex items-center gap-1 hover:text-emerald-600 dark:hover:text-emerald-400"
        >
          <ChevronLeft className="h-4 w-4" />
          Khóa học
        </Link>
        <span className="text-zinc-400">/</span>
        <Link
          href={`/admin/courses/${courseId}`}
          className="hover:text-emerald-600 dark:hover:text-emerald-400"
        >
          {course?.title || 'Nội dung'}
        </Link>
        <span className="text-zinc-400">/</span>
        <span className="text-zinc-700 dark:text-zinc-300">Bài nộp</span>
      </nav>

      <h1 className="mb-2 text-xl font-bold text-zinc-900 dark:text-zinc-100 sm:text-2xl">
        Danh sách bài nộp
      </h1>
      <p className="mb-6 text-sm text-zinc-600 dark:text-zinc-400">
        Xem và theo dõi kết quả làm bài của học viên.
      </p>

      {/* Stats */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
            <FileText className="h-4 w-4" />
            Tổng bài nộp
          </div>
          <p className="mt-1 text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            {stats.totalSubmissions}
          </p>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
            <Users className="h-4 w-4" />
            Học viên đã nộp
          </div>
          <p className="mt-1 text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            {stats.uniqueStudents}
          </p>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
            <Award className="h-4 w-4" />
            Điểm trung bình
          </div>
          <p className="mt-1 text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            {stats.avgScore}%
          </p>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
            <TrendingUp className="h-4 w-4" />
            Tỉ lệ đạt (≥50%)
          </div>
          <p className="mt-1 text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            {stats.passRate}%
          </p>
        </div>
      </div>

      {/* Filter */}
      <div className="mb-4 flex items-center gap-3">
        <Filter className="h-4 w-4 text-zinc-500" />
        <select
          value={filterExerciseId}
          onChange={(e) => setFilterExerciseId(e.target.value)}
          className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
        >
          <option value="">Tất cả bài tập ({submissions.length})</option>
          {exercises.map((ex) => {
            const count = submissions.filter(
              (s) => (typeof s.exerciseId === 'object' ? s.exerciseId._id : s.exerciseId) === ex._id,
            ).length;
            return (
              <option key={ex._id} value={ex._id}>
                {ex.title} ({count} bài nộp)
              </option>
            );
          })}
        </select>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        {filtered.length === 0 ? (
          <div className="p-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
            Chưa có bài nộp nào.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800/50">
                  <th className="px-3 py-3 font-medium sm:px-4">#</th>
                  <th className="px-3 py-3 font-medium sm:px-4">Học viên</th>
                  <th className="px-3 py-3 font-medium sm:px-4">Bài tập</th>
                  <th className="px-3 py-3 font-medium sm:px-4 text-center">Điểm</th>
                  <th className="px-3 py-3 font-medium sm:px-4 text-center">Phần trăm</th>
                  <th className="hidden px-3 py-3 font-medium sm:table-cell sm:px-4">Thời gian nộp</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((sub, idx) => {
                  const student =
                    typeof sub.userId === 'object'
                      ? sub.userId
                      : { _id: String(sub.userId), name: '—', email: '' };
                  const exercise =
                    typeof sub.exerciseId === 'object'
                      ? sub.exerciseId
                      : { _id: String(sub.exerciseId), title: '—', type: 'quiz' };
                  return (
                    <tr
                      key={sub._id}
                      className="border-b border-zinc-100 transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-800/50"
                    >
                      <td className="px-3 py-3 text-zinc-500 sm:px-4">{idx + 1}</td>
                      <td className="px-3 py-3 sm:px-4">
                        <div>
                          <p className="font-medium text-zinc-900 dark:text-zinc-100">
                            {student.name}
                          </p>
                          <p className="text-xs text-zinc-500 dark:text-zinc-400">
                            {student.email}
                          </p>
                        </div>
                      </td>
                      <td className="px-3 py-3 sm:px-4">
                        <p className="text-zinc-700 dark:text-zinc-300">{exercise.title}</p>
                        <span className="mt-0.5 inline-block rounded bg-zinc-100 px-1.5 py-0.5 text-xs text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                          {exercise.type === 'quiz' ? 'Trắc nghiệm' : exercise.type === 'coding' ? 'Lập trình' : 'Tự luận'}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-center font-medium sm:px-4">
                        {sub.score}/{sub.totalPoints}
                      </td>
                      <td className="px-3 py-3 text-center sm:px-4">
                        <span
                          className={`inline-block rounded-full px-2.5 py-1 text-xs font-semibold ${scoreColor(sub.percentage)}`}
                        >
                          {sub.percentage}%
                        </span>
                      </td>
                      <td className="hidden px-3 py-3 text-zinc-500 sm:table-cell sm:px-4">
                        {sub.submittedAt
                          ? new Date(sub.submittedAt).toLocaleString('vi-VN')
                          : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
