
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  FiSearch,
  FiUser,
  FiMenu,
  FiX,
  FiShoppingBag,
  FiHome,
  FiChevronDown,
} from "react-icons/fi";

import LoginModal from "@/components/Auth/Customer/LoginModal";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import UserProfilePopover from "../../Auth/Customer/UserProfilePopover";
import { serverAddress } from "@/utils/handledfetch";

const navItems = [
  { title: "خانه", href: "/" },
  { title: "فروشگاه", href: "/shop" },
  { title: "تخفیف‌ها", href: "/deals" },
  { title: "درباره ما", href: "/about" },
  { title: "تماس با ما", href: "/contact" },
  { title: "مقالات", href: "/blogs" },
];

export default function Header() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const [searchOpen, setSearchOpen] = useState(false);
  const [search, setSearch] = useState("");

  const [loginOpen, setLoginOpen] = useState(false);

  const [categories, setCategories] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);

  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [mobileCategoriesOpen, setMobileCategoriesOpen] = useState(false);

  const { user, isAuthLoading } = useAuth();
  const { cartCount, isCartLoaded } = useCart();

  // Fetch categories
  useEffect(() => {
    const controller = new AbortController();

    async function fetchCategories() {
      try {
        setCategoriesLoading(true);

        const response = await fetch(
            `${serverAddress}/products/categories/`,
            {
              method: "GET",
              cache: "no-store",
              signal: controller.signal,
            }
        );

        if (!response.ok) {
          throw new Error(
              `خطا در دریافت دسته‌بندی‌ها: ${response.status}`
          );
        }

        const data = await response.json();

        const categoryList = Array.isArray(data)
            ? data
            : data.results ?? [];

        setCategories(categoryList);
      } catch (error) {
        if (error.name === "AbortError") return;

        console.error("Categories API Error:", error);
        setCategories([]);
      } finally {
        if (!controller.signal.aborted) {
          setCategoriesLoading(false);
        }
      }
    }

    fetchCategories();

    return () => controller.abort();
  }, []);

  // Navbar scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 150);
    };

    handleScroll();

    window.addEventListener("scroll", handleScroll, {
      passive: true,
    });

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  // Open login modal from other components
  useEffect(() => {
    const openLoginModal = () => {
      setLoginOpen(true);
    };

    window.addEventListener(
        "open-customer-login",
        openLoginModal
    );

    return () => {
      window.removeEventListener(
          "open-customer-login",
          openLoginModal
      );
    };
  }, []);

  // Search
  function handleSearch(event) {
    event.preventDefault();

    const query = search.trim();

    if (!query) return;

    setSearchOpen(false);
    setSearch("");
    setMenuOpen(false);

    window.location.href = `/shop?search=${encodeURIComponent(query)}`;
  }

  // Close mobile menu
  function closeMobileMenu() {
    setMenuOpen(false);
    setMobileCategoriesOpen(false);
    setCategoriesOpen(false);
  }


  const iconClass =
      "relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] text-white transition-all duration-300 hover:border-white/30 hover:bg-white/10";

  // Category dropdown content
  function CategoryLinks({ mobile = false }) {
    return (
        <>
          <Link
              href="/shop"
              onClick={() => {
                setCategoriesOpen(false);
                if (mobile) closeMobileMenu();
              }}
              className={
                mobile
                    ? "block rounded-lg px-8 py-2.5 text-sm font-bold text-white/90 transition hover:bg-white/10"
                    : "block rounded-xl px-4 py-3 text-sm font-bold text-white transition hover:bg-white/10 hover:text-[#3295FF]"
              }
          >
            همه محصولات
          </Link>

          <div className="my-1 border-t border-white/10" />

          {categoriesLoading ? (
              <p className="px-4 py-3 text-xs text-white/60">
                در حال دریافت دسته‌بندی‌ها...
              </p>
          ) : categories.length > 0 ? (
              categories.map((category) => (
                  <Link
                      key={category.id}
                      href={`/shop?category=${encodeURIComponent(category.slug)}`}
                      onClick={() => {
                        setCategoriesOpen(false);
                        if (mobile) closeMobileMenu();
                      }}
                      className={
                        mobile
                            ? "block rounded-lg px-8 py-2.5 text-sm text-white/75 transition hover:bg-white/10 hover:text-white"
                            : "block rounded-xl px-4 py-3 text-sm text-white/80 transition hover:bg-white/10 hover:text-[#3295FF]"
                      }
                  >
                    {category.title}
                  </Link>
              ))
          ) : (
              <p className="px-4 py-3 text-xs text-white/60">
                دسته‌بندی‌ای پیدا نشد.
              </p>
          )}
        </>
    );
  }

  return (
      <div dir="rtl" className="relative z-50">
        {/* HEADER */}
        <header
            className={`fixed left-0 right-0 z-50 transition-all duration-500 ease-in-out ${
                isScrolled
                    ? "top-0 px-0"
                    : "top-5 px-3 sm:top-8 sm:px-5"
            }`}
        >
          <div
              className={`mx-auto flex min-h-[62px] items-center justify-between gap-3 border transition-all duration-500 ease-in-out sm:min-h-[70px] ${
                  isScrolled
                      ? "w-full max-w-none rounded-none border-white/[0.08] bg-[#061A40]/95 px-3 shadow-[0_8px_35px_rgba(0,0,0,0.35)] backdrop-blur-xl sm:px-7 lg:px-10"
                      : "w-full max-w-[1250px] rounded-2xl border-white/10 px-3 shadow-[0_12px_40px_rgba(0,0,0,0.25)] backdrop-blur-xl sm:rounded-[22px] sm:px-5 lg:px-7"
              }`}
          >
            {/* RIGHT SIDE */}
            <div className="flex min-w-0 flex-1 items-center justify-start gap-2">
              {/* HOME ICON */}
              <Link
                  href="/"
                  aria-label="صفحه اصلی"
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white transition hover:bg-white/10"
              >
                <FiHome
                    size={18}
                    className="text-[#F3F7FD]"
                />
              </Link>

              {/* DESKTOP NAV */}
              <nav
                  className={`hidden min-w-0 items-center gap-0.5 rounded-full text-[11px] shadow-sm md:flex lg:gap-1 lg:px-1.5 lg:text-[15px] ${
                      isScrolled
                          ? "rounded-2xl border-white/10 bg-white/30 px-3 text-white backdrop-blur-xl"
                          : "border border-black/10 bg-white/40 p-1 px-3 text-white backdrop-blur-xl"
                  }`}
              >
                {/* First two links */}
                {navItems.slice(0, 2).map((item) => (
                    <Link
                        key={item.href}
                        href={item.href}
                        className="whitespace-nowrap rounded-full px-2.5 py-2 transition duration-300 hover:bg-black/20 hover:text-black lg:px-3.5"
                    >
                      {item.title}
                    </Link>
                ))}

                {/* CATEGORY DROPDOWN */}
                <div
                    className="relative"
                    onMouseEnter={() => setCategoriesOpen(true)}
                    onMouseLeave={() => setCategoriesOpen(false)}
                >
                  <button
                      type="button"
                      onClick={() =>
                          setCategoriesOpen((prev) => !prev)
                      }
                      aria-expanded={categoriesOpen}
                      className="flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-2 transition duration-300 hover:bg-black/20 hover:text-black lg:px-3.5"
                  >
                    دسته‌بندی‌ها

                    <FiChevronDown
                        className={`transition-transform duration-300 ${
                            categoriesOpen ? "rotate-180" : ""
                        }`}
                    />
                  </button>

                  {categoriesOpen && (
                      <div className="absolute right-0 top-full z-[100] w-52 pt-3">
                        <div className="overflow-hidden rounded-2xl border border-white/20 bg-[#061A40]/95 p-2 shadow-[0_15px_45px_rgba(0,0,0,0.4)] backdrop-blur-2xl">
                          <CategoryLinks />
                        </div>
                      </div>
                  )}
                </div>

                {/* Remaining links */}
                {navItems.slice(2).map((item) => (
                    <Link
                        key={item.href}
                        href={item.href}
                        className="whitespace-nowrap rounded-full px-2.5 py-2 transition duration-300 hover:bg-black/20 hover:text-black lg:px-3.5"
                    >
                      {item.title}
                    </Link>
                ))}
              </nav>

              {/* MOBILE MENU BUTTON */}
              <button
                  type="button"
                  aria-label={menuOpen ? "بستن منو" : "باز کردن منو"}
                  aria-expanded={menuOpen}
                  onClick={() => setMenuOpen((prev) => !prev)}
                  className={`${iconClass} md:hidden`}
              >
                {menuOpen ? (
                    <FiX size={19} />
                ) : (
                    <FiMenu size={19} />
                )}
              </button>

              {/* LOGO */}
              <h1 className="bg-gradient-to-l from-white via-[#BBDFFF] to-[#3295FF] bg-clip-text text-transparent text-3xl font-black ">TechNova</h1>
            </div>

            {/* ICONS */}
            <div className="relative flex shrink-0 items-center gap-1.5 sm:gap-2">
              {/* SEARCH */}
              <div className="relative">
                {searchOpen && (
                    <form
                        onSubmit={handleSearch}
                        className="absolute left-0 top-12 z-[70] w-[230px] sm:left-12 sm:top-1/2 sm:-translate-y-1/2"
                    >
                      <input
                          autoFocus
                          type="search"
                          value={search}
                          onChange={(event) =>
                              setSearch(event.target.value)
                          }
                          placeholder="جستجوی محصول..."
                          className="w-full rounded-xl border border-white/15 bg-[#F3F7FD] px-4 py-2 text-sm text-[#061A40] outline-none placeholder:text-[#061A40]/40 focus:border-[#3295FF]"
                      />
                    </form>
                )}

                <button
                    type="button"
                    aria-label={searchOpen ? "بستن جستجو" : "جستجو"}
                    onClick={() => setSearchOpen((prev) => !prev)}
                    className={iconClass}
                >
                  {searchOpen ? (
                      <FiX size={18} />
                  ) : (
                      <FiSearch size={18} />
                  )}
                </button>
              </div>

              {/* CART */}
              <Link
                  href="/cart"
                  aria-label={`سبد خرید، ${cartCount} محصول`}
                  title="سبد خرید"
                  className={iconClass}
              >
                <FiShoppingBag
                    size={18}
                    className="text-[#F3F7FD]"
                />

                {isCartLoaded && cartCount > 0 && (
                    <span className="absolute -right-1 -top-1 flex h-[19px] min-w-[19px] items-center justify-center rounded-full border-2 border-[#061A40] bg-[#3295FF] px-1 text-[10px] font-extrabold leading-none text-white shadow-lg">
                  {cartCount > 99 ? "99+" : cartCount}
                </span>
                )}
              </Link>

              {/* USER */}
              {!isAuthLoading && (
                  user ? (
                      <UserProfilePopover />
                  ) : (
                      <button
                          type="button"
                          onClick={() => setLoginOpen(true)}
                          aria-label="ورود به حساب کاربری"
                          title="ورود / ثبت‌نام"
                          className={iconClass}
                      >
                        <FiUser size={18} />
                      </button>
                  )
              )}
            </div>
          </div>

          {/* MOBILE MENU */}
          <div
              className={`mx-auto overflow-hidden transition-all duration-300 md:hidden ${
                  menuOpen
                      ? "mt-2 max-h-[600px] opacity-100"
                      : "pointer-events-none mt-0 max-h-0 opacity-0"
              }`}
          >
            <nav className="rounded-2xl border border-white/10 bg-[#0755D9]/95 p-2 shadow-xl backdrop-blur-xl">
              {/* First two links */}
              {navItems.slice(0, 2).map((item) => (
                  <Link
                      key={item.href}
                      href={item.href}
                      onClick={closeMobileMenu}
                      className="block rounded-xl px-4 py-3 text-sm text-white/85 transition hover:bg-white/10 hover:text-white"
                  >
                    {item.title}
                  </Link>
              ))}

              {/* MOBILE CATEGORY DROPDOWN */}
              <div>
                <button
                    type="button"
                    onClick={() =>
                        setMobileCategoriesOpen((prev) => !prev)
                    }
                    aria-expanded={mobileCategoriesOpen}
                    className="flex w-full items-center justify-between rounded-xl px-4 py-3 text-sm text-white/85 transition hover:bg-white/10"
                >
                  <span>دسته‌بندی‌ها</span>

                  <FiChevronDown
                      className={`transition-transform duration-300 ${
                          mobileCategoriesOpen ? "rotate-180" : ""
                      }`}
                  />
                </button>

                <div
                    className={`overflow-hidden transition-all duration-300 ${
                        mobileCategoriesOpen
                            ? "max-h-80 opacity-100"
                            : "max-h-0 opacity-0"
                    }`}
                >
                  <CategoryLinks mobile />
                </div>
              </div>

              {/* Remaining links */}
              {navItems.slice(2).map((item) => (
                  <Link
                      key={item.href}
                      href={item.href}
                      onClick={closeMobileMenu}
                      className="block rounded-xl px-4 py-3 text-sm text-white/85 transition hover:bg-white/10 hover:text-white"
                  >
                    {item.title}
                  </Link>
              ))}

              {/* CART MOBILE */}
              <Link
                  href="/cart"
                  onClick={closeMobileMenu}
                  className="flex items-center justify-between rounded-xl px-4 py-3 text-sm text-white/85 transition hover:bg-white/10"
              >
              <span className="flex items-center gap-2">
                <FiShoppingBag size={17} />
                سبد خرید
              </span>

                {isCartLoaded && cartCount > 0 && (
                    <span className="rounded-full bg-[#3295FF] px-2 py-0.5 text-xs font-bold text-white">
                  {cartCount > 99 ? "99+" : cartCount}
                </span>
                )}
              </Link>

              {/* USER MENU */}
              <Link
                  href={user ? "/user" : "#"}
                  onClick={(event) => {
                    closeMobileMenu();

                    if (!user) {
                      event.preventDefault();
                      setLoginOpen(true);
                    }
                  }}
                  className="flex items-center gap-2 rounded-xl px-4 py-3 text-sm text-white/85 hover:bg-white/10"
              >
                <FiUser size={17} />
                {user ? "پنل کاربری" : "ورود / ثبت‌نام"}
              </Link>
            </nav>
          </div>
        </header>

        {/* LOGIN MODAL */}
        {loginOpen && (
            <LoginModal
                onClose={() => setLoginOpen(false)}
                onSuccess={() => setLoginOpen(false)}
            />
        )}
      </div>
  );
}
