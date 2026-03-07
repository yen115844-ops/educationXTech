'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiGet } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import CourseCard from '@/components/CourseCard';
import { BookOpen, GraduationCap, TrendingUp } from 'lucide-react';
import type { Course } from '@/types';
import type { Enrollment } from '@/types';

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [taughtCourses, setTaughtCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const promises: Promise<unknown>[] = [
      apiGet<{ enrollments: Enrollment[] }>('/api/enrollments').then((res) => {
        if (res.success && res.data?.enrollments) setEnrollments(res.data.enrollments);
      }),
    ];
    if (user.role === 'instructor' || user.role === 'admin') {
      promises.push(
        apiGet<{ courses: Course[] }>('/api/courses/my').then((res) => {
          if (res.success && res.data?.courses) setTaughtCourses(res.data.courses);
        })
      );
    }
    Promise.all(promises).finally(() => setLoading(false));
  }, [user]);

  const enrolledCourses = enrollments
    .map((e) => e.courseId)
    .filter((c): c is Course => typeof c === 'object' && c !== null);
  const progressByCourse = Object.fromEntries(
    enrollments.map((e) => {
      const id = typeof e.courseId === 'object' && e.courseId ? e.courseId._id : (e.courseId as string);
      return [id, e.progress];
    })
  );
  const onlyTaught = taughtCourses.filter(
    (c) => !enrolledCourses.some((ec) => ec._id === c._id)
  );
  const avgProgress =
    enrolledCourses.length > 0
      ? Math.round(
          enrolledCourses.reduce((sum, c) => sum + (progressByCourse[c._id] ?? 0), 0) / enrolledCourses.length
        )
      : 0;

  if (authLoading) {
    return (
      <div className="w-full px-4 py-10 sm:px-6 lg:px-8">
        <div className="h-12 w-48 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="w-full px-4 py-10 text-center sm:px-6 lg:px-8">
        <p className="text-zinc-600 dark:text-zinc-400">Vui lòng đăng nhập để xem khóa học của bạn.</p>
        <Link href="/login" className="mt-4 inline-block text-emerald-600 hover:underline">
          Đăng nhập
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full px-4 py-6 sm:px-6 sm:py-8 lg:px-8 md:py-10">
      <h1 className="mb-2 text-xl font-bold text-zinc-900 sm:text-2xl dark:text-zinc-100">
        Tổng quan
      </h1>
      <p className="mb-6 text-sm text-zinc-600 sm:mb-8 sm:text-base dark:text-zinc-400">
        Xin chào {user.name}. Khóa học bạn đang học và tiến độ của bạn.
      </p>

      {/* Stats */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900 sm:p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-950/50">
              <BookOpen className="h-5 w-5 text-emerald-600 dark:text-emerald-400" aria-hidden />
            </div>
            <div>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">Khóa đã đăng ký</p>
              <p className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
                {enrolledCourses.length}
              </p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900 sm:p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-950/50">
              <TrendingUp className="h-5 w-5 text-blue-600 dark:text-blue-400" aria-hidden />
            </div>
            <div>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">Tiến độ trung bình</p>
              <p className="text-xl font-bold text-zinc-900 dark:text-zinc-100">{avgProgress}%</p>
            </div>
          </div>
        </div>
        {(user.role === 'instructor' || user.role === 'admin') && (
          <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900 sm:p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-950/50">
                <GraduationCap className="h-5 w-5 text-amber-600 dark:text-amber-400" aria-hidden />
              </div>
              <div>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">Khóa đang giảng dạy</p>
                <p className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
                  {taughtCourses.length}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-72 animate-pulse rounded-xl bg-zinc-200 dark:bg-zinc-800" />
          ))}
        </div>
      ) : enrolledCourses.length === 0 && onlyTaught.length === 0 ? (
        <div className="rounded-xl border border-zinc-200 bg-white p-12 text-center dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-zinc-500 dark:text-zinc-400">Bạn chưa có khóa học nào.</p>
          <Link
            href="/courses"
            className="mt-4 inline-block rounded-lg bg-emerald-600 px-4 py-2 font-medium text-white hover:bg-emerald-700 dark:bg-emerald-500"
          >
            Xem khóa học
          </Link>
        </div>
      ) : (
        <>
          {enrolledCourses.length > 0 && (
            <section className="mb-10">
              <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                Khóa học đã đăng ký
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
                {enrolledCourses.map((course) => (
                  <CourseCard
                    key={course._id}
                    course={course}
                    progress={progressByCourse[course._id]}
                  />
                ))}
              </div>
            </section>
          )}
          {onlyTaught.length > 0 && (
            <section>
              <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                Khóa tôi giảng dạy
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
                {onlyTaught.map((course) => (
                  <CourseCard
                    key={course._id}
                    course={course}
                    badge="Giảng dạy"
                  />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
