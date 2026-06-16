import { ArrowRight, BadgeCheck, Sparkles, Star } from "lucide-react";
import { appConfig } from "../data/config";
import BrandLogo from "./BrandLogo";
import StoreButtons from "./StoreButtons";

const stats = [
  { value: "4K+", label: "Album layouts" },
  { value: "1-click", label: "Client sharing" },
  { value: "Mobile", label: "First experience" },
];

export default function Hero() {
  return (
    <section id="home" className="relative isolate overflow-hidden">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-0 h-[420px] w-[min(800px,100%)] -translate-x-1/2 rounded-full bg-gradient-to-r from-blue-100 via-sky-50 to-blue-50 blur-3xl" />
      </div>

      <div className="container-page grid gap-10 pb-14 pt-10 md:pb-20 md:pt-12 lg:grid-cols-[1fr_0.95fr] lg:items-center lg:gap-12">
        <div className="max-w-xl lg:max-w-none">
          <div className="mb-5 flex items-center gap-3">
            <BrandLogo size="md" />
            <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
              <Sparkles size={14} />
              {appConfig.tagline}
            </span>
          </div>

          <h1 className="ps-hero-title">
            Turn photos into{" "}
            <span className="ps-hero-accent">beautiful digital memories.</span>
          </h1>

          <p className="ps-hero-lead">
            A clean digital album, flipbook, and guest book experience for weddings,
            birthdays, events, photographers, and studio clients.
          </p>

          <div className="mt-7">
            <StoreButtons />
          </div>

          <div className="mt-7 grid max-w-lg grid-cols-3 gap-2.5 sm:gap-3">
            {stats.map((item) => (
              <div key={item.label} className="glass-card rounded-2xl p-3.5 md:p-4">
                <p className="text-lg font-bold tracking-tight text-slate-900 md:text-xl">{item.value}</p>
                <p className="mt-0.5 text-[11px] font-medium leading-snug text-slate-500 md:text-xs">{item.label}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-[480px]">
          <div className="absolute -left-3 top-8 z-10 hidden rounded-2xl border border-slate-100 bg-white px-4 py-3 shadow-lg md:block">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
              <BadgeCheck className="text-emerald-500" size={17} />
              Album published
            </div>
          </div>

          <div className="absolute -right-3 bottom-16 z-10 hidden rounded-2xl bg-slate-900 px-4 py-3 text-white shadow-lg md:block">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Star className="fill-amber-300 text-amber-300" size={17} />
              Studio-ready
            </div>
          </div>

          <div className="premium-border rounded-3xl bg-white/80 p-3 shadow-xl shadow-slate-900/8 backdrop-blur-lg">
            <div className="rounded-[1.35rem] bg-slate-900 p-3">
              <div className="rounded-[1.15rem] bg-white p-4 md:p-5">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-blue-600">Live memory book</p>
                    <h3 className="mt-0.5 text-xl font-bold tracking-tight text-slate-900">Wedding Story</h3>
                  </div>
                  <span className="shrink-0 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">Public</span>
                </div>

                <div className="grid grid-cols-12 gap-2.5">
                  <div className="album-tile col-span-7 h-40 rounded-2xl md:h-44" />
                  <div className="col-span-5 grid gap-2.5">
                    <div className="album-tile h-[76px] rounded-xl md:h-[84px]" />
                    <div className="album-tile h-[76px] rounded-xl md:h-[84px]" />
                  </div>
                  <div className="album-tile col-span-4 h-24 rounded-xl" />
                  <div className="album-tile col-span-4 h-24 rounded-xl" />
                  <div className="album-tile col-span-4 h-24 rounded-xl" />
                </div>

                <div className="mt-4 rounded-2xl bg-gradient-to-r from-blue-50 to-sky-50 p-4">
                  <div className="flex items-start gap-3">
                    <div className="rounded-xl bg-blue-600 p-2.5 text-white">
                      <Sparkles size={18} />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">Flipbook experience ready</p>
                      <p className="mt-1 text-sm leading-6 text-slate-600">
                        Give clients a premium viewing experience instead of a plain gallery.
                      </p>
                    </div>
                  </div>
                </div>

                <a
                  href={appConfig.mainAppUrl}
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
                >
                  {appConfig.ctaLabel} <ArrowRight size={17} />
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
