'use client';

import { useAuth } from '@/context/AuthContext';
import { apiGet, apiPost } from '@/lib/api';
import { toMediaUrl } from '@/lib/media';
import type { Course, Enrollment, Exercise, Lesson, Post } from '@/types';
import {
  BookOpen,
  ChevronRight,
  Clock,
  FileText,
  GraduationCap,
  ListOrdered,
  MessageSquare,
  PlayCircle,
  User,
} from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

function formatPrice(n: number) {
  if (n === 0) return 'Miễn phí';
  return new Intl.NumberFormat('vi-VN').format(n) + '₫';
}

function formatDuration(totalMinutes: number) {
  if (totalMinutes < 60) return `${totalMinutes} phút`;
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return m > 0 ? `${h} giờ ${m} phút` : `${h} giờ`;
}

export default function CourseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const id = params.id as string;
  const [course, setCourse] = useState<Course | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [error, setError] = useState('');
  const [expandCurriculum, setExpandCurriculum] = useState(true);
  const [posts, setPosts] = useState<Post[]>([]);

  useEffect(() => {
    Promise.all([
      apiGet<{ course: Course }>(`/api/courses/${id}`),
      apiGet<{ lessons: Lesson[] }>(`/api/lessons/course/${id}`),
      apiGet<{ exercises: Exercise[] }>(`/api/exercises/course/${id}`),
      apiGet<{ posts: Post[] }>(`/api/posts?courseId=${id}&limit=5`),
    ]).then(([cRes, lRes, eRes, pRes]) => {
      if (cRes.success && cRes.data?.course) setCourse(cRes.data.course);
      if (lRes.success && lRes.data?.lessons) setLessons(lRes.data.lessons);
      if (eRes.success && eRes.data?.exercises) setExercises(eRes.data.exercises);
      if (pRes.success && pRes.data?.posts) setPosts(pRes.data.posts);
      setLoading(false);
    });
  }, [id]);

  useEffect(() => {
    if (!user || !id) return;
    apiGet<{ enrollment: Enrollment }>(`/api/enrollments/${id}`).then((res) => {
      if (res.success && res.data?.enrollment) setEnrollment(res.data.enrollment);
    });
  }, [user, id]);

  const handleEnroll = async () => {
    if (!user) {
      router.push('/login');
      return;
    }
    setError('');
    setEnrolling(true);
    const res = await apiPost<{ enrollment: Enrollment }>(`/api/enrollments/${id}`, {});
    setEnrolling(false);
    if (res.success && res.data?.enrollment) {
      setEnrollment(res.data.enrollment);
    } else {
      setError(res.message || 'Đăng ký thất bại');
    }
  };

  const handlePaymentMomo = async () => {
    if (!user) {
      router.push('/login');
      return;
    }
    setError('');
    setEnrolling(true);
    const createRes = await apiPost<{ payment: { _id: string }; payUrl?: string }>(
      `/api/payments/course/${id}`,
      { method: 'momo' }
    );
    if (createRes.success && createRes.data?.payUrl) {
      window.location.href = createRes.data.payUrl;
      return;
    }
    setEnrolling(false);
    setError(createRes.message || 'Không tạo được link thanh toán Momo. Kiểm tra cấu hình Momo hoặc dùng thanh toán thử.');
  };

  const handlePaymentMock = async () => {
    if (!user) return;
    setError('');
    setEnrolling(true);
    const createRes = await apiPost<{ payment: { _id: string } }>(`/api/payments/course/${id}`, { method: 'mock' });
    if (createRes.success && createRes.data?.payment) {
      const confirmRes = await apiPost<{ payment: unknown }>(
        `/api/payments/${createRes.data.payment._id}/confirm`,
        {}
      );
      if (confirmRes.success) {
        const enrollRes = await apiGet<{ enrollment: Enrollment }>(`/api/enrollments/${id}`);
        if (enrollRes.success && enrollRes.data?.enrollment) setEnrollment(enrollRes.data.enrollment);
      }
    }
    setEnrolling(false);
  };

  if (loading || !course) {
    return (
      <div className="mx-auto max-w-6xl px-3 py-6 sm:px-4 sm:py-8">
        <div className="h-96 animate-pulse rounded-2xl bg-zinc-200 dark:bg-zinc-800" />
      </div>
    );
  }

  const instructor = typeof course.instructorId === 'object' ? course.instructorId : null;
  const isEnrolled = !!enrollment?._id;
  const totalMinutes = lessons.reduce((acc, l) => acc + (l.duration || 0), 0);
  const progress = enrollment?.progress ?? 0;

  return (
    <div className="mx-auto max-w-6xl px-3 py-6 sm:px-4 sm:py-8">
      {/* Breadcrumb */}
      <nav className="mb-6 flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
        <Link href="/courses" className="hover:text-emerald-600 dark:hover:text-emerald-400">
          Khóa học
        </Link>
        <ChevronRight className="h-4 w-4 shrink-0" aria-hidden />
        <span className="truncate text-zinc-700 dark:text-zinc-300">{course.title}</span>
      </nav>

      <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
        {/* Main content */}
        <div className="min-w-0">
          {/* Hero */}
          <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
            <div className="aspect-video bg-zinc-200 dark:bg-zinc-800">
              {course.thumbnail ? (
                <img src={toMediaUrl(course.thumbnail)} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-zinc-400 dark:text-zinc-500">
                  <BookOpen className="h-20 w-20 sm:h-24 sm:w-24" aria-hidden />
                </div>
              )}
            </div>
            <div className="p-5 sm:p-6 md:p-8">
              <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 sm:text-2xl md:text-3xl">
                {course.title}
              </h1>
              <div className="mt-2 flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700">
                  {instructor?.avatar ? (
                    <img src={toMediaUrl(instructor.avatar)} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <User className="h-4 w-4 text-zinc-500 dark:text-zinc-400" aria-hidden />
                  )}
                </div>
                <span>Giảng viên: {instructor?.name ?? 'X-Tech'}</span>
              </div>
              {/* Stats row - only on main for mobile, duplicate in sidebar for desktop */}
              <div className="mt-4 flex flex-wrap gap-4 text-sm text-zinc-500 lg:hidden dark:text-zinc-400">
                <span className="flex items-center gap-1.5">
                  <ListOrdered className="h-4 w-4" aria-hidden />
                  {lessons.length} bài học
                </span>
                <span className="flex items-center gap-1.5">
                  <FileText className="h-4 w-4" aria-hidden />
                  {exercises.length} bài tập
                </span>
                {totalMinutes > 0 && (
                  <span className="flex items-center gap-1.5">
                    <Clock className="h-4 w-4" aria-hidden />
                    {formatDuration(totalMinutes)}
                  </span>
                )}
              </div>
              <div className="mt-6 whitespace-pre-wrap text-zinc-600 dark:text-zinc-400">
                {course.description || 'Khóa học trực tuyến với nội dung bài giảng và bài tập thực hành. Đăng ký để bắt đầu học.'}
              </div>
            </div>
          </div>

          {/* Curriculum */}
          <section className="mt-8 rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
            <button
              type="button"
              onClick={() => setExpandCurriculum(!expandCurriculum)}
              className="flex w-full items-center justify-between p-5 text-left sm:p-6"
            >
              <h2 className="flex items-center gap-2 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                <GraduationCap className="h-5 w-5 text-emerald-600 dark:text-emerald-400" aria-hidden />
                Nội dung khóa học
              </h2>
              <ChevronRight
                className={`h-5 w-5 shrink-0 transition-transform ${expandCurriculum ? 'rotate-90' : ''}`}
                aria-hidden
              />
            </button>
            {expandCurriculum && (
              <div className="border-t border-zinc-200 dark:border-zinc-700">
                {lessons.length === 0 ? (
                  <p className="p-5 text-sm text-zinc-500 sm:p-6 dark:text-zinc-400">
                    Khóa học đang cập nhật nội dung.
                  </p>
                ) : (
                  <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
                    {lessons.map((lesson, index) => (
                      <li key={lesson._id}>
                        <div className="flex items-center gap-4 p-4 sm:p-5">
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-sm font-medium text-zinc-600 dark:bg-zinc-700 dark:text-zinc-400">
                            {index + 1}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-zinc-900 dark:text-zinc-100">
                              {lesson.title}
                            </p>
                            {lesson.duration > 0 && (
                              <p className="mt-0.5 flex items-center gap-1 text-xs text-zinc-500 dark:text-zinc-400">
                                <Clock className="h-3.5 w-3.5" aria-hidden />
                                {lesson.duration} phút
                              </p>
                            )}
                          </div>
                          {isEnrolled && (
                            <Link
                              href={`/courses/${id}/lesson/${lesson._id}`}
                              className="shrink-0 rounded-lg p-2 text-emerald-600 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/30"
                              title="Xem bài học"
                            >
                              <PlayCircle className="h-5 w-5" aria-hidden />
                            </Link>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </section>

          {/* Exercises */}
          <section className="mt-6 rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
            <h2 className="flex items-center gap-2 p-5 text-lg font-semibold text-zinc-900 dark:text-zinc-100 sm:p-6">
              <FileText className="h-5 w-5 text-emerald-600 dark:text-emerald-400" aria-hidden />
              Bài tập
            </h2>
            <div className="border-t border-zinc-200 p-5 dark:border-zinc-700 sm:p-6">
              {exercises.length === 0 ? (
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  Chưa có bài tập trong khóa học này.
                </p>
              ) : (
                <ul className="space-y-3">
                  {exercises.slice(0, 10).map((ex) => (
                    <li
                      key={ex._id}
                      className="flex items-center justify-between rounded-lg border border-zinc-100 py-2.5 pl-3 pr-2 dark:border-zinc-800"
                    >
                      {isEnrolled ? (
                        <Link href={`/courses/${id}/exercise/${ex._id}`} className="font-medium text-zinc-800 hover:text-emerald-600 dark:text-zinc-200 dark:hover:text-emerald-400">
                          {ex.title}
                        </Link>
                      ) : (
                        <span className="font-medium text-zinc-800 dark:text-zinc-200">{ex.title}</span>
                      )}
                      <span className="rounded bg-zinc-100 px-2 py-0.5 text-xs dark:bg-zinc-800">
                        {ex.type === 'quiz' ? 'Trắc nghiệm' : ex.type === 'coding' ? 'Lập trình' : 'Tự luận'}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              {exercises.length > 10 && (
                <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">
                  và {exercises.length - 10} bài tập khác (xem sau khi đăng ký).
                </p>
              )}
            </div>
          </section>

          {/* Community link */}
          <section className="mt-6 rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
            <div className="p-5 sm:p-6">
              <Link
                href={`/community?courseId=${id}`}
                className="flex items-center gap-3 text-zinc-700 hover:text-emerald-600 dark:text-zinc-300 dark:hover:text-emerald-400"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800">
                  <MessageSquare className="h-5 w-5" aria-hidden />
                </div>
                <div>
                  <p className="font-medium">Thảo luận về khóa học</p>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    Xem câu hỏi và chia sẻ từ học viên
                  </p>
                </div>
                <ChevronRight className="h-5 w-5 shrink-0" aria-hidden />
              </Link>
            </div>
            {posts.length > 0 && (
              <div className="border-t border-zinc-200 dark:border-zinc-700">
                <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {posts.map((post) => {
                  const postAuthor = typeof post.userId === 'object' ? post.userId : null;
                  return (
                    <li key={post._id} className="p-4 sm:px-6">
                      <Link
                        href={`/community/${post._id}`}
                        className="group block"
                      >
                        <div className="flex items-center gap-2">
                          <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                            post.type === 'question'
                              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                              : 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
                          }`}>
                            {post.type === 'question' ? 'Hỏi' : 'Chia sẻ'}
                          </span>
                          <span className="font-medium text-zinc-800 group-hover:text-emerald-600 dark:text-zinc-200 dark:group-hover:text-emerald-400">
                            {post.title}
                          </span>
                        </div>
                        <div className="mt-1.5 flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                          <div className="flex h-5 w-5 shrink-0 items-center justify-center overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700">
                            {postAuthor?.avatar ? (
                              <img src={toMediaUrl(postAuthor.avatar)} alt="" className="h-full w-full object-cover" />
                            ) : (
                              <User className="h-3 w-3 text-zinc-400" aria-hidden />
                            )}
                          </div>
                          <span>{postAuthor?.name ?? '—'} · {new Date(post.createdAt).toLocaleDateString('vi-VN')}</span>
                        </div>
                      </Link>
                    </li>
                  );
                })}
                </ul>
              </div>
            )}
          </section>
        </div>

        {/* Sidebar - sticky card */}
        <aside className="lg:sticky lg:top-20 lg:self-start">
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:p-6">
            {/* Price & CTA */}
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {formatPrice(course.price)}
            </p>
            {isEnrolled && (
              <div className="mt-3 flex items-center gap-2 rounded-lg bg-emerald-50 py-2.5 pl-3 pr-2 dark:bg-emerald-950/30">
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700">
                  <div
                    className="h-full rounded-full bg-emerald-600 dark:bg-emerald-500"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <span className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
                  {progress}%
                </span>
              </div>
            )}
            {error && (
              <div className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/50 dark:text-red-300">
                {error}
              </div>
            )}
            <div className="mt-4 flex flex-col gap-2">
              {isEnrolled ? (
                <>
                  <Link
                    href={`/courses/${id}/learn`}
                    className="flex items-center justify-center gap-2 rounded-lg bg-emerald-600 py-3 font-medium text-white hover:bg-emerald-700 dark:bg-emerald-500"
                  >
                    <PlayCircle className="h-5 w-5 shrink-0" aria-hidden />
                    {progress > 0 ? 'Tiếp tục học' : 'Vào học'}
                  </Link>
                  <Link
                    href="/dashboard"
                    className="rounded-lg border border-zinc-300 py-2.5 text-center text-sm font-medium dark:border-zinc-600"
                  >
                    Khóa học của tôi
                  </Link>
                </>
              ) : user ? (
                <>
                  {course.price === 0 ? (
                    <button
                      type="button"
                      onClick={handleEnroll}
                      disabled={enrolling}
                      className="flex items-center justify-center gap-2 rounded-lg bg-emerald-600 py-3 font-medium text-white hover:bg-emerald-700 disabled:opacity-50 dark:bg-emerald-500"
                    >
                      {enrolling ? 'Đang xử lý...' : 'Đăng ký học miễn phí'}
                    </button>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={handlePaymentMomo}
                        disabled={enrolling}
                        className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#A50064] py-3 font-medium text-white hover:bg-[#b31a73] disabled:opacity-50"
                      >
                        {enrolling ? 'Đang chuyển hướng...' : 'Thanh toán bằng Momo'}
                      </button>
                      <button
                        type="button"
                        onClick={handlePaymentMock}
                        disabled={enrolling}
                        className="text-center text-sm text-zinc-500 underline hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300"
                      >
                        Thanh toán thử (demo)
                      </button>
                    </>
                  )}
                </>
              ) : (
                <Link
                  href="/login"
                  className="flex items-center justify-center gap-2 rounded-lg bg-emerald-600 py-3 font-medium text-white hover:bg-emerald-700 dark:bg-emerald-500"
                >
                  Đăng nhập để đăng ký
                </Link>
              )}
            </div>

            {/* Course info */}
            <div className="mt-6 space-y-3 border-t border-zinc-200 pt-5 dark:border-zinc-700">
              <div className="flex items-center gap-3 text-sm text-zinc-600 dark:text-zinc-400">
                <ListOrdered className="h-4 w-4 shrink-0 text-zinc-400" aria-hidden />
                {lessons.length} bài học
              </div>
              <div className="flex items-center gap-3 text-sm text-zinc-600 dark:text-zinc-400">
                <FileText className="h-4 w-4 shrink-0 text-zinc-400" aria-hidden />
                {exercises.length} bài tập
              </div>
              {totalMinutes > 0 && (
                <div className="flex items-center gap-3 text-sm text-zinc-600 dark:text-zinc-400">
                  <Clock className="h-4 w-4 shrink-0 text-zinc-400" aria-hidden />
                  {formatDuration(totalMinutes)}
                </div>
              )}
            </div>

            {/* Instructor */}
            {instructor && (
              <div className="mt-6 border-t border-zinc-200 pt-5 dark:border-zinc-700">
                <p className="mb-3 text-sm font-medium text-zinc-500 dark:text-zinc-400">
                  Giảng viên
                </p>
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700">
                    {instructor.avatar ? (
                      <img src={toMediaUrl(instructor.avatar)} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <User className="h-6 w-6 text-zinc-500 dark:text-zinc-400" aria-hidden />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-zinc-900 dark:text-zinc-100">{instructor.name}</p>
                    <p className="truncate text-sm text-zinc-500 dark:text-zinc-400">
                      {instructor.email}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
