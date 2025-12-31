import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { validateImageFile, sanitizeFileName } from "@/lib/validation";

/**
 * Upload proof of delivery image
 * Only accessible by drivers
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    // 1. Authentication check
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Check if user is an active driver
    const { data: driver, error: driverError } = await supabase
      .from("drivers")
      .select("id, active")
      .eq("user_id", user.id)
      .single();

    if (driverError || !driver || !driver.active) {
      return NextResponse.json(
        { error: "Driver access required" },
        { status: 403 }
      );
    }

    // 3. Parse form data
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const deliveryId = formData.get("delivery_id") as string;

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    if (!deliveryId) {
      return NextResponse.json(
        { error: "Delivery ID is required" },
        { status: 400 }
      );
    }

    // 4. Validate file
    const fileValidation = validateImageFile(file);
    if (!fileValidation.isValid) {
      return NextResponse.json(
        { error: fileValidation.error },
        { status: 400 }
      );
    }

    // 5. Verify driver owns this delivery
    const { data: delivery, error: deliveryCheckError } = await supabase
      .from("deliveries")
      .select("id, driver_id")
      .eq("id", deliveryId)
      .eq("driver_id", driver.id)
      .single();

    if (deliveryCheckError || !delivery) {
      return NextResponse.json(
        { error: "Delivery not found or not assigned to you" },
        { status: 404 }
      );
    }

    // 6. Generate safe filename
    const safeFileName = sanitizeFileName(file.name, deliveryId);
    const filePath = `delivery-proofs/${safeFileName}`;

    // 7. Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("delivery-proofs")
      .upload(filePath, file, {
        contentType: file.type,
        cacheControl: "3600",
        upsert: false, // Don't overwrite existing files
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      return NextResponse.json(
        { error: "Failed to upload file: " + uploadError.message },
        { status: 500 }
      );
    }

    // 8. Get public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from("delivery-proofs").getPublicUrl(filePath);

    console.log("✅ File uploaded successfully:", publicUrl);

    return NextResponse.json({
      success: true,
      url: publicUrl,
      filename: safeFileName,
      path: filePath,
    });
  } catch (error) {
    console.error("Error in upload proof API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
