import Hero from "@/components/MainPage/Shop/Hero";
import ShopContent from "@/components/MainPage/Shop/ShopContent";
import { serverAddress } from "@/utils/handledfetch";

async function getProducts() {
    try {
        const response = await fetch(
            `${serverAddress}/products`,
            {
                cache: "no-store",
            }
        );

        if (!response.ok) {
            throw new Error(`خطا در دریافت محصولات: ${response.status}`);
        }

        const data = await response.json();

        return Array.isArray(data) ? data : data.results ?? [];
    } catch (error) {
        console.error("Products API error:", error);
        return null;
    }
}

export default async function ShopPage() {
    const products = await getProducts();

    return (
        <>
            <Hero />
            <ShopContent initialProducts={products} />
        </>
    );
}