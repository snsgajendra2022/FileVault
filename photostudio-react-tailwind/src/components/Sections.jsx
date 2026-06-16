import {
  BookOpen,
  Gift,
  ImagePlus,
  Palette,
  Share2,
  Sparkles,
  Users,
  Wand2,
} from "lucide-react";
import { appConfig } from "../data/config";
import StoreButtons from "./StoreButtons";

const features = [
  {
    icon: ImagePlus,
    title: "Digital Albums",
    text: "Create polished albums for weddings, birthdays, anniversaries, studio shoots, and family events.",
  },
  {
    icon: BookOpen,
    title: "Flipbook Feel",
    text: "Present memories in an interactive flipbook-style experience instead of a plain gallery.",
  },
  {
    icon: Gift,
    title: "Guest Book",
    text: "Build digital guest book experiences for events, celebrations, and special occasions.",
  },
  {
    icon: Users,
    title: "Studio Client Delivery",
    text: "Give photographers and studio owners a cleaner way to present albums to clients.",
  },
  {
    icon: Share2,
    title: "Share Faster",
    text: "Guide users from landing page to your main memories app with a clear call-to-action.",
  },
  {
    icon: Palette,
    title: "Clean Visual UI",
    text: "Modern spacing, rounded cards, soft shadows, and a professional memory-book look.",
  },
];

const audiences = [
  "Photographers",
  "Photo Studio Owners",
  "Wedding Planners",
  "Event Managers",
  "Families",
  "Couples",
];

const steps = [
  "Land on the page and instantly see what Our Memories offers.",
  "Tap Explore Our Memories to open the app.",
  "Create or browse digital albums, flipbooks, and guest books.",
  "Share the experience with family, clients, or friends.",
];

export function FeaturesSection() {
  return (
    <section id="features" className="section-padding ps-section ps-section--white">
      <div className="container-page">
        <div className="ps-section-head">
          <div className="ps-section-head__main">
            <span className="section-label">Features</span>
            <h2 className="ps-heading-lg">
              A landing page that sells the experience, not only the app.
            </h2>
          </div>
          <p className="ps-section-head__aside">
            Built to look trustworthy, modern, and clear before users open your main memories app.
          </p>
        </div>

        <div className="ps-features-grid">
          {features.map((feature) => (
            <article key={feature.title} className="ps-feature-card">
              <div className="ps-feature-card__icon">
                <feature.icon size={22} />
              </div>
              <h3 className="ps-feature-card__title">{feature.title}</h3>
              <p className="ps-feature-card__text">{feature.text}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export function HowItWorksSection() {
  return (
    <section id="how" className="section-padding ps-how">
      <div className="ps-how__glow" aria-hidden />
      <div className="container-page ps-how__inner">
        <div className="ps-how__steps-col">
          <span className="ps-how__label">User journey</span>
          <h2 className="ps-how__title">
            From landing page to your memories in one tap.
          </h2>

          <div className="ps-how__steps">
            {steps.map((step, index) => (
              <div key={step} className="ps-how__step">
                <span className="ps-how__step-num">{index + 1}</span>
                <p className="ps-how__step-text">{step}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="ps-how__goal">
          <Wand2 className="ps-how__goal-icon" size={32} />
          <h3 className="ps-how__goal-title">Ready to begin?</h3>
          <p className="ps-how__goal-text">
            One clear button takes visitors straight into the Our Memories app — albums, flipbooks, and guest books in one place.
          </p>
          <a href={appConfig.mainAppUrl} className="ps-how__cta">
            {appConfig.ctaLabel}
          </a>
        </div>
      </div>
    </section>
  );
}

export function AudienceSection() {
  return (
    <section id="users" className="section-padding ps-section ps-section--muted">
      <div className="container-page">
        <div className="ps-section-head__main mb-10">
          <span className="section-label">Target users</span>
          <h2 className="ps-heading-lg">
            Designed for people who care about beautiful memories.
          </h2>
        </div>

        <div className="ps-audience-grid">
          {audiences.map((item) => (
            <div key={item} className="ps-audience-card">
              <div className="ps-audience-card__icon">
                <Sparkles size={20} />
              </div>
              <p className="ps-audience-card__label">{item}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function CtaSection() {
  return (
    <section className="bg-slate-50 py-14 md:py-16">
      <div className="container-page overflow-hidden rounded-3xl bg-gradient-to-br from-blue-700 via-blue-600 to-sky-500 px-6 py-12 text-center text-white shadow-xl shadow-blue-600/20 md:px-10 md:py-14">
        <Sparkles className="mx-auto mb-4" size={36} />
        <h2 className="mx-auto max-w-3xl text-2xl font-bold leading-tight tracking-tight md:text-4xl">
          Make users feel your app is premium before they even open it.
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-white/90">
          Use this landing page as the public front page, then send users directly to your memories app.
        </p>
        <div className="mt-7">
          <StoreButtons
            center
            mainLabel={appConfig.ctaLabelHero}
            mainClassName="ps-cta-btn-light"
          />
        </div>
      </div>
    </section>
  );
}
