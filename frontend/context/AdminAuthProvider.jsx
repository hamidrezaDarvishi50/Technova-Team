
"use client";

import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useState,
} from "react";
import { usePathname, useRouter } from "next/navigation";

import handledFetch from "@/utils/handledfetch";
import { getCookie, removeCookie } from "@/utils/cookie";

const AdminAuthContext = createContext(null);

export  function AdminAuthProvider({ children }) {
    const router = useRouter();
    const pathname = usePathname();

    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    const isLoginPage = pathname === "/admin/login";

    useEffect(() => {
        let isMounted = true;

        async function checkAdminAuth() {
            if (isLoginPage) {
                setLoading(false);
                return;
            }

            setLoading(true);

            const accessToken = getCookie("accessToken");

            if (!accessToken) {
                if (isMounted) {
                    setUser(null);
                    setLoading(false);
                    router.replace("/admin/login");
                }
                return;
            }

            let isAuthorized = false;

            try {
                await handledFetch(
                    "/accounts/user/me/",
                    {
                        method: "GET",
                        headers: {
                            Authorization: `Bearer ${accessToken}`,
                        },
                    },
                    (response) => {
                        const currentUser = response?.user ?? response;
                        const role = currentUser?.role?.toLowerCase();

                        if (
                            !currentUser ||
                            !["admin", "super_admin"].includes(role)
                        ) {
                            removeCookie();

                            if (isMounted) {
                                setUser(null);
                                router.replace("/admin/login");
                            }

                            return;
                        }

                        isAuthorized = true;

                        if (isMounted) {
                            setUser(currentUser);
                        }
                    }
                );

                if (!isAuthorized) {
                    removeCookie();

                    if (isMounted) {
                        setUser(null);
                        router.replace("/admin/login");
                    }
                }
            } catch (error) {
                console.error("Admin authentication error:", error);

                removeCookie();

                if (isMounted) {
                    setUser(null);
                    router.replace("/admin/login");
                }
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        }

        checkAdminAuth();

        return () => {
            isMounted = false;
        };
    }, [pathname, isLoginPage, router]);

    const logout = useCallback(() => {
        removeCookie();
        setUser(null);
        router.replace("/admin/login");
    }, [router]);

    return (
        <AdminAuthContext.Provider
            value={{
                user,
                loading,
                logout,
            }}
        >
            {children}
        </AdminAuthContext.Provider>
    );
}

export function useAdminAuth() {
    const context = useContext(AdminAuthContext);

    if (!context) {
        throw new Error(
            "useAdminAuth must be used inside AdminAuthProvider"
        );
    }

    return context;
}
