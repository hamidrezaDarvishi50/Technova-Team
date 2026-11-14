"use client";

import { useState } from "react";
import {
    FiHeart,
    FiShoppingCart,
    FiCheckCircle,
    FiMinus,
    FiPlus,
} from "react-icons/fi";
import { serverAddress } from "@/utils/handledfetch";
import { getCookie } from "@/utils/cookie";
import { useCart } from "@/context/CartContext";
import { toast } from "react-toastify";

const colors = [
    { name: "تیتانیوم طبیعی", value: "#A7A9AC" },
    { name: "تیتانیوم صحرایی", value: "#B9A18B" },
    { name: "تیتانیوم سفید", value: "#E8E8E8" },
    { name: "تیتانیوم مشکی", value: "#343434" },
];

export default function ProductInfo({ product, slug }) {
    const [selectedColor, setSelectedColor] = useState(0);
    const [quantity, setQuantity] = useState(1);
    const [isFavorite, setIsFavorite] = useState(false);
    const [favoriteLoading, setFavoriteLoading] = useState(false);
    const [favoriteMessage, setFavoriteMessage] = useState("");
    const { addToCart } = useCart();

    const formatPrice = (price) =>
        Number(price || 0).toLocaleString("fa-IR");

    async function handleFavorite() {
        if (favoriteLoading) return;

        setFavoriteLoading(true);
        setFavoriteMessage("");

        try {
            const token = getCookie("accessToken");

            const response = await fetch(
                `${serverAddress}/products/favorites/`,
                {
                    method: "POST",
                    headers: {
                        Accept: "application/json",
                        "Content-Type": "application/json",
                        ...(token
                            ? { Authorization: `Bearer ${token}` }
                            : {}),
                    },
                    credentials: "include",
                    body: JSON.stringify({
                        product: slug,
                    }),
                }
            );

            if (response.status === 401 || response.status === 403) {
                setFavoriteMessage("برای افزودن محصول به علاقه‌مندی‌ها وارد حساب کاربری شوید.");
                return;
            }

            if (!response.ok) {
                const errorText = await response.text();
                console.error("Favorite API error:", errorText);
                setFavoriteMessage("افزودن محصول به علاقه‌مندی‌ها انجام نشد.");
                return;
            }

            setIsFavorite(true);
            setFavoriteMessage("محصول به علاقه‌مندی‌ها اضافه شد.");
        } catch (error) {
            console.error("Add favorite error:", error);
            setFavoriteMessage("ارتباط با سرور برقرار نشد.");
        } finally {
            setFavoriteLoading(false);
        }
    }

    return (
        <section dir="rtl" className="w-[50%] min-w-0 space-y-6 text-white">
            <div className="space-y-3">
                <span className="inline-flex rounded-lg border border-[#3295FF]/20 bg-[#3295FF]/10 px-3 py-1.5 text-sm font-semibold text-[#70B8FF]">
                    {product.brand}
                </span>

                <div className="flex items-start justify-between gap-3">
                    <h1 className="text-2xl font-black leading-relaxed sm:text-3xl lg:text-4xl">
                        {product.name}
                    </h1>

                    <button
                        type="button"
                        onClick={handleFavorite}
                        disabled={favoriteLoading || isFavorite}
                        aria-label={
                            isFavorite
                                ? "محصول در علاقه‌مندی‌هاست"
                                : "افزودن به علاقه‌مندی‌ها"
                        }
                        aria-pressed={isFavorite}
                        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full border transition ${
    isFavorite
        ? "border-rose-400/40 bg-rose-500/10 text-rose-400"
        : "border-white/10 bg-white/[0.03] text-white/70 hover:border-[#3295FF]/50 hover:text-[#3295FF]"
} disabled:cursor-not-allowed disabled:opacity-70`}
                    >
                        <FiHeart
                            size={21}
                            className={isFavorite ? "fill-current" : ""}
                        />
                    </button>
                </div>

                {favoriteMessage && (
                    <p
                        role="status"
                        className={`text-sm ${
    isFavorite ? "text-emerald-400" : "text-amber-300"
}`}
                    >
                        {favoriteMessage}
                    </p>
                )}
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4 sm:p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="space-y-2">
                        <span className="text-sm text-white/50">
                            قیمت محصول
                        </span>

                        <div className="flex flex-wrap items-baseline gap-2">
                            <span className="text-2xl font-black text-white sm:text-3xl">
                                {formatPrice(product.price)}
                            </span>

                            <span className="text-sm text-[#BBDFFF]">
                                تومان
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-2 text-sm">
                <FiCheckCircle className="shrink-0 text-emerald-400" size={18} />
                <span className="text-emerald-300">موجود در انبار</span>
            </div>

            <div className="space-y-3">
                <span className="text-sm font-semibold text-white">
                    {colors[selectedColor].name}
                </span>

                <div className="flex flex-wrap items-center gap-3">
                    {colors.map((color, index) => (
                        <button
                            key={color.value}
                            type="button"
                            onClick={() => setSelectedColor(index)}
                            aria-label={color.name}
                            aria-pressed={selectedColor === index}
                            title={color.name}
                            className={`flex h-10 w-10 items-center justify-center rounded-full border-2 transition ${
    selectedColor === index
        ? "border-[#3295FF] ring-2 ring-[#3295FF]/20 ring-offset-2 ring-offset-[#061A40]"
        : "border-white/20 hover:border-white/60"
}`}
                        >
                            <span
                                className="h-7 w-7 rounded-full border border-black/10"
                                style={{ backgroundColor: color.value }}
                            />
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
                <div className="flex h-14 items-center justify-between rounded-2xl border border-white/10 bg-white/[0.04] p-1.5 sm:w-[140px] sm:shrink-0">
                    <button
                        type="button"
                        onClick={() =>
                            setQuantity((value) => Math.max(1, value - 1))
                        }
                        disabled={quantity <= 1}
                        aria-label="کاهش تعداد"
                        className="flex h-10 w-10 items-center justify-center rounded-xl text-white hover:bg-white/10 disabled:opacity-30"
                    >
                        <FiMinus size={17} />
                    </button>

                    <span className="min-w-6 text-center font-bold">
                        {quantity.toLocaleString("fa-IR")}
                    </span>

                    <button
                        type="button"
                        onClick={() =>
                            setQuantity((value) =>
                                Math.min(Number(product.stock || 1), value + 1)
                            )
                        }
                        disabled={quantity >= Number(product.stock || 1)}
                        aria-label="افزایش تعداد"
                        className="flex h-10 w-10 items-center justify-center rounded-xl text-white hover:bg-white/10 disabled:opacity-30"
                    >
                        <FiPlus size={17} />
                    </button>
                </div>


                <button
                    type="button"
                    onClick={() => {
                        if (Number(product.stock) <= 0) {
                            toast.warning("این محصول ناموجود است.");
                            return;
                        }

                        addToCart(
                            product,
                            quantity,
                            colors[selectedColor]
                        );
                    }}
                    disabled={Number(product.stock) <= 0}
                    className="flex h-14 flex-1 items-center justify-center gap-3
                        rounded-2xl bg-gradient-to-l from-[#0755D9]
                        via-[#1684FF] to-[#3295FF] px-5 font-bold
                        text-white transition hover:-translate-y-0.5
                        disabled:cursor-not-allowed disabled:opacity-50">
                    <FiShoppingCart size={20} />
                    افزودن به سبد خرید
                </button>

            </div>
        </section>
    );
}
