
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    FiGrid,
    FiBox,
    FiPlusCircle,
    FiLayers,
    FiShoppingBag,
    FiUsers,
    FiMessageSquare,
    FiSettings,
    FiLogOut,
    FiChevronLeft,
} from "react-icons/fi";

const menuItems = [
    {
        title: "داشبورد",
        href: "/admin",
        icon: FiGrid,
    },
    {
        title: "مدیریت محصولات",
        href: "/admin/products",
        icon: FiBox,
    },
    {
        title: "افزودن محصول",
        href: "/admin/product",
        icon: FiPlusCircle,
    },
    {
        title: "مدیریت دسته‌بندی‌ها",
        href: "/admin/categories",
        icon: FiLayers,
    },
    {
        title: "مدیریت سفارش‌ها",
        href: "/admin/orders",
        icon: FiShoppingBag,
    },
    {
        title: "مدیریت کاربران",
        href: "/admin/users",
        icon: FiUsers,
    },
    {
        title: "نظرات کاربران",
        href: "/admin/comments",
        icon: FiMessageSquare,
    },
    {
        title: "تنظیمات",
        href: "/admin/settings",
        icon: FiSettings,
    },
];

export default function AdminSidebar({ onLogout }) {
    const pathname = usePathname();

    return (
        <aside
            dir="rtl"
            className="w-full h-full min-h-screen bg-white border-l border-slate-100 flex flex-col"
        >
            {/* Logo */}
            <div className="px-6 py-7 border-b border-slate-100">
                <Link href="/admin" className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-[#0755D9] flex items-center justify-center shadow-lg shadow-blue-200">
                        <FiBox className="text-white text-2xl" />
                    </div>

                    <div>
                        <h2 className="text-xl font-extrabold text-[#061A40]">
                            Technova
                        </h2>
                        <p className="text-xs text-slate-400 mt-1">
                            پنل مدیریت
                        </p>
                    </div>
                </Link>
            </div>

            {/* Menu */}
            <div className="px-4 py-6 flex-1">
                <p className="text-[11px] font-bold text-slate-400 px-3 mb-4">
                    منوی اصلی
                </p>

                <nav className="space-y-2">
                    {menuItems.map((item) => {
                        const Icon = item.icon;

                        const isActive =
                            item.href === "/admin"
                                ? pathname === "/admin"
                                : pathname === item.href ||
                                pathname.startsWith(`${item.href}/`);

                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`group flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200 ${
                                    isActive
                                        ? "bg-[#EAF2FF] text-[#0755D9] font-bold"
                                        : "text-slate-500 hover:bg-slate-50 hover:text-[#0755D9]"
                                }`}
                            >
                                <div className="flex items-center gap-3">
                                    <Icon
                                        className={`text-xl ${
                                            isActive
                                                ? "text-[#0755D9]"
                                                : "text-slate-400 group-hover:text-[#0755D9]"
                                        }`}
                                    />

                                    <span className="text-sm">
                                        {item.title}
                                    </span>
                                </div>

                                {isActive && (
                                    <FiChevronLeft className="text-base" />
                                )}
                            </Link>
                        );
                    })}
                </nav>
            </div>

            {/* Bottom */}
            <div className="p-4 border-t border-slate-100">
                <button
                    type="button"
                    onClick={onLogout}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-500 hover:bg-red-50 hover:text-red-500 transition-all"
                >
                    <FiLogOut className="text-xl" />
                    <span className="text-sm font-medium">
                    خروج از پنل مدیریت
                </span>
                </button>

                <div className="mt-4 p-4 rounded-2xl bg-[#F3F7FD]">
                    <p className="text-xs font-bold text-[#061A40]">
                        پنل مدیریت Technova
                    </p>
                    <p className="text-[11px] text-slate-400 mt-2 leading-5">
                        مدیریت فروشگاه و محصولات در یک محیط یکپارچه
                    </p>
                </div>
            </div>
        </aside>
    );
}
