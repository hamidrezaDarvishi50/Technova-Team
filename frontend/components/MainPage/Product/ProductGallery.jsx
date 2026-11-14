
"use client";

import { useState } from "react";
import {
    FiChevronLeft,
    FiChevronRight,
    FiZoomIn,
} from "react-icons/fi";

import { serverAddress } from "@/utils/handledfetch.js";

export default function ProductGallery({ image, productName }) {
    const [activeImage, setActiveImage] = useState(0);

    const imageUrl = image
        ? image.startsWith("http")
            ? image
            : `${serverAddress}${image.startsWith("/") ? "" : "/"}${image}`
        : "/product/phone.jpg";

    const images = [imageUrl];

    function changeImage(direction) {
        setActiveImage((current) => {
            return (current + direction + images.length) % images.length;
        });
    }

    return (
        <section dir="rtl" className="lg:w-[40%]! w-full min-w-0">
            <div className="flex flex-col gap-4 sm:flex-row">

                {/* Thumbnails */}
                <div className="order-2 flex w-full shrink-0 gap-3 overflow-x-auto pb-2 sm:order-1 sm:w-[76px] sm:flex-col sm:overflow-x-hidden sm:overflow-y-auto sm:pb-0">

                    {images.map((image, index) => (
                        <button
                            key={index}
                            type="button"
                            onClick={() => setActiveImage(index)}
                            aria-label={`نمایش تصویر ${index + 1}`}
                            aria-pressed={activeImage === index}
                            className={`relative h-[76px] w-[76px] min-w-[76px] shrink-0 overflow-hidden rounded-xl border bg-[#061A40] transition-all duration-300 ${
                                activeImage === index
                                    ? "border-[#3295FF] shadow-[0_0_18px_rgba(50,149,255,0.2)]"
                                    : "border-white/10 hover:border-[#3295FF]/50"
                            }`}
                        >
                            <img
                                src={image}
                                alt={`تصویر ${index + 1} ${productName}`}
                                className="absolute inset-0 h-full w-full object-contain p-1"
                            />
                        </button>
                    ))}

                </div>

                {/* Main Image */}
                <div className="group relative order-1 aspect-square w-full min-w-0 shrink-0 overflow-hidden rounded-[28px] border border-white/10 bg-[#061A40] sm:order-2 sm:h-[400px] sm:aspect-auto lg:h-[460px]">

                    <img
                        key={images[activeImage]}
                        src={images[activeImage]}
                        alt={productName}
                        className="absolute  inset-0 h-full w-full object-contain flex items-center p-3 transition-transform duration-500 group-hover:scale-[1.03]"
                    />

                    {/* Previous */}
                    <button
                        type="button"
                        onClick={() => changeImage(-1)}
                        aria-label="تصویر قبلی"
                        className="absolute right-3 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-[#061A40]/80 text-white backdrop-blur-xl transition hover:border-[#3295FF] hover:bg-[#3295FF]/20"
                    >
                        <FiChevronRight size={22} />
                    </button>

                    {/* Next */}
                    <button
                        type="button"
                        onClick={() => changeImage(1)}
                        aria-label="تصویر بعدی"
                        className="absolute left-3 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-[#061A40]/80 text-white backdrop-blur-xl transition hover:border-[#3295FF] hover:bg-[#3295FF]/20"
                    >
                        <FiChevronLeft size={22} />
                    </button>

                    {/* Image Counter */}
                    <div className="absolute bottom-4 left-4 z-10 flex items-center gap-2 rounded-full border border-white/10 bg-[#061A40]/80 px-3 py-2 text-xs text-white/80 backdrop-blur-xl">
                        <FiZoomIn size={15} />
                        <span dir="ltr">
                            {activeImage + 1} / {images.length}
                        </span>
                    </div>

                </div>
            </div>
        </section>
    );
}
