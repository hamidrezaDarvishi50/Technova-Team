"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

import FilterPanel from "@/components/MainPage/Shop/FilterPanel";
import ProductCard from "@/components/MainPage/Shop/ProductCard";
import { serverAddress } from "@/utils/handledfetch";

export default function ShopContent({ initialProducts }) {
    const searchParams = useSearchParams();
    const queryString = searchParams.toString();

    const [products, setProducts] = useState(initialProducts ?? []);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(
        initialProducts === null
            ? "دریافت محصولات با خطا مواجه شد."
            : ""
    );

    useEffect(() => {
        if (!queryString && initialProducts !== null) {
            setProducts(initialProducts ?? []);
            setError("");
            setLoading(false);
            return;
        }

        const controller = new AbortController();

        const timer = setTimeout(async () => {
            try {
                setLoading(true);
                setError("");

                // تمام فیلترهای انتخاب‌شده از URL
                const query = queryString ? `?${queryString}` : "";

                // ارسال درخواست به API
                const response = await fetch(
                    `${serverAddress}/products/${query}`,
                    {
                        method: "GET",
                        cache: "no-store",
                        signal: controller.signal,
                    }
                );

                if (!response.ok) {
                    throw new Error(
                        `خطا در دریافت محصولات: ${response.status}`
                    );
                }

                const data = await response.json();

                const productList = Array.isArray(data)
                    ? data
                    : data.results ?? [];

                setProducts(productList);

            } catch (err) {
                if (err.name === "AbortError") return;

                console.error("Products API Error:", err);

                setError(
                    "دریافت محصولات با خطا مواجه شد. دوباره تلاش کن."
                );

                setProducts([]);

            } finally {
                if (!controller.signal.aborted) {
                    setLoading(false);
                }
            }
        }, 300);

        return () => {
            clearTimeout(timer);
            controller.abort();
        };

    }, [queryString, initialProducts]);

    const selectedCategory = searchParams.get("category");

    return (
        <section
            dir="rtl"
            className="relative isolate flex min-h-screen w-full flex-col gap-5 overflow-hidden bg-[#061A40] bg-cover bg-center bg-no-repeat px-5 py-10 sm:px-8 lg:flex-row lg:px-10"
            style={{
                backgroundImage: "url('/product/cartbg.jpg')",
            }}
        >
            <FilterPanel />

            <div className="relative min-w-0 flex-1">

                {selectedCategory && (
                    <div className="mb-6 text-right">
                        <p className="text-sm text-white/60">
                            دسته‌بندی انتخاب‌شده:
                        </p>

                        <h2 className="mt-1 text-xl font-black text-white">
                            {selectedCategory}
                        </h2>
                    </div>
                )}

                {loading && (
                    <div className="mb-5 text-center text-sm font-bold text-white">
                        در حال دریافت محصولات...
                    </div>
                )}

                {error ? (
                    <p className="text-center text-white">
                        {error}
                    </p>
                ) : !loading && products.length === 0 ? (
                    <p className="text-center text-white">
                        محصولی با این مشخصات پیدا نشد.
                    </p>
                ) : (
                    <div className="grid grid-cols-1 items-start justify-items-center gap-6 sm:grid-cols-2 xl:grid-cols-3">
                        {products.map((product) => (
                            <ProductCard
                                key={product.id}
                                product={product}
                            />
                        ))}
                    </div>
                )}

            </div>
        </section>
    );
}
