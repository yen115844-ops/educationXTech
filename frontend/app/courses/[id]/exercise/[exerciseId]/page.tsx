'use client';

import { useAuth } from '@/context/AuthContext';
import { apiGet, apiPost } from '@/lib/api';
import type { Exercise, Submission } from '@/types';
import {
    ArrowLeft,
    Award,
    CheckCircle2,
    Clock,
    FileText,
    RotateCcw,
    Send,
    XCircle,
} from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function ExercisePage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const courseId = params.id as string;
  const exerciseId = params.exerciseId as string;

  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) return;
    Promise.all([
      apiGet<{ exercise: Exercise }>(`/api/exercises/${exerciseId}`),
      apiGet<{ submission: Submission }>(`/api/submissions/exercise/${exerciseId}/my`).catch(() => ({
        success: false,
        data: undefined,
      })),
    ]).then(([eRes, sRes]) => {
      if (eRes.success && eRes.data?.exercise) setExercise(eRes.data.exercise);
      if (sRes.success && sRes.data?.submission) {
        setSubmission(sRes.data.submission);
        setShowResult(true);
        // Restore answers
        const answerMap: Record<number, string> = {};
        for (const a of sRes.data.submission.answers || []) {
          answerMap[a.questionIndex] = String(a.answer);
        }
        setAnswers(answerMap);
      }
      setLoading(false);
    });
  }, [user, exerciseId]);

  const handleSelectAnswer = (questionIndex: number, answer: string) => {
    if (showResult) return;
    setAnswers((prev) => ({ ...prev, [questionIndex]: answer }));
  };

  const handleSubmit = async () => {
    if (!exercise) return;
    setError('');
    setSubmitting(true);

    const answerArray = Object.entries(answers).map(([idx, answer]) => ({
      questionIndex: Number(idx),
      answer,
    }));

    const res = await apiPost<{ submission: Submission }>(`/api/submissions/${exerciseId}`, {
      answers: answerArray,
    });

    setSubmitting(false);
    if (res.success && res.data?.submission) {
      setSubmission(res.data.submission);
      setShowResult(true);
    } else {
      setError(res.message || 'Nộp bài thất bại');
    }
  };

  const handleRetry = () => {
    setShowResult(false);
    setSubmission(null);
    setAnswers({});
  };

  const answeredCount = Object.keys(answers).length;
  const totalQuestions = exercise?.questions?.length || 0;

  if (!user) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10 text-center">
        <p className="text-zinc-600 dark:text-zinc-400">Vui lòng đăng nhập để làm bài.</p>
        <Link href="/login" className="mt-4 inline-block text-emerald-600 hover:underline">
          Đăng nhập
        </Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10">
        <div className="space-y-4">
          <div className="h-10 w-64 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
          <div className="h-48 animate-pulse rounded-xl bg-zinc-200 dark:bg-zinc-800" />
          <div className="h-48 animate-pulse rounded-xl bg-zinc-200 dark:bg-zinc-800" />
        </div>
      </div>
    );
  }

  if (!exercise) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10">
        <p className="text-zinc-500">Không tìm thấy bài tập.</p>
        <Link href={`/courses/${courseId}`} className="text-emerald-600 hover:underline">
          ← Quay lại khóa học
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      {/* Header */}
      <Link
        href={`/courses/${courseId}/learn`}
        className="mb-6 inline-flex items-center gap-1 text-sm text-emerald-600 hover:underline dark:text-emerald-400"
      >
        <ArrowLeft className="h-4 w-4" />
        Quay lại khóa học
      </Link>

      <div className="mb-8 rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <FileText className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                {exercise.type === 'quiz' ? 'Trắc nghiệm' : exercise.type === 'coding' ? 'Lập trình' : 'Tự luận'}
              </span>
            </div>
            <h1 className="text-xl font-bold text-zinc-900 sm:text-2xl dark:text-zinc-100">
              {exercise.title}
            </h1>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              {totalQuestions} câu hỏi
              {exercise.deadline && (
                <span className="ml-3 inline-flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  Hạn: {new Date(exercise.deadline).toLocaleDateString('vi-VN')}
                </span>
              )}
            </p>
          </div>

          {/* Score display */}
          {showResult && submission && (
            <div className="flex items-center gap-3 rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50 px-5 py-3 dark:from-emerald-900/20 dark:to-teal-900/20">
              <Award className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
              <div>
                <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">
                  {submission.score}/{submission.totalPoints}
                </div>
                <div className="text-xs text-emerald-600 dark:text-emerald-400">
                  {submission.percentage}% đúng
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Progress bar */}
        {!showResult && (
          <div className="mt-4">
            <div className="mb-1 flex justify-between text-xs text-zinc-500 dark:text-zinc-400">
              <span>Đã trả lời {answeredCount}/{totalQuestions}</span>
              <span>{totalQuestions > 0 ? Math.round((answeredCount / totalQuestions) * 100) : 0}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all duration-300"
                style={{ width: `${totalQuestions > 0 ? (answeredCount / totalQuestions) * 100 : 0}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Questions */}
      <div className="space-y-6">
        {exercise.questions.map((q, idx) => {
          const userAnswer = answers[idx];
          const isCorrect = showResult && String(userAnswer) === String(q.correctAnswer);
          const isWrong = showResult && userAnswer !== undefined && String(userAnswer) !== String(q.correctAnswer);

          return (
            <div
              key={idx}
              className={`rounded-2xl border p-5 transition-colors sm:p-6 ${
                showResult
                  ? isCorrect
                    ? 'border-emerald-300 bg-emerald-50/50 dark:border-emerald-700 dark:bg-emerald-900/10'
                    : isWrong
                      ? 'border-red-300 bg-red-50/50 dark:border-red-700 dark:bg-red-900/10'
                      : 'border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900'
                  : 'border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900'
              }`}
            >
              <div className="mb-4 flex items-start gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-sm font-semibold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                  {idx + 1}
                </span>
                <div className="flex-1">
                  <p className="font-medium text-zinc-900 dark:text-zinc-100">{q.question}</p>
                  {q.points && q.points > 1 && (
                    <span className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">({q.points} điểm)</span>
                  )}
                </div>
                {showResult && (
                  <span className="shrink-0">
                    {isCorrect ? (
                      <CheckCircle2 className="h-6 w-6 text-emerald-500" />
                    ) : isWrong ? (
                      <XCircle className="h-6 w-6 text-red-500" />
                    ) : (
                      <XCircle className="h-6 w-6 text-zinc-300 dark:text-zinc-600" />
                    )}
                  </span>
                )}
              </div>

              {/* Options */}
              {q.options && q.options.length > 0 ? (
                <div className="ml-10 space-y-2">
                  {q.options.map((opt, oIdx) => {
                    const optVal = opt;
                    const isSelected = userAnswer === optVal;
                    const isCorrectOption = showResult && String(q.correctAnswer) === optVal;

                    return (
                      <button
                        key={oIdx}
                        type="button"
                        disabled={showResult}
                        onClick={() => handleSelectAnswer(idx, optVal)}
                        className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm transition-all ${
                          showResult
                            ? isCorrectOption
                              ? 'border-emerald-400 bg-emerald-50 text-emerald-800 dark:border-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300'
                              : isSelected && !isCorrectOption
                                ? 'border-red-400 bg-red-50 text-red-800 dark:border-red-600 dark:bg-red-900/30 dark:text-red-300'
                                : 'border-zinc-200 text-zinc-600 dark:border-zinc-700 dark:text-zinc-400'
                            : isSelected
                              ? 'border-emerald-400 bg-emerald-50 text-emerald-800 dark:border-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-300'
                              : 'border-zinc-200 text-zinc-700 hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:border-zinc-600 dark:hover:bg-zinc-800/50'
                        }`}
                      >
                        <span
                          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 text-xs font-semibold ${
                            isSelected
                              ? showResult
                                ? isCorrectOption
                                  ? 'border-emerald-500 bg-emerald-500 text-white'
                                  : 'border-red-500 bg-red-500 text-white'
                                : 'border-emerald-500 bg-emerald-500 text-white'
                              : showResult && isCorrectOption
                                ? 'border-emerald-500 bg-emerald-500 text-white'
                                : 'border-zinc-300 dark:border-zinc-600'
                          }`}
                        >
                          {String.fromCharCode(65 + oIdx)}
                        </span>
                        <span className="flex-1">{opt}</span>
                        {showResult && isCorrectOption && (
                          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                        )}
                        {showResult && isSelected && !isCorrectOption && (
                          <XCircle className="h-4 w-4 shrink-0 text-red-500" />
                        )}
                      </button>
                    );
                  })}
                </div>
              ) : (
                /* Text input for non-quiz */
                <div className="ml-10">
                  <textarea
                    rows={3}
                    disabled={showResult}
                    placeholder="Nhập câu trả lời..."
                    value={userAnswer || ''}
                    onChange={(e) => handleSelectAnswer(idx, e.target.value)}
                    className="w-full rounded-xl border border-zinc-200 px-4 py-3 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-800 dark:focus:border-emerald-500 dark:focus:ring-emerald-900/30"
                  />
                  {showResult && q.correctAnswer != null && (
                    <p className="mt-2 text-sm text-emerald-600 dark:text-emerald-400">
                      Đáp án đúng: <strong>{String(q.correctAnswer)}</strong>
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Actions */}
      <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
        {error && <p className="w-full text-sm text-red-600 dark:text-red-400">{error}</p>}

        {!showResult ? (
          <button
            type="button"
            disabled={submitting || answeredCount === 0}
            onClick={handleSubmit}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
            {submitting ? 'Đang nộp...' : 'Nộp bài'}
          </button>
        ) : (
          <button
            type="button"
            onClick={handleRetry}
            className="inline-flex items-center gap-2 rounded-xl border border-zinc-300 px-6 py-3 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            <RotateCcw className="h-4 w-4" />
            Làm lại
          </button>
        )}

        <Link
          href={`/courses/${courseId}/learn`}
          className="text-sm text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300"
        >
          ← Quay lại học
        </Link>
      </div>
    </div>
  );
}
