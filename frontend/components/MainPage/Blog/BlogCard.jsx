
import { FaArrowLeftLong } from "react-icons/fa6";
import { MdDevices } from "react-icons/md";

export default function BlogCard({ img, title, link }) {
    return (
        <div
            dir="rtl"
            className="group relative isolate w-full max-w-[300px] overflow-hidden
            rounded-[40px] border border-white/10
            pb-5

            shadow-[0_15px_45px_rgba(6,26,64,0.25)]
            backdrop-blur-2xl
            transition-all duration-400
            hover:bg-[#061A40]
            hover:-translate-y-1 hover:border-[#3295FF]/60
            hover:shadow-[0_20px_50px_rgba(50,149,255,0.18)]"
        >
            <div
                className="pointer-events-none absolute -right-20 top-20 -z-10
                h-52 w-52 rounded-full bg-[#3295FF]/20
                blur-[80px] transition-all duration-500
                group-hover:bg-[#3295FF]/35"
            />

            <div
                className="pointer-events-none absolute -bottom-20 -left-16 -z-10
                h-52 w-52 rounded-full bg-blue-300/10 blur-[80px]"
            />



            <div
                className="relative z-10  flex h-[190px]
                items-center justify-center overflow-hidden
                border border-white/5 bg-white/[0.04]"
            >
                <div
                    className="absolute inset-0 bg-gradient-to-t
                    from-[#061A40]/50 via-transparent to-white/[0.03]"
                />

                <img
                    src={img}
                    alt={title}
                    className="relative h-full w-full object-contain
                     drop-shadow-[0_15px_25px_rgba(0,0,0,0.4)]
                    transition-transform duration-500
                    "
                />
            </div>

            <div className="relative z-10 mt-5">
                <h2
                    className="text-xl text-center font-black text-[#061A40]
                    transition-colors duration-300
                    group-hover:text-white"
                >
                    {title}
                </h2>

                <a
                    href={link}
                    className="group/btn relative mt-6 flex w-[90%] m-auto
                    items-center justify-center gap-2 overflow-hidden
                    rounded-full border border-white/70
                    bg-gradient-to-l from-white to-[#BBDFFF]
                    px-4 py-3.5 font-bold text-[#061A40]
                    shadow-[0_8px_25px_rgba(50,149,255,0.12)]
                    transition-all duration-300
                    hover:-translate-y-1 hover:border-white
                    hover:shadow-[0_12px_30px_rgba(50,149,255,0.3)]"
                >
                    <span
                        className="absolute inset-0 -translate-x-full
                        bg-gradient-to-l from-transparent via-white/80
                        to-transparent transition-transform duration-700
                        group-hover/btn:translate-x-full"
                    />

                    <span className="relative">
                        مشاهده
                    </span>

                    <FaArrowLeftLong
                        className="relative text-lg transition-transform
                        duration-300 group-hover/btn:-translate-x-1"
                    />
                </a>
            </div>
        </div>
    );
}
