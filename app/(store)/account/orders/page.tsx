
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Box,
  CalendarDays,
  ChevronRight,
  Package,
  ShoppingBag,
  ChevronDown,
  Check,
  SlidersHorizontal,
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

interface Order {
  id: string;
  items: OrderItem[];
  totalItems: number;
  totalAmount: number;
  orderStatus: string;
  paymentStatus: string;
  paymentMethod: string;
  createdAt: string;
}

const formatPrice = (amount: number) =>
  new Intl.NumberFormat("en-BD", {
    style: "currency",
    currency: "BDT",
    maximumFractionDigits: 0,
  }).format(amount);

const formatDate = (date: string) =>
  new Date(date).toLocaleDateString("en-BD", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

const statusStyles: Record<string, string> = {
  PENDING: "bg-amber-50 text-amber-700 border-amber-200",
  CONFIRMED: "bg-blue-50 text-blue-700 border-blue-200",
  PROCESSING: "bg-indigo-50 text-indigo-700 border-indigo-200",
  SHIPPED: "bg-purple-50 text-purple-700 border-purple-200",
  DELIVERED: "bg-green-50 text-green-700 border-green-200",
  CANCELLED: "bg-red-50 text-red-700 border-red-200",
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("ALL");
  const [filterOpen, setFilterOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const filteredOrders = useMemo(
    () =>
      selectedStatus === "ALL"
        ? orders
        : orders.filter((order) => order.orderStatus === selectedStatus),
    [orders, selectedStatus]
  );

  const loadOrders = useCallback(async (notifySuccess = false) => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch("/api/orders");
      const result = await response.json();

      if (response.status === 401) {
        window.location.href = "/login";
        return;
      }

      if (!response.ok) {
        throw new Error(result.message || "Failed to load orders.");
      }

      const orderList = Array.isArray(result.data)
        ? result.data
        : result.data?.orders ?? result.orders ?? [];

      setOrders(orderList);
      if (notifySuccess) {
        toast.success("Your orders are up to date.");
      }
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
    loadOrders();
  }, [loadOrders]);

  // Close the custom status menu when clicking outside or pressing Escape.
  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (
        filterRef.current &&
        !filterRef.current.contains(event.target as Node)
      ) {
        setFilterOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setFilterOpen(false);
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const statusOptions = [
    { value: "ALL", label: "All Orders", dot: "bg-indigo-500" },
    { value: "PENDING", label: "Pending", dot: "bg-amber-500" },
    { value: "CONFIRMED", label: "Confirmed", dot: "bg-blue-500" },
    { value: "PROCESSING", label: "Processing", dot: "bg-indigo-500" },
    { value: "SHIPPED", label: "Shipped", dot: "bg-violet-500" },
    { value: "DELIVERED", label: "Delivered", dot: "bg-emerald-500" },
    { value: "CANCELLED", label: "Cancelled", dot: "bg-rose-500" },
  ];

  const selectedStatusLabel =
    statusOptions.find((option) => option.value === selectedStatus)?.label ??
    "All Orders";

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-indigo-50/40">
      <section className="bg-gradient-to-r from-indigo-600 via-indigo-700 to-violet-700 px-4 py-12 text-white sm:py-16">
        <div className="mx-auto max-w-6xl">
          <div className="mb-3 flex items-center gap-2 text-sm text-indigo-100">
            <Link href="/" className="hover:text-white">
              Home
            </Link>
            <ChevronRight size={15} />
            <span>My Orders</span>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15">
              <Package size={30} />
            </div>
            <div>
              <h1 className="text-3xl font-bold sm:text-4xl">
                My Orders
              </h1>
              <p className="mt-1 text-sm text-indigo-100 sm:text-base">
                Track and manage all your purchases.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-10 sm:py-14">
        <div className="mb-7 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              Order History
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Showing {filteredOrders.length} of {orders.length} {orders.length === 1 ? "order" : "orders"}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative" ref={filterRef}>
              <span className="sr-only" id="order-status-filter-label">
                Filter orders by status
              </span>

              <button
                type="button"
                aria-haspopup="listbox"
                aria-expanded={filterOpen}
                aria-labelledby="order-status-filter-label"
                onClick={() => setFilterOpen((open) => !open)}
                className={`group inline-flex h-12 min-w-[190px] items-center justify-between gap-4 rounded-2xl border bg-white px-4 text-left shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-lg hover:shadow-indigo-100/70 focus:outline-none focus:ring-4 focus:ring-indigo-100 ${
                  filterOpen
                    ? "border-indigo-400 ring-4 ring-indigo-100"
                    : "border-slate-200"
                }`}
              >
                <span className="flex min-w-0 items-center gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-md shadow-indigo-200">
                    <SlidersHorizontal size={15} />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
                      Filter by
                    </span>
                    <span className="mt-0.5 block truncate text-sm font-extrabold text-slate-800">
                      {selectedStatusLabel}
                    </span>
                  </span>
                </span>
                <ChevronDown
                  size={17}
                  className={`shrink-0 text-slate-400 transition-transform duration-200 group-hover:text-indigo-600 ${
                    filterOpen ? "rotate-180 text-indigo-600" : ""
                  }`}
                />
              </button>

              {filterOpen && (
                <div
                  role="listbox"
                  aria-label="Order status"
                  className="absolute right-0 z-30 mt-3 w-[min(280px,calc(100vw-2rem))] origin-top-right overflow-hidden rounded-2xl border border-slate-100 bg-white p-2 shadow-2xl shadow-slate-900/15 ring-1 ring-black/5 animate-in fade-in zoom-in-95 duration-150"
                >
                  <div className="flex items-center justify-between px-3 pb-2 pt-2">
                    <div>
                      <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-indigo-500">
                        Order Status
                      </p>
                      <p className="mt-1 text-xs font-medium text-slate-400">
                        Choose an order status
                      </p>
                    </div>
                    <span className="rounded-lg bg-indigo-50 px-2 py-1 text-[10px] font-bold text-indigo-600">
                      {orders.length} total
                    </span>
                  </div>

                  <div className="my-1 h-px bg-slate-100" />

                  <div className="space-y-1">
                    {statusOptions.map((option) => {
                      const count =
                        option.value === "ALL"
                          ? orders.length
                          : orders.filter(
                              (order) => order.orderStatus === option.value
                            ).length;
                      const active = selectedStatus === option.value;

                      return (
                        <button
                          key={option.value}
                          type="button"
                          role="option"
                          aria-selected={active}
                          onClick={() => {
                            setSelectedStatus(option.value);
                            setFilterOpen(false);
                          }}
                          className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left transition-all duration-150 ${
                            active
                              ? "bg-gradient-to-r from-indigo-50 to-violet-50 text-indigo-700 shadow-sm"
                              : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                          }`}
                        >
                          <span className="flex items-center gap-3">
                            <span
                              className={`h-2.5 w-2.5 rounded-full ${option.dot} ${
                                active ? "ring-4 ring-indigo-100" : ""
                              }`}
                            />
                            <span className="text-sm font-bold">
                              {option.label}
                            </span>
                          </span>
                          <span className="flex items-center gap-2">
                            <span
                              className={`min-w-7 rounded-lg px-2 py-1 text-center text-[10px] font-extrabold tabular-nums ${
                                active
                                  ? "bg-white text-indigo-700"
                                  : "bg-slate-100 text-slate-500"
                              }`}
                            >
                              {count}
                            </span>
                            {active && (
                              <Check size={15} className="text-indigo-600" />
                            )}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-600"
            >
            <ShoppingBag size={17} />
              Continue Shopping
            </Link>
          </div>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((item) => (
              <div
                key={item}
                className="h-44 animate-pulse rounded-2xl border border-slate-200 bg-white"
              />
            ))}
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-200 bg-white px-6 py-12 text-center">
            <p className="font-medium text-red-600">{error}</p>
            <button
              onClick={() => void loadOrders(true)}
              className="premium-button mt-4 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold !text-white shadow-lg shadow-indigo-200 transition hover:bg-indigo-700"
            >
              <RefreshCw size={15} />
              Try Again
            </button>
          </div>
        ) : orders.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white px-6 py-16 text-center">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
              <ShoppingBag size={36} />
            </div>

            <h3 className="mt-6 text-xl font-bold text-slate-900">
              No Orders Yet
            </h3>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500">
              You haven&apos;t placed any orders yet. Explore our collection
              and find something you love.
            </p>

            <Link
              href="/"
              className="premium-button mt-6 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 font-semibold text-white shadow-lg shadow-indigo-600/20 hover:bg-indigo-700"
            >
              Start Shopping
              <ArrowRight size={18} />
            </Link>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="rounded-3xl border border-white bg-white px-6 py-14 text-center shadow-lg shadow-slate-200/40 ring-1 ring-slate-100">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
              <Package size={30} />
            </div>
            <h3 className="mt-5 text-lg font-extrabold text-slate-900">
              No {selectedStatus === "ALL" ? "" : selectedStatus.toLowerCase() + " "}orders found
            </h3>
            <p className="mt-2 text-sm text-slate-500">
              Try selecting a different order status.
            </p>
            <button
              type="button"
              onClick={() => setSelectedStatus("ALL")}
              className="mt-5 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-indigo-200 transition hover:bg-indigo-700"
            >
              Show All Orders
            </button>
          </div>
        ) : (
          <div className="space-y-5">
            {filteredOrders.map((order) => (
              <article
                key={order.id}
                className="premium-card overflow-hidden rounded-3xl border border-white bg-white shadow-lg shadow-slate-200/40 ring-1 ring-slate-100 transition duration-300 hover:-translate-y-0.5 hover:shadow-xl"
              >
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 px-5 py-4 sm:px-6">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
                      Order ID
                    </p>
                    <p className="mt-1 break-all font-semibold text-slate-900">
                      #{order.id}
                    </p>
                  </div>

                  <span
                    className={`rounded-full border px-3 py-1.5 text-xs font-bold ${
                      statusStyles[order.orderStatus] ||
                      "border-slate-200 bg-slate-50 text-slate-600"
                    }`}
                  >
                    {order.orderStatus}
                  </span>
                </div>

                <div className="grid gap-5 px-5 py-5 sm:grid-cols-3 sm:px-6">
                  <div>
                    <div className="flex items-center gap-2 text-slate-400">
                      <CalendarDays size={16} />
                      <span className="text-xs font-medium uppercase tracking-wide">
                        Order Date
                      </span>
                    </div>
                    <p className="mt-2 font-semibold text-slate-800">
                      {formatDate(order.createdAt)}
                    </p>
                  </div>

                  <div>
                    <div className="flex items-center gap-2 text-slate-400">
                      <Box size={16} />
                      <span className="text-xs font-medium uppercase tracking-wide">
                        Items
                      </span>
                    </div>
                    <p className="mt-2 font-semibold text-slate-800">
                      {order.totalItems}{" "}
                      {order.totalItems === 1 ? "item" : "items"}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                      Total Amount
                    </p>
                    <p className="mt-2 text-lg font-bold text-indigo-600">
                      {formatPrice(order.totalAmount)}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/70 px-5 py-4 sm:px-6">
                  <div>
                    <p className="text-xs text-slate-400">Payment</p>
                    <p className="mt-1 text-sm font-semibold text-slate-700">
                      {order.paymentMethod} · {order.paymentStatus}
                    </p>
                  </div>

                  <Link
                    href={`/account/orders/${order.id}`}
                    className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700"
                  >
                    View Details
                    <ArrowRight size={16} />
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
