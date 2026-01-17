"use client";

import { useState, useRef, useCallback } from "react";
import { Upload, X, Image as ImageIcon, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface ImageUploaderProps {
    value?: string;
    onChange: (url: string) => void;
    className?: string;
}

export default function ImageUploader({
    value,
    onChange,
    className = "",
}: ImageUploaderProps) {
    const [isDragging, setIsDragging] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [preview, setPreview] = useState<string | null>(value || null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    }, []);

    const uploadFile = async (file: File) => {
        // التحقق من نوع الملف
        const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
        if (!allowedTypes.includes(file.type)) {
            toast.error("نوع الملف غير مدعوم. استخدم JPG, PNG, WebP, أو GIF");
            return;
        }

        // التحقق من الحجم (5MB)
        if (file.size > 5 * 1024 * 1024) {
            toast.error("حجم الملف كبير جداً. الحد الأقصى 5MB");
            return;
        }

        // معاينة محلية
        const localPreview = URL.createObjectURL(file);
        setPreview(localPreview);

        setIsUploading(true);

        try {
            const formData = new FormData();
            formData.append("file", file);

            const response = await fetch("/api/admin/upload-image", {
                method: "POST",
                body: formData,
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "فشل رفع الصورة");
            }

            setPreview(data.url);
            onChange(data.url);
            toast.success("تم رفع الصورة بنجاح! ✅");
        } catch (error) {
            console.error("Upload error:", error);
            toast.error(error instanceof Error ? error.message : "فشل رفع الصورة");
            setPreview(null);
        } finally {
            setIsUploading(false);
        }
    };

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);

        const file = e.dataTransfer.files[0];
        if (file) {
            uploadFile(file);
        }
    }, []);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            uploadFile(file);
        }
    };

    const handleRemove = () => {
        setPreview(null);
        onChange("");
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    const handleClick = () => {
        fileInputRef.current?.click();
    };

    return (
        <div className={className}>
            <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={handleFileSelect}
                className="hidden"
            />

            {preview ? (
                // معاينة الصورة
                <div className="relative group">
                    <div className="aspect-video w-full rounded-xl overflow-hidden border-2 border-gray-200 bg-gray-100">
                        <img
                            src={preview}
                            alt="معاينة"
                            className="w-full h-full object-cover"
                        />
                    </div>

                    {isUploading && (
                        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm rounded-xl flex items-center justify-center">
                            <div className="flex flex-col items-center text-white">
                                <Loader2 className="h-8 w-8 animate-spin mb-2" />
                                <span className="text-sm font-medium">جاري الرفع...</span>
                            </div>
                        </div>
                    )}

                    {!isUploading && (
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100">
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={handleClick}
                                    className="p-2 bg-white rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
                                >
                                    <Upload className="h-5 w-5" />
                                </button>
                                <button
                                    type="button"
                                    onClick={handleRemove}
                                    className="p-2 bg-red-500 rounded-lg text-white hover:bg-red-600 transition-colors"
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                // منطقة الرفع
                <div
                    onClick={handleClick}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`
            aspect-video w-full rounded-xl border-2 border-dashed cursor-pointer
            flex flex-col items-center justify-center gap-3 transition-all
            ${isDragging
                            ? "border-blue-500 bg-blue-50 scale-[1.02]"
                            : "border-gray-300 bg-gray-50 hover:border-blue-400 hover:bg-blue-50/50"
                        }
          `}
                >
                    <div className={`p-3 rounded-full ${isDragging ? "bg-blue-100" : "bg-gray-100"}`}>
                        <ImageIcon className={`h-8 w-8 ${isDragging ? "text-blue-600" : "text-gray-400"}`} />
                    </div>
                    <div className="text-center">
                        <p className={`font-bold ${isDragging ? "text-blue-700" : "text-gray-700"}`}>
                            {isDragging ? "أفلت الصورة هنا" : "اسحب الصورة هنا"}
                        </p>
                        <p className="text-sm text-gray-500 mt-1">
                            أو اضغط لاختيار صورة
                        </p>
                        <p className="text-xs text-gray-400 mt-2">
                            JPG, PNG, WebP, GIF (حد أقصى 5MB)
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}
