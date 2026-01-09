"use client";

import { useState, useEffect } from "react";
import { formatCurrency } from "@/lib/utils";
import { Plus, Edit, Trash2, Check, X } from "lucide-react";
import { toast } from "sonner";

type CommissionSetting = {
  id: string;
  min_order_amount: number;
  max_order_amount: number | null;
  commission_percentage: number;
  is_active: boolean;
};

export default function CommissionSettings() {
  const [settings, setSettings] = useState<CommissionSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState({
    min_order_amount: 0,
    max_order_amount: null as number | null,
    commission_percentage: 0,
    is_active: true,
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await fetch("/api/admin/commission-settings");
      if (response.ok) {
        const data = await response.json();
        setSettings(data.settings || []);
      }
    } catch (error) {
      toast.error("فشل تحميل الإعدادات");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      const response = await fetch("/api/admin/commission-settings", {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingId ? { ...formData, id: editingId } : formData),
      });

      if (response.ok) {
        toast.success(editingId ? "تم التحديث" : "تم الإضافة");
        fetchSettings();
        resetForm();
      } else {
        toast.error("فشلت العملية");
      }
    } catch (error) {
      toast.error("حدث خطأ");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("هل أنت متأكد؟")) return;
    try {
      const response = await fetch(`/api/admin/commission-settings?id=${id}`, { method: "DELETE" });
      if (response.ok) {
        toast.success("تم الحذف");
        fetchSettings();
      }
    } catch (error) {
      toast.error("حدث خطأ");
    }
  };

  const startEdit = (setting: CommissionSetting) => {
    setEditingId(setting.id);
    setFormData({
      min_order_amount: setting.min_order_amount,
      max_order_amount: setting.max_order_amount,
      commission_percentage: setting.commission_percentage,
      is_active: setting.is_active,
    });
    setIsAdding(false);
  };

  const resetForm = () => {
    setEditingId(null);
    setIsAdding(false);
    setFormData({ min_order_amount: 0, max_order_amount: null, commission_percentage: 0, is_active: true });
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">إعدادات عمولة المنصة</h2>
        </div>
        {!isAdding && !editingId && (
          <button onClick={() => setIsAdding(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2">
            <Plus className="h-4 w-4" />إضافة شريحة
          </button>
        )}
      </div>

      {(isAdding || editingId) && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">{editingId ? "تعديل" : "إضافة"}</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">من مبلغ</label>
              <input type="number" value={formData.min_order_amount} onChange={(e) => setFormData({ ...formData, min_order_amount: Number(e.target.value) })} className="w-full px-3 py-2 border rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">إلى مبلغ</label>
              <input type="number" value={formData.max_order_amount || ""} onChange={(e) => setFormData({ ...formData, max_order_amount: e.target.value ? Number(e.target.value) : null })} placeholder="بدون حد" className="w-full px-3 py-2 border rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">العمولة %</label>
              <input type="number" step="0.1" value={formData.commission_percentage} onChange={(e) => setFormData({ ...formData, commission_percentage: Number(e.target.value) })} className="w-full px-3 py-2 border rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">الحالة</label>
              <select value={formData.is_active ? "active" : "inactive"} onChange={(e) => setFormData({ ...formData, is_active: e.target.value === "active" })} className="w-full px-3 py-2 border rounded-lg">
                <option value="active">نشط</option>
                <option value="inactive">غير نشط</option>
              </select>
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button onClick={handleSave} className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 flex items-center gap-2"><Check className="h-4 w-4" />حفظ</button>
            <button onClick={resetForm} className="bg-gray-300 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-400 flex items-center gap-2"><X className="h-4 w-4" />إلغاء</button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase">من مبلغ</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase">إلى مبلغ</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase">العمولة</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase">مثال</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase">الحالة</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase">إجراءات</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {settings.map((s) => {
              const ex = s.min_order_amount + (s.max_order_amount ? (s.max_order_amount - s.min_order_amount) / 2 : 10000);
              const exC = Math.floor(ex * (s.commission_percentage / 100));
              return (
                <tr key={s.id} className={!s.is_active ? "opacity-50" : ""}>
                  <td className="px-6 py-4 text-sm">{formatCurrency(s.min_order_amount)}</td>
                  <td className="px-6 py-4 text-sm">{s.max_order_amount ? formatCurrency(s.max_order_amount) : "∞"}</td>
                  <td className="px-6 py-4 text-sm font-semibold text-blue-600">{s.commission_percentage}%</td>
                  <td className="px-6 py-4 text-sm"><div className="flex flex-col"><span>{formatCurrency(ex)}</span><span className="text-green-600">→ {formatCurrency(exC)}</span></div></td>
                  <td className="px-6 py-4"><span className={`px-2.5 py-0.5 rounded-full text-xs ${s.is_active ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}`}>{s.is_active ? "نشط" : "غير نشط"}</span></td>
                  <td className="px-6 py-4 space-x-2">
                    <button onClick={() => startEdit(s)} className="text-blue-600 hover:text-blue-900 ml-3"><Edit className="h-4 w-4" /></button>
                    <button onClick={() => handleDelete(s.id)} className="text-red-600 hover:text-red-900"><Trash2 className="h-4 w-4" /></button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
