
"use client";

import { useCallback, useEffect, useState } from "react";
import { useToast } from "@/components/ui/toast";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Package,
  RefreshCw,
  Loader2,
  Search,
  Eye,
  MapPin,
  Phone,
  CalendarDays,
  ShoppingBag,
  CheckCircle2,
  X,
  ChevronDown,
} from "lucide-react";

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

type OrderStatus =
  | "PENDING"
  | "CONFIRMED"
  | "PROCESSING"
  | "SHIPPED"
  | "DELIVERED"
  | "CANCELLED";

interface Order {
  id: string;
  userId: string;
  items: OrderItem[];
  totalItems: number;
  totalAmount: number;
  shippingAddress: ShippingAddress;
  paymentMethod: string;
  paymentStatus: string;
  orderStatus: OrderStatus;
  createdAt: string;
  updatedAt: string;
}

const statuses: OrderStatus[] = [
  "PENDING",
  "CONFIRMED",
  "PROCESSING",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
];

const allowedTransitions: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["PROCESSING", "CANCELLED"],
  PROCESSING: ["SHIPPED", "CANCELLED"],
  SHIPPED: ["DELIVERED"],
  DELIVERED: [],
  CANCELLED: [],
};

const statusStyles: Record<OrderStatus, string> = {
  PENDING: "bg-amber-50 text-amber-700 border-amber-200",
  CONFIRMED: "bg-blue-50 text-blue-700 border-blue-200",
  PROCESSING: "bg-indigo-50 text-indigo-700 border-indigo-200",
  SHIPPED: "bg-purple-50 text-purple-700 border-purple-200",
  DELIVERED: "bg-green-50 text-green-700 border-green-200",
  CANCELLED: "bg-red-50 text-red-700 border-red-200",
};

const formatPrice = (amount: number) =>
  new Intl.NumberFormat("en-BD", {
    style: "currency",
    currency: "BDT",
    maximumFractionDigits: 0,
  }).format(amount);

const formatDate = (date: string) =>
  new Date(date).toLocaleString("en-BD", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

export default function AdminOrdersPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [expandedId, setExpandedId] = useState("");
  const [selectedCodOrder, setSelectedCodOrder] =
  useState<Order | null>(null);
  const [openStatusMenu, setOpenStatusMenu] = useState(false);
  const [openOrderMenu, setOpenOrderMenu] = useState("");

  // Close dropdowns when the user clicks/taps outside their trigger and menu.
  useEffect(() => {
    function handleOutsideClick(event: PointerEvent) {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (target.closest("[data-dropdown-root]")) return;
      setOpenStatusMenu(false);
      setOpenOrderMenu("");
    }

    document.addEventListener("pointerdown", handleOutsideClick);
    return () => document.removeEventListener("pointerdown", handleOutsideClick);
  }, []);

  // Close every page dropdown when the user clicks outside its trigger/menu.
  useEffect(() => {
    function handleOutsidePointer(event: PointerEvent) {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (target.closest("[data-dropdown-root]")) return;

      setOpenStatusMenu(false);
      setOpenOrderMenu("");
    }

    document.addEventListener("pointerdown", handleOutsidePointer);
    return () => {
      document.removeEventListener("pointerdown", handleOutsidePointer);
    };
  }, []);

  const loadOrders = useCallback(async () => {
    try {
      setLoading(true);

      const response = await fetch("/api/admin/orders", {
        cache: "no-store",
      });

      const result = await response.json();

      if (response.status === 401) {
        router.replace("/login");
        return;
      }

      if (response.status === 403) {
        router.replace("/");
        return;
      }

      if (!response.ok) {
        throw new Error(result.message || "Unable to load orders.");
      }

      setOrders(Array.isArray(result.data) ? result.data : []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }, [router, toast]);

  useEffect(() => {
    let active = true;

    async function initialize() {
      try {
        const response = await fetch("/api/auth/me", {
          cache: "no-store",
        });

        if (response.status === 401) {
          router.replace("/login");
          return;
        }

        const result = await response.json();
        const user = result.data?.user ?? result.data;

        if (!response.ok || user?.role !== "ADMIN") {
          router.replace("/");
          return;
        }

        if (active) {
          await loadOrders();
        }
      } catch {
        if (active) {
          toast.error("Unable to verify administrator access.");
          setLoading(false);
        }
      }
    }

    initialize();

    return () => {
      active = false;
    };
  }, [router, loadOrders, toast]);

  async function updateStatus(
    orderId: string,
    status: OrderStatus
  ) {
    try {
      setUpdatingId(orderId);

      const response = await fetch(
        `/api/admin/orders/${orderId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ status }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.message || "Unable to update order status."
        );
      }

      toast.success("Order status updated successfully.");
      await loadOrders();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Order update failed.");
    } finally {
      setUpdatingId("");
    }
  }

  async function acceptCodPayment(orderId: string) {
  try {
    setUpdatingId(orderId);

    const response = await fetch(
      `/api/admin/orders/${orderId}/payment`,
      {
        method: "POST",
        cache: "no-store",
      }
    );

    const result = await response.json();

    if (!response.ok) {
      throw new Error(
        result.message || "Unable to accept COD payment."
      );
    }

    toast.success("COD payment accepted successfully.");
    setSelectedCodOrder(null);

    await loadOrders();
  } catch (err) {
    toast.error(err instanceof Error ? err.message : "COD payment acceptance failed.");
  } finally {
    setUpdatingId("");
  }
}

  const filteredOrders = orders.filter((order) => {
    const query = search.toLowerCase();

    const matchesSearch =
      order.id.toLowerCase().includes(query) ||
      order.userId.toLowerCase().includes(query) ||
      order.shippingAddress?.fullName?.toLowerCase().includes(query) ||
      order.shippingAddress?.phone?.includes(query);

    const matchesStatus =
      statusFilter === "ALL" ||
      order.orderStatus === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const totalRevenue = orders
    .filter((order) => order.orderStatus !== "CANCELLED")
    .reduce((total, order) => total + order.totalAmount, 0);

  if (loading && orders.length === 0) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center bg-slate-50">
        <Loader2
          className="animate-spin text-indigo-600"
          size={36}
        />
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-6xl">

        <div className="mb-8">
          <Link
            href="/account"
            className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-indigo-600"
          >
            <ArrowLeft size={17} />
            Back to Account
          </Link>

          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-200">
                <Package size={25} />
              </div>

              <div>
                <h1 className="text-2xl font-black text-slate-900 sm:text-3xl">
                  Orders Management
                </h1>
                <p className="mt-1 text-sm text-slate-500">
                  Manage and track all customer orders.
                </p>
              </div>
            </div>

            <button
              onClick={loadOrders}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:border-indigo-300 hover:text-indigo-600 disabled:opacity-60"
            >
              <RefreshCw
                size={16}
                className={loading ? "animate-spin" : ""}
              />
              Refresh
            </button>
          </div>
        </div>

        {/* Statistics */}
        <section className="mb-7 grid gap-4 grid-cols-2 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              label: "Total Orders",
              value: orders.length,
              color: "text-indigo-600",
            },
            {
              label: "Pending Orders",
              value: orders.filter(
                (o) => o.orderStatus === "PENDING"
              ).length,
              color: "text-amber-600",
            },
            {
              label: "Delivered Orders",
              value: orders.filter(
                (o) => o.orderStatus === "DELIVERED"
              ).length,
              color: "text-green-600",
            },
            {
              label: "Total Revenue",
              value: formatPrice(totalRevenue),
              color: "text-violet-600",
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <p className="text-sm font-medium text-slate-500">
                {stat.label}
              </p>
              <h2 className={`mt-2 text-2xl font-black ${stat.color}`}>
                {stat.value}
              </h2>
            </div>
          ))}
        </section>

        {/* Search and Filter */}
        <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
          <div className="grid gap-3 sm:grid-cols-[1fr_220px]">
            <div className="relative">
              <Search
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search order ID, customer, phone..."
                className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-4 text-sm outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50"
              />
            </div>

            <div className="relative w-full sm:w-60" data-dropdown-root>
  <button
    type="button"
    onClick={() => {
      setOpenOrderMenu("");
      setOpenStatusMenu(!openStatusMenu);
    }}
    className={`flex w-full items-center justify-between rounded-xl border bg-white px-4 py-3 text-sm font-semibold shadow-sm transition-all ${
      openStatusMenu
        ? "border-indigo-400 ring-4 ring-indigo-50"
        : "border-slate-200 hover:border-indigo-300"
    }`}
  >
    <span className="flex items-center gap-2 text-slate-700">
      <span className="h-2 w-2 rounded-full bg-indigo-500" />
      {statusFilter === "ALL"
        ? "All Statuses"
        : statusFilter}
    </span>

    <ChevronDown
  size={17}
  className={`text-slate-400 transition-transform ${
    openStatusMenu ? "rotate-180" : ""
  }`}
/>
  </button>

  {openStatusMenu && (
    <div className="absolute right-0 top-full z-30 mt-2 w-full overflow-hidden rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl shadow-slate-200/60">
      {[
        { label: "All Statuses", value: "ALL" },
        ...statuses.map((status) => ({
          label: status,
          value: status,
        })),
      ].map((item) => (
        <button
          key={item.value}
          type="button"
          onClick={() => {
            setStatusFilter(item.value);
            setOpenStatusMenu(false);
          }}
          className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-xs font-semibold transition ${
            statusFilter === item.value
              ? "bg-indigo-50 text-indigo-700"
              : "text-slate-600 hover:bg-slate-50"
          }`}
        >
          {item.label}

          {statusFilter === item.value && (
            <CheckCircle2 size={15} />
          )}
        </button>
      ))}
    </div>
  )}
</div>
</div>

          <p className="mt-3 text-xs text-slate-500">
            Showing {filteredOrders.length} of {orders.length} orders
          </p>
        </section>

        {/* Orders List */}
        <section className="rounded-2xl border border-slate-200/80 bg-white p-3 shadow-sm sm:p-5 lg:p-7">
          <div className="mb-6">
            <h2 className="text-lg font-bold text-slate-900">
              All Customer Orders
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              View order details and update order progress.
            </p>
          </div>

          {filteredOrders.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 py-14 text-center">
              <ShoppingBag
                className="mx-auto text-slate-300"
                size={40}
              />
              <h3 className="mt-3 font-bold text-slate-700">
                No Orders Found
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                No orders match your current search or filter.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredOrders.map((order) => {
                const nextStatuses =
                  allowedTransitions[order.orderStatus];

                const expanded = expandedId === order.id;

                return (
                 <article
  key={order.id}
  className={`relative rounded-xl border border-slate-200 bg-white transition-shadow ${
    openOrderMenu === order.id
      ? "z-40 shadow-lg"
      : "z-0"
  }`}
>
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-slate-50/80 px-3 py-3 sm:px-5 sm:py-4">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                          Order ID
                        </p>
                        <p className="mt-1 break-all text-sm font-bold text-slate-900">
                          #{order.id}
                        </p>
                      </div>

                      <span
                        className={`rounded-full border px-3 py-1.5 text-xs font-bold ${
                          statusStyles[order.orderStatus]
                        }`}
                      >
                        {order.orderStatus}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-x-3 gap-y-4 p-3 sm:gap-4 sm:p-5 lg:grid-cols-4">
                      <div>
                        <p className="text-xs text-slate-400">
                          Customer
                        </p>
                        <p className="mt-1 font-semibold text-slate-800">
                          {order.shippingAddress?.fullName || "N/A"}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-slate-400">
                          Phone
                        </p>
                        <p className="mt-1 font-semibold text-slate-800">
                          {order.shippingAddress?.phone || "N/A"}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-slate-400">
                          Order Date
                        </p>
                        <p className="mt-1 text-sm font-semibold text-slate-800">
                          {formatDate(order.createdAt)}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-slate-400">
                          Total Amount
                        </p>
                        <p className="mt-1 text-lg font-black text-indigo-600">
                          {formatPrice(order.totalAmount)}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col gap-3 border-t border-slate-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                      <div>
                        <p className="text-xs text-slate-400">
                          {order.totalItems} Items · {order.paymentMethod} · {order.paymentStatus}
                        </p>
                        <p className="mt-1 text-xs text-slate-400">
                          Customer ID: {order.userId}
                        </p>
                      </div>

                      <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
                        <button
                          onClick={() =>
                            setExpandedId(
                              expanded ? "" : order.id
                            )
                          }
                          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 transition hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-600"
                        >
                          <Eye size={15} />
                          {expanded ? "Hide Details" : "View Details"}
                        </button>

                        {order.paymentMethod === "COD" &&
  order.orderStatus === "DELIVERED" &&
  order.paymentStatus === "PENDING" && (
    <button
      type="button"
      onClick={() => setSelectedCodOrder(order)}
      disabled={updatingId === order.id}
      className="inline-flex items-center gap-1.5 rounded-lg border border-green-200 bg-green-50 px-2.5 py-1.5 text-[11px] font-semibold text-green-700 transition hover:border-green-400 hover:bg-green-100 disabled:opacity-50"
    >
      <CheckCircle2 size={15} />
      Accept COD Payment
    </button>
  )}

                        {nextStatuses.length > 0 && (
  <div className="relative w-full sm:w-auto" data-dropdown-root>
    <button
      type="button"
      disabled={updatingId === order.id}
      onClick={() => {
        setOpenStatusMenu(false);
        setOpenOrderMenu(openOrderMenu === order.id ? "" : order.id);
      }}
      className={`flex w-full items-center justify-between gap-3 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-bold text-indigo-700 transition hover:border-indigo-400 hover:bg-indigo-100 disabled:opacity-50 sm:w-auto ${
        openOrderMenu === order.id
          ? "ring-4 ring-indigo-50"
          : ""
      }`}
    >
      <span>
        {updatingId === order.id
          ? "Updating..."
          : "Update Status"}
      </span>

      <ChevronDown
        size={15}
        className={`transition-transform ${
          openOrderMenu === order.id ? "rotate-180" : ""
        }`}
      />
    </button>

    {openOrderMenu === order.id && (
      <div className="absolute right-0 top-full z-50 mt-2 w-full min-w-[180px] overflow-hidden rounded-xl border border-slate-200 bg-white p-1.5 shadow-2xl shadow-slate-900/10 sm:w-48">
        <p className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
          Change Order Status
        </p>

        {nextStatuses.map((status) => (
          <button
            key={status}
            type="button"
            onClick={() => {
              setOpenOrderMenu("");
              updateStatus(order.id, status);
            }}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-xs font-semibold text-slate-700 transition hover:bg-indigo-50 hover:text-indigo-700"
          >
            <span
              className={`h-2 w-2 rounded-full ${
                status === "CANCELLED"
                  ? "bg-red-500"
                  : status === "DELIVERED"
                    ? "bg-green-500"
                    : "bg-indigo-500"
              }`}
            />
            {status}
          </button>
        ))}
      </div>
    )}
  </div>
)}

                        {updatingId === order.id && (
                          <Loader2
                            size={17}
                            className="animate-spin text-indigo-600"
                          />
                        )}
                      </div>
                    </div>

                    {expanded && (
                      <div className="space-y-5 border-t border-slate-100 bg-slate-50/70 p-4 sm:p-5">
                        <div>
                          <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-800">
                            <ShoppingBag size={17} />
                            Ordered Products
                          </h3>

                          <div className="space-y-2">
                            {order.items.map((item) => (
                              <div
                                key={item.productId}
                                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white p-3"
                              >
                                <div>
                                  <p className="text-sm font-semibold text-slate-800">
                                    {item.productName}
                                  </p>
                                  <p className="mt-1 text-xs text-slate-500">
                                    {formatPrice(item.price)} × {item.quantity}
                                  </p>
                                </div>

                                <p className="font-bold text-slate-800">
                                  {formatPrice(item.subtotal)}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div>
                          <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-800">
                            <MapPin size={17} />
                            Shipping Address
                          </h3>

                          <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-600">
                            <p className="font-bold text-slate-800">
                              {order.shippingAddress?.fullName}
                            </p>
                            <p className="mt-2 flex items-start gap-2">
                              <MapPin
                                size={15}
                                className="mt-0.5 shrink-0"
                              />
                              {order.shippingAddress?.address},{" "}
                              {order.shippingAddress?.city},{" "}
                              {order.shippingAddress?.postalCode},{" "}
                              {order.shippingAddress?.country}
                            </p>
                            <p className="mt-2 flex items-center gap-2">
                              <Phone size={15} />
                              {order.shippingAddress?.phone}
                            </p>
                            <p className="mt-2 flex items-center gap-2">
                              <CalendarDays size={15} />
                              {formatDate(order.createdAt)}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* COD Payment Confirmation Modal */}
{selectedCodOrder && (
  <div
    className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
    onClick={() => {
      if (!updatingId) setSelectedCodOrder(null);
    }}
  >
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="cod-modal-title"
      className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="relative border-b border-slate-100 px-6 pb-5 pt-6">
        <button
          type="button"
          onClick={() => setSelectedCodOrder(null)}
          disabled={updatingId === selectedCodOrder.id}
          className="absolute right-4 top-4 rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
        >
          <X size={19} />
        </button>

        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
          <CheckCircle2
            size={28}
            className="text-green-600"
          />
        </div>

        <h2
          id="cod-modal-title"
          className="mt-4 text-center text-xl font-black text-slate-900"
        >
          Confirm COD Payment
        </h2>

        <p className="mt-2 text-center text-sm leading-6 text-slate-500">
          Are you sure you have received the cash payment
          for this delivered order?
        </p>
      </div>

      {/* Order Information */}
      <div className="space-y-3 bg-slate-50 px-6 py-5">
        <div className="flex justify-between gap-3 text-sm">
          <span className="text-slate-500">Order ID</span>
          <span className="max-w-[220px] break-all text-right font-bold text-slate-800">
            #{selectedCodOrder.id}
          </span>
        </div>

        <div className="flex justify-between text-sm">
          <span className="text-slate-500">Customer</span>
          <span className="font-semibold text-slate-800">
            {selectedCodOrder.shippingAddress?.fullName || "N/A"}
          </span>
        </div>

        <div className="flex justify-between text-sm">
          <span className="text-slate-500">Payment Method</span>
          <span className="font-semibold text-slate-800">
            Cash on Delivery
          </span>
        </div>

        <div className="flex justify-between text-sm">
          <span className="text-slate-500">Payment Status</span>
          <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-700">
            PENDING
          </span>
        </div>

        <div className="border-t border-slate-200 pt-3">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-700">
              Total Amount
            </span>
            <span className="text-xl font-black text-green-600">
              {formatPrice(selectedCodOrder.totalAmount)}
            </span>
          </div>
        </div>
      </div>

      {/* Warning */}
      <div className="mx-6 mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3">
        <p className="text-xs leading-5 text-amber-800">
          <strong>Important:</strong> Only confirm if the
          customer has actually paid the full amount.
          This action will mark the payment as PAID.
        </p>
      </div>

      {/* Actions */}
      <div className="flex gap-3 p-6">
        <button
          type="button"
          onClick={() => setSelectedCodOrder(null)}
          disabled={updatingId === selectedCodOrder.id}
          className="flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
        >
          Cancel
        </button>

        <button
          type="button"
          onClick={() =>
            acceptCodPayment(selectedCodOrder.id)
          }
          disabled={updatingId === selectedCodOrder.id}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-green-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-green-200 transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {updatingId === selectedCodOrder.id ? (
            <Loader2 size={17} className="animate-spin" />
          ) : (
            <CheckCircle2 size={17} />
          )}

          {updatingId === selectedCodOrder.id
            ? "Processing..."
            : "Confirm Payment"}
        </button>
      </div>
    </div>
  </div>
)}

    </main>
  );
}
