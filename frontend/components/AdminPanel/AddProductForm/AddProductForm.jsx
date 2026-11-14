
"use client";

import { useEffect, useState } from "react";
import {
    FiUploadCloud,
    FiImage,
    FiSave,
    FiX,
} from "react-icons/fi";

import { getCookie } from "@/utils/cookie";

const API_BASE_URL =
    process.env.NEXT_PUBLIC_API_URL || "http://192.168.100.95:8000";

const initialForm = {
    name: "",
    category: "",
    price: "",
    discount: "0",
    stock: "",
    description: "",
};

export default function AddProductForm() {
    const [formData, setFormData] = useState(initialForm);

    const [categories, setCategories] = useState([]);
    const [categoriesLoading, setCategoriesLoading] = useState(true);
    const [categoriesError, setCategoriesError] = useState("");

    const [image, setImage] = useState(null);
    const [imagePreview, setImagePreview] = useState("");

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    // دریافت دسته‌بندی‌ها از API
    useEffect(() => {
        const fetchCategories = async () => {
            try {
                setCategoriesLoading(true);
                setCategoriesError("");

                const response = await fetch(
                    `${API_BASE_URL}/products/categories/`,
                    {
                        method: "GET",
                        cache: "no-store",
                    }
                );

                const responseText = await response.text();

                if (!response.ok) {
                    throw new Error(
                        `خطا در دریافت دسته‌بندی‌ها (${response.status}): ${responseText}`
                    );
                }

                const data = responseText ? JSON.parse(responseText) : [];

                const categoryList = Array.isArray(data)
                    ? data
                    : data.results ?? data.data ?? [];

                setCategories(categoryList);
            } catch (err) {
                console.error("Categories API Error:", err);
                setCategoriesError(err.message);
            } finally {
                setCategoriesLoading(false);
            }
        };

        fetchCategories();
    }, []);

    // تغییر مقادیر فرم
    const handleChange = (e) => {
        const { name, value } = e.target;

        setFormData((previous) => ({
            ...previous,
            [name]: value,
        }));
    };

    // انتخاب تصویر
    const handleImageChange = (e) => {
        const file = e.target.files?.[0];

        if (!file) return;

        if (!file.type.startsWith("image/")) {
            setError("لطفاً یک فایل تصویری انتخاب کنید.");
            return;
        }

        setImage(file);
        setImagePreview(URL.createObjectURL(file));
        setError("");
    };

    // حذف تصویر
    const removeImage = () => {
        if (imagePreview) {
            URL.revokeObjectURL(imagePreview);
        }

        setImage(null);
        setImagePreview("");
    };

    // ثبت محصول
    const handleSubmit = async (e) => {
        e.preventDefault();

        setError("");
        setSuccess("");

        if (!formData.name.trim()) {
            setError("نام محصول را وارد کنید.");
            return;
        }

        if (!formData.category) {
            setError("لطفاً دسته‌بندی محصول را انتخاب کنید.");
            return;
        }

        if (!formData.price || Number(formData.price) <= 0) {
            setError("قیمت محصول معتبر نیست.");
            return;
        }

        if (formData.discount === "" || Number(formData.discount) < 0 ||
            Number(formData.discount) > 100) {
            setError("تخفیف باید عددی بین صفر تا صد باشد.");
            return;
        }

        if (formData.stock === "" || Number(formData.stock) < 0) {
            setError("موجودی محصول را به‌درستی وارد کنید.");
            return;
        }

        if (!image) {
            setError("لطفاً تصویر محصول را انتخاب کنید.");
            return;
        }

        const token = getCookie("accessToken");

        if (!token) {
            setError("توکن ورود پیدا نشد. لطفاً دوباره وارد حساب کاربری شوید.");
            return;
        }

        const data = new FormData();

        data.append("name", formData.name.trim());
        data.append("category", formData.category);
        data.append("price", String(Number(formData.price)));
        data.append("discount", String(Number(formData.discount)));
        data.append("stock", String(Number(formData.stock)));
        data.append(
            "description",
            JSON.stringify({
                text: formData.description.trim(),
            })
        );
        data.append("image", image);

        try {
            setLoading(true);

            const response = await fetch(`${API_BASE_URL}/products/`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                },
                body: data,
            });

            const responseText = await response.text();

            let result = {};

            try {
                result = responseText ? JSON.parse(responseText) : {};
            } catch {
                result = { detail: responseText };
            }

            if (!response.ok) {
                console.error("Create Product Error:", result);

                const errorMessage =
                    result.detail ||
                    result.category?.[0] ||
                    result.name?.[0] ||
                    "ثبت محصول با خطا مواجه شد.";

                throw new Error(
                    typeof errorMessage === "string"
                        ? errorMessage
                        : JSON.stringify(result)
                );
            }

            setSuccess("محصول با موفقیت ثبت شد.");
            setFormData(initialForm);
            removeImage();

        } catch (err) {
            console.error("Product Submit Error:", err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="w-full rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-6">
                <h2 className="text-xl font-bold text-slate-800">
                    افزودن محصول جدید
                </h2>

            </div>

            <form onSubmit={handleSubmit} className="space-y-6">

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div >
                        <label className="mb-2 block text-sm font-medium text-slate-700">
                            نام محصول
                        </label>

                        <input
                            type="text"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            placeholder="نام محصول را وارد کنید"
                            className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-blue-500"
                            required
                        />
                    </div>

                    {/* دسته‌بندی */}
                    <div>
                        <label className="mb-2 block text-sm font-medium text-slate-700 ">
                            دسته‌بندی محصول
                        </label>

                        <select
                            name="category"
                            value={formData.category}
                            onChange={handleChange}
                            disabled={categoriesLoading || categories.length === 0}
                            required
                            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 pl-3! outline-none transition focus:border-blue-500 disabled:bg-slate-100"
                        >
                            <option value="" >
                                {categoriesLoading
                                    ? "در حال دریافت دسته‌بندی‌ها..."
                                    : categories.length === 0
                                        ? "دسته‌بندی‌ای وجود ندارد"
                                        : "دسته‌بندی را انتخاب کنید"}
                            </option>

                            {categories.map((category) => (
                                <option
                                    key={category.id}
                                    value={category.name || category.title}
                                >
                                    {category.name || category.title}
                                </option>
                            ))}
                        </select>

                        {categoriesError && (
                            <p className="mt-2 text-sm text-red-500">
                                خطا در دریافت دسته‌بندی‌ها: {categoriesError}
                            </p>
                        )}

                        {!categoriesLoading && categories.length === 0 &&
                            !categoriesError && (
                                <p className="mt-2 text-sm text-amber-600">
                                    ابتدا باید یک دسته‌بندی ایجاد کنید.
                                </p>
                            )}

                        <button
                            type="button"
                            onClick={() => window.location.reload()}
                            className="mt-2 text-xs text-blue-600 hover:underline"
                        >
                            بارگذاری مجدد دسته‌بندی‌ها
                        </button>
                    </div>
                </div>

                {/* نام محصول */}


                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    {/* قیمت و تخفیف */}
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div>
                            <label className="mb-2 block text-sm font-medium text-slate-700">
                                قیمت محصول
                            </label>

                            <input
                                type="number"
                                name="price"
                                value={formData.price}
                                onChange={handleChange}
                                placeholder="قیمت به تومان"
                                min="1"
                                className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500"
                                required
                            />
                        </div>

                        <div>
                            <label className="mb-2 block text-sm font-medium text-slate-700">
                                درصد تخفیف
                            </label>

                            <input
                                type="number"
                                name="discount"
                                value={formData.discount}
                                onChange={handleChange}
                                placeholder="درصد تخفیف"
                                min="0"
                                max="100"
                                className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500"
                            />
                        </div>
                    </div>

                    {/* موجودی */}
                    <div>
                        <label className="mb-2 block text-sm font-medium text-slate-700">
                            موجودی محصول
                        </label>

                        <input
                            type="number"
                            name="stock"
                            value={formData.stock}
                            onChange={handleChange}
                            placeholder="تعداد موجودی"
                            min="0"
                            className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500"
                            required
                        />
                    </div>
                </div>


                {/* توضیحات */}
                <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">
                        توضیحات محصول
                    </label>

                    <textarea
                        name="description"
                        value={formData.description}
                        onChange={handleChange}
                        rows={5}
                        placeholder="توضیحات محصول را وارد کنید..."
                        className="w-full resize-y rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500"
                    />
                </div>

                {/* تصویر محصول */}
                <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">
                        تصویر محصول
                    </label>

                    {!imagePreview ? (
                        <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 p-8 transition hover:border-blue-500 hover:bg-blue-50">
                            <FiUploadCloud className="mb-3 text-3xl text-blue-500" />

                            <span className="text-sm font-medium text-slate-700">
                برای انتخاب تصویر کلیک کنید
              </span>

                            <span className="mt-2 text-xs text-slate-400">
                فقط فایل‌های تصویری
              </span>

                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleImageChange}
                                className="hidden"
                            />
                        </label>
                    ) : (
                        <div className="relative w-fit">
                            <img
                                src={imagePreview}
                                alt="پیش‌نمایش محصول"
                                className="h-48 w-48 rounded-xl border border-slate-200 object-cover"
                            />

                            <button
                                type="button"
                                onClick={removeImage}
                                className="absolute -right-2 -top-2 rounded-full bg-red-500 p-2 text-white shadow hover:bg-red-600"
                            >
                                <FiX />
                            </button>

                            <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                                <FiImage />
                                {image?.name}
                            </div>
                        </div>
                    )}
                </div>

                {/* پیام‌ها */}
                {error && (
                    <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
                        {error}
                    </div>
                )}

                {success && (
                    <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">
                        {success}
                    </div>
                )}

                {/* دکمه ثبت */}
                <button
                    type="submit"
                    disabled={loading || categoriesLoading}
                    className="flex w-[25%] items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                    <FiSave />

                    {loading ? "در حال ثبت محصول..." : "ثبت محصول"}
                </button>

            </form>
        </div>
    );
}
