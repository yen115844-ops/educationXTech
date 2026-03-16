'use client';

import { apiGet, apiPatch } from '@/lib/api';
import { toMediaUrl } from '@/lib/media';
import type { Course, Exercise, Submission } from '@/types';
import {
    Award,
    CheckCircle2,
    ChevronLeft,
    FileText,
    Filter,
    Pencil,
    TrendingUp,
    User,
    Users,
    X,
} from 'lucide-react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

interface PopulatedSubmission extends Omit<Submission, 'userId' | 'exerciseId'> {
  userId: { _id: string; name: string; email: string; avatar?: string };
  exerciseId: {
    _id: string;
    title: string;
    type: string;
    questions?: Array<{
      question: string;
      inputType?: 'choice' | 'essay' | 'code_blank';
      options?: string[];
      correctAnswer?: unknown;
      codeTemplate?: string;
      blanks?: Array<{ key: string; answer?: string; placeholder?: string }>;
      points?: number;
    }>;
  };
  status?: 'graded' | 'pending_review';
}

type GradeRow = {
  questionIndex: number;
  awardedPoints: number;
  maxPoints: number;
  comment: string;
};

export default function CourseSubmissionsPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const courseId = params.id as string;
  const [course, setCourse] = useState<Course | null>(null);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [submissions, setSubmissions] = useState<PopulatedSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterExerciseId, setFilterExerciseId] = useState<string>(searchParams.get('exercise') || '');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending_review' | 'graded'>('all');
  const [selectedSubmission, setSelectedSubmission] = useState<PopulatedSubmission | null>(null);
  const [gradeRows, setGradeRows] = useState<GradeRow[]>([]);
  const [reviewNote, setReviewNote] = useState('');
  const [grading, setGrading] = useState(false);
  const [gradingError, setGradingError] = useState('');

  const openReviewModal = (submission: PopulatedSubmission) => {
    const questions = submission.exerciseId?.questions || [];
    const existing = new Map((submission.grading || []).map((g) => [g.questionIndex, g]));
    const nextRows: GradeRow[] = questions.map((q, idx) => {
      const maxPoints = Math.max(0, Number(q.points) || 0);
      const current = existing.get(idx);
      return {
        questionIndex: idx,
        awardedPoints: Math.max(0, Number(current?.awardedPoints) || 0),
        maxPoints,
        comment: current?.comment || '',
      };
    });

    setSelectedSubmission(submission);
    setGradingError('');
    setGradeRows(nextRows);
    setReviewNote(submission.reviewNote || '');
  };

  const closeReviewModal = () => {
    setSelectedSubmission(null);
    setGradingError('');
    setReviewNote('');
    setGradeRows([]);
  };

  const getSubmissionMaxPoints = (submission: PopulatedSubmission) => {
    if (submission.totalPoints > 0) return submission.totalPoints;
    const questions = submission.exerciseId?.questions || [];
    return questions.reduce((sum, q) => sum + Math.max(0, Number(q.points) || 0), 0);
  };

  const getCurrentTotalMax = () => gradeRows.reduce((sum, r) => sum + Math.max(0, Number(r.maxPoints) || 0), 0);
  const getCurrentTotalAwarded = () =>
    Math.round(
      gradeRows.reduce((sum, r) => sum + Math.min(Math.max(0, Number(r.awardedPoints) || 0), Number(r.maxPoints) || 0), 0) *
        100,
    ) / 100;

  const saveGrade = async () => {
    if (!selectedSubmission) return;
    for (const row of gradeRows) {
      const points = Number(row.awardedPoints) || 0;
      if (points < 0 || points > row.maxPoints) {
        setGradingError(`Điểm câu ${row.questionIndex + 1} phải trong khoảng 0 - ${row.maxPoints}.`);
        return;
      }
    }

    setGrading(true);
    setGradingError('');
    const res = await apiPatch<{ submission: PopulatedSubmission }>(`/api/submissions/${selectedSubmission._id}/grade`, {
      perQuestionGrades: gradeRows.map((row) => ({
        questionIndex: row.questionIndex,
        awardedPoints: row.awardedPoints,
        comment: row.comment,
      })),
      reviewNote,
    });
    setGrading(false);

    if (!res.success || !res.data?.submission) {
      setGradingError(res.message || 'Chấm bài thất bại.');
      return;
    }

    setSubmissions((prev) => prev.map((s) => (s._id === selectedSubmission._id ? res.data!.submission! : s)));
    setSelectedSubmission(res.data.submission);
  };

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
    const byExercise = !filterExerciseId
      ? submissions
      : submissions.filter(
      (s) =>
        (typeof s.exerciseId === 'object' ? s.exerciseId._id : s.exerciseId) === filterExerciseId,
    );
    if (filterStatus === 'all') return byExercise;
    return byExercise.filter((s) => (s.status || 'graded') === filterStatus);
  }, [submissions, filterExerciseId, filterStatus]);

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
      <div className="mb-4 flex flex-wrap items-center gap-3">
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
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as 'all' | 'pending_review' | 'graded')}
          className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
        >
          <option value="all">Mọi trạng thái</option>
          <option value="pending_review">Chờ chấm</option>
          <option value="graded">Đã chấm</option>
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
                  <th className="px-3 py-3 font-medium sm:px-4 text-center">Trạng thái</th>
                  <th className="px-3 py-3 font-medium sm:px-4 text-center">Điểm</th>
                  <th className="px-3 py-3 font-medium sm:px-4 text-center">Phần trăm</th>
                  <th className="px-3 py-3 font-medium sm:px-4 text-center">Xem/Chấm</th>
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
                        <div className="flex items-center gap-2">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700">
                            {student.avatar ? (
                              <img src={toMediaUrl(student.avatar)} alt="" className="h-full w-full object-cover" />
                            ) : (
                              <User className="h-4 w-4 text-zinc-500 dark:text-zinc-400" aria-hidden />
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-zinc-900 dark:text-zinc-100">
                              {student.name}
                            </p>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400">
                              {student.email}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3 sm:px-4">
                        <p className="text-zinc-700 dark:text-zinc-300">{exercise.title}</p>
                        <span className="mt-0.5 inline-block rounded bg-zinc-100 px-1.5 py-0.5 text-xs text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                          {exercise.type === 'quiz' ? 'Trắc nghiệm' : exercise.type === 'coding' ? 'Lập trình điền chữ' : 'Tự luận'}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-center sm:px-4">
                        {sub.status === 'pending_review' ? (
                          <span className="inline-block rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                            Chờ chấm
                          </span>
                        ) : (
                          <span className="inline-block rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                            Đã chấm
                          </span>
                        )}
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
                      <td className="px-3 py-3 text-center sm:px-4">
                        <button
                          type="button"
                          onClick={() => openReviewModal(sub)}
                          className="inline-flex items-center gap-1 rounded-lg border border-zinc-300 px-2.5 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          Xem/Chấm
                        </button>
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

      {selectedSubmission && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900 sm:p-6">
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Chi tiết bài nộp</h3>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  {selectedSubmission.userId.name} • {selectedSubmission.exerciseId.title}
                </p>
              </div>
              <button
                type="button"
                onClick={closeReviewModal}
                className="rounded-lg p-1 text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3">
              {(selectedSubmission.exerciseId.questions || []).map((q, idx) => {
                const answerItem = (selectedSubmission.answers || []).find((a) => a.questionIndex === idx);
                const mode = q.inputType || (selectedSubmission.exerciseId.type === 'quiz' ? 'choice' : selectedSubmission.exerciseId.type === 'coding' ? 'code_blank' : 'essay');
                const gradeRow = gradeRows.find((g) => g.questionIndex === idx);
                return (
                  <div key={idx} className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-700">
                    <p className="font-medium text-zinc-900 dark:text-zinc-100">Câu {idx + 1}: {q.question}</p>
                    <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">Trả lời:</p>

                    {mode === 'code_blank' && answerItem?.answer && typeof answerItem.answer === 'object' ? (
                      <div className="mt-1 rounded bg-zinc-50 p-2 text-xs dark:bg-zinc-800/60">
                        {(q.blanks || []).map((b) => (
                          <p key={b.key}>
                            {b.key}: <span className="font-medium">{String(answerItem.answer?.[b.key] || '—')}</span>
                            {b.answer !== undefined ? (
                              <span className="text-zinc-400"> (đáp án: {b.answer || '—'})</span>
                            ) : null}
                          </p>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-1 whitespace-pre-wrap rounded bg-zinc-50 p-2 text-sm text-zinc-700 dark:bg-zinc-800/60 dark:text-zinc-200">
                        {answerItem?.answer != null ? String(answerItem.answer) : 'Chưa trả lời'}
                      </p>
                    )}

                    <div className="mt-3 grid gap-2 sm:grid-cols-[140px_1fr] sm:items-end">
                      <div>
                        <label className="text-xs text-zinc-500 dark:text-zinc-400">Điểm câu ({gradeRow?.maxPoints || 0})</label>
                        <input
                          type="number"
                          min={0}
                          step={0.5}
                          value={gradeRow?.awardedPoints ?? 0}
                          onChange={(e) => {
                            const next = Number(e.target.value) || 0;
                            setGradeRows((prev) =>
                              prev.map((g) =>
                                g.questionIndex === idx
                                  ? { ...g, awardedPoints: Math.min(Math.max(0, next), g.maxPoints) }
                                  : g,
                              ),
                            );
                          }}
                          className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-zinc-500 dark:text-zinc-400">Nhận xét câu này (tuỳ chọn)</label>
                        <input
                          type="text"
                          value={gradeRow?.comment || ''}
                          onChange={(e) =>
                            setGradeRows((prev) =>
                              prev.map((g) =>
                                g.questionIndex === idx ? { ...g, comment: e.target.value } : g,
                              ),
                            )
                          }
                          className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-5 rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800/40">
              <div className="grid gap-3 sm:grid-cols-3 sm:items-end">
                <div>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">Trạng thái</p>
                  <p className="mt-1 text-sm font-medium text-zinc-800 dark:text-zinc-200">
                    {selectedSubmission.status === 'pending_review' ? 'Chờ chấm' : 'Đã chấm'}
                  </p>
                </div>
                <div>
                  <label className="text-xs text-zinc-500 dark:text-zinc-400">Tổng điểm tự tính</label>
                  <p className="mt-1 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-semibold text-zinc-800 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100">
                    {getCurrentTotalAwarded()}
                  </p>
                </div>
                <div className="text-sm text-zinc-600 dark:text-zinc-300">
                  Tổng điểm tối đa: <strong>{getCurrentTotalMax() || getSubmissionMaxPoints(selectedSubmission)}</strong>
                </div>
              </div>
              <div className="mt-3">
                <label className="text-xs text-zinc-500 dark:text-zinc-400">Nhận xét tổng (tuỳ chọn)</label>
                <textarea
                  rows={3}
                  value={reviewNote}
                  onChange={(e) => setReviewNote(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
                />
              </div>
              {gradingError && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{gradingError}</p>}
              <div className="mt-3 flex justify-end">
                <button
                  type="button"
                  onClick={saveGrade}
                  disabled={grading}
                  className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60 dark:bg-emerald-500"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  {grading ? 'Đang lưu...' : 'Lưu điểm'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
