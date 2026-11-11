"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { addToGuestCart, getGuestCart } from "@/lib/guest-cart";
import {
  addToGuestWishlist,
  getGuestWishlist,
} from "@/lib/guest-wishlist";
import { signOut } from "next-auth/react";
import { useToast } from "@/components/ui/toast";
import {
  ArrowRight,
  ArrowUpRight,
  Search,
  ShoppingBag,
  ShoppingCart,
  Heart,
  UserRound,
  Menu,
  X,
  Truck,
  ShieldCheck,
  Headphones,
  Package,
  Sparkles,
  Star,
  Zap,
  Plus,
  LayoutGrid,
  LogOut,
  Mail,
  Phone,
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

interface AccountUser {
  id: string;
  name: string;
  email: string;
  role?: string;
  profileImage?: string | null;
  image?: string | null;
  imageUrl?: string | null;
  profileImageUrl?: string | null;
  avatarUrl?: string | null;
}

interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  image: string;
  isActive: boolean;
}

const formatPrice = (price: number) =>
  new Intl.NumberFormat("en-BD", {
    style: "currency",
    currency: "BDT",
    maximumFractionDigits: 0,
  }).format(price);

const getDiscountedPrice = (price: number, discountPercent?: number) =>
  discountPercent && discountPercent > 0
    ? Math.round(price * (1 - discountPercent / 100))
    : price;

const categoryIcons = [Zap, ShoppingBag, Sparkles, Package];

const categoryColors = [
  "from-indigo-500 to-violet-600",
  "from-orange-400 to-rose-500",
  "from-emerald-400 to-teal-600",
  "from-pink-400 to-fuchsia-600",
];

const footerLinkClass =
  "relative inline-flex w-fit text-xs text-slate-500 transition-all duration-300 ease-out hover:translate-x-1 hover:font-semibold hover:text-indigo-600 after:absolute after:-bottom-1 after:left-0 after:h-0.5 after:w-0 after:rounded-full after:bg-indigo-600 after:transition-all after:duration-300 after:content-[''] hover:after:w-full sm:text-sm";

const benefits = [
  {
    icon: Truck,
    title: "Convenient Delivery",
    description: "Get your orders delivered to your doorstep.",
  },
  {
    icon: ShieldCheck,
    title: "Secure Shopping",
    description: "Enjoy a simple and secure shopping experience.",
  },
  {
    icon: Headphones,
    title: "Customer Support",
    description: "We're here to help whenever you need us.",
  },
];

export default function Home() {
  const router = useRouter();
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [loading, setLoading] = useState(true);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const [accountUser, setAccountUser] = useState<AccountUser | null>(null);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [activeNav, setActiveNav] = useState<"home" | "categories" | "products" | "benefits">("home");
  const accountMenuRef = useRef<HTMLDivElement>(null);
  const mobileAccountMenuRef = useRef<HTMLDivElement>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [wishlistIds, setWishlistIds] = useState<string[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [addingProduct, setAddingProduct] = useState("");

  useEffect(() => {
    async function loadStore() {
      try {
        const [productResponse, categoryResponse, cartResponse] =
          await Promise.all([
            fetch("/api/products"),
            fetch("/api/categories"),
            fetch("/api/cart"),
          ]);

        const productJson = await productResponse.json();
        const categoryJson = await categoryResponse.json();

        if (productJson.success) {
          const data = productJson.data;
          setProducts(Array.isArray(data) ? data : data?.items || []);
        }

        if (categoryJson.success) {
          const data = categoryJson.data;
          setCategories(
            (Array.isArray(data) ? data : data?.items || []).filter(
              (item: Category) => item.isActive
            )
          );
        }

        if (cartResponse.ok) {
  const cartJson = await cartResponse.json();
  setCartCount(cartJson.data?.totalItems || 0);
} else {
  const guestItems = getGuestCart();
  setCartCount(
    guestItems.reduce((total, item) => total + item.quantity, 0)
  );
}
      } catch (error) {
        console.error("Store loading error:", error);
      } finally {
        setLoading(false);
      }
    }

    loadStore();
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
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!accountMenuOpen) return;

    function handleOutsidePointerDown(event: PointerEvent) {
      const target = event.target;
      if (
        target instanceof Node &&
        !accountMenuRef.current?.contains(target) &&
        !mobileAccountMenuRef.current?.contains(target)
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


  useEffect(() => {
  async function loadWishlist() {
    try {
      const response = await fetch("/api/wishlist", {
        cache: "no-store",
      });

      if (response.status === 401) {
        const guestItems = getGuestWishlist();
        setWishlistIds(guestItems.map((item) => item.productId));
        return;
      }

      if (!response.ok) return;

      const result = await response.json();
      const wishlistItems = Array.isArray(result.data)
        ? result.data
        : [];

      setWishlistIds(
        wishlistItems.map(
          (item: { productId: string }) => item.productId
        )
      );
    } catch (error) {
      console.error("Wishlist loading error:", error);
    }
  }

  loadWishlist();
}, []);

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesSearch =
        product.name.toLowerCase().includes(search.toLowerCase()) ||
        product.description.toLowerCase().includes(search.toLowerCase());

      const matchesCategory =
        !selectedCategory || product.categoryId === selectedCategory;

      return matchesSearch && matchesCategory;
    });
  }, [products, search, selectedCategory]);


  async function handleAddToCart(productId: string) {
  setAddingProduct(productId);

  try {
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

    // Guest user: save product in localStorage
    if (response.status === 401) {
      addToGuestCart(productId, 1);

      const guestItems = getGuestCart();
      setCartCount(
        guestItems.reduce((total, item) => total + item.quantity, 0)
      );

      window.dispatchEvent(new Event("cart-updated"));
      toast.success("Product added to your cart!");
      return;
    }

    const result = await response.json();

    if (!response.ok) {
      toast.error(result.message || "Unable to add product.");
      return;
    }

    // Logged-in user: refresh DynamoDB cart count
    const cartResponse = await fetch("/api/cart", {
      cache: "no-store",
    });

    if (cartResponse.ok) {
      const cartJson = await cartResponse.json();
      setCartCount(cartJson.data?.totalItems || 0);
    }

    window.dispatchEvent(new Event("cart-updated"));
    toast.success("Product added to your cart!");
  } catch {
    toast.error("Something went wrong. Please try again.");
  } finally {
    setAddingProduct("");
  }
}

  async function handleAddToWishlist(productId: string) {
  if (wishlistIds.includes(productId)) return;

  try {
    const response = await fetch("/api/wishlist", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ productId }),
    });

    // Guest user: save wishlist in localStorage
    if (response.status === 401) {
      addToGuestWishlist(productId);
      setWishlistIds((ids) => [...ids, productId]);
      toast.success("Added to your wishlist!");
      return;
    }

    const result = await response.json();

    if (!response.ok) {
      toast.error(result.message || "Unable to save this product.");
      return;
    }

    setWishlistIds((ids) => [...ids, productId]);
    toast.success("Added to your wishlist!");
  } catch {
    toast.error("Unable to save this product.");
  }
}

  function openCategory(categoryId: string) {
    setSelectedCategory(categoryId);
    document.getElementById("products")?.scrollIntoView({
      behavior: "smooth",
    });
  }

  function clearFilters() {
    setSearch("");
    setSelectedCategory("");
  }

  return (
    <main id="top" className="min-h-screen overflow-x-clip bg-white text-slate-900">
      {/* ANNOUNCEMENT BAR */}
      <div className="relative overflow-hidden bg-slate-950 px-3 py-2.5 text-center text-[11px] font-medium tracking-wide text-white sm:text-xs">
        <span className="inline-flex flex-wrap items-center justify-center gap-x-2 gap-y-1">
          <Sparkles size={13} className="text-amber-300" />
          Enjoy free shipping on orders over ৳3,000
          <a
            href="#products"
            className="font-bold text-indigo-300 transition hover:text-white"
          >
            Shop now <ArrowRight className="ml-1 inline h-3 w-3" />
          </a>
        </span>
      </div>

      {/* NAVBAR */}
      <header className="sticky top-0 z-50 border-b border-slate-100/80 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex h-[68px] max-w-7xl items-center justify-between gap-3 px-4 sm:h-[76px] sm:px-6 lg:px-8">
          <Link href="/" className="group flex shrink-0 items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-700 text-white shadow-lg shadow-indigo-200 transition duration-300 group-hover:rotate-[-8deg] group-hover:scale-105 sm:h-11 sm:w-11">
              <ShoppingBag size={22} strokeWidth={2.2} />
            </div>
            <span className="text-[21px] font-black tracking-tight sm:text-2xl">
              Aura<span className="text-indigo-600">Mart.</span>
            </span>
          </Link>

          <nav className="hidden items-center gap-2 rounded-full border border-slate-100 bg-slate-50/80 p-1.5 text-[13px] font-bold lg:flex">
            {([
              { key: "home", label: "Home", href: "#top" },
              { key: "categories", label: "Categories", href: "#categories" },
              { key: "products", label: "Products", href: "#products" },
              { key: "benefits", label: "Why AuraMart", href: "#benefits" },
            ] as const).map((item) => (
              <a
                key={item.key}
                href={item.href}
                onClick={() => setActiveNav(item.key)}
                aria-current={activeNav === item.key ? "page" : undefined}
                className={`rounded-full px-4 py-2 transition-all duration-300 ${
                  activeNav === item.key
                    ? "bg-gradient-to-r from-indigo-600 to-violet-600 !text-white shadow-md shadow-indigo-200"
                    : "text-slate-500 hover:-translate-y-0.5 hover:bg-white hover:text-indigo-700 hover:shadow-sm"
                }`}
              >
                {item.label}
              </a>
            ))}
          </nav>

          <div className="hidden items-center gap-4 md:flex">
            <div className="group relative">
              <Search
                size={17}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 transition group-focus-within:text-indigo-600"
              />
              <input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  document.getElementById("products")?.scrollIntoView({
                    behavior: "smooth",
                  });
                }}
                placeholder="Search products..."
                aria-label="Search products"
                className="h-10 w-44 rounded-full border border-slate-200 bg-slate-50/80 pl-10 pr-4 text-xs outline-none transition-all duration-300 placeholder:text-slate-400 focus:w-56 focus:border-indigo-300 focus:bg-white focus:ring-4 focus:ring-indigo-50 lg:w-48 lg:focus:w-60"
              />
            </div>

            <Link
              href="/wishlist"
              aria-label="Wishlist"
              className="relative rounded-full p-2 text-slate-500 transition hover:bg-rose-50 hover:text-rose-500"
            >
              <Heart size={20} />
              {wishlistIds.length > 0 && (
                <span className="absolute right-0 top-0 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white">
                  {wishlistIds.length}
                </span>
              )}
            </Link>

            {authLoading ? (
              <span className="h-10 w-10 animate-pulse rounded-full bg-slate-100" />
            ) : accountUser ? (
              <div ref={accountMenuRef} className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenu(false);
                    setAccountMenuOpen((open) => !open);
                  }}
                  aria-label="Open account menu"
                  aria-expanded={accountMenuOpen}
                  className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full border-2 border-white bg-gradient-to-br from-indigo-500 to-violet-600 p-[2px] text-sm font-bold text-white shadow-lg shadow-indigo-200 ring-2 ring-indigo-100 transition duration-300 hover:scale-105 hover:ring-indigo-300"
                >
                  {(accountUser.profileImage || accountUser.profileImageUrl || accountUser.avatarUrl || accountUser.imageUrl || accountUser.image) ? (
                    <img
                      src={accountUser.profileImage || accountUser.profileImageUrl || accountUser.avatarUrl || accountUser.imageUrl || accountUser.image || ""}
                      alt={accountUser.name || "Profile"}
                      className="h-full w-full rounded-full object-cover"
                    />
                  ) : (
                    (accountUser.name || "U").trim().charAt(0).toUpperCase()
                  )}
                </button>
                {accountMenuOpen && (
                  <div className="absolute right-0 top-14 z-[70] w-64 origin-top-right overflow-hidden rounded-3xl border border-white/80 bg-white/95 p-2 shadow-2xl shadow-slate-900/15 ring-1 ring-slate-200/70 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150">
                    <div className="mb-1 rounded-2xl bg-gradient-to-br from-indigo-50 via-white to-violet-50 px-3 py-3">
                      <p className="truncate text-sm font-bold text-slate-900">{accountUser.name}</p>
                      <p className="truncate text-xs text-slate-500">{accountUser.email}</p>
                    </div>
                    <Link href="/account" onClick={() => setAccountMenuOpen(false)} className="mt-1 flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-700 transition-all duration-200 hover:translate-x-0.5 hover:bg-indigo-50 hover:text-indigo-700">
                      <LayoutGrid size={16} /> Dashboard
                    </Link>
                    <Link href="/account/profile" onClick={() => setAccountMenuOpen(false)} className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-700 transition-all duration-200 hover:translate-x-0.5 hover:bg-indigo-50 hover:text-indigo-700">
                      <UserRound size={16} /> My Profile
                    </Link>
                    <Link href="/account/orders" onClick={() => setAccountMenuOpen(false)} className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-700 transition-all duration-200 hover:translate-x-0.5 hover:bg-indigo-50 hover:text-indigo-700">
                      <Package size={16} /> My Orders
                    </Link>
                    <Link href="/wishlist" onClick={() => setAccountMenuOpen(false)} className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-700 transition-all duration-200 hover:translate-x-0.5 hover:bg-indigo-50 hover:text-indigo-700">
                      <Heart size={16} /> My Wishlist
                    </Link>
                    <button type="button" onClick={() => signOut({ callbackUrl: "/" })} className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-bold text-rose-600 transition-all duration-200 hover:translate-x-0.5 hover:bg-rose-50">
                      <LogOut size={16} /> Sign Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link href="/login" className="inline-flex h-10 items-center gap-2 rounded-full border border-indigo-100 bg-white px-4 text-sm font-bold text-indigo-700 shadow-sm transition hover:border-indigo-200 hover:bg-indigo-50">
                <UserRound size={17} /> Sign In
              </Link>
            )}

            <Link
  href="/cart"
  aria-label="Shopping cart"
  className="relative inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-200 transition-all duration-300 hover:-translate-y-0.5 hover:from-indigo-700 hover:to-violet-700 hover:shadow-lg"
