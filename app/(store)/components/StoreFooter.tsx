"use client";

import Link from "next/link";
import {
  ShoppingBag,
  ArrowUpRight,
  ShieldCheck,
  Truck,
  Headphones,
  Heart,
  Mail,
  Phone,
  Sparkles,
} from "lucide-react";

const exploreLinks = [
  { label: "Home", href: "/" },
  { label: "Categories", href: "/#categories" },
  { label: "Featured Products", href: "/#products" },
  { label: "Why AuraMart", href: "/#benefits" },
];

// Replace these placeholders with AuraMart's real contact details and social pages.
const contactLinks = {
  email: "sabbirhossen1430@gmail.com",
  phone: "+8801308772842",
};

const socialLinks = [
  {
    label: "Facebook",
    href: "https://facebook.com/your-page",
    mark: "f",
  },
  {
    label: "Instagram",
    href: "https://instagram.com/your-page",
    mark: "◎",
  },
  {
    label: "YouTube",
    href: "https://youtube.com/@your-channel",
    mark: "▶",
  },
];

export default function StoreFooter() {
  return (
    <footer
      id="contact"
      className="relative isolate overflow-hidden border-t border-slate-100 bg-white text-slate-600"
    >
      {/* Subtle background accents */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-28 -top-36 h-80 w-80 rounded-full bg-indigo-100/70 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-40 left-[-5rem] h-80 w-80 rounded-full bg-violet-100/60 blur-3xl"
      />

      <div className="relative mx-auto max-w-7xl px-4 pb-7 pt-12 sm:px-6 sm:pt-16 lg:px-8">
        {/* Main footer content */}
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.45fr_0.9fr_1.1fr_1fr] lg:gap-12">
          {/* Brand */}
          <div>
            <Link href="/" className="group inline-flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-lg shadow-indigo-200 transition duration-300 group-hover:-rotate-6 group-hover:scale-105">
                <ShoppingBag size={22} strokeWidth={2.1} />
              </span>
              <span className="text-2xl font-black tracking-tight text-slate-900">
                Aura<span className="text-indigo-600">Mart.</span>
              </span>
            </Link>

            <p className="mt-5 max-w-sm text-sm leading-7 text-slate-500">
              Making everyday shopping simple, enjoyable and convenient.
              Discover quality products and find something special at AuraMart.
            </p>

            <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-3.5 py-2 text-xs font-semibold text-emerald-700">
              <ShieldCheck size={15} />
              Shop with confidence
            </div>


            <div className="mt-6 flex items-center gap-2.5">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={social.label}
                  title={social.label}
                  className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-sm font-black text-slate-500 transition hover:-translate-y-1 hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"
                >
                  {social.mark}
                </a>
              ))}
            </div>
          </div>

          {/* Explore */}
          <div>
            <h3 className="text-sm font-extrabold tracking-wide text-slate-900">
              Explore
            </h3>
            <ul className="mt-5 space-y-3.5">
              {exploreLinks.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="group inline-flex items-center gap-1.5 text-sm text-slate-500 transition hover:translate-x-1 hover:text-indigo-600"
                  >
                    {link.label}
                    <ArrowUpRight
                      size={13}
                      className="opacity-0 transition group-hover:opacity-100"
                    />
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-sm font-extrabold tracking-wide text-slate-900">
              Contact Us
            </h3>
            <p className="mt-5 max-w-xs text-sm leading-6 text-slate-500">
              Have a question or need help with your order? Get in touch with us.
            </p>

            <div className="mt-5 space-y-4">
              <a
                href={`mailto:${contactLinks.email}`}
                className="group flex items-start gap-3 text-sm text-slate-500 transition hover:text-indigo-600"
              >
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 transition group-hover:bg-indigo-100">
                  <Mail size={16} />
                </span>
                <span className="min-w-0">
                  <span className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    Email
                  </span>
                  <span className="mt-1 block break-all">{contactLinks.email}</span>
                </span>
              </a>

              <a
                href={`tel:${contactLinks.phone.replace(/[^\d+]/g, "")}`}
                className="group flex items-start gap-3 text-sm text-slate-500 transition hover:text-indigo-600"
              >
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 transition group-hover:bg-indigo-100">
                  <Phone size={16} />
                </span>
                <span className="min-w-0">
                  <span className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    Phone
                  </span>
                  <span className="mt-1 block">{contactLinks.phone}</span>
                </span>
              </a>
            </div>
          </div>

          {/* Shopping benefits */}
          <div>
            <h3 className="text-sm font-extrabold tracking-wide text-slate-900">
              Shopping with AuraMart
            </h3>
            <div className="mt-5 space-y-4">
              <div className="flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                  <Truck size={17} />
                </span>
                <div>
                  <p className="text-sm font-semibold text-slate-800">
                    Convenient Delivery
                  </p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    Delivered to your doorstep
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                  <ShieldCheck size={17} />
                </span>
                <div>
                  <p className="text-sm font-semibold text-slate-800">
                    Secure Shopping
                  </p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    A safer shopping experience
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-orange-600">
                  <Headphones size={17} />
                </span>
                <div>
                  <p className="text-sm font-semibold text-slate-800">
                    Customer Support
                  </p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    We&apos;re here when you need us
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-slate-100 pt-6 text-center sm:flex-row sm:text-left">
          <p className="text-xs text-slate-500">
            © 2026 AuraMart. All rights reserved.
          </p>

          <p className="inline-flex items-center gap-1.5 text-xs text-slate-500">
            Made with
            <Heart size={13} className="fill-rose-500 text-rose-500" />
            <span className="text-slate-500">for a better shopping experience.</span>
            <Sparkles size={13} className="ml-1 text-indigo-600" />
          </p>
        </div>
      </div>
    </footer>
  );
}
