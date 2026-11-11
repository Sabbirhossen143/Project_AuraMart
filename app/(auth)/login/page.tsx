"use client";

import { useState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/toast";
import {
  getGuestCart,
  clearGuestCart,
} from "@/lib/guest-cart";
import {
  ShoppingBag,
  Eye,
  EyeOff,
  Mail,
  Lock,
  ArrowRight,
  Sparkles,
  ShieldCheck,
} from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
  toast.error("Invalid email or password. Please try again.");
  return;
}

const guestItems = getGuestCart();
const mergeIdKey = "auramart-guest-cart-merge-id";

let mergeId = localStorage.getItem(mergeIdKey);

if (!mergeId) {
  mergeId = crypto.randomUUID();
  localStorage.setItem(mergeIdKey, mergeId);
}

if (guestItems.length > 0) {
  const mergeResponse = await fetch("/api/cart/merge", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
  mergeId,
  items: guestItems,
}),
  });

  const mergeResult = await mergeResponse.json();

  if (!mergeResponse.ok) {
    toast.error(
      mergeResult.message || "Unable to merge your guest cart."
    );
    return;
  }

  clearGuestCart();
localStorage.removeItem(mergeIdKey);
window.dispatchEvent(new Event("cart-updated"));
}

const params = new URLSearchParams(window.location.search);
const callbackUrl = params.get("callbackUrl");

const safeCallbackUrl =
  callbackUrl &&
  callbackUrl.startsWith("/") &&
  !callbackUrl.startsWith("//")
    ? callbackUrl
    : null;

const destination =
  safeCallbackUrl || (guestItems.length > 0 ? "/checkout" : "/");

router.push(destination);
router.refresh();
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="grid min-h-screen bg-white lg:grid-cols-2">
      {/* LEFT PANEL */}
      <section className="relative hidden overflow-hidden bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-900 p-12 text-white lg:flex lg:flex-col lg:justify-between xl:p-16">
        <div className="absolute -right-32 -top-32 h-96 w-96 rounded-full border-[50px] border-white/5" />
        <div className="absolute -bottom-40 -left-24 h-96 w-96 rounded-full bg-violet-400/20 blur-3xl" />

        <Link href="/" className="relative flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 backdrop-blur">
            <ShoppingBag size={25} />
          </div>
          <span className="text-2xl font-black">
            Aura<span className="text-indigo-200">Mart.</span>
          </span>
        </Link>

        <div className="relative max-w-lg">
          <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold">
            <Sparkles size={15} />
            YOUR SHOPPING JOURNEY STARTS HERE
          </div>

          <h1 className="text-5xl font-black leading-tight tracking-tight xl:text-6xl">
            Welcome back to a better way to shop.
          </h1>

          <p className="mt-6 max-w-md text-base leading-8 text-indigo-100">
            Sign in to explore your favorite products, manage your orders
            and enjoy a seamless shopping experience.
          </p>

          <div className="mt-10 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15">
              <ShieldCheck size={25} />
            </div>
            <div>
              <p className="text-sm font-bold">Secure Account Access</p>
              <p className="mt-1 text-xs text-indigo-200">
                Your account information stays protected.
              </p>
            </div>
          </div>
        </div>

        <p className="relative text-xs text-indigo-200">
          © 2026 AuraMart. All rights reserved.
        </p>
      </section>

      {/* RIGHT PANEL */}
      <section className="flex items-center justify-center px-5 py-12 sm:px-10 lg:px-12">
        <div className="w-full max-w-md animate-fade-up">
          <Link
  href="/"
  className="mb-6 inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-600"
>
  <ArrowRight size={16} className="rotate-180" />
  Back to Home
</Link>
          <Link href="/" className="mb-12 flex items-center gap-2 lg:hidden">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white">
              <ShoppingBag size={21} />
            </div>
            <span className="text-xl font-black">
              Aura<span className="text-indigo-600">Mart.</span>
            </span>
          </Link>

          <div className="mb-9">
            <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
              <Lock size={26} />
            </div>

            <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-indigo-600">
              Welcome Back
            </p>

            <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
              Sign in to your account
            </h2>

            <p className="mt-3 text-sm leading-6 text-slate-500">
              Enter your credentials to continue shopping.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="email"
                className="mb-2 block text-xs font-bold text-slate-700"
              >
                Email Address
              </label>

              <div className="relative">
                <Mail
                  size={18}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  autoComplete="email"
                  className="h-13 w-full rounded-xl border border-slate-200 bg-slate-50/70 pl-12 pr-4 text-sm outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-50"
                />
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <label
                  htmlFor="password"
                  className="text-xs font-bold text-slate-700"
                >
                  Password
                </label>
              </div>

              <div className="relative">
                <Lock
                  size={18}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  autoComplete="current-password"
                  className="h-13 w-full rounded-xl border border-slate-200 bg-slate-50/70 pl-12 pr-12 text-sm outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-50"
                />

                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-indigo-600"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="premium-button flex h-13 w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 text-sm font-bold text-white shadow-lg shadow-indigo-200 transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Signing in...
                </>
              ) : (
                <>
                  Sign In <ArrowRight size={17} />
                </>
              )}
            </button>
          </form>

          <div className="my-7 flex items-center gap-4">
            <div className="h-px flex-1 bg-slate-200" />
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              New to AuraMart?
            </span>
            <div className="h-px flex-1 bg-slate-200" />
          </div>

          <Link
            href="/register"
            className="flex h-12 w-full items-center justify-center rounded-xl border border-slate-200 text-sm font-bold text-slate-700 transition hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-600"
          >
            Create an Account
          </Link>

          <p className="mt-8 text-center text-xs text-slate-400">
            By continuing, you agree to our shopping experience and account
            policies.
          </p>
        </div>
      </section>
    </main>
  );
}