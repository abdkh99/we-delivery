"use client";

import { useState, useEffect } from "react";
import { Edit, Save, X, MapPin, Truck } from "lucide-react";
import { toast } from "sonner";

interface Driver {
  id: string;
  user_id: string;
  vehicle_info: string;
  region: string | null;
  active: boolean;
  users: {
    id: string;
    name: string;
    phone: string;
    email: string | null;
  };
}

export default function DriverManagementComponent() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingDriver, setEditingDriver] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{
    region: string;
    vehicle_info: string;
    active: boolean;
  }>({
    region: "",
    vehicle_info: "",
    active: true,
  });

  const regions = [
    "دمشق",
    "ريف دمشق",
    "حلب",
    "حمص",
    "حماة",
    "اللاذقية",
    "طرطوس",
    "السويداء",
    "درعا",
    "القنيطرة",
    "دير الزور",
    "الرقة",
    "إدلب",
    "الحسكة",
  ];

  useEffect(() => {
    fetchDrivers();
  }, []);

  const fetchDrivers = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/admin/drivers");
      if (!response.ok) throw new Error("Failed to fetch drivers");
      const data = await response.json();
      setDrivers(data.drivers || []);
    } catch (error) {
      console.error("Error fetching drivers:", error);
      toast.error("فشل تحميل قائمة السائقين");
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (driver: Driver) => {
    setEditingDriver(driver.id);
    setEditForm({
      region: driver.region || "",
      vehicle_info: driver.vehicle_info || "",
      active: driver.active,
    });
  };

  const cancelEdit = () => {
    setEditingDriver(null);
    setEditForm({ region: "", vehicle_info: "", active: true });
  };

  const saveDriver = async (driverId: string) => {
    try {
      const response = await fetch(`/api/admin/drivers/${driverId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(editForm),
      });

      if (!response.ok) {
        throw new Error("Failed to update driver");
      }

      await fetchDrivers();
      toast.success("تم تحديث بيانات السائق بنجاح ✅");
      cancelEdit();
    } catch (error) {
      console.error("Error updating driver:", error);
      toast.error("فشل تحديث بيانات السائق");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">إدارة السائقين</h2>
        <div className="text-sm text-gray-600">
          إجمالي السائقين: {drivers.length} | النشطين:{" "}
          {drivers.filter((d) => d.active).length}
        </div>
      </div>

      {/* Drivers Table */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  السائق
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  الهاتف
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  المركبة
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  المنطقة
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  الحالة
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  الإجراءات
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {drivers.map((driver) => (
                <tr key={driver.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <Truck className="h-5 w-5 text-blue-600" />
                      </div>
                      <div className="mr-4">
                        <div className="text-sm font-medium text-gray-900">
                          {driver.users.name}
                        </div>
                        {driver.users.email && (
                          <div className="text-sm text-gray-500">
                            {driver.users.email}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {driver.users.phone}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {editingDriver === driver.id ? (
                      <input
                        type="text"
                        value={editForm.vehicle_info}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            vehicle_info: e.target.value,
                          })
                        }
                        className="text-sm border border-gray-300 rounded px-2 py-1 w-full"
                        placeholder="نوع المركبة"
                      />
                    ) : (
                      <div className="text-sm text-gray-900">
                        {driver.vehicle_info || "—"}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {editingDriver === driver.id ? (
                      <select
                        value={editForm.region}
                        onChange={(e) =>
                          setEditForm({ ...editForm, region: e.target.value })
                        }
                        className="text-sm border border-gray-300 rounded px-2 py-1 w-full"
                      >
                        <option value="">اختر المنطقة</option>
                        {regions.map((region) => (
                          <option key={region} value={region}>
                            {region}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-gray-400" />
                        <span
                          className={`text-sm ${
                            driver.region
                              ? "text-gray-900"
                              : "text-gray-400 italic"
                          }`}
                        >
                          {driver.region || "غير محدد"}
                        </span>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {editingDriver === driver.id ? (
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={editForm.active}
                          onChange={(e) =>
                            setEditForm({
                              ...editForm,
                              active: e.target.checked,
                            })
                          }
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">نشط</span>
                      </label>
                    ) : (
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          driver.active
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {driver.active ? "نشط" : "غير نشط"}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    {editingDriver === driver.id ? (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => saveDriver(driver.id)}
                          className="text-green-600 hover:text-green-900 p-1"
                          title="حفظ"
                        >
                          <Save className="h-4 w-4" />
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="text-gray-600 hover:text-gray-900 p-1"
                          title="إلغاء"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => startEdit(driver)}
                        className="text-blue-600 hover:text-blue-900 p-1"
                        title="تعديل"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {drivers.length === 0 && (
        <div className="text-center py-12 bg-white rounded-lg border">
          <Truck className="h-12 w-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-500">لا يوجد سائقين مسجلين</p>
        </div>
      )}
    </div>
  );
}
