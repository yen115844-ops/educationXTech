'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiGet } from '@/lib/api';
import CourseCard from '@/components/CourseCard';
import {
  ChevronRight,
  BookOpen,
  Award,
  MessageSquare,
  PlayCircle,
  Zap,
} from 'lucide-react';
import type { Course } from '@/types';

const FEATURES = [
  {
    icon: BookOpen,
    title: 'Khóa học đa dạng',
    description: 'Nội dung từ cơ bản đến nâng cao, cập nhật liên tục theo xu hướng công nghệ.',
  },
  {
    icon: PlayCircle,
    title: 'Học mọi lúc mọi nơi',
    description: 'Video bài giảng và tài liệu trực tuyến, học theo tốc độ của riêng bạn.',
  },
  {
    icon: MessageSquare,
    title: 'Cộng đồng hỗ trợ',
    description: 'Trao đổi với giảng viên và học viên, giải đáp thắc mắc nhanh chóng.',
  },
  {
    icon: Award,
    title: 'Theo dõi tiến độ',
    description: 'Hệ thống theo dõi bài học đã hoàn thành và gợi ý bước tiếp theo.',
  },
];

const STEPS = [
  { step: 1, title: 'Đăng ký tài khoản', desc: 'Tạo tài khoản miễn phí trong vài phút.' },
  { step: 2, title: 'Chọn khóa học', desc: 'Duyệt danh sách khóa và chọn khóa phù hợp.' },
  { step: 3, title: 'Học và thực hành', desc: 'Xem bài giảng, làm bài tập và ghi chú.' },
  { step: 4, title: 'Hoàn thành khóa học', desc: 'Theo dõi tiến độ và nhận chứng nhận.' },
];

export default function HomePage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet<{ courses: Course[] }>('/api/courses?published=true&limit=8')
      .then((res) => {
        if (res.success && res.data?.courses) setCourses(res.data.courses);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="mx-auto max-w-6xl px-3 py-6 sm:px-4 sm:py-8 md:py-10">
      {/* Hero */}
      <section className="mb-16 text-center sm:mb-20">
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-4xl md:text-5xl">
          Học tập trực tuyến
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-base text-zinc-600 dark:text-zinc-400 sm:text-lg">
          Khóa học công nghệ, bài giảng, bài tập và cộng đồng hỗ trợ. Bắt đầu ngay hôm nay.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3 sm:gap-4">
          <Link
            href="/courses"
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 font-medium text-white hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600 sm:px-6 sm:py-3"
          >
            Xem khóa học
            <ChevronRight className="h-4 w-4 shrink-0" aria-hidden />
          </Link>
          <Link
            href="/register"
            className="inline-flex items-center gap-2 rounded-lg border border-zinc-300 px-5 py-2.5 font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800 sm:px-6 sm:py-3"
          >
            Đăng ký miễn phí
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="mb-16 sm:mb-20">
        <h2 className="mb-8 text-center text-2xl font-bold text-zinc-900 dark:text-zinc-100 sm:text-3xl">
          Vì sao chọn X-Tech?
        </h2>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map(({ icon: Icon, title, description }) => (
            <div
              key={title}
              className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900"
            >
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-950/50">
                <Icon className="h-6 w-6 text-emerald-600 dark:text-emerald-400" aria-hidden />
              </div>
              <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">{title}</h3>
              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">{description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Steps */}
      <section className="mb-16 rounded-2xl border border-zinc-200 bg-zinc-50/50 p-6 dark:border-zinc-800 dark:bg-zinc-900/50 sm:mb-20 sm:p-8">
        <h2 className="mb-8 text-center text-2xl font-bold text-zinc-900 dark:text-zinc-100 sm:text-3xl">
          Bắt đầu học trong 4 bước
        </h2>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map(({ step, title, desc }) => (
            <div key={step} className="relative">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-sm font-bold text-white dark:bg-emerald-500">
                {step}
              </div>
              <h3 className="mt-3 font-semibold text-zinc-900 dark:text-zinc-100">{title}</h3>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{desc}</p>
              {step < 4 && (
                <div className="absolute -right-3 top-5 hidden text-zinc-300 dark:text-zinc-600 lg:block">
                  <ChevronRight className="h-6 w-6" aria-hidden />
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Featured courses */}
      <section>
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            Khóa học nổi bật
          </h2>
          <Link
            href="/courses"
            className="inline-flex items-center gap-1 text-sm font-medium text-emerald-600 hover:underline dark:text-emerald-400"
          >
            Xem tất cả
            <ChevronRight className="h-4 w-4 shrink-0" aria-hidden />
          </Link>
        </div>
        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-64 animate-pulse rounded-xl bg-zinc-200 dark:bg-zinc-800"
              />
            ))}
          </div>
        ) : courses.length === 0 ? (
          <div className="rounded-2xl border border-zinc-200 bg-white p-12 text-center dark:border-zinc-800 dark:bg-zinc-900">
            <Zap className="mx-auto h-12 w-12 text-zinc-400 dark:text-zinc-500" aria-hidden />
            <p className="mt-4 text-zinc-500 dark:text-zinc-400">Chưa có khóa học nào.</p>
            <Link href="/courses" className="mt-4 inline-block text-emerald-600 hover:underline dark:text-emerald-400">
              Khám phá khóa học
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-4">
            {courses.map((course) => (
              <CourseCard key={course._id} course={course} />
            ))}
          </div>
        )}
        <div className="mt-8 text-center">
          <Link
            href="/courses"
            className="inline-flex items-center gap-1 font-medium text-emerald-600 hover:underline dark:text-emerald-400"
          >
            Xem tất cả khóa học
            <ChevronRight className="h-4 w-4 shrink-0" aria-hidden />
          </Link>
        </div>
      </section>
    </div>
  );
}
