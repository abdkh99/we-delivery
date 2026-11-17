"use client";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import { ShoppingCart, User, LogOut, Package, Menu, X } from "lucide-react";
import NotificationBell from "./NotificationBell";
import { useState, useEffect } from "react";
import { Button } from "@mui/material";

export default function Navigation() {
  const { user, profile, signOut } = useAuth();
  const { getTotalItems } = useCart();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Fix hydration error by only rendering user-specific content after mount
  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSignOut = async () => {
    try {
      await signOut();
      // Force reload to clear all state
      setMobileOpen(false);
      window.location.href = "/";
    } catch (error) {
      console.error("Error signing out:", error);
      // Force reload anyway
      setMobileOpen(false);
      window.location.href = "/";
    }
  };

  // close mobile menu when route changes or on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <nav className="bg-white shadow-sm border-b overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link
            href="/"
            className="flex items-center flex-shrink-0 gap-2 group"
          >
            <Image
              src="/logo.png"
              alt="We DELIVER"
              width={200}
              height={48}
              priority
              className="max-md:-mr-4 h-auto w-[160px] sm:w-[180px] md:w-[200px]"
              sizes="(max-width: 768px) 160px, 200px"
            />
          </Link>

          {/* Navigation Links (desktop) */}
          <div className="hidden md:flex items-center space-x-6 max-xl:space-x-4 flex-1 justify-center">
            <Link
              href="/products"
              className="text-gray-700 hover:text-blue-600"
            >
              المنتجات
            </Link>
            {mounted && user && (
              <>
                <Link
                  href="/orders"
                  className="text-gray-700 hover:text-blue-600"
                >
                  طلباتي
                </Link>

                {profile?.role === "admin" && (
                  <Link
                    href="/admin"
                    className="text-gray-700 hover:text-blue-600"
                  >
                    لوحة التحكم
                  </Link>
                )}

                {profile?.role === "driver" && (
                  <Link
                    href="/driver"
                    className="text-gray-700 hover:text-blue-600"
                  >
                    السائق
                  </Link>
                )}
              </>
            )}
          </div>

          {/* User Actions (desktop) */}
          <div className="hidden md:flex items-center space-x-4 flex-shrink-0">
            {mounted && user ? (
              <div className="flex items-center space-x-4">
                {/* Notifications for لوحة التحكم */}
                <NotificationBell userRole={profile?.role} />

                {/* Cart */}
                <Link href="/cart" className="relative">
                  <ShoppingCart className="h-6 w-6 text-gray-700 hover:text-blue-600" />
                  {mounted && getTotalItems() > 0 && (
                    <span className="absolute -top-2 -right-2 bg-blue-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                      {getTotalItems()}
                    </span>
                  )}
                </Link>

                {/* User الملف الشخصي */}
                <div className="flex items-center space-x-2">
                  <Link
                    href="/profile"
                    className="flex items-center text-gray-700 space-x-2 hover:text-blue-600 transition-colors cursor-pointer"
                  >
                    <User className="h-5 w-5 text-gray-700" />
                    <span className="text-sm pl-2 font-medium hover:text-blue-600 text-gray-700 max-w-[10rem] truncate">
                      {profile?.name || "User"}
                    </span>
                    {profile?.points && profile.points > 0 && (
                      <p className="text-xs bg-blue-100 text-blue-800 px-4 py-1 rounded-full">
                        {profile.points} نقطة
                      </p>
                    )}
                  </Link>

                  <div
                    onClick={handleSignOut}
                    className="flex items-center space-x-1 text-gray-700 hover:text-red-600 cursor-pointer transition-colors"
                  >
                    <LogOut className="h-4 w-4" />
                    <Button variant="text" sx={{
                      color: "black",
                      ":hover": {
                        color: "red",
                        transition: "all 0.3s ease-in-out",
                      }
                    }}>تسجيل الخروج</Button>
                  </div>
                </div>
              </div>
            ) : mounted ? (
              <div className="flex items-center space-x-4">
                <Link
                  href="/login"
                  className="text-gray-700 hover:text-blue-600"
                >
                  تسجيل الدخول
                </Link>
                <Link
                  href="/signup"
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                >
                  إنشاء حساب
                </Link>
              </div>
            ) : null}
          </div>

          {/* Mobile actions: cart + burger */}
          <div className="flex items-center gap-3 md:hidden">
            <Link href="/cart" className="relative">
              <ShoppingCart className="h-6 w-6 text-gray-700 hover:text-blue-600" />
              {mounted && getTotalItems() > 0 && (
                <span className="absolute -top-2 -right-2 bg-blue-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {getTotalItems()}
                </span>
              )}
            </Link>

            <button
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileOpen}
              onClick={() => setMobileOpen((s) => !s)}
              className="text-gray-700 hover:text-blue-600 p-2 rounded-md"
            >
              {mobileOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu panel */}
      {mobileOpen && mounted && (
        <div className="md:hidden border-t bg-white shadow-sm">
          <div className="px-4 pt-4 pb-6 space-y-3">
            <Link
              href="/products"
              onClick={() => setMobileOpen(false)}
              className="block text-gray-700 hover:text-blue-600"
            >
              المنتجات
            </Link>
            {user && (
              <>
                <Link
                  href="/orders"
                  onClick={() => setMobileOpen(false)}
                  className="block text-gray-700 hover:text-blue-600"
                >
                  طلباتي
                </Link>

                {profile?.role === "admin" && (
                  <Link
                    href="/admin"
                    onClick={() => setMobileOpen(false)}
                    className="block text-gray-700 hover:text-blue-600"
                  >
                    لوحة التحكم
                  </Link>
                )}

                {profile?.role === "driver" && (
                  <Link
                    href="/driver"
                    onClick={() => setMobileOpen(false)}
                    className="block text-gray-700 hover:text-blue-600"
                  >
                    السائق
                  </Link>
                )}
              </>
            )}

            <div className="pt-2 border-t">
              {user ? (
                <div className="space-y-2">
                  <Link
                    href="/profile"
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-2 text-gray-700 hover:text-blue-600"
                  >
                    <User className="h-5 w-5" />
                    الملف الشخصي
                  </Link>

                  <button
                    onClick={handleSignOut}
                    className="flex items-center gap-2 text-gray-700 hover:text-red-600"
                  >
                    <LogOut className="h-5 w-5" />
                    تسجيل الخروج
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <Link
                    href="/login"
                    onClick={() => setMobileOpen(false)}
                    className="block text-gray-700 hover:text-blue-600"
                  >
                    تسجيل الدخول
                  </Link>
                  <Link
                    href="/signup"
                    onClick={() => setMobileOpen(false)}
                    className="block bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-center"
                  >
                    إنشاء حساب
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
