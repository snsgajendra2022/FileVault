import {
  BookOpen,
  Camera,
  Gift,
  Heart,
  ImagePlus,
  Share2,
  Users,
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
    icon: Camera,
    title: "Clean Visual UI",
    text: "Modern spacing, refined typography, and a professional memory-book look.",
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
  "Tap Open Our Memories to go to the login page.",
  "Create or browse digital albums, flipbooks, and guest books.",
  "Share the experience with family, clients, or friends.",
];

const FEATURE_IMAGES = [
  "/marketing/feat-1.jpg",
  "/marketing/feat-2.jpg",
  "/marketing/feat-3.jpg",
];

export function FeaturesSection() {
  return (
    <section id="features" className="om-section">
      <div className="container-page">
        <div className="om-section__intro">
          <p className="om-kicker">Features</p>
          <h2 className="om-heading">
            A landing page that sells the experience, not only the app.
          </h2>
          <p className="om-subcopy">
            Built to look trustworthy, modern, and clear before users open your main memories app.
          </p>
        </div>

        <div className="om-feature-showcase" aria-hidden="true">
          {FEATURE_IMAGES.map((src) => (
            <figure key={src} className="om-feature-showcase__frame">
              <img src={src} alt="" loading="lazy" decoding="async" />
            </figure>
          ))}
        </div>

        <div className="om-feature-list">
          {features.map((feature) => (
            <article key={feature.title} className="om-feature-item">
              <feature.icon className="om-feature-item__icon" size={20} aria-hidden />
              <div>
                <h3 className="om-feature-item__title">{feature.title}</h3>
                <p className="om-feature-item__text">{feature.text}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export function HowItWorksSection() {
  return (
    <section id="how" className="om-section om-section--ink">
      <div className="container-page om-journey">
        <div className="om-journey__copy">
          <p className="om-kicker om-kicker--light">User journey</p>
          <h2 className="om-heading om-heading--light">
            From landing page to your memories in one tap.
          </h2>

          <ol className="om-steps">
            {steps.map((step, index) => (
              <li key={step} className="om-steps__item">
                <span className="om-steps__num" aria-hidden>
                  {String(index + 1).padStart(2, "0")}
                </span>
                <p>{step}</p>
              </li>
            ))}
          </ol>
        </div>

        <aside className="om-journey__panel">
          <p className="om-kicker om-kicker--light">Ready to begin?</p>
          <h3 className="om-journey__panel-title">Open the app in one step</h3>
          <p className="om-journey__panel-text">
            One clear button takes visitors straight into the Our Memories app —
            albums, flipbooks, and guest books in one place.
          </p>
          <a href={appConfig.mainAppUrl} className="om-btn om-btn--light om-btn--block">
            {appConfig.ctaLabel}
          </a>
        </aside>
      </div>
    </section>
  );
}

export function AudienceSection() {
  return (
    <section id="users" className="om-section">
      <div className="container-page">
        <div className="om-section__intro om-section__intro--narrow">
          <p className="om-kicker">Target users</p>
          <h2 className="om-heading">
            Designed for people who care about beautiful memories.
          </h2>
        </div>

        <ul className="om-audience">
          {audiences.map((item) => (
            <li key={item} className="om-audience__item">
              <Heart size={16} aria-hidden />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export function CtaSection() {
  return (
    <section className="om-section om-cta">
      <div className="container-page om-cta__inner">
        <h2 className="om-heading">
          Make users feel your app is premium before they even open it.
        </h2>
        <p className="om-subcopy">
          Use this landing page as the public front page, then send users directly to your memories app.
        </p>
        <div className="om-cta__actions">
          <StoreButtons
            center
            mainLabel={appConfig.ctaLabelHero}
            mainClassName="om-btn om-btn--dark"
          />
        </div>
      </div>
    </section>
  );
}
