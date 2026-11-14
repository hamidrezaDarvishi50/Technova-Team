
"use client";

import Link from "next/link";
import {
    FiShoppingCart,
    FiTrash2,
    FiPlus,
    FiMinus,
    FiArrowRight,
    FiShoppingBag,
} from "react-icons/fi";
import { useCart } from "@/context/CartContext";

const formatPrice = (price) =>
    Number(price ?? 0).toLocaleString("fa-IR");

export default function CartPage() {
    const {
        cartItems,
        cartCount,
        subtotal,
        totalPrice,
        totalDiscount,
        isCartLoaded,
        increaseQuantity,
        decreaseQuantity,
        removeFromCart,
        clearCart,
    } = useCart();

    if (!isCartLoaded) {
        return (
            <main dir="rtl" className="min-h-screen bg-[#F3F7FD] px-4 py-20">
                <p className="text-center text-[#64748B]">
                    در حال بارگذاری سبد خرید...
                </p>
            </main>
        );
    }

    if (cartItems.length === 0) {
        return (
            <main dir="rtl" className="flex items-center justify-center bg-[#F3F7FD] px-4 py-16">
                <div className="h-[140px] w-full bg-[#061A40]" />
                <div className="w-full max-w-lg rounded-[32px] border border-white bg-white/70 p-10 text-center shadow-xl backdrop-blur-xl">
                    <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-[#EAF2FF] text-[#0755D9]">
                        <FiShoppingCart size={42} />
                    </div>

                    <h1 className="mt-6 text-2xl font-black text-[#061A40]">
                        سبد خرید شما خالی است!
                    </h1>

                    <p className="mt-3 text-sm leading-7 text-[#64748B]">
                        هنوز محصولی به سبد خرید خود اضافه نکرده‌اید.
                        از فروشگاه تکنووا دیدن کنید و محصولات موردنظرتان را انتخاب کنید.
                    </p>

                    <Link
                        href="/shop"
                        className="mt-8 inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-l from-[#0755D9] to-[#3295FF] px-8 py-3 font-bold text-white transition hover:-translate-y-1"
                    >
                        <FiShoppingBag />
                        مشاهده فروشگاه
                    </Link>
                </div>
            </main>
        );
    }

    return (
        <main dir="rtl" className="min-h-screen bg-[#F3F7FD] px-4 py-10 sm:px-8 lg:px-16">
            <div className="mx-auto max-w-7xl">
                {/* Page header */}
                <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-black text-[#061A40]">
                            سبد خرید
                        </h1>

                        <p className="mt-2 text-sm text-[#64748B]">
                            {formatPrice(cartCount)} محصول در سبد خرید شما
                        </p>
                    </div>

                    <Link
                        href="/shop"
                        className="flex items-center gap-2 text-sm font-bold text-[#0755D9] transition hover:text-[#3295FF]"
                    >
                        ادامه خرید
                        <FiArrowRight />
                    </Link>
                </div>

                <div className="grid grid-cols-1 items-start gap-7 lg:grid-cols-[1fr_360px]">
                    {/* Cart items */}
                    <section className="space-y-4">
                        {cartItems.map((item) => (
                            <article
                                key={item.cartKey}
                                className="flex flex-col gap-5 rounded-[28px] border border-white bg-white/80 p-5 shadow-sm backdrop-blur-xl sm:flex-row sm:items-center"
                            >
                                {/* Product image */}
                                <Link
                                    href={`/shop/${item.slug}`}
                                    className="flex h-36 w-full shrink-0 items-center justify-center rounded-2xl bg-[#F3F7FD] p-3 sm:w-36"
                                >
                                    <img
                                        src={item.image || "/product/phone.jpg"}
                                        alt={item.name}
                                        className="h-full w-full object-contain"
                                    />
                                </Link>

                                {/* Product details */}
                                <div className="min-w-0 flex-1">
                                    <Link href={`/shop/${item.slug}`}>
                                        <h2 className="line-clamp-2 text-lg font-extrabold text-[#172033] transition hover:text-[#0755D9]">
                                            {item.name}
                                        </h2>
                                    </Link>

                                    {item.category && (
                                        <p className="mt-2 text-sm text-[#64748B]">
                                            دسته‌بندی: {item.category}
                                        </p>
                                    )}

                                    {item.variant && (
                                        <div className="mt-3 flex items-center gap-2 text-sm text-[#64748B]">
                      <span
                          className="h-4 w-4 rounded-full border border-black/10"
                          style={{
                              backgroundColor: item.variant.value,
                          }}
                      />
                                            رنگ: {item.variant.name}
                                        </div>
                                    )}

                                    <div className="mt-4">
                    <span className="text-lg font-black text-[#0755D9]">
                      {formatPrice(item.unitPrice)}
                    </span>
                                        <span className="mr-1 text-xs text-[#64748B]">
                      تومان
                    </span>

                                        {Number(item.price) > item.unitPrice && (
                                            <p className="mt-1 text-sm text-[#94A3B8] line-through">
                                                {formatPrice(item.price)} تومان
                                            </p>
                                        )}
                                    </div>
                                </div>

                                {/* Quantity and remove */}
                                <div className="flex items-center justify-between gap-4 sm:flex-col sm:items-end">
                                    <div className="flex h-11 items-center gap-3 rounded-xl border border-[#E2EAF5] bg-[#F8FAFC] px-2">
                                        <button
                                            type="button"
                                            onClick={() => increaseQuantity(item.cartKey)}
                                            disabled={item.quantity >= Number(item.stock ?? 1)}
                                            aria-label="افزایش تعداد"
                                            className="flex h-8 w-8 items-center justify-center rounded-lg text-[#0755D9] transition hover:bg-[#EAF2FF] disabled:cursor-not-allowed disabled:opacity-30"
                                        >
                                            <FiPlus />
                                        </button>

                                        <span className="min-w-6 text-center font-bold text-[#172033]">
                      {formatPrice(item.quantity)}
                    </span>

                                        <button
                                            type="button"
                                            onClick={() => decreaseQuantity(item.cartKey)}
                                            disabled={item.quantity <= 1}
                                            aria-label="کاهش تعداد"
                                            className="flex h-8 w-8 items-center justify-center rounded-lg text-[#0755D9] transition hover:bg-[#EAF2FF] disabled:cursor-not-allowed disabled:opacity-30"
                                        >
                                            <FiMinus />
                                        </button>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() => removeFromCart(item.cartKey)}
                                        className="flex items-center gap-2 text-sm text-rose-500 transition hover:text-rose-700"
                                    >
                                        <FiTrash2 />
                                        حذف محصول
                                    </button>
                                </div>

                                {/* Item total */}
                                <div className="shrink-0 text-left sm:min-w-28">
                                    <p className="text-xs text-[#94A3B8]">
                                        جمع این محصول
                                    </p>
                                    <p className="mt-2 font-black text-[#061A40]">
                                        {formatPrice(item.unitPrice * item.quantity)}
                                    </p>
                                    <p className="text-xs text-[#64748B]">تومان</p>
                                </div>
                            </article>
                        ))}

                        <button
                            type="button"
                            onClick={clearCart}
                            className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-rose-500 transition hover:bg-rose-50"
                        >
                            <FiTrash2 />
                            خالی کردن سبد خرید
                        </button>
                    </section>

                    {/* Order summary */}
                    <aside className="rounded-[28px] border border-white bg-white/90 p-6 shadow-sm backdrop-blur-xl lg:sticky lg:top-6">
                        <h2 className="text-xl font-black text-[#061A40]">
                            خلاصه سفارش
                        </h2>

                        <div className="mt-6 space-y-5">
                            <div className="flex items-center justify-between text-sm">
                <span className="text-[#64748B]">
                  تعداد محصولات
                </span>
                                <span className="font-bold text-[#172033]">
                  {formatPrice(cartCount)}
                </span>
                            </div>

                            <div className="flex items-center justify-between text-sm">
                <span className="text-[#64748B]">
                  قیمت محصولات
                </span>
                                <span className="font-bold text-[#172033]">
                  {formatPrice(subtotal)} تومان
                </span>
                            </div>

                            <div className="flex items-center justify-between text-sm">
                <span className="text-[#64748B]">
                  تخفیف
                </span>
                                <span className="font-bold text-emerald-600">
                  {formatPrice(totalDiscount)} تومان
                </span>
                            </div>

                            <div className="border-t border-dashed border-[#DCE5F1]" />

                            <div className="flex items-center justify-between">
                <span className="font-bold text-[#172033]">
                  مبلغ قابل پرداخت
                </span>
                                <div className="text-left">
                                    <p className="text-xl font-black text-[#0755D9]">
                                        {formatPrice(totalPrice)}
                                    </p>
                                    <p className="text-xs text-[#64748B]">تومان</p>
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={() => {
                                    // مرحله بعد: اتصال به API ثبت سفارش
                                    alert("مرحله اتصال به ثبت سفارش هنوز پیاده‌سازی نشده است.");
                                }}
                                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-l from-[#0755D9] via-[#1684FF] to-[#3295FF] px-5 py-4 font-bold text-white shadow-lg shadow-blue-500/20 transition hover:-translate-y-1"
                            >
                                ادامه فرایند خرید
                                <FiShoppingCart />
                            </button>

                            <p className="text-center text-xs leading-6 text-[#94A3B8]">
                                هزینه ارسال در مرحله ثبت سفارش محاسبه خواهد شد.
                            </p>
                        </div>
                    </aside>
                </div>
            </div>
        </main>
    );
}
