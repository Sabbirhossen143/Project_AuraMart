"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { addToGuestCart } from "@/lib/guest-cart";
import { addToGuestWishlist } from "@/lib/guest-wishlist";
import { useToast } from "@/components/ui/toast";
import {
  ArrowLeft, ArrowRight, Heart, Minus, Package, Plus,
  ShieldCheck, ShoppingCart, Truck, XCircle,
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
  createdAt?: string;
  updatedAt?: string;
}

interface Category {
  id: string;
  name: string;
}

const formatPrice = (amount: number) =>
  new Intl.NumberFormat("en-BD", {
    style: "currency",
    currency: "BDT",
    maximumFractionDigits: 0,
  }).format(amount);

const getDiscountedPrice = (price: number, discountPercent = 0) =>
  discountPercent > 0
    ? Math.round(price * (1 - discountPercent / 100))
    : price;

function ProductDetailsContent() {
  const { toast } = useToast();
  const params = useParams<{ id: string }>();
  const productId = params.id;

  const [product, setProduct] = useState<Product | null>(null);
  const [categoryName, setCategoryName] = useState("Featured Product");
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [addingToCart, setAddingToCart] = useState(false);
  const [addingToWishlist, setAddingToWishlist] = useState(false);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [message, setMessage] = useState("");

  const loadProduct = useCallback(async () => {
    if (!productId) return;

    try {
      setLoading(true);
      setMessage("");

      const response = await fetch(
        `/api/products?id=${encodeURIComponent(productId)}`,
        { cache: "no-store" }
      );
      const result = await response.json();

      if (!response.ok || !result.success || !result.data) {
        throw new Error(result.message || "Product not found.");
      }

      const currentProduct = result.data as Product;
      setProduct(currentProduct);
      setQuantity(1);

      const [categoryResponse, relatedResponse] = await Promise.all([
        fetch("/api/categories", { cache: "no-store" }),
        fetch(
          `/api/products?categoryId=${encodeURIComponent(currentProduct.categoryId)}&limit=8`,
          { cache: "no-store" }
        ),
      ]);

      if (categoryResponse.ok) {
        const categoryResult = await categoryResponse.json();
        const categories = Array.isArray(categoryResult.data)
          ? categoryResult.data
          : categoryResult.data?.items || [];
        const category = categories.find(
          (item: Category) => item.id === currentProduct.categoryId
        );
        if (category?.name) setCategoryName(category.name);
      }

      if (relatedResponse.ok) {
        const relatedResult = await relatedResponse.json();
        const items = Array.isArray(relatedResult.data)
          ? relatedResult.data
          : relatedResult.data?.items || [];
        setRelatedProducts(
          items.filter((item: Product) => item.id !== currentProduct.id)
        );
      }
    } catch (error) {
      setProduct(null);
      setMessage(
        error instanceof Error ? error.message : "Unable to load this product."
      );
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    void loadProduct();
  }, [loadProduct]);


  async function handleAddToCart() {
  if (!product || product.stock < 1) return;

  try {
    setAddingToCart(true);

    const response = await fetch("/api/cart", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId: product.id, quantity }),
    });

    // Guest user: save cart in localStorage
    if (response.status === 401) {
      addToGuestCart(product.id, quantity);

      window.dispatchEvent(new Event("cart-updated"));

      toast.success("Product successfully added to your cart.");
      return;
    }

    const result = await response.json();

    if (!response.ok) {
      throw new Error(
        result.message || "Unable to add this product to cart."
      );
    }

    // Logged-in user: cart saved in Neon PostgreSQL
    window.dispatchEvent(new Event("cart-updated"));

    toast.success("Product successfully added to your cart.");
  } catch (error) {
    toast.error(
      error instanceof Error
        ? error.message
        : "Unable to add this product to cart."
    );
  } finally {
    setAddingToCart(false);
  }
}

  async function handleAddToWishlist() {
    if (!product || isWishlisted) return;

    try {
      setAddingToWishlist(true);
      const response = await fetch("/api/wishlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: product.id }),
      });
      if (response.status === 401) {
        addToGuestWishlist(product.id);
        window.dispatchEvent(new Event("wishlist-updated"));
        setIsWishlisted(true);
        toast.success("Added to your wishlist!");
        return;
      }

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || "Unable to add to wishlist.");
      }

      setIsWishlisted(true);
      window.dispatchEvent(new Event("wishlist-updated"));
      toast.success("Added to your wishlist!");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to add to wishlist."
      );
    } finally {
      setAddingToWishlist(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-[70vh] bg-slate-50 px-4 py-12">
        <div className="mx-auto max-w-7xl animate-pulse space-y-6">
          <div className="h-5 w-44 rounded bg-slate-200" />
          <div className="grid gap-8 rounded-3xl bg-white p-5 md:grid-cols-2 md:p-8">
            <div className="aspect-square rounded-2xl bg-slate-200" />
            <div className="space-y-5 py-4">
              <div className="h-5 w-32 rounded bg-slate-200" />
              <div className="h-10 w-3/4 rounded bg-slate-200" />
              <div className="h-24 rounded bg-slate-100" />
              <div className="h-12 w-1/2 rounded bg-slate-200" />
              <div className="h-12 rounded bg-slate-200" />
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (!product) {
    return (
      <main className="flex min-h-[65vh] items-center justify-center bg-slate-50 px-4">
        <div className="max-w-md rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <XCircle className="mx-auto text-rose-500" size={48} />
          <h1 className="mt-4 text-xl font-black text-slate-900">Product Not Found</h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            {message || "This product may have been removed or is unavailable."}
          </p>
          <Link
            href="/"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-indigo-700"
          >
            <ArrowLeft size={16} /> Back to Home
          </Link>
        </div>
      </main>
    );
  }

  const discountedPrice = getDiscountedPrice(product.price, product.discountPercent);

  return (
    <main className="relative min-h-screen overflow-hidden bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-100/70 via-slate-50 to-white text-slate-900">
      <div className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
        <nav className="mb-6 flex flex-wrap items-center gap-2 text-xs font-medium text-slate-500 sm:text-sm">
          <Link href="/" className="transition hover:text-indigo-600">Home</Link>
          <span>/</span>
          <span>{categoryName}</span>
          <span>/</span>
          <span className="max-w-[180px] truncate font-semibold text-slate-800">
            {product.name}
          </span>
        </nav>


        <section className="relative grid gap-6 overflow-hidden rounded-[2rem] border border-white/80 bg-white/90 p-4 shadow-[0_24px_80px_-28px_rgba(30,41,59,0.22)] ring-1 ring-slate-200/70 backdrop-blur-xl sm:p-6 lg:grid-cols-2 lg:gap-12 lg:p-9">
          <div className="group/image relative flex min-h-[300px] items-center justify-center overflow-hidden rounded-[1.6rem] border border-indigo-100/70 bg-[radial-gradient(circle_at_50%_35%,_#ffffff_0%,_#eef2ff_48%,_#e0e7ff_100%)] shadow-inner sm:min-h-[480px]">
            {product.imageUrl ? (
              <img
                src={product.imageUrl}
                alt={product.name}
                className="absolute inset-0 h-full w-full object-contain p-6 transition-transform duration-700 group-hover/image:scale-[1.04] sm:p-10"
              />
            ) : (
              <div className="flex h-36 w-36 items-center justify-center rounded-[2rem] border border-white bg-white/80 text-indigo-300 shadow-xl shadow-indigo-200/40">
                <Package size={64} strokeWidth={1.2} />
              </div>
            )}

            <span className="absolute left-4 top-4 rounded-full border border-white/80 bg-white/95 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wider text-indigo-600 shadow-sm">
              {categoryName}
            </span>
            {product.discountPercent && product.discountPercent > 0 ? (
              <span className="absolute right-4 top-4 rounded-full bg-rose-600 px-3 py-1.5 text-xs font-black text-white shadow-lg">
                {product.discountPercent}% OFF
              </span>
            ) : null}
          </div>

          <div className="flex flex-col justify-center px-1 py-2 sm:px-2 sm:py-4">
            <p className="inline-flex w-fit items-center gap-2 rounded-full border border-indigo-100 bg-indigo-50/80 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.18em] text-indigo-700">
              <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" /> AuraMart Exclusive
            </p>
            <h1 className="mt-4 text-3xl font-black leading-[1.12] tracking-tight text-slate-950 sm:text-4xl lg:text-[2.65rem]">
              {product.name}
            </h1>

            <div className="mt-5 flex flex-wrap items-center gap-3">
              {product.discountPercent && product.discountPercent > 0 ? (
                <>
                  <span className="text-3xl font-black text-rose-600">
                    {formatPrice(discountedPrice)}
                  </span>
                  <span className="text-lg font-semibold text-slate-400 line-through">
                    {formatPrice(product.price)}
                  </span>
                </>
              ) : (
                <span className="text-3xl font-black text-indigo-600">
                  {formatPrice(product.price)}
                </span>
              )}
            </div>

            <div className="mt-5 flex items-center gap-2">
              <span className={`h-2.5 w-2.5 rounded-full ${product.stock > 0 ? "bg-emerald-500" : "bg-rose-500"}`} />
              <span className={`text-sm font-bold ${product.stock > 0 ? "text-emerald-700" : "text-rose-600"}`}>
                {product.stock > 0 ? `In Stock (${product.stock} available)` : "Out of Stock"}
              </span>
            </div>

            <div className="my-7 rounded-2xl border border-slate-100 bg-slate-50/80 px-4 py-5 sm:px-5">
              <h2 className="text-sm font-bold text-slate-900">Product Description</h2>
              <p className="mt-3 whitespace-pre-line text-sm leading-7 text-slate-600">
                {product.description}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="inline-flex h-12 items-center rounded-xl border border-slate-200">
                <button
                  type="button"
                  aria-label="Decrease quantity"
                  disabled={quantity <= 1}
                  onClick={() => setQuantity((value) => Math.max(1, value - 1))}
                  className="flex h-12 w-11 items-center justify-center text-slate-600 transition hover:text-indigo-600 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Minus size={17} />
                </button>
                <span className="w-9 text-center text-sm font-bold tabular-nums">{quantity}</span>
                <button
                  type="button"
                  aria-label="Increase quantity"
                  disabled={quantity >= product.stock}
                  onClick={() => setQuantity((value) => Math.min(product.stock, value + 1))}
                  className="flex h-12 w-11 items-center justify-center text-slate-600 transition hover:text-indigo-600 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Plus size={17} />
                </button>
              </div>

              <button
                type="button"
                onClick={handleAddToCart}
                disabled={product.stock < 1 || addingToCart}
                className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-5 text-sm font-bold text-white shadow-lg shadow-indigo-200 transition hover:-translate-y-0.5 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
              >
                <ShoppingCart size={18} />
                {addingToCart ? "Adding..." : "Add to Cart"}
              </button>

              <button
                type="button"
                onClick={handleAddToWishlist}
                disabled={addingToWishlist || isWishlisted}
                aria-label="Add to wishlist"
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border transition ${
                  isWishlisted
                    ? "border-rose-200 bg-rose-50 text-rose-500"
                    : "border-slate-200 bg-white text-slate-600 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-500"
                }`}
              >
                <Heart size={20} fill={isWishlisted ? "currentColor" : "none"} />
              </button>
            </div>

            <div className="mt-7 grid gap-3 border-t border-slate-100 pt-6 sm:grid-cols-2">
              <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-3">
                <Truck className="shrink-0 text-indigo-600" size={21} />
                <div>
                  <p className="text-xs font-bold text-slate-800">Convenient Delivery</p>
                  <p className="mt-0.5 text-[11px] text-slate-500">Delivered to your doorstep</p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-3">
                <ShieldCheck className="shrink-0 text-emerald-600" size={21} />
                <div>
                  <p className="text-xs font-bold text-slate-800">Cash on Delivery</p>
                  <p className="mt-0.5 text-[11px] text-slate-500">Pay when your order arrives</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {relatedProducts.length > 0 && (
          <section className="mt-14">
            <div className="mb-6 flex items-end justify-between gap-4">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-indigo-600">
                  You may also like
                </p>
                <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950">
                  Related Products
                </h2>
              </div>
              <Link href="/" className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 transition hover:text-indigo-800">
                Shop more <ArrowRight size={15} />
              </Link>
            </div>

            <div className="grid grid-cols-1 gap-4 min-[420px]:grid-cols-2 lg:grid-cols-4">
              {relatedProducts.slice(0, 4).map((item) => (
                <Link
                  key={item.id}
                  href={`/products/${item.id}`}
                  className="group overflow-hidden rounded-2xl border border-white bg-white shadow-[0_10px_35px_-20px_rgba(15,23,42,0.3)] ring-1 ring-slate-200/70 transition duration-300 hover:-translate-y-1.5 hover:ring-indigo-200 hover:shadow-xl hover:shadow-indigo-900/10"
                >
                  <div className="relative flex aspect-[4/3] items-center justify-center overflow-hidden bg-gradient-to-br from-indigo-50 to-violet-100">
                    {item.imageUrl ? (
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        loading="lazy"
                        className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <Package size={42} className="text-indigo-300" />
                    )}
                  </div>
                  <div className="p-4">
                    <h3 className="line-clamp-1 text-sm font-bold text-slate-900">{item.name}</h3>
                    <p className="mt-2 text-sm font-black text-indigo-600">
                      {formatPrice(getDiscountedPrice(item.price, item.discountPercent))}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}

export default function ProductDetailsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[65vh] items-center justify-center bg-slate-50">
          <p className="text-sm font-medium text-slate-500">Loading product details...</p>
        </div>
      }
    >
      <ProductDetailsContent />
    </Suspense>
  );
}
