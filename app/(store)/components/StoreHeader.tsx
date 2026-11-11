"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { getGuestCart } from "@/lib/guest-cart";
import { getGuestWishlist } from "@/lib/guest-wishlist";
import { signOut } from "next-auth/react";
import {
  ShoppingBag,
  ShoppingCart,
  Heart,
  UserRound,
  MoreVertical,
  Search,
  ArrowRight,
  Package,
  LogOut,
  LayoutDashboard,
  Settings,
  Tags,
  Plus,
  Users,
  X,
  Home,
  Headphones,
} from "lucide-react";

interface AccountUser {
  id: string;
  name: string;
  email: string;
  role?: "USER" | "ADMIN" | string;
  profileImage?: string | null;
  image?: string | null;
  imageUrl?: string | null;
  profileImageUrl?: string | null;
  avatarUrl?: string | null;
}

function StoreHeaderContent() {
  const [cartCount, setCartCount] = useState(0);
  const [wishlistCount, setWishlistCount] = useState(0);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [search, setSearch] = useState("");
  const [activeNav, setActiveNav] = useState<string>("dashboard");
  const [pendingContactScroll, setPendingContactScroll] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const [accountUser, setAccountUser] = useState<AccountUser | null>(null);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const accountMenuRef = useRef<HTMLDivElement>(null);

  // Always start with Dashboard highlighted after a fresh page load.
  useEffect(() => {
    setActiveNav("dashboard");
  }, []);

  // Scroll to the footer contact section after navigating home from another route.
  useEffect(() => {
    if (!pendingContactScroll || pathname !== "/") return;

    const frame = window.requestAnimationFrame(() => {
      document.getElementById("contact")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
      setPendingContactScroll(false);
    });

    return () => window.cancelAnimationFrame(frame);
  }, [pendingContactScroll, pathname]);

  const isAdmin = accountUser?.role === "ADMIN";
  const avatar =
    accountUser?.profileImage ||
    accountUser?.profileImageUrl ||
    accountUser?.avatarUrl ||
    accountUser?.imageUrl ||
    accountUser?.image ||
    "";

  useEffect(() => {
    let active = true;

    async function loadCart() {
      try {
        const response = await fetch("/api/cart", { cache: "no-store" });
        if (response.status === 401) {
          const guestItems = getGuestCart();
          if (active) {
            setCartCount(guestItems.reduce((total, item) => total + item.quantity, 0));
          }
          return;
        }
        if (!response.ok) return;
        const result = await response.json();
        if (active) setCartCount(Number(result.data?.totalItems || 0));
      } catch (error) {
        console.error("Cart loading error:", error);
      }
    }

    async function loadWishlistCount() {
      try {
        const response = await fetch("/api/wishlist", { cache: "no-store" });
        if (response.status === 401) {
          if (active) setWishlistCount(getGuestWishlist().length);
          return;
        }
        if (!response.ok) return;
        const result = await response.json();
        const items = Array.isArray(result.data) ? result.data : [];
        if (active) setWishlistCount(items.length);
      } catch (error) {
        console.error("Wishlist count loading error:", error);
      }
    }

    loadCart();
    loadWishlistCount();
    window.addEventListener("focus", loadCart);
    window.addEventListener("focus", loadWishlistCount);
    window.addEventListener("cart-updated", loadCart);
    window.addEventListener("wishlist-updated", loadWishlistCount);

    return () => {
      active = false;
      window.removeEventListener("focus", loadCart);
      window.removeEventListener("focus", loadWishlistCount);
      window.removeEventListener("cart-updated", loadCart);
      window.removeEventListener("wishlist-updated", loadWishlistCount);
    };
  }, []);

  useEffect(() => {
    let active = true;

    async function loadAccount() {
      try {
        const response = await fetch("/api/auth/me", { cache: "no-store" });
        if (!response.ok) {
          if (active) setAccountUser(null);
          return;
        }

        const result = await response.json();
        const user = result.data?.user ?? result.data ?? result.user ?? null;
        if (active) setAccountUser(user?.id ? user : null);
      } catch (error) {
        console.error("Account loading error:", error);
        if (active) setAccountUser(null);
      } finally {
        if (active) setAuthLoading(false);
      }
    }

    loadAccount();
    window.addEventListener("focus", loadAccount);
    window.addEventListener("auth-changed", loadAccount);

    return () => {
      active = false;
      window.removeEventListener("focus", loadAccount);
      window.removeEventListener("auth-changed", loadAccount);
    };
  }, []);

  useEffect(() => {
    if (!accountMenuOpen) return;

    function handleOutsidePointerDown(event: PointerEvent) {
      if (
        event.target instanceof Node &&
        accountMenuRef.current &&
        !accountMenuRef.current.contains(event.target)
      ) {
        setAccountMenuOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setAccountMenuOpen(false);
    }

    document.addEventListener("pointerdown", handleOutsidePointerDown);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("pointerdown", handleOutsidePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [accountMenuOpen]);

  function handleSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = search.trim();
    if (!query) return;
    setMobileMenu(false);
    window.location.href = `/?search=${encodeURIComponent(query)}#products`;
  }

  const accountLinks = isAdmin
    ? [
        { label: "Home", href: "/", icon: Home },
        { label: "Dashboard", href: "/account", icon: LayoutDashboard },
        { label: "My Profile", href: "/account/profile", icon: Settings },
        { label: "Create Categories", href: "/admin/categories", icon: Tags },
        { label: "Add Product", href: "/admin/products/new", icon: Plus },
        { label: "Manage Orders", href: "/admin/orders", icon: Package },
        { label: "Manage Users", href: "/admin/users", icon: Users },
      ]
    : [
        { label: "Home", href: "/", icon: Home },
        { label: "Dashboard", href: "/account", icon: LayoutDashboard },
        { label: "My Profile", href: "/account/profile", icon: Settings },
        { label: "My Orders", href: "/account/orders", icon: Package },
        { label: "My Wishlist", href: "/wishlist", icon: Heart },
      ];

  const mobileLinks = isAdmin
    ? [
        { key: "home", label: "Home", href: "/", icon: Home },
        { key: "dashboard", label: "Dashboard", href: "/account", icon: LayoutDashboard },
        { key: "products", label: "Products", href: "/#products", icon: ShoppingBag },
        { key: "manage-orders", label: "Manage Orders", href: "/admin/orders", icon: Package },
        { key: "manage-users", label: "Manage Users", href: "/admin/users", icon: Users },
        { key: "my-orders", label: "My Orders", href: "/account/orders", icon: Package },
        
      ]
    : [
        { key: "home", label: "Home", href: "/", icon: Home },
        { key: "dashboard", label: "Dashboard", href: "/account", icon: LayoutDashboard },
        { key: "products", label: "Products", href: "/#products", icon: ShoppingBag },
        { key: "my-orders", label: "My Orders", href: "/account/orders", icon: Package },
        { key: "my-wishlist", label: "My Wishlist", href: "/wishlist", icon: Heart },
        
      ];

  function closeMenus() {
    setMobileMenu(false);
    setAccountMenuOpen(false);
  }

  return (
    <header className="sticky top-0 z-50 border-b border-slate-100/80 bg-white/95 backdrop-blur-xl">
      <div className="mx-auto flex h-[68px] max-w-7xl items-center justify-between gap-3 px-4 sm:h-[76px] sm:px-6 lg:px-8">
        <Link href="/" className="group flex shrink-0 items-center gap-2.5" onClick={closeMenus}>
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-700 text-white shadow-lg shadow-indigo-200 transition duration-300 group-hover:rotate-[-8deg] group-hover:scale-105 sm:h-11 sm:w-11">
            <ShoppingBag size={22} strokeWidth={2.2} />
          </div>
          <span className="text-[21px] font-black tracking-tight sm:text-2xl">
            Aura<span className="text-indigo-600">Mart.</span>
          </span>
        </Link>

        <nav className="hidden flex-1 items-center justify-center gap-1.5 rounded-full border border-slate-100 bg-slate-50/80 p-1.5 text-[13px] font-bold lg:flex">
          {(isAdmin
            ? [
                { key: "home", label: "Home", href: "/" },
                { key: "dashboard", label: "Dashboard", href: "/account" },
                { key: "all-orders", label: "All Orders", href: "/admin/orders" },
                { key: "all-users", label: "All Users", href: "/admin/users" },
                { key: "my-orders", label: "My Orders", href: "/account/orders" },
                
              ]
            : [
                { key: "home", label: "Home", href: "/" },
                { key: "dashboard", label: "Dashboard", href: "/account" },
                { key: "my-orders", label: "My Orders", href: "/account/orders" },
                { key: "my-wishlist", label: "My Wishlist", href: "/wishlist", icon: Heart },
                
              ]
          ).map((item) => (
            <Link
              key={item.label}
              href={item.href}
              onClick={(event) => {
                setActiveNav(item.key);
                if (item.key === "contact") {
                  event.preventDefault();
                  if (window.location.pathname === "/") {
                    document.getElementById("contact")?.scrollIntoView({ behavior: "smooth", block: "start" });
                  } else {
                    setPendingContactScroll(true);
                    router.push("/#contact");
                  }
                }
              }}
              aria-current={activeNav === item.key ? "page" : undefined}
              className={`relative rounded-full px-3 py-2 transition-all duration-300 ${
                activeNav === item.key
                  ? "bg-gradient-to-r from-indigo-600 to-violet-600 !text-white shadow-md shadow-indigo-200"
                  : "text-slate-500 hover:-translate-y-0.5 hover:bg-white hover:text-indigo-700 hover:shadow-sm"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-1 sm:gap-1.5">
          <form onSubmit={handleSearch} className="group relative hidden md:block">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 transition group-focus-within:text-indigo-600"
            />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search..."
              aria-label="Search products"
              className="h-10 w-32 rounded-full border border-slate-200 bg-slate-50/80 pl-9 pr-3 text-xs outline-none transition-all duration-300 placeholder:text-slate-400 focus:w-40 focus:border-indigo-300 focus:bg-white focus:ring-4 focus:ring-indigo-50 lg:w-36 lg:focus:w-44"
            />
          </form>
          <Link
            href="/wishlist"
            aria-label={`Wishlist, ${wishlistCount} items`}
            className="relative inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-slate-500 transition hover:bg-rose-50 hover:text-rose-500 sm:h-11 sm:w-11"
          >
            <Heart size={21} />
            {wishlistCount > 0 && (
              <span className="absolute right-0 top-0 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-white bg-rose-500 px-1 text-[9px] font-extrabold text-white">
                {wishlistCount}
              </span>
            )}
          </Link>
          {authLoading ? (
            <span className="h-10 w-10 animate-pulse rounded-full bg-slate-100" />
          ) : accountUser ? (
            <div ref={accountMenuRef} className="relative">
              <button
                type="button"
                onClick={() => setAccountMenuOpen((open) => !open)}
                aria-label="Open account menu"
                aria-expanded={accountMenuOpen}
                className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border-2 border-white bg-gradient-to-br from-indigo-500 to-violet-600 p-[2px] text-sm font-bold text-white shadow-md shadow-indigo-200 ring-2 ring-indigo-100 transition duration-300 hover:scale-105 hover:ring-indigo-300 sm:h-11 sm:w-11"
              >
                {avatar ? (
                  <img src={avatar} alt={accountUser.name || "Profile"} className="h-full w-full rounded-full object-cover" />
                ) : (
                  (accountUser.name || "U").trim().charAt(0).toUpperCase()
                )}
              </button>

              {accountMenuOpen && (
                <div className="absolute right-0 top-[calc(100%+12px)] z-[80] max-h-[min(75vh,620px)] w-[min(19rem,calc(100vw-1.5rem))] origin-top-right overflow-y-auto rounded-3xl border border-white/80 bg-white/95 p-2 shadow-2xl shadow-slate-900/15 ring-1 ring-slate-200/70 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150">
                  <div className="mb-1 flex items-center gap-3 rounded-2xl bg-gradient-to-br from-indigo-50 via-white to-violet-50 px-3 py-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-sm font-bold text-white">
                      {avatar ? (
                        <img src={avatar} alt="" className="h-full w-full object-cover" />
                      ) : (
                        (accountUser.name || "U").trim().charAt(0).toUpperCase()
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-slate-900">{accountUser.name}</p>
                      <p className="truncate text-xs text-slate-500">{accountUser.email}</p>
                      <span className="mt-1 inline-flex rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-indigo-700">
                        {isAdmin ? "Administrator" : "Customer"}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-0.5">
                    {accountLinks.map((item) => {
                      const Icon = item.icon;
                      return (
                        <Link
                          key={item.label}
                          href={item.href}
                          onClick={closeMenus}
                          className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-700 transition hover:translate-x-0.5 hover:bg-indigo-50 hover:text-indigo-700"
                        >
                          <Icon size={17} className="text-slate-400" />
                          {item.label}
                        </Link>
                      );
                    })}
                  </div>

                  <div className="my-2 border-t border-slate-100" />
                  <button
                    type="button"
                    onClick={() => signOut({ callbackUrl: "/" })}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-bold text-rose-600 transition hover:bg-rose-50"
                  >
                    <LogOut size={17} />
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link
              href="/login"
              className="inline-flex h-10 items-center gap-2 rounded-full border border-indigo-100 bg-white px-3.5 text-sm font-bold text-indigo-700 shadow-sm transition hover:border-indigo-200 hover:bg-indigo-50 sm:px-4"
            >
              <UserRound size={17} />
              <span className="hidden sm:inline">Sign In</span>
            </Link>
          )}

          <Link
            href="/cart"
            aria-label="Shopping cart"
            className="relative inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-200 transition-all duration-300 hover:-translate-y-0.5 hover:from-indigo-700 hover:to-violet-700 hover:shadow-lg"
          >
            <ShoppingCart size={20} strokeWidth={2.2} />
            {cartCount > 0 && (
              <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-white bg-rose-500 px-1 text-[9px] font-extrabold text-white">
                {cartCount}
              </span>
            )}
          </Link>

          <button
            type="button"
            onClick={() => setMobileMenu((open) => !open)}
            aria-label="Toggle quick navigation"
            aria-expanded={mobileMenu}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 lg:hidden"
          >
            {mobileMenu ? <X size={20} /> : <MoreVertical size={21} />}
          </button>
        </div>
      </div>

      {mobileMenu && (
        <div className="border-t border-indigo-100/80 bg-gradient-to-br from-white via-white to-indigo-50/70 px-4 pb-5 pt-4 shadow-[0_16px_40px_-15px_rgba(79,70,229,0.20)] lg:hidden">
          <form onSubmit={handleSearch} className="relative mb-4">
            <Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search products..."
              aria-label="Search products"
              className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50"
            />
          </form>

          {accountUser && (
            <div className="mb-3 flex items-center gap-3 rounded-2xl border border-indigo-100 bg-gradient-to-r from-indigo-50 via-white to-violet-50 p-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-sm font-bold text-white">
                {avatar ? (
                  <img src={avatar} alt="" className="h-full w-full object-cover" />
                ) : (
                  (accountUser.name || "U").trim().charAt(0).toUpperCase()
                )}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-extrabold text-slate-900">{accountUser.name}</p>
                <p className="truncate text-xs text-slate-500">{accountUser.email}</p>
              </div>
              <span className="ml-auto rounded-full bg-indigo-100 px-2 py-1 text-[9px] font-bold uppercase text-indigo-700">
                {isAdmin ? "Admin" : "User"}
              </span>
            </div>
          )}

          <nav className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {mobileLinks.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  onClick={() => {
                    setActiveNav(item.key);
                    if (item.key === "contact") {
                      if (window.location.pathname === "/") {
                        document.getElementById("contact")?.scrollIntoView({ behavior: "smooth", block: "start" });
                      } else {
                        setPendingContactScroll(true);
                        router.push("/#contact");
                      }
                    }
                    setMobileMenu(false);
                  }}
                  className={`group flex min-h-11 items-center gap-2 rounded-xl border px-3 py-3 text-xs font-semibold shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:text-sm ${
                    activeNav === item.key
                      ? "border-indigo-600 bg-gradient-to-r from-indigo-600 to-violet-600 !text-white shadow-indigo-200"
                      : "border-slate-200/80 bg-white/90 text-slate-700 hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"
                  }`}
                >
                  <Icon size={16} className={`shrink-0 ${activeNav === item.key ? "!text-white" : "text-indigo-500"}`} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {!accountUser && (
            <Link
              href="/login"
              onClick={() => setMobileMenu(false)}
              className="mt-4 flex h-12 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-sm font-bold text-white shadow-lg shadow-indigo-200/70 transition hover:from-indigo-700 hover:to-violet-700"
            >
              Sign In <ArrowRight size={16} />
            </Link>
          )}
        </div>
      )}
    </header>
  );
}

export default function StoreHeader() {
  return (
    <Suspense
      fallback={
        <div
          aria-hidden="true"
          className="sticky top-0 z-50 h-[68px] border-b border-slate-100 bg-white/95 shadow-sm backdrop-blur-xl sm:h-[76px]"
        />
      }
    >
      <StoreHeaderContent />
    </Suspense>
  );
}
