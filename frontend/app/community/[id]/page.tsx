'use client';

import { useAuth } from '@/context/AuthContext';
import { apiDelete, apiGet, apiPatch, apiPost } from '@/lib/api';
import { toMediaUrl } from '@/lib/media';
import type { Comment, Post } from '@/types';
import { Check, Pencil, Trash2, User, X } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

function formatDate(s: string) {
  return new Date(s).toLocaleDateString('vi-VN');
}

export default function PostDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const { user } = useAuth();
  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    apiGet<{ post: Post; comments: Comment[] }>(`/api/posts/${id}`).then((res) => {
      if (res.success && res.data) {
        setPost(res.data.post);
        setComments(res.data.comments || []);
      }
      setLoading(false);
    });
  }, [id]);

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newComment.trim()) return;
    setSubmitting(true);
    const res = await apiPost<{ comment: Comment }>(`/api/comments/post/${id}`, {
      content: newComment.trim(),
    });
    setSubmitting(false);
    if (res.success && res.data?.comment) {
      setComments((prev) => [...prev, res.data!.comment!]);
      setNewComment('');
    }
  };

  const handleEditComment = async (commentId: string) => {
    if (!editingContent.trim()) return;
    setSavingEdit(true);
    const res = await apiPatch<{ comment: Comment }>(`/api/comments/${commentId}`, {
      content: editingContent.trim(),
    });
    setSavingEdit(false);
    if (res.success && res.data?.comment) {
      setComments((prev) => prev.map((c) => (c._id === commentId ? res.data!.comment! : c)));
      setEditingCommentId(null);
      setEditingContent('');
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm('Xóa bình luận này?')) return;
    setDeletingId(commentId);
    const res = await apiDelete(`/api/comments/${commentId}`);
    setDeletingId(null);
    if (res.success) {
      setComments((prev) => prev.filter((c) => c._id !== commentId));
    }
  };

  if (loading || !post) {
    return (
      <div className="w-full px-4 py-10 sm:px-6 lg:px-8">
        <div className="h-96 animate-pulse rounded-xl bg-zinc-200 dark:bg-zinc-800" />
      </div>
    );
  }

  const author = typeof post.userId === 'object' ? post.userId : null;
  const course = typeof post.courseId === 'object' ? post.courseId : null;

  return (
    <div className="w-full px-4 py-10 sm:px-6 lg:px-8">
      <Link
        href="/community"
        className="mb-6 inline-block text-sm text-emerald-600 hover:underline dark:text-emerald-400"
      >
        ← Cộng đồng
      </Link>
      <article className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{post.title}</h1>
          {user && author && user._id === author._id && (
            <Link
              href={`/community/${id}/edit`}
              className="inline-flex items-center gap-1 rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              <Pencil className="h-4 w-4" />
              Sửa bài
            </Link>
          )}
        </div>
        <div className="mt-2 flex items-center gap-3 text-sm text-zinc-500 dark:text-zinc-400">
          {author && (
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700">
                {author.avatar ? (
                  <img src={toMediaUrl(author.avatar)} alt="" className="h-full w-full object-cover" />
                ) : (
                  <User className="h-4 w-4 text-zinc-500 dark:text-zinc-400" aria-hidden />
                )}
              </div>
              <span>{author.name}</span>
            </div>
          )}
          {course && <span>· {course.title}</span>}
          <span>{formatDate(post.createdAt)}</span>
          <span className="rounded bg-zinc-100 px-1.5 py-0.5 dark:bg-zinc-800">
            {post.type === 'question' ? 'Hỏi đáp' : 'Chia sẻ'}
          </span>
        </div>
        <div className="mt-4 whitespace-pre-wrap text-zinc-600 dark:text-zinc-400">
          {post.content}
        </div>
      </article>

      <section className="mt-8">
        <h2 className="mb-4 font-semibold text-zinc-900 dark:text-zinc-100">
          Bình luận ({comments.length})
        </h2>
        {user && (
          <form onSubmit={handleSubmitComment} className="mb-6">
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Viết bình luận..."
              rows={3}
              className="w-full rounded-lg border border-zinc-300 px-4 py-2 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
              required
            />
            <button
              type="submit"
              disabled={submitting}
              className="mt-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50 dark:bg-emerald-500"
            >
              {submitting ? 'Đang gửi...' : 'Gửi bình luận'}
            </button>
          </form>
        )}
        <ul className="space-y-4">
          {comments.map((c) => {
            const u = typeof c.userId === 'object' ? c.userId : null;
            const canEdit = user && u && user._id === u._id;
            const canDelete = user && (user.role === 'admin' || (u && user._id === u._id));
            const isEditing = editingCommentId === c._id;

            return (
              <li
                key={c._id}
                className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
                    {u ? (
                      <>
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700">
                          {u.avatar ? (
                            <img src={toMediaUrl(u.avatar)} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <User className="h-4 w-4 text-zinc-500 dark:text-zinc-400" aria-hidden />
                          )}
                        </div>
                        <div className="min-w-0">
                          <span className="font-medium text-zinc-700 dark:text-zinc-300">{u.name}</span>
                          <span className="ml-1.5">{formatDate(c.createdAt)}</span>
                        </div>
                      </>
                    ) : (
                      <span>{formatDate(c.createdAt)}</span>
                    )}
                  </div>
                  {!isEditing && (
                    <div className="flex items-center gap-1">
                      {canEdit && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingCommentId(c._id);
                            setEditingContent(c.content);
                          }}
                          className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
                          title="Sửa"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                      )}
                      {canDelete && (
                        <button
                          type="button"
                          disabled={deletingId === c._id}
                          onClick={() => handleDeleteComment(c._id)}
                          className="rounded p-1 text-zinc-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400"
                          title="Xóa"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
                {isEditing ? (
                  <div className="mt-2">
                    <textarea
                      value={editingContent}
                      onChange={(e) => setEditingContent(e.target.value)}
                      rows={2}
                      className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
                    />
                    <div className="mt-2 flex gap-2">
                      <button
                        type="button"
                        disabled={savingEdit}
                        onClick={() => handleEditComment(c._id)}
                        className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                      >
                        <Check className="h-3.5 w-3.5" />
                        {savingEdit ? 'Đang lưu...' : 'Lưu'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingCommentId(null);
                          setEditingContent('');
                        }}
                        className="inline-flex items-center gap-1 rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-medium dark:border-zinc-600"
                      >
                        <X className="h-3.5 w-3.5" />
                        Hủy
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="mt-1 text-zinc-700 dark:text-zinc-300">{c.content}</p>
                )}
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
