'use client';

import IconButton from '@/components/ui/IconButton';
import Pagination from '@/components/ui/Pagination';
import { useAuth } from '@/context/AuthContext';
import { apiDelete, apiGet, apiPatch, apiPost, apiUpload } from '@/lib/api';
import { toMediaUrl } from '@/lib/media';
import type { Course } from '@/types';
import { BookOpen, ExternalLink, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

function formatPrice(n: number) {
  if (n === 0) return 'Miễn phí';
  return new Intl.NumberFormat('vi-VN').format(n) + '₫';
}

export default function AdminCoursesPage() {
  const { user } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(15);
  const [published, setPublished] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editing, setEditing] = useState<Course | null>(null);
  const [editForm, setEditForm] = useState({ title: '', description: '', price: 0, thumbnail: '' });
  const [saving, setSaving] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ title: '', description: '', price: 0, thumbnail: '' });
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [editError, setEditError] = useState('');
  const [toast, setToast] = useState<{ type: 'error' | 'success'; message: string } | null>(null);
  const [uploading, setUploading] = useState(false);

  const fetchCourses = () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (published === 'true') params.set('published', 'true');
    if (published === 'false') params.set('published', 'false');
    if (search) params.set('search', search);
    // Instructor chỉ xem khóa học của mình
    if (user?.role === 'instructor') params.set('instructorId', user._id);
    apiGet<{ courses: Course[]; total: number }>(`/api/courses?${params}`).then((res) => {
      if (res.success && res.data) {
        setCourses(res.data.courses);
        setTotal(res.data.total);
      }
      setLoading(false);
    });
  };

  useEffect(() => {
    fetchCourses();
  }, [page, published, search]);

  const totalPages = Math.ceil(total / limit) || 1;

  const handleThumbnailUpload = async (
    file: File,
    setForm: React.Dispatch<React.SetStateAction<{ title: string; description: string; price: number; thumbnail: string }>>
  ) => {
    if (!file.type.startsWith('image/')) {
      setToast({ type: 'error', message: 'Chỉ chấp nhận file ảnh.' });
      return;
    }
    setUploading(true);
    const formData = new FormData();
    formData.append('thumbnail', file);
    const res = await apiUpload<{ url: string }>('/api/upload/thumbnail', formData);
    setUploading(false);
    if (res.success && res.data?.url) {
      setForm((f) => ({ ...f, thumbnail: res.data!.url }));
    } else {
      setToast({ type: 'error', message: res.message || 'Upload ảnh thất bại.' });
    }
  };

  const handleTogglePublish = async (c: Course) => {
    setTogglingId(c._id);
    setToast(null);
    const res = await apiPatch<{ course: Course }>(`/api/courses/${c._id}`, {
      isPublished: !c.isPublished,
    });
    setTogglingId(null);
    if (res.success && res.data?.course) {
      setCourses((prev) =>
        prev.map((x) => (x._id === c._id ? { ...x, ...res.data!.course } : x))
      );
      setToast({ type: 'success', message: c.isPublished ? 'Đã ẩn khóa học.' : 'Đã công bố khóa học.' });
    } else {
      setToast({ type: 'error', message: res.message || 'Thao tác thất bại.' });
    }
  };

  const handleEdit = (c: Course) => {
    setEditing(c);
    setEditError('');
    setEditForm({
      title: c.title,
      description: c.description ?? '',
      price: c.price ?? 0,
      thumbnail: c.thumbnail ?? '',
    });
  };

  const handleSaveEdit = async () => {
    if (!editing) return;
    setEditError('');
    setSaving(true);
    const price = Math.max(0, Number(editForm.price) || 0);
    const res = await apiPatch<{ course: Course }>(`/api/courses/${editing._id}`, {
      title: editForm.title.trim(),
      description: editForm.description.trim(),
      price,
      thumbnail: editForm.thumbnail.trim() || null,
    });
    setSaving(false);
    if (res.success && res.data?.course) {
      setCourses((prev) =>
        prev.map((x) => (x._id === editing._id ? { ...x, ...res.data!.course } : x))
      );
      setEditing(null);
    } else {
      setEditError(res.message || 'Lưu thất bại.');
    }
  };

  const handleCreate = async () => {
    if (!createForm.title.trim()) return;
    setCreateError('');
    setCreating(true);
    const price = Math.max(0, Number(createForm.price) || 0);
    const res = await apiPost<{ course: Course }>('/api/courses', {
      title: createForm.title.trim(),
      description: createForm.description.trim() || '',
      price,
      thumbnail: createForm.thumbnail.trim() || null,
    });
    setCreating(false);
    if (res.success) {
      setShowCreate(false);
      setCreateForm({ title: '', description: '', price: 0, thumbnail: '' });
      setPage(1);
      fetchCourses();
    } else {
      setCreateError(res.message || 'Tạo khóa thất bại.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Xóa khóa học sẽ xóa cả bài học trong khóa. Bạn có chắc?')) return;
    setDeletingId(id);
    setToast(null);
    const res = await apiDelete(`/api/courses/${id}`);
    setDeletingId(null);
    if (res.success) {
      const wasLastOnPage = courses.length === 1 && page > 1;
      if (wasLastOnPage) setPage((p) => Math.max(1, p - 1));
      setCourses((prev) => prev.filter((c) => c._id !== id));
      setTotal((t) => Math.max(0, t - 1));
      setToast({ type: 'success', message: 'Đã xóa khóa học.' });
    } else {
      setToast({ type: 'error', message: res.message || 'Xóa thất bại.' });
    }
  };

  return (
    <div className="min-w-0">
      {toast && (
        <div
          role="alert"
          className={`mb-4 rounded-lg border px-4 py-3 text-sm ${
            toast.type === 'error'
              ? 'border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/50 dark:text-red-200'
              : 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-200'
          }`}
        >
          {toast.message}
          <button
            type="button"
            onClick={() => setToast(null)}
            className="ml-2 font-medium underline focus:outline-none"
          >
            Đóng
          </button>
        </div>
      )}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-4 sm:mb-6">
        <h1 className="text-xl font-bold text-zinc-900 sm:text-2xl dark:text-zinc-100">
          Quản lý khóa học
        </h1>
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600"
        >
          <Plus className="h-4 w-4" />
          Thêm khóa học
        </button>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2 sm:mb-6 sm:gap-3">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && (setPage(1), fetchCourses())}
          placeholder="Tên, mô tả..."
          className="min-w-0 flex-1 rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 sm:w-52 sm:flex-none"
        />
        <select
          value={published}
          onChange={(e) => (setPublished(e.target.value), setPage(1))}
          className="rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
        >
          <option value="">Tất cả</option>
          <option value="true">Đã công bố</option>
          <option value="false">Chưa công bố</option>
        </select>
        <IconButton
          icon={<Search className="h-4 w-4" />}
          label="Lọc"
          variant="primary"
          onClick={() => (setPage(1), fetchCourses())}
          className="bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600"
        />
      </div>

      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        {loading ? (
          <div className="flex h-48 items-center justify-center sm:h-64">
            <span className="text-zinc-500">Đang tải...</span>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-left text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800/50">
                    <th className="px-3 py-2.5 font-medium sm:px-4 sm:py-3">Khóa học</th>
                    <th className="hidden px-3 py-2.5 font-medium md:table-cell sm:px-4 sm:py-3">Giảng viên</th>
                    <th className="px-3 py-2.5 font-medium sm:px-4 sm:py-3">Giá</th>
                    <th className="px-3 py-2.5 font-medium sm:px-4 sm:py-3">Công bố</th>
                    <th className="w-36 px-3 py-2.5 font-medium sm:w-40 sm:px-4 sm:py-3">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {courses.map((c) => {
                    const instructor = typeof c.instructorId === 'object' ? c.instructorId : null;
                    return (
                      <tr key={c._id} className="border-b border-zinc-100 dark:border-zinc-800">
                        <td className="px-3 py-2.5 sm:px-4 sm:py-3">
                          <Link
                            href={`/courses/${c._id}`}
                            className="font-medium text-emerald-600 hover:underline dark:text-emerald-400 line-clamp-1 max-w-[180px] sm:max-w-none"
                          >
                            {c.title}
                          </Link>
                        </td>
                        <td className="hidden px-3 py-2.5 md:table-cell sm:px-4 sm:py-3">{instructor?.name ?? '—'}</td>
                        <td className="whitespace-nowrap px-3 py-2.5 text-xs sm:px-4 sm:py-3 sm:text-sm">{formatPrice(c.price)}</td>
                        <td className="px-3 py-2.5 sm:px-4 sm:py-3">
                          <button
                            type="button"
                            role="switch"
                            aria-checked={c.isPublished}
                            aria-label={c.isPublished ? 'Ẩn khóa' : 'Công bố khóa'}
                            disabled={togglingId === c._id}
                            onClick={() => handleTogglePublish(c)}
                            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
                              c.isPublished
                                ? 'border-emerald-500 bg-emerald-500'
                                : 'border-zinc-300 bg-zinc-200 dark:border-zinc-600 dark:bg-zinc-700'
                            }`}
                          >
                            <span
                              className={`pointer-events-none inline-block h-5 w-5 translate-y-0.5 rounded-full bg-white shadow transition-transform ${
                                c.isPublished ? 'translate-x-5' : 'translate-x-0.5'
                              }`}
                            />
                          </button>
                          {togglingId === c._id && (
                            <span className="ml-1 text-xs text-zinc-500">...</span>
                          )}
                        </td>
                        <td className="px-3 py-2.5 sm:px-4 sm:py-3">
                          <div className="flex flex-wrap items-center gap-0.5">
                            <Link
                              href={`/admin/courses/${c._id}`}
                              className="inline-flex items-center justify-center rounded-lg border border-zinc-300 p-2 text-zinc-600 hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-400 dark:hover:bg-zinc-800"
                              title="Bài học & Bài tập"
                            >
                              <BookOpen className="h-4 w-4" />
                            </Link>
                            <IconButton
                              icon={<Pencil className="h-4 w-4" />}
                              label="Sửa"
                              variant="primary"
                              onClick={() => handleEdit(c)}
                            />
                            <IconButton
                              icon={<Trash2 className="h-4 w-4" />}
                              label="Xóa"
                              variant="danger"
                              onClick={() => handleDelete(c._id)}
                              disabled={deletingId === c._id}
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="border-t border-zinc-200 px-3 py-2.5 dark:border-zinc-700 sm:px-4 sm:py-3">
              <Pagination page={page} totalPages={totalPages} onPageChange={setPage} total={total} label="Tổng" />
            </div>
          </>
        )}
      </div>

      {/* Edit modal */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-4 dark:bg-zinc-900 sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Sửa khóa học</h3>
              <Link
                href={`/courses/${editing._id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm font-medium text-emerald-600 hover:underline dark:text-emerald-400"
              >
                <ExternalLink className="h-4 w-4" />
                Xem trang chi tiết
              </Link>
            </div>
            {editError && (
              <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/50 dark:text-red-300">
                {editError}
              </p>
            )}
            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Ảnh bìa</label>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <label className="cursor-pointer rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800">
                    {uploading ? 'Đang tải lên...' : 'Upload ảnh'}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/gif,image/webp"
                      className="sr-only"
                      disabled={uploading}
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) handleThumbnailUpload(f, setEditForm);
                        e.target.value = '';
                      }}
                    />
                  </label>
                  <span className="text-xs text-zinc-500 dark:text-zinc-400">hoặc nhập URL</span>
                </div>
                <input
                  type="url"
                  value={editForm.thumbnail}
                  onChange={(e) => setEditForm((f) => ({ ...f, thumbnail: e.target.value }))}
                  placeholder="https://..."
                  className="mt-2 w-full rounded-lg border border-zinc-300 px-4 py-2 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
                />
                {editForm.thumbnail && (
                  <div className="mt-2 aspect-video max-w-xs overflow-hidden rounded-lg border border-zinc-200 bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800">
                    <img src={toMediaUrl(editForm.thumbnail)} alt="" className="h-full w-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Tiêu đề</label>
                <input
                  type="text"
                  value={editForm.title}
                  onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-zinc-300 px-4 py-2 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Mô tả</label>
                <textarea
                  value={editForm.description}
                  onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
                  rows={5}
                  placeholder="Mô tả chi tiết khóa học, nội dung sẽ học, đối tượng phù hợp..."
                  className="mt-1 w-full rounded-lg border border-zinc-300 px-4 py-2 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Giá (₫)</label>
                <input
                  type="number"
                  min={0}
                  value={editForm.price}
                  onChange={(e) => setEditForm((f) => ({ ...f, price: Number(e.target.value) || 0 }))}
                  className="mt-1 w-full rounded-lg border border-zinc-300 px-4 py-2 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
                />
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">Để 0 nếu khóa học miễn phí.</p>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="rounded-lg border border-zinc-300 px-4 py-2 text-sm dark:border-zinc-600"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                disabled={saving || !editForm.title.trim()}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50 dark:bg-emerald-500"
              >
                {saving ? 'Đang lưu...' : 'Lưu'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-4 dark:bg-zinc-900 sm:p-6">
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Thêm khóa học</h3>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              Điền đầy đủ thông tin giống trang chi tiết khóa học. Sau khi tạo có thể thêm bài học và bài tập.
            </p>
            {createError && (
              <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/50 dark:text-red-300">
                {createError}
              </p>
            )}
            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Ảnh bìa</label>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <label className="cursor-pointer rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800">
                    {uploading ? 'Đang tải lên...' : 'Upload ảnh'}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/gif,image/webp"
                      className="sr-only"
                      disabled={uploading}
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) handleThumbnailUpload(f, setCreateForm);
                        e.target.value = '';
                      }}
                    />
                  </label>
                  <span className="text-xs text-zinc-500 dark:text-zinc-400">hoặc nhập URL (tùy chọn)</span>
                </div>
                <input
                  type="url"
                  value={createForm.thumbnail}
                  onChange={(e) => setCreateForm((f) => ({ ...f, thumbnail: e.target.value }))}
                  placeholder="https://..."
                  className="mt-2 w-full rounded-lg border border-zinc-300 px-4 py-2 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
                />
                {createForm.thumbnail && (
                  <div className="mt-2 aspect-video max-w-xs overflow-hidden rounded-lg border border-zinc-200 bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800">
                    <img src={toMediaUrl(createForm.thumbnail)} alt="" className="h-full w-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Tiêu đề</label>
                <input
                  type="text"
                  value={createForm.title}
                  onChange={(e) => setCreateForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="Tên khóa học"
                  className="mt-1 w-full rounded-lg border border-zinc-300 px-4 py-2 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Mô tả</label>
                <textarea
                  value={createForm.description}
                  onChange={(e) => setCreateForm((f) => ({ ...f, description: e.target.value }))}
                  rows={5}
                  placeholder="Mô tả chi tiết khóa học, nội dung sẽ học, đối tượng phù hợp..."
                  className="mt-1 w-full rounded-lg border border-zinc-300 px-4 py-2 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Giá (₫)</label>
                <input
                  type="number"
                  min={0}
                  value={createForm.price || ''}
                  onChange={(e) => setCreateForm((f) => ({ ...f, price: Number(e.target.value) || 0 }))}
                  placeholder="0 = miễn phí"
                  className="mt-1 w-full rounded-lg border border-zinc-300 px-4 py-2 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
                />
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">Để 0 nếu khóa học miễn phí.</p>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => (setShowCreate(false), setCreateForm({ title: '', description: '', price: 0, thumbnail: '' }))}
                className="rounded-lg border border-zinc-300 px-4 py-2 text-sm dark:border-zinc-600"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleCreate}
                disabled={creating || !createForm.title.trim()}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50 dark:bg-emerald-500"
              >
                {creating ? 'Đang tạo...' : 'Tạo khóa'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
