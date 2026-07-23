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
    <header className="om-header">
      <div className="container-page om-header__bar">
        <Link to="/" className="om-header__brand" onClick={() => setOpen(false)}>
          <BrandLogo size="sm" />
          <span className="om-header__name">{appConfig.appName}</span>
        </Link>

        <nav className="om-header__nav" aria-label="Primary">
          {links.map((item) => (
            <Link
              key={item.hash}
              to={{ pathname: "/", hash: `#${item.hash}` }}
              onClick={(event) => handleSectionNav(event, item.hash)}
              className="om-header__link"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="om-header__actions">
          <a href={appConfig.mainAppUrl} className="om-btn om-btn--dark om-btn--compact om-header__cta">
            {appConfig.ctaLabelShort}
            <ArrowRight size={15} aria-hidden />
          </a>
          <button
            type="button"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            className="om-header__menu-btn"
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {open ? (
        <div className="om-header__drawer">
          <nav className="container-page" aria-label="Mobile">
            {links.map((item) => (
              <Link
                key={item.hash}
                to={{ pathname: "/", hash: `#${item.hash}` }}
                onClick={(event) => handleSectionNav(event, item.hash)}
                className="om-header__drawer-link"
              >
                {item.label}
              </Link>
            ))}
            <a
              href={appConfig.mainAppUrl}
              className="om-btn om-btn--dark om-btn--block"
              onClick={() => setOpen(false)}
            >
              {appConfig.ctaLabel}
              <ArrowRight size={16} aria-hidden />
            </a>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
