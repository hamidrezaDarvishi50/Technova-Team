
import ProductGallery from "@/components/MainPage/Product/ProductGallery";
import ProductInfo from "@/components/MainPage/Product/ProductInfo";
import ProductSpecifications from "@/components/MainPage/Product/ProductSpecifications";
import ProductComments from "@/components/MainPage/Contactus/ProductComments";
import Link from "next/link";
import {serverAddress} from "@/utils/handledfetch";
import ProductCommentForm from "@/components/MainPage/Product/ProductCommentForm";


async function getProduct(slug) {
    try {
        const response = await fetch(
            `${serverAddress}/products/${slug}/`,
            {
                method: "GET",
                headers: {
                    Accept: "application/json",
                },
                cache: "no-store",
            }
        );

        if (!response.ok) {
            return null;
        }

        return await response.json();

    } catch (error) {
        console.error("Product fetch error:", error);
        return null;
    }
}

export default async function ProductPage({ params }) {
    const { slug } = await params;

    const product = await getProduct(slug);

    if (!product) {
        return (
            <main
                dir="rtl"
                className="flex min-h-screen flex-col items-center justify-center gap-5 bg-[#030D23] text-white"
            >
                <h2 className="text-xl font-bold">
                    محصول موردنظر پیدا نشد!
                </h2>

                <Link
                    href="/shop"
                    className="rounded-xl bg-[#0755D9] px-6 py-3 text-sm transition hover:bg-[#0645B5]"
                >
                    بازگشت به فروشگاه
                </Link>
            </main>
        );
    }

    return (
        <main
            dir="rtl"
            className="min-h-screen bg-[#030D23] px-4 pb-16 pt-32 text-white sm:px-6 lg:px-10"
        >
            <div className="mx-auto max-w-7xl">

                {/* Breadcrumb */}
                <nav className="mb-8 text-sm text-white/45">
                    <Link href="/">خانه</Link>
                    <span className="mx-2">/</span>

                    <Link href="/shop">فروشگاه</Link>
                    <span className="mx-2">/</span>

                    <span className="text-[#BBDFFF]">
                        {product.name}
                    </span>
                </nav>

                {/* Product */}

                <div className="flex w-full justify-between">
                    <ProductGallery
                        image={product.image}
                        productName={product.name}
                    />
                    <ProductInfo product={product} slug={slug} />
                </div>




                <ProductSpecifications product={product} />

            </div>

            <div className="mx-auto mt-12 max-w-7xl space-y-8">
                <ProductCommentForm />
                <ProductComments />
            </div>
        </main>
    );
}
