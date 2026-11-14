
"use client";

import { useEffect, useState } from "react";
import {
    FiSave,
    FiEdit2,
    FiTrash2,
    FiX,
    FiRefreshCw,
    FiCheck,
    FiFolderPlus,
} from "react-icons/fi";

import { serverAddress } from "@/utils/handledfetch";
import { getCookie } from "@/utils/cookie";

const inputClass =
    "w-full h-12 px-4 rounded-xl border border-slate-200 bg-white text-sm text-[#172033] outline-none transition-all placeholder:text-slate-400 focus:border-[#0755D9] focus:ring-4 focus:ring-blue-50";

const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

// اعتبارسنجی Slug
function isValidSlug(value) {
    return slugRegex.test(value.trim());
}

export default function AddCategoryForm() {
    // فرم افزودن
    const [title, setTitle] = useState("");
    const [slug, setSlug] = useState("");

    // لیست دسته‌بندی‌ها
    const [categories, setCategories] = useState([]);

    // وضعیت‌ها
    const [loading, setLoading] = useState(false);
    const [listLoading, setListLoading] = useState(true);

    // وضعیت ویرایش
    const [editingId, setEditingId] = useState(null);
    const [editingTitle, setEditingTitle] = useState("");
    const [editingSlug, setEditingSlug] = useState("");

    // پیام‌ها
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    // دریافت توکن
    function getAccessToken() {
        return getCookie("accessToken");
    }

    // دریافت هدر احراز هویت
    function getHeaders() {
        const token = getAccessToken();

        return {
            Authorization: `Bearer ${token}`,
        };
    }

    // استخراج پیام خطای API
    async function getErrorMessage(response) {
        try {
            const data = await response.json();

            if (data.detail) {
                return data.detail;
            }

            if (data.slug) {
                return Array.isArray(data.slug)
                    ? data.slug[0]
                    : data.slug;
            }

            if (data.title) {
                return Array.isArray(data.title)
                    ? data.title[0]
                    : data.title;
            }

            const firstField = Object.keys(data)[0];

            if (firstField) {
                const value = data[firstField];

                return Array.isArray(value)
                    ? value[0]
                    : String(value);
            }

            return "عملیات با خطا مواجه شد.";
        } catch {
            return "عملیات با خطا مواجه شد.";
        }
    }

    // دریافت لیست دسته‌بندی‌ها
    async function fetchCategories() {
        setListLoading(true);

        try {
            const response = await fetch(
                `${serverAddress}/products/categories/`,
                {
                    method: "GET",
                    headers: getHeaders(),
                    cache: "no-store",
                }
            );

            if (!response.ok) {
                throw new Error(await getErrorMessage(response));
            }

            const data = await response.json();

            setCategories(
                Array.isArray(data)
                    ? data
                    : data.results || []
            );
        } catch (err) {
            console.error("Fetch categories error:", err);
            setError(
                err.message || "دریافت دسته‌بندی‌ها ناموفق بود."
            );
        } finally {
            setListLoading(false);
        }
    }

    // دریافت اولیه دسته‌بندی‌ها
    useEffect(() => {
        fetchCategories();
    }, []);

    // پاک کردن فرم افزودن
    function resetForm() {
        setTitle("");
        setSlug("");
        setError("");
        setSuccess("");
    }

    // افزودن دسته‌بندی
    async function handleSubmit(event) {
        event.preventDefault();

        setError("");
        setSuccess("");

        if (!title.trim()) {
            setError("لطفاً عنوان دسته‌بندی را وارد کنید.");
            return;
        }

        if (!slug.trim()) {
            setError("لطفاً Slug دسته‌بندی را وارد کنید.");
            return;
        }

        if (!isValidSlug(slug)) {
            setError(
                "Slug باید انگلیسی باشد و فقط شامل حروف کوچک، اعداد و خط تیره باشد."
            );
            return;
        }

        const token = getAccessToken();

        if (!token) {
            setError("نشست شما منقضی شده است. دوباره وارد شوید.");
            return;
        }

        const data = new FormData();

        data.append("title", title.trim());
        data.append("slug", slug.trim());

        setLoading(true);

        try {
            const response = await fetch(
                `${serverAddress}/products/categories/`,
                {
                    method: "POST",
                    headers: getHeaders(),
                    body: data,
                }
            );

            if (!response.ok) {
                throw new Error(await getErrorMessage(response));
            }

            const result = await response.json();

            console.log("Created category:", result);

            setTitle("");
            setSlug("");
            setSuccess("دسته‌بندی با موفقیت اضافه شد.");

            await fetchCategories();
        } catch (err) {
            console.error("Create category error:", err);

            setError(
                err.message || "ایجاد دسته‌بندی انجام نشد."
            );
        } finally {
            setLoading(false);
        }
    }

    // شروع ویرایش
    function startEditing(category) {
        setEditingId(category.id);
        setEditingTitle(category.title);
        setEditingSlug(category.slug);

        setError("");
        setSuccess("");
    }

    // لغو ویرایش
    function cancelEditing() {
        setEditingId(null);
        setEditingTitle("");
        setEditingSlug("");
    }

    // ذخیره ویرایش
    async function handleEdit(category) {
        setError("");
        setSuccess("");

        if (!editingTitle.trim()) {
            setError("عنوان دسته‌بندی نمی‌تواند خالی باشد.");
            return;
        }

        if (!editingSlug.trim()) {
            setError("Slug دسته‌بندی الزامی است.");
            return;
        }

        if (!isValidSlug(editingSlug)) {
            setError(
                "Slug باید انگلیسی باشد و فقط شامل حروف کوچک، اعداد و خط تیره باشد."
            );
            return;
        }

        const token = getAccessToken();

        if (!token) {
            setError("نشست شما منقضی شده است. دوباره وارد شوید.");
            return;
        }

        const data = new FormData();

        data.append("title", editingTitle.trim());
        data.append("slug", editingSlug.trim());

        setLoading(true);

        try {
            const response = await fetch(
                `${serverAddress}/products/categories/${encodeURIComponent(category.slug)}/`,
                {
                    method: "PATCH",
                    headers: getHeaders(),
                    body: data,
                }
            );

            if (!response.ok) {
                throw new Error(await getErrorMessage(response));
            }

            const result = await response.json();

            console.log("Updated category:", result);

            cancelEditing();

            setSuccess("دسته‌بندی با موفقیت ویرایش شد.");

            await fetchCategories();
        } catch (err) {
            console.error("Edit category error:", err);

            setError(
                err.message || "ویرایش دسته‌بندی انجام نشد."
            );
        } finally {
            setLoading(false);
        }
    }

    // حذف دسته‌بندی
    async function handleDelete(category) {
        const confirmed = window.confirm(
            `آیا از حذف دسته‌بندی «${category.title}» مطمئن هستید؟`
        );

        if (!confirmed) return;

        const token = getAccessToken();

        if (!token) {
            setError("نشست شما منقضی شده است. دوباره وارد شوید.");
            return;
        }

        setLoading(true);
        setError("");
        setSuccess("");

        try {
            const response = await fetch(
                `${serverAddress}/products/categories/${encodeURIComponent(category.slug)}/`,
                {
                    method: "DELETE",
                    headers: getHeaders(),
                }
            );

            if (!response.ok) {
                throw new Error(await getErrorMessage(response));
            }

            if (editingId === category.id) {
                cancelEditing();
            }

            setSuccess("دسته‌بندی با موفقیت حذف شد.");

            await fetchCategories();
        } catch (err) {
            console.error("Delete category error:", err);

            setError(
                err.message || "حذف دسته‌بندی انجام نشد."
            );
        } finally {
            setLoading(false);
        }
    }

    // تبدیل تاریخ
    function formatDate(date) {
        if (!date) return "-";

        return new Date(date).toLocaleDateString("fa-IR");
    }

    return (
        <div dir="rtl" className="w-full">

            {/* Header */}
            <div className="mb-8">

                <h1 className="text-2xl md:text-3xl font-extrabold text-[#061A40]">
                    مدیریت دسته‌بندی‌ها
                </h1>



            </div>

            {/* Add Category */}
            <form onSubmit={handleSubmit} className="mb-8">

                <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 md:p-7">

                    <div className="flex items-center gap-3 mb-6">

                        <div className="w-11 h-11 rounded-xl bg-blue-50 text-[#0755D9] flex items-center justify-center">
                            <FiFolderPlus size={21} />
                        </div>

                        <div>
                            <h2 className="text-lg font-bold text-[#061A40]">
                                افزودن دسته‌بندی
                            </h2>


                        </div>

                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

                        {/* Title */}
                        <div>
                            <label className="block text-sm font-semibold text-[#061A40] mb-2">
                                عنوان دسته‌بندی
                                <span className="text-red-500 mr-1">*</span>
                            </label>

                            <input
                                type="text"
                                value={title}
                                onChange={(event) => {
                                    setTitle(event.target.value);
                                    setError("");
                                    setSuccess("");
                                }}
                                placeholder="مثلاً موبایل"
                                className={inputClass}
                                required
                            />
                        </div>

                        {/* Slug */}
                        <div>
                            <label className="block text-sm font-semibold text-[#061A40] mb-2">
                                Slug انگلیسی
                                <span className="text-red-500 mr-1">*</span>
                            </label>

                            <input
                                type="text"
                                dir="rtl"
                                value={slug}
                                onChange={(event) => {
                                    setSlug(
                                        event.target.value
                                            .toLowerCase()
                                            .replace(/\s+/g, "-")
                                    );

                                    setError("");
                                    setSuccess("");
                                }}
                                placeholder="مثلاً mobile"
                                className={`${inputClass} text-left`}
                                required
                            />

                            <p className="text-xs text-slate-400 mt-2! mr-1!">
                                فقط حروف انگلیسی کوچک، اعداد و خط تیره مجاز هستند.
                            </p>
                        </div>

                    </div>

                    <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-7 pt-5 border-t border-slate-100">

                        <p className="text-xs text-slate-400">
                            هر دسته‌بندی باید عنوان و Slug یکتای مخصوص خود را داشته باشد.
                        </p>

                        <div className="flex items-center gap-3 w-full sm:w-auto">

                            <button
                                type="button"
                                onClick={resetForm}
                                disabled={loading}
                                className="flex-1 sm:flex-none h-12 px-5 rounded-xl border border-slate-200 text-slate-500 text-sm font-semibold hover:bg-slate-50 transition-all disabled:opacity-50"
                            >
                                پاک کردن فرم
                            </button>

                            <button
                                type="submit"
                                disabled={loading}
                                className="flex-1 sm:flex-none h-12 px-6 rounded-xl bg-[#0755D9] text-white text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-100 hover:bg-[#0645B5] transition-all disabled:opacity-60"
                            >
                                <FiSave size={18} />
                                {loading ? "در حال ثبت..." : "ایجاد دسته‌بندی"}
                            </button>

                        </div>

                    </div>

                </section>

            </form>

            {/* Messages */}
            {error && (
                <div className="mb-5 p-4 rounded-xl bg-red-50 border border-red-100 text-sm text-red-600">
                    {error}
                </div>
            )}

            {success && (
                <div className="mb-5 p-4 rounded-xl bg-green-50 border border-green-100 text-sm text-green-700">
                    {success}
                </div>
            )}

            {/* Categories List */}
            <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 md:p-7">

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">

                    <div>
                        <h2 className="text-lg font-bold text-[#061A40]">
                            لیست دسته‌بندی‌ها
                        </h2>

                        <p className="text-xs text-slate-400 mt-2">
                            مدیریت تمام دسته‌بندی‌های ثبت‌شده در فروشگاه
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={() => {
                            setError("");
                            fetchCategories();
                        }}
                        disabled={listLoading}
                        className="h-10 px-4 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold flex items-center justify-center gap-2 hover:bg-slate-50 transition-all disabled:opacity-50"
                    >
                        <FiRefreshCw
                            className={listLoading ? "animate-spin" : ""}
                        />
                        بروزرسانی لیست
                    </button>

                </div>

                <div className="overflow-x-auto">

                    <table className="w-full min-w-[700px] text-sm text-right">

                        <thead>
                        <tr className="bg-slate-50 text-slate-500">

                            <th className="p-4 rounded-r-xl font-semibold">
                                #
                            </th>

                            <th className="p-4 font-semibold">
                                عنوان دسته‌بندی
                            </th>

                            <th className="p-4 font-semibold">
                                Slug
                            </th>

                            <th className="p-4 font-semibold">
                                تاریخ ایجاد
                            </th>

                            <th className="p-4 rounded-l-xl font-semibold text-center">
                                عملیات
                            </th>

                        </tr>
                        </thead>

                        <tbody>

                        {listLoading ? (

                            <tr>
                                <td colSpan="5" className="p-10 text-center text-slate-400">
                                    در حال دریافت دسته‌بندی‌ها...
                                </td>
                            </tr>

                        ) : categories.length === 0 ? (

                            <tr>
                                <td colSpan="5" className="p-10 text-center text-slate-400">
                                    هنوز دسته‌بندی‌ای ثبت نشده است.
                                </td>
                            </tr>

                        ) : (

                            categories.map((category, index) => (

                                <tr
                                    key={category.id}
                                    className="border-b border-slate-100 last:border-0 hover:bg-slate-50/70 transition-colors"
                                >

                                    {/* Number */}
                                    <td className="p-4 text-slate-400">
                                        {index + 1}
                                    </td>

                                    {/* Title */}
                                    <td className="p-4">

                                        {editingId === category.id ? (

                                            <input
                                                type="text"
                                                value={editingTitle}
                                                onChange={(event) =>
                                                    setEditingTitle(event.target.value)
                                                }
                                                className="w-full h-10 px-3 rounded-lg border border-blue-200 outline-none focus:border-[#0755D9]"
                                            />

                                        ) : (

                                            <span className="font-semibold text-[#172033]">
                                                    {category.title}
                                                </span>

                                        )}

                                    </td>

                                    {/* Slug */}
                                    <td className="p-4">

                                        {editingId === category.id ? (

                                            <input
                                                type="text"
                                                dir="ltr"
                                                value={editingSlug}
                                                onChange={(event) =>
                                                    setEditingSlug(
                                                        event.target.value
                                                            .toLowerCase()
                                                            .replace(/\s+/g, "-")
                                                    )
                                                }
                                                className="w-full h-10 px-3 rounded-lg border border-blue-200 text-left outline-none focus:border-[#0755D9]"
                                            />

                                        ) : (

                                            <span
                                                dir="ltr"
                                                className="inline-block px-3 py-1 rounded-lg bg-blue-50 text-[#0755D9] text-xs font-medium"
                                            >
                                                    {category.slug}
                                                </span>

                                        )}

                                    </td>

                                    {/* Date */}
                                    <td className="p-4 text-slate-400 text-xs">
                                        {formatDate(category.created_at)}
                                    </td>

                                    {/* Actions */}
                                    <td className="p-4">

                                        <div className="flex items-center justify-center gap-2">

                                            {editingId === category.id ? (

                                                <>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleEdit(category)}
                                                        disabled={loading}
                                                        title="ذخیره تغییرات"
                                                        className="w-9 h-9 rounded-lg bg-green-50 text-green-600 flex items-center justify-center hover:bg-green-100 transition-all disabled:opacity-50"
                                                    >
                                                        <FiCheck size={17} />
                                                    </button>

                                                    <button
                                                        type="button"
                                                        onClick={cancelEditing}
                                                        disabled={loading}
                                                        title="لغو ویرایش"
                                                        className="w-9 h-9 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center hover:bg-slate-200 transition-all disabled:opacity-50"
                                                    >
                                                        <FiX size={17} />
                                                    </button>
                                                </>

                                            ) : (

                                                <>
                                                    <button
                                                        type="button"
                                                        onClick={() => startEditing(category)}
                                                        disabled={loading}
                                                        title="ویرایش دسته‌بندی"
                                                        className="w-9 h-9 rounded-lg bg-blue-50 text-[#0755D9] flex items-center justify-center hover:bg-blue-100 transition-all disabled:opacity-50"
                                                    >
                                                        <FiEdit2 size={16} />
                                                    </button>

                                                    <button
                                                        type="button"
                                                        onClick={() => handleDelete(category)}
                                                        disabled={loading}
                                                        title="حذف دسته‌بندی"
                                                        className="w-9 h-9 rounded-lg bg-red-50 text-red-500 flex items-center justify-center hover:bg-red-100 transition-all disabled:opacity-50"
                                                    >
                                                        <FiTrash2 size={16} />
                                                    </button>
                                                </>

                                            )}

                                        </div>

                                    </td>

                                </tr>

                            ))

                        )}

                        </tbody>

                    </table>

                </div>

                {/* Categories Count */}
                {!listLoading && categories.length > 0 && (

                    <div className="mt-5 pt-4 border-t border-slate-100 text-xs text-slate-400">
                        تعداد کل دسته‌بندی‌ها: {categories.length}
                    </div>

                )}

            </section>

        </div>
    );
}
