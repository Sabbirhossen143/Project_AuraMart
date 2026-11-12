
"use client";

import { useToast } from "@/components/ui/toast";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  getGuestWishlist,
  removeFromGuestWishlist,
} from "@/lib/guest-wishlist";

import { addToGuestCart } from "@/lib/guest-cart";
import {
  ArrowRight,
  Heart,
  Loader2,
  Package,
  ShoppingBag,
  ShoppingCart,
  Plus,
  Trash2,
} from "lucide-react";

interface Product {
  id: string;
  name: string;
  description: string;
  imageUrl?: string;
  price: number;
  discountPercent?: number;
  stock: number;
  categoryId: string;
}

interface WishlistEntry {
  productId: string;
  addedAt: string;
  product: Product | null;
}

const formatPrice = (amount: number) =>
  new Intl.NumberFormat("en-BD", {
    style: "currency",
    currency: "BDT",
    maximumFractionDigits: 0,
  }).format(amount);

const getDiscountedPrice = (price: number, discountPercent?: number) =>
  discountPercent && discountPercent > 0
    ? Math.round(price * (1 - discountPercent / 100))
    : price;

export default function WishlistPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [items, setItems] = useState<WishlistEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [addingId, setAddingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const loadWishlist = useCallback(async () => {
  try {
    setLoading(true);
    setError("");

    const response = await fetch("/api/wishlist", {
      cache: "no-store",
    });

    let wishlistItems: { productId: string; addedAt: string }[] = [];

    if (response.status === 401) {
      // Guest user: load wishlist from localStorage
      wishlistItems = getGuestWishlist();
    } else {
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Failed to load wishlist.");
      }

      wishlistItems = Array.isArray(result.data) ? result.data : [];
    }

    const productResults = await Promise.all(
      wishlistItems.map(async (item) => {
        try {
          const productResponse = await fetch(
            `/api/products?id=${item.productId}`
          );

          if (!productResponse.ok) {
            return { ...item, product: null };
          }

          const productResult = await productResponse.json();

          return {
            ...item,
            product: productResult.data ?? null,
          };
        } catch {
          return { ...item, product: null };
        }
      })
    );

    setItems(productResults);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Something went wrong.";
    setError(message);
    toast.error(message);
  } finally {
    setLoading(false);
  }
}, [toast]);

  useEffect(() => {
    loadWishlist();
  }, [loadWishlist]);

  const removeFromWishlist = async (productId: string) => {
  try {
    setRemovingId(productId);
    setError("");

    const response = await fetch(
      `/api/wishlist?productId=${encodeURIComponent(productId)}`,
      { method: "DELETE" }
    );

    if (response.status === 401) {
      // Guest user: remove from localStorage
      removeFromGuestWishlist(productId);
      window.dispatchEvent(new Event("wishlist-updated"));

      setItems((previous) =>
        previous.filter((item) => item.productId !== productId)
      );

      toast.success("Product removed from your wishlist.");
      return;
    }

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || "Failed to remove item.");
    }

    setItems((previous) =>
      previous.filter((item) => item.productId !== productId)
    );
    window.dispatchEvent(new Event("wishlist-updated"));

    toast.success("Product removed from your wishlist.");
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unable to remove product.";
    setError(message);
    toast.error(message);
  } finally {
    setRemovingId(null);
  }
};

  const addToCart = async (productId: string) => {
  try {
    setAddingId(productId);
    setError("");

    const response = await fetch("/api/cart", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        productId,
        quantity: 1,
      }),
    });

    if (response.status === 401) {
      // Guest user: add to localStorage cart
      addToGuestCart(productId, 1);

      window.dispatchEvent(new Event("cart-updated"));
      toast.success("Product successfully added to your cart.");
      return;
    }

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || "Failed to add product to cart.");
    }

    window.dispatchEvent(new Event("cart-updated"));
    toast.success("Product successfully added to your cart.");
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unable to add product.";
    setError(message);
    toast.error(message);
  } finally {
    setAddingId(null);
  }
};

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_rgba(99,102,241,0.08),_transparent_38%),linear-gradient(180deg,#f8faff_0%,#f1f5f9_100%)]">
      {/* Header */}
      <section className="bg-gradient-to-r from-indigo-600 via-indigo-700 to-violet-700 px-4 py-12 text-white sm:py-16">
        <div className="mx-auto max-w-6xl">
          <div className="mb-3 text-sm text-indigo-100">
            <Link href="/" className="hover:text-white">
              Home
            </Link>
            <span className="mx-2">/</span>
            My Wishlist
          </div>

          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15">
              <Heart size={30} />
            </div>
            <div>
              <h1 className="text-3xl font-bold sm:text-4xl">
                My Wishlist
              </h1>
              <p className="mt-1 text-sm text-indigo-100 sm:text-base">
                Your favorite products, all in one place.
              </p>
            </div>
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-6xl px-4 py-10 sm:py-14">
        <div className="mb-7 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              Saved Products
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {items.length} {items.length === 1 ? "item" : "items"} saved
            </p>
          </div>

          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-indigo-300 hover:text-indigo-600"
          >
            Continue Shopping
            <ArrowRight size={16} />
          </Link>
        </div>

        {error && (
          <div role="alert" className="mb-5 rounded-2xl border border-rose-200/80 bg-rose-50/90 px-4 py-3 text-sm font-medium text-rose-700 shadow-sm">
            {error}
          </div>
        )}

        {loading ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((item) => (
              <div
                key={item}
                className="h-80 animate-pulse rounded-2xl bg-white"
              />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-3xl border border-white/80 bg-white px-6 py-16 text-center shadow-[0_18px_55px_-32px_rgba(15,23,42,0.28)] ring-1 ring-slate-200/70">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-pink-50 text-pink-500">
              <Heart size={36} />
            </div>

            <h3 className="mt-6 text-xl font-bold text-slate-900">
              Your Wishlist is Empty
            </h3>

            <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500">
              Save your favorite products here and come back whenever
              you are ready to shop.
            </p>

            <Link
  href="/"
  style={{ color: "#ffffff" }}
  className="premium-button mt-6 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 font-semibold hover:bg-indigo-700"
>
  Explore Products
  <ArrowRight size={18} />
</Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3">
            {items.map((item) => {
              const product = item.product;
              const isRemoving = removingId === item.productId;
              const isAdding = addingId === item.productId;

              return (
                <article
                  key={item.productId}
                  role={product ? "button" : undefined}
                  tabIndex={product ? 0 : undefined}
                  aria-label={product ? `View details for ${product.name}` : undefined}
                  onClick={() => product && router.push(`/products/${product.id}`)}
                  onKeyDown={(event) => {
                    if (!product || event.target !== event.currentTarget) return;
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      router.push(`/products/${product.id}`);
                    }
                  }}
                  className="premium-card group cursor-pointer overflow-hidden rounded-2xl border-2 border-slate-300 bg-white shadow-sm transition-all duration-300 hover:!transform-none hover:border-indigo-500 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 sm:rounded-3xl"
                >
                  {/* Product Image — same visual pattern as the home page */}
                  <div className="relative isolate flex aspect-[4/3] items-center justify-center overflow-hidden bg-gradient-to-br from-indigo-50 via-slate-50 to-violet-100">
                    <div className="absolute inset-0 z-0 bg-gradient-to-br from-indigo-50 to-violet-100" />
                    {product?.imageUrl ? (
                      <img
                        src={product.imageUrl}
                        alt={product.name}
                        loading="lazy"
                        onError={(event) => {
                          event.currentTarget.style.display = "none";
                        }}
                        className="premium-image absolute inset-0 z-0 h-full w-full object-cover"
                      />
                    ) : (
                      <div className="relative z-0 flex h-24 w-24 items-center justify-center rounded-[2rem] border border-white/80 bg-white/60 text-indigo-300 shadow-sm backdrop-blur-sm sm:h-28 sm:w-28">
                        <ShoppingBag size={54} strokeWidth={1.1} />
                      </div>
                    )}

                    <span className="absolute left-2 top-2 z-10 rounded-full border border-white/80 bg-white/95 px-2 py-1 text-[7px] font-extrabold uppercase tracking-wide text-indigo-600 shadow-md backdrop-blur-md sm:left-3 sm:top-3 sm:px-3 sm:py-1.5 sm:text-[10px] sm:tracking-wider">
                      Saved Product
                    </span>

                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        void removeFromWishlist(item.productId);
                      }}
                      disabled={isRemoving}
                      aria-label="Remove from wishlist"
                      className="absolute right-2 top-2 z-10 flex h-8 w-8 items-center justify-center rounded-full border border-white/80 bg-white/95 text-rose-500 shadow-md backdrop-blur-md transition-all duration-300 hover:scale-110 hover:bg-rose-50 disabled:opacity-50 sm:right-3 sm:top-3 sm:h-10 sm:w-10 sm:shadow-lg"
                    >
                      {isRemoving ? (
                        <Loader2 size={15} className="animate-spin sm:h-[18px] sm:w-[18px]" />
                      ) : (
                        <Trash2 size={15} className="sm:h-[18px] sm:w-[18px]" />
                      )}
                    </button>

                    {product && product.stock <= 0 && (
  <span className="absolute bottom-2 left-2 z-10 whitespace-nowrap rounded-full bg-slate-950/90 px-1.5 py-0.5 text-[9px] font-bold text-white shadow-md backdrop-blur-md sm:bottom-3 sm:left-3 sm:px-3 sm:py-1.5 sm:text-[10px] sm:shadow-lg">
    Out of Stock
  </span>
)}
                    {product?.discountPercent && product.discountPercent > 0 ? (
                      <span className="absolute bottom-2 right-2 z-10 inline-flex items-center rounded-full border border-rose-200/80 bg-gradient-to-r from-rose-600 to-orange-500 px-1.5 py-0.5 text-[9px] font-black tracking-wide text-white shadow-md shadow-rose-200/60 sm:bottom-3 sm:right-3 sm:px-3 sm:py-1.5 sm:text-xs sm:shadow-lg">
                        {product.discountPercent}% OFF
                      </span>
                    ) : null}
                  </div>

                  <div className="p-2.5 sm:p-5">
                    {product ? (
                      <>
                        <h3 className="line-clamp-1 text-sm font-extrabold text-slate-900 sm:text-base">
                          {product.name}
                        </h3>
                        <p className="mt-1.5 line-clamp-2 min-h-10 text-[11px] leading-5 text-slate-500 sm:text-xs">
                          {product.description}
                        </p>

                        <div className="mt-4 flex items-center justify-between gap-2">
                          <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5">
                            {product.discountPercent && product.discountPercent > 0 ? (
                              <>
                                <span className="text-base font-black tracking-tight text-rose-600 sm:text-lg">
                                  {formatPrice(getDiscountedPrice(product.price, product.discountPercent))}
                                </span>
                                <span className="text-xs font-semibold text-slate-400 line-through">
                                  {formatPrice(product.price)}
                                </span>
                              </>
                            ) : (
                              <span className="text-base font-black tracking-tight text-indigo-600 sm:text-lg">
                                {formatPrice(product.price)}
                              </span>
                            )}
                          </div>
                          <span
  className={`inline-flex shrink-0 items-center gap-1 whitespace-nowrap text-[9px] font-bold sm:text-[10px] ${
    product.stock > 0 ? "text-emerald-600" : "text-rose-500"
  }`}
>
  <span
    className={`h-1.5 w-1.5 shrink-0 rounded-full ${
      product.stock > 0 ? "bg-emerald-500" : "bg-rose-500"
    }`}
  />
  {product.stock > 0 ? "In Stock" : "Unavailable"}
</span>
                        </div>

                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            void addToCart(item.productId);
                          }}
                          disabled={isAdding || isRemoving || product.stock <= 0}
                          className="group premium-button relative -mx-1.5 mt-4 flex h-10 w-[calc(100%+0.75rem)] items-center justify-between gap-1.5 overflow-hidden rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-600 to-violet-600 px-2 text-[10px] font-bold text-white shadow-lg shadow-indigo-200/70 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-indigo-300/60 active:translate-y-0 disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-60 disabled:shadow-none sm:mx-0 sm:mt-5 sm:h-12 sm:w-full sm:gap-3 sm:px-3.5 sm:text-sm"
                        >
                          <span className="relative flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-white/15 transition-colors group-hover:bg-white/25 sm:h-8 sm:w-8">
  {isAdding ? (
    <Loader2 size={14} className="animate-spin sm:h-[17px] sm:w-[17px]" />
  ) : (
    <ShoppingCart size={14} className="sm:h-[17px] sm:w-[17px]" />
  )}
</span>
                          <span className="relative flex-1 whitespace-nowrap text-center">
                            {isAdding
                              ? "Adding to Cart..."
                              : product.stock <= 0
                                ? "Out of Stock"
                                : "Add to Cart"}
                          </span>
                          <span className="relative flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-white/15 transition-all duration-300 group-hover:translate-x-0.5 group-hover:bg-white/25 sm:h-8 sm:w-8">
  <Plus size={14} className="sm:h-[17px] sm:w-[17px]" />
</span>
                          
                        </button>
                      </>
                    ) : (
                      <>
                        <h3 className="font-bold text-slate-900">Product Unavailable</h3>
                        <p className="mt-2 text-sm text-slate-500">
                          This product may have been removed from the store.
                        </p>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            void removeFromWishlist(item.productId);
                          }}
                          disabled={isRemoving}
                          className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl border border-red-200 px-4 py-3 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
                        >
                          {isRemoving ? <Loader2 size={17} className="animate-spin" /> : <Trash2 size={17} />}
                          Remove Item
                        </button>
                      </>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