>
  <ShoppingCart
    size={20}
    strokeWidth={2.2}
    className="text-white"
  />

  {cartCount > 0 && (
    <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-white bg-rose-500 px-1 text-[9px] font-extrabold text-white">
      {cartCount}
    </span>
  )}
</Link>
</div>

<div className="flex items-center gap-2.5 md:hidden">
<Link
  href="/wishlist"
  aria-label="Wishlist"
  className="relative inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-slate-500 transition hover:bg-rose-50 hover:text-rose-500"
>
  <Heart size={20} />
  {wishlistIds.length > 0 && (
    <span className="absolute right-0 top-0 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white">
      {wishlistIds.length}
    </span>
  )}
</Link>
{!authLoading && accountUser && (
  <div ref={mobileAccountMenuRef} className="relative">
    <button
      type="button"
      onClick={() => {
        setMobileMenu(false);
        setAccountMenuOpen((open) => !open);
      }}
      aria-label="Open account menu"
      aria-expanded={accountMenuOpen}
      className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border-2 border-white bg-gradient-to-br from-indigo-500 to-violet-600 p-[2px] text-sm font-bold text-white shadow-md shadow-indigo-200 ring-2 ring-indigo-100 transition hover:scale-105"
    >
      {accountUser.profileImage || accountUser.profileImageUrl || accountUser.avatarUrl || accountUser.imageUrl || accountUser.image ? (
        <img src={accountUser.profileImage || accountUser.profileImageUrl || accountUser.avatarUrl || accountUser.imageUrl || accountUser.image || ""} alt={accountUser.name || "Profile"} className="h-full w-full rounded-full object-cover" />
      ) : (
        (accountUser.name || "U").trim().charAt(0).toUpperCase()
      )}
    </button>

    {accountMenuOpen && (
      <div className="absolute right-0 top-12 z-[80] w-64 origin-top-right overflow-hidden rounded-3xl border border-white/80 bg-white/95 p-2 shadow-2xl shadow-slate-900/20 ring-1 ring-slate-200/70 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150">
        <div className="mb-1 rounded-2xl bg-gradient-to-br from-indigo-50 via-white to-violet-50 px-3 py-3">
          <p className="truncate text-sm font-bold text-slate-900">{accountUser.name}</p>
          <p className="truncate text-xs text-slate-500">{accountUser.email}</p>
        </div>
        <Link href="/account" onClick={() => setAccountMenuOpen(false)} className="mt-1 flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-700 transition-all duration-200 hover:translate-x-0.5 hover:bg-indigo-50 hover:text-indigo-700">
          <LayoutGrid size={16} /> Dashboard
        </Link>
        <Link href="/account/profile" onClick={() => setAccountMenuOpen(false)} className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-700 transition-all duration-200 hover:translate-x-0.5 hover:bg-indigo-50 hover:text-indigo-700">
          <UserRound size={16} /> My Profile
        </Link>
        <Link href="/account/orders" onClick={() => setAccountMenuOpen(false)} className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-700 transition-all duration-200 hover:translate-x-0.5 hover:bg-indigo-50 hover:text-indigo-700">
          <Package size={16} /> My Orders
        </Link>
        <Link href="/wishlist" onClick={() => setAccountMenuOpen(false)} className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-700 transition-all duration-200 hover:translate-x-0.5 hover:bg-indigo-50 hover:text-indigo-700">
          <Heart size={16} /> My Wishlist
        </Link>
        <button type="button" onClick={() => signOut({ callbackUrl: "/" })} className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-bold text-rose-600 transition-all duration-200 hover:translate-x-0.5 hover:bg-rose-50">
          <LogOut size={16} /> Sign Out
        </button>
      </div>
    )}
  </div>
)}
<Link
  href="/cart"
  aria-label="Shopping cart"
  className="relative inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-full bg-indigo-600 bg-gradient-to-r from-indigo-600 to-violet-600 px-3.5 text-white shadow-md shadow-indigo-200 transition-all duration-300 hover:-translate-y-0.5 hover:from-indigo-700 hover:to-violet-700 hover:shadow-lg"
>
  <ShoppingCart
    size={20}
    strokeWidth={2.2}
    className="shrink-0 text-white"
  />

  {cartCount > 0 && (
    <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-white bg-rose-500 px-1 text-[9px] font-extrabold text-white">
      {cartCount}
    </span>
  )}
