"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
    FiUser,
    FiPhone,
    FiMail,
    FiCalendar,
    FiShield,
    FiEdit3,
    FiX,
    FiSave,
    FiLogOut,
} from "react-icons/fi";

import { useAuth } from "@/context/AuthContext";
import { getCookie } from "@/utils/cookie";
import { serverAddress } from "@/utils/handledfetch";

export default function UserProfile() {
    const router = useRouter();
    const { logout } = useAuth();

    const [userInfo, setUserInfo] = useState(null);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [loggingOut, setLoggingOut] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const [formData, setFormData] = useState({
        first_name: "",
        last_name: "",
        email: "",
    });

    function requestLogin() {
        window.dispatchEvent(new Event("open-customer-login"));
    }

    function handleUnauthorized(
        message = "نشست شما منقضی شده است. دوباره وارد حساب شوید."
    ) {
        setError(message);
        setUserInfo(null);
        setEditing(false);
        requestLogin();
    }

    async function readResponse(response) {
        const text = await response.text();

        if (!text) return null;

        try {
            return JSON.parse(text);
        } catch {
            return { detail: text };
        }
    }

    async function handleLogout() {
        if (loggingOut) return;

        setLoggingOut(true);
        setError("");

        try {
            // پاک کردن وضعیت ورود و اطلاعات ذخیره‌شده کاربر
            logout();

            setUserInfo(null);
            setEditing(false);
            setSuccess("");

            // انتقال به صفحه اصلی
            router.replace("/");

            // باز کردن مودال ورود بعد از انتقال
            window.setTimeout(() => {
                requestLogin();
            }, 100);
        } catch (err) {
            console.error("Logout error:", err);
            setError("خروج از حساب کاربری با خطا مواجه شد.");
            setLoggingOut(false);
        }
    }

    useEffect(() => {
        let cancelled = false;

        async function fetchProfile() {
            setLoading(true);
            setError("");

            try {
                const token = getCookie("accessToken");

                const headers = {
                    Accept: "application/json",
                };

                if (token) {
                    headers.Authorization = `Bearer ${token}`;
                }

                const response = await fetch(
                    `${serverAddress}/accounts/customer/me/`,
                    {
                        method: "GET",
                        headers,
                        credentials: "include",
                        cache: "no-store",
                    }
                );

                const data = await readResponse(response);

                if (response.status === 401) {
                    if (!cancelled) {
                        handleUnauthorized(
                            "برای مشاهده اطلاعات حساب، دوباره وارد شوید."
                        );
                    }
                    return;
                }

                if (!response.ok) {
                    throw new Error(
                        data?.detail ||
                        data?.message ||
                        "دریافت اطلاعات کاربر ناموفق بود."
                    );
                }

                if (cancelled) return;

                setUserInfo(data);
                setFormData({
                    first_name: data?.first_name || "",
                    last_name: data?.last_name || "",
                    email: data?.email || "",
                });
            } catch (err) {
                if (cancelled) return;

                console.error("Fetch profile error:", err);

                setError(
                    err.message ||
                    "دریافت اطلاعات کاربر با خطا مواجه شد."
                );
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        fetchProfile();

        return () => {
            cancelled = true;
        };
    }, []);

    function formatDate(date) {
        if (!date) return "ثبت نشده";

        const parsedDate = new Date(date);

        if (Number.isNaN(parsedDate.getTime())) {
            return "ثبت نشده";
        }

        return new Intl.DateTimeFormat("fa-IR", {
            year: "numeric",
            month: "long",
            day: "numeric",
        }).format(parsedDate);
    }

    function handleChange(event) {
        const { name, value } = event.target;

        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));
    }

    function openEditForm() {
        if (!userInfo) return;

        setFormData({
            first_name: userInfo.first_name || "",
            last_name: userInfo.last_name || "",
            email: userInfo.email || "",
        });

        setError("");
        setSuccess("");
        setEditing(true);
    }

    function cancelEdit() {
        setFormData({
            first_name: userInfo?.first_name || "",
            last_name: userInfo?.last_name || "",
            email: userInfo?.email || "",
        });

        setError("");
        setEditing(false);
    }

    async function handleSave(event) {
        event.preventDefault();

        setError("");
        setSuccess("");
        setSaving(true);

        try {
            const token = getCookie("accessToken");

            const headers = {
                "Content-Type": "application/json",
                Accept: "application/json",
            };

            if (token) {
                headers.Authorization = `Bearer ${token}`;
            }

            const response = await fetch(
                `${serverAddress}/accounts/customer/me/`,
                {
                    method: "PATCH",
                    headers,
                    credentials: "include",
                    cache: "no-store",
                    body: JSON.stringify({
                        first_name: formData.first_name.trim(),
                        last_name: formData.last_name.trim(),
                        email: formData.email.trim(),
                    }),
                }
            );

            const data = await readResponse(response);

            if (response.status === 401) {
                handleUnauthorized(
                    "نشست شما منقضی شده است. دوباره وارد حساب شوید."
                );
                return;
            }

            if (!response.ok) {
                const message =
                    data?.detail ||
                    data?.message ||
                    data?.first_name?.[0] ||
                    data?.last_name?.[0] ||
                    data?.email?.[0] ||
                    `ذخیره تغییرات ناموفق بود. کد خطا: ${response.status}`;

                throw new Error(message);
            }

            const updatedUser = {
                ...userInfo,
                ...(data && typeof data === "object" ? data : {}),
                first_name: formData.first_name.trim(),
                last_name: formData.last_name.trim(),
                email: formData.email.trim(),
            };

            setUserInfo(updatedUser);

            setFormData({
                first_name: updatedUser.first_name || "",
                last_name: updatedUser.last_name || "",
                email: updatedUser.email || "",
            });

            setEditing(false);
            setSuccess("اطلاعات پروفایل با موفقیت به‌روزرسانی شد.");
        } catch (err) {
            console.error("Update profile error:", err);

            setError(
                err.message || "ذخیره اطلاعات با خطا مواجه شد."
            );
        } finally {
            setSaving(false);
        }
    }

    if (loading) {
        return (
            <div
                dir="rtl"
                className="rounded-3xl bg-white/70 p-10 text-center text-[#64748B]"
            >
                در حال دریافت اطلاعات حساب کاربری...
            </div>
        );
    }

    if (!userInfo) {
        return (
            <div
                dir="rtl"
                className="rounded-3xl bg-white/70 p-6 text-center"
            >
                <p
                    role="alert"
                    className="text-sm leading-7 text-red-500"
                >
                    {error || "لطفاً وارد حساب کاربری شوید."}
                </p>

                <button
                    type="button"
                    onClick={requestLogin}
                    className="mt-4 rounded-xl bg-[#0755D9] px-5 py-3 text-sm font-medium text-white transition hover:bg-[#0645B5]"
                >
                    ورود به حساب کاربری
                </button>
            </div>
        );
    }

    const firstName = userInfo.first_name || "";
    const lastName = userInfo.last_name || "";
    const rawPhone = userInfo.phone;

    const phone = rawPhone
        ? String(rawPhone).startsWith("0")
            ? rawPhone
            : `0${rawPhone}`
        : "ثبت نشده";

    const details = [
        {
            label: "شماره موبایل",
            value: phone,
            icon: FiPhone,
            direction: "ltr",
        },
        {
            label: "آدرس ایمیل",
            value: userInfo.email || "ثبت نشده",
            icon: FiMail,
            direction: "ltr",
        },
        {
            label: "تاریخ عضویت",
            value: formatDate(userInfo.created_at),
            icon: FiCalendar,
        },
        {
            label: "وضعیت حساب",
            value: "فعال",
            icon: FiShield,
            status: true,
        },
    ];

    return (
        <section
            dir="rtl"
            className="w-full rounded-3xl border border-white/20 bg-white/10 p-4 shadow-[0_8px_32px_rgba(6,26,64,0.15)] backdrop-blur-xl sm:p-6 lg:p-8"
        >
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="text-xl font-bold text-[#061A40] sm:text-2xl">
                    اطلاعات حساب کاربری
                </h2>

                <button
                    type="button"
                    onClick={handleLogout}
                    disabled={loggingOut}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-600 transition hover:border-red-300 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    <FiLogOut size={17} />
                    {loggingOut
                        ? "در حال خروج..."
                        : "خروج از حساب کاربری"}
                </button>
            </div>

            {success && (
                <div
                    role="status"
                    className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700"
                >
                    {success}
                </div>
            )}

            {error && editing && (
                <div
                    role="alert"
                    className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600"
                >
                    {error}
                </div>
            )}

            <div className="rounded-2xl border border-white/50 bg-white/70 p-4 sm:p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                    <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full border-4 border-white bg-[#EAF2FF] text-[#0755D9] shadow-md">
                        <FiUser size={38} />
                    </div>

                    <div className="flex-1">
                        <h3 className="text-xl font-bold text-[#061A40]">
                            {firstName || lastName
                                ? `${firstName} ${lastName}`.trim()
                                : "کاربر تکنوا"}
                        </h3>

                        <span className="mt-3 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                            <span className="h-2 w-2 rounded-full bg-emerald-500" />
                            حساب کاربری فعال
                        </span>
                    </div>

                    {!editing && (
                        <button
                            type="button"
                            onClick={openEditForm}
                            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0755D9] px-4 py-3 text-sm font-medium text-white transition hover:bg-[#0645B5]"
                        >
                            <FiEdit3 size={17} />
                            ویرایش اطلاعات
                        </button>
                    )}
                </div>

                <div className="my-6 border-t border-slate-200" />

                {editing ? (
                    <form onSubmit={handleSave} className="space-y-5">
                        <h3 className="text-lg font-bold text-[#061A40]">
                            ویرایش پروفایل
                        </h3>

                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div>
                                <label
                                    htmlFor="first_name"
                                    className="mb-2 block text-sm font-medium text-[#172033]"
                                >
                                    نام
                                </label>
                                <input
                                    id="first_name"
                                    name="first_name"
                                    type="text"
                                    value={formData.first_name}
                                    onChange={handleChange}
                                    required
                                    maxLength={150}
                                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-[#172033] outline-none transition focus:border-[#3295FF] focus:ring-4 focus:ring-[#0755D9]/10"
                                />
                            </div>

                            <div>
                                <label
                                    htmlFor="last_name"
                                    className="mb-2 block text-sm font-medium text-[#172033]"
                                >
                                    نام خانوادگی
                                </label>
                                <input
                                    id="last_name"
                                    name="last_name"
                                    type="text"
                                    value={formData.last_name}
                                    onChange={handleChange}
                                    required
                                    maxLength={150}
                                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-[#172033] outline-none transition focus:border-[#3295FF] focus:ring-4 focus:ring-[#0755D9]/10"
                                />
                            </div>

                            <div className="sm:col-span-2">
                                <label
                                    htmlFor="email"
                                    className="mb-2 block text-sm font-medium text-[#172033]"
                                >
                                    آدرس ایمیل
                                </label>
                                <input
                                    id="email"
                                    name="email"
                                    type="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    maxLength={254}
                                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-left text-sm text-[#172033] outline-none transition focus:border-[#3295FF] focus:ring-4 focus:ring-[#0755D9]/10"
                                    dir="ltr"
                                />
                            </div>
                        </div>

                        <div className="flex flex-wrap justify-end gap-3">
                            <button
                                type="button"
                                onClick={cancelEdit}
                                disabled={saving}
                                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
                            >
                                <FiX size={17} />
                                انصراف
                            </button>

                            <button
                                type="submit"
                                disabled={saving}
                                className="inline-flex items-center gap-2 rounded-xl bg-[#0755D9] px-5 py-3 text-sm font-medium text-white transition hover:bg-[#0645B5] disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                <FiSave size={17} />
                                {saving
                                    ? "در حال ذخیره..."
                                    : "ذخیره تغییرات"}
                            </button>
                        </div>
                    </form>
                ) : (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        {details.map((item) => {
                            const Icon = item.icon;

                            return (
                                <div
                                    key={item.label}
                                    className="rounded-2xl border border-slate-200/70 bg-[#F3F7FD]/80 p-4 transition hover:border-[#3295FF]/50"
                                >
                                    <div className="mb-3 flex items-center gap-2 text-sm text-[#0755D9]">
                                        <Icon size={19} />
                                        {item.label}
                                    </div>

                                    <p
                                        dir={item.direction || "rtl"}
                                        className={`break-words text-lg font-semibold ${
    item.status
        ? "text-emerald-600"
        : "text-[#172033]"
}`}
                                    >
                                        {item.value}
                                    </p>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </section>
    );
}
