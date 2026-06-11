import { Apple, ExternalLink, Play, Sparkles } from "lucide-react";
import { appConfig } from "../data/config";

export default function StoreButtons({
  center = false,
  showMain = true,
  mainLabel = "Open Main App",
  mainClassName = "btn-primary",
}) {
  return (
    <div className={`flex flex-col gap-3 sm:flex-row sm:flex-wrap ${center ? "justify-center" : ""}`}>
      {showMain && (
        <a href={appConfig.mainAppUrl} className={mainClassName}>
          {mainLabel === "Start Creating Memories" ? <Sparkles size={18} /> : <ExternalLink size={18} />}
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
