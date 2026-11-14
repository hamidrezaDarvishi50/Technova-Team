
"use client";
import handledFetch from "../../../utils/handledfetch";
import { setCookie } from "../../../utils/cookie";
import { useEffect, useRef, useState } from "react";
import {
    FiX,
    FiPhone,
    FiArrowRight,
    FiShield,
    FiCheckCircle,
    FiRefreshCw,
    FiZap,
} from "react-icons/fi";
import {IoCheckmark} from "react-icons/io5";
import {useAuth} from "@/context/AuthContext";

export default function LoginModal({ onClose, onSuccess }) {
    const { login } = useAuth();
    const [step, setStep] = useState("phone");
    const [phone, setPhone] = useState("");
    const [otp, setOtp] = useState(["", "", "", ""]);
    const [seconds, setSeconds] = useState(120);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const otpRefs = useRef([]);

    useEffect(() => {
        if (step !== "otp" || seconds <= 0) return;

        const timer = setTimeout(() => {
            setSeconds((prev) => Math.max(prev - 1, 0));
        }, 1000);

        return () => clearTimeout(timer);
    }, [step, seconds]);

    useEffect(() => {
        function handleKeyDown(event) {
            if (event.key === "Escape") onClose();
        }

        window.addEventListener("keydown", handleKeyDown);

        return () => {
            window.removeEventListener("keydown", handleKeyDown);
        };
    }, [onClose]);

    const formatTime = (value) => {
        const minutes = Math.floor(value / 60);
        const remainingSeconds = value % 60;

        return `${String(minutes).padStart(2, "0")}:${String(
            remainingSeconds
        ).padStart(2, "0")}`;
    };

    async function handlePhoneSubmit(event) {
        event.preventDefault();
        if (loading) return;

        setError("");

        if (!/^09\d{9}$/.test(phone)) {
            setError("شماره موبایل باید با 09 شروع شود و ۱۱ رقم باشد.");
            return;
        }

        setLoading(true);

        try {
            const result = await handledFetch(
                "/accounts/customer/otp/request/",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        phone,
                    }),
                },
                (data) => ({
                    __requestSuccess: true,
                    data,
                })
            );

            if (!result?.__requestSuccess) {
                setError(
                    result?.message ||
                    result?.error ||
                    "ارسال کد تأیید ناموفق بود."
                );
                return;
            }

            setStep("otp");
            setSeconds(120);
            setOtp(["", "", "", ""]);

            setTimeout(() => {
                otpRefs.current[0]?.focus();
            }, 100);
        } catch (error) {
            console.error("OTP request error:", error);
            setError("ارتباط با سرور برقرار نشد. دوباره تلاش کن.");
        } finally {
            setLoading(false);
        }
    }

    function handleOtpChange(value, index) {
        const digit = value.replace(/\D/g, "").slice(-1);

        const updatedOtp = [...otp];
        updatedOtp[index] = digit;

        setOtp(updatedOtp);
        setError("");

        if (digit && index < 3) {
            otpRefs.current[index + 1]?.focus();
        }
    }

    function handleOtpKeyDown(event, index) {
        if (
            event.key === "Backspace" &&
            !otp[index] &&
            index > 0
        ) {
            otpRefs.current[index - 1]?.focus();
        }

        if (event.key === "ArrowLeft" && index < 3) {
            otpRefs.current[index + 1]?.focus();
        }

        if (event.key === "ArrowRight" && index > 0) {
            otpRefs.current[index - 1]?.focus();
        }
    }

    function handleOtpPaste(event) {
        const pasted = event.clipboardData
            .getData("text")
            .replace(/\D/g, "")
            .slice(0, 4);

        if (!pasted) return;

        event.preventDefault();

        const updatedOtp = ["", "", "", ""];

        pasted.split("").forEach((digit, index) => {
            updatedOtp[index] = digit;
        });

        setOtp(updatedOtp);
        setError("");

        otpRefs.current[Math.min(pasted.length, 3)]?.focus();
    }

    async function handleOtpSubmit(event) {
        event.preventDefault();
        setError("");

        const enteredOtp = otp.join("");

        if (enteredOtp.length !== 4) {
            setError("لطفاً هر چهار رقم کد را وارد کن.");
            return;
        }

        if (seconds <= 0) {
            setError("زمان کد تمام شده است. کد جدید دریافت کن.");
            return;
        }

        setLoading(true);

        try {
            const result = await handledFetch(
                "/accounts/customer/otp/verify/",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        phone,
                        code: enteredOtp,
                    }),
                },
                (data) => ({
                    __requestSuccess: true,
                    data,
                })
            );

            if (!result?.__requestSuccess) {
                setError(
                    result?.message ||
                    result?.error ||
                    "کد تأیید نامعتبر است یا ورود انجام نشد."
                );
                return;
            }

            const data = result.data;

            if (!data?.tokens?.access || !data?.tokens?.refresh) {
                setError(
                    "ورود انجام شد، اما اطلاعات توکن از سرور دریافت نشد."
                );
                return;
            }

            // ذخیره توکن‌های دریافتی از بک‌اند
            setCookie(data.tokens);

            // ساخت اطلاعات کاربر
            const userData = {
                phone: data.customer?.phone || phone,
                customer: data.customer,
                is_new: data.is_new,
                profile_completed: data.profile_completed,
            };

            // ذخیره اطلاعات در Context و localStorage
            login(userData);

            // حفظ callback فعلی برای سازگاری با کامپوننت والد
            onSuccess?.(userData);
        } catch (error) {
            console.error("OTP verification error:", error);
            setError("ارتباط با سرور برقرار نشد. دوباره تلاش کن.");
        } finally {
            setLoading(false);
        }
    }

    async function handleResend() {
        if (loading) return;
        setError("");
        setLoading(true);

        try {
            const result = await handledFetch(
                "/accounts/customer/otp/request/",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        phone,
                    }),
                },
                (data) => ({
                    __requestSuccess: true,
                    data,
                })
            );

            if (!result?.__requestSuccess) {
                setError(
                    result?.message ||
                    result?.error ||
                    "ارسال مجدد کد ناموفق بود."
                );
                return;
            }

            setOtp(["", "", "", ""]);
            setSeconds(120);

            setTimeout(() => {
                otpRefs.current[0]?.focus();
            }, 50);
        } catch (error) {
            console.error("OTP resend error:", error);
            setError("ارتباط با سرور برقرار نشد. دوباره تلاش کن.");
        } finally {
            setLoading(false);
        }
    }


    function handleBack() {
        setStep("phone");
        setOtp(["", "", "", ""]);
        setSeconds(120);
        setError("");
    }

    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-white/20 px-4 py-6 backdrop-blur-sm"
            onMouseDown={(event) => {
                if (event.target === event.currentTarget) onClose();
            }}>
            <div role="dialog" aria-modal="true" aria-labelledby="login-title"dir="rtl" className="relative my-auto w-[55%] h-[76vh] max-w-md overflow-hidden bg-[var(--color-navy)]/85 rounded-[2rem] border border-white/70  shadow-[0_25px_100px_rgba(6,26,64,0.35)] backdrop-blur-2xl">
                {/* Background effects */}
                <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-[var(--color-electric)]/20 blur-3xl" />
                <div className="pointer-events-none absolute -bottom-24 -left-20 h-56 w-56 rounded-full bg-[var(--color-primary)]/15 blur-3xl" />

                {/* Header */}
                <div className="relative flex items-center justify-between border-b border-white/70 px-7 py-5">
                        <h1 className="bg-gradient-to-l from-white via-[#BBDFFF] to-[#3295FF] bg-clip-text text-transparent text-3xl font-black ">TechNova</h1>
                    <button type="button" onClick={onClose} aria-label="بستن پنجره" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] text-white transition-all duration-300 hover:border-white/30 hover:bg-white/10 focus:border-[#3295FF]">
                        <FiX size={20}/>
                    </button>
                </div>

                <div className="relative px-4  pt-7 sm:px-8">
                    {/* Step indicator */}
                    <div className="mb-12 flex items-center gap-3">
                        <div
                            className={`flex h-9 w-9 items-center justify-center rounded-xl text-sm font-bold ${
                                step === "phone"
                                    ? "bg-[var(--color-primary)] text-white"
                                    : "bg-blue-100 text-[var(--color-primary)]"
                            }`}
                        >
                            {step === "otp" ? <FiCheckCircle /> : "۱"}
                        </div>

                        <div className="h-1 flex-1 overflow-hidden rounded-full bg-blue-100">
                            <div
                                className={`h-full rounded-full bg-gradient-to-l from-[var(--color-primary)] to-[var(--color-electric)] transition-all duration-500 ${
                                    step === "otp" ? "w-full" : "w-0"
                                }`}
                            />
                        </div>

                        <div
                            className={`flex h-9 w-9 items-center justify-center rounded-xl text-sm font-bold ${
                                step === "otp"
                                    ? "bg-[var(--color-primary)] text-white"
                                    : "bg-blue-100 text-[var(--color-primary)]"
                            }`}
                        >
                            ۲
                        </div>
                    </div>

                    {step === "phone" ? (
                        <>
                            <div className="mb-3">

                                <h2
                                    id="login-title"
                                    className="mt-5 text-2xl font-black text-white sm:text-3xl"
                                >
                                    خوش اومدی!
                                </h2>

                                <p className="mt-3 text-sm leading-8 text-[var(--color-text-secondary)]">
                                    برای ورود به حساب کاربری، شماره موبایلت
                                    رو وارد کن تا کد تأیید رو دریافت کنی.
                                </p>
                            </div>

                            <form
                                onSubmit={handlePhoneSubmit}
                                className="space-y-5"
                            >
                                <div>
                                    <label
                                        htmlFor="login-phone"
                                        className="mb-5 block text-sm  text-gray-400"
                                    >
                                        شماره موبایل
                                    </label>

                                    <div className="flex items-center gap-3 rounded-2xl mb-5 border border-blue-100 bg-white/70 px-4 transition focus-within:border-[var(--color-electric)] focus-within:ring-4 focus-within:ring-blue-100/80">
                                        <FiPhone className="shrink-0 text-xl text-[var(--color-primary)]" />

                                        <input
                                            id="login-phone"
                                            type="tel"
                                            inputMode="numeric"
                                            autoComplete="tel"
                                            maxLength={11}
                                            required
                                            value={phone}
                                            onChange={(event) => {
                                                setPhone(
                                                    event.target.value
                                                        .replace(/\D/g, "")
                                                        .slice(0, 11)
                                                );
                                                setError("");
                                            }}
                                            placeholder="09123456789"
                                            className="pl-3 w-full bg-transparent py-4 text-left text-base tracking-wider text-[var(--color-text)] outline-none placeholder:text-[var(--color-text-muted)] focus:border-none"
                                            dir="ltr"
                                        />
                                    </div>
                                </div>

                                {error && (
                                    <p
                                        role="alert"
                                        className="rounded-xl border border-red-100 bg-red-50/80 px-4 py-3 text-sm leading-6 text-red-600"
                                    >
                                        {error}
                                    </p>
                                )}

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="group flex w-full items-center justify-center rounded-2xl border border-white/30 bg-gradient-to-l from-[var(--color-primary)] to-[var(--color-electric)] px-7 py-4 font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    {loading ? "در حال ارسال کد..." : "دریافت کد تأیید"}
                                    {!loading && <IoCheckmark size={25} />}
                                </button>
                            </form>
                        </>
                    ) : (
                        <>
                            <div className="mb-6">
                                <button
                                    type="button"
                                    onClick={handleBack}
                                    className="mb-5 inline-flex items-center gap-2 text-sm font-bold text-[var(--color-primary)] transition hover:text-[var(--color-primary-hover)]"
                                >
                                    <FiArrowRight />
                                    تغییر شماره موبایل
                                </button>

                                <h2
                                    id="login-title"
                                    className="text-2xl mb-2 font-black text-white sm:text-3xl"
                                >
                                    کد تأیید چهاررقمی
                                </h2>

                                <p className="mt-3 text-sm leading-8 text-[var(--color-text-secondary)]">
                                    کد چهاررقمی ارسال‌شده به شماره
                                    <span className="mx-1 font-bold text-[var(--color-primary)]" dir="ltr">
                                        {phone}
                                    </span>
                                    رو وارد کن.
                                </p>
                            </div>

                            {/* Static test credentials */}
                            {/*<div className="mb-6 rounded-2xl border border-blue-200/80 bg-[var(--color-primary-light)]/80 p-4 backdrop-blur-xl">*/}
                            {/*    <div className="flex items-center gap-2 text-sm font-extrabold text-[var(--color-primary)]">*/}
                            {/*        <FiZap />*/}
                            {/*        حالت تست فرانت‌اند*/}
                            {/*    </div>*/}

                            {/*    <div className="mt-3 flex items-center justify-between gap-3">*/}
                            {/*        <span className="text-sm text-[var(--color-text-secondary)]">*/}
                            {/*            کد ثابت تست*/}
                            {/*        </span>*/}

                            {/*        <span*/}
                            {/*            dir="ltr"*/}
                            {/*            className="rounded-lg border border-blue-200 bg-white/80 px-4 py-2 font-black tracking-[0.35em] text-[var(--color-navy)]"*/}
                            {/*        >*/}
                            {/*            {TEST_OTP}*/}
                            {/*        </span>*/}
                            {/*    </div>*/}

                            {/*    <p className="mt-2 text-xs leading-6 text-[var(--color-text-secondary)]">*/}
                            {/*        این کد فقط برای تست است؛ پیامکی ارسال نمی‌شود.*/}
                            {/*    </p>*/}
                            {/*</div>*/}

                            <form
                                onSubmit={handleOtpSubmit}
                                className="space-y-5"
                            >
                                <div>

                                    <div
                                        className="flex justify-center gap-3"
                                        dir="ltr"
                                    >
                                        {otp.map((digit, index) => (
                                            <input
                                                key={index}
                                                ref={(element) => {
                                                    otpRefs.current[index] =
                                                        element;
                                                }}
                                                type="text"
                                                inputMode="numeric"
                                                autoComplete={
                                                    index === 0
                                                        ? "one-time-code"
                                                        : "off"
                                                }
                                                aria-label={`رقم ${index + 1} کد تأیید`}
                                                maxLength={1}
                                                value={digit}
                                                onChange={(event) =>
                                                    handleOtpChange(
                                                        event.target.value,
                                                        index
                                                    )
                                                }
                                                onKeyDown={(event) =>
                                                    handleOtpKeyDown(
                                                        event,
                                                        index
                                                    )
                                                }
                                                onPaste={handleOtpPaste}
                                                className={`h-14 w-14 rounded-2xl border bg-white/70 text-center text-2xl font-black text-[var(--color-navy)] outline-none backdrop-blur-xl transition focus:border-[var(--color-electric)] focus:bg-white focus:ring-4 focus:ring-blue-100/80 sm:h-16 sm:w-16 ${
                                                    digit
                                                        ? "border-blue-300"
                                                        : "border-blue-100"
                                                }`}
                                            />
                                        ))}
                                    </div>
                                </div>



                                <div className="flex items-center justify-center">
                                    {seconds > 0 ? (
                                        <div
                                            dir="ltr"
                                            className={`font-mono text-lg font-black ${
                                                seconds <= 20
                                                    ? "text-red-500"
                                                    : "text-[var(--color-primary)]"
                                            }`}
                                        >
                                            {formatTime(seconds)}
                                        </div>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={handleResend}
                                            disabled={loading}
                                            className="inline-flex items-center justify-center gap-2 rounded-xl border border-blue-100 bg-[var(--color-primary-light)] px-4 py-2.5 text-sm font-bold text-[var(--color-primary)] transition hover:bg-blue-100 disabled:opacity-50"
                                        >
                                            <FiRefreshCw />
                                            دریافت مجدد کد
                                        </button>
                                    )}
                                </div>


                                {error && (
                                    <p
                                        role="alert"
                                        className="rounded-xl border border-red-100 bg-red-50/80 px-4 py-3 text-sm leading-6 text-red-600"
                                    >
                                        {error}
                                    </p>
                                )}

                                <button
                                    type="submit"
                                    disabled={loading || seconds <= 0}
                                    className="group flex w-full items-center justify-center gap-3 rounded-2xl border border-white/30 bg-gradient-to-l from-[var(--color-primary)] to-[var(--color-electric)] px-5 py-4 font-bold text-white shadow-[0_8px_24px_rgba(7,85,217,0.25)] transition hover:-translate-y-0.5 hover:shadow-[0_12px_30px_rgba(7,85,217,0.35)] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
                                >
                                    {loading ? (
                                        "در حال تأیید..."
                                    ) : (
                                        <>
                                            تأیید کد و ورود
                                            <FiCheckCircle className="text-lg" />
                                        </>
                                    )}
                                </button>
                            </form>
                        </>
                    )}


                </div>
            </div>
        </div>
    );
}
