
import "./globals.css";
import localFont from "next/font/local";
import { AuthProvider } from "@/context/AuthContext";
import { CartProvider } from "@/context/CartContext";

const vazirmatn = localFont({
  src: [
    {
      path: "../font/vazirmatn/Vazirmatn-Regular.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../font/vazirmatn/Vazirmatn-Medium.woff2",
      weight: "500",
      style: "normal",
    },
    {
      path: "../font/vazirmatn/Vazirmatn-Bold.woff2",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--font-vazirmatn",
  display: "swap",
});

export const metadata = {
  title: "Technova",
  description: "فروشگاه آنلاین تکنووا",
};

export default function RootLayout({ children }) {
  return (
      <html lang="fa" dir="rtl">
      <body className={vazirmatn.className}>
      <AuthProvider>
        <CartProvider>
          {children}
        </CartProvider>
      </AuthProvider>
      </body>
      </html>
  );
}
