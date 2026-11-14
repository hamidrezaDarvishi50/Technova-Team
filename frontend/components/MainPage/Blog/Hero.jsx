
import { FaArrowLeftLong } from "react-icons/fa6";

export default function Hero() {
    return (
        <section
            dir="rtl"
            className="relative isolate flex min-h-[80vh] w-full items-center justify-center overflow-hidden bg-[#061A40] bg-cover bg-center bg-no-repeat"
            style={{
                backgroundImage: "url('/category/category.png')",
            }}
        >
            <div className="relative z-10 mx-auto flex w-full max-w-3xl flex-col items-center px-6 text-center">

                <span className="bg-gradient-to-l from-white via-[#BBDFFF] to-[#3295FF] bg-clip-text text-7xl font-black text-transparent sm:text-6xl md:text-7xl">
                   مقاله ها
                </span>



            </div>
        </section>
    );
}
