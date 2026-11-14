
"use client";

import { useCallback, useEffect, useState } from "react";
import {
    IoLocationOutline,
    IoAddOutline,
    IoHomeOutline,
    IoTrashOutline,
    IoCreateOutline,
    IoCheckmarkCircle,
    IoCloseOutline,
} from "react-icons/io5";

import Sidebar from "@/components/UserPanel/Sidebar/Sidebar";
import { serverAddress } from "@/utils/handledfetch";
import { getCookie } from "@/utils/cookie";

const emptyForm = {
    title: "",
    address: "",
    postal_code: "",
    is_default: false,
};

export default function AddressPage() {
    const [addresses, setAddresses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [deletingId, setDeletingId] = useState(null);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [form, setForm] = useState(emptyForm);

    const addressesUrl = `${serverAddress}/accounts/customer/addresses/`;

    const getAuthHeaders = () => {
        const token = getCookie("accessToken");

        return {
            Accept: "application/json",
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        };
    };

    const readResponse = async (response) => {
        const text = await response.text();

        let data = null;

        if (text) {
            try {
                data = JSON.parse(text);
            } catch {
                data = null;
            }
        }

        if (!response.ok) {
            const message =
                data?.detail ||
                data?.message ||
                (typeof data === "object" && data
                    ? Object.values(data).flat().join(" ")
                    : "") ||
                `خطا در ارتباط با سرور (${response.status})`;

            throw new Error(
                typeof message === "string" ? message : "عملیات ناموفق بود."
            );
        }

        return data;
    };

    const fetchAddresses = useCallback(async () => {
        setLoading(true);
        setError("");

        try {
            const response = await fetch(addressesUrl, {
                method: "GET",
                headers: getAuthHeaders(),
                cache: "no-store",
            });

            const data = await readResponse(response);

            const list = Array.isArray(data)
                ? data
                : Array.isArray(data?.results)
                    ? data.results
                    : Array.isArray(data?.addresses)
                        ? data.addresses
                        : [];

            setAddresses(list);
        } catch (err) {
            console.error("Fetch addresses error:", err);
            setError(err.message || "دریافت آدرس‌ها ناموفق بود.");
        } finally {
            setLoading(false);
        }
    }, [addressesUrl]);

    useEffect(() => {
        fetchAddresses();
    }, [fetchAddresses]);

    const openAddForm = () => {
        setEditingId(null);
        setForm({ ...emptyForm });
        setError("");
        setSuccess("");
        setIsFormOpen(true);
    };

    const openEditForm = (item) => {
        setEditingId(item.id);
        setForm({
            title: item.title || "",
            address: item.address || "",
            postal_code: item.postal_code || item.postalCode || "",
            is_default: Boolean(item.is_default ?? item.isDefault),
        });
        setError("");
        setSuccess("");
        setIsFormOpen(true);
    };

    const handleFormChange = (event) => {
        const { name, value, checked, type } = event.target;

        setForm((prev) => ({
            ...prev,
            [name]: type === "checkbox" ? checked : value,
        }));
    };

    const handleSubmit = async (event) => {
        event.preventDefault();

        setSaving(true);
        setError("");
        setSuccess("");

        const payload = {
            title: form.title.trim(),
            address: form.address.trim(),
            postal_code: form.postal_code.trim(),
            is_default: form.is_default,
        };

        try {
            const url = editingId
                ? `${addressesUrl}${editingId}/`
                : addressesUrl;

            const response = await fetch(url, {
                method: editingId ? "PATCH" : "POST",
                headers: getAuthHeaders(),
                body: JSON.stringify(payload),
            });

            await readResponse(response);

            setSuccess(
                editingId
                    ? "آدرس با موفقیت ویرایش شد."
                    : "آدرس با موفقیت اضافه شد."
            );

            setIsFormOpen(false);
            setEditingId(null);
            setForm({ ...emptyForm });

            await fetchAddresses();
        } catch (err) {
            console.error("Save address error:", err);
            setError(err.message || "ذخیره آدرس ناموفق بود.");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id) => {
        const confirmed = window.confirm(
            "آیا از حذف این آدرس مطمئن هستید؟"
        );

        if (!confirmed) return;

        setDeletingId(id);
        setError("");
        setSuccess("");

        try {
            const response = await fetch(`${addressesUrl}${id}/`, {
                method: "DELETE",
                headers: getAuthHeaders(),
            });

            await readResponse(response);

            setAddresses((prev) => prev.filter((item) => item.id !== id));
            setSuccess("آدرس با موفقیت حذف شد.");
        } catch (err) {
            console.error("Delete address error:", err);
            setError(err.message || "حذف آدرس ناموفق بود.");
        } finally {
            setDeletingId(null);
        }
    };

    const handleDefault = async (item) => {
        setError("");
        setSuccess("");

        try {
            const response = await fetch(`${addressesUrl}${item.id}/`, {
                method: "PATCH",
                headers: getAuthHeaders(),
                body: JSON.stringify({
                    title: item.title,
                    address: item.address,
                    postal_code: item.postal_code ?? item.postalCode ?? "",
                    is_default: true,
                }),
            });

            await readResponse(response);

            setSuccess("آدرس پیش‌فرض تغییر کرد.");
            await fetchAddresses();
        } catch (err) {
            console.error("Set default address error:", err);
            setError(err.message || "تغییر آدرس پیش‌فرض ناموفق بود.");
        }
    };

    const getPostalCode = (item) =>
        item.postal_code ?? item.postalCode ?? "—";

    const isDefault = (item) =>
        Boolean(item.is_default ?? item.isDefault);

    return (
        <>
            <div className="h-[140px] bg-[#061A40]" />

            <div className="grid grid-cols-1 gap-6 md:grid-cols-[250px_minmax(0,1fr)]">
                <Sidebar />

                <main
                    dir="rtl"
                    className="relative mb-8 ml-8 mt-8 overflow-hidden rounded-3xl border border-white/20 bg-[#061A40]/85 p-4 shadow-[0_25px_80px_rgba(6,26,64,0.2)] backdrop-blur-2xl sm:p-6 lg:p-8"
                >
                    <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-[#3295FF]/15 blur-3xl" />
                    <div className="pointer-events-none absolute -bottom-24 -left-20 h-56 w-56 rounded-full bg-[#0755D9]/20 blur-3xl" />

                    <header className="relative z-10 mb-8 flex items-center justify-between gap-4 border-b border-white/15 pb-6">
                        <div className="flex items-center gap-4">
                            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-white/15 bg-white/10 text-[#3295FF] backdrop-blur-xl">
                                <IoLocationOutline size={28} />
                            </div>

                            <div>
                                <h1 className="bg-gradient-to-l from-white via-[#BBDFFF] to-[#3295FF] bg-clip-text text-2xl font-black text-transparent sm:text-3xl">
                                    آدرس‌های من
                                </h1>
                                <p className="mt-2 text-sm text-white/50">
                                    مدیریت آدرس‌های دریافت سفارش
                                </p>
                            </div>
                        </div>

                        <button
                            onClick={openAddForm}
                            className="flex shrink-0 items-center gap-2 rounded-xl bg-gradient-to-l from-[#0755D9] to-[#3295FF] px-4 py-3 text-sm font-bold text-white shadow-lg shadow-blue-500/20 transition hover:-translate-y-1 hover:shadow-blue-500/30"
                        >
                            <IoAddOutline size={20} />
                            <span className="hidden sm:inline">افزودن آدرس</span>
                        </button>
                    </header>

                    {error && (
                        <div className="relative z-10 mb-5 rounded-xl border border-red-400/20 bg-red-500/10 p-4 text-sm leading-7 text-red-300">
                            {error}
                        </div>
                    )}

                    {success && (
                        <div className="relative z-10 mb-5 rounded-xl border border-emerald-400/20 bg-emerald-400/10 p-4 text-sm leading-7 text-emerald-300">
                            {success}
                        </div>
                    )}

                    {isFormOpen && (
                        <section className="relative z-10 mb-6 rounded-2xl border border-[#3295FF]/30 bg-[#0B234D]/90 p-5 sm:p-6">
                            <div className="mb-5 flex items-center justify-between gap-3">
                                <h2 className="text-lg font-bold text-white">
                                    {editingId ? "ویرایش آدرس" : "افزودن آدرس جدید"}
                                </h2>

                                <button
                                    type="button"
                                    onClick={() => setIsFormOpen(false)}
                                    aria-label="بستن فرم"
                                    className="rounded-lg p-2 text-white/60 transition hover:bg-white/10 hover:text-white"
                                >
                                    <IoCloseOutline size={22} />
                                </button>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <label className="mb-2 block text-sm text-white/70">
                                        عنوان آدرس
                                    </label>
                                    <input
                                        name="title"
                                        value={form.title}
                                        onChange={handleFormChange}
                                        required
                                        maxLength={100}
                                        placeholder="مثلاً خانه یا محل کار"
                                        className="w-full rounded-xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-[#3295FF]"
                                    />
                                </div>

                                <div>
                                    <label className="mb-2 block text-sm text-white/70">
                                        نشانی کامل
                                    </label>
                                    <textarea
                                        name="address"
                                        value={form.address}
                                        onChange={handleFormChange}
                                        required
                                        rows={3}
                                        placeholder="استان، شهر، خیابان، پلاک و واحد"
                                        className="w-full resize-y rounded-xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm leading-7 text-white outline-none transition placeholder:text-white/30 focus:border-[#3295FF]"
                                    />
                                </div>

                                <div>
                                    <label className="mb-2 block text-sm text-white/70">
                                        کد پستی
                                    </label>
                                    <input
                                        name="postal_code"
                                        value={form.postal_code}
                                        onChange={handleFormChange}
                                        required
                                        inputMode="numeric"
                                        maxLength={20}
                                        placeholder="کد پستی"
                                        className="w-full rounded-xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-[#3295FF]"
                                    />
                                </div>

                                <label className="flex cursor-pointer items-center gap-3 text-sm text-white/80">
                                    <input
                                        type="checkbox"
                                        name="is_default"
                                        checked={form.is_default}
                                        onChange={handleFormChange}
                                        className="h-4 w-4 accent-[#3295FF]"
                                    />
                                    انتخاب به‌عنوان آدرس پیش‌فرض
                                </label>

                                <div className="flex flex-wrap gap-3 pt-2">
                                    <button
                                        type="submit"
                                        disabled={saving}
                                        className="rounded-xl bg-gradient-to-l from-[#0755D9] to-[#3295FF] px-6 py-3 text-sm font-bold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        {saving
                                            ? "در حال ذخیره..."
                                            : editingId
                                                ? "ذخیره تغییرات"
                                                : "ثبت آدرس"}
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => setIsFormOpen(false)}
                                        className="rounded-xl border border-white/15 px-6 py-3 text-sm text-white/70 transition hover:bg-white/5"
                                    >
                                        انصراف
                                    </button>
                                </div>
                            </form>
                        </section>
                    )}

                    <section className="relative z-10 space-y-4">
                        {loading ? (
                            <div className="py-16 text-center text-sm text-white/60">
                                در حال دریافت آدرس‌ها...
                            </div>
                        ) : addresses.length === 0 ? (
                            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/20 bg-white/[0.03] px-5 py-16 text-center">
                                <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-[#3295FF]/10 text-[#3295FF]">
                                    <IoLocationOutline size={38} />
                                </div>

                                <h2 className="text-lg font-bold text-white">
                                    هنوز آدرسی ثبت نکرده‌اید!
                                </h2>

                                <p className="mt-2 text-sm text-white/50">
                                    برای ثبت سفارش، ابتدا آدرس خود را اضافه کنید.
                                </p>

                                <button
                                    onClick={openAddForm}
                                    className="mt-6 flex items-center gap-2 rounded-xl bg-[#0755D9] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#0645B5]"
                                >
                                    <IoAddOutline size={20} />
                                    افزودن اولین آدرس
                                </button>
                            </div>
                        ) : (
                            addresses.map((item) => (
                                <article
                                    key={item.id}
                                    className="group relative rounded-2xl border border-white/10 bg-white/[0.04] p-5 transition duration-300 hover:border-[#3295FF]/40 hover:bg-white/[0.07] sm:p-6"
                                >
                                    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                                        <div className="flex items-center gap-3">
                                            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#3295FF]/10 text-[#3295FF]">
                                                <IoHomeOutline size={23} />
                                            </div>

                                            <div>
                                                <h3 className="font-bold text-white">
                                                    {item.title}
                                                </h3>
                                                <p className="mt-1 text-xs text-white/40">
                                                    نشانی ثبت‌شده
                                                </p>
                                            </div>
                                        </div>

                                        {isDefault(item) && (
                                            <span className="flex items-center gap-1.5 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1.5 text-xs font-medium text-emerald-400">
                                                <IoCheckmarkCircle size={15} />
                                                آدرس پیش‌فرض
                                            </span>
                                        )}
                                    </div>

                                    <div className="space-y-3 border-t border-white/10 pt-5 text-sm">
                                        <div className="flex flex-wrap gap-2">
                                            <span className="text-white/40">آدرس:</span>
                                            <span className="leading-7 text-white/80">
                                                {item.address}
                                            </span>
                                        </div>

                                        <div className="flex flex-wrap gap-2">
                                            <span className="text-white/40">کد پستی:</span>
                                            <span dir="ltr" className="font-medium text-white/90">
                                                {getPostalCode(item)}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4">
                                        <div>
                                            {!isDefault(item) && (
                                                <button
                                                    onClick={() => handleDefault(item)}
                                                    className="text-xs font-medium text-[#3295FF] transition hover:text-white"
                                                >
                                                    انتخاب به‌عنوان پیش‌فرض
                                                </button>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-4">
                                            <button
                                                onClick={() => openEditForm(item)}
                                                className="flex items-center gap-1.5 text-xs text-white/60 transition hover:text-[#3295FF]"
                                            >
                                                <IoCreateOutline size={17} />
                                                ویرایش
                                            </button>

                                            <button
                                                onClick={() => handleDelete(item.id)}
                                                disabled={deletingId === item.id}
                                                className="flex items-center gap-1.5 text-xs text-white/60 transition hover:text-red-400 disabled:opacity-50"
                                            >
                                                <IoTrashOutline size={17} />
                                                {deletingId === item.id
                                                    ? "در حال حذف..."
                                                    : "حذف"}
                                            </button>
                                        </div>
                                    </div>
                                </article>
                            ))
                        )}
                    </section>
                </main>
            </div>
        </>
    );
}
