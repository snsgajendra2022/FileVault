import { Apple, ExternalLink, Play } from "lucide-react";
import { appConfig } from "../data/config";

export default function StoreButtons({
  center = false,
  showMain = true,
  mainLabel = appConfig.ctaLabel,
  mainClassName = "om-btn om-btn--dark",
}) {
  return (
    <div className={`om-stores ${center ? "om-stores--center" : ""}`}>
      {showMain ? (
        <a href={appConfig.mainAppUrl} className={mainClassName}>
          <ExternalLink size={17} aria-hidden />
          {mainLabel}
        </a>
      ) : null}

      <a
        href={appConfig.playStoreUrl}
        target="_blank"
        rel="noreferrer"
        className="om-btn om-btn--ghost"
      >
        <Play size={16} fill="currentColor" aria-hidden />
        Google Play
      </a>

      <a
        href={appConfig.appStoreUrl}
        target="_blank"
        rel="noreferrer"
        className="om-btn om-btn--ghost"
      >
        <Apple size={16} aria-hidden />
        App Store
      </a>
    </div>
  );
}
