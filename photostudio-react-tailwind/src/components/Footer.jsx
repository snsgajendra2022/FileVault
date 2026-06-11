import { appConfig } from "../data/config";
import BrandLogo from "./BrandLogo";

const links = [
  { label: "Home", href: "/" },
  { label: "Open Main App", href: appConfig.mainAppUrl },
  { label: "Privacy Policy", href: "/privacy-policy" },
  { label: "Terms", href: "/terms" },
  { label: "Contact", href: "/contact" },
];

export default function Footer() {
  return (
    <footer className="border-t border-slate-800 bg-slate-900 py-10 text-white md:py-12">
      <div className="container-page">
        <div className="flex flex-col justify-between gap-8 md:flex-row md:items-start">
          <div className="max-w-sm">
            <div className="flex items-center gap-3">
              <BrandLogo size="sm" />
              <span className="text-lg font-bold">{appConfig.appName}</span>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-slate-400">
              Digital album, flipbook, and guest book app for photographers, studios, and families.
            </p>
          </div>

          <nav className="flex flex-wrap gap-x-5 gap-y-2 text-sm font-medium text-slate-400">
            {links.map((link) => (
              <a key={link.label} href={link.href} className="transition hover:text-white">
                {link.label}
              </a>
            ))}
          </nav>
        </div>

        <div className="mt-8 border-t border-slate-800 pt-5 text-center text-xs text-slate-500 md:text-left">
          © {new Date().getFullYear()} {appConfig.appName}. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
