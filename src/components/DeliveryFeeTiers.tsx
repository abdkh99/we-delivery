"use client";
import { useState, useEffect } from "react";
import { formatCurrency } from "@/lib/utils";
import { Plus, Edit, Trash2, Check, X, Truck } from "lucide-react";
import { toast } from "sonner";
import { Database } from "@/types/database";
type DeliveryFeeTier = Database["public"]["Tables"]["delivery_fee_tiers"]["Row"];
export default function DeliveryFeeTiers() {
    const [tiers, setTiers] = useState<DeliveryFeeTier[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [isAdding, setIsAdding] = useState(false);
    const [formData, setFormData] = useState({
        min_order_amount: 0,
        max_order_amount: null as number | null,
        delivery_fee: 0,
        is_active: true,
    });
    useEffect(() => {
        fetchTiers();
    }, []);
    const fetchTiers = async () => {
        try {
            const response = await fetch("/api/admin/delivery-fee-tiers");
            if (response.ok) {
                const data = await response.json();
                setTiers(data.tiers || []);
            }
        } catch (error) {
            toast.error("فشل تحميل فئات التوصيل");
        } finally {
            setLoading(false);
        }
    };
    const handleSave = async () => {
        try {
            const response = await fetch("/api/admin/delivery-fee-tiers", {
                method: editingId ? "PATCH" : "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(editingId ? { ...formData, id: editingId } : formData),
            });
            if (response.ok) {
                toast.success(editingId ? "تم التحديث" : "تم الإضافة");
                fetchTiers();
                resetForm();
            } else {
                toast.error("فشلت العملية");
            }
        } catch (error) {
            toast.error("حدث خطأ");
        }
    };
    const handleDelete = async (id: string) => {
        if (!confirm("هل أنت متأكد من حذف هذه الفئة؟")) return;
        try {
            const response = await fetch(`/api/admin/delivery-fee-tiers?id=${id}`, { method: "DELETE" });
            if (response.ok) {
                toast.success("تم الحذف");
                fetchTiers();
            }
        } catch (error) {
            toast.error("حدث خطأ");
        }
    };
    const startEdit = (tier: DeliveryFeeTier) => {
        setEditingId(tier.id);
        setFormData({
            min_order_amount: tier.min_order_amount,
            max_order_amount: tier.max_order_amount,
            delivery_fee: tier.delivery_fee,
            is_active: tier.is_active,
        });
        setIsAdding(false);
    };
    const resetForm = () => {
        setEditingId(null);
        setIsAdding(false);
        setFormData({ min_order_amount: 0, max_order_amount: null, delivery_fee: 0, is_active: true });
    };
    if (loading) {
        return <div className="flex items-center justify-center h-48"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>;
    }
    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                        <Truck className="h-5 w-5 text-orange-600" />
                        فئات رسوم التوصيل
                    </h2>
                    <p className="text-sm text-gray-600 mt-1">تحديد تكلفة التوصيل بناءً على قيمة الطلب</p>
                </div>
                {!isAdding && !editingId && (
                    <button onClick={() => setIsAdding(true)} className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 flex items-center gap-2 font-bold shadow-md transition-all">
                        <Plus className="h-4 w-4" />إضافة فئة
                    </button>
                )}
            </div>
            {(isAdding || editingId) && (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-6 animate-fadeIn">
                    <h3 className="text-lg font-semibold mb-4 text-orange-800">{editingId ? "تعديل الفئة" : "إضافة فئة جديدة"}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">من مبلغ (ل.س)</label>
                            <input type="number" value={formData.min_order_amount} onChange={(e) => setFormData({ ...formData, min_order_amount: Number(e.target.value) })} className="w-full px-3 py-2 border-2 border-orange-200 rounded-lg focus:border-orange-500 focus:outline-none transition-colors" />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">إلى مبلغ (ل.س)</label>
                            <input type="number" value={formData.max_order_amount || ""} onChange={(e) => setFormData({ ...formData, max_order_amount: e.target.value ? Number(e.target.value) : null })} placeholder="بدون حد (∞)" className="w-full px-3 py-2 border-2 border-orange-200 rounded-lg focus:border-orange-500 focus:outline-none transition-colors" />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">رسوم التوصيل (ل.س)</label>
                            <input type="number" value={formData.delivery_fee} onChange={(e) => setFormData({ ...formData, delivery_fee: Number(e.target.value) })} className="w-full px-3 py-2 border-2 border-orange-200 rounded-lg focus:border-orange-500 focus:outline-none transition-colors" />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">الحالة</label>
                            <select value={formData.is_active ? "active" : "inactive"} onChange={(e) => setFormData({ ...formData, is_active: e.target.value === "active" })} className="w-full px-3 py-2 border-2 border-orange-200 rounded-lg focus:border-orange-500 focus:outline-none transition-colors">
                                <option value="active">نشط</option>
                                <option value="inactive">غير نشط</option>
                            </select>
                        </div>
                    </div>
                    <div className="flex gap-3 mt-6">
                        <button onClick={handleSave} className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 flex items-center gap-2 font-bold shadow-md"><Check className="h-4 w-4" />حفظ</button>
                        <button onClick={resetForm} className="bg-gray-300 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-400 flex items-center gap-2 font-bold"><X className="h-4 w-4" />إلغاء</button>
                    </div>
                </div>
            )}
            <div className="bg-white rounded-lg shadow-lg overflow-hidden border border-gray-100">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gradient-to-r from-gray-50 to-orange-50">
                        <tr>
                            <th className="px-6 py-3 text-right text-xs font-black text-gray-700 uppercase">من مبلغ</th>
                            <th className="px-6 py-3 text-right text-xs font-black text-gray-700 uppercase">إلى مبلغ</th>
                            <th className="px-6 py-3 text-right text-xs font-black text-gray-700 uppercase">رسوم التوصيل</th>
                            <th className="px-6 py-3 text-right text-xs font-black text-gray-700 uppercase">الحالة</th>
                            <th className="px-6 py-3 text-right text-xs font-black text-gray-700 uppercase">إجراءات</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {tiers.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-6 py-8 text-center text-gray-500 font-medium">
                                    لا توجد فئات مضافة حالياً
                                </td>
                            </tr>
                        ) : (
                            tiers.map((tier) => (
                                <tr key={tier.id} className={`hover:bg-orange-50 transition-colors ${!tier.is_active ? "opacity-60 bg-gray-50" : ""}`}>
                                    <td className="px-6 py-4 text-sm font-bold text-gray-900">{formatCurrency(tier.min_order_amount)}</td>
                                    <td className="px-6 py-4 text-sm font-bold text-gray-900">{tier.max_order_amount ? formatCurrency(tier.max_order_amount) : "∞ (غير محدود)"}</td>
                                    <td className="px-6 py-4 text-sm font-black text-orange-600">{tier.delivery_fee === 0 ? "مجاني" : formatCurrency(tier.delivery_fee)}</td>
                                    <td className="px-6 py-4"><span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${tier.is_active ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>{tier.is_active ? "نشط" : "غير نشط"}</span></td>
                                    <td className="px-6 py-4 space-x-2">
                                        <button onClick={() => startEdit(tier)} className="text-blue-600 hover:text-blue-900 ml-3 transition-colors p-1 hover:bg-blue-50 rounded"><Edit className="h-4 w-4" /></button>
                                        <button onClick={() => handleDelete(tier.id)} className="text-red-600 hover:text-red-900 transition-colors p-1 hover:bg-red-50 rounded"><Trash2 className="h-4 w-4" /></button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}