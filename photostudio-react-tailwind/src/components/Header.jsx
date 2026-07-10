import { useCallback, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { ArrowRight, Menu, X } from "lucide-react";
import { appConfig } from "../data/config";
import BrandLogo from "./BrandLogo";

const links = [
  { label: "Features", hash: "features" },
  { label: "How it Works", hash: "how" },
  { label: "Users", hash: "users" },
  { label: "Blog", hash: "blogs" },
];

export default function Header() {
  const [open, setOpen] = useState(false);
  const location = useLocation();

  const handleSectionNav = useCallback(
    (event, hash) => {
      setOpen(false);
      const onHome = location.pathname === "/" || location.pathname === "";
      if (!onHome) return;

      event.preventDefault();
      const el = document.getElementById(hash);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
        window.history.replaceState(null, "", `/#${hash}`);
      }
    },
    [location.pathname]
  );

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200/80 bg-white/90 backdrop-blur-xl">
      <div className="container-page flex h-16 items-center justify-between md:h-[4.5rem]">
        <Link to="/" className="group flex items-center gap-3" onClick={() => setOpen(false)}>
          <BrandLogo size="sm" className="transition group-hover:opacity-100 opacity-95" />
          <span>
            <span className="block text-base font-bold leading-tight tracking-tight text-slate-900 md:text-lg">
              {appConfig.appName}
            </span>
            <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-blue-600 md:text-[11px]">
              Digital memories
            </span>
          </span>
        </Link>

        <nav className="hidden items-center gap-0.5 lg:flex">
          {links.map((item) => (
            <Link
              key={item.hash}
              to={{ pathname: "/", hash: `#${item.hash}` }}
              onClick={(event) => handleSectionNav(event, item.hash)}
              className="rounded-lg px-3.5 py-2 text-sm font-semibold text-slate-600 transition hover:bg-blue-50 hover:text-blue-700"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <a
            href={appConfig.mainAppUrl}
            className="group hidden items-center gap-3 overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 via-blue-600 to-indigo-600 py-2 pl-4 pr-2 shadow-lg shadow-blue-600/25 ring-1 ring-blue-500/20 transition hover:from-blue-700 hover:via-blue-700 hover:to-indigo-700 sm:inline-flex"
          >
            <span className="min-w-0 text-left">
              <span className="block text-sm font-bold leading-tight text-white">
                {appConfig.ctaLabelShort}
              </span>
              <span className="mt-0.5 block text-[10px] font-medium leading-tight text-blue-100">
                {appConfig.ctaLabelHint}
              </span>
            </span>
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/15 transition group-hover:bg-white/25">
              <ArrowRight
                size={16}
                className="text-white transition group-hover:translate-x-0.5"
                aria-hidden
              />
            </span>
          </a>
          <button
            type="button"
            aria-label={open ? "Close menu" : "Open menu"}
            className="rounded-xl border border-slate-200 bg-white p-2.5 text-slate-700 lg:hidden"
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-slate-100 bg-white px-4 py-3 lg:hidden">
          <nav className="flex flex-col gap-0.5">
            {links.map((item) => (
              <Link
                key={item.hash}
                to={{ pathname: "/", hash: `#${item.hash}` }}
                onClick={(event) => handleSectionNav(event, item.hash)}
                className="rounded-lg px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-blue-50 hover:text-blue-700"
              >
                {item.label}
              </Link>
            ))}
            <a
              href={appConfig.mainAppUrl}
              className="mt-3 flex items-center justify-between gap-3 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3 text-white shadow-md shadow-blue-600/20"
              onClick={() => setOpen(false)}
            >
              <span className="text-left">
                <span className="block text-sm font-bold">{appConfig.ctaLabel}</span>
                <span className="mt-0.5 block text-[11px] font-medium text-blue-100">
                  {appConfig.ctaLabelHint}
                </span>
              </span>
              <ArrowRight size={18} aria-hidden />
            </a>
          </nav>
        </div>
      )}
    </header>
  );
}
