"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import useSWR from "swr";
import Lottie from "lottie-react";
import { motion, useReducedMotion, useInView } from "framer-motion";
import { Phone, Clock, Package, ChevronLeft } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import Navigation from "@/components/Navigation";
import LoadingAnimation from "@/components/LoadingAnimation";
import OffersBanner from "@/components/OffersBanner";
import { fetcher } from "@/lib/fetcher";
import { formatCurrency } from "@/lib/utils";
import { getCategoryArabic } from "@/lib/translations";
import animationData from "@/animations/DeliveryTruck _Loading _Exporting.json";

interface HomeProduct {
  id: string;
  name: string;
  price: number;
  image_url: string | null;
  category: string | null;
}

const steps = [
  { title: "اختر منتجاتك", text: "تصفّح المنتجات وأضف ما تريد إلى السلة." },
  {
    title: "أكّد الطلب",
    text: "ثبّت عنوانك. رسوم التوصيل تُحدَّد حسب قيمة الطلب.",
  },
  { title: "استلمه عند بابك", text: "تابع طلبك من التحضير حتى يصلك." },
];

const btn =
  "inline-flex items-center justify-center rounded-full px-8 py-3.5 text-lg font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#0a79c4]";
const btnPrimary = `${btn} bg-[#0a79c4] text-white hover:bg-[#0868a8]`;
const btnGhost = `${btn} bg-white text-[#0b1a2a] ring-1 ring-slate-300 hover:ring-[#0a79c4]`;

function LatestProducts() {
  const { data, error, isLoading } = useSWR<{ products: HomeProduct[] }>(
    "/api/products",
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000,
    },
  );
  const items = (data?.products ?? []).slice(0, 8);

  // لا نعرض القسم إذا فشل التحميل أو لا توجد منتجات
  if (!isLoading && (error || items.length === 0)) return null;

  return (
    <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8 lg:pb-20">
      <div className="flex items-end justify-between gap-4">
        <h2 className="text-3xl font-extrabold leading-snug md:text-4xl">
          وصل حديثاً
        </h2>
        <Link
          href="/products"
          className="flex items-center gap-1 font-bold text-[#0a79c4] hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#0a79c4]"
        >
          كل المنتجات
          <ChevronLeft className="h-5 w-5" aria-hidden />
        </Link>
      </div>

      <div className="mt-8 grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 lg:grid-cols-4 lg:gap-x-6">
        {isLoading
          ? Array.from({ length: 8 }).map((_, i) => (
              <div key={i} aria-hidden>
                <div className="aspect-square animate-pulse rounded-2xl bg-slate-100" />
                <div className="mt-3 h-4 w-3/4 animate-pulse rounded bg-slate-100" />
                <div className="mt-2 h-4 w-1/3 animate-pulse rounded bg-slate-100" />
              </div>
            ))
          : items.map((p) => (
              <Link
                key={p.id}
                href={`/products/${p.id}`}
                className="group block focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#0a79c4]"
              >
                <div className="relative aspect-square overflow-hidden rounded-2xl bg-slate-100">
                  {p.image_url ? (
                    <Image
                      src={p.image_url}
                      alt={p.name}
                      fill
                      sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <span className="absolute inset-0 flex items-center justify-center text-slate-300">
                      <Package className="h-12 w-12" aria-hidden />
                    </span>
                  )}
                </div>
                <h3 className="mt-3 line-clamp-2 font-bold leading-snug">
                  {p.name}
                </h3>
                {p.category && (
                  <p className="mt-0.5 text-sm text-slate-500">
                    {getCategoryArabic(p.category)}
                  </p>
                )}
                <p className="mt-1 text-lg font-extrabold text-[#0a79c4]">
                  {formatCurrency(p.price)}
                </p>
              </Link>
            ))}
      </div>
    </section>
  );
}

const NODE_OFF = {
  backgroundColor: "#ffffff",
  borderColor: "#cbd5e1",
  color: "#94a3b8",
};
const NODE_ON = {
  backgroundColor: "#0a79c4",
  borderColor: "#0a79c4",
  color: "#ffffff",
};

