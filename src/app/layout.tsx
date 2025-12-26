import type { Metadata } from "next";
import { Cairo } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { CartProvider } from "@/contexts/CartContext";
import { Toaster } from "sonner";

const cairo = Cairo({
  variable: "--font-cairo",
  subsets: ["arabic", "latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  icons: {
    icon: "/favicon.png" ,
  },
  title: "We Delivery",
  description: "متجرك الإلكتروني الموثوق - منتجات طازجة تصل إلى بابك",
  other: {
    'cache-control': 'no-cache, no-store, must-revalidate',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl">
      <body className={`${cairo.variable} antialiased overflow-x-hidden`}>
        <AuthProvider>
          <CartProvider>
            {children}
            <Toaster
              position="top-center"
              toastOptions={
                {
                  style: {
                    outline: "none",
                    background: "white",
                    color: "black",
                  },
                  error: {
                    style: {
                      background: "#fee2e2",
                      color: "#991b1b",
                      border: "1px solid #fecaca",
                    },
                  },
                  success: {
                    style: {
                      background: "#dcfce7",
                      color: "#166534",
                      border: "1px solid #bbf7d0",
                    },
                  },
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                } as any
              }
            />
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
