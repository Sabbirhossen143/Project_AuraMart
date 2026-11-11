
"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  Clock,
  MapPin,
  Package,
  PackageCheck,
  Truck,
  XCircle,
  RefreshCw,
} from "lucide-react";
import { useToast } from "@/components/ui/toast";

interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
  subtotal: number;
}

interface ShippingAddress {
  fullName: string;
  phone: string;
  address: string;
  city: string;
  postalCode: string;
  country: string;
}

interface Order {
  id: string;
  items: OrderItem[];
  totalItems: number;
  totalAmount: number;
  shippingAddress: ShippingAddress;
  paymentMethod: string;
  paymentStatus: string;
  orderStatus: string;
  createdAt: string;
  updatedAt: string;
}

const formatPrice = (amount: number) =>
  new Intl.NumberFormat("en-BD", {
    style: "currency",
    currency: "BDT",
    maximumFractionDigits: 0,
  }).format(amount);

const formatDate = (date: string) =>
  new Date(date).toLocaleString("en-BD", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

const statusSteps = [
  { status: "PENDING", label: "Order Placed", icon: Clock },
  { status: "CONFIRMED", label: "Confirmed", icon: CheckCircle2 },
  { status: "PROCESSING", label: "Processing", icon: Package },
  { status: "SHIPPED", label: "Shipped", icon: Truck },
  { status: "DELIVERED", label: "Delivered", icon: PackageCheck },
];

function OrderDetailsContent() {
  const params = useParams<{ id: string }>();
  const orderId = params.id;
  const { toast } = useToast();

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  
const loadOrder = useCallback(async (silent = false, notifySuccess = false) => {
  try {
    if (!silent) {
      setLoading(true);
      setError("");
    }

    const response = await fetch(`/api/orders/${orderId}`, {
      cache: "no-store",
    });

    const result = await response.json();

    if (response.status === 401) {
      window.location.href = "/login";
      return;
    }

    if (!response.ok) {
      throw new Error(result.message || "Unable to load order details.");
    }

    setOrder(result.data);
    setError("");
    if (notifySuccess) {
      toast.success("Order details loaded successfully.");
    }
  } catch (err) {
    if (!silent) {
      const message =
        err instanceof Error ? err.message : "Something went wrong.";
      setError(message);
      toast.error(message);
    }
  } finally {
    if (!silent) {
      setLoading(false);
    }
  }
}, [orderId, toast]);


useEffect(() => {
  if (!orderId) return;

  void loadOrder();

  const interval = window.setInterval(() => {
    void loadOrder(true);
  }, 15000);

  return () => window.clearInterval(interval);
}, [orderId, loadOrder]);


  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-indigo-50/50 px-4 py-16">
        <div className="mx-auto max-w-5xl animate-pulse space-y-5">
          <div className="h-10 w-60 rounded-lg bg-slate-200" />
          <div className="h-40 rounded-2xl bg-white" />
          <div className="h-72 rounded-2xl bg-white" />
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="flex min-h-[65vh] items-center justify-center bg-slate-50 px-4">
        <div className="w-full max-w-md rounded-3xl border border-white/70 bg-white p-8 text-center shadow-xl shadow-slate-200/60 ring-1 ring-slate-100">
          <XCircle className="mx-auto text-red-500" size={48} />
          <h2 className="mt-4 text-xl font-bold text-slate-900">
            Order Not Found
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            {error || "We couldn't find this order."}
          </p>
          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => void loadOrder(false, true)}
              className="premium-button inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold !text-white shadow-lg shadow-indigo-200 transition hover:bg-indigo-700"
            >
              <RefreshCw size={16} />
              Try Again
            </button>
            <Link
              href="/account/orders"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-700 transition hover:border-indigo-300 hover:bg-indigo-50"
            >
              <ArrowLeft size={17} />
              Back to My Orders
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const isCancelled = order.orderStatus === "CANCELLED";
  const currentStep = statusSteps.findIndex(
    (step) => step.status === order.orderStatus
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-indigo-50/40">
      <section className="bg-gradient-to-r from-indigo-600 via-indigo-700 to-violet-700 px-4 py-10 text-white sm:py-14">
        <div className="mx-auto max-w-6xl">
          <Link
            href="/account/orders"
            className="mb-6 inline-flex items-center gap-2 text-sm text-indigo-100 transition hover:text-white"
          >
            <ArrowLeft size={17} />
            Back to My Orders
          </Link>

          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm text-indigo-100">Order Details</p>
              <h1 className="mt-2 break-all text-2xl font-bold sm:text-3xl">
                #{order.id}
              </h1>
              <p className="mt-2 text-sm text-indigo-100">
                Placed on {formatDate(order.createdAt)}
              </p>
            </div>

            <span
              className={`rounded-full px-4 py-2 text-sm font-bold ${
                isCancelled
                  ? "bg-red-100 text-red-700"
                  : "bg-white text-indigo-700"
              }`}
            >
              {order.orderStatus}
            </span>
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-6xl space-y-6 px-4 py-10 sm:py-12">
        {/* Order Tracking */}
        <section className="rounded-3xl border border-white/80 bg-white p-5 shadow-lg shadow-slate-200/40 ring-1 ring-slate-100 sm:p-7">
          <h2 className="text-lg font-bold text-slate-900">
            Order Tracking
          </h2>

          {isCancelled ? (
            <div className="mt-6 flex items-center gap-4 rounded-xl bg-red-50 p-5">
              <XCircle className="shrink-0 text-red-500" size={32} />
              <div>
                <p className="font-bold text-red-700">Order Cancelled</p>
                <p className="mt-1 text-sm text-red-600">
                  This order has been cancelled.
                </p>
              </div>
            </div>
          ) : (
            <div className="mt-8 grid grid-cols-2 gap-y-7 sm:grid-cols-5">
              {statusSteps.map((step, index) => {
                const completed = currentStep >= index;
                const active = currentStep === index;
                const StepIcon = step.icon;

                return (
                  <div
                    key={step.status}
                    className="relative flex flex-col items-center text-center"
                  >
                    {index !== 0 && (
                      <div
                        className={`absolute right-1/2 top-5 hidden h-0.5 w-full sm:block ${
                          completed ? "bg-indigo-600" : "bg-slate-200"
                        }`}
                      />
                    )}

                    <div
                      className={`relative z-10 flex h-11 w-11 items-center justify-center rounded-full border-2 ${
                        completed
                          ? "border-indigo-600 bg-indigo-600 text-white"
                          : "border-slate-200 bg-white text-slate-400"
                      } ${active ? "ring-4 ring-indigo-100" : ""}`}
                    >
                      {completed && index < currentStep ? (
                        <Check size={20} />
                      ) : (
                        <StepIcon size={20} />
                      )}
                    </div>

                    <p
                      className={`mt-3 text-xs font-semibold sm:text-sm ${
                        completed ? "text-indigo-700" : "text-slate-400"
                      }`}
                    >
                      {step.label}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Products */}
          <section className="space-y-6 lg:col-span-2">
            <div className="rounded-3xl border border-white/80 bg-white p-5 shadow-lg shadow-slate-200/40 ring-1 ring-slate-100 sm:p-7">
              <h2 className="mb-5 text-lg font-bold text-slate-900">
                Ordered Products ({order.items.length})
              </h2>

              <div className="divide-y divide-slate-100">
                {order.items.map((item) => (
                  <div
                    key={item.productId}
                    className="flex flex-wrap items-center justify-between gap-4 py-5 first:pt-0 last:pb-0"
                  >
                    <div className="flex min-w-0 items-center gap-4">
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                        <Package size={25} />
                      </div>

                      <div className="min-w-0">
                        <h3 className="break-words font-semibold text-slate-900">
                          {item.productName}
                        </h3>
                        <p className="mt-1 text-sm text-slate-500">
                          {formatPrice(item.price)} × {item.quantity}
                        </p>
                      </div>
                    </div>

                    <p className="font-bold text-slate-900">
                      {formatPrice(item.subtotal)}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Shipping Address */}
            <div className="rounded-3xl border border-white/80 bg-white p-5 shadow-lg shadow-slate-200/40 ring-1 ring-slate-100 sm:p-7">
              <div className="mb-5 flex items-center gap-3">
                <div className="rounded-xl bg-indigo-50 p-2.5 text-indigo-600">
                  <MapPin size={21} />
                </div>
                <h2 className="text-lg font-bold text-slate-900">
                  Shipping Address
                </h2>
              </div>

              <div className="space-y-2 text-sm text-slate-600">
                <p className="font-bold text-slate-900">
                  {order.shippingAddress.fullName}
                </p>
                <p>{order.shippingAddress.phone}</p>
                <p>{order.shippingAddress.address}</p>
                <p>
                  {order.shippingAddress.city},{" "}
                  {order.shippingAddress.postalCode}
                </p>
                <p>{order.shippingAddress.country}</p>
              </div>
            </div>
          </section>

          {/* Summary */}
          <aside className="h-fit rounded-3xl border border-white/80 bg-white p-5 shadow-lg shadow-slate-200/40 ring-1 ring-slate-100 sm:p-7">
            <h2 className="text-lg font-bold text-slate-900">
              Order Summary
            </h2>

            <div className="mt-6 space-y-4 text-sm">
              <div className="flex justify-between gap-3 text-slate-500">
                <span>Total Items</span>
                <span className="font-semibold text-slate-800">
                  {order.totalItems}
                </span>
              </div>

              <div className="flex justify-between gap-3 text-slate-500">
                <span>Payment Method</span>
                <span className="font-semibold text-slate-800">
                  {order.paymentMethod}
                </span>
              </div>

              <div className="flex justify-between gap-3 text-slate-500">
                <span>Payment Status</span>
                <span className="font-semibold text-slate-800">
                  {order.paymentStatus}
                </span>
              </div>

              <div className="border-t border-dashed border-slate-200 pt-4">
                <div className="flex justify-between gap-3">
                  <span className="font-semibold text-slate-700">
                    Total Amount
                  </span>
                  <span className="text-xl font-bold text-indigo-600">
                    {formatPrice(order.totalAmount)}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-6 rounded-xl bg-indigo-50 p-4">
              <div className="flex items-center gap-2 text-indigo-700">
                <CheckCircle2 size={18} />
                <span className="text-sm font-bold">
                  Cash on Delivery
                </span>
              </div>
              <p className="mt-2 text-xs leading-5 text-indigo-600">
                Pay for your order when it is delivered to your address.
              </p>
            </div>

            <Link
              href="/account/orders"
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-indigo-300 hover:text-indigo-600"
            >
              <ArrowLeft size={16} />
              Back to My Orders
            </Link>
          </aside>
        </div>
      </main>
    </div>
  );
}

export default function OrderDetailsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[65vh] items-center justify-center bg-slate-50">
          <p className="text-sm font-medium text-slate-500">
            Loading order details...
          </p>
        </div>
      }
    >
      <OrderDetailsContent />
    </Suspense>
  );
}
