
"use client";

import { useState } from "react";
import { FiUser, FiPhone, FiCheckCircle, FiLogOut } from "react-icons/fi";
import { useAuth } from "../../../context/AuthContext";
import Link from "next/link";

export default function UserProfilePopover() {
    const { user, logout } = useAuth();
    const [isOpen, setIsOpen] = useState(false);

    if (!user) return null;

    const customer = user.customer || {};
    const fullName = [
        customer.first_name,
        customer.last_name,
    ]
        .filter(Boolean)
        .join(" ");

    return (
        <div
            className="relative"
            onMouseEnter={() => setIsOpen(true)}
            onMouseLeave={() => setIsOpen(false)}
        >
            <button
                type="button"
                aria-label="اطلاعات حساب کاربری"
                aria-expanded={isOpen}
                onClick={() => setIsOpen((previous) => !previous)}
                onFocus={() => setIsOpen(true)}
                className= "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] text-white transition-all duration-300 hover:border-white/30 hover:bg-white/10"
            >
                <FiUser size={18} />
            </button>

            {isOpen && (
                <div
                    dir="rtl"
                    className="absolute left-0 top-full z-[120] mt-3
                        w-72 rounded-2xl border border-white/60
                        bg-white/95 p-4 text-[#172033] shadow-2xl
                        backdrop-blur-2xl"
                >
                    <div className="flex items-center gap-3 border-b border-slate-200 pb-4">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center
                            rounded-xl bg-[#EAF2FF] text-[#0755D9]">
                            <FiUser size={21} />
                        </div>

                        <div className="min-w-0">
                            <p className="truncate font-bold">
                                {fullName || "کاربر تکنووا"}
                            </p>

                            <p className="mt-1 text-xs text-slate-500">
                                حساب کاربری شما
                            </p>
                        </div>
                    </div>

                    <div className="space-y-3 py-4">
                        <div className="flex items-center gap-3 text-sm">
                            <FiPhone className="shrink-0 text-[#0755D9]" />
                            <span dir="ltr" className="text-slate-700">
                               0{customer.phone || user.phone || "—"}
                            </span>
                        </div>

                        <div className="flex items-center gap-3 text-sm">
                            <FiCheckCircle className="shrink-0 text-[#0755D9]" />
                            <span className="text-slate-700">
                                {user.profile_completed
                                    ? "پروفایل تکمیل شده"
                                    : "پروفایل تکمیل نشده"}
                            </span>
                        </div>
                    </div>
                    <Link
                        href="/user"
                        onClick={() => setIsOpen(false)}
                        className="mb-3 flex w-full items-center justify-center rounded-xl bg-[#0755D9] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#0645B5]"
                    >
                        ورود به پنل کاربری
                    </Link>


                </div>
            )}
        </div>
    );
}
