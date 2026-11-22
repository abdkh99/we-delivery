"use client";

import { useCallback, useEffect, useState } from "react";
import { Search, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

type Role = "customer" | "driver" | "admin";

interface ManagedUser {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  role: Role;
}

const ROLE_LABELS: Record<Role, string> = {
  customer: "زبون",
  driver: "سائق",
  admin: "مدير",
};

const ROLE_BADGE: Record<Role, string> = {
  customer: "bg-gray-100 text-gray-700",
  driver: "bg-blue-100 text-blue-700",
  admin: "bg-amber-100 text-amber-800",
};

// Reads a fetch Response as JSON without throwing when the server returned HTML
// (e.g. a 404/500 page), so the UI can show a meaningful message instead.
async function readJson(response: Response): Promise<any> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function httpErrorMessage(status: number, fallback: string) {
  if (status === 404)
    return "المسار غير موجود (404). تأكد من وجود ملف الـ API وأعد تشغيل السيرفر";
  if (status === 401) return "انتهت الجلسة، أعد تسجيل الدخول";
  if (status >= 500) return `خطأ في السيرفر (${status}). راجع الـ terminal`;
  return fallback;
}

export default function UserRoleManagement({
  onRoleChanged,
}: {
  onRoleChanged?: () => void;
}) {
  const { user: currentUser } = useAuth();
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  const loadUsers = useCallback(async (q: string) => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/admin/users?q=${encodeURIComponent(q)}`,
      );
      const data = await readJson(response);
      if (!response.ok) {
        throw new Error(
          data?.error ||
            httpErrorMessage(response.status, "فشل تحميل المستخدمين"),
        );
      }
      setUsers(data?.users || []);
    } catch (error) {
      console.error("Error loading users:", error);
      toast.error(
        error instanceof Error ? error.message : "فشل تحميل المستخدمين",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounced search (also does the initial load)
  useEffect(() => {
    const timer = setTimeout(() => loadUsers(query.trim()), 300);
    return () => clearTimeout(timer);
  }, [query, loadUsers]);

  const handleRoleChange = async (target: ManagedUser, newRole: Role) => {
    if (newRole === target.role) return;

    const message =
      newRole === "admin"
        ? `تحذير: سيحصل "${target.name}" على صلاحيات المدير الكاملة. هل أنت متأكد؟`
        : newRole === "driver"
          ? `تحويل "${target.name}" إلى سائق وإضافته لقائمة السائقين؟`
          : target.role === "driver"
            ? `إزالة "${target.name}" من السائقين وتحويله إلى زبون؟ سيُعطَّل في قائمة السائقين.`
            : `تغيير دور "${target.name}" إلى ${ROLE_LABELS[newRole]}؟`;

    if (!window.confirm(message)) return;

    setSavingId(target.id);
    try {
      const response = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: target.id, role: newRole }),
      });
      const data = await readJson(response);
      if (!response.ok) {
        throw new Error(
          data?.error || httpErrorMessage(response.status, "فشل تغيير الدور"),
        );
      }

      setUsers((prev) =>
        prev.map((u) => (u.id === target.id ? { ...u, role: newRole } : u)),
      );
      toast.success(`تم تغيير دور ${target.name} إلى ${ROLE_LABELS[newRole]}`);
      onRoleChanged?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "فشل تغيير الدور");
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div
      className="bg-white rounded-2xl border border-[#e7e5df] p-6 mt-6"
      dir="rtl"
    >
      <div className="flex items-center gap-3 mb-4">
        <div className="p-3 bg-amber-50 text-amber-700 rounded-xl">
          <ShieldCheck className="h-6 w-6" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-[#1f2430]">أدوار المستخدمين</h3>
          <p className="text-sm text-[#6b7280]">
            غيّر دور أي مستخدم بين زبون وسائق ومدير
          </p>
        </div>
      </div>

      <div className="relative mb-4">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="ابحث بالاسم أو الهاتف أو الإيميل..."
          className="w-full pr-10 pl-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
        />
      </div>

      {loading ? (
        <p className="text-center text-sm text-gray-500 py-6">
          جاري التحميل...
        </p>
      ) : users.length === 0 ? (
        <p className="text-center text-sm text-gray-500 py-6">
          لا يوجد مستخدمون
        </p>
      ) : (
        <div className="divide-y divide-gray-100">
          {users.map((u) => {
            const isSelf = u.id === currentUser?.id;
            return (
              <div
                key={u.id}
                className="flex flex-wrap items-center justify-between gap-3 py-3"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-[#1f2430] truncate">
                      {u.name}
                    </span>
                    {isSelf && (
                      <span className="text-xs text-gray-400">(أنت)</span>
                    )}
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${ROLE_BADGE[u.role]}`}
                    >
                      {ROLE_LABELS[u.role]}
                    </span>
                  </div>
                  <p
                    className="text-xs text-gray-500 mt-0.5"
                    dir="ltr"
                    style={{ textAlign: "right" }}
                  >
                    {u.phone || "—"} {u.email ? `· ${u.email}` : ""}
                  </p>
                </div>

                <select
                  value={u.role}
                  disabled={isSelf || savingId === u.id}
                  onChange={(e) => handleRoleChange(u, e.target.value as Role)}
                  title={isSelf ? "لا يمكنك تغيير دور حسابك" : undefined}
                  className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm bg-white disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-200"
                >
                  <option value="customer">زبون</option>
                  <option value="driver">سائق</option>
                  <option value="admin">مدير</option>
                </select>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
