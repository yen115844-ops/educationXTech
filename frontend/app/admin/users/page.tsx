'use client';

import { useEffect, useState } from 'react';
import { apiGet, apiPatch, apiDelete } from '@/lib/api';
import IconButton from '@/components/ui/IconButton';
import Pagination from '@/components/ui/Pagination';
import { Pencil, Trash2, Search } from 'lucide-react';
import type { User } from '@/types';

const ROLE_LABEL: Record<string, string> = {
  admin: 'Admin',
  instructor: 'Giảng viên',
  student: 'Học viên',
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(15);
  const [role, setRole] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<User | null>(null);
  const [editName, setEditName] = useState('');
  const [editRole, setEditRole] = useState<User['role']>('student');
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchUsers = () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (role) params.set('role', role);
    if (search) params.set('search', search);
    apiGet<{ users: User[]; total: number }>(`/api/users?${params}`).then((res) => {
      if (res.success && res.data) {
        setUsers(res.data.users);
        setTotal(res.data.total);
      }
      setLoading(false);
    });
  };

  useEffect(() => {
    fetchUsers();
  }, [page, role, search]);

  const totalPages = Math.ceil(total / limit) || 1;

  const handleEdit = (u: User) => {
    setEditing(u);
    setEditName(u.name);
    setEditRole(u.role);
  };

  const handleSaveEdit = async () => {
    if (!editing) return;
    setSaving(true);
    const res = await apiPatch<{ user: User }>(`/api/users/${editing._id}`, {
      name: editName,
      role: editRole,
    });
    setSaving(false);
    if (res.success && res.data?.user) {
      setUsers((prev) =>
        prev.map((u) => (u._id === editing._id ? { ...u, ...res.data!.user } : u))
      );
      setEditing(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bạn có chắc muốn xóa người dùng này?')) return;
    setDeletingId(id);
    const res = await apiDelete(`/api/users/${id}`);
    setDeletingId(null);
    if (res.success) {
      setUsers((prev) => prev.filter((u) => u._id !== id));
      setTotal((t) => Math.max(0, t - 1));
    }
  };

  return (
    <div className="min-w-0">
      <h1 className="mb-4 text-xl font-bold text-zinc-900 sm:mb-6 sm:text-2xl dark:text-zinc-100">
        Quản lý người dùng
      </h1>

      <div className="mb-4 flex flex-wrap items-center gap-2 sm:mb-6 sm:gap-3">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && (setPage(1), fetchUsers())}
          placeholder="Tên, email..."
          className="min-w-0 flex-1 rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 sm:w-52 sm:flex-none"
        />
        <select
          value={role}
          onChange={(e) => (setRole(e.target.value), setPage(1))}
          className="rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
        >
          <option value="">Tất cả vai trò</option>
          <option value="admin">Admin</option>
          <option value="instructor">Giảng viên</option>
          <option value="student">Học viên</option>
        </select>
        <IconButton
          icon={<Search className="h-4 w-4" />}
          label="Lọc"
          variant="primary"
          onClick={() => (setPage(1), fetchUsers())}
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
              <table className="w-full min-w-[500px] text-left text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800/50">
                    <th className="px-3 py-2.5 font-medium sm:px-4 sm:py-3">Email</th>
                    <th className="px-3 py-2.5 font-medium sm:px-4 sm:py-3">Tên</th>
                    <th className="px-3 py-2.5 font-medium sm:px-4 sm:py-3">Vai trò</th>
                    <th className="w-24 px-3 py-2.5 font-medium sm:w-28 sm:px-4 sm:py-3">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u._id} className="border-b border-zinc-100 dark:border-zinc-800">
                      <td className="px-3 py-2.5 sm:px-4 sm:py-3">
                        <span className="break-all">{u.email}</span>
                      </td>
                      <td className="px-3 py-2.5 sm:px-4 sm:py-3">{u.name}</td>
                      <td className="px-3 py-2.5 sm:px-4 sm:py-3">
                        <span className="rounded bg-zinc-100 px-2 py-0.5 text-xs dark:bg-zinc-800">
                          {ROLE_LABEL[u.role] ?? u.role}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 sm:px-4 sm:py-3">
                        <div className="flex items-center gap-0.5">
                          <IconButton
                            icon={<Pencil className="h-4 w-4" />}
                            label="Sửa"
                            variant="primary"
                            onClick={() => handleEdit(u)}
                          />
                          <IconButton
                            icon={<Trash2 className="h-4 w-4" />}
                            label="Xóa"
                            variant="danger"
                            onClick={() => handleDelete(u._id)}
                            disabled={deletingId === u._id}
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="border-t border-zinc-200 px-3 py-2.5 dark:border-zinc-700 sm:px-4 sm:py-3">
              <Pagination
                page={page}
                totalPages={totalPages}
                onPageChange={setPage}
                total={total}
                label="Tổng"
              />
            </div>
          </>
        )}
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-4 dark:bg-zinc-900 sm:p-6">
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Sửa người dùng</h3>
            <p className="mt-1 text-sm text-zinc-500">{editing.email}</p>
            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Tên</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-zinc-300 px-4 py-2 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Vai trò</label>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value as User['role'])}
                  className="mt-1 w-full rounded-lg border border-zinc-300 px-4 py-2 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
                >
                  <option value="admin">Admin</option>
                  <option value="instructor">Giảng viên</option>
                  <option value="student">Học viên</option>
                </select>
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
                disabled={saving}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50 dark:bg-emerald-500"
              >
                {saving ? 'Đang lưu...' : 'Lưu'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
