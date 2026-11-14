import Hero from "@/components/MainPage/Blog/Hero";
import CategoryCard from "@/components/MainPage/Blog/BlogCard";
import {serverAddress} from "@/utils/handledfetch";
import BlogCard from "@/components/MainPage/Blog/BlogCard";




export default async function BlogPage() {

    return (
        <>
            <Hero />

            <section
                dir="rtl"
                className="px-6 py-12 bg-cover bg-center bg-no-repeat"
                style={{
                    backgroundImage: "url('/product/cartbg.jpg')",
                }}
            >
                <div
                    className="mx-auto grid max-w-7xl
                    grid-cols-1 justify-items-center gap-6
                    sm:grid-cols-2 lg:grid-cols-4"
                >
                        <BlogCard />

                </div>
            </section>
        </>
    );
}