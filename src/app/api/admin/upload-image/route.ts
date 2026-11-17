// src/app/api/admin/upload-image/route.ts
// API لرفع صور المنتجات مع ضغط تلقائي إلى WebP

import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import sharp from "sharp";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_WIDTH = 800; // أقصى عرض للصورة
const WEBP_QUALITY = 80; // جودة WebP (80 ممتازة بصرياً وصغيرة الحجم)

export async function POST(request: Request) {
    try {
        const supabase = await createClient();

        // 1. التحقق من المصادقة
        const {
            data: { user },
            error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // 2. التحقق من Admin
        const { data: userProfile } = await supabase
            .from("users")
            .select("role")
            .eq("id", user.id)
            .single();

        if (userProfile?.role !== "admin") {
            return NextResponse.json(
                { error: "Admin access required" },
                { status: 403 }
            );
        }

        // 3. قراءة الملف
        const formData = await request.formData();
        const file = formData.get("file") as File;

        if (!file) {
            return NextResponse.json({ error: "No file provided" }, { status: 400 });
        }

        // 4. التحقق من نوع الملف
        if (!ALLOWED_TYPES.includes(file.type)) {
            return NextResponse.json(
                { error: "نوع الملف غير مدعوم. استخدم JPG, PNG, WebP, أو GIF" },
                { status: 400 }
            );
        }

        // 5. التحقق من حجم الملف
        if (file.size > MAX_SIZE) {
            return NextResponse.json(
                { error: "حجم الملف كبير جداً. الحد الأقصى 5MB" },
                { status: 400 }
            );
        }

        // 6. تحويل الصورة إلى WebP مع ضغط وتصغير
        const arrayBuffer = await file.arrayBuffer();
        const inputBuffer = Buffer.from(arrayBuffer);

        const optimizedBuffer = await sharp(inputBuffer)
            .resize(MAX_WIDTH, MAX_WIDTH, {
                fit: "inside", // يحافظ على النسب، يصغّر فقط إذا كانت أكبر
                withoutEnlargement: true, // لا يكبّر الصور الصغيرة
            })
            .webp({ quality: WEBP_QUALITY })
            .toBuffer();

        const originalSizeKB = Math.round(file.size / 1024);
        const optimizedSizeKB = Math.round(optimizedBuffer.length / 1024);
        console.log(`📸 Image optimized: ${originalSizeKB}KB → ${optimizedSizeKB}KB (${Math.round((1 - optimizedBuffer.length / file.size) * 100)}% reduction)`);

        // 7. توليد اسم فريد للملف (دائماً .webp)
        const timestamp = Date.now();
        const randomId = Math.random().toString(36).substring(2, 8);
        const fileName = `product-${timestamp}-${randomId}.webp`;
        const filePath = `products/${fileName}`;

        // 8. رفع الملف المحسّن إلى Supabase Storage
        const { data: uploadData, error: uploadError } = await supabase.storage
            .from("product-images")
            .upload(filePath, optimizedBuffer, {
                contentType: "image/webp",
                cacheControl: "31536000", // cache لمدة سنة (الاسم فريد)
                upsert: false,
            });

        if (uploadError) {
            console.error("Upload error:", uploadError);
            return NextResponse.json(
                { error: "فشل رفع الصورة: " + uploadError.message },
                { status: 500 }
            );
        }

        // 9. الحصول على URL العام
        const {
            data: { publicUrl },
        } = supabase.storage.from("product-images").getPublicUrl(filePath);

        console.log("✅ Image uploaded:", publicUrl);

        return NextResponse.json({
            success: true,
            url: publicUrl,
            filename: fileName,
            path: filePath,
        });
    } catch (error) {
        console.error("Error in upload image API:", error);
        return NextResponse.json(
            { error: "حدث خطأ في رفع الصورة" },
            { status: 500 }
        );
    }
}