// قطعة خط بين خطوتين: تمتلئ بالأزرق من الأولى إلى الثانية
function Segment({
  axis,
  className,
  on,
  delay,
  duration,
  reduce,
}: {
  axis: "x" | "y";
  className: string;
  on: boolean;
  delay: number;
  duration: number;
  reduce: boolean;
}) {
  const full = reduce || on ? 1 : 0;
  return (
    <span className={`absolute bg-slate-200 ${className}`} aria-hidden>
      <motion.span
        className="absolute inset-0 bg-[#0a79c4]"
        style={axis === "x" ? { originX: 1 } : { originY: 0 }}
        initial={
          axis === "x" ? { scaleX: reduce ? 1 : 0 } : { scaleY: reduce ? 1 : 0 }
        }
        animate={axis === "x" ? { scaleX: full } : { scaleY: full }}
        transition={{ delay, duration, ease: "linear" }}
      />
    </span>
  );
}

// خط زمني: يمتلئ الخط ثم تضيء الخطوات بالتتابع عند ظهوره على الشاشة (مرة واحدة)
function StepsTimeline() {
  const reduce = !!useReducedMotion();
  const ref = useRef<HTMLOListElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.3 });
  const on = reduce || inView;
  const segment = reduce ? 0 : 0.8; // مدة الانتقال بين خطوتين
  const at = (i: number) => (reduce ? 0 : 0.2 + i * 0.8);

  return (
    <ol
      ref={ref}
      className="relative mt-14 flex flex-col gap-12 md:grid md:grid-cols-3 md:gap-8"
    >
      {steps.map((s, i) => (
        <li
          key={s.title}
          className="relative flex gap-5 md:flex-col md:items-center md:text-center"
        >
          {i < steps.length - 1 && (
            <>
              <Segment
                axis="y"
                className="start-[23px] top-12 h-full w-0.5 md:hidden"
                on={on}
                delay={at(i)}
                duration={segment}
                reduce={reduce}
              />
              <Segment
                axis="x"
                className="start-1/2 top-[23px] hidden h-0.5 w-[calc(100%+2rem)] md:block"
                on={on}
                delay={at(i)}
                duration={segment}
                reduce={reduce}
              />
            </>
          )}
          <motion.span
            className="relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 text-xl font-bold"
            initial={reduce ? NODE_ON : NODE_OFF}
            animate={
              on ? { ...NODE_ON, scale: reduce ? 1 : [1, 1.15, 1] } : NODE_OFF
            }
            transition={{ delay: at(i), duration: reduce ? 0 : 0.4 }}
          >
            {i + 1}
          </motion.span>
          <motion.div
            initial={{ opacity: reduce ? 1 : 0.45 }}
            animate={{ opacity: on ? 1 : reduce ? 1 : 0.45 }}
            transition={{ delay: at(i), duration: reduce ? 0 : 0.4 }}
          >
            <h3 className="text-xl font-bold">{s.title}</h3>
            <p className="mt-2 leading-loose text-slate-600 md:mx-auto md:max-w-[16rem]">
              {s.text}
            </p>
          </motion.div>
        </li>
      ))}
    </ol>
  );
}

interface HomeContentProps {
  shouldShowLoader: boolean;
}

