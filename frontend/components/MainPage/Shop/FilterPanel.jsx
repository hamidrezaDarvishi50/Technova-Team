
"use client";

import { useEffect, useState } from "react";
import {
    usePathname,
    useRouter,
    useSearchParams,
} from "next/navigation";

import {
    FiChevronDown,
    FiSliders,
    FiRotateCcw,
    FiCheck,
    FiPackage,
    FiDollarSign,
    FiSearch,
} from "react-icons/fi";

import { serverAddress } from "@/utils/handledfetch";

const MAX_PRICE = 500_000_000;
const PRICE_STEP = 1_000_000;

const sortOptions = [
    { label: "جدیدترین", value: "newest" },
    { label: "ارزان‌ترین", value: "cheapest" },
    { label: "گران‌ترین", value: "most_expensive" },
];

const formatPrice = (value) =>
    Number(value).toLocaleString("fa-IR");

export default function FilterPanel() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [searchText, setSearchText] = useState(
        searchParams.get("search") || ""
    );
    const [categories, setCategories] = useState([]);
    const [categoriesLoading, setCategoriesLoading] = useState(true);
    const [categoriesError, setCategoriesError] = useState("");

    const [openFilter, setOpenFilter] = useState("category");
    const [sortBy, setSortBy] = useState("newest");
    const [selectedCategory, setSelectedCategory] = useState("");

    const [maxPrice, setMaxPrice] = useState(MAX_PRICE);
    const [search, setSearch] = useState("");

    const queryString = searchParams.toString();

    // دریافت دسته‌بندی‌ها از بک‌اند
    useEffect(() => {
        const controller = new AbortController();

        async function getCategories() {
            try {
                setCategoriesLoading(true);
                setCategoriesError("");

                const response = await fetch(
                    `${serverAddress}/products/categories/`,
                    {
                        method: "GET",
                        cache: "no-store",
                        signal: controller.signal,
                    }
                );

                if (!response.ok) {
                    throw new Error("دریافت دسته‌بندی‌ها ناموفق بود.");
                }

                const data = await response.json();

                const categoryList = Array.isArray(data)
                    ? data
                    : data.results ?? [];

                setCategories(categoryList);
            } catch (error) {
                if (error.name === "AbortError") return;

                console.error("Categories API Error:", error);
                setCategoriesError(
                    "دریافت دسته‌بندی‌ها با خطا مواجه شد."
                );
            } finally {
                if (!controller.signal.aborted) {
                    setCategoriesLoading(false);
                }
            }
        }

        getCategories();

        return () => controller.abort();
    }, []);

    // هماهنگ کردن فیلترها با URL
    useEffect(() => {
        const params = new URLSearchParams(queryString);

        setSelectedCategory(params.get("category") || "");
        setSortBy(params.get("sort") || "newest");

        const max = Number(params.get("max_price"));

        setMaxPrice(
            params.has("max_price")
                ? Math.min(MAX_PRICE, Math.max(0, max))
                : MAX_PRICE
        );
    }, [queryString]);

    useEffect(() => {
        setSearchText(searchParams.get("search") || "");
    }, [searchParams]);

    // تغییر پارامترهای URL
    function updateUrl(updates) {
        const params = new URLSearchParams(queryString);

        Object.entries(updates).forEach(([key, value]) => {
            if (
                value !== "" &&
                value !== null &&
                value !== undefined
            ) {
                params.set(key, String(value));
            } else {
                params.delete(key);
            }
        });

        const query = params.toString();
        const newUrl = query ? `${pathname}?${query}` : pathname;

        router.replace(newUrl, { scroll: false });
    }

    function toggleFilter(id) {
        setOpenFilter((current) =>
            current === id ? null : id
        );
    }

    // انتخاب دسته‌بندی با استفاده از slug
    function handleCategoryChange(slug) {
        const nextCategory =
            selectedCategory === slug ? "" : slug;

        setSelectedCategory(nextCategory);

        updateUrl({
            category: nextCategory,
        });
    }

    // مرتب‌سازی
    function handleSortChange(value) {
        updateUrl({ sort: value });
    }

    // تغییر حداکثر قیمت؛ حداقل همیشه صفر است
    function handleMaxPriceChange(value) {
        const safeValue = Math.min(
            MAX_PRICE,
            Math.max(0, Number(value))
        );

        setMaxPrice(safeValue);

        updateUrl({
            min_price: "",
            max_price: safeValue < MAX_PRICE ? safeValue : "",
        });
    }

    // پاک کردن همه فیلترها
    function resetFilters() {
        setSelectedCategory("");
        setMaxPrice(MAX_PRICE);
        setSortBy("newest");
        setSearch("");
        setOpenFilter("category");

        updateUrl({
            category: "",
            min_price: "",
            max_price: "",
            sort: "",
        });
    }

    const filteredCategories = categories.filter((category) =>
        category.title
            ?.toLowerCase()
            .includes(search.trim().toLowerCase())
    );

    const selectedCount =
        (selectedCategory ? 1 : 0) +
        (maxPrice < MAX_PRICE ? 1 : 0);

    const maxPercent = (maxPrice / MAX_PRICE) * 100;

    return (
        <aside dir="rtl" className="h-fit w-full max-w-[370px] shrink-0 overflow-hidden rounded-3xl border border-white/80 bg-white/75 p-5 text-[var(--color-text)] shadow-[0_20px_60px_rgba(7,85,217,0.10)] backdrop-blur-2xl sm:p-6">
            {/* Header */}
            <div className="mb-6 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-blue-100 bg-gradient-to-br from-white to-blue-50 text-xl text-[var(--color-primary)] shadow-sm">
                        <FiSliders />
                    </div>

                    <div>
                        <h2 className="text-lg font-black">
                            فیلتر محصولات
                        </h2>

                        <p className="mt-1 text-xs text-slate-400">
                            محصولات موردنظرت رو پیدا کن
                        </p>
                    </div>
                </div>

                {selectedCount > 0 && (
                    <span className="flex h-7 min-w-7 items-center justify-center rounded-full bg-[var(--color-primary)] px-2 text-xs font-bold text-white">
                        {selectedCount}
                    </span>
                )}
            </div>

            {/* Search */}
            <section className="mb-6">
                <SectionTitle title="جست‌وجوی محصول" />

                <div className="relative mt-3">
                    <input type="text" value={searchText} onChange={(e) => setSearchText(e.target.value)} onKeyDown={(e) => {
                            if (e.key === "Enter") {
                                updateUrl({
                                    search: searchText.trim(),
                                });
                            }
                        }}
                        placeholder="نام محصول موردنظر را وارد کنید..." className="w-full pr-2 rounded-xl border border-blue-100/70 bg-white/70 py-3 pr-4 pl-11 text-right text-sm text-[var(--color-text-primary)] outline-none transition placeholder:text-gray-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-200"
                    />

                    <button type="button" onClick={() =>
                            updateUrl({
                                search: searchText.trim(),
                            })
                        }
                        aria-label="جست‌وجوی محصول" className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-600 transition hover:text-blue-800">
                        <FiSearch size={19} />
                    </button>
                </div>
            </section>

            {/* Sorting */}
            <section className="mb-6">
                <SectionTitle title="مرتب‌سازی" />

                <div className="mt-3 grid grid-cols-2 gap-2">
                    {sortOptions.map((option) => {
                        const isActive = sortBy === option.value;

                        return (
                            <button key={option.value} type="button" onClick={() => handleSortChange(option.value)} aria-pressed={isActive} className={`flex min-h-11 items-center justify-between gap-2 rounded-xl border px-3 py-2 text-right text-xs font-bold transition ${
                                    isActive
                                        ? "border-blue-300 bg-blue-50 text-[var(--color-primary)] shadow-sm"
                                        : "border-blue-100/70 bg-white/55 text-[var(--color-text-secondary)] hover:border-blue-200 hover:bg-blue-50/70"}`}>
                                <span>{option.label}</span>

                                {isActive && (
                                    <FiCheck className="shrink-0" />
                                )}
                            </button>
                        );
                    })}
                </div>
            </section>

            <Divider />

            {/* Maximum Price */}
            <section className="py-5">
                <button type="button" onClick={() => toggleFilter("price")} aria-expanded={openFilter === "price"} className="flex min-h-11 w-full items-center justify-between gap-3 text-right">
                    <span className="flex items-center gap-3">
                        <FilterIcon>
                            <FiDollarSign />
                        </FilterIcon>

                        <span className="text-sm font-extrabold">
                            محدوده قیمت
                        </span>
                    </span>

                    <FiChevronDown className={`text-slate-400 transition-transform duration-300 ${openFilter === "price" ? "rotate-180 text-blue-600" : ""}`}/>
                </button>

                <div className={`grid transition-all duration-300 ${openFilter === "price" ? "mt-5 grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
                    <div className="overflow-hidden">
                        <div className="mb-5 space-y-3">
                            <div className="flex items-center justify-between gap-2 text-xs font-bold">
                                <span className="text-slate-500">
                                    حداقل: ۰ تومان
                                </span>

                                <span className="text-blue-700">
                                    حداکثر: {formatPrice(maxPrice)} تومان
                                </span>
                            </div>

                            {/* Single Range Slider */}
                            <div className="relative h-8" dir="ltr">
                                <div className="absolute left-0 right-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-blue-100" />

                                <div
                                    className="absolute left-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-gradient-to-r from-blue-400 to-blue-700"
                                    style={{
                                        right: `${100 - maxPercent}%`,
                                    }}
                                />

                                <input type="range" min="0" max={MAX_PRICE} step={PRICE_STEP} value={maxPrice} onChange={(event) =>
                                        handleMaxPriceChange(
                                            event.target.value
                                        )
                                    }
                                    className="range-slider absolute inset-0 z-20 h-8 w-full cursor-pointer" aria-label="حداکثر قیمت"
                                />
                            </div>

                            <div className="flex justify-between text-[10px] text-slate-400">
                                <span>۰ تومان</span>
                                <span>۵۰۰ میلیون تومان</span>
                            </div>
                        </div>


                    </div>
                </div>
            </section>

            <Divider />

            {/* Categories */}
            <section className="py-2">
                <button type="button" onClick={() => toggleFilter("category")} aria-expanded={openFilter === "category"} className="flex min-h-[60px] w-full items-center justify-between gap-3 py-3 text-right">
                    <span className="flex items-center gap-3">
                        <FilterIcon>
                            <FiPackage />
                        </FilterIcon>

                        <span className="text-sm font-extrabold">
                            دسته‌بندی محصول
                        </span>

                        {selectedCategory && (
                            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-blue-100 px-1.5 text-[10px] font-black text-blue-700">
                                ۱
                            </span>
                        )}
                    </span>

                    <FiChevronDown className={`shrink-0 text-slate-400 transition-transform duration-300 ${openFilter === "category" ? "rotate-180 text-blue-600" : ""}`}/>
                </button>

                <div className={`grid transition-all duration-300 ${openFilter === "category" ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
                    <div className="overflow-hidden">
                        <div className="space-y-1 pb-4">
                            {categoriesLoading ? (
                                <p className="py-4 text-center text-xs text-slate-400">
                                    در حال دریافت دسته‌بندی‌ها...
                                </p>
                            ) : categoriesError ? (
                                <p className="py-4 text-center text-xs text-red-500">
                                    {categoriesError}
                                </p>
                            ) : filteredCategories.length === 0 ? (
                                <p className="py-4 text-center text-xs text-slate-400">
                                    دسته‌بندی‌ای پیدا نشد.
                                </p>
                            ) : (
                                filteredCategories.map((category) => {
                                    const checked =
                                        selectedCategory === category.slug;

                                    return (
                                        <label key={category.id} className={`flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${checked ? "bg-blue-50 font-bold text-[var(--color-primary)]" : "text-[var(--color-text-secondary)] hover:bg-white/80"}`}>
                                            <input type="checkbox" checked={checked} onChange={() => handleCategoryChange(category.slug)} className="sr-only"/>

                                            <span className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-md border transition ${checked ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-white" : "border-slate-300 bg-white"}`}>
                                                {checked && (
                                                    <FiCheck className="text-xs" />
                                                )}
                                            </span>

                                            {category.title}
                                        </label>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>
            </section>

            {/* Reset */}
            <div className="mt-5 border-t border-blue-100/80 pt-5">
                <button type="button" onClick={resetFilters} className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-blue-200 bg-white/70 text-sm font-extrabold text-[var(--color-primary)] transition hover:border-blue-300 hover:bg-blue-50">
                    <FiRotateCcw />
                    پاک کردن همه فیلترها
                </button>

                <p className="mt-3 text-center text-[11px] leading-5 text-slate-400">
                    فیلترها به‌صورت خودکار روی محصولات اعمال می‌شوند.
                </p>
            </div>

            <style jsx>{`
                .range-slider {
                    appearance: none;
                    -webkit-appearance: none;
                    background: transparent;
                }

                .range-slider::-webkit-slider-thumb {
                    appearance: none;
                    -webkit-appearance: none;
                    width: 18px;
                    height: 18px;
                    border-radius: 50%;
                    background: #0755d9;
                    border: 3px solid white;
                    box-shadow: 0 1px 7px rgba(7, 85, 217, 0.35);
                    cursor: grab;
                }

                .range-slider::-moz-range-thumb {
                    width: 13px;
                    height: 13px;
                    border-radius: 50%;
                    background: #0755d9;
                    border: 3px solid white;
                    box-shadow: 0 1px 7px rgba(7, 85, 217, 0.35);
                    cursor: grab;
                }

                .range-slider::-webkit-slider-runnable-track {
                    background: transparent;
                }

                .range-slider::-moz-range-track {
                    background: transparent;
                }
            `}</style>
        </aside>
    );
}

function SectionTitle({ title }) {
    return (
        <div className="flex items-center gap-3">
            <h3 className="shrink-0 text-sm font-black">
                {title}
            </h3>

            <div className="h-px flex-1 bg-gradient-to-l from-blue-200 to-transparent" />
        </div>
    );
}

function FilterIcon({ children }) {
    return (
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-blue-100 bg-gradient-to-br from-white to-blue-50 text-base text-[var(--color-primary)] shadow-sm">
            {children}
        </span>
    );
}

function Divider() {
    return (
        <div className="h-px w-full bg-gradient-to-l from-blue-200/80 via-blue-100 to-transparent" />
    );
}
