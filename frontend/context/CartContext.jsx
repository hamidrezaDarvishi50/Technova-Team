
"use client";

import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
} from "react";
import { toast } from "react-toastify";

const CartContext = createContext(null);
const STORAGE_KEY = "technova-cart";

export function CartProvider({ children }) {
    const [cartItems, setCartItems] = useState([]);
    const [isCartLoaded, setIsCartLoaded] = useState(false);

    // Load cart once on the client
    useEffect(() => {
        try {
            const savedCart = localStorage.getItem(STORAGE_KEY);
            if (savedCart) {
                const parsedCart = JSON.parse(savedCart);
                if (Array.isArray(parsedCart)) {
                    setCartItems(parsedCart);
                }
            }
        } catch (error) {
            console.error("Cart loading error:", error);
        } finally {
            setIsCartLoaded(true);
        }
    }, []);

    // Persist cart after initial loading
    useEffect(() => {
        if (!isCartLoaded) return;

        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(cartItems));
        } catch (error) {
            console.error("Cart saving error:", error);
        }
    }, [cartItems, isCartLoaded]);

    const getItemKey = (product, variant) => {
        const productId = product.id ?? product.slug;
        const variantKey = variant?.value ?? variant?.name ?? "default";
        return `${productId}-${variantKey}`;
    };

    const addToCart = useCallback((product, quantity = 1, variant = null) => {
        if (!product) return;

        const stock = Number(product.stock ?? 0);

        if (stock <= 0) {
            toast.warning("این محصول در حال حاضر ناموجود است.");
            return;
        }

        const safeQuantity = Math.max(1, Math.min(Number(quantity) || 1, stock));
        const itemKey = getItemKey(product, variant);

        setCartItems((currentItems) => {
            const existingItem = currentItems.find(
                (item) => item.cartKey === itemKey
            );

            if (existingItem) {
                const nextQuantity = Math.min(
                    existingItem.quantity + safeQuantity,
                    Number(existingItem.stock ?? stock)
                );

                if (nextQuantity === existingItem.quantity) {
                    toast.info("حداکثر تعداد مجاز این محصول در سبد خرید شماست.");
                    return currentItems;
                }

                toast.success("تعداد محصول در سبد خرید به‌روزرسانی شد.");

                return currentItems.map((item) =>
                    item.cartKey === itemKey
                        ? { ...item, quantity: nextQuantity }
                        : item
                );
            }

            toast.success("محصول به سبد خرید اضافه شد.");

            return [
                ...currentItems,
                {
                    ...product,
                    cartKey: itemKey,
                    quantity: safeQuantity,
                    stock,
                    variant,
                    unitPrice: Number(product.final_price ?? product.price ?? 0),
                },
            ];
        });
    }, []);

    const removeFromCart = useCallback((cartKey) => {
        setCartItems((items) =>
            items.filter((item) => item.cartKey !== cartKey)
        );
        toast.success("محصول از سبد خرید حذف شد.");
    }, []);

    const updateQuantity = useCallback((cartKey, quantity) => {
        setCartItems((items) =>
            items.map((item) => {
                if (item.cartKey !== cartKey) return item;

                const nextQuantity = Math.max(
                    1,
                    Math.min(Number(quantity) || 1, Number(item.stock ?? 1))
                );

                return { ...item, quantity: nextQuantity };
            })
        );
    }, []);

    const increaseQuantity = useCallback((cartKey) => {
        setCartItems((items) =>
            items.map((item) => {
                if (item.cartKey !== cartKey) return item;

                if (item.quantity >= Number(item.stock ?? 1)) {
                    toast.info("موجودی بیشتری از این محصول وجود ندارد.");
                    return item;
                }

                return { ...item, quantity: item.quantity + 1 };
            })
        );
    }, []);

    const decreaseQuantity = useCallback((cartKey) => {
        setCartItems((items) =>
            items.map((item) =>
                item.cartKey === cartKey
                    ? { ...item, quantity: Math.max(1, item.quantity - 1) }
                    : item
            )
        );
    }, []);

    const clearCart = useCallback(() => {
        setCartItems([]);
    }, []);

    const cartCount = useMemo(
        () => cartItems.reduce((total, item) => total + item.quantity, 0),
        [cartItems]
    );

    const subtotal = useMemo(
        () =>
            cartItems.reduce(
                (total, item) => total + Number(item.price ?? 0) * item.quantity,
                0
            ),
        [cartItems]
    );

    const totalPrice = useMemo(
        () =>
            cartItems.reduce(
                (total, item) => total + item.unitPrice * item.quantity,
                0
            ),
        [cartItems]
    );

    const totalDiscount = subtotal - totalPrice;

    const value = {
        cartItems,
        cartCount,
        subtotal,
        totalPrice,
        totalDiscount,
        isCartLoaded,
        addToCart,
        removeFromCart,
        updateQuantity,
        increaseQuantity,
        decreaseQuantity,
        clearCart,
    };

    return (
        <CartContext.Provider value={value}>
            {children}
        </CartContext.Provider>
    );
}

export function useCart() {
    const context = useContext(CartContext);

    if (!context) {
        throw new Error("useCart must be used inside CartProvider");
    }

    return context;
}
