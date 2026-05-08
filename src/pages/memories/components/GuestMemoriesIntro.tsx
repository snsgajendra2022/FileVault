import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { MemoriesEvent } from '../../../features/memories/types';
import type { MemoriesEventTypeId } from '../../../features/memories/eventTypes';
import { getGuestIntroHeroImageUrls, normalizeMemoriesEventType } from '../../../features/memories/eventTypes';

type GuestQuery = {
  allowImageUpload: boolean;
  allowViewEventImages: boolean;
};

export type GuestMemoriesIntroProps = {
  ev: MemoriesEvent;
  heroSubtitle: string;
  guestQuery: GuestQuery;
  onNext: () => void;
};

const GuestMemoriesIntro: React.FC<GuestMemoriesIntroProps> = ({
  ev,
  heroSubtitle,
  guestQuery,
  onNext,
}) => {
  const { t } = useTranslation(undefined, { keyPrefix: 'memoriesPlatform' });
  const eventType: MemoriesEventTypeId = normalizeMemoriesEventType(ev.eventType);
  const heroUrls = getGuestIntroHeroImageUrls(eventType, ev.coverImageUrl);

  return (
    <div className="min-h-screen relative flex flex-col bg-[#060508] text-slate-100 font-memories-body font-normal antialiased">
      <div className="relative shrink-0 min-h-[42vh] sm:min-h-[46vh] w-full overflow-hidden">
        <div className="absolute inset-0 grid grid-cols-3 gap-1 sm:gap-1.5 p-1 sm:p-2">
          {heroUrls.map((src, i) => (
            <div
              key={`${src}-${i}`}
              className="relative overflow-hidden rounded-xl sm:rounded-2xl ring-1 ring-white/10 shadow-2xl"
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <img
                src={src}
                alt=""
                className="h-full w-full min-h-[140px] object-cover transition-transform duration-700 ease-out hover:scale-105"
              />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#060508]/90 via-transparent to-black/20" />
            </div>
          ))}
        </div>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#060508] to-transparent" />
      </div>

      <div className="relative z-10 flex flex-1 flex-col -mt-6 sm:-mt-8">
        <div className="flex justify-end px-4 pt-2">
          <Link
            to="/memories"
            className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/[0.07] px-4 py-2 text-xs font-medium text-slate-200 backdrop-blur-md transition-colors hover:bg-white/[0.12]"
          >
            {t('backToMemoriesHome')}
          </Link>
        </div>

        <div className="mx-auto w-full max-w-xl flex-1 px-5 pb-14 pt-4 sm:px-8 sm:pb-20">
          <p className="text-center text-[10px] font-semibold uppercase tracking-[0.35em] text-violet-300/90">
            Our Memories
          </p>

          <h1 className="font-memories-display mt-4 text-center text-[2.35rem] font-semibold leading-[1.08] tracking-tight text-white sm:text-5xl sm:leading-[1.05]">
            {ev.name}
          </h1>

          {heroSubtitle ? (
            <p className="mt-4 text-center text-sm font-light text-slate-400/95 sm:text-base">{heroSubtitle}</p>
          ) : null}

          <p className="mt-6 text-center text-sm font-light leading-relaxed text-slate-500 sm:text-[0.95rem]">
            {t('guestIntroNoExtra')}
          </p>

          {ev.summary ? (
            <div className="mt-8 rounded-2xl border border-white/[0.08] bg-gradient-to-br from-white/[0.07] to-white/[0.02] p-5 shadow-[0_20px_50px_-20px_rgba(0,0,0,0.5)] backdrop-blur-xl">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-violet-300/80">
                {t('guestIntroSummaryLabel')}
              </p>
              <p className="mt-3 font-memories-display text-xl font-medium leading-snug text-white/95 sm:text-2xl">
                {ev.summary}
              </p>
            </div>
          ) : null}

          {ev.description ? (
            <div className="mt-5 rounded-2xl border border-white/[0.06] bg-black/25 p-5 backdrop-blur-md">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                {t('guestIntroDescriptionLabel')}
              </p>
              <div className="mt-3 max-h-[min(42vh,280px)] overflow-y-auto pr-1 text-left text-sm font-light leading-relaxed text-slate-300/95 scrollbar-thin">
                <p className="whitespace-pre-wrap">{ev.description}</p>
              </div>
            </div>
          ) : null}

          {!guestQuery.allowImageUpload && !guestQuery.allowViewEventImages ? (
            <p className="mt-10 rounded-2xl border border-amber-500/25 bg-amber-500/[0.08] px-4 py-3 text-center text-sm text-amber-100/90">
              {t('guestNoAccessBothDisabled')}
            </p>
          ) : (
            <button
              type="button"
              onClick={onNext}
              className="mt-10 w-full rounded-2xl bg-gradient-to-r from-violet-600 via-fuchsia-600 to-violet-600 py-4 text-sm font-semibold tracking-wide text-white shadow-[0_12px_40px_-8px_rgba(124,58,237,0.55)] transition-all hover:shadow-[0_16px_48px_-8px_rgba(217,70,239,0.45)] hover:brightness-[1.03] active:scale-[0.99] sm:text-base"
            >
              {t('guestIntroNext')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default GuestMemoriesIntro;