</Link>
            <button
              onClick={() => {
                setAccountMenuOpen(false);
                setMobileMenu((open) => !open);
              }}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-indigo-100 bg-gradient-to-br from-white to-indigo-50 text-indigo-700 shadow-sm transition-all duration-300 hover:border-indigo-200 hover:bg-indigo-100 hover:shadow-md active:scale-95"
              aria-label="Toggle navigation menu"
              aria-expanded={mobileMenu}
            >
              {mobileMenu ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>

        {/* MOBILE MENU */}
        {mobileMenu && (
          <div className="animate-fade-in border-t border-indigo-100/80 bg-gradient-to-br from-white via-white to-indigo-50/70 px-4 pb-5 pt-4 shadow-[0_16px_40px_-15px_rgba(79,70,229,0.20)] md:hidden">
            <div className="relative mb-4">
              <Search
                size={17}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search products..."
                className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm outline-none focus:border-indigo-400"
              />
            </div>

            {accountUser && (
              <div className="mb-4 flex items-center gap-3 rounded-2xl border border-indigo-100 bg-gradient-to-r from-indigo-50 via-white to-violet-50 p-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-white bg-gradient-to-br from-indigo-500 to-violet-600 text-sm font-bold text-white shadow-md ring-2 ring-indigo-100">
                  {accountUser.profileImage || accountUser.profileImageUrl || accountUser.avatarUrl || accountUser.imageUrl || accountUser.image ? (
                    <img src={accountUser.profileImage || accountUser.profileImageUrl || accountUser.avatarUrl || accountUser.imageUrl || accountUser.image || ""} alt={accountUser.name || "Profile"} className="h-full w-full object-cover" />
                  ) : (
                    (accountUser.name || "U").trim().charAt(0).toUpperCase()
                  )}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-extrabold text-slate-900">{accountUser.name}</p>
                  <p className="truncate text-xs text-slate-500">{accountUser.email}</p>
                </div>
              </div>
            )}

            <nav className="grid grid-cols-2 gap-2.5 text-sm font-semibold">
  {([
    { key: "home", label: "Home", href: "#top" },
    { key: "categories", label: "Categories", href: "#categories" },
    { key: "products", label: "Products", href: "#products" },
    { key: "benefits", label: "Why AuraMart", href: "#benefits" },
  ] as const).map((item) => (
    <a
      key={item.key}
      href={item.href}
      onClick={() => {
        setActiveNav(item.key);
        setMobileMenu(false);
      }}
      className={`flex items-center justify-between rounded-xl border px-4 py-3 shadow-sm transition-all duration-300 active:scale-[0.98] ${
        activeNav === item.key
          ? "border-indigo-200 bg-gradient-to-r from-indigo-600 to-violet-600 !text-white shadow-lg shadow-indigo-200/70"
          : "border-slate-200/80 bg-white/90 text-slate-700 hover:-translate-y-0.5 hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 hover:shadow-md"
      }`}
    >
      {item.label}
      {activeNav === item.key && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
    </a>
  ))}
  <a
      href="#footer"
      onClick={() => {
        setActiveNav("benefits");
        setMobileMenu(false);
      }}
      className={`group flex items-center gap-2 rounded-xl border px-4 py-3 shadow-sm transition-all duration-300 active:scale-[0.98] ${
        activeNav === "benefits"
          ? "border-indigo-200 bg-gradient-to-r from-indigo-600 to-violet-600 !text-white shadow-lg shadow-indigo-200/70"
          : "border-slate-200/80 bg-white/90 text-slate-700 hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"
      }`}
    >
      <Headphones size={17} className={activeNav === "benefits" ? "text-white" : ""} />
      <span className={activeNav === "benefits" ? "!text-white" : ""}>Contact Us</span>
    </a>
</nav>
{accountUser ? (
  <button
    type="button"
    onClick={() => signOut({ callbackUrl: "/" })}
    className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-rose-100 bg-rose-50 text-sm font-bold text-rose-600 transition hover:bg-rose-100"
  >
    <LogOut size={16} /> Sign Out
  </button>
) : (
  <Link
    href="/login"
    onClick={() => setMobileMenu(false)}
    className="mt-4 flex h-12 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-sm font-bold !text-white shadow-lg shadow-indigo-200/70 transition-all duration-300 hover:-translate-y-0.5 hover:from-indigo-700 hover:to-violet-700 hover:shadow-xl active:scale-[0.98]"
  >
    <span className="!text-white">Sign In</span>
    <ArrowRight size={16} className="text-white" />
  </Link>
)}
          </div>
        )}
      </header>

      {/* HERO */}
      <section className="relative isolate overflow-hidden bg-[#f7f7ff]">
        <div className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full bg-violet-200/40 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-40 -left-24 h-96 w-96 rounded-full bg-indigo-200/40 blur-3xl" />

        <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-4 py-14 sm:px-6 sm:py-20 lg:grid-cols-[1.05fr_0.95fr] lg:gap-8 lg:px-8 lg:py-24">
          <div className="animate-slide-left relative z-10">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-white/80 px-4 py-2 text-[10px] font-bold tracking-[0.14em] text-indigo-700 shadow-sm sm:text-xs">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-100">
                <Sparkles size={13} />
              </span>
              YOUR EVERYDAY SHOPPING DESTINATION
            </div>

            <h1 className="max-w-2xl text-[2.65rem] font-black leading-[1.08] tracking-[-0.055em] text-slate-950 sm:text-6xl lg:text-[4.25rem]">
              Find what you love.
              <span className="mt-1 block bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600 bg-clip-text text-transparent">
                Love what you find.
              </span>
            </h1>

            <p className="mt-6 max-w-lg text-sm leading-7 text-slate-600 sm:text-base sm:leading-8">
              Discover products you'll love, enjoy great prices, and make
              every shopping experience effortless with AuraMart.
            </p>

            <div className="mt-8 flex flex-col gap-3 min-[420px]:flex-row">
              <a
                href="#products"
                className="premium-button inline-flex h-12 items-center justify-center gap-2 rounded-full bg-indigo-600 px-7 text-sm font-bold !text-white shadow-xl shadow-indigo-200 transition hover:bg-indigo-700 hover:!text-white"
              >
                Explore Products <ArrowRight size={17} />
              </a>
              <a
                href="#categories"
                className="premium-button inline-flex h-12 items-center justify-center gap-2 rounded-full border border-slate-200 bg-white/80 px-7 text-sm font-bold text-slate-700 transition hover:border-indigo-200 hover:text-indigo-600"
              >
                Browse Categories <LayoutGrid size={16} />
              </a>
            </div>

            <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-4 border-t-2 border-indigo-300 pt-7 sm:mt-12">
  <div>
    <p className="text-xl font-black tracking-tight text-slate-900 sm:text-2xl">
      Quality
    </p>
    <p className="mt-1 text-[11px] text-slate-500 sm:text-xs">
      Products you can trust
    </p>
  </div>

  <div className="h-10 w-[2px] bg-indigo-300" />

  <div>
    <p className="text-xl font-black tracking-tight text-slate-900 sm:text-2xl">
      Value
    </p>
    <p className="mt-1 text-[11px] text-slate-500 sm:text-xs">
      Prices you'll appreciate
    </p>
  </div>

  <div className="h-10 w-[2px] bg-indigo-300" />

  <div>
    <p className="text-xl font-black tracking-tight text-slate-900 sm:text-2xl">
      Simple
    </p>
    <p className="mt-1 text-[11px] text-slate-500 sm:text-xs">
      Shopping made easy
    </p>
  </div>
</div>
          </div>

          {/* HERO VISUAL */}
          <div className="animate-slide-right relative mx-auto flex min-h-[310px] w-full max-w-[540px] items-center justify-center sm:min-h-[440px]">
            <div className="animate-soft-glow absolute h-64 w-64 rounded-full bg-indigo-300/50 blur-3xl sm:h-96 sm:w-96" />

            <div className="animate-float-slow relative flex aspect-square w-[min(66vw,300px)] items-center justify-center rounded-[2.5rem] bg-gradient-to-br from-indigo-500 via-indigo-600 to-violet-800 shadow-2xl shadow-indigo-300/60 sm:w-[340px] sm:rounded-[3.5rem]">
              <div className="absolute inset-3 rounded-[2rem] border border-white/20 sm:inset-4 sm:rounded-[2.8rem]" />
              <div className="absolute left-8 top-8 h-16 w-16 rounded-full border border-white/10 bg-white/10 blur-sm" />
              <div className="relative text-center text-white">
                <div className="mx-auto flex h-28 w-28 items-center justify-center rounded-[2rem] border border-white/20 bg-white/10 shadow-inner backdrop-blur-sm sm:h-36 sm:w-36">
                  <ShoppingBag
                    size={76}
                    strokeWidth={1.1}
                    className="sm:h-24 sm:w-24"
                  />
                </div>
                <p className="mt-5 text-2xl font-black tracking-tight sm:text-3xl">
                  AuraMart
                </p>
                <p className="mt-1 text-xs font-medium tracking-[0.2em] text-indigo-100 sm:text-sm">
                  SHOP YOUR WAY
                </p>
              </div>
              <div className="absolute -bottom-4 -right-4 flex h-16 w-16 rotate-12 items-center justify-center rounded-2xl bg-amber-300 text-slate-950 shadow-xl sm:h-20 sm:w-20">
                <Sparkles size={34} />
              </div>
            </div>

            <div className="animate-float absolute right-0 top-5 flex items-center gap-2.5 rounded-2xl border border-white/70 bg-white/95 p-3 shadow-xl sm:-right-1 sm:top-10 sm:gap-3 sm:p-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 sm:h-11 sm:w-11">
                <Truck size={21} />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900 sm:text-sm">
                  Easy Delivery
                </p>
                <p className="text-[10px] text-slate-500 sm:text-xs">
                  To your doorstep
                </p>
              </div>
            </div>

            <div className="animate-float-slow absolute bottom-5 left-0 flex items-center gap-2.5 rounded-2xl border border-white/70 bg-white/95 p-3 shadow-xl sm:-left-2 sm:bottom-12 sm:gap-3 sm:p-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600 sm:h-11 sm:w-11">
                <Star size={21} />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900 sm:text-sm">
                  Great Value
                </p>
                <p className="text-[10px] text-slate-500 sm:text-xs">
                  Shop with confidence
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* BENEFITS */}
      <section id="benefits" className="border-y border-slate-200 bg-white">
        <div className="mx-auto grid max-w-7xl gap-3 px-4 py-6 sm:grid-cols-3 sm:gap-5 sm:px-6 sm:py-8 lg:px-8">
          {benefits.map((item, index) => (
            <div
              key={item.title}
              className="premium-card flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm transition-all duration-300 hover:border-indigo-200 hover:shadow-lg sm:p-4"
            >
              <div
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${
                  index === 0
                    ? "bg-indigo-50 text-indigo-600"
                    : index === 1
                      ? "bg-emerald-50 text-emerald-600"
                      : "bg-orange-50 text-orange-600"
                }`}
              >
                <item.icon size={23} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  {item.title}
                </h3>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  {item.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CATEGORIES */}
      <section
        id="categories"
        className="mx-auto max-w-7xl scroll-mt-24 px-4 py-16 sm:px-6 sm:py-20 lg:px-8"
      >
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4 sm:mb-10">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[0.22em] text-indigo-600 sm:text-xs">
              Explore More
            </p>
            <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
              Shop by Category
            </h2>
            <p className="mt-2 text-xs text-slate-500 sm:text-sm">
              Find exactly what you're looking for.
            </p>
          </div>
          <span className="rounded-full bg-indigo-50 px-3.5 py-2 text-[11px] font-bold text-indigo-600 sm:text-xs">
            {categories.length} Categories
          </span>
        </div>

        {categories.length > 0 ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4">
            {categories.map((category, index) => {
              const Icon = categoryIcons[index % categoryIcons.length];

              return (
                <button
                  type="button"
                  key={category.id}
                  onClick={() => openCategory(category.id)}
                  className="premium-card group relative overflow-hidden rounded-2xl border border-slate-300 bg-white p-4 text-left shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-indigo-500 hover:shadow-xl sm:rounded-3xl sm:p-6"
                >
                  <div
  className={`relative mb-5 flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br shadow-lg transition duration-300 group-hover:rotate-[-8deg] group-hover:scale-110 sm:h-14 sm:w-14 ${categoryColors[index % categoryColors.length]}`}
>
  {category.image ? (
    <img
      src={category.image}
      alt={category.name}
      loading="lazy"
      onError={(event) => {
        event.currentTarget.style.display = "none";
      }}
      className="h-full w-full object-cover"
    />
  ) : (
    <Icon size={25} className="text-white" />
  )}
</div>
                  <h3 className="line-clamp-1 text-sm font-extrabold text-slate-900 sm:text-base">
                    {category.name}
                  </h3>
                  <p className="mt-1.5 line-clamp-2 min-h-9 text-[11px] leading-5 text-slate-500 sm:text-xs">
                    {category.description || "Explore our collection"}
                  </p>
                  <div className="mt-4 inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 sm:text-xs">
                    Explore Collection
                    <ArrowUpRight
                      size={14}
                      className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                    />
                  </div>
                  <div className="pointer-events-none absolute -bottom-10 -right-10 h-24 w-24 rounded-full bg-indigo-50 opacity-0 blur-2xl transition group-hover:opacity-100" />
                </button>
              );
            })}
          </div>
        ) : (
          <div className="rounded-3xl border border-dashed border-slate-200 py-12 text-center text-sm text-slate-500">
            {loading ? "Loading categories..." : "Categories will appear here soon."}
          </div>
        )}
      </section>

      {/* FEATURED PRODUCTS */}
      <section
        id="products"
        className="scroll-mt-24 bg-slate-50 py-16 sm:py-20"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4 sm:mb-10">
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-[0.22em] text-indigo-600 sm:text-xs">
                Handpicked for you
              </p>
              <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
                Featured Products
              </h2>
              <p className="mt-2 text-xs text-slate-500 sm:text-sm">
                Discover something you'll love.
              </p>
            </div>
            <span className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-bold text-indigo-600 shadow-sm">
              {filteredProducts.length} Products
              <ArrowRight size={15} />
            </span>
          </div>

          {/* ACTIVE FILTERS */}
          {(selectedCategory || search) && (
            <div className="mb-6 flex flex-wrap items-center gap-2">
              {selectedCategory && (
                <span className="rounded-full bg-indigo-100 px-3 py-1.5 text-xs font-semibold text-indigo-700">
                  {categories.find((item) => item.id === selectedCategory)?.name}
                </span>
              )}
              {search && (
                <span className="rounded-full bg-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700">
                  Search: {search}
                </span>
              )}
              <button
                type="button"
                onClick={clearFilters}
                className="text-xs font-bold text-rose-500 transition hover:text-rose-700"
              >
                Clear filters
              </button>
            </div>
          )}

          {loading ? (
            <div className="grid grid-cols-1 gap-4 min-[420px]:grid-cols-2 lg:grid-cols-4 lg:gap-6">
              {[1, 2, 3, 4].map((item) => (
                <div
                  key={item}
                  className="overflow-hidden rounded-3xl border border-slate-100 bg-white"
                >
                  <div className="aspect-[4/3] animate-pulse bg-slate-200" />
                  <div className="space-y-3 p-4">
                    <div className="h-4 w-3/4 animate-pulse rounded bg-slate-200" />
                    <div className="h-3 w-full animate-pulse rounded bg-slate-100" />
                    <div className="h-9 w-full animate-pulse rounded-xl bg-slate-200" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredProducts.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 min-[420px]:grid-cols-2 lg:grid-cols-4 lg:gap-6">
              {filteredProducts.map((product, index) => (
                <article
                  key={product.id}
                  role="button"
                  tabIndex={0}
                  aria-label={`View details for ${product.name}`}
                  onClick={() => router.push(`/products/${product.id}`)}
                  onKeyDown={(event) => {
                    if (event.target !== event.currentTarget) return;
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      router.push(`/products/${product.id}`);
                    }
                  }}
                  className="premium-card group cursor-pointer overflow-hidden rounded-2xl border-2 border-slate-300 bg-white shadow-sm transition-all duration-300 hover:!transform-none hover:border-indigo-500 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 sm:rounded-3xl"
                  style={{ animationDelay: `${index * 80}ms` }}
                >
                
                
<div className="relative isolate flex aspect-[4/3] items-center justify-center overflow-hidden bg-gradient-to-br from-indigo-50 via-slate-50 to-violet-100">

  {/* Image Background */}
  <div className="absolute inset-0 z-0 bg-gradient-to-br from-indigo-50 to-violet-100" />

  {/* Product Image */}
  {product.imageUrl ? (
    <img
      src={product.imageUrl}
      alt={product.name}
      loading="lazy"
      onError={(e) => {
        e.currentTarget.style.display = "none";
      }}
      className="premium-image absolute inset-0 z-0 h-full w-full object-cover"
    />
  ) : (
    <div className="relative z-0 flex h-24 w-24 items-center justify-center rounded-[2rem] border border-white/80 bg-white/60 text-indigo-300 shadow-sm backdrop-blur-sm sm:h-28 sm:w-28">
      <ShoppingBag size={54} strokeWidth={1.1} />
    </div>
  )}

  {/* Featured Badge */}
  <span className="absolute left-3 top-3 z-10 rounded-full border border-white/80 bg-white/95 px-3 py-1.5 text-[9px] font-extrabold uppercase tracking-wider text-indigo-600 shadow-md backdrop-blur-md sm:text-[10px]">
    Featured
  </span>

  {/* Wishlist Button */}
  <button
    type="button"
    aria-label={
      wishlistIds.includes(product.id)
        ? "Already in wishlist"
        : "Add to wishlist"
    }
    disabled={wishlistIds.includes(product.id)}
    onClick={(event) => {
      event.stopPropagation();
      void handleAddToWishlist(product.id);
    }}
    className={`absolute right-3 top-3 z-10 flex h-10 w-10 items-center justify-center rounded-full border border-white/80 bg-white/95 shadow-lg backdrop-blur-md transition-all duration-300 hover:scale-110 hover:bg-rose-50 ${
      wishlistIds.includes(product.id)
        ? "text-rose-500"
        : "text-slate-600 hover:text-rose-500"
    }`}
  >
    <Heart
      size={19}
      fill={
        wishlistIds.includes(product.id)
          ? "currentColor"
          : "none"
      }
    />
  </button>

  {/* Stock Badge */}
  {product.stock <= 0 && (
    <span className="absolute bottom-3 left-3 z-10 rounded-full bg-slate-950/90 px-3 py-1.5 text-[10px] font-bold text-white shadow-lg backdrop-blur-md">
      Out of Stock
    </span>
  )}

  {product.discountPercent && product.discountPercent > 0 ? (
    <span className="absolute bottom-3 right-3 z-10 inline-flex items-center rounded-full border border-rose-200/80 bg-gradient-to-r from-rose-600 to-orange-500 px-3 py-1.5 text-[10px] font-black tracking-wide text-white shadow-lg shadow-rose-200/60 sm:text-xs">
      {product.discountPercent}% OFF
    </span>
  ) : null}

</div>


                  <div className="p-4 sm:p-5">
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
                        className={`inline-flex items-center gap-1 text-[10px] font-bold ${
                          product.stock > 0
                            ? "text-emerald-600"
                            : "text-rose-500"
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
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
    void handleAddToCart(product.id);
  }}
  disabled={
    product.stock <= 0 ||
    addingProduct === product.id
  }
  className="group premium-button relative mt-5 flex h-12 w-full items-center justify-between gap-3 overflow-hidden rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-600 to-violet-600 px-3.5 text-sm font-bold text-white shadow-lg shadow-indigo-200/70 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-indigo-300/60 active:translate-y-0 disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-60 disabled:shadow-none"
>
  {/* Button Shine Effect */}
  <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/15 to-transparent transition-transform duration-700 group-hover:translate-x-full" />

  {/* Cart Icon */}
  <span className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/15 transition-colors group-hover:bg-white/25">
    {addingProduct === product.id ? (
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
    ) : (
      <ShoppingCart size={17} />
    )}
  </span>

  {/* Button Text */}
  <span className="relative flex-1 text-center">
    {addingProduct === product.id
      ? "Adding to Cart..."
      : product.stock <= 0
        ? "Out of Stock"
        : "Add to Cart"}
  </span>

  {/* Arrow Icon */}
  <span className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/15 transition-all duration-300 group-hover:translate-x-0.5 group-hover:bg-white/25">
    <Plus size={17} />
  </span>
</button>

                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="rounded-3xl border border-dashed border-slate-200 bg-white px-5 py-14 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-400">
                <Package size={32} />
              </div>
              <h3 className="mt-5 text-base font-extrabold text-slate-900">
                No products found
              </h3>
              <p className="mx-auto mt-2 max-w-sm text-xs leading-6 text-slate-500 sm:text-sm">
  {selectedCategory
    ? `No products available in ${
        categories.find((item) => item.id === selectedCategory)?.name || "this category"
      } category. Please check back later.`
    : search
      ? "No products match your search. Try another keyword."
      : "Products will appear here when they become available."}
</p>
              {(search || selectedCategory) && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="premium-button mt-5 inline-flex h-10 items-center gap-2 rounded-full bg-indigo-600 px-5 text-xs font-bold text-white hover:bg-indigo-700"
                >
                  Show all products <ArrowRight size={14} />
                </button>
              )}
            </div>
          )}
        </div>
      </section>

      {/* CTA */}
      <section className="px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="relative mx-auto max-w-7xl overflow-hidden rounded-[2rem] bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-800 px-6 py-12 text-center text-white shadow-2xl shadow-indigo-200 sm:rounded-[2.5rem] sm:px-12 sm:py-16 lg:flex lg:items-center lg:justify-between lg:gap-8 lg:text-left">
          <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full border-[35px] border-white/5" />
          <div className="pointer-events-none absolute -bottom-32 left-1/3 h-72 w-72 rounded-full bg-violet-400/20 blur-3xl" />

          <div className="relative">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.22em] text-indigo-200 sm:text-xs">
              A better way to shop
            </p>
            <h2 className="mt-3 text-2xl font-black tracking-tight sm:text-3xl lg:text-4xl">
              Your next favorite find is waiting.
            </h2>
            <p className="mt-3 text-xs leading-6 text-indigo-100 sm:text-sm">
              Explore the AuraMart collection and find something special today.
            </p>
          </div>

          <a
  href="#products"
  className="premium-button relative mt-7 inline-flex h-12 items-center justify-center gap-2 rounded-full bg-white px-7 text-sm font-extrabold !text-black shadow-lg transition hover:bg-indigo-50 hover:!text-black lg:mt-0"
