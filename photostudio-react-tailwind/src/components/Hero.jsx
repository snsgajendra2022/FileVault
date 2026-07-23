import { ArrowRight } from "lucide-react";
import { appConfig } from "../data/config";
import StoreButtons from "./StoreButtons";

const HERO_IMAGE = "/marketing/hero.jpg";

export default function Hero() {
  return (
    <section id="home" className="om-hero" aria-label="Our Memories">
      <div className="om-hero__media" aria-hidden="true">
        <img
          src={HERO_IMAGE}
          alt=""
          className="om-hero__img"
          width={2400}
          height={1600}
          fetchPriority="high"
          decoding="async"
        />
        <div className="om-hero__veil" />
      </div>

      <div className="om-hero__content container-page">
        <p className="om-brand">{appConfig.appName}</p>
        <h1 className="om-hero__title">Turn photos into beautiful digital memories.</h1>
        <p className="om-hero__lead">
          A clean digital album, flipbook, and guest book experience for weddings,
          birthdays, events, photographers, and studio clients.
        </p>

        <div className="om-hero__cta">
          <a href={appConfig.mainAppUrl} className="om-btn om-btn--light">
            {appConfig.ctaLabel}
            <ArrowRight size={18} aria-hidden />
          </a>
          <StoreButtons showMain={false} />
        </div>
      </div>
    </section>
  );
}