export default function HomeContent({ shouldShowLoader }: HomeContentProps) {
  const { user } = useAuth();
  const reduce = useReducedMotion();
  const [loading, setLoading] = useState(shouldShowLoader);

  useEffect(() => {
    if (loading) {
      const timer = setTimeout(() => {
        setLoading(false);
        document.cookie = "hasVisitedHome=true; path=/";
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [loading]);

  if (loading) return <LoadingAnimation />;

  // حركة واحدة بنفس اتجاه الشاحنة (نحو اليمين): الشاحنة تدخل وتتوقّف بهدوء،
  // والنص والأزرار يلحقون بها كمجموعة واحدة بدون تتابع
  const drive = reduce
    ? {}
    : {
        initial: { x: "-150%" },
        animate: { x: 0 },
        transition: { duration: 1.1, ease: [0.16, 1, 0.3, 1] as const },
      };
  const follow = reduce
    ? {}
    : {
        initial: { opacity: 0, x: -32 },
        animate: { opacity: 1, x: 0 },
        transition: {
          duration: 0.7,
          delay: 0.25,
          ease: [0.16, 1, 0.3, 1] as const,
        },
      };

  return (
    <div className="min-h-screen bg-white font-sans text-[#0b1a2a]">
      <Navigation />

      <div className="mx-auto max-w-7xl px-4 pt-4 sm:px-6 lg:px-8 empty:hidden">
        <OffersBanner />
      </div>

      {/* Hero */}
      <section className="mx-auto max-w-7xl px-4 pb-16 pt-8 sm:px-6 lg:px-8 lg:pb-20 lg:pt-12">
        <div className="relative grid items-center gap-6 overflow-hidden rounded-[32px] bg-[#eaf6fe] px-6 py-12 sm:px-12 lg:grid-cols-2 lg:py-10">
          <span
            className="absolute -start-24 -top-24 h-72 w-72 rounded-full bg-[#d5ecfb]"
            aria-hidden
          />
          <span
            className="absolute -bottom-32 end-1/3 h-64 w-64 rounded-full bg-[#d5ecfb]/70"
            aria-hidden
          />

          <motion.div className="relative" {...follow}>
            <h1 className="text-4xl font-extrabold leading-[1.35] sm:text-5xl lg:text-6xl">
              اطلب اليوم،
              <br />
              واستلم عند بابك.
            </h1>
            <p className="mt-5 max-w-lg text-lg leading-loose text-slate-600">
              تصفّح المنتجات، ثبّت موقعك على الخريطة، وتابع طلبك حتى يصلك.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/products" className={btnPrimary}>
                تصفّح المنتجات
              </Link>
              <Link href={user ? "/orders" : "/signup"} className={btnGhost}>
                {user ? "طلباتي" : "إنشاء حساب"}
              </Link>
            </div>
          </motion.div>

          <motion.div className="relative" {...drive}>
            <Lottie
              animationData={animationData}
              loop
              className="mx-auto h-auto w-full max-w-xs lg:max-w-md"
            />
          </motion.div>
        </div>
      </section>

      <LatestProducts />

      {/* الخطوات: تسلسل فعلي، فالخط الزمني والترقيم مناسبان */}
      <section className="bg-slate-50">
        <div className="mx-auto max-w-5xl px-4 py-20 sm:px-6 lg:px-8 lg:py-24">
          <h2 className="text-center text-3xl font-extrabold leading-snug md:text-4xl">
            ثلاث خطوات وطلبك عندك
          </h2>
          <StepsTimeline />
          <div className="mt-14 text-center">
            <Link href="/products" className={btnPrimary}>
              ابدأ الطلب
            </Link>
          </div>
        </div>
      </section>

      {/* تواصل */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-24">
        <div className="grid items-center gap-10 rounded-[32px] bg-[#eaf6fe] p-8 sm:p-12 lg:grid-cols-2">
          <div>
            <h2 className="text-3xl font-extrabold leading-snug md:text-4xl">
              عندك سؤال عن طلبك؟
            </h2>
            <p className="mt-3 text-lg text-slate-600">
              راسلنا على واتساب، نرد عليك خلال ساعات العمل.
            </p>
            <a
              href="https://wa.me/963995696426"
              target="_blank"
              rel="noopener noreferrer"
              className={`${btnPrimary} mt-7`}
            >
              راسلنا على واتساب
            </a>
          </div>
          <dl className="space-y-6 lg:justify-self-end">
            <div className="flex items-center gap-4">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-[#0a79c4]">
                <Phone className="h-5 w-5" aria-hidden />
              </span>
              <div>
                <dt className="text-sm text-slate-500">اتصل بنا</dt>
                <dd>
                  <a
                    href="tel:+963995696426"
                    dir="ltr"
                    className="text-xl font-bold hover:underline"
                  >
                    +963 995 696 426
                  </a>
                </dd>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-[#0a79c4]">
                <Clock className="h-5 w-5" aria-hidden />
              </span>
              <div>
                <dt className="text-sm text-slate-500">ساعات العمل</dt>
                <dd className="text-xl font-bold">كل يوم، 9:00 ص - 10:00 م</dd>
              </div>
            </div>
          </dl>
        </div>
      </section>

      <footer className="border-t border-slate-200">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 py-8 text-sm text-slate-500 sm:flex-row sm:px-6 lg:px-8">
          <span className="flex items-center gap-2 font-bold text-[#0b1a2a]">
            <Image src="/logo.png" alt="" width={36} height={36} />
            We Deliver
          </span>
          <nav className="flex gap-6" aria-label="روابط سريعة">
            <Link href="/products" className="hover:text-[#0a79c4]">
              المنتجات
            </Link>
            <Link
              href={user ? "/orders" : "/login"}
              className="hover:text-[#0a79c4]"
            >
              {user ? "طلباتي" : "تسجيل الدخول"}
            </Link>
          </nav>
          <span>© {new Date().getFullYear()} We Delivery</span>
        </div>
      </footer>
    </div>
  );
}
