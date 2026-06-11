import { useState } from "react";
import { ExternalLink, Menu, X } from "lucide-react";
import { appConfig } from "../data/config";
import BrandLogo from "./BrandLogo";

const links = [
  { label: "Features", href: "#features" },
  { label: "How it Works", href: "#how" },
  { label: "Users", href: "#users" },
  { label: "Blog", href: "#blogs" },
];

export default function Header() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl">
      <div className="container-page flex h-16 items-center justify-between md:h-[4.5rem]">
        <a href="/" className="group flex items-center gap-3" onClick={() => setOpen(false)}>
          <BrandLogo size="sm" className="transition group-hover:opacity-100 opacity-95" />
          <span>
            <span className="block text-base font-bold leading-tight tracking-tight text-slate-900 md:text-lg">
              {appConfig.appName}
            </span>
            <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-blue-600 md:text-[11px]">
              Digital memories
            </span>
          </span>
        </a>

        <nav className="hidden items-center gap-0.5 lg:flex">
          {links.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="rounded-lg px-3.5 py-2 text-sm font-semibold text-slate-600 transition hover:bg-blue-50 hover:text-blue-700"
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <a
            href={appConfig.mainAppUrl}
            className="hidden items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-600/20 transition hover:bg-blue-700 sm:inline-flex"
          >
            Open Memories
            <ExternalLink size={15} />
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
              <a
                key={item.href}
                href={item.href}
                className="rounded-lg px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-blue-50 hover:text-blue-700"
                onClick={() => setOpen(false)}
              >
                {item.label}
              </a>
            ))}
            <a
              href={appConfig.mainAppUrl}
              className="mt-2 flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white"
              onClick={() => setOpen(false)}
            >
              Open Memories <ExternalLink size={15} />
            </a>
          </nav>
        </div>
      )}
    </header>
  );
}
