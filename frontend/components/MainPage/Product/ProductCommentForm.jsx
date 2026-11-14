
"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { FiMessageSquare, FiSend } from "react-icons/fi";
import { FaStar } from "react-icons/fa";
import { serverAddress } from "@/utils/handledfetch";
import { getCookie } from "@/utils/cookie";

export default function ProductCommentForm() {
    const { slug } = useParams();

    const [hoveredRating, setHoveredRating] = useState(0);
    const [rating, setRating] = useState(5);
    const [content, setContent] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);

    async function handleSubmit(e) {
        e.preventDefault();

        setError("");
        setSuccess(false);
        setLoading(true);

        const accessToken = getCookie("accessToken");

        try {
            const response = await fetch(
                `${serverAddress}/comments/product/${slug}/`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Accept: "application/json",
                        Authorization: `Bearer ${accessToken}`,
                    },
                    body: JSON.stringify({
                        rating,
                        content: content.trim(),
                    }),
                }
            );


            const responseText = await response.text();
            let data = null;

            try {
                data = responseText ? JSON.parse(responseText) : null;
            } catch {
                data = responseText;
            }

            if (!response.ok) {
                console.error("Comment API error:", {
                    status: response.status,
                    data,
                });

                const message =
                    typeof data === "object" && data !== null
                        ? data.detail ||
                        data.message ||
                        data.content?.[0] ||
                        data.rating?.[0] ||
                        data.non_field_errors?.[0]
                        : null;

                throw new Error(
                    message ||
                    `ثبت دیدگاه ناموفق بود. کد خطا: ${response.status}`
                );
            }

            setSuccess(true);
            setContent("");
            setRating(5);

            window.dispatchEvent(
                new CustomEvent("product-comment-submitted", {
                    detail: { slug },
                })
            );

            console.log("Comment submitted successfully:", data);

            // اطلاع به بخش دیدگاه‌ها برای دریافت مجدد اطلاعات
            window.dispatchEvent(
                new CustomEvent("product-comment-submitted", {
                    detail: { slug },
                })
            );
        } catch (err) {
            console.error("Submit product comment error:", err);
            setError(err.message || "ثبت دیدگاه انجام نشد.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <section
            dir="rtl"
            className="rounded-2xl border border-white/10 bg-[#061A40]/70 p-5 shadow-xl shadow-black/10 sm:p-7"
        >
            <div className="mb-6 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#0755D9]/20 text-[#3295FF]">
                    <FiMessageSquare className="text-xl" />
                </div>

                <div>
                    <h2 className="text-lg font-bold text-white">
                        ثبت دیدگاه
                    </h2>
                    <p className="mt-1 text-sm text-white/45">
                        تجربه‌ات از این محصول رو با دیگران به اشتراک بذار.
                    </p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* امتیازدهی */}
                <div className="space-y-3" dir="rtl">
                    <label className="block text-sm font-medium text-white">
                        امتیاز شما
                    </label>

                    <div className="flex items-center gap-2">
                        {[1, 2, 3, 4, 5].map((star) => (
                            <button
                                key={star}
                                type="button"
                                onClick={() => setRating(star)}
                                onMouseEnter={() => setHoveredRating(star)}
                                onMouseLeave={() => setHoveredRating(0)}
                                aria-label={`${star} از ۵ ستاره`}
                                aria-pressed={rating === star}
                                className="transition-transform duration-200 hover:scale-110 focus:outline-none"
                            >
                                <FaStar
                                    size={28}
                                    className={
                                        star <= (hoveredRating || rating)
                                            ? "text-yellow-400"
                                            : "text-gray-500"
                                    }
                                />
                            </button>
                        ))}

                        <span className="mr-2 text-sm text-gray-300">
                            {rating} از ۵
                        </span>
                    </div>
                </div>

                {/* متن دیدگاه */}
                <div>
                    <label
                        htmlFor="comment-content"
                        className="mb-3 block text-sm font-medium text-white/80"
                    >
                        متن دیدگاه
                    </label>

                    <textarea
                        id="comment-content"
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        placeholder="نظرت درباره کیفیت، عملکرد یا ارزش خرید این محصول چیه؟"
                        rows={5}
                        maxLength={2000}
                        required
                        className="w-full resize-y rounded-xl border border-white/10 bg-[#030D23] px-4 py-3 text-sm leading-7 text-white outline-none transition placeholder:text-white/30 focus:border-[#3295FF] focus:ring-4 focus:ring-[#0755D9]/15"
                    />

                    <div className="mt-2 text-left text-xs text-white/35">
                        {content.length}/2000
                    </div>
                </div>

                {/* پیام خطا */}
                {error && (
                    <div
                        role="alert"
                        className="rounded-xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm leading-6 text-red-300"
                    >
                        {error}
                    </div>
                )}

                {/* پیام موفقیت */}
                {success && (
                    <div
                        role="status"
                        className="rounded-xl border border-green-400/20 bg-green-500/10 px-4 py-3 text-sm leading-6 text-green-300"
                    >
                        دیدگاهت با موفقیت ثبت شد.
                    </div>
                )}

                <div className="flex justify-end">
                    <button
                        type="submit"
                        disabled={loading}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0755D9] px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-900/20 transition hover:bg-[#0645B5] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        <FiSend />

                        {loading ? "در حال ثبت..." : "ثبت دیدگاه"}
                    </button>
                </div>
            </form>
        </section>
    );
}
