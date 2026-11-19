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

  // Edit State
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

  // Add Driver State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [newDriverForm, setNewDriverForm] = useState({
    vehicle_info: "",
    region: "",
  });
  const [isSearching, setIsSearching] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

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

  // Search users debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      if (userSearchQuery.length >= 2) {
        searchUsers();
      } else {
        setSearchResults([]);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [userSearchQuery]);

  const searchUsers = async () => {
    try {
      setIsSearching(true);
      const response = await fetch(`/api/admin/users?q=${encodeURIComponent(userSearchQuery)}`);
      if (response.ok) {
        const data = await response.json();
        // Filter out users who are already drivers (client-side simple check)
        const existingDriverIds = new Set(drivers.map(d => d.user_id));
        const filteredUsers = data.users.filter((u: any) => !existingDriverIds.has(u.id));
        setSearchResults(filteredUsers);
      }
    } catch (error) {
      console.error("Error searching users:", error);
    } finally {
      setIsSearching(false);
    }
  };

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

  const handleCreateDriver = async () => {
    if (!selectedUser || !newDriverForm.vehicle_info) {
      toast.error("يرجى اختيار مستخدم وإدخال معلومات المركبة");
      return;
    }

    try {
      setIsCreating(true);
      const response = await fetch("/api/admin/drivers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: selectedUser.id,
          vehicle_info: newDriverForm.vehicle_info,
        }),
      });

      if (response.ok) {
        toast.success("تم إضافة السائق بنجاح ✅");
        await fetchDrivers();
        setIsAddModalOpen(false);
        // Reset form
        setSelectedUser(null);
        setNewDriverForm({ vehicle_info: "", region: "" });
        setUserSearchQuery("");
      } else {
        const data = await response.json();
        toast.error(data.error || "فشل إضافة السائق");
      }
    } catch (error) {
      toast.error("حدث خطأ أثناء إضافة السائق");
    } finally {
      setIsCreating(false);
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

  if (loading && drivers.length === 0) {
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
        <div className="flex items-center gap-4">
          <div className="text-sm text-gray-600">
            إجمالي السائقين: {drivers.length} | النشطين:{" "}
            {drivers.filter((d) => d.active).length}
          </div>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="adm-btn adm-btn-blue gap-2 px-4 py-2"
          >
            <Truck className="h-4 w-4" />
            إضافة سائق جديد
          </button>
        </div>
      </div>

      {/* Add Driver Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl border border-[#e7e5df] shadow-[0_8px_30px_rgba(31,36,48,0.12)] w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b bg-gray-50 flex justify-between items-center">
              <h3 className="text-xl font-bold text-gray-900">إضافة سائق جديد</h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Step 1: Select User */}
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">1. البحث عن المستخدم</label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="ابحث بالاسم أو رقم الهاتف..."
                    value={userSearchQuery}
                    onChange={(e) => setUserSearchQuery(e.target.value)}
                    className="w-full px-4 py-2 border border-[#e7e5df] rounded-xl focus:border-[#7fb9dc] focus:ring-2 focus:ring-[#dcedf8] outline-none transition-all"
                  />
                  {isSearching && (
                    <div className="absolute left-3 top-3">
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-[#7fb9dc] border-t-transparent"></div>
                    </div>
                  )}
                </div>

                {/* Search Results */}
                {userSearchQuery.length >= 2 && !selectedUser && (
                  <div className="mt-2 border rounded-xl max-h-48 overflow-y-auto bg-gray-50/50">
                    {searchResults.length > 0 ? (
                      searchResults.map((user) => (
                        <div
                          key={user.id}
                          onClick={() => {
                            setSelectedUser(user);
                            setUserSearchQuery("");
                          }}
                          className="p-3 hover:bg-blue-50 cursor-pointer border-b last:border-0 flex justify-between items-center"
                        >
                          <div>
                            <p className="font-bold text-gray-900">{user.name}</p>
                            <p className="text-xs text-gray-500">{user.phone}</p>
                          </div>
                          <span className="text-xs bg-gray-200 px-2 py-1 rounded-full text-gray-600">
                            {user.role}
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className="p-4 text-center text-gray-500 text-sm">
                        {isSearching ? "جاري البحث..." : "لا يوجد مستخدمين بهذا الاسم"}
                      </div>
                    )}
                  </div>
                )}

                {/* Selected User */}
                {selectedUser && (
                  <div className="mt-2 bg-blue-50 border border-blue-200 rounded-xl p-3 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 bg-blue-200 rounded-full flex items-center justify-center text-blue-700 font-bold">
                        {selectedUser.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-bold text-blue-900">{selectedUser.name}</p>
                        <p className="text-xs text-blue-700">{selectedUser.phone}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setSelectedUser(null)}
                      className="text-red-500 hover:text-red-700 text-sm font-bold px-2"
                    >
                      تغيير
                    </button>
                  </div>
                )}
              </div>

              {/* Step 2: Vehicle Info */}
              {selectedUser && (
                <div className="space-y-4 animate-in slide-in-from-top-2 fade-in duration-300">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700">2. معلومات المركبة</label>
                    <input
                      type="text"
                      placeholder="مثال: كيا ريو - بيضاء - 123456"
                      value={newDriverForm.vehicle_info}
                      onChange={(e) => setNewDriverForm({ ...newDriverForm, vehicle_info: e.target.value })}
                      className="w-full px-4 py-2 border border-[#e7e5df] rounded-xl focus:border-[#7fb9dc] focus:ring-2 focus:ring-[#dcedf8] outline-none transition-all"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 border-t bg-gray-50 flex gap-3 justify-end">
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="px-4 py-2 rounded-xl font-bold text-gray-600 hover:bg-gray-200 transition-colors"
              >
                إلغاء
              </button>
              <button
                onClick={handleCreateDriver}
                disabled={!selectedUser || !newDriverForm.vehicle_info || isCreating}
                className="adm-btn adm-btn-blue gap-2 px-6 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isCreating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-[#1f4e6b] border-t-transparent"></div>
                    جاري الإضافة...
                  </>
                ) : (
                  "تأكيد وإضافة"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

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
                          className={`text-sm ${driver.region
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
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${driver.active
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

      {drivers.length === 0 && !loading && (
        <div className="text-center py-12 bg-white rounded-lg border">
          <Truck className="h-12 w-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-500">لا يوجد سائقين مسجلين</p>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="mt-4 text-blue-600 hover:text-blue-800 font-bold"
          >
            إضافة سائق جديد
          </button>
        </div>
      )}
    </div>
  );
}
