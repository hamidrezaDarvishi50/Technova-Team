"use client";

import Link from "next/link";
import { useState } from "react";
import {
  FiArrowLeft,
  FiArrowUpLeft,
  FiArrowUp,
  FiInstagram,
  FiSend,
  FiPhone,
  FiMail,
  FiMapPin,
  FiShield,
  FiTruck,
  FiRefreshCw,
  FiHeadphones,
} from "react-icons/fi";

const footerLinks = [
  {
    title: "دسترسی سریع",
    links: [
      { title: "صفحه اصلی", href: "/" },
      { title: "فروشگاه", href: "/shop" },
      { title: "دسته‌بندی محصولات", href: "/blogs" },
      { title: "تخفیف‌های ویژه", href: "/deals" },
    ],
  },
  {
    title: "راهنمای مشتریان",
    links: [
      { title: "درباره ما", href: "/about" },
      { title: "تماس با ما", href: "/contact" },
      { title: "پیگیری سفارش", href: "/orders" },
    ],
  },
];

export default function Footer() {
  // const [email, setEmail] = useState("");

  // function handleSubscribe(event) {
  //   event.preventDefault();
  //
  //   if (!email.trim()) return;
  //
  //   // اتصال به API خبرنامه را اینجا انجام بده.
  //   console.log("Newsletter email:", email);
  //   setEmail("");
  // }

  return (
    <footer
      dir="rtl"
      className="relative overflow-hidden border-t border-white/10 bg-[#061A40] text-[#F3F7FD]"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-40 -top-40 h-96 w-96 rounded-full bg-[#0755D9]/20 blur-[120px]"
      />

      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-40 -left-32 h-96 w-96 rounded-full bg-[#3295FF]/10 blur-[120px]"
      />

      <div className="relative mx-auto max-w-[1250px] px-5 sm:px-8 lg:px-10">



        {/* بخش اصلی فوتر */}
        <div className="grid grid-cols-1 gap-10 py-12 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8 lg:py-10">

          {/* معرفی برند */}
          <div className="lg:col-span-1">
            <Link href="/public" className="inline-flex items-center gap-2">


              <span className="bg-gradient-to-l from-white via-[#BBDFFF] to-[#3295FF] bg-clip-text text-3xl font-black tracking-tight text-transparent">
                TechNova
              </span>
            </Link>

            <p className="mt-5 max-w-sm text-sm leading-8 text-white/55">
              تکنولوژی، کیفیت و تجربه‌ای متفاوت از خرید آنلاین.
              با تک‌نوا، محصولات مورد نیازت را هوشمندانه انتخاب کن.
            </p>

            {/* شبکه‌های اجتماعی */}
            <div className="mt-6 flex items-center gap-3">
              <a
                href="https://www.instagram.com/"
                target="_blank"
                rel="noreferrer"
                aria-label="اینستاگرام"
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-white/70 transition hover:border-[#3295FF]/40 hover:bg-[#3295FF]/15 hover:text-[#65B3FF]"
              >
                <FiInstagram size={19} />
              </a>

              <a
                href="https://t.me/"
                target="_blank"
                rel="noreferrer"
                aria-label="تلگرام"
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-white/70 transition hover:border-[#3295FF]/40 hover:bg-[#3295FF]/15 hover:text-[#65B3FF]"
              >
                <FiSend size={18} />
              </a>

              <a
                href="mailto:info@technova.example"
                aria-label="ایمیل"
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-white/70 transition hover:border-[#3295FF]/40 hover:bg-[#3295FF]/15 hover:text-[#65B3FF]"
              >
                <FiMail size={18} />
              </a>
            </div>
          </div>

          {/* لینک‌های فوتر */}
          {footerLinks.map((group) => (
            <div key={group.title} className="text-start">
              <h3 className="text-base font-bold text-white">
                {group.title}
              </h3>

              <div className="mt-5 h-0.5 w-10 rounded-full bg-gradient-to-l from-[#3295FF] to-transparent mb-4" />

              <ul className="mt-5 space-y-4">
                {group.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="group inline-flex items-center gap-2 text-sm text-white/55 transition hover:text-[#65B3FF]"
                    >


                      <span>{link.title}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {/* خبرنامه و اطلاعات تماس */}
          <div>
            <h3 className="text-base font-bold text-white">
              با تک‌نوا همراه باش
            </h3>

            <p className="mt-4 text-sm leading-7 text-white/50">
              برای اطلاع از محصولات جدید و پیشنهادهای ویژه عضو خبرنامه شو.
            </p>

            {/*<form*/}
            {/*  onSubmit={handleSubscribe}*/}
            {/*  className="mt-5 flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] p-1.5 transition focus-within:border-[#3295FF]/50"*/}
            {/*>*/}
            {/*  <input*/}
            {/*    type="email"*/}
            {/*    required*/}
            {/*    value={email}*/}
            {/*    onChange={(event) => setEmail(event.target.value)}*/}
            {/*    placeholder="ایمیل شما..."*/}
            {/*    aria-label="ایمیل برای عضویت در خبرنامه"*/}
            {/*    className="min-w-0 flex-1 bg-transparent px-3 py-2.5 text-sm text-white outline-none placeholder:text-white/30"*/}
            {/*  />*/}

            {/*  <button*/}
            {/*    type="submit"*/}
            {/*    aria-label="عضویت در خبرنامه"*/}
            {/*    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#3295FF] to-[#0755D9] text-white shadow-lg shadow-blue-950/30 transition hover:scale-105 hover:shadow-blue-500/20"*/}
            {/*  >*/}
            {/*    <FiArrowLeft size={19} />*/}
            {/*  </button>*/}
            {/*</form>*/}

            <div className="mt-6 space-y-4">
              <a
                href="tel:+982100000000"
                className="flex items-center gap-3 text-sm text-white/55 transition hover:text-[#65B3FF]"
              >
                <FiPhone className="shrink-0 text-[#65B3FF]" size={17} />
                <span dir="ltr">021-00000000</span>
              </a>

              <div className="flex items-start gap-3 text-sm leading-7 text-white/55">
                <FiMapPin className="mt-1 shrink-0 text-[#65B3FF]" size={17} />
                <span>تهران، ایران</span>
              </div>
            </div>
          </div>
        </div>

        {/* خط پایانی */}
        <div className="flex flex-col gap-4 border-t border-white/10 py-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-center text-xs leading-6 text-white/40 sm:text-right">
            © {new Date().getFullYear()} TechNova. تمامی حقوق محفوظ است.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-3 text-xs text-white/45">
            <Link
              href="/privacy"
              className="transition hover:text-[#65B3FF]"
            >
              حریم خصوصی
            </Link>

            <Link
              href="/terms"
              className="transition hover:text-[#65B3FF]"
            >
              قوانین و مقررات
            </Link>

            <button
              type="button"
              onClick={() =>
                window.scrollTo({ top: 0, behavior: "smooth" })
              }
              className="group flex items-center gap-2 text-[#65B3FF] transition hover:text-white"
            >
              بازگشت به بالا
              <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#3295FF]/20 bg-[#3295FF]/10 transition group-hover:bg-[#3295FF]/20">
                <FiArrowUp size={15} />
              </span>
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}
