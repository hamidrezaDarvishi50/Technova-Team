"use client";

import { useEffect, useState } from "react";
import { FiHeart } from "react-icons/fi";
import { toast } from "react-toastify";

import ProductCard from "@/components/MainPage/Shop/ProductCard";
import Sidebar from "@/components/UserPanel/Sidebar/Sidebar";

import { useAuth } from "@/context/AuthContext";
import { getCookie } from "@/utils/cookie";
import { serverAddress } from "@/utils/handledfetch";

export default function FavoritesPage() {
    const { isLoggedIn, isAuthLoading } = useAuth();

    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        if (isAuthLoading) return;

        if (!isLoggedIn) {
            setProducts([]);
            setLoading(false);
            setError("برای مشاهده علاقه‌مندی‌ها ابتدا وارد حساب کاربری خود شوید.");
            return;
        }

        const accessToken = getCookie("accessToken");

        if (!accessToken) {
            setProducts([]);
            setLoading(false);
            setError("نشست شما معتبر نیست. لطفاً دوباره وارد حساب شوید.");
            return;
        }

        const controller = new AbortController();

        const fetchFavorites = async () => {
            try {
                setLoading(true);
                setError("");

                const response = await fetch(
                    `${serverAddress}/products/favorites/`,
                    {
                        method: "GET",
                        headers: {
                            Authorization: `Bearer ${accessToken}`,
                            "Content-Type": "application/json",
                        },
                        cache: "no-store",
                        signal: controller.signal,
                    }
                );

                if (!response.ok) {
                    if (response.status === 401) {
                        throw new Error("نشست شما منقضی شده است. لطفاً دوباره وارد شوید.");
                    }

                    throw new Error("دریافت علاقه‌مندی‌ها با خطا مواجه شد.");
                }

                const data = await response.json();

                setProducts(
                    Array.isArray(data) ? data : data.results ?? []
                );
            } catch (err) {
                if (err.name === "AbortError") return;

                console.error("Favorites API error:", err);

                setError(
                    err.message || "دریافت علاقه‌مندی‌ها با خطا مواجه شد."
                );

                setProducts([]);
            } finally {
                if (!controller.signal.aborted) {
                    setLoading(false);
                }
            }
        };

        fetchFavorites();

        return () => controller.abort();
    }, [isLoggedIn, isAuthLoading]);

    return (
        <>
            <div className="h-[140px] bg-[#061A40]" />

            <div className="grid grid-cols-1 gap-6 md:grid-cols-[250px_minmax(0,1fr)]">
                <Sidebar />

                <main
                    dir="rtl"
                    className="relative mb-8 ml-8 mt-8 overflow-hidden
            rounded-3xl border border-white/20 bg-[#061A40]/85
            p-4 shadow-[0_25px_80px_rgba(6,26,64,0.2)]
            backdrop-blur-2xl sm:p-6 lg:p-8"
                >
                    {/* Background effects */}
                    <div
                        className="pointer-events-none absolute -right-20 -top-20
              h-56 w-56 rounded-full bg-[#3295FF]/15 blur-3xl"
                    />

                    <div
                        className="pointer-events-none absolute -bottom-24 -left-20
              h-56 w-56 rounded-full bg-[#0755D9]/20 blur-3xl"
                    />

                    {/* Header */}
                    <header
                        className="relative z-10 mb-8 flex items-center gap-4
              border-b border-white/15 pb-6"
                    >
                        <div
                            className="flex h-14 w-14 shrink-0 items-center
                justify-center rounded-2xl border border-white/15
                bg-white/10 text-[#3295FF] backdrop-blur-xl"
                        >
                            <FiHeart size={28} />
                        </div>

                        <div>
                            <h1
                                className="bg-gradient-to-l from-white via-[#BBDFFF]
                  to-[#3295FF] bg-clip-text text-2xl font-black
                  text-transparent sm:text-3xl"
                            >
                                علاقه‌مندی‌های من
                            </h1>

                            <p className="mt-2 text-sm text-blue-100/70">
                                محصولات مورد علاقه شما
                            </p>
                        </div>
                    </header>

                    {/* Products */}
                    <section className="relative z-10 min-w-0">
                        {isAuthLoading || loading ? (
                            <p className="py-12 text-center font-bold text-white">
                                در حال دریافت علاقه‌مندی‌ها...
                            </p>
                        ) : error ? (
                            <p className="py-12 text-center text-red-200">
                                {error}
                            </p>
                        ) : products.length === 0 ? (
                            <div className="py-16 text-center">
                                <FiHeart
                                    className="mx-auto mb-4 text-white/40"
                                    size={48}
                                />

                                <p className="font-bold text-white">
                                    هنوز محصولی به علاقه‌مندی‌های خود اضافه نکرده‌اید.
                                </p>

                                <p className="mt-2 text-sm text-blue-100/60">
                                    به فروشگاه بروید و محصولات مورد علاقه‌تان را انتخاب کنید.
                                </p>
                            </div>
                        ) : (
                            <>
                                <p className="mb-6 text-sm text-blue-100/70">
                                    تعداد محصولات: {products.length.toLocaleString("fa-IR")}
                                </p>

                                <div
                                    className="grid grid-cols-1 items-start
    justify-items-center gap-6
    sm:grid-cols-2 xl:grid-cols-3"
                                >
                                    {products.map((product) => (
                                        <ProductCard
                                            key={product.id}
                                            product={product}
                                            isFavorite={true}
                                            onFavoriteChange={(updatedProduct, favorite) => {
                                                if (!favorite) {
                                                    setProducts((previousProducts) =>
                                                        previousProducts.filter(
                                                            (item) => item.id !== updatedProduct.id
                                                        )
                                                    );
                                                }
                                            }}
                                        />
                                    ))}
                                </div>
                            </>
                        )}
                    </section>
                </main>
            </div>
        </>
    );
}