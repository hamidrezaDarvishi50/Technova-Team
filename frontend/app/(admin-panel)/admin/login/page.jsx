
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
    FiUser,
    FiLock,
    FiEye,
    FiEyeOff,
    FiLogIn,
    FiShield,
    FiCpu,
} from "react-icons/fi";

import handledFetch from "@/utils/handledfetch";
import { setCookie, getRole } from "@/utils/cookie";

export default function AdminLoginPage() {
    const router = useRouter();

    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    async function handleSubmit(event) {
        event.preventDefault();

        if (!username.trim() || !password) {
            setError("لطفاً نام کاربری و رمز عبور را وارد کنید.");
            return;
        }

        setLoading(true);
        setError("");

        try {
            await handledFetch(
                "/accounts/user/login/",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        username: username.trim(),
                        password: password,
                    }),
                },
                (response) => {
                    const tokens = response?.tokens;
                    const role = response?.user?.role?.toLowerCase();

                    if (!tokens?.access || !tokens?.refresh) {
                        setError("اطلاعات دریافتی از سرور معتبر نیست.");
                        return;
                    }

                    if (!["admin", "super_admin"].includes(role)) {
                        setError("شما اجازه ورود به پنل مدیریت را ندارید.");
                        return;
                    }

                    setCookie(tokens);
                    router.replace("/admin");
                }
            );
        } catch (err) {
            console.error("Admin login error:", err);
            setError("ارتباط با سرور برقرار نشد. دوباره تلاش کنید.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <main
            dir="rtl"
            className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#F3F7FD] px-4 py-10"
        >
            {/* Background Decorations */}
            <div className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full bg-blue-200/40 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-40 -left-32 h-96 w-96 rounded-full bg-[#3295FF]/20 blur-3xl" />

            <div className="relative z-10 grid w-full max-w-5xl overflow-hidden rounded-[32px] border border-white/80 bg-white/80 shadow-[0_25px_80px_rgba(7,85,217,0.13)] backdrop-blur-2xl lg:grid-cols-2">

                {/* Login Form */}
                <section className="flex flex-col justify-center p-7 sm:p-12 lg:p-14">

                    {/* Logo */}
                    <div className="mb-10 flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#0755D9] to-[#3295FF] text-2xl text-white shadow-lg shadow-blue-500/20">
                            <FiCpu />
                        </div>

                        <div>
                            <h1 className="text-2xl font-black tracking-wide text-[#061A40]">
                                TECHNOVA
                            </h1>
                            <p className="text-[10px] font-semibold tracking-[3px] text-[#64748B]">
                                ADMIN PANEL
                            </p>
                        </div>
                    </div>

                    {/* Title */}
                    <div className="mb-8">
                        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl border border-blue-100 bg-[#EAF2FF] text-xl text-[#0755D9]">
                            <FiShield />
                        </div>

                        <h2 className="text-2xl font-black text-[#061A40]">
                            ورود مدیر سیستم
                        </h2>

                        <p className="mt-2 text-sm leading-7 text-[#64748B]">
                            برای ورود به پنل مدیریت تکنووا، اطلاعات حساب
                            کاربری خود را وارد کنید.
                        </p>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-5">

                        {/* Username */}
                        <div>
                            <label className="mb-2 block text-sm font-bold text-[#172033]">
                                نام کاربری
                            </label>

                            <div className="relative">
                                <FiUser className="absolute right-4 top-1/2 -translate-y-1/2 text-lg text-[#94A3B8]" />

                                <input
                                    type="text"
                                    value={username}
                                    onChange={(event) => {
                                        setUsername(event.target.value);
                                        setError("");
                                    }}
                                    placeholder="نام کاربری خود را وارد کنید"
                                    autoComplete="username"
                                    className="h-14 w-full rounded-2xl border border-blue-100 bg-white/80 pr-12 pl-4 text-sm text-[#172033] outline-none transition placeholder:text-[#94A3B8] focus:border-[#3295FF] focus:ring-4 focus:ring-blue-500/10"
                                />
                            </div>
                        </div>

                        {/* Password */}
                        <div>
                            <label className="mb-2 block text-sm font-bold text-[#172033]">
                                رمز عبور
                            </label>

                            <div className="relative">
                                <FiLock className="absolute right-4 top-1/2 -translate-y-1/2 text-lg text-[#94A3B8]" />

                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(event) => {
                                        setPassword(event.target.value);
                                        setError("");
                                    }}
                                    placeholder="رمز عبور خود را وارد کنید"
                                    autoComplete="current-password"
                                    className="h-14 w-full rounded-2xl border border-blue-100 bg-white/80 pr-12 pl-12 text-sm text-[#172033] outline-none transition placeholder:text-[#94A3B8] focus:border-[#3295FF] focus:ring-4 focus:ring-blue-500/10"
                                />

                                <button
                                    type="button"
                                    onClick={() =>
                                        setShowPassword((current) => !current)
                                    }
                                    className="absolute left-4 top-1/2 -translate-y-1/2 text-lg text-[#94A3B8] transition hover:text-[#0755D9]"
                                    aria-label={
                                        showPassword
                                            ? "مخفی کردن رمز عبور"
                                            : "نمایش رمز عبور"
                                    }
                                >
                                    {showPassword ? <FiEyeOff /> : <FiEye />}
                                </button>
                            </div>
                        </div>

                        {/* Error */}
                        {error && (
                            <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-xs font-medium leading-6 text-red-600">
                                {error}
                            </div>
                        )}

                        {/* Submit */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-l from-[#0755D9] to-[#3295FF] text-sm font-extrabold text-white shadow-lg shadow-blue-500/20 transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-blue-500/25 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
                        >
                            {loading ? (
                                <>
                                    <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                                    در حال ورود...
                                </>
                            ) : (
                                <>
                                    <FiLogIn className="text-lg" />
                                    ورود به پنل مدیریت
                                </>
                            )}
                        </button>
                    </form>

                    <p className="mt-8 text-center text-[11px] leading-6 text-[#94A3B8]">
                        این بخش مخصوص مدیران و کاربران مجاز سیستم است.
                    </p>
                </section>

                {/* Side Banner */}
                <section className="relative hidden min-h-[620px] flex-col justify-between overflow-hidden bg-gradient-to-br from-[#061A40] via-[#0755D9] to-[#3295FF] p-12 text-white lg:flex">

                    <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full border border-white/10" />
                    <div className="absolute -right-12 -top-12 h-56 w-56 rounded-full border border-white/10" />
                    <div className="absolute -bottom-32 -left-20 h-96 w-96 rounded-full bg-white/5 blur-2xl" />

                    <div className="relative z-10">
                        <span className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold backdrop-blur-md">
                            TECHNOVA MANAGEMENT
                        </span>
                    </div>

                    <div className="relative z-10">
                        <div className="mb-8 flex h-24 w-24 items-center justify-center rounded-[30px] border border-white/20 bg-white/10 text-5xl shadow-2xl backdrop-blur-xl">
                            <FiShield />
                        </div>

                        <h2 className="max-w-sm text-4xl font-black leading-[1.5]">
                            مدیریت هوشمند
                            <br />
                            دنیای تکنولوژی
                        </h2>

                        <p className="mt-5 max-w-sm text-sm leading-8 text-blue-100">
                            از این بخش می‌توانید محصولات، سفارش‌ها و اطلاعات
                            فروشگاه تکنووا را مدیریت کنید.
                        </p>
                    </div>

                    <div className="relative z-10 flex items-center justify-between border-t border-white/15 pt-6 text-xs text-blue-100">
                        <span>Technova Admin Panel</span>
                        <span>© 2026 Technova</span>
                    </div>
                </section>
            </div>
        </main>
    );
}