>
  <span className="!text-black">Start Shopping</span>
  <ArrowRight size={17} className="!text-black" />
</a>
        </div>
      </section>

      {/* FOOTER */}
      <footer id="footer" className="scroll-mt-24 border-t border-slate-200 bg-gradient-to-b from-white to-slate-50">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:grid-cols-2 sm:px-6 lg:grid-cols-[1.2fr_0.8fr_1.2fr] lg:gap-12 lg:px-8">
          {/* BRAND */}
          <div>
            <Link href="/" className="group flex items-center gap-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-700 text-white shadow-lg shadow-indigo-200 transition duration-300 group-hover:-rotate-6 group-hover:scale-105">
                <ShoppingBag size={20} />
              </div>
              <span className="text-xl font-black tracking-tight">
                Aura<span className="text-indigo-600">Mart.</span>
              </span>
            </Link>
            <p className="mt-4 max-w-xs text-xs leading-7 text-slate-500 sm:text-sm">
              Making everyday shopping simple, enjoyable and convenient.
              Find what you love, all in one place.
            </p>
            <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700">
              <ShieldCheck size={15} /> Shop with confidence
            </div>
          </div>

          {/* EXPLORE */}
          <div>
            <h3 className="text-sm font-extrabold text-slate-900">Explore</h3>
            <div className="mt-5 flex flex-col gap-3 text-xs sm:text-sm">
              <a href="#top" className={footerLinkClass}>Home</a>
              <a href="#categories" className={footerLinkClass}>Categories</a>
              <a href="#products" className={footerLinkClass}>Featured Products</a>
              <a href="#benefits" className={footerLinkClass}>Why AuraMart</a>
            </div>
          </div>

          {/* CONTACT */}

          <div>
            <h3 className="text-sm font-extrabold text-slate-900">Contact Us</h3>
            <p className="mt-4 text-xs leading-6 text-slate-500 sm:text-sm">
              Have a question about an order or product? Get in touch with our team.
            </p>
            <div className="mt-5 space-y-3">
              {/* Replace these placeholders with AuraMart's real contact details. */}
              <a href="mailto:your-email@gmail.com" className="group flex items-center gap-3 text-xs text-slate-600 transition hover:text-indigo-700 sm:text-sm">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 transition group-hover:bg-indigo-600 group-hover:text-white"><Mail size={16} /></span>
                <span>sabbirhosssen1430@gmail.com</span>
              </a>
              <a href="tel:+8801XXXXXXXXX" className="group flex items-center gap-3 text-xs text-slate-600 transition hover:text-indigo-700 sm:text-sm">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 transition group-hover:bg-indigo-600 group-hover:text-white"><Phone size={16} /></span>
                <span>+880 1308-772842</span>
              </a>
            </div>
            <div className="mt-5 flex items-center gap-2">
              <a href="https://www.facebook.com/your-page" target="_blank" rel="noreferrer" aria-label="AuraMart on Facebook" className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:-translate-y-1 hover:border-indigo-200 hover:bg-indigo-600 hover:text-white"><span className="text-base font-black leading-none">f</span></a>
              <a href="https://www.instagram.com/your-page" target="_blank" rel="noreferrer" aria-label="AuraMart on Instagram" className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:-translate-y-1 hover:border-pink-200 hover:bg-gradient-to-br hover:from-fuchsia-500 hover:to-orange-400 hover:text-white"><span className="text-base font-black leading-none">◎</span></a>
              <a href="https://www.youtube.com/@your-channel" target="_blank" rel="noreferrer" aria-label="AuraMart on YouTube" className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:-translate-y-1 hover:border-red-200 hover:bg-red-600 hover:text-white"><span className="text-[11px] font-black leading-none">▶</span></a>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-200 bg-white/70">
          <div className="mx-auto flex max-w-7xl flex-col justify-between gap-2 px-4 py-5 text-center text-[10px] text-slate-400 sm:flex-row sm:px-6 sm:text-left sm:text-xs lg:px-8">
            <p>© 2026 AuraMart. All rights reserved.</p>
            <p>Designed with care for a better shopping experience.</p>
          </div>
        </div>
      </footer>

      {/* PREMIUM PRODUCT DETAILS POPUP */}
{selectedProduct && (
  <div
    className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/70 p-3 backdrop-blur-sm sm:p-6"
    onClick={() => setSelectedProduct(null)}
  >
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="product-dialog-title"
      onClick={(e) => e.stopPropagation()}
      className="animate-fade-up relative max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-[2rem] border border-white/60 bg-white shadow-2xl"
    >
      {/* Close Button */}
      <button
        type="button"
        onClick={() => setSelectedProduct(null)}
        aria-label="Close product details"
        className="absolute right-4 top-4 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-white text-slate-700 shadow-lg transition hover:rotate-90 hover:bg-rose-500 hover:text-white"
      >
        <X size={20} />
      </button>

      <div className="grid md:grid-cols-2">

        {/* Product Image */}
        <div className="relative flex min-h-[280px] items-center justify-center overflow-hidden bg-gradient-to-br from-indigo-50 via-white to-violet-100 md:min-h-[450px]">
          {selectedProduct.imageUrl ? (
            <img
              src={selectedProduct.imageUrl}
              alt={selectedProduct.name}
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-28 w-28 items-center justify-center rounded-3xl bg-white text-indigo-400 shadow-xl">
              <ShoppingBag size={55} />
            </div>
          )}

          <span className="absolute bottom-4 left-4 rounded-full border border-white/80 bg-white/90 px-4 py-2 text-[10px] font-extrabold uppercase tracking-wider text-indigo-600 shadow-lg">
            AuraMart Exclusive
          </span>
        </div>

        {/* Product Information */}
        <div className="flex flex-col justify-center p-6 sm:p-8">

          <span className="mb-4 w-fit rounded-full bg-indigo-50 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wider text-indigo-600">
            {categories.find(
              (item) => item.id === selectedProduct.categoryId
            )?.name || "Featured Product"}
          </span>

          <h2
            id="product-dialog-title"
            className="text-2xl font-black leading-tight tracking-tight text-slate-950 sm:text-3xl"
          >
            {selectedProduct.name}
          </h2>

          <p className="mt-4 text-sm leading-7 text-slate-500">
            {selectedProduct.description}
          </p>

          <div className="my-6 border-y border-slate-200 py-5">
            <p className="text-xs font-semibold text-slate-400">
              Price
            </p>

            {selectedProduct.discountPercent && selectedProduct.discountPercent > 0 ? (
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <p className="text-3xl font-black text-rose-600">
                  {formatPrice(
                    getDiscountedPrice(
                      selectedProduct.price,
                      selectedProduct.discountPercent
                    )
                  )}
                </p>
                <p className="text-lg font-semibold text-slate-400 line-through">
                  {formatPrice(selectedProduct.price)}
                </p>
                <span className="rounded-full bg-rose-100 px-3 py-1.5 text-xs font-black text-rose-600">
                  {selectedProduct.discountPercent}% OFF
                </span>
              </div>
            ) : (
              <p className="mt-1 text-3xl font-black text-indigo-600">
                {formatPrice(selectedProduct.price)}
              </p>
            )}

            <div className="mt-4 flex items-center gap-2">
              <span
                className={`h-2.5 w-2.5 rounded-full ${
                  selectedProduct.stock > 0
                    ? "bg-emerald-500"
                    : "bg-rose-500"
                }`}
              />

              <span
                className={`text-xs font-bold ${
                  selectedProduct.stock > 0
                    ? "text-emerald-600"
                    : "text-rose-500"
                }`}
              >
                {selectedProduct.stock > 0
                  ? `${selectedProduct.stock} Items Available`
                  : "Out of Stock"}
              </span>
            </div>
          </div>

          {/* Add to Cart */}
          <button
            type="button"
            disabled={
              selectedProduct.stock <= 0 ||
              addingProduct === selectedProduct.id
            }
            onClick={() => {
              const productId = selectedProduct.id;
              setSelectedProduct(null);
              void handleAddToCart(productId);
            }}
            className="premium-button flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-sm font-bold text-white shadow-lg shadow-indigo-200 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl disabled:opacity-50"
          >
            <ShoppingCart size={18} />
            Add to Cart
            <ArrowRight size={17} />
          </button>

          <p className="mt-4 text-center text-[11px] text-slate-400">
            Secure shopping experience with AuraMart.
          </p>
        </div>
      </div>
    </div>
  </div>
)}

    </main>
  );
}