
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
    FiHeart,
    FiSearch,
    FiUser,
    FiMenu,
    FiX,
    FiShoppingBag,
    FiHome,
} from "react-icons/fi";
import LoginModal from "@/components/Auth/Customer/LoginModal";
import FavoriteLoginModal from "@/components/MainPage/Favorite/FavoriteLoginModal";
import {useAuth} from "@/context/AuthContext";
import UserProfilePopover from "../../Auth/Customer/UserProfilePopover";
import {RiShoppingBagFill} from "react-icons/ri";
import {MdDiscount} from "react-icons/md";
import {TbCategoryFilled} from "react-icons/tb";
import {Icon} from "lucide-react";

const navItems = [
    {
        title: "فروشگاه",
        Icon: RiShoppingBagFill,
        href: "/shop"
    },
    {
        title: "دسته‌بندی‌ها",
        Icon: TbCategoryFilled,
        href: "/blogs"
    },
    {
        title: "تخفیف‌ها",
        Icon: MdDiscount,
        href: "/deals" },
];

export default function Navbar() {
    const [menuOpen, setMenuOpen] = useState(false);

    const iconClass =
        "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] text-white transition-all duration-300 hover:border-white/30 hover:bg-white/10";



    return (
        <div dir="rtl" className="relative z-50">
            <header
                className={`relative left-0 right-0 z-50 transition-all duration-500 ease-in-out top-3 px-3 sm:top-8 sm:px-5`}
            >
                {/* قاب اصلی نوبار */}
                <div
                    className={`mx-auto flex min-h-[62px] rounded-full items-center justify-between gap-3 border transition-all duration-500 ease-in-out sm:min-h-[70px] w-[80%] max-w-[1250px] bg-[#061A40]/95  border-white/10  px-3 shadow-[0_12px_40px_rgba(0,0,0,0.25)] text-white! backdrop-blur-xl sm:rounded-[22px] sm:px-5 lg:px-7
                       `}
                >
                    {/* سمت راست: آیکون خانه و منوی سفید */}
                    <div className="flex min-w-0 flex-1 items-center justify-center gap-2">
                        <Link
                            href="/"
                            aria-label="صفحه اصلی"
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white transition hover:bg-white/10"
                        >
                            <FiHome size={18} className="text-[#F3F7FD]"/>
                        </Link>

                        {/* کپسول سفید وسط */}
                        <nav className={`hidden min-w-0 items-center gap-0.5 rounded-full m-auto text-[11px]  shadow-sm md:flex lg:gap-1 lg:px-1.5 lg:text-[15px] border border-black/10 bg-white/40 text-white p-1 px-3 backdrop-blur-xl
             `}>
                            {navItems.map((item) => (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={`whitespace-nowrap rounded-full transition hover:bg-black/20 hover:text-black  px-2.5 py-2  duration-300 lg:px-3.5 active:bg-black/50 active:text:white`}
                                >
                                    {item.title}
                                    <Icon size={21} />

                                </Link>
                            ))}
                        </nav>

                        {/* نسخه موبایل */}
                        <button
                            type="button"
                            aria-label={menuOpen ? "بستن منو" : "باز کردن منو"}
                            onClick={() => setMenuOpen((open) => !open)}
                            className={`${iconClass} md:hidden`}
                        >
                            {menuOpen ? <FiX size={19} /> : <FiMenu size={19} />}
                        </button>
                    </div>
                </div>



                    {/*  آیکون‌ها */}

                <div
                    className={`mx-auto overflow-hidden transition-all duration-300 md:hidden ${
                        menuOpen
                            ? "mt-2 max-h-[420px] opacity-100"
                            : "pointer-events-none mt-0 max-h-0 opacity-0"
                    }`}
                >
                    <nav className="rounded-2xl border border-white/10 bg-[#0755D9]/95 p-2 shadow-xl backdrop-blur-xl">
                        {navItems.map((item) => (
                            <Link
                                key={item.href}
                                href={item.href}
                                onClick={() => setMenuOpen(false)}
                                className="block rounded-xl px-4 py-3 text-sm text-white/85 transition hover:bg-white/10 hover:text-white"
                            >
                                {item.title}
                            </Link>
                        ))}

                    </nav>
                </div>
            </header>
        </div>
    );
}
