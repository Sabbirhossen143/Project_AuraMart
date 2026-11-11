"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/toast";
import {
  ArrowLeft,
  ArrowRight,
  MapPin,
  Phone,
  UserRound,
  Mail,
  ShieldCheck,
  Truck,
  CheckCircle2,
  CreditCard,
  Package,
  LoaderCircle,
} from "lucide-react";

interface CartProduct {
  id: string;
  name: string;
  price: number;
  stock: number;
}

interface CartItem {
  productId: string;
  quantity: number;
  product: CartProduct;
  subtotal: number;
}

interface CartSummary {
  items: CartItem[];
  totalItems: number;
  totalPrice: number;
}

interface ShippingAddress {
  fullName: string;
  phone: string;
  address: string;
  city: string;
  postalCode: string;
  country: string;
}

const formatPrice = (price: number) =>
  new Intl.NumberFormat("en-BD", {
    style: "currency",
    currency: "BDT",
    maximumFractionDigits: 0,
  }).format(price);

export default function CheckoutPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [cart, setCart] = useState<CartSummary>({
    items: [],
    totalItems: 0,
    totalPrice: 0,
  });

  const [form, setForm] = useState<ShippingAddress>({
    fullName: "",
    phone: "",
    address: "",
    city: "",
    postalCode: "",
    country: "Bangladesh",
  });

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [orderId, setOrderId] = useState("");

  useEffect(() => {
    async function loadCheckout() {
      try {
        const response = await fetch("/api/cart", {
          cache: "no-store",
        });

        const result = await response.json();

        if (response.status === 401) {
          router.replace(
            `/login?callbackUrl=${encodeURIComponent("/checkout")}`
          );
          return;
        }

        if (!response.ok) {
          throw new Error(result.message || "Unable to load your cart.");
        }

        const cartData = result.data;

        if (!cartData?.items?.length) {
          router.replace("/cart");
          return;
        }

        setCart(cartData);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Something went wrong.";
        setError(message);
        toast.error(message);
      } finally {
        setLoading(false);
      }
    }

    loadCheckout();
  }, [router, toast]);

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) {
    const { name, value } = e.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    if (form.fullName.trim().length < 2) {
      setError("Please enter your full name.");
      toast.error("Please enter your full name.");
      return;
    }

    if (form.phone.trim().length < 7) {
      setError("Please enter a valid phone number.");
      toast.error("Please enter a valid phone number.");
      return;
    }

    if (form.address.trim().length < 5) {
      setError("Please enter your complete delivery address.");
      toast.error("Please enter your complete delivery address.");
      return;
    }

    if (!form.city.trim()) {
      setError("Please enter your city.");
      toast.error("Please enter your city.");
      return;
    }

    if (!form.postalCode.trim()) {
      setError("Please enter your postal code.");
      toast.error("Please enter your postal code.");
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          shippingAddress: {
            fullName: form.fullName.trim(),
            phone: form.phone.trim(),
            address: form.address.trim(),
            city: form.city.trim(),
            postalCode: form.postalCode.trim(),
            country: form.country.trim(),
          },
          paymentMethod: "COD",
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        const message = result.message || "Unable to place your order.";
        setError(message);
        toast.error(message);
        return;
      }

      const createdOrder = result.data?.order || result.data;

      setOrderId(createdOrder?.id || "");
      setOrderSuccess(true);
      toast.success("Your order has been placed successfully!");
    } catch {
      setError("Something went wrong. Please try again.");
      toast.error("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <section className="flex min-h-[70vh] items-center justify-center bg-gradient-to-br from-slate-50 via-indigo-50/40 to-white">
        <div className="text-center">
          <LoaderCircle className="mx-auto animate-spin text-indigo-600" size={35} />
          <p className="mt-4 text-sm font-semibold text-slate-500">
            Preparing your checkout...
          </p>
        </div>
      </section>
    );
  }

  if (orderSuccess) {
    return (
      <section className="flex min-h-[75vh] items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-indigo-50/60 px-4 py-16">
        <div className="w-full max-w-lg rounded-3xl border border-white/80 bg-white/90 px-6 py-12 text-center shadow-2xl shadow-emerald-100/70 ring-1 ring-slate-100 backdrop-blur sm:px-10">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
            <CheckCircle2 size={45} />
          </div>

          <p className="mt-7 text-xs font-extrabold uppercase tracking-[0.2em] text-emerald-600">
            Order Confirmed
          </p>

          <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950">
            Thank you for your order!
          </h1>

          <p className="mt-3 text-sm leading-7 text-slate-500">
            Your order has been placed successfully. You can view your order
            details from your account.
          </p>

          {orderId && (
            <div className="mt-6 rounded-xl bg-slate-50 p-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Order ID
              </p>
              <p className="mt-2 break-all text-sm font-bold text-slate-800">
                {orderId}
              </p>
            </div>
          )}

          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/account/orders"
              className="premium-button flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 text-sm font-bold !text-white shadow-lg shadow-indigo-200 transition hover:bg-indigo-700"
            >
              View My Orders <ArrowRight size={16} />
            </Link>

            <Link
              href="/"
              className="flex h-12 flex-1 items-center justify-center rounded-xl border border-slate-200 px-5 text-sm font-bold text-slate-700 transition hover:border-indigo-300 hover:bg-indigo-50"
            >
              Continue Shopping
            </Link>
          </div>
        </div>
      </section>
    );
  }

  if (error && cart.items.length === 0) {
    return (
      <section className="flex min-h-[70vh] items-center justify-center bg-gradient-to-br from-rose-50 via-white to-slate-50 px-4 py-16">
        <div className="max-w-md rounded-3xl border border-white bg-white/90 p-8 text-center shadow-2xl shadow-rose-100/60 ring-1 ring-slate-100">
          <Package size={38} className="mx-auto text-rose-500" />
          <h2 className="mt-4 text-xl font-black text-slate-900">
            Checkout unavailable
          </h2>
          <p className="mt-2 text-sm text-slate-500">{error}</p>
          <Link
            href="/cart"
            className="premium-button mt-6 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 text-sm font-bold !text-white shadow-lg shadow-indigo-200 transition hover:bg-indigo-700"
          >
            Back to Cart <ArrowRight size={16} />
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/30 to-white px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
      <div className="mx-auto max-w-7xl">
        {/* HEADER */}
        <div className="mb-8">
          <div className="mb-3 inline-flex items-center gap-2 text-xs font-bold text-indigo-600">
            <ShieldCheck size={15} />
            SECURE CHECKOUT
          </div>

          <h1 className="text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
            Complete Your Order
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Enter your delivery details and confirm your order.
          </p>

          <div className="mt-5 flex items-center gap-2 text-xs text-slate-400">
            <Link href="/" className="hover:text-indigo-600">
              Home
            </Link>
            <span>/</span>
            <Link href="/cart" className="hover:text-indigo-600">
              Cart
            </Link>
            <span>/</span>
            <span className="font-semibold text-slate-700">Checkout</span>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="grid items-start gap-7 lg:grid-cols-[1fr_390px]">
            {/* SHIPPING FORM */}
            <div className="space-y-6">
              <div className="rounded-2xl border border-white bg-white/90 p-5 shadow-xl shadow-slate-200/40 ring-1 ring-slate-100/80 backdrop-blur transition-shadow hover:shadow-2xl hover:shadow-indigo-100/50 sm:p-7">
                <div className="mb-7 flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                    <MapPin size={21} />
                  </div>

                  <div>
                    <h2 className="text-base font-black text-slate-900">
                      Delivery Information
                    </h2>
                    <p className="mt-1 text-xs text-slate-500">
                      Where should we deliver your order?
                    </p>
                  </div>
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                  {/* FULL NAME */}
                  <div className="sm:col-span-2">
                    <label
                      htmlFor="fullName"
                      className="mb-2 block text-xs font-bold text-slate-700"
                    >
                      Full Name *
                    </label>

                    <div className="relative">
                      <UserRound
                        size={17}
                        className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                      />

                      <input
                        id="fullName"
                        name="fullName"
                        value={form.fullName}
                        onChange={handleChange}
                        placeholder="Enter your full name"
                        autoComplete="name"
                        required
                        minLength={2}
                        className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50/80 pl-11 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-100/70"
                      />
                    </div>
                  </div>

                  {/* PHONE */}
                  <div>
                    <label
                      htmlFor="phone"
                      className="mb-2 block text-xs font-bold text-slate-700"
                    >
                      Phone Number *
                    </label>

                    <div className="relative">
                      <Phone
                        size={17}
                        className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                      />

                      <input
                        id="phone"
                        name="phone"
                        type="tel"
                        value={form.phone}
                        onChange={handleChange}
                        placeholder="01XXXXXXXXX"
                        autoComplete="tel"
                        required
                        className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50/80 pl-11 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-100/70"
                      />
                    </div>
                  </div>

                  {/* COUNTRY */}
                  <div>
                    <label
                      htmlFor="country"
                      className="mb-2 block text-xs font-bold text-slate-700"
                    >
                      Country *
                    </label>

                    <input
                      id="country"
                      name="country"
                      value={form.country}
                      onChange={handleChange}
                      required
                      autoComplete="country-name"
                      className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50/80 px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-100/70"
                    />
                  </div>

                  {/* ADDRESS */}
                  <div className="sm:col-span-2">
                    <label
                      htmlFor="address"
                      className="mb-2 block text-xs font-bold text-slate-700"
                    >
                      Full Address *
                    </label>

                    <textarea
                      id="address"
                      name="address"
                      value={form.address}
                      onChange={handleChange}
                      placeholder="House, road, area and other delivery details"
                      required
                      minLength={5}
                      rows={3}
                      autoComplete="street-address"
                      className="w-full resize-y rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-100/70"
                    />
                  </div>

                  {/* CITY */}
                  <div>
                    <label
                      htmlFor="city"
                      className="mb-2 block text-xs font-bold text-slate-700"
                    >
                      City *
                    </label>

                    <input
                      id="city"
                      name="city"
                      value={form.city}
                      onChange={handleChange}
                      placeholder="e.g. Chattogram"
                      required
                      autoComplete="address-level2"
                      className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50/80 px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-100/70"
                    />
                  </div>

                  {/* POSTAL CODE */}
                  <div>
                    <label
                      htmlFor="postalCode"
                      className="mb-2 block text-xs font-bold text-slate-700"
                    >
                      Postal Code *
                    </label>

                    <input
                      id="postalCode"
                      name="postalCode"
                      value={form.postalCode}
                      onChange={handleChange}
                      placeholder="e.g. 4000"
                      required
                      autoComplete="postal-code"
                      className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50/80 px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-100/70"
                    />
                  </div>
                </div>
              </div>

              {/* PAYMENT METHOD */}
              <div className="rounded-2xl border border-white bg-white/90 p-5 shadow-xl shadow-slate-200/40 ring-1 ring-slate-100/80 backdrop-blur transition-shadow hover:shadow-2xl hover:shadow-indigo-100/50 sm:p-7">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                    <CreditCard size={21} />
                  </div>

                  <div>
                    <h2 className="text-base font-black text-slate-900">
                      Payment Method
                    </h2>
                    <p className="mt-1 text-xs text-slate-500">
                      Choose how you want to pay.
                    </p>
                  </div>
                </div>

                <div className="mt-6 flex items-center gap-4 rounded-xl border-2 border-indigo-500 bg-gradient-to-r from-indigo-50 to-violet-50/70 p-4 shadow-sm shadow-indigo-100">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-indigo-600 shadow-sm">
                    <Truck size={22} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-extrabold text-slate-900">
                      Cash on Delivery
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Pay when your order arrives.
                    </p>
                  </div>

                  <CheckCircle2 size={21} className="shrink-0 text-indigo-600" />
                </div>

                <p className="mt-4 text-[11px] leading-5 text-slate-400">
                  Cash on Delivery is currently the available payment method.
                </p>
              </div>
            </div>

            {/* ORDER SUMMARY */}
            <aside className="lg:sticky lg:top-28">
              <div className="overflow-hidden rounded-2xl border border-white bg-white/95 shadow-xl shadow-slate-200/50 ring-1 ring-slate-100/80 backdrop-blur">
                <div className="border-b border-slate-100 px-5 py-5 sm:px-6">
                  <h2 className="text-base font-black text-slate-900">
                    Your Order
                  </h2>
                  <p className="mt-1 text-xs text-slate-500">
                    {cart.totalItems} items in your shopping bag
                  </p>
                </div>

                <div className="max-h-72 space-y-4 overflow-y-auto px-5 py-5 sm:px-6">
                  {cart.items.map((item) => (
                    <div
                      key={item.productId}
                      className="flex items-start justify-between gap-3"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-2 text-xs font-bold text-slate-800">
                          {item.product.name}
                        </p>

                        <p className="mt-1 text-[10px] text-slate-400">
                          Quantity: {item.quantity}
                        </p>
                      </div>

                      <p className="shrink-0 text-xs font-bold text-slate-800">
                        {formatPrice(item.subtotal)}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="space-y-4 border-t border-slate-100 px-5 py-5 sm:px-6">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">Subtotal</span>
                    <span className="font-bold text-slate-800">
                      {formatPrice(cart.totalPrice)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">Shipping</span>
                    <span className="font-bold text-emerald-600">
                      To be confirmed
                    </span>
                  </div>

                  <div className="border-t border-dashed border-slate-200 pt-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-extrabold text-slate-900">
                        Order Total
                      </span>

                      <span className="text-xl font-black text-indigo-600">
                        {formatPrice(cart.totalPrice)}
                      </span>
                    </div>

                    <p className="mt-2 text-[10px] leading-5 text-slate-400">
                      Delivery charges, if applicable, will be confirmed
                      separately.
                    </p>
                  </div>

                  {error && (
                    <div
                      role="alert"
                      className="rounded-xl border border-rose-100 bg-rose-50 px-3 py-3 text-xs font-medium text-rose-600"
                    >
                      {error}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={submitting || cart.items.length === 0}
                    className="premium-button flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 text-sm font-bold !text-white shadow-lg shadow-indigo-200 transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {submitting ? (
                      <>
                        <LoaderCircle size={18} className="animate-spin" />
                        Placing Order...
                      </>
                    ) : (
                      <>
                        Place Order <ArrowRight size={17} />
                      </>
                    )}
                  </button>

                  <div className="flex items-center justify-center gap-2 text-[10px] font-semibold text-slate-400">
                    <ShieldCheck size={14} />
                    Secure order processing
                  </div>
                </div>
              </div>

              <Link
                href="/cart"
                className="mt-5 flex items-center justify-center gap-2 text-xs font-bold text-slate-500 transition hover:text-indigo-600"
              >
                <ArrowLeft size={14} />
                Return to Cart
              </Link>

              <div className="mt-5 flex items-start gap-3 rounded-2xl border border-white bg-white/90 p-4 shadow-lg shadow-slate-200/30 ring-1 ring-slate-100/80">
                <Mail size={18} className="mt-0.5 shrink-0 text-indigo-500" />
                <p className="text-[10px] leading-5 text-slate-500">
                  Please ensure your phone number and delivery address are
                  correct so your order can reach you successfully.
                </p>
              </div>
            </aside>
          </div>
        </form>
      </div>
    </section>
  );
}