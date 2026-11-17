"use client";

import { X } from "lucide-react";
import { useEffect, useState } from "react";

interface ConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    description: string;
    confirmText?: string;
    cancelText?: string;
    variant?: "danger" | "warning" | "info";
    isLoading?: boolean;
}

export default function ConfirmationModal({
    isOpen,
    onClose,
    onConfirm,
    title,
    description,
    confirmText = "تأكيد",
    cancelText = "إلغاء",
    variant = "danger",
    isLoading = false,
}: ConfirmationModalProps) {
    const [show, setShow] = useState(isOpen);

    useEffect(() => {
        setShow(isOpen);
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-all duration-300">
            <div
                className={`bg-white rounded-2xl w-full max-w-sm shadow-2xl transform transition-all duration-300 scale-100 opacity-100 overflow-hidden border border-gray-100`}
                role="dialog"
                aria-modal="true"
            >
                <div className="p-6 text-center">
                    {variant === "danger" && (
                        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-50 mb-4 animate-bounce-slow">
                            <svg
                                className="h-8 w-8 text-red-600"
                                fill="none"
                                viewBox="0 0 24 24"
                                strokeWidth="2"
                                stroke="currentColor"
                                aria-hidden="true"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
                                />
                            </svg>
                        </div>
                    )}

                    <h3 className="text-xl font-bold text-gray-900 mb-2">{title}</h3>

                    <p className="text-sm text-gray-500 mb-6 leading-relaxed">
                        {description}
                    </p>

                    <div className="flex flex-col gap-3">
                        <button
                            type="button"
                            className={`w-full inline-flex justify-center rounded-xl px-4 py-3.5 text-sm font-bold shadow-lg transition-all transform hover:scale-[1.02] active:scale-[0.98] ${variant === "danger"
                                    ? "bg-red-600 text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                                    : "bg-blue-600 text-white hover:bg-blue-700"
                                }`}
                            onClick={onConfirm}
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <div className="flex items-center gap-2">
                                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                    جاري المعالجة...
                                </div>
                            ) : (
                                confirmText
                            )}
                        </button>

                        <button
                            type="button"
                            className="w-full inline-flex justify-center rounded-xl bg-white px-4 py-3.5 text-sm font-bold text-gray-700 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 transition-all transform hover:scale-[1.02] active:scale-[0.98]"
                            onClick={onClose}
                            disabled={isLoading}
                        >
                            {cancelText}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
