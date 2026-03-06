import { toMediaUrl } from '@/lib/media';
import type { Course } from '@/types';
import { BookOpen } from 'lucide-react';
import Link from 'next/link';

function formatPrice(n: number) {
  if (n === 0) return 'Miễn phí';
  return new Intl.NumberFormat('vi-VN').format(n) + '₫';
}

export default function CourseCard({
  course,
  progress,
  badge,
}: {
  course: Course;
  progress?: number;
  badge?: string;
}) {
  const instructor = typeof course.instructorId === 'object' ? course.instructorId : null;
  return (
    <Link
      href={`/courses/${course._id}`}
      className="block overflow-hidden rounded-xl border border-zinc-200 bg-white transition-shadow hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900"
    >
      <div className="relative aspect-video bg-zinc-200 dark:bg-zinc-800">
        {badge && (
          <span className="absolute right-2 top-2 rounded bg-emerald-600 px-2 py-0.5 text-xs font-medium text-white dark:bg-emerald-500">
            {badge}
          </span>
        )}
        {course.thumbnail ? (
          <img
            src={toMediaUrl(course.thumbnail)}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-zinc-400 dark:text-zinc-500">
            <BookOpen className="h-14 w-14 sm:h-16 sm:w-16" aria-hidden />
          </div>
        )}
      </div>
      <div className="p-3 sm:p-4">
        <h3 className="font-semibold text-zinc-900 line-clamp-2 text-sm sm:text-base dark:text-zinc-100">
          {course.title}
        </h3>
        {instructor && (
          <p className="mt-1 text-xs text-zinc-500 sm:text-sm dark:text-zinc-400">
            {instructor.name}
          </p>
        )}
        <p className="mt-1.5 line-clamp-2 text-xs text-zinc-600 sm:mt-2 sm:text-sm dark:text-zinc-400">
          {course.description || 'Khóa học trực tuyến'}
        </p>
        {progress !== undefined && (
          <div className="mt-2 sm:mt-3">
            <div className="flex justify-between text-xs text-zinc-500 dark:text-zinc-400">
              <span>Tiến độ</span>
              <span>{progress}%</span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700">
              <div
                className="h-full rounded-full bg-emerald-600 dark:bg-emerald-500"
                style={{ width: `${Math.min(100, progress)}%` }}
              />
            </div>
          </div>
        )}
        <p className="mt-2 font-medium text-emerald-600 sm:mt-3 dark:text-emerald-400 text-sm sm:text-base">
          {formatPrice(course.price)}
        </p>
      </div>
    </Link>
  );
}
