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
  "User opens your landing page and understands the app immediately.",
  "User clicks Open Main App and goes to the memories page.",
  "User creates or views digital albums, flipbooks, and guest books.",
  "User shares the memory experience with family, clients, or friends.",
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
    <section id="how" className="section-padding relative overflow-hidden bg-slate-900 text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(37,99,235,0.18),transparent_55%),radial-gradient(ellipse_at_bottom_left,rgba(59,130,246,0.1),transparent_50%)]" />
      <div className="container-page relative grid gap-8 lg:grid-cols-[1fr_0.85fr] lg:items-center">
        <div>
          <span className="mb-2 inline-block text-xs font-bold uppercase tracking-[0.16em] text-blue-300">User journey</span>
          <h2 className="text-2xl font-bold leading-tight tracking-tight md:text-4xl">
            From landing page to memories page in one strong click.
          </h2>

          <div className="mt-7 grid gap-3">
            {steps.map((step, index) => (
              <div key={step} className="flex gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-bold">
                  {index + 1}
                </span>
                <p className="text-sm font-medium leading-6 text-slate-200">{step}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-xl shadow-black/20 md:p-7">
          <Wand2 className="mb-3 text-blue-300" size={32} />
          <h3 className="text-2xl font-bold tracking-tight">Main conversion goal</h3>
          <p className="mt-3 text-sm leading-7 text-slate-300">
            The landing page has clear buttons that send users to your real main page.
          </p>
          <a
            href={appConfig.mainAppUrl}
            className="mt-5 inline-flex w-full items-center justify-center rounded-xl bg-white px-5 py-3 text-sm font-semibold text-slate-900 transition hover:bg-blue-50"
          >
            Open Memories Page
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
            mainLabel="Start Creating Memories"
            mainClassName="inline-flex min-h-[3rem] items-center justify-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-slate-900 shadow-lg transition hover:-translate-y-0.5 hover:bg-blue-50"
          />
        </div>
      </div>
    </section>
  );
}
