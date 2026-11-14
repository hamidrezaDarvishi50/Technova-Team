
"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { FiChevronLeft, FiChevronRight, FiMessageCircle } from "react-icons/fi";
import { FaStar } from "react-icons/fa";
import { serverAddress } from "@/utils/handledfetch";

export default function ProductComments() {
    const carouselRef = useRef(null);
    const { slug } = useParams();

    const [comments, setComments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        if (!slug) return;

        let controller;

        async function fetchComments() {
            controller?.abort();
            controller = new AbortController();

            setLoading(true);
            setError("");

            try {
                const response = await fetch(
                    `${serverAddress}/comments/product/${slug}/`,
                    {
                        method: "GET",
                        headers: {
                            Accept: "application/json",
                        },
                        signal: controller.signal,
                        cache: "no-store",
                    }
                );

                if (!response.ok) {
                    throw new Error("دریافت نظرات با مشکل مواجه شد.");
                }

                const data = await response.json();

                setComments(Array.isArray(data) ? data : []);
            } catch (err) {
                if (err.name === "AbortError") return;

                console.error("Fetch comments error:", err);
                setError("بارگذاری نظرات با خطا مواجه شد.");
            } finally {
                if (!controller.signal.aborted) {
                    setLoading(false);
                }
            }
        }

        function handleCommentSubmitted(event) {
            if (event.detail?.slug === slug) {
                fetchComments();
            }
        }

        window.addEventListener(
            "product-comment-submitted",
            handleCommentSubmitted
        );

        fetchComments();

        return () => {
            window.removeEventListener(
                "product-comment-submitted",
                handleCommentSubmitted
            );

            controller?.abort();
        };
    }, [slug]);
    function scrollCarousel(direction) {
        if (!carouselRef.current) return;

        const carousel = carouselRef.current;
        const card = carousel.querySelector("[data-comment-card]");
        const cardWidth = card
            ? card.getBoundingClientRect().width
            : 320;

        carousel.scrollBy({
            left: direction * (cardWidth + 16),
            behavior: "smooth",
        });
    }

    function formatDate(dateString) {
        if (!dateString) return "";

        const date = new Date(dateString);

        if (Number.isNaN(date.getTime())) return "";

        return new Intl.DateTimeFormat("fa-IR", {
            year: "numeric",
            month: "long",
            day: "numeric",
        }).format(date);
    }

    return (
        <section
            dir="rtl"
            className="m-auto w-full rounded-2xl border border-white/10 bg-gradient-to-br from-[#0B2148]/90 via-[#071832]/95 to-[#030D23] p-5 sm:p-7 lg:p-8"
        >
            <div className="mb-6 flex items-center justify-between gap-3">
                <div>
                    <h2 className="text-lg font-extrabold text-white sm:text-xl">
                        نظرات کاربران
                    </h2>

                    {!loading && !error && (
                        <p className="mt-2 text-sm text-slate-400">
                            {comments.length.toLocaleString("fa-IR")} نظر برای این محصول
                        </p>
                    )}
                </div>

                {!loading && comments.length > 0 && (
                    <div className="flex shrink-0 items-center gap-2">
                        <button
                            type="button"
                            onClick={() => scrollCarousel(1)}
                            aria-label="نظرات قبلی"
                            className="flex h-10 w-10 items-center justify-center rounded-full text-white transition hover:text-[#3295FF]"
                        >
                            <FiChevronRight size={28} />
                        </button>

                        <button
                            type="button"
                            onClick={() => scrollCarousel(-1)}
                            aria-label="نظرات بعدی"
                            className="flex h-10 w-10 items-center justify-center rounded-full text-white transition hover:text-[#3295FF]"
                        >
                            <FiChevronLeft size={28} />
                        </button>
                    </div>
                )}
            </div>

            {loading ? (
                <div className="flex min-h-40 items-center justify-center gap-3 text-slate-300">
                    <span className="h-6 w-6 animate-spin rounded-full border-2 border-[#3295FF] border-t-transparent" />
                    <span>در حال دریافت نظرات...</span>
                </div>
            ) : error ? (
                <div className="py-10 text-center">
                    <p className="text-sm text-red-400">{error}</p>

                    <button
                        type="button"
                        onClick={() => window.location.reload()}
                        className="mt-4 rounded-xl border border-white/10 px-4 py-2 text-sm text-white transition hover:border-[#3295FF]"
                    >
                        تلاش مجدد
                    </button>
                </div>
            ) : comments.length === 0 ? (
                <div className="flex min-h-40 flex-col items-center justify-center gap-3 text-center">
                    <FiMessageCircle size={36} className="text-slate-500" />

                    <p className="font-bold text-white">
                        هنوز نظری برای این محصول ثبت نشده
                    </p>

                    <p className="text-sm text-slate-400">
                        اولین نفری باش که نظرت رو ثبت می‌کنی.
                    </p>
                </div>
            ) : (
                <div
                    ref={carouselRef}
                    className="flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth pb-4 [scrollbar-color:rgba(50,149,255,0.5)_transparent] [scrollbar-width:thin]"
                >
                    {comments.map((comment) => (
                        <article
                            key={comment.id}
                            data-comment-card
                            className="w-full min-w-0 shrink-0 snap-start rounded-2xl border border-white/10 bg-white/[0.035] p-5 transition duration-300 hover:border-[#3295FF]/40 hover:bg-[#3295FF]/[0.045] sm:w-[calc(50%-8px)] xl:w-[calc(33.333%-11px)]"
                        >
                            {/* نام کاربر و تاریخ */}
                            <div className="mb-4 flex items-start gap-3">
                                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#3295FF]/30 bg-gradient-to-br from-[#3295FF]/25 to-[#061A40] text-sm font-black text-[#BBDFFF]">
                                    {(comment.customer_name || "ک").charAt(0)}
                                </div>

                                <div className="min-w-0">
                                    <p className="truncate text-sm font-bold text-white">
                                        {comment.customer_name || "کاربر تکنوا"}
                                    </p>

                                    <p className="mt-1 text-xs text-slate-500">
                                        {formatDate(comment.created_at)}
                                    </p>
                                </div>
                            </div>

                            {/* امتیاز ستاره‌ای */}
                            <div
                                className="mb-4 flex items-center gap-1"
                                aria-label={`امتیاز ${comment.rating} از ۵`}
                            >
                                {Array.from({ length: 5 }).map((_, index) => (
                                    <FaStar
                                        key={index}
                                        size={13}
                                        className={
                                            index < Number(comment.rating)
                                                ? "text-amber-400"
                                                : "text-slate-700"
                                        }
                                    />
                                ))}

                                <span className="mr-2 text-xs text-slate-400">
                                    {comment.rating} از ۵
                                </span>
                            </div>

                            {/* متن نظر */}
                            <p className="min-h-[100px] whitespace-pre-wrap break-words text-sm leading-7 text-slate-300">
                                {comment.content}
                            </p>

                            {/* پاسخ مدیر، در صورت وجود */}
                            {comment.reply?.trim() && (
                                <div className="mt-5 rounded-xl border border-[#3295FF]/20 bg-[#3295FF]/[0.06] p-4">
                                    <p className="mb-2 text-sm font-bold text-[#BBDFFF]">
                                        پاسخ تکنوا
                                    </p>

                                    <p className="whitespace-pre-wrap break-words text-sm leading-7 text-slate-300">
                                        {comment.reply}
                                    </p>
                                </div>
                            )}
                        </article>
                    ))}
                </div>
            )}

            {!loading && !error && comments.length > 0 && (
                <p className="mt-2 text-center text-xs text-slate-500 sm:hidden">
                    برای دیدن نظرات بیشتر، افقی اسکرول کن
                </p>
            )}
        </section>
    );
}
