import { Apple, ExternalLink, Play, Sparkles } from "lucide-react";
import { appConfig } from "../data/config";

export default function StoreButtons({
  center = false,
  showMain = true,
  mainLabel = appConfig.ctaLabel,
  mainClassName = "btn-primary",
}) {
  const isSparkleCta = mainLabel === appConfig.ctaLabelHero;

  return (
    <div className={`ps-store-buttons ${center ? "ps-store-buttons--center" : ""}`}>
      {showMain && (
        <a href={appConfig.mainAppUrl} className={mainClassName}>
          {isSparkleCta ? <Sparkles size={18} /> : <ExternalLink size={18} />}
          {mainLabel}
        </a>
      )}

      <a
        href={appConfig.playStoreUrl}
        target="_blank"
        rel="noreferrer"
        className="btn-store"
      >
        <Play size={18} fill="currentColor" />
        Google Play
      </a>

      <a
        href={appConfig.appStoreUrl}
        target="_blank"
        rel="noreferrer"
        className="btn-secondary"
      >
        <Apple size={18} />
        App Store
      </a>
    </div>
  );
}
