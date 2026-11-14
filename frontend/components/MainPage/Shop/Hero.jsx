
import { FaArrowLeftLong } from "react-icons/fa6";

export default function Hero() {
    return (
        <section
            dir="rtl"
            className="relative isolate min-h-[75vh] w-full overflow-hidden bg-[#061A40] bg-cover bg-center bg-no-repeat before:absolute before:inset-0 before:-z-10 before:bg-[url('/shopping/shopping.png')] before:bg-cover before:bg-center before:bg-no-repeat before:-scale-x-100"
        >
            <div className="absolute top-35 right-28 lg:top-46 lg:right-45">
                <span className="bg-gradient-to-l text-4xl lg:text-7xl font-black from-white via-[#BBDFFF] to-[#3295FF] bg-clip-text text-transparent">
                    محصولات ما
                </span>

                <p className="text-gray-400 text-[18px] mt-4 mb-4">
                    آینده رو همین امروز لمس کن؛ جدیدترین تکنولوژی، یک قدم نزدیک‌تر به تو!
                </p>

                <div className="mt-9 flex flex-wrap items-center gap-4">
                    <a
                        href="/shop"
                        className="group relative inline-flex items-center gap-3 overflow-hidden rounded-2xl border border-white/25 bg-white/[0.12] px-6 py-4 text-sm font-semibold text-white shadow-[0_8px_32px_rgba(7,85,217,0.2)] backdrop-blur-2xl transition-all duration-300 hover:-translate-y-1 hover:border-[#3295FF]/70 hover:bg-[#0755D9]/30 hover:shadow-[0_12px_40px_rgba(7,85,217,0.35)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#3295FF]"
                    >
                        <span className="absolute inset-0 -translate-x-full bg-gradient-to-l from-transparent via-white/15 to-transparent transition-transform duration-700 group-hover:translate-x-full" />

                        <span className="relative text-white">
                            مشاهده محصولات
                        </span>

                        <span className="relative text-lg text-[#8CC8FF] transition-transform duration-300 group-hover:-translate-x-1">
                            <FaArrowLeftLong />
                        </span>
                    </a>
                </div>
            </div>
        </section>
    );
}
