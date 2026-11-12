"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useToast } from "@/components/ui/toast";
import {
  getGuestCart,
  updateGuestCartQuantity,
  removeFromGuestCart,
} from "@/lib/guest-cart";
import {
  ShoppingBag,
  ShoppingCart,
  ArrowRight,
  ArrowLeft,
  Plus,
  Minus,
  Trash2,
  ShieldCheck,
  Truck,
  Package,
  RefreshCw,
} from "lucide-react";

interface CartProduct {
  id: string;
  name: string;
  description: string;
  imageUrl?: string;
  price: number;
  stock: number;
}

interface CartItem {
  productId: string;
  quantity: number;
  addedAt: string;
  updatedAt: string;
  product: CartProduct;
  subtotal: number;
}

interface CartSummary {
  items: CartItem[];
  totalItems: number;
  totalPrice: number;
}

const formatPrice = (price: number) =>
  new Intl.NumberFormat("en-BD", {
    style: "currency",
    currency: "BDT",
    maximumFractionDigits: 0,
  }).format(price);

export default function CartPage() {
  const { toast } = useToast();
  const [cart, setCart] = useState<CartSummary>({
    items: [],
    totalItems: 0,
    totalPrice: 0,
  });

  const [loading, setLoading] = useState(true);
  const [busyProduct, setBusyProduct] = useState("");
  const [error, setError] = useState("");
  const [isGuestCart, setIsGuestCart] = useState(false);
const loadCart = useCallback(async () => {
  try {
    setError("");

    const response = await fetch("/api/cart", {
      cache: "no-store",
    });

    // Guest user: load cart from localStorage
    if (response.status === 401) {
      setIsGuestCart(true);

      const guestItems = getGuestCart();

      const productResults = await Promise.all(
        guestItems.map(async (item) => {
          try {
            const productResponse = await fetch(
              `/api/products?id=${encodeURIComponent(item.productId)}`,
              { cache: "no-store" }
            );

            if (!productResponse.ok) return null;

            const productResult = await productResponse.json();
            const product = productResult.data;

            if (!product) return null;

            return {
              productId: item.productId,
              quantity: item.quantity,
              addedAt: "",
              updatedAt: "",
              product,
              subtotal: product.price * item.quantity,
            };
          } catch {
            return null;
          }
        })
      );

      const validItems = productResults.filter(
        (item): item is NonNullable<typeof item> => item !== null
      );

      setCart({
        items: validItems,
        totalItems: validItems.reduce(
          (total, item) => total + item.quantity,
          0
        ),
        totalPrice: validItems.reduce(
          (total, item) => total + item.subtotal,
          0
        ),
      });

      return;
    }

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || "Unable to load your cart.");
    }

    setIsGuestCart(false);
    setCart(
      result.data || {
        items: [],
        totalItems: 0,
        totalPrice: 0,
      }
    );
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Something went wrong.";
    setError(message);
    toast.error(message);
  } finally {
    setLoading(false);
  }
}, [toast]);

  useEffect(() => {
    loadCart();
  }, [loadCart]);

  async function updateQuantity(
  productId: string,
  quantity: number,
  stock: number
) {
  if (quantity < 1 || quantity > stock) return;

  setBusyProduct(productId);
  setError("");

  try {
    if (isGuestCart) {
      updateGuestCartQuantity(productId, quantity);

      await loadCart();
      window.dispatchEvent(new Event("cart-updated"));

      toast.success("Cart quantity updated.");
      return;
    }

    const response = await fetch("/api/cart", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        productId,
        quantity,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || "Unable to update quantity.");
    }

    await loadCart();
    window.dispatchEvent(new Event("cart-updated"));
    toast.success("Cart quantity updated.");
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Unable to update cart.";
    setError(message);
    toast.error(message);
  } finally {
    setBusyProduct("");
  }
}

  async function removeItem(productId: string) {
  setBusyProduct(productId);
  setError("");

  try {
    if (isGuestCart) {
      removeFromGuestCart(productId);

      await loadCart();
      window.dispatchEvent(new Event("cart-updated"));

      toast.success("Product removed from your cart.");
      return;
    }

    const response = await fetch(
      `/api/cart?productId=${encodeURIComponent(productId)}`,
      { method: "DELETE" }
    );

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || "Unable to remove item.");
    }

    await loadCart();
    window.dispatchEvent(new Event("cart-updated"));
    toast.success("Product removed from your cart.");
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Unable to remove product.";
    setError(message);
    toast.error(message);
  } finally {
    setBusyProduct("");
  }
}

  const shippingCost = 0;
  const grandTotal = cart.totalPrice + shippingCost;

  if (loading) {
    return (
      <section className="min-h-[70vh] bg-[radial-gradient(ellipse_at_top,_rgba(99,102,241,0.10),_transparent_42%),linear-gradient(180deg,#f8faff_0%,#f1f5f9_100%)] px-4 py-16">
        <div className="mx-auto max-w-7xl">
          <div className="h-8 w-48 animate-pulse rounded-lg bg-slate-200" />

          <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_360px]">
            <div className="space-y-4">
              {[1, 2, 3].map((item) => (
                <div
                  key={item}
                  className="h-36 animate-pulse rounded-2xl bg-white"
                />
              ))}
            </div>

            <div className="h-72 animate-pulse rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/70" />
          </div>
        </div>
      </section>
    );
  }

  if (error && cart.items.length === 0) {
    return (
      <section className="flex min-h-[70vh] items-center justify-center bg-[radial-gradient(ellipse_at_top,_rgba(99,102,241,0.10),_transparent_42%),linear-gradient(180deg,#f8faff_0%,#f1f5f9_100%)] px-4 py-16">
        <div className="w-full max-w-md rounded-3xl border border-white/80 bg-white/95 p-8 text-center shadow-[0_20px_60px_-30px_rgba(15,23,42,0.30)] ring-1 ring-slate-200/70 backdrop-blur">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-50 text-rose-500">
            <ShoppingCart size={30} />
          </div>

          <h2 className="mt-5 text-xl font-black text-slate-900">
            Unable to load cart
          </h2>

          <p className="mt-2 text-sm leading-6 text-slate-500">{error}</p>

          {error.toLowerCase().includes("sign in") ? (
            <Link
              href="/login"
              className="premium-button mt-6 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 text-sm font-bold text-white hover:bg-indigo-700"
            >
              Sign In <ArrowRight size={16} />
            </Link>
          ) : (
            <button
              type="button"
              onClick={loadCart}
              className="premium-button mt-6 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 text-sm font-bold text-white hover:bg-indigo-700"
            >
              Try Again <RefreshCw size={16} />
            </button>
          )}
        </div>
      </section>
    );
  }

  if (cart.items.length === 0) {
    return (
      <section className="flex min-h-[70vh] items-center justify-center bg-[radial-gradient(ellipse_at_top,_rgba(99,102,241,0.10),_transparent_42%),linear-gradient(180deg,#f8faff_0%,#f1f5f9_100%)] px-4 py-16">
        <div className="w-full max-w-lg rounded-3xl border border-white/80 bg-white/95 px-6 py-12 text-center shadow-[0_20px_60px_-30px_rgba(15,23,42,0.30)] ring-1 ring-slate-200/70 backdrop-blur sm:px-10">
          <div className="relative mx-auto flex h-24 w-24 items-center justify-center rounded-[2rem] bg-indigo-50 text-indigo-500">
            <ShoppingBag size={43} strokeWidth={1.4} />
            <span className="absolute -right-2 -top-2 flex h-8 w-8 items-center justify-center rounded-full border-4 border-white bg-indigo-600 text-white">
              <Plus size={15} />
            </span>
          </div>

          <p className="mt-7 text-[10px] font-extrabold uppercase tracking-[0.2em] text-indigo-600">
            Your Shopping Journey
          </p>

          <h1 className="mt-3 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
            Your cart is feeling lonely!
          </h1>

          <p className="mx-auto mt-3 max-w-sm text-sm leading-7 text-slate-500">
            Looks like you haven't added anything yet. Explore our collection
            and find something you'll love.
          </p>

          <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
  <Link
    href="/#products"
    className="premium-button inline-flex h-11 w-full max-w-[220px] items-center justify-center gap-2 rounded-full bg-indigo-600 px-7 text-sm font-bold !text-white shadow-lg shadow-indigo-200 transition hover:bg-indigo-700 sm:w-auto"
  >
    Start Shopping <ArrowRight size={17} />
  </Link>

  <Link
    href="/"
    className="inline-flex h-11 w-full max-w-[220px] items-center justify-center gap-2 rounded-full border border-slate-300 bg-transparent px-7 text-sm font-semibold text-slate-600 transition hover:border-indigo-500 hover:text-indigo-600 sm:w-auto"
  >
    <ArrowLeft size={14} />
    Back to Home
  </Link>
</div>
        </div>
      </section>
    );
  }

  return (
    <section className="min-h-screen bg-[radial-gradient(ellipse_at_top,_rgba(99,102,241,0.09),_transparent_38%),linear-gradient(180deg,#f8faff_0%,#f1f5f9_100%)] px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
      <div className="mx-auto max-w-7xl">
        {/* PAGE HEADING */}
<div className="mb-6 flex items-center justify-between gap-2 sm:mb-8">
  <div className="min-w-0">
    <div className="mb-2 inline-flex items-center gap-1.5 text-[10px] font-bold text-indigo-600 sm:mb-3 sm:gap-2 sm:text-xs">
      <ShoppingCart size={13} className="sm:h-[15px] sm:w-[15px]" />
      YOUR SHOPPING BAG
    </div>

    <h1 className="text-2xl font-black tracking-tight text-slate-950 sm:text-4xl">
      Shopping Cart
    </h1>

    <p className="mt-1.5 text-xs text-slate-500 sm:mt-2 sm:text-sm">
      Review your selected products before checkout.
    </p>
  </div>

  <div className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-indigo-100 bg-white px-3 py-2 text-[10px] font-bold text-indigo-600 shadow-sm sm:gap-2 sm:px-4 sm:py-2.5 sm:text-xs">
    <ShoppingBag size={13} className="sm:h-[15px] sm:w-[15px]" />
    {cart.totalItems} {cart.totalItems === 1 ? "Item" : "Items"}
  </div>
</div>

        {/* BREADCRUMB */}
        <div className="mb-7 flex items-center gap-2 text-xs text-slate-400">
          <Link href="/" className="transition hover:text-indigo-600">
            Home
          </Link>
          <span>/</span>
          <span className="font-semibold text-slate-700">Shopping Cart</span>
        </div>

        {error && (
          <div
            role="alert"
            className="mb-5 rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-xs font-medium text-rose-600"
          >
            {error}
          </div>
        )}

        <div className="grid items-start gap-7 lg:grid-cols-[1fr_360px] xl:grid-cols-[1fr_390px]">
          {/* CART ITEMS */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-extrabold text-slate-900">
                Cart Items
              </h2>

              <button
                type="button"
                onClick={loadCart}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 transition hover:text-indigo-600"
              >
                <RefreshCw size={13} />
                Refresh
              </button>
            </div>

            {cart.items.map((item) => {
              const isBusy = busyProduct === item.productId;

              return (
                <article
                  key={item.productId}
                  className={`premium-card group relative overflow-hidden rounded-3xl border border-white/80 bg-white/95 p-4 shadow-[0_16px_45px_-28px_rgba(15,23,42,0.28)] ring-1 ring-slate-200/70 transition duration-300 hover:-translate-y-0.5 hover:shadow-xl p-3 sm:p-5 ${
                    isBusy ? "opacity-60" : ""
                  }`}
                >
                  <div className="flex flex-row items-start gap-3 min-[480px]:gap-4">
                    {/* PRODUCT VISUAL */}
                    <div className="relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-indigo-50 to-violet-100 ring-1 ring-indigo-100/70 min-[480px]:h-32 min-[480px]:w-32 min-[480px]:rounded-2xl">
  {item.product.imageUrl ? (
    <img
      src={item.product.imageUrl}
      alt={item.product.name}
      loading="lazy"
      className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
    />
  ) : (
    <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-white/80 bg-white/60 text-indigo-400 shadow-sm min-[480px]:h-20 min-[480px]:w-20">
  <ShoppingBag size={32} className="min-[480px]:!h-[42px] min-[480px]:!w-[42px]" strokeWidth={1.2} />
</div>
  )}
</div>

                    {/* PRODUCT INFO */}
                    <div className="flex min-w-0 flex-1 flex-col justify-between gap-4">
                      <div>
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <h3 className="line-clamp-2 text-sm font-extrabold text-slate-900 sm:text-base">
                              {item.product.name}
                            </h3>

                            <p className="mt-1.5 line-clamp-2 text-xs leading-5 text-slate-500">
                              {item.product.description}
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={() => removeItem(item.productId)}
                            disabled={isBusy}
                            aria-label={`Remove ${item.product.name}`}
                            className="shrink-0 rounded-xl p-2 text-slate-400 transition hover:bg-rose-50 hover:text-rose-500 disabled:opacity-50"
                          >
                            <Trash2 size={17} />
                          </button>
                        </div>

                        <p className="mt-2 text-[11px] font-semibold text-emerald-600">
                          {item.product.stock > 0
                            ? `${item.product.stock} available`
                            : "Currently unavailable"}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-end justify-between gap-4">
                        {/* QUANTITY */}
                        <div>
                          <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            Quantity
                          </p>

                          <div className="flex h-9 items-center overflow-hidden rounded-lg border border-slate-200">
                            <button
                              type="button"
                              onClick={() =>
                                updateQuantity(
                                  item.productId,
                                  item.quantity - 1,
                                  item.product.stock
                                )
                              }
                              disabled={isBusy || item.quantity <= 1}
                              aria-label="Decrease quantity"
                              className="flex h-full w-9 items-center justify-center text-slate-600 transition hover:bg-indigo-50 hover:text-indigo-600 disabled:cursor-not-allowed disabled:opacity-30"
                            >
                              <Minus size={14} />
                            </button>

                            <span className="flex h-full min-w-10 items-center justify-center border-x border-slate-200 px-2 text-xs font-bold text-slate-900">
                              {item.quantity}
                            </span>

                            <button
                              type="button"
                              onClick={() =>
                                updateQuantity(
                                  item.productId,
                                  item.quantity + 1,
                                  item.product.stock
                                )
                              }
                              disabled={
                                isBusy ||
                                item.quantity >= item.product.stock
                              }
                              aria-label="Increase quantity"
                              className="flex h-full w-9 items-center justify-center text-slate-600 transition hover:bg-indigo-50 hover:text-indigo-600 disabled:cursor-not-allowed disabled:opacity-30"
                            >
                              <Plus size={14} />
                            </button>
                          </div>
                        </div>

                        {/* PRICE */}
                        <div className="text-right">
                          <p className="text-[10px] font-semibold text-slate-400">
                            {formatPrice(item.product.price)} × {item.quantity}
                          </p>

                          <p className="mt-1 text-base font-black text-indigo-600">
                            {formatPrice(item.subtotal)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}

            <Link
              href="/#products"
              className="inline-flex items-center gap-2 pt-2 text-xs font-bold text-slate-500 transition hover:text-indigo-600"
            >
              <ArrowLeft size={15} />
              Continue Shopping
            </Link>
          </div>

          {/* ORDER SUMMARY */}
          <aside className="lg:sticky lg:top-28">
            <div className="overflow-hidden rounded-3xl border border-white/80 bg-white/95 shadow-[0_18px_50px_-28px_rgba(15,23,42,0.30)] ring-1 ring-slate-200/70 backdrop-blur">
              <div className="border-b border-slate-100 px-5 py-5 sm:px-6">
                <h2 className="text-base font-black text-slate-900">
                  Order Summary
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  Review your order details.
                </p>
              </div>

              <div className="space-y-4 px-5 py-5 sm:px-6">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Subtotal</span>
                  <span className="font-bold text-slate-800">
                    {formatPrice(cart.totalPrice)}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Shipping</span>
                  <span className="font-bold text-emerald-600">
                    Calculated at checkout
                  </span>
                </div>

                <div className="border-t border-dashed border-slate-200 pt-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-extrabold text-slate-900">
                      Total
                    </span>

                    <span className="text-xl font-black text-indigo-600">
                      {formatPrice(grandTotal)}
                    </span>
                  </div>

                  <p className="mt-2 text-[10px] leading-5 text-slate-400">
                    Final shipping charges, if applicable, will be confirmed
                    during checkout.
                  </p>
                </div>

                <Link
                  href="/checkout"
                  className="premium-button flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-sm font-bold !text-white shadow-lg shadow-indigo-200/70 transition hover:-translate-y-0.5 hover:from-indigo-700 hover:to-violet-700 hover:shadow-xl"
                >
                  Proceed to Checkout
                  <ArrowRight size={17} />
                </Link>

                <div className="flex items-center justify-center gap-2 text-[10px] font-semibold text-slate-400">
                  <ShieldCheck size={14} />
                  Secure checkout experience
                </div>
              </div>
            </div>

            {/* SERVICE INFO */}
            <div className="mt-4 space-y-3 rounded-3xl border border-white/80 bg-white/90 p-5 shadow-sm ring-1 ring-slate-200/70">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                  <Truck size={18} />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-800">
                    Convenient Delivery
                  </p>
                  <p className="mt-1 text-[10px] text-slate-400">
                    Delivery details at checkout
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                  <Package size={18} />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-800">
                    Order Protection
                  </p>
                  <p className="mt-1 text-[10px] text-slate-400">
                    Your order details are securely stored
                  </p>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}