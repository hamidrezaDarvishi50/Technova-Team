
import Hero from "@/components/MainPage/Home/Hero";
import Services from "@/components/MainPage/Home/Services";
import ProductCard from "@/components/MainPage/Shop/ProductCard";
import { FaArrowLeftLong } from "react-icons/fa6";
import Discount from "@/components/MainPage/Home/Discount";
import Category from "@/components/MainPage/Home/Category";
import Connection from "@/components/MainPage/MainLayout/Connection";
import ProductComments from "@/components/MainPage/Contactus/ProductComments";
import {serverAddress} from "@/utils/handledfetch";
import NewestProductsCarousel from "@/components/MainPage/Home/NewestProductsCarousel";


async function getNewestProducts() {
    try {
        const response = await fetch(
            `${serverAddress}/products/?sort=newest`,
            { cache: "no-store" }
        );

        if (!response.ok) {
            throw new Error(`خطا در دریافت محصولات: ${response.status}`);
        }

        const data = await response.json();

        return Array.isArray(data) ? data : data.results ?? [];
    } catch (error) {
        console.error("Newest products API error:", error);
        return null;
    }
}
async function getBestSellingProducts() {
    try {
        const response = await fetch(
            `${serverAddress}/products/?sort=best_selling`,
            { cache: "no-store" }
        );

        if (!response.ok) {
            throw new Error(`خطا در دریافت محصولات: ${response.status}`);
        }

        const data = await response.json();

        return Array.isArray(data) ? data : data.results ?? [];
    } catch (error) {
        console.error("Best selling products API error:", error);
        return null;
    }
}


export default async function Home() {
    const products = await getNewestProducts();
    const bestProducts = await getNewestProducts();


    return (
        <>
            <Hero />

            <div className="w-full rounded-tl-2xl rounded-tr-2xl bg-[var(--color-primary-light)]">
                <Services />

                {/* جدیدترین محصولات */}
                <section
                    dir="rtl"
                    className="relative isolate min-h-[550px] w-full
                        overflow-hidden bg-cover bg-center bg-no-repeat pb-10"
                    style={{
                        backgroundImage: "url('/product/cartbg.jpg')",
                    }}
                >
                    <div className="m-auto flex w-[95%] items-center justify-between px-4 sm:px-10">
                        <h2 className="text-xl font-bold text-[#061A40]">
                            جدیدترین محصولات
                        </h2>

                        <a
                            href="/deals"
                            className="group relative mt-9 inline-flex items-center
                                gap-3 overflow-hidden rounded-2xl px-4 py-4
                                text-sm font-semibold backdrop-blur-2xl
                                transition-all duration-300 sm:px-6"
                        >
                            <span className="absolute inset-0 -translate-x-full
                                bg-gradient-to-l from-transparent via-white/15
                                to-transparent transition-transform duration-700
                                group-hover:translate-x-full"
                            />

                            <span className="relative text-xl font-bold text-[#061A40]">
                                مشاهده
                            </span>

                            <span className="relative text-xl font-bold text-[#061A40]
                                transition-transform duration-300
                                group-hover:-translate-x-1"
                            >
                                <FaArrowLeftLong />
                            </span>
                        </a>
                    </div>

                    <div className="m-auto flex w-full flex-wrap items-start
                        justify-start gap-4 px-5 sm:px-10"
                    >
                        <NewestProductsCarousel products={products ?? []} />
                    </div>
                </section>

                <Discount />
                <Category />

                {/* پرفروش‌ترین محصولات */}
                <section className="relative isolate min-h-[550px] w-full overflow-hidden pb-10">
                    <div className="m-auto flex w-[95%] items-center justify-between px-4 sm:px-10">
                        <h2 className="text-xl font-bold text-[#061A40]">
                            پرفروش‌ترین محصولات
                        </h2>

                        <a
                            href="/shop"
                            className="group relative mt-9 inline-flex items-center
                                gap-3 overflow-hidden rounded-2xl px-4 py-4
                                text-sm font-semibold backdrop-blur-2xl
                                transition-all duration-300 sm:px-6"
                        >
                            <span className="absolute inset-0 -translate-x-full
                                bg-gradient-to-l from-transparent via-white/15
                                to-transparent transition-transform duration-700
                                group-hover:translate-x-full"
                            />

                            <span className="relative text-xl font-bold text-[#061A40]">
                                مشاهده
                            </span>

                            <span className="relative text-xl font-bold text-[#061A40]
                                transition-transform duration-300
                                group-hover:-translate-x-1"
                            >
                                <FaArrowLeftLong />
                            </span>
                        </a>
                    </div>

                    <div className="m-auto flex flex-wrap items-start justify-start gap-4 px-5 sm:px-10">
                        <div className="m-auto flex w-full flex-wrap items-start justify-start gap-4 px-5 sm:px-10">
                            <NewestProductsCarousel bestProducts={bestProducts ?? []} />
                        </div>
                    </div>
                </section>

                {/*<ProductComments />*/}
                <Connection />
            </div>
        </>
    );
}
