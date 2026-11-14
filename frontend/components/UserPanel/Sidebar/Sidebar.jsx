"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    FiGrid,
    FiShoppingBag,
    FiHeart,
    FiHome, FiLogOut,
} from "react-icons/fi";
import {IoLocationOutline} from "react-icons/io5";

const menuItems = [
    {
        title: "پروفایل",
        href: "/user",
        icon: FiGrid,
    },
    {
        title: "خریدهای من",
        href: "/user/my-cart",
        icon: FiShoppingBag,
    },{
        title:"آدرس های من",
        href: "/user/address",
        icon: IoLocationOutline,
    },
    {
        title: "علاقه‌مندی‌ها",
        href: "/user/favorites",
        icon: FiHeart,
    },
    {
        title: "بازگشت به صفحه اصلی",
        href: "/",
        icon: FiHome,
    },{
        title:"خروج از حساب کاربری",
        href:"/logout",
        icon: FiLogOut,
    }
];

export default function UserSidebar() {
    const pathname = usePathname();

    return (
        <aside
            dir="rtl"
            className="flex mt-8 mb-8  rounded-tl-4xl flex-col overflow-hidden rounded-bl-4xl bg-[#061A40] bg-cover bg-center bg-no-repeat"
            style={{
                backgroundImage: "url('/sidebar/sidbar.png')",
            }}
        >


            <div
                className=" border border-white/20 h-full  bg-black/10  backdrop-blur-sm shadow-[0_8px_32px_rgba(6,26,64,0.25)] px-4 py-8"
            >
                <nav className="flex flex-col gap-3">
                    {menuItems.map((item) => {
                        const Icon = item.icon;

                        const isActive =
                            item.href === "/user"
                                ? pathname === "/user"
                                : item.href !== "/" &&
                                pathname.startsWith(item.href);

                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`flex items-center gap-3 rounded-xl border px-4 py-3 transition-all duration-300 ${
                                    item.title === "خروج از حساب کاربری"
                                        ? "border-transparent text-red-400! hover:border-red-400/20 hover:bg-red-500/10 hover:text-red-300!"
                                        : isActive
                                            ? "border-white/20 bg-white/40 text-white shadow-lg backdrop-blur-xl"
                                            : "border-transparent text-[#EAF2FF]/90! hover:border-white/15 hover:bg-white/10 hover:text-white!"
                                }`}
                            >
                                <Icon size={21} />
                                <span className="text-sm font-medium">
                  {item.title}
                </span>
                            </Link>

                        );
                    })}

                </nav>


            </div>
        </aside>
    );
}