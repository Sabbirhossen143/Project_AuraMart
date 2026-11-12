
"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useToast } from "@/components/ui/toast";
import { signOut } from "next-auth/react";
import {
  ArrowRight,
  Heart,
  LogOut,
  Package,
  Settings,
  ShoppingBag,
  UserRound,
  ChevronRight,
  ShieldCheck,
  Plus,
  Pencil,
  Boxes,
  Layers,
  Trash2,
} from "lucide-react";

interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: "USER" | "ADMIN";
  isActive: boolean;
  createdAt: string;
  phone?: string;
  address?: string;
  city?: string;
  postalCode?: string;
  country?: string;
  profileImage?: string;
}

interface DashboardStats {
  totalOrders: number;
  wishlistItems: number;
}

interface AdminProduct {
  id: string;
  name: string;
  price: number;
  stock: number;
}

export default function AccountDashboard() {
  const { toast } = useToast();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [stats, setStats] = useState<DashboardStats>({
    totalOrders: 0,
    wishlistItems: 0,
  });
  const [adminStats, setAdminStats] = useState({
    totalOrders: 0,
    totalUsers: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [adminProducts, setAdminProducts] = useState<AdminProduct[]>([]);
  const [productToDelete, setProductToDelete] =
  useState<AdminProduct | null>(null);

  const [deletingProductId, setDeletingProductId] =
   useState<string | null>(null);

  const [productActionMessage, setProductActionMessage] = useState("");
  const [productActionError, setProductActionError] = useState("");


  const loadDashboard = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      // Load the authenticated profile first. A failure in orders/wishlist
      // should not prevent the profile card from rendering.
      const profileResponse = await fetch("/api/auth/me", {
        cache: "no-store",
      });

      if (profileResponse.status === 401) {
        window.location.href = "/login";
        return;
      }

      const profileResult = await profileResponse.json();

      if (!profileResponse.ok || !profileResult.success) {
        throw new Error(
          profileResult.message || "Unable to load your profile."
        );
      }

      const user =
        profileResult.data?.user ??
        profileResult.data ??
        profileResult.user;

      if (!user || typeof user !== "object") {
        throw new Error("User profile not found.");
      }

      setProfile(user as UserProfile);
      setLoading(false);

      // Dashboard statistics are optional; failures here must not hide
      // the user's profile information.
      const [ordersResponseResult, wishlistResponseResult] =
        await Promise.allSettled([
          fetch("/api/orders", { cache: "no-store" }),
          fetch("/api/wishlist", { cache: "no-store" }),
        ]);

      let totalOrders = 0;
      let wishlistItems = 0;

      if (ordersResponseResult.status === "fulfilled") {
        const response = ordersResponseResult.value;
        if (response.ok) {
          try {
            const ordersResult = await response.json();
            const ordersData = ordersResult.data ?? ordersResult;
            const orders = Array.isArray(ordersData)
              ? ordersData
              : Array.isArray(ordersData.orders)
                ? ordersData.orders
                : [];

            totalOrders = Number(
              ordersResult.totalOrders ??
              ordersResult.total ??
              ordersResult.count ??
              ordersData.totalOrders ??
              ordersData.total ??
              orders.length
            );
          } catch {
            totalOrders = 0;
          }
        }
      }

      if (wishlistResponseResult.status === "fulfilled") {
        const response = wishlistResponseResult.value;
        if (response.ok) {
          try {
            const wishlistResult = await response.json();
            const wishlistData = wishlistResult.data ?? wishlistResult;
            wishlistItems = Array.isArray(wishlistData)
              ? wishlistData.length
              : Number(
                  wishlistResult.totalItems ??
                  wishlistData.totalItems ??
                  wishlistData.count ??
                  0
                );
          } catch {
            wishlistItems = 0;
          }
        }
      }

      setStats({ totalOrders, wishlistItems });

      // ADMIN-only totals: all orders and all registered users.
      if (user.role === "ADMIN") {
        const [ordersResult, usersResult] = await Promise.allSettled([
          fetch("/api/admin/orders", { cache: "no-store" }),
          fetch("/api/admin/users", { cache: "no-store" }),
        ]);

        let allOrdersCount = 0;
        let allUsersCount = 0;

        if (ordersResult.status === "fulfilled" && ordersResult.value.ok) {
          try {
            const result = await ordersResult.value.json();
            const data = result.data ?? result;
            const rows = Array.isArray(data) ? data : Array.isArray(data.orders) ? data.orders : [];
            allOrdersCount = Number(result.totalOrders ?? result.total ?? result.count ?? rows.length);
          } catch {
            allOrdersCount = 0;
          }
        }

        if (usersResult.status === "fulfilled" && usersResult.value.ok) {
          try {
            const result = await usersResult.value.json();
            const data = result.data ?? result;
            const rows = Array.isArray(data) ? data : Array.isArray(data.users) ? data.users : [];
            allUsersCount = Number(result.totalUsers ?? result.total ?? result.count ?? rows.length);
          } catch {
            allUsersCount = 0;
          }
        }

        setAdminStats({ totalOrders: allOrdersCount, totalUsers: allUsersCount });

        // Load products for ADMIN dashboard independently from profile loading.
        try {
          const productsResponse = await fetch("/api/products", {
            cache: "no-store",
          });
          const productsResult = await productsResponse.json();

          if (!productsResponse.ok) {
            throw new Error(
              productsResult.message || "Unable to load products."
            );
          }

          const products = Array.isArray(productsResult.data)
            ? productsResult.data
            : [];

          setAdminProducts(products);
        } catch (productError) {
          console.error("Admin Products Error:", productError);
          setAdminProducts([]);
        }
      } else {
        setAdminProducts([]);
        setAdminStats({ totalOrders: 0, totalUsers: 0 });
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
    loadDashboard();
  }, [loadDashboard]);

  useEffect(() => {
  if (!productActionMessage) return;

  const timer = setTimeout(() => {
    setProductActionMessage("");
  }, 3000);

  return () => clearTimeout(timer);
}, [productActionMessage]);

  async function handleDeleteProduct() {
  if (!productToDelete) return;

  try {
    setDeletingProductId(productToDelete.id);
    setProductActionError("");
    setProductActionMessage("");

    const response = await fetch(
      `/api/products?id=${encodeURIComponent(productToDelete.id)}`,
      {
        method: "DELETE",
        cache: "no-store",
      }
    );

    const result = await response.json();

    if (!response.ok) {
      throw new Error(
        result.message || "Product deletion failed."
      );
    }

    setAdminProducts((current) =>
      current.filter(
        (product) => product.id !== productToDelete.id
      )
    );

    setProductActionMessage(
      `${productToDelete.name} deleted successfully.`
    );
    toast.success(`${productToDelete.name} deleted successfully.`);

    setProductToDelete(null);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Unable to delete product.";
    setProductActionError(message);
    toast.error(message);
  } finally {
    setDeletingProductId(null);
  }
}

  const menuItems = [
    {
      title: "My Profile",
      description: "View and update your personal information",
      href: "/account/profile",
      icon: UserRound,
      color: "bg-blue-50 text-blue-600",
    },
    {
      title: "My Orders",
      description: "Track your purchases and orders",
      href: "/account/orders",
      icon: Package,
      color: "bg-indigo-50 text-indigo-600",
    },
    {
      title: "My Wishlist",
      description: "View your favorite products",
      href: "/wishlist",
      icon: Heart,
      color: "bg-pink-50 text-pink-600",
    },
    {
      title: "Shopping",
      description: "Explore products and collections",
      href: "/",
      icon: ShoppingBag,
      color: "bg-emerald-50 text-emerald-600",
    },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 px-4 py-12">
        <div className="mx-auto max-w-6xl animate-pulse space-y-6">
          <div className="h-44 rounded-2xl bg-slate-200" />
          <div className="grid gap-5 sm:grid-cols-3">
            <div className="h-32 rounded-2xl bg-slate-200" />
            <div className="h-32 rounded-2xl bg-slate-200" />
            <div className="h-32 rounded-2xl bg-slate-200" />
          </div>
          <div className="h-72 rounded-2xl bg-slate-200" />
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="flex min-h-[65vh] items-center justify-center bg-slate-50 px-4">
        <div className="max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center">
          <UserRound className="mx-auto text-indigo-500" size={42} />
          <h2 className="mt-4 text-xl font-bold text-slate-900">
            Unable to Load Account
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            {error || "Please try again."}
          </p>
          <button
            onClick={loadDashboard}
            className="mt-5 rounded-xl bg-indigo-600 px-6 py-3 font-semibold text-white hover:bg-indigo-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const initials = profile.name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_rgba(99,102,241,0.08),_transparent_42%),linear-gradient(180deg,#f8faff_0%,#f1f5f9_100%)]">
      {/* Dashboard Header */}
      <section className="bg-gradient-to-r from-indigo-600 via-indigo-700 to-violet-700 px-4 py-12 text-white sm:py-16">
        <div className="mx-auto max-w-6xl">
          <div className="mb-3 flex items-center gap-2 text-sm text-indigo-100">
            <Link href="/" className="hover:text-white">
              Home
            </Link>
            <ChevronRight size={15} />
            <span>My Account</span>
          </div>

          <div className="flex flex-nowrap items-center justify-between gap-2 sm:gap-6">
            <div className="flex min-w-0 flex-1 items-center gap-3 sm:gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-white/30 bg-white text-2xl font-bold text-indigo-700 shadow-lg">
                {profile.profileImage ? (
                  <img
                    src={profile.profileImage}
                    alt={`${profile.name} profile`}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  initials
                )}
              </div>

              <div className="min-w-0">
                <p className="text-sm text-indigo-100">
                  Welcome back,
                </p>
                <h1 className="mt-1 truncate text-lg font-bold sm:text-3xl">
                  {profile.name}
                </h1>
                <p className="mt-1 truncate text-xs text-indigo-100 sm:text-sm">
                  {profile.email}
                </p>
              </div>
            </div>

            <button
              onClick={() =>
                signOut({
                  callbackUrl: "/login",
                })
              }
              className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-white/30 bg-white/10 px-2.5 py-2 text-xs font-semibold text-white transition hover:bg-white/20 sm:gap-2 sm:px-4 sm:py-2.5 sm:text-sm"
            >
              <LogOut size={17} />
              Sign Out
            </button>
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-6xl space-y-8 px-4 py-10 sm:py-12">
        {/* Account Statistics */}
        {profile.role === "ADMIN" ? (
          <section className="grid grid-cols-2 gap-3 sm:gap-5">
            <div className="premium-card rounded-2xl border border-white/80 bg-white p-4 shadow-[0_16px_45px_-30px_rgba(15,23,42,0.28)] ring-1 ring-slate-200/70 sm:rounded-3xl sm:p-6">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-slate-500 sm:text-sm">Total Orders</p>
                  <h2 className="mt-2 text-2xl font-bold text-slate-900 sm:text-3xl">{adminStats.totalOrders}</h2>
                </div>
                <div className="shrink-0 rounded-xl bg-indigo-50 p-2 text-indigo-600 sm:p-3">
                  <Package size={21} className="sm:h-[25px] sm:w-[25px]" />
                </div>
              </div>
              <Link href="/admin/orders" className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700 sm:mt-5 sm:gap-2 sm:text-sm">
                Manage Orders <ArrowRight size={14} />
              </Link>
            </div>

            <div className="premium-card rounded-2xl border border-white/80 bg-white p-4 shadow-[0_16px_45px_-30px_rgba(15,23,42,0.28)] ring-1 ring-slate-200/70 sm:rounded-3xl sm:p-6">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-slate-500 sm:text-sm">Total Users</p>
                  <h2 className="mt-2 text-2xl font-bold text-slate-900 sm:text-3xl">{adminStats.totalUsers}</h2>
                </div>
                <div className="shrink-0 rounded-xl bg-violet-50 p-2 text-violet-600 sm:p-3">
                  <UserRound size={21} className="sm:h-[25px] sm:w-[25px]" />
                </div>
              </div>
              <Link href="/admin/users" className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-violet-600 hover:text-violet-700 sm:mt-5 sm:gap-2 sm:text-sm">
                Manage Users <ArrowRight size={14} />
              </Link>
            </div>

            <div className="premium-card rounded-2xl border border-white/80 bg-white p-4 shadow-[0_16px_45px_-30px_rgba(15,23,42,0.28)] ring-1 ring-slate-200/70 sm:rounded-3xl sm:p-6">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-slate-500 sm:text-sm">My Orders</p>
                  <h2 className="mt-2 text-2xl font-bold text-slate-900 sm:text-3xl">{stats.totalOrders}</h2>
                </div>
                <div className="shrink-0 rounded-xl bg-blue-50 p-2 text-blue-600 sm:p-3">
                  <ShoppingBag size={21} className="sm:h-[25px] sm:w-[25px]" />
                </div>
              </div>
              <Link href="/account/orders" className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 sm:mt-5 sm:gap-2 sm:text-sm">
                View My Orders <ArrowRight size={14} />
              </Link>
            </div>

            <div className="premium-card rounded-2xl border border-white/80 bg-white p-4 shadow-[0_16px_45px_-30px_rgba(15,23,42,0.28)] ring-1 ring-slate-200/70 sm:rounded-3xl sm:p-6">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-slate-500 sm:text-sm">Account Status</p>
                  <h2 className="mt-2 text-xl font-bold text-slate-900 sm:text-2xl">{profile.isActive ? "Active" : "Inactive"}</h2>
                </div>
                <div className="shrink-0 rounded-xl bg-emerald-50 p-2 text-emerald-600 sm:p-3">
                  <ShieldCheck size={21} className="sm:h-[25px] sm:w-[25px]" />
                </div>
              </div>
              <p className="mt-4 text-xs font-medium text-slate-500 sm:mt-5 sm:text-sm">Role: {profile.role}</p>
            </div>
          </section>
        ) : (
          <section className="grid grid-cols-2 gap-3 sm:gap-5">
            <div className="premium-card rounded-2xl border border-white/80 bg-white p-4 shadow-[0_16px_45px_-30px_rgba(15,23,42,0.28)] ring-1 ring-slate-200/70 sm:rounded-3xl sm:p-6">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-slate-500 sm:text-sm">Total Orders</p>
                  <h2 className="mt-2 text-2xl font-bold text-slate-900 sm:text-3xl">{stats.totalOrders}</h2>
                </div>
                <div className="shrink-0 rounded-xl bg-indigo-50 p-2 text-indigo-600 sm:p-3">
                  <Package size={21} className="sm:h-[25px] sm:w-[25px]" />
                </div>
              </div>
              <Link href="/account/orders" className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700 sm:mt-5 sm:gap-2 sm:text-sm">
                View Orders <ArrowRight size={14} />
              </Link>
            </div>

            <div className="premium-card rounded-2xl border border-white/80 bg-white p-4 shadow-[0_16px_45px_-30px_rgba(15,23,42,0.28)] ring-1 ring-slate-200/70 sm:rounded-3xl sm:p-6">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-slate-500 sm:text-sm">Wishlist Items</p>
                  <h2 className="mt-2 text-2xl font-bold text-slate-900 sm:text-3xl">{stats.wishlistItems}</h2>
                </div>
                <div className="shrink-0 rounded-xl bg-pink-50 p-2 text-pink-600 sm:p-3">
                  <Heart size={21} className="sm:h-[25px] sm:w-[25px]" />
                </div>
              </div>
              <Link href="/wishlist" className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-pink-600 hover:text-pink-700 sm:mt-5 sm:gap-2 sm:text-sm">
                View Wishlist <ArrowRight size={14} />
              </Link>
            </div>

            <div className="premium-card rounded-2xl border border-white/80 bg-white p-4 shadow-[0_16px_45px_-30px_rgba(15,23,42,0.28)] ring-1 ring-slate-200/70 sm:rounded-3xl sm:p-6">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-slate-500 sm:text-sm">Account Status</p>
                  <h2 className="mt-2 text-xl font-bold text-slate-900 sm:text-2xl">{profile.isActive ? "Active" : "Inactive"}</h2>
                </div>
                <div className="shrink-0 rounded-xl bg-emerald-50 p-2 text-emerald-600 sm:p-3">
                  <ShieldCheck size={21} className="sm:h-[25px] sm:w-[25px]" />
                </div>
              </div>
              <p className="mt-4 text-xs font-medium text-slate-500 sm:mt-5 sm:text-sm">Role: {profile.role}</p>
            </div>
          </section>
        )}

        {/* Profile Information */}
        <section className="overflow-hidden rounded-3xl border border-white/80 bg-white shadow-[0_18px_55px_-32px_rgba(15,23,42,0.30)] ring-1 ring-slate-200/70">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-5 sm:px-7">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Profile Information
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Your account details
              </p>
            </div>
            <Link
              href="/account/profile"
              aria-label="View and edit profile information"
              title="View and edit profile information"
              className="group rounded-xl bg-indigo-50 p-2.5 text-indigo-600 transition hover:bg-indigo-600 hover:text-white hover:shadow-lg hover:shadow-indigo-200"
            >
              <Settings size={21} className="transition-transform duration-300 group-hover:rotate-45" />
            </Link>
          </div>

          <div className="grid gap-x-8 gap-y-6 p-5 sm:grid-cols-2 sm:p-7">
            {[
              { label: "Full Name", value: profile.name },
              { label: "Email Address", value: profile.email },
              { label: "Phone Number", value: profile.phone },
              { label: "Street Address", value: profile.address },
              { label: "City", value: profile.city },
              { label: "Postal Code", value: profile.postalCode },
              { label: "Country", value: profile.country },
              { label: "Account Role", value: profile.role },
            ].map((item) => (
              <div key={item.label} className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  {item.label}
                </p>
                <p className="mt-2 break-words font-semibold text-slate-800">
                  {item.value?.trim() || (
                    <span className="font-normal italic text-slate-400">
                      Not added yet
                    </span>
                  )}
                </p>
              </div>
            ))}

            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Account Status
              </p>
              <p
                className={`mt-2 font-semibold ${
                  profile.isActive ? "text-emerald-600" : "text-rose-600"
                }`}
              >
                {profile.isActive ? "Active" : "Inactive"}
              </p>
            </div>
          </div>
        </section>

        {/* Admin Product Management */}
        {profile.role === "ADMIN" && (
          <section className="overflow-hidden rounded-2xl border border-indigo-200 bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-indigo-100 bg-gradient-to-r from-indigo-50 to-violet-50 px-5 py-5 sm:px-7">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-indigo-600 p-3 text-white">
                  <Boxes size={23} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    Product Management
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Add new products or edit existing products.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
  <Link
    href="/admin/categories"
    className="inline-flex items-center gap-2 rounded-xl border border-indigo-200 bg-white px-5 py-3 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-50"
  >
    <Layers size={18} />
    Manage Categories
  </Link>

  <Link
    href="/admin/products/new"
    className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold !text-white shadow-sm transition hover:bg-indigo-700"
  >
    <Plus size={18} />
    Add Product
  </Link>
</div>
            </div>

            <div className="p-5 sm:p-7">
              {productActionMessage && (
  <p className="mb-4 rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-700">
    {productActionMessage}
  </p>
)}
              <div className="mb-4 flex items-center justify-between gap-3">
                <h3 className="font-bold text-slate-900">
                  Existing Products
                </h3>
                <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
                  {adminProducts.length} products
                </span>
              </div>

              {adminProducts.length === 0 ? (
                <p className="rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500">
                  No products found. Add your first product.
                </p>
              ) : (
                <div className="divide-y divide-slate-100">
                  {adminProducts.map((product) => (
                    <div
                      key={product.id}
                      className="flex flex-wrap items-center justify-between gap-3 py-4 first:pt-0 last:pb-0"
                    >
                      <div className="min-w-0">
                        <p className="break-words font-semibold text-slate-800">
                          {product.name}
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                          ৳{Number(product.price || 0).toLocaleString("en-BD")}
                          {" · "}
                          Stock: {product.stock ?? 0}
                        </p>
                      </div>

                      <div className="flex shrink-0 items-center gap-2">
  <Link
    href={`/admin/products/${product.id}/edit`}
    className="inline-flex items-center gap-2 rounded-lg border border-indigo-200 px-4 py-2 text-sm font-semibold text-indigo-600 transition hover:border-indigo-600 hover:bg-indigo-50"
  >
    <Pencil size={15} />
    Edit
  </Link>

  <button
    type="button"
    onClick={() => {
      setProductActionError("");
      setProductActionMessage("");
      setProductToDelete(product);
    }}
    className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 transition hover:border-red-500 hover:bg-red-50"
  >
    <Trash2 size={15} />
    Delete
  </button>
</div>

                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

        
{/* Admin Management Navigation */}
{profile.role === "ADMIN" && (
  <section className="overflow-hidden rounded-2xl border border-indigo-200 bg-white shadow-sm">
    <div className="border-b border-indigo-100 bg-gradient-to-r from-indigo-50 to-violet-50 px-5 py-5 sm:px-7">
      <h2 className="text-lg font-bold text-slate-900">
        Admin Management
      </h2>
      <p className="mt-1 text-sm text-slate-500">
        Manage customer orders and user accounts.
      </p>
    </div>

    <div className="grid grid-cols-2 gap-3 p-3 sm:gap-4 sm:p-7">
      <Link
        href="/admin/orders"
        className="premium-card group flex items-center gap-4 rounded-xl border border-slate-200 p-5 transition hover:border-indigo-300 hover:bg-indigo-50/50"
      >
        <div className="rounded-xl bg-indigo-50 p-3 text-indigo-600">
          <Package size={25} />
        </div>
        <div>
          <h3 className="font-bold text-slate-900 group-hover:text-indigo-600">
            Manage Orders
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            View and update all customer orders.
          </p>
        </div>
        <ArrowRight size={18} className="ml-auto text-slate-400" />
      </Link>

      <Link
        href="/admin/users"
        className="premium-card group flex items-center gap-4 rounded-xl border border-slate-200 p-5 transition hover:border-indigo-300 hover:bg-indigo-50/50"
      >
        <div className="rounded-xl bg-violet-50 p-3 text-violet-600">
          <UserRound size={25} />
        </div>
        <div>
          <h3 className="font-bold text-slate-900 group-hover:text-indigo-600">
            Manage Users
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            Manage roles and customer accounts.
          </p>
        </div>
        <ArrowRight size={18} className="ml-auto text-slate-400" />
      </Link>
    </div>
  </section>
)}

{productToDelete && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4 backdrop-blur-sm">
    <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-red-600">
        <Trash2 size={26} />
      </div>

      <h2 className="mt-5 text-center text-xl font-bold text-slate-900">
        Delete Product?
      </h2>

      <p className="mt-3 text-center text-sm leading-6 text-slate-500">
        Are you sure you want to delete{" "}
        <strong className="text-slate-800">
          {productToDelete.name}
        </strong>
        ? This action cannot be undone.
      </p>

      {productActionError && (
        <p className="mt-4 rounded-lg bg-red-50 p-3 text-center text-sm text-red-600">
          {productActionError}
        </p>
      )}

      <div className="mt-7 flex gap-3">
        <button
          type="button"
          disabled={deletingProductId !== null}
          onClick={() => setProductToDelete(null)}
          className="flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
        >
          Cancel
        </button>

        <button
          type="button"
          disabled={deletingProductId !== null}
          onClick={handleDeleteProduct}
          className="flex-1 rounded-xl bg-red-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {deletingProductId === productToDelete.id
            ? "Deleting..."
            : "Yes, Delete"}
        </button>
      </div>
    </div>
  </div>
)}

        {/* Account Navigation */}
        <section>
          <div className="mb-5">
            <h2 className="text-xl font-bold text-slate-900">
              Account Navigation
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Quickly access your account sections.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            {menuItems.map((item) => {
              const Icon = item.icon;

              return (
                <Link
                  key={item.title}
                  href={item.href}
                  className="premium-card group flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6"
                >
                  <div className="flex min-w-0 items-center gap-4">
                    <div className={`rounded-xl p-3 ${item.color}`}>
                      <Icon size={24} />
                    </div>

                    <div className="min-w-0">
                      <h3 className="font-bold text-slate-900 transition group-hover:text-indigo-600">
                        {item.title}
                      </h3>
                      <p className="mt-1 text-sm text-slate-500">
                        {item.description}
                      </p>
                    </div>
                  </div>

                  <ArrowRight
                    size={19}
                    className="shrink-0 text-slate-400 transition group-hover:translate-x-1 group-hover:text-indigo-600"
                  />
                </Link>
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
}
