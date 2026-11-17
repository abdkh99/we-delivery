"use client";

import React, { MouseEvent, useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface RippleButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    children: React.ReactNode;
    rippleColor?: string;
    duration?: number;
    contentClassName?: string;
}

export const RippleButton = React.forwardRef<HTMLButtonElement, RippleButtonProps>(
    (
        {
            className,
            children,
            onClick,
            rippleColor = "rgba(255, 255, 255, 0.5)",
            duration = 600,
            contentClassName,
            ...props
        },
        ref
    ) => {
        const [ripples, setRipples] = useState<{ x: number; y: number; size: number; key: number }[]>(
            []
        );

        useEffect(() => {
            if (ripples.length > 0) {
                const lastRipple = ripples[ripples.length - 1];
                const timeout = setTimeout(() => {
                    setRipples((prevRipples) =>
                        prevRipples.filter((ripple) => ripple.key !== lastRipple.key)
                    );
                }, duration);
                return () => clearTimeout(timeout);
            }
        }, [ripples, duration]);

        const createRipple = (event: MouseEvent<HTMLButtonElement>) => {
            const button = event.currentTarget;
            const rect = button.getBoundingClientRect();
            const size = Math.max(rect.width, rect.height) * 2; // Make it larger to cover corners
            const x = event.clientX - rect.left - size / 2;
            const y = event.clientY - rect.top - size / 2;

            const newRipple = {
                x,
                y,
                size,
                key: Date.now(),
            };

            setRipples((prevRipples) => [...prevRipples, newRipple]);
        };

        return (
            <button
                ref={ref}
                className={cn(
                    "relative overflow-hidden cursor-pointer transform transition-transform active:scale-[0.98]", // Added subtle press effect
                    className
                )}
                onClick={(e) => {
                    createRipple(e);
                    onClick?.(e);
                }}
                {...props}
            >
                <div className={cn("relative z-10 flex items-center justify-center gap-2 w-full h-full pointer-events-none", contentClassName)}>
                    {children}
                </div>
                <AnimatePresence>
                    {ripples.map((ripple) => (
                        <motion.span
                            key={ripple.key}
                            initial={{ scale: 0, opacity: 0.5 }}
                            animate={{ scale: 2.5, opacity: 0 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: duration / 1000, ease: "easeOut" }}
                            className="absolute rounded-full pointer-events-none bg-current"
                            style={{
                                top: ripple.y,
                                left: ripple.x,
                                width: ripple.size,
                                height: ripple.size,
                                backgroundColor: rippleColor,
                                transform: "translate(-50%, -50%)", // Centering fix
                                zIndex: 0
                            }}
                        />
                    ))}
                </AnimatePresence>
            </button>
        );
    }
);

RippleButton.displayName = "RippleButton";
