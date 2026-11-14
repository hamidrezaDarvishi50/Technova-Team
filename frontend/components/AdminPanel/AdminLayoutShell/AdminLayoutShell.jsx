
"use client";

import { usePathname } from "next/navigation";
import {useAdminAuth} from "@/context/AdminAuthProvider";
import AdminSidebar from "@/components/AdminPanel/Sidebar/AdminSidebar";

export default function AdminLayoutShell({ children }) {
    const pathname = usePathname();
    const { loading, user, logout } = useAdminAuth();

    const isLoginPage = pathname === "/admin/login";

    // صفحه ورود بدون سایدبار
    if (isLoginPage) {
        return <>{children}</>;
    }

    // تا زمان بررسی توکن، محتوای پنل نمایش داده نمی‌شود.
    if (loading || !user) {
        return (
            <div
                dir="rtl"
                className="min-h-screen flex items-center justify-center bg-[#F3F7FD]"
            >
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-blue-100 border-t-[#0755D9] rounded-full animate-spin" />
                    <p className="text-sm text-slate-500">
                        در حال بررسی دسترسی...
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div
            dir="rtl"
            className="min-h-screen bg-[#F3F7FD] flex"
        >
            {/* Sidebar */}
            <div className="hidden lg:block w-[270px] shrink-0">
                <div className="fixed top-0 right-0 bottom-0 w-[270px] overflow-y-auto">
                    <AdminSidebar onLogout={logout} />
                </div>
            </div>

            {/* Main Content */}
            <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8">
                <div className="max-w-[1600px] mx-auto">
                    {children}
                </div>
            </main>
        </div>
    );
}
