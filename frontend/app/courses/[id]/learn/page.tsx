'use client';

import { useAuth } from '@/context/AuthContext';
import { apiGet } from '@/lib/api';
import type { Course, Enrollment, Exercise, Lesson, Submission } from '@/types';
import {
    Award,
    CheckCircle2,
    FileText,
    Lock,
    PlayCircle,
} from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function CourseLearnPage() {
  const params = useParams();
  const id = params.id as string;
  const { user } = useAuth();
  const [course, setCourse] = useState<Course | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      apiGet<{ course: Course }>(`/api/courses/${id}`),
      apiGet<{ lessons: Lesson[] }>(`/api/lessons/course/${id}`),
      apiGet<{ enrollment: Enrollment }>(`/api/enrollments/${id}`).catch(() => ({ success: false, data: undefined })),
      apiGet<{ exercises: Exercise[] }>(`/api/exercises/course/${id}`),
      apiGet<{ submissions: Submission[] }>(`/api/submissions/course/${id}/my`).catch(() => ({ success: false, data: undefined })),
    ]).then(([cRes, lRes, eRes, exRes, sRes]) => {
      if (cRes.success && cRes.data?.course) setCourse(cRes.data.course);
      if (lRes.success && lRes.data?.lessons) setLessons(lRes.data.lessons);
      if (eRes.success && eRes.data?.enrollment) setEnrollment(eRes.data.enrollment);
      if (exRes.success && exRes.data?.exercises) setExercises(exRes.data.exercises);
      if (sRes.success && sRes.data?.submissions) setSubmissions(sRes.data.submissions);
      setLoading(false);
    });
  }, [id, user]);

  const completedSet = new Set(enrollment?.completedLessons || []);

  // Map exerciseId -> submission for quick lookup
  const submissionMap = new Map<string, Submission>();
  for (const s of submissions) {
    const eid = typeof s.exerciseId === 'object' ? s.exerciseId._id : s.exerciseId;
    submissionMap.set(eid, s);
  }

  // Group exercises by lessonId
  const exercisesByLesson = new Map<string, Exercise[]>();
  const courseExercises: Exercise[] = [];
  for (const ex of exercises) {
    if (ex.lessonId) {
      const arr = exercisesByLesson.get(ex.lessonId) || [];
      arr.push(ex);
      exercisesByLesson.set(ex.lessonId, arr);
    } else {
      courseExercises.push(ex);
    }
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10 text-center">
        <p className="text-zinc-600 dark:text-zinc-400">Vui lòng đăng nhập để học.</p>
        <Link href="/login" className="mt-4 inline-block text-emerald-600 hover:underline">
          Đăng nhập
        </Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10">
        <div className="h-64 animate-pulse rounded-xl bg-zinc-200 dark:bg-zinc-800" />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10">
        <p className="text-zinc-500">Không tìm thấy khóa học.</p>
        <Link href="/courses" className="text-emerald-600 hover:underline">← Khóa học</Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <Link
        href={`/courses/${id}`}
        className="mb-6 inline-block text-sm text-emerald-600 hover:underline dark:text-emerald-400"
      >
        ← {course.title}
      </Link>
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Nội dung học tập</h1>
        {enrollment && (
          <span className="rounded-full bg-emerald-100 px-3 py-1 text-sm font-medium text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300">
            Tiến độ: {enrollment.progress}%
          </span>
        )}
      </div>

      {/* Progress bar */}
      {enrollment && (
        <div className="mb-8">
          <div className="h-2.5 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all duration-500"
              style={{ width: `${enrollment.progress}%` }}
            />
          </div>
        </div>
      )}

      {lessons.length === 0 && exercises.length === 0 ? (
        <p className="text-zinc-500 dark:text-zinc-400">Chưa có nội dung nào.</p>
      ) : (
        <div className="space-y-3">
          {/* Lessons + their exercises */}
          {lessons.map((lesson, index) => {
            const lessonExercises = exercisesByLesson.get(lesson._id) || [];
            const isLessonUnlocked = index === 0 || completedSet.has(lessons[index - 1]._id);
            const isLessonCompleted = completedSet.has(lesson._id);
            return (
              <div key={lesson._id}>
                <div className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
                  <div className="flex items-center gap-4">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-100 text-sm font-medium dark:bg-zinc-800">
                      {index + 1}
                    </span>
                    <div>
                      {isLessonUnlocked ? (
                        <Link
                          href={`/courses/${id}/lesson/${lesson._id}`}
                          className="inline-flex items-center gap-2 font-medium text-zinc-900 hover:underline dark:text-zinc-100"
                        >
                          <PlayCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                          {lesson.title}
                        </Link>
                      ) : (
                        <div className="inline-flex items-center gap-2 font-medium text-zinc-500 dark:text-zinc-400">
                          <Lock className="h-4 w-4" />
                          {lesson.title}
                        </div>
                      )}
                      {lesson.duration > 0 && (
                        <p className="text-sm text-zinc-500">{lesson.duration} phút</p>
                      )}
                    </div>
                  </div>
                  {isLessonCompleted ? (
                    <span className="inline-flex items-center gap-1 text-sm text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="h-4 w-4" /> Hoàn thành
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-sm text-zinc-400 dark:text-zinc-500">
                      Chưa hoàn thành video
                    </span>
                  )}
                </div>

                {/* Exercises for this lesson */}
                {lessonExercises.map((ex) => {
                  const sub = submissionMap.get(ex._id);
                  const canOpenExercise = completedSet.has(lesson._id);
                  return (
                    <div
                      key={ex._id}
                      className="ml-8 mt-2 flex items-center justify-between rounded-xl border border-dashed border-zinc-200 bg-zinc-50/50 p-3 dark:border-zinc-700 dark:bg-zinc-800/50"
                    >
                      <div className="flex items-center gap-3">
                        <FileText className="h-4 w-4 text-orange-500" />
                        {canOpenExercise ? (
                          <Link
                            href={`/courses/${id}/exercise/${ex._id}`}
                            className="text-sm font-medium text-zinc-800 hover:underline dark:text-zinc-200"
                          >
                            {ex.title}
                          </Link>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-sm font-medium text-zinc-500 dark:text-zinc-400">
                            <Lock className="h-3.5 w-3.5" />
                            {ex.title}
                          </span>
                        )}
                        <span className="rounded bg-orange-100 px-1.5 py-0.5 text-[10px] font-semibold text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
                          {ex.type === 'quiz' ? 'Quiz' : ex.type === 'coding' ? 'Code' : 'Text'}
                        </span>
                      </div>
                      {sub ? (
                        <span className="inline-flex items-center gap-1 text-sm font-medium text-emerald-600 dark:text-emerald-400">
                          <Award className="h-3.5 w-3.5" />
                          {sub.score}/{sub.totalPoints} ({sub.percentage}%)
                        </span>
                      ) : !canOpenExercise ? (
                        <span className="text-xs text-zinc-400">Học xong video để mở</span>
                      ) : (
                        <span className="text-xs text-zinc-400">Chưa nộp</span>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}

          {/* Course-level exercises (not linked to a lesson) */}
          {courseExercises.length > 0 && (
            <div className="mt-6">
              <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                <FileText className="h-5 w-5 text-orange-500" />
                Bài tập tổng hợp
              </h2>
              <div className="space-y-2">
                {courseExercises.map((ex) => {
                  const sub = submissionMap.get(ex._id);
                  return (
                    <div
                      key={ex._id}
                      className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
                    >
                      <div className="flex items-center gap-3">
                        <FileText className="h-4 w-4 text-orange-500" />
                        <Link
                          href={`/courses/${id}/exercise/${ex._id}`}
                          className="font-medium text-zinc-800 hover:underline dark:text-zinc-200"
                        >
                          {ex.title}
                        </Link>
                        <span className="rounded bg-orange-100 px-1.5 py-0.5 text-[10px] font-semibold text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
                          {ex.type === 'quiz' ? 'Quiz' : ex.type === 'coding' ? 'Code' : 'Text'}
                        </span>
                      </div>
                      {sub ? (
                        <span className="inline-flex items-center gap-1 text-sm font-medium text-emerald-600 dark:text-emerald-400">
                          <Award className="h-3.5 w-3.5" />
                          {sub.score}/{sub.totalPoints} ({sub.percentage}%)
                        </span>
                      ) : (
                        <Link
                          href={`/courses/${id}/exercise/${ex._id}`}
                          className="rounded-lg border border-orange-300 px-3 py-1.5 text-sm font-medium text-orange-700 hover:bg-orange-50 dark:border-orange-600 dark:text-orange-400 dark:hover:bg-orange-900/20"
                        >
                          Làm bài
                        </Link>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
