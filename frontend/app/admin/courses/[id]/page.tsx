'use client';

import IconButton from '@/components/ui/IconButton';
import { apiDelete, apiGet, apiPatch, apiPost, apiUpload } from '@/lib/api';
import { toMediaUrl } from '@/lib/media';
import type { Course, Exercise, Lesson } from '@/types';
import { ChevronLeft, ClipboardList, Eye, FileText, GraduationCap, Pencil, Plus, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

type QuizQuestion = {
  question: string;
  inputType: 'choice';
  options: string[];
  correctAnswer: string;
  points: number;
};

type EssayQuestion = {
  question: string;
  inputType: 'essay';
  points: number;
};

type CodeBlank = {
  key: string;
  answer: string;
  placeholder: string;
};

type CodingQuestion = {
  question: string;
  inputType: 'code_blank';
  codeTemplate: string;
  blanks: CodeBlank[];
  points: number;
  caseSensitive: boolean;
};

type ExerciseQuestionForm = QuizQuestion | EssayQuestion | CodingQuestion;

export default function AdminCourseContentPage() {
  const params = useParams();
  const id = params.id as string;
  const [course, setCourse] = useState<Course | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [showLessonModal, setShowLessonModal] = useState(false);
  const [showExerciseModal, setShowExerciseModal] = useState(false);
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);
  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null);
  const [lessonForm, setLessonForm] = useState({ title: '', order: 0, content: '', videoUrl: '', duration: 0 });
  const [exerciseForm, setExerciseForm] = useState<{
    title: string;
    type: Exercise['type'];
    lessonId: string;
    questions: ExerciseQuestionForm[];
  }>({
    title: '',
    type: 'quiz',
    lessonId: '',
    questions: [],
  });
  const [saving, setSaving] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [lessonFormError, setLessonFormError] = useState('');
  const [exerciseFormError, setExerciseFormError] = useState('');
  const [deletingLessonId, setDeletingLessonId] = useState<string | null>(null);
  const [deletingExerciseId, setDeletingExerciseId] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      apiGet<{ course: Course }>(`/api/courses/${id}`),
      apiGet<{ lessons: Lesson[] }>(`/api/lessons/course/${id}`),
      apiGet<{ exercises: Exercise[] }>(`/api/exercises/course/${id}`),
    ]).then(([cRes, lRes, eRes]) => {
      if (cRes.success && cRes.data?.course) setCourse(cRes.data.course);
      if (lRes.success && lRes.data?.lessons) setLessons(lRes.data.lessons);
      if (eRes.success && eRes.data?.exercises) setExercises(eRes.data.exercises);
      setLoading(false);
    });
  }, [id]);

  const openAddLesson = () => {
    setEditingLesson(null);
    setLessonFormError('');
    setLessonForm({
      title: '',
      order: lessons.length,
      content: '',
      videoUrl: '',
      duration: 0,
    });
    setShowLessonModal(true);
  };

  const openEditLesson = (l: Lesson) => {
    setEditingLesson(l);
    setLessonFormError('');
    setLessonForm({
      title: l.title,
      order: l.order ?? 0,
      content: l.content ?? '',
      videoUrl: l.videoUrl ?? '',
      duration: l.duration ?? 0,
    });
    setShowLessonModal(true);
  };

  const handleVideoUpload = async (file: File) => {
    if (!file.type.startsWith('video/')) {
      setLessonFormError('Vui lòng chọn file video hợp lệ.');
      return;
    }
    setLessonFormError('');
    setUploadingVideo(true);
    const formData = new FormData();
    formData.append('video', file);
    const res = await apiUpload<{ url: string; filename?: string }>('/api/upload/video', formData);
    setUploadingVideo(false);
    if (res.success && res.data?.url) {
      setLessonForm((prev) => ({ ...prev, videoUrl: res.data!.url }));
      return;
    }
    setLessonFormError(res.message || 'Upload video thất bại.');
  };

  const saveLesson = async () => {
    if (!lessonForm.title.trim()) return;
    setLessonFormError('');
    setSaving(true);
    if (editingLesson) {
      const res = await apiPatch<{ lesson: Lesson }>(`/api/lessons/${editingLesson._id}`, {
        title: lessonForm.title.trim(),
        order: Number(lessonForm.order) || 0,
        content: lessonForm.content.trim(),
        videoUrl: lessonForm.videoUrl.trim() || null,
        duration: Math.max(0, Number(lessonForm.duration) || 0),
      });
      setSaving(false);
      if (res.success && res.data?.lesson) {
        setLessons((prev) => prev.map((x) => (x._id === editingLesson._id ? res.data!.lesson! : x)));
        setShowLessonModal(false);
      } else {
        setLessonFormError(res.message || 'Lưu bài học thất bại.');
      }
    } else {
      const res = await apiPost<{ lesson: Lesson }>(`/api/lessons/course/${id}`, {
        title: lessonForm.title.trim(),
        order: Number(lessonForm.order) || 0,
        content: lessonForm.content.trim(),
        videoUrl: lessonForm.videoUrl.trim() || null,
        duration: Math.max(0, Number(lessonForm.duration) || 0),
      });
      setSaving(false);
      if (res.success && res.data?.lesson) {
        setLessons((prev) => [...prev, res.data!.lesson!].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)));
        setShowLessonModal(false);
      } else {
        setLessonFormError(res.message || 'Tạo bài học thất bại.');
      }
    }
  };

  const deleteLesson = async (lessonId: string) => {
    if (!confirm('Xóa bài học này?')) return;
    setDeletingLessonId(lessonId);
    const res = await apiDelete(`/api/lessons/${lessonId}`);
    setDeletingLessonId(null);
    if (res.success) setLessons((prev) => prev.filter((l) => l._id !== lessonId));
  };

  const openAddExercise = () => {
    setEditingExercise(null);
    setExerciseFormError('');
    setExerciseForm({ title: '', type: 'quiz', lessonId: '', questions: [] });
    setShowExerciseModal(true);
  };

  const openEditExercise = (ex: Exercise) => {
    setEditingExercise(ex);
    setExerciseFormError('');
    const lessonId = ex.lessonId == null ? '' : typeof ex.lessonId === 'object' && ex.lessonId && '_id' in ex.lessonId ? (ex.lessonId as { _id: string })._id : String(ex.lessonId);
    setExerciseForm({
      title: ex.title,
      type: ex.type ?? 'quiz',
      lessonId,
      questions: (ex.questions || []).map((q) => {
        const inputType =
          q.inputType ||
          (ex.type === 'quiz' ? 'choice' : ex.type === 'coding' ? 'code_blank' : 'essay');
        if (inputType === 'essay') {
          return {
            question: q.question || '',
            inputType: 'essay',
            points: q.points ?? 1,
          };
        }
        if (inputType === 'code_blank') {
          return {
            question: q.question || '',
            inputType: 'code_blank',
            codeTemplate: q.codeTemplate || '',
            blanks: (q.blanks || []).map((b) => ({
              key: b.key || '',
              answer: b.answer || '',
              placeholder: b.placeholder || '',
            })),
            points: q.points ?? 1,
            caseSensitive: Boolean(q.caseSensitive),
          };
        }
        return {
          question: q.question || '',
          inputType: 'choice',
          options: q.options || [],
          correctAnswer: (q.correctAnswer ? String(q.correctAnswer) : '') || '',
          points: q.points ?? 1,
        };
      }),
    });
    setShowExerciseModal(true);
  };

  const saveExercise = async () => {
    if (!exerciseForm.title.trim()) return;
    setExerciseFormError('');

    const normalizedQuestions = (exerciseForm.questions || [])
      .map((q) => {
        if (exerciseForm.type === 'quiz' && q.inputType === 'choice') {
          return {
            question: q.question.trim(),
            inputType: 'choice' as const,
            options: (q.options || []).map((opt) => opt.trim()).filter(Boolean),
            correctAnswer: q.correctAnswer.trim(),
            points: Math.max(0, Number(q.points) || 0),
          };
        }

        if (exerciseForm.type === 'coding' && q.inputType === 'code_blank') {
          return {
            question: q.question.trim(),
            inputType: 'code_blank' as const,
            codeTemplate: q.codeTemplate,
            blanks: (q.blanks || [])
              .map((b) => ({
                key: b.key.trim(),
                answer: b.answer.trim(),
                placeholder: b.placeholder.trim(),
              }))
              .filter((b) => b.key),
            points: Math.max(0, Number(q.points) || 0),
            caseSensitive: Boolean(q.caseSensitive),
          };
        }

        if (exerciseForm.type === 'text' && q.inputType === 'essay') {
          return {
            question: q.question.trim(),
            inputType: 'essay' as const,
            points: Math.max(0, Number(q.points) || 0),
          };
        }

        return null;
      })
      .filter((q): q is NonNullable<typeof q> => Boolean(q));

    if (normalizedQuestions.length === 0) {
      setExerciseFormError('Cần có ít nhất 1 câu hỏi hợp lệ.');
      return;
    }

    const hasInvalidQuiz =
      exerciseForm.type === 'quiz' &&
      normalizedQuestions.some(
        (q) => q.inputType === 'choice' && (!q.question || (q.options?.length || 0) < 2 || !q.correctAnswer),
      );
    if (hasInvalidQuiz) {
      setExerciseFormError('Mỗi câu trắc nghiệm cần nội dung, ít nhất 2 đáp án và đáp án đúng.');
      return;
    }

    const hasInvalidCoding =
      exerciseForm.type === 'coding' &&
      normalizedQuestions.some(
        (q) => q.inputType === 'code_blank' && (!q.question || !q.codeTemplate || (q.blanks?.length || 0) === 0),
      );
    if (hasInvalidCoding) {
      setExerciseFormError('Mỗi câu lập trình điền chữ cần đề bài, đoạn code mẫu và ít nhất 1 ô trống.');
      return;
    }

    const hasInvalidEssay =
      exerciseForm.type === 'text' && normalizedQuestions.some((q) => q.inputType === 'essay' && !q.question);
    if (hasInvalidEssay) {
      setExerciseFormError('Mỗi câu tự luận cần có nội dung câu hỏi.');
      return;
    }

    setSaving(true);
    const payload = {
      title: exerciseForm.title.trim(),
      type: exerciseForm.type,
      lessonId: exerciseForm.lessonId.trim() || null,
      questions: normalizedQuestions,
    };
    if (editingExercise) {
      const res = await apiPatch<{ exercise: Exercise }>(`/api/exercises/${editingExercise._id}`, payload);
      setSaving(false);
      if (res.success && res.data?.exercise) {
        setExercises((prev) => prev.map((x) => (x._id === editingExercise._id ? res.data!.exercise! : x)));
        setShowExerciseModal(false);
      } else {
        setExerciseFormError(res.message || 'Cập nhật bài tập thất bại.');
      }
    } else {
      const res = await apiPost<{ exercise: Exercise }>(`/api/exercises/course/${id}`, payload);
      setSaving(false);
      if (res.success && res.data?.exercise) {
        setExercises((prev) => [...prev, res.data!.exercise!]);
        setShowExerciseModal(false);
      } else {
        setExerciseFormError(res.message || 'Tạo bài tập thất bại.');
      }
    }
  };

  const deleteExercise = async (exerciseId: string) => {
    if (!confirm('Xóa bài tập này?')) return;
    setDeletingExerciseId(exerciseId);
    const res = await apiDelete(`/api/exercises/${exerciseId}`);
    setDeletingExerciseId(null);
    if (res.success) setExercises((prev) => prev.filter((e) => e._id !== exerciseId));
  };

  if (loading || !course) {
    return (
      <div className="min-w-0">
        <div className="h-10 w-64 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
      </div>
    );
  }

  const typeLabel: Record<string, string> = { quiz: 'Trắc nghiệm', coding: 'Lập trình điền chữ', text: 'Tự luận' };

  return (
    <div className="min-w-0">
      <nav className="mb-4 flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
        <Link href="/admin/courses" className="inline-flex items-center gap-1 hover:text-emerald-600 dark:hover:text-emerald-400">
          <ChevronLeft className="h-4 w-4" />
          Khóa học
        </Link>
        <span className="text-zinc-400">/</span>
        <span className="truncate text-zinc-700 dark:text-zinc-300">{course.title}</span>
      </nav>
      <h1 className="mb-2 text-xl font-bold text-zinc-900 dark:text-zinc-100 sm:text-2xl">
        Nội dung khóa học
      </h1>
      <p className="mb-6 text-sm text-zinc-600 dark:text-zinc-400">
        Quản lý bài học và bài tập. Sau khi thêm có thể sửa chi tiết (nội dung, câu hỏi).
      </p>

      {/* Lessons */}
      <section className="mb-10">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            <GraduationCap className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            Bài học ({lessons.length})
          </h2>
          <button
            type="button"
            onClick={openAddLesson}
            className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700 dark:bg-emerald-500"
          >
            <Plus className="h-4 w-4" />
            Thêm bài học
          </button>
        </div>
        <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          {lessons.length === 0 ? (
            <div className="p-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
              Chưa có bài học. Bấm &quot;Thêm bài học&quot; để tạo.
            </div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800/50">
                  <th className="px-3 py-2.5 font-medium sm:px-4">STT</th>
                  <th className="px-3 py-2.5 font-medium sm:px-4">Tiêu đề</th>
                  <th className="hidden px-3 py-2.5 font-medium sm:table-cell sm:px-4">Thời lượng</th>
                  <th className="w-24 px-3 py-2.5 font-medium sm:px-4">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {lessons.map((l, i) => (
                  <tr key={l._id} className="border-b border-zinc-100 dark:border-zinc-800">
                    <td className="px-3 py-2.5 sm:px-4">{i + 1}</td>
                    <td className="px-3 py-2.5 font-medium sm:px-4">{l.title}</td>
                    <td className="hidden px-3 py-2.5 text-zinc-500 sm:table-cell sm:px-4">{l.duration ? `${l.duration} phút` : '—'}</td>
                    <td className="px-3 py-2.5 sm:px-4">
                      <div className="flex items-center gap-0.5">
                        <IconButton icon={<Pencil className="h-4 w-4" />} label="Sửa" variant="primary" onClick={() => openEditLesson(l)} />
                        <IconButton icon={<Trash2 className="h-4 w-4" />} label="Xóa" variant="danger" onClick={() => deleteLesson(l._id)} disabled={deletingLessonId === l._id} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {/* Exercises */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            <FileText className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            Bài tập ({exercises.length})
          </h2>
          <div className="flex items-center gap-2">
            <Link
              href={`/admin/courses/${id}/submissions`}
              className="inline-flex items-center gap-1 rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              <ClipboardList className="h-4 w-4" />
              Xem bài nộp
            </Link>
            <button
              type="button"
              onClick={openAddExercise}
              className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700 dark:bg-emerald-500"
            >
              <Plus className="h-4 w-4" />
              Thêm bài tập
            </button>
          </div>
        </div>
        <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          {exercises.length === 0 ? (
            <div className="p-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
              Chưa có bài tập. Bấm &quot;Thêm bài tập&quot; để tạo.
            </div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800/50">
                  <th className="px-3 py-2.5 font-medium sm:px-4">Tiêu đề</th>
                  <th className="px-3 py-2.5 font-medium sm:px-4">Loại</th>
                  <th className="w-32 px-3 py-2.5 font-medium sm:px-4">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {exercises.map((ex) => (
                  <tr key={ex._id} className="border-b border-zinc-100 dark:border-zinc-800">
                    <td className="px-3 py-2.5 font-medium sm:px-4">{ex.title}</td>
                    <td className="px-3 py-2.5 text-zinc-500 sm:px-4">{typeLabel[ex.type] ?? ex.type}</td>
                    <td className="px-3 py-2.5 sm:px-4">
                      <div className="flex items-center gap-0.5">
                        <Link href={`/admin/courses/${id}/submissions?exercise=${ex._id}`} title="Xem bài nộp">
                          <IconButton icon={<Eye className="h-4 w-4" />} label="Bài nộp" variant="primary" />
                        </Link>
                        <IconButton icon={<Pencil className="h-4 w-4" />} label="Sửa" variant="primary" onClick={() => openEditExercise(ex)} />
                        <IconButton icon={<Trash2 className="h-4 w-4" />} label="Xóa" variant="danger" onClick={() => deleteExercise(ex._id)} disabled={deletingExerciseId === ex._id} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {/* Lesson modal */}
      {showLessonModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-4 dark:bg-zinc-900 sm:p-6">
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              {editingLesson ? 'Sửa bài học' : 'Thêm bài học'}
            </h3>
            {lessonFormError && (
              <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
                {lessonFormError}
              </div>
            )}
            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Tiêu đề</label>
                <input type="text" value={lessonForm.title} onChange={(e) => setLessonForm((f) => ({ ...f, title: e.target.value }))} className="mt-1 w-full rounded-lg border border-zinc-300 px-4 py-2 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Thứ tự</label>
                  <input type="number" min={0} value={lessonForm.order} onChange={(e) => setLessonForm((f) => ({ ...f, order: Number(e.target.value) || 0 }))} className="mt-1 w-full rounded-lg border border-zinc-300 px-4 py-2 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Thời lượng (phút)</label>
                  <input type="number" min={0} value={lessonForm.duration} onChange={(e) => setLessonForm((f) => ({ ...f, duration: Number(e.target.value) || 0 }))} className="mt-1 w-full rounded-lg border border-zinc-300 px-4 py-2 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">URL video (tùy chọn)</label>
                <input type="url" value={lessonForm.videoUrl} onChange={(e) => setLessonForm((f) => ({ ...f, videoUrl: e.target.value }))} placeholder="https://..." className="mt-1 w-full rounded-lg border border-zinc-300 px-4 py-2 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100" />
                <div className="mt-2 flex items-center gap-2">
                  <label className="inline-flex cursor-pointer items-center rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800">
                    <input
                      type="file"
                      accept="video/mp4,video/webm,video/ogg,video/quicktime,video/x-m4v,video/x-msvideo"
                      className="hidden"
                      disabled={uploadingVideo}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleVideoUpload(file);
                        e.currentTarget.value = '';
                      }}
                    />
                    {uploadingVideo ? 'Đang upload video...' : 'Upload video từ máy'}
                  </label>
                  {lessonForm.videoUrl && (
                    <span className="text-xs text-emerald-600 dark:text-emerald-400">Đã có video</span>
                  )}
                </div>
                {lessonForm.videoUrl && (
                  <video
                    src={toMediaUrl(lessonForm.videoUrl)}
                    controls
                    className="mt-3 aspect-video w-full rounded-lg border border-zinc-200 bg-black dark:border-zinc-700"
                  />
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Nội dung (tùy chọn)</label>
                <textarea value={lessonForm.content} onChange={(e) => setLessonForm((f) => ({ ...f, content: e.target.value }))} rows={6} className="mt-1 max-h-72 w-full resize-y overflow-y-auto rounded-lg border border-zinc-300 px-4 py-2 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100" />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button type="button" onClick={() => setShowLessonModal(false)} className="rounded-lg border border-zinc-300 px-4 py-2 text-sm dark:border-zinc-600">Hủy</button>
              <button type="button" onClick={saveLesson} disabled={saving || uploadingVideo || !lessonForm.title.trim()} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50 dark:bg-emerald-500">{saving ? 'Đang lưu...' : 'Lưu'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Exercise modal */}
      {showExerciseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-4 dark:bg-zinc-900 sm:p-6">
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              {editingExercise ? 'Sửa bài tập' : 'Thêm bài tập'}
            </h3>
            {exerciseFormError && (
              <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
                {exerciseFormError}
              </div>
            )}
            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Tiêu đề</label>
                <input type="text" value={exerciseForm.title} onChange={(e) => setExerciseForm((f) => ({ ...f, title: e.target.value }))} className="mt-1 w-full rounded-lg border border-zinc-300 px-4 py-2 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100" />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Loại</label>
                <select
                  value={exerciseForm.type}
                  onChange={(e) =>
                    setExerciseForm((f) => ({
                      ...f,
                      type: e.target.value as 'quiz' | 'coding' | 'text',
                      questions: [],
                    }))
                  }
                  className="mt-1 w-full rounded-lg border border-zinc-300 px-4 py-2 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
                >
                  <option value="quiz">Trắc nghiệm</option>
                  <option value="coding">Lập trình</option>
                  <option value="text">Tự luận</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Thuộc bài học (tùy chọn)</label>
                <select value={exerciseForm.lessonId} onChange={(e) => setExerciseForm((f) => ({ ...f, lessonId: e.target.value }))} className="mt-1 w-full rounded-lg border border-zinc-300 px-4 py-2 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100">
                  <option value="">— Không gắn bài học —</option>
                  {lessons.map((l) => (
                    <option key={l._id} value={l._id}>{l.title}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-4 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  {exerciseForm.type === 'quiz' ? 'Câu hỏi trắc nghiệm' : exerciseForm.type === 'coding' ? 'Câu hỏi lập trình điền chữ' : 'Câu hỏi tự luận'}
                </h4>
                <button
                  type="button"
                  onClick={() =>
                    setExerciseForm((f) => ({
                      ...f,
                      questions: [
                        ...(f.questions || []),
                        f.type === 'quiz'
                          ? {
                              question: '',
                              inputType: 'choice',
                              options: [],
                              correctAnswer: '',
                              points: 1,
                            }
                          : f.type === 'coding'
                            ? {
                                question: '',
                                inputType: 'code_blank',
                                codeTemplate: '',
                                blanks: [{ key: 'blank_1', answer: '', placeholder: '' }],
                                points: 1,
                                caseSensitive: false,
                              }
                            : {
                                question: '',
                                inputType: 'essay',
                                points: 1,
                              },
                      ],
                    }))
                  }
                  className="inline-flex items-center gap-1 rounded-lg border border-zinc-300 px-2.5 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Thêm câu hỏi
                </button>
              </div>

              {(exerciseForm.questions || []).length === 0 ? (
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Chưa có câu hỏi nào. Bấm &quot;Thêm câu hỏi&quot; để bắt đầu tạo.
                </p>
              ) : (
                <div className="space-y-4">
                  {exerciseForm.questions.map((q, idx) => {
                    return (
                      <div
                        key={idx}
                        className="rounded-lg border border-zinc-200 bg-zinc-50/60 p-3 dark:border-zinc-700 dark:bg-zinc-900/40"
                      >
                        <div className="mb-2 flex items-center justify-between">
                          <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">Câu {idx + 1}</span>
                          <button
                            type="button"
                            onClick={() =>
                              setExerciseForm((f) => ({
                                ...f,
                                questions: (f.questions || []).filter((_, i) => i !== idx),
                              }))
                            }
                            className="text-xs text-red-600 hover:underline dark:text-red-400"
                          >
                            Xóa
                          </button>
                        </div>

                        <div className="space-y-3">
                          <div>
                            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">Nội dung câu hỏi</label>
                            <textarea
                              rows={2}
                              value={q.question || ''}
                              onChange={(e) =>
                                setExerciseForm((f) => {
                                  const questions = [...(f.questions || [])];
                                  questions[idx] = { ...q, question: e.target.value };
                                  return { ...f, questions };
                                })
                              }
                              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
                            />
                          </div>

                          {q.inputType === 'choice' && (
                            <>
                              <div>
                                <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">Các lựa chọn (mỗi dòng một đáp án)</label>
                                <textarea
                                  rows={3}
                                  value={(q.options || []).join('\n')}
                                  onChange={(e) => {
                                    const lines = e.target.value.split('\n').map((s) => s.trim()).filter(Boolean);
                                    setExerciseForm((f) => {
                                      const questions = [...(f.questions || [])];
                                      const current = q as QuizQuestion;
                                      let nextCorrect = current.correctAnswer;
                                      if (nextCorrect && !lines.includes(nextCorrect)) nextCorrect = '';
                                      questions[idx] = { ...current, options: lines, correctAnswer: nextCorrect };
                                      return { ...f, questions };
                                    });
                                  }}
                                  placeholder={'A\nB\nC\nD'}
                                  className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
                                />
                              </div>
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">Đáp án đúng</label>
                                  <select
                                    value={q.correctAnswer || ''}
                                    onChange={(e) =>
                                      setExerciseForm((f) => {
                                        const questions = [...(f.questions || [])];
                                        questions[idx] = { ...(q as QuizQuestion), correctAnswer: e.target.value };
                                        return { ...f, questions };
                                      })
                                    }
                                    className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
                                  >
                                    <option value="">— Chọn đáp án đúng —</option>
                                    {(q.options || []).map((opt, oIdx) => (
                                      <option key={oIdx} value={opt}>{opt}</option>
                                    ))}
                                  </select>
                                </div>
                                <div>
                                  <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">Số điểm</label>
                                  <input
                                    type="number"
                                    min={0}
                                    value={q.points ?? 1}
                                    onChange={(e) =>
                                      setExerciseForm((f) => {
                                        const questions = [...(f.questions || [])];
                                        questions[idx] = { ...(q as QuizQuestion), points: Math.max(0, Number(e.target.value) || 0) };
                                        return { ...f, questions };
                                      })
                                    }
                                    className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
                                  />
                                </div>
                              </div>
                            </>
                          )}

                          {q.inputType === 'essay' && (
                            <div>
                              <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">Số điểm</label>
                              <input
                                type="number"
                                min={0}
                                value={q.points ?? 1}
                                onChange={(e) =>
                                  setExerciseForm((f) => {
                                    const questions = [...(f.questions || [])];
                                    questions[idx] = { ...(q as EssayQuestion), points: Math.max(0, Number(e.target.value) || 0) };
                                    return { ...f, questions };
                                  })
                                }
                                className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
                              />
                              <p className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-400">Câu tự luận sẽ ở trạng thái chờ giảng viên/admin chấm.</p>
                            </div>
                          )}

                          {q.inputType === 'code_blank' && (
                            <>
                              <div>
                                <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">Đoạn code mẫu (dùng {'{{blank_1}}'}, {'{{blank_2}}'}...)</label>
                                <textarea
                                  rows={5}
                                  value={q.codeTemplate || ''}
                                  onChange={(e) =>
                                    setExerciseForm((f) => {
                                      const questions = [...(f.questions || [])];
                                      questions[idx] = { ...(q as CodingQuestion), codeTemplate: e.target.value };
                                      return { ...f, questions };
                                    })
                                  }
                                  className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 font-mono text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
                                />
                              </div>

                              <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">Các ô điền</label>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setExerciseForm((f) => {
                                        const questions = [...(f.questions || [])];
                                        const current = q as CodingQuestion;
                                        const nextIndex = (current.blanks?.length || 0) + 1;
                                        questions[idx] = {
                                          ...current,
                                          blanks: [
                                            ...(current.blanks || []),
                                            { key: `blank_${nextIndex}`, answer: '', placeholder: '' },
                                          ],
                                        };
                                        return { ...f, questions };
                                      })
                                    }
                                    className="text-xs text-emerald-700 hover:underline dark:text-emerald-400"
                                  >
                                    + Thêm ô trống
                                  </button>
                                </div>
                                {(q.blanks || []).map((blank, bIdx) => (
                                  <div key={bIdx} className="grid grid-cols-12 gap-2">
                                    <input
                                      type="text"
                                      value={blank.key}
                                      onChange={(e) =>
                                        setExerciseForm((f) => {
                                          const questions = [...(f.questions || [])];
                                          const current = q as CodingQuestion;
                                          const nextBlanks = [...(current.blanks || [])];
                                          nextBlanks[bIdx] = { ...nextBlanks[bIdx], key: e.target.value.replace(/\s+/g, '_') };
                                          questions[idx] = { ...current, blanks: nextBlanks };
                                          return { ...f, questions };
                                        })
                                      }
                                      placeholder="blank_1"
                                      className="col-span-3 rounded-lg border border-zinc-300 px-2 py-1.5 text-xs dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
                                    />
                                    <input
                                      type="text"
                                      value={blank.answer}
                                      onChange={(e) =>
                                        setExerciseForm((f) => {
                                          const questions = [...(f.questions || [])];
                                          const current = q as CodingQuestion;
                                          const nextBlanks = [...(current.blanks || [])];
                                          nextBlanks[bIdx] = { ...nextBlanks[bIdx], answer: e.target.value };
                                          questions[idx] = { ...current, blanks: nextBlanks };
                                          return { ...f, questions };
                                        })
                                      }
                                      placeholder="Đáp án"
                                      className="col-span-4 rounded-lg border border-zinc-300 px-2 py-1.5 text-xs dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
                                    />
                                    <input
                                      type="text"
                                      value={blank.placeholder}
                                      onChange={(e) =>
                                        setExerciseForm((f) => {
                                          const questions = [...(f.questions || [])];
                                          const current = q as CodingQuestion;
                                          const nextBlanks = [...(current.blanks || [])];
                                          nextBlanks[bIdx] = { ...nextBlanks[bIdx], placeholder: e.target.value };
                                          questions[idx] = { ...current, blanks: nextBlanks };
                                          return { ...f, questions };
                                        })
                                      }
                                      placeholder="Gợi ý"
                                      className="col-span-4 rounded-lg border border-zinc-300 px-2 py-1.5 text-xs dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
                                    />
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setExerciseForm((f) => {
                                          const questions = [...(f.questions || [])];
                                          const current = q as CodingQuestion;
                                          const nextBlanks = (current.blanks || []).filter((_, x) => x !== bIdx);
                                          questions[idx] = { ...current, blanks: nextBlanks };
                                          return { ...f, questions };
                                        })
                                      }
                                      className="col-span-1 text-xs text-red-600 hover:underline dark:text-red-400"
                                    >
                                      X
                                    </button>
                                  </div>
                                ))}
                              </div>

                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">Số điểm</label>
                                  <input
                                    type="number"
                                    min={0}
                                    value={q.points ?? 1}
                                    onChange={(e) =>
                                      setExerciseForm((f) => {
                                        const questions = [...(f.questions || [])];
                                        questions[idx] = { ...(q as CodingQuestion), points: Math.max(0, Number(e.target.value) || 0) };
                                        return { ...f, questions };
                                      })
                                    }
                                    className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
                                  />
                                </div>
                                <label className="mt-6 inline-flex items-center gap-2 text-xs text-zinc-700 dark:text-zinc-300">
                                  <input
                                    type="checkbox"
                                    checked={Boolean((q as CodingQuestion).caseSensitive)}
                                    onChange={(e) =>
                                      setExerciseForm((f) => {
                                        const questions = [...(f.questions || [])];
                                        questions[idx] = { ...(q as CodingQuestion), caseSensitive: e.target.checked };
                                        return { ...f, questions };
                                      })
                                    }
                                  />
                                  Phân biệt hoa/thường
                                </label>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button type="button" onClick={() => setShowExerciseModal(false)} className="rounded-lg border border-zinc-300 px-4 py-2 text-sm dark:border-zinc-600">Hủy</button>
              <button type="button" onClick={saveExercise} disabled={saving || !exerciseForm.title.trim()} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50 dark:bg-emerald-500">{saving ? 'Đang lưu...' : 'Lưu'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
