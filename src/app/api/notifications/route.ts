// src/app/api/notifications/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // هنا يمكنك جلب الإشعارات من قاعدة البيانات
    // في الوقت الحالي، سنرجع إشعارات تجريبية
    const notifications = [
      {
        id: "1",
        type: "success",
        title: "طلب جديد",
        message: "تم استلام طلب جديد من أحمد محمد",
        read: false,
        created_at: new Date().toISOString(),
      },
      {
        id: "2",
        type: "info",
        title: "تحديث السعر",
        message: "تم تحديث سعر الصرف إلى 15,000 ليرة",
        read: true,
        created_at: new Date(Date.now() - 86400000).toISOString(),
      },
    ];

    return NextResponse.json({ notifications });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
