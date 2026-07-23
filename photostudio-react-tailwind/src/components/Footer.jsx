import { appConfig } from "../data/config";
import BrandLogo from "./BrandLogo";

const links = [
  { label: "Home", href: "/" },
  { label: appConfig.ctaLabel, href: appConfig.mainAppUrl },
  { label: "Privacy Policy", href: "/privacy-policy" },
  { label: "Terms", href: "/terms" },
  { label: "Contact", href: "/contact" },
];

export default function Footer() {
  return (
    <footer className="om-footer">
      <div className="container-page om-footer__inner">
        <div className="om-footer__brand">
          <div className="om-footer__logo-row">
            <BrandLogo size="sm" />
            <span>{appConfig.appName}</span>
          </div>
          <p>
            Digital album, flipbook, and guest book app for photographers, studios, and families.
          </p>
        </div>

        <nav className="om-footer__nav" aria-label="Footer">
          {links.map((link) => (
            <a key={link.label} href={link.href}>
              {link.label}
            </a>
          ))}
        </nav>
      </div>

      <div className="container-page om-footer__copy">
        © {new Date().getFullYear()} {appConfig.appName}. All rights reserved.
      </div>
    </footer>
  );
}
