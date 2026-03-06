'use client';

import { useAuth } from '@/context/AuthContext';
import { apiGet, apiPatch } from '@/lib/api';
import { toMediaUrl } from '@/lib/media';
import type { Course, Enrollment, Exercise, Lesson, Submission } from '@/types';
import {
    BookOpen,
    CheckCircle,
    ChevronLeft,
    ChevronRight,
    Clock,
    FileText,
    ListOrdered,
    Lock,
    PlayCircle,
} from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

declare global {
  interface Window {
    YT?: {
      Player: new (id: string, config: Record<string, unknown>) => {
        destroy: () => void;
        getCurrentTime: () => number;
        getDuration: () => number;
        seekTo: (seconds: number, allowSeekAhead: boolean) => void;
      };
      PlayerState: {
        ENDED: number;
      };
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

function getYouTubeEmbedUrl(url: string): string | null {
  if (!url || !url.trim()) return null;
  const u = url.trim();
  const m = u.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/);
  return m ? `https://www.youtube.com/embed/${m[1]}?rel=0` : null;
}

function isEmbeddableUrl(url: string): boolean {
  const u = url.trim().toLowerCase();
  return (
    u.startsWith('https://www.youtube.com/embed/') ||
    u.startsWith('https://youtube.com/embed/') ||
    u.includes('youtube.com/watch') ||
    u.includes('youtu.be/')
  );
}

function isNativeVideoUrl(url: string): boolean {
  const u = url.trim().toLowerCase();
  return u.endsWith('.mp4') || u.endsWith('.webm') || u.endsWith('.ogg') || u.includes('.mp4?') || u.includes('.webm?') || u.includes('.ogg?');
}

function getYouTubeVideoId(url: string): string | null {
  if (!url || !url.trim()) return null;
  const u = url.trim();
  const m = u.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/);
  return m ? m[1] : null;
}

export default function LessonPage() {
  const params = useParams();
  const id = params.id as string;
  const lessonId = params.lessonId as string;
  const { user } = useAuth();
  const [course, setCourse] = useState<Course | null>(null);
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [videoDuration, setVideoDuration] = useState(0);
  const maxWatchedRef = useRef(0);
  const lastReportedRef = useRef(0);
  const youtubePlayerRef = useRef<{
    destroy: () => void;
    getCurrentTime: () => number;
    getDuration: () => number;
    seekTo: (seconds: number, allowSeekAhead: boolean) => void;
  } | null>(null);
  const youtubeTickRef = useRef<number | null>(null);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      apiGet<{ course: Course }>(`/api/courses/${id}`),
      apiGet<{ lesson: Lesson }>(`/api/lessons/${lessonId}`),
      apiGet<{ lessons: Lesson[] }>(`/api/lessons/course/${id}`),
      apiGet<{ enrollment: Enrollment }>(`/api/enrollments/${id}`),
      apiGet<{ exercises: Exercise[] }>(`/api/exercises/course/${id}`),
      apiGet<{ submissions: Submission[] }>(`/api/submissions/course/${id}/my`),
    ]).then(([cRes, lRes, listRes, eRes, exRes, subRes]) => {
      if (cRes.success && cRes.data?.course) setCourse(cRes.data.course);
      if (lRes.success && lRes.data?.lesson) setLesson(lRes.data.lesson);
      if (listRes.success && listRes.data?.lessons) setLessons(listRes.data.lessons);
      if (eRes.success && eRes.data?.enrollment) setEnrollment(eRes.data.enrollment);
      if (exRes.success && exRes.data?.exercises) setExercises(exRes.data.exercises);
      if (subRes.success && subRes.data?.submissions) setSubmissions(subRes.data.submissions);
      setLoading(false);
    });
  }, [id, lessonId, user]);

  const currentIndex = lessons.findIndex((l) => l._id === lessonId);
  const prevLesson = currentIndex > 0 ? lessons[currentIndex - 1] : null;
  const nextLesson = currentIndex >= 0 && currentIndex < lessons.length - 1 ? lessons[currentIndex + 1] : null;
  const completedSet = new Set(enrollment?.completedLessons || []);
  const isCompleted = lessonId && completedSet.has(lessonId);
  const watchStat = useMemo(
    () => enrollment?.lessonWatchStats?.find((item) => item.lessonId === lessonId),
    [enrollment, lessonId]
  );

  const normalizedVideoUrl = lesson?.videoUrl ? toMediaUrl(lesson.videoUrl) : '';
  const videoEmbedUrl =
    normalizedVideoUrl &&
    (isEmbeddableUrl(normalizedVideoUrl)
      ? getYouTubeEmbedUrl(normalizedVideoUrl) || normalizedVideoUrl
      : normalizedVideoUrl);
  const useNativeVideo = !!(normalizedVideoUrl && isNativeVideoUrl(normalizedVideoUrl));
  const youtubeVideoId = normalizedVideoUrl ? getYouTubeVideoId(normalizedVideoUrl) : null;
  const useYoutubePlayer = !!youtubeVideoId && !useNativeVideo;

  useEffect(() => {
    maxWatchedRef.current = watchStat?.watchedSeconds || 0;
    lastReportedRef.current = watchStat?.watchedSeconds || 0;
  }, [watchStat?.watchedSeconds, lessonId]);

  const reportWatch = useCallback(async (watchedSeconds: number, durationSeconds: number) => {
    const res = await apiPatch<{ enrollment: Enrollment }>(
      `/api/enrollments/${id}/lessons/${lessonId}/watch`,
      {
        watchedSeconds,
        durationSeconds,
      }
    );
    if (res.success && res.data?.enrollment) {
      setEnrollment(res.data.enrollment);
    }
  }, [id, lessonId]);

  const handleVideoLoadedMetadata = (duration: number) => {
    const safeDuration = Number.isFinite(duration) ? Math.max(0, duration) : 0;
    setVideoDuration(safeDuration);
  };

  const handleVideoTimeUpdate = (currentTime: number, duration: number) => {
    const safeCurrent = Number.isFinite(currentTime) ? Math.max(0, currentTime) : 0;
    const safeDuration = Number.isFinite(duration) ? Math.max(0, duration) : 0;
    if (safeCurrent > maxWatchedRef.current) {
      maxWatchedRef.current = safeCurrent;
    }
    if (maxWatchedRef.current - lastReportedRef.current >= 5) {
      lastReportedRef.current = maxWatchedRef.current;
      reportWatch(maxWatchedRef.current, safeDuration || videoDuration).catch(() => {});
    }
  };

  const handleVideoEnded = useCallback(() => {
    const finalDuration = videoDuration > 0 ? videoDuration : maxWatchedRef.current;
    maxWatchedRef.current = Math.max(maxWatchedRef.current, finalDuration);
    lastReportedRef.current = maxWatchedRef.current;
    reportWatch(maxWatchedRef.current, finalDuration).catch(() => {});
  }, [reportWatch, videoDuration]);

  const handleVideoSeeking = (videoEl: HTMLVideoElement) => {
    if (videoEl.currentTime > maxWatchedRef.current + 1) {
      videoEl.currentTime = maxWatchedRef.current;
    }
  };

  useEffect(() => {
    if (!useYoutubePlayer || !youtubeVideoId) return;

    const playerElementId = `lesson-youtube-player-${lessonId}`;

    const setupTick = () => {
      if (youtubeTickRef.current) {
        window.clearInterval(youtubeTickRef.current);
      }
      youtubeTickRef.current = window.setInterval(() => {
        const player = youtubePlayerRef.current;
        if (!player) return;
        const current = Number(player.getCurrentTime() || 0);
        const duration = Number(player.getDuration() || 0);
        if (duration > 0 && videoDuration === 0) {
          setVideoDuration(duration);
        }
        if (current > maxWatchedRef.current + 1) {
          player.seekTo(maxWatchedRef.current, true);
          return;
        }
        if (current > maxWatchedRef.current) {
          maxWatchedRef.current = current;
        }
        if (maxWatchedRef.current - lastReportedRef.current >= 5) {
          lastReportedRef.current = maxWatchedRef.current;
          reportWatch(maxWatchedRef.current, duration || videoDuration).catch(() => {});
        }
      }, 1000);
    };

    const initPlayer = () => {
      if (!window.YT?.Player) return;
      youtubePlayerRef.current?.destroy();
      youtubePlayerRef.current = new window.YT.Player(playerElementId, {
        videoId: youtubeVideoId,
        playerVars: {
          rel: 0,
          controls: 1,
          modestbranding: 1,
          disablekb: 1,
        },
        events: {
          onReady: () => {
            setupTick();
          },
          onStateChange: (event: { data: number }) => {
            if (window.YT?.PlayerState && event.data === window.YT.PlayerState.ENDED) {
              handleVideoEnded();
            }
          },
        },
      });
    };

    const loadYoutubeApi = () => {
      if (window.YT?.Player) {
        initPlayer();
        return;
      }
      const existing = document.querySelector('script[src="https://www.youtube.com/iframe_api"]');
      if (!existing) {
        const script = document.createElement('script');
        script.src = 'https://www.youtube.com/iframe_api';
        document.body.appendChild(script);
      }
      window.onYouTubeIframeAPIReady = () => {
        initPlayer();
      };
    };

    loadYoutubeApi();

    return () => {
      if (youtubeTickRef.current) {
        window.clearInterval(youtubeTickRef.current);
        youtubeTickRef.current = null;
      }
      youtubePlayerRef.current?.destroy();
      youtubePlayerRef.current = null;
    };
  }, [handleVideoEnded, lessonId, reportWatch, useYoutubePlayer, youtubeVideoId, videoDuration]);

  if (!user) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10 text-center">
        <p className="text-zinc-600 dark:text-zinc-400">Vui lòng đăng nhập để xem bài học.</p>
        <Link href="/login" className="mt-4 inline-block text-emerald-600 hover:underline">
          Đăng nhập
        </Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        <div className="h-8 w-64 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
        <div className="mt-8 aspect-video animate-pulse rounded-xl bg-zinc-200 dark:bg-zinc-800" />
      </div>
    );
  }

  if (!lesson || !course) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10">
        <p className="text-zinc-500 dark:text-zinc-400">Không tìm thấy bài học.</p>
        <Link href={`/courses/${id}`} className="mt-4 inline-block text-emerald-600 hover:underline">
          ← Quay lại khóa học
        </Link>
      </div>
    );
  }

  const hasVideo = !!videoEmbedUrl;
  const hasContent = !!(lesson.content && lesson.content.trim());
  const notEnrolled = !enrollment;

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
      {notEnrolled && (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/30">
          <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
            Bạn chưa đăng ký khóa học. Đăng ký để lưu tiến độ và đánh dấu hoàn thành bài học.
          </p>
          <Link
            href={`/courses/${id}`}
            className="mt-2 inline-block text-sm font-medium text-amber-700 underline hover:no-underline dark:text-amber-300"
          >
            Đăng ký khóa học →
          </Link>
        </div>
      )}
      {/* Breadcrumb */}
      <nav className="mb-6 flex flex-wrap items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
        <Link href="/courses" className="hover:text-emerald-600 dark:hover:text-emerald-400">
          Khóa học
        </Link>
        <ChevronRight className="h-4 w-4 shrink-0" aria-hidden />
        <Link href={`/courses/${id}`} className="truncate hover:text-emerald-600 dark:hover:text-emerald-400">
          {course.title}
        </Link>
        <ChevronRight className="h-4 w-4 shrink-0" aria-hidden />
        <Link href={`/courses/${id}/learn`} className="hover:text-emerald-600 dark:hover:text-emerald-400">
          Bài học
        </Link>
        <ChevronRight className="h-4 w-4 shrink-0" aria-hidden />
        <span className="truncate text-zinc-700 dark:text-zinc-300">
          Bài {currentIndex + 1}: {lesson.title}
        </span>
      </nav>

      <div className="grid gap-8 lg:grid-cols-[1fr_280px]">
        {/* Main content */}
        <div className="min-w-0">
          <article className="overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
            {/* Header */}
            <div className="border-b border-zinc-200 p-5 dark:border-zinc-700 sm:p-6 md:p-8">
              <div className="flex flex-wrap items-center gap-3 text-sm text-zinc-500 dark:text-zinc-400">
                <span className="flex items-center gap-1.5">
                  <ListOrdered className="h-4 w-4" aria-hidden />
                  Bài {currentIndex + 1} / {lessons.length}
                </span>
                {lesson.duration > 0 && (
                  <span className="flex items-center gap-1.5">
                    <Clock className="h-4 w-4" aria-hidden />
                    {lesson.duration} phút
                  </span>
                )}
              </div>
              <h1 className="mt-2 text-xl font-bold text-zinc-900 dark:text-zinc-100 sm:text-2xl md:text-3xl">
                {lesson.title}
              </h1>
              {enrollment && (
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  {isCompleted ? (
                    <span className="inline-flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300">
                      <CheckCircle className="h-4 w-4" aria-hidden />
                      Đã hoàn thành
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-2 rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                      Cần xem gần hết video để hoàn thành
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Video */}
            {hasVideo && (
              <div className="border-b border-zinc-200 dark:border-zinc-700">
                <div className="aspect-video bg-zinc-900">
                  {useNativeVideo && normalizedVideoUrl ? (
                    <video
                      src={normalizedVideoUrl}
                      controls
                      className="h-full w-full"
                      controlsList="nodownload noplaybackrate"
                      onLoadedMetadata={(e) => handleVideoLoadedMetadata(e.currentTarget.duration)}
                      onTimeUpdate={(e) =>
                        handleVideoTimeUpdate(
                          e.currentTarget.currentTime,
                          e.currentTarget.duration
                        )
                      }
                      onEnded={handleVideoEnded}
                      onSeeking={(e) => handleVideoSeeking(e.currentTarget)}
                    />
                  ) : useYoutubePlayer ? (
                    <div id={`lesson-youtube-player-${lessonId}`} className="h-full w-full" />
                  ) : (
                    <iframe
                      src={videoEmbedUrl}
                      title={lesson.title}
                      className="h-full w-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  )}
                </div>
                {!useNativeVideo && !useYoutubePlayer && (
                  <div className="border-t border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
                    Link video hiện không phải định dạng video trực tiếp (.mp4/.webm/.ogg), nên hệ thống không thể chặn tua chính xác.
                  </div>
                )}
              </div>
            )}

            {/* Content */}
            <div className="p-5 sm:p-6 md:p-8">
              {hasContent ? (
                <div className="prose max-w-none dark:prose-invert prose-headings:text-zinc-900 dark:prose-headings:text-zinc-100 prose-p:text-zinc-600 dark:prose-p:text-zinc-400 prose-li:text-zinc-600 dark:prose-li:text-zinc-400">
                  <div className="whitespace-pre-wrap break-words text-zinc-700 dark:text-zinc-300">
                    {lesson.content}
                  </div>
                </div>
              ) : !hasVideo ? (
                <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-300 py-16 dark:border-zinc-600">
                  <BookOpen className="h-14 w-14 text-zinc-300 dark:text-zinc-600" aria-hidden />
                  <p className="mt-4 text-center text-sm text-zinc-500 dark:text-zinc-400">
                    Bài học này chưa có nội dung chi tiết.
                  </p>
                  <p className="mt-1 text-center text-sm text-zinc-500 dark:text-zinc-400">
                    Bài học sẽ tự hoàn thành khi bạn xem gần hết video.
                  </p>
                </div>
              ) : null}
            </div>
          </article>

          {/* Exercises for this lesson */}
          {(() => {
            const lessonExercises = exercises.filter((ex) => ex.lessonId === lessonId);
            if (lessonExercises.length === 0) return null;
            return (
              <div className="mt-6 rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
                <div className="flex items-center gap-2 border-b border-zinc-200 p-5 dark:border-zinc-700">
                  <FileText className="h-5 w-5 text-emerald-600 dark:text-emerald-400" aria-hidden />
                  <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                    Bài tập ({lessonExercises.length})
                  </h2>
                </div>
                <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {lessonExercises.map((ex) => {
                    const sub = submissions.find((s) => {
                      const exerciseId = typeof s.exerciseId === 'object' ? s.exerciseId._id : s.exerciseId;
                      return exerciseId === ex._id;
                    });
                    const canOpenExercise = isCompleted;
                    return (
                      <li key={ex._id}>
                        {canOpenExercise ? (
                          <Link
                            href={`/courses/${id}/exercise/${ex._id}`}
                            className="flex items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/60"
                          >
                            <div className="min-w-0 flex-1">
                              <p className="font-medium text-zinc-900 dark:text-zinc-100">{ex.title}</p>
                              <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
                                {ex.type === 'quiz'
                                  ? `Trắc nghiệm · ${ex.questions?.length || 0} câu hỏi`
                                  : 'Tự luận'}
                              </p>
                            </div>
                            {sub ? (
                              <span className="shrink-0 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                                {sub.score}/{sub.totalPoints} ({sub.percentage}%)
                              </span>
                            ) : (
                              <span className="shrink-0 rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                                Chưa làm
                              </span>
                            )}
                          </Link>
                        ) : (
                          <div className="flex items-center justify-between gap-4 px-5 py-4 text-zinc-400 dark:text-zinc-500">
                            <div className="min-w-0 flex-1">
                              <p className="inline-flex items-center gap-1.5 font-medium">
                                <Lock className="h-3.5 w-3.5" />
                                {ex.title}
                              </p>
                              <p className="mt-0.5 text-sm">Hoàn thành video để mở bài tập</p>
                            </div>
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })()}

          {/* Prev / Next */}
          <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:justify-between">
            {prevLesson ? (
              <Link
                href={`/courses/${id}/lesson/${prevLesson._id}`}
                className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-3 font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                <ChevronLeft className="h-5 w-5 shrink-0" aria-hidden />
                <span className="truncate">Bài trước: {prevLesson.title}</span>
              </Link>
            ) : (
              <div />
            )}
            {nextLesson ? (
              isCompleted ? (
                <Link
                  href={`/courses/${id}/lesson/${nextLesson._id}`}
                  className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-3 font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 sm:ml-auto"
                >
                  <span className="truncate">Bài tiếp: {nextLesson.title}</span>
                  <ChevronRight className="h-5 w-5 shrink-0" aria-hidden />
                </Link>
              ) : (
                <span className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 font-medium text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400 sm:ml-auto">
                  <Lock className="h-4 w-4" />
                  Hoàn thành video để mở bài tiếp theo
                </span>
              )
            ) : (
              <Link
                href={`/courses/${id}/learn`}
                className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 font-medium text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300 sm:ml-auto"
              >
                <span>Xem tất cả bài học</span>
                <ChevronRight className="h-5 w-5 shrink-0" aria-hidden />
              </Link>
            )}
          </div>
        </div>

        {/* Sidebar - lesson list */}
        <aside className="lg:sticky lg:top-20 lg:self-start">
          <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900 sm:p-5">
            <div className="flex items-center gap-2 border-b border-zinc-200 pb-3 dark:border-zinc-700">
              <PlayCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400" aria-hidden />
              <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">Nội dung khóa học</h2>
            </div>
            {enrollment && (
              <div className="mt-3 flex items-center justify-between text-sm">
                <span className="text-zinc-500 dark:text-zinc-400">Tiến độ</span>
                <span className="font-medium text-emerald-600 dark:text-emerald-400">
                  {enrollment.progress}%
                </span>
              </div>
            )}
            <ul className="mt-4 max-h-[60vh] overflow-y-auto">
              {lessons.map((l, index) => {
                const isCurrent = l._id === lessonId;
                const done = completedSet.has(l._id);
                return (
                  <li key={l._id}>
                    <Link
                      href={`/courses/${id}/lesson/${l._id}`}
                      className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors ${
                        isCurrent
                          ? 'bg-emerald-50 font-medium text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200'
                          : 'text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800'
                      }`}
                    >
                      <span
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-medium ${
                          isCurrent
                            ? 'bg-emerald-600 text-white dark:bg-emerald-500'
                            : done
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300'
                              : 'bg-zinc-200 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-400'
                        }`}
                      >
                        {done && !isCurrent ? (
                          <CheckCircle className="h-4 w-4" aria-hidden />
                        ) : (
                          index + 1
                        )}
                      </span>
                      <span className="min-w-0 flex-1 truncate">{l.title}</span>
                      {l.duration > 0 && (
                        <span className="shrink-0 text-xs text-zinc-400">{l.duration}p</span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
            <div className="mt-4 border-t border-zinc-200 pt-4 dark:border-zinc-700">
              <Link
                href={`/courses/${id}/learn`}
                className="block rounded-lg border border-zinc-200 py-2.5 text-center text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                Danh sách bài học
              </Link>
              <Link
                href={`/courses/${id}`}
                className="mt-2 block rounded-lg border border-zinc-200 py-2.5 text-center text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                Về trang khóa học
              </Link>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
