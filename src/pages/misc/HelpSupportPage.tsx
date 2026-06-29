import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  FaCloud,
  FaEnvelope,
  FaExternalLinkAlt,
  FaQuestionCircle,
  FaUpload,
  FaBook,
} from 'react-icons/fa';

const SUPPORT_EMAIL = 'mobileapps@snssystem.com';
const SUPPORT_WEBSITE = 'https://snssystem.com';

const HelpSupportPage = () => {
  const { t } = useTranslation();

  const steps = [
    {
      icon: FaCloud,
      title: t('helpSupportPage.step1Title'),
      body: t('helpSupportPage.step1Body'),
      link: '/services',
      linkLabel: t('helpSupportPage.step1Link'),
    },
    {
      icon: FaUpload,
      title: t('helpSupportPage.step2Title'),
      body: t('helpSupportPage.step2Body'),
      link: '/upload-family-images',
      linkLabel: t('helpSupportPage.step2Link'),
    },
    {
      icon: FaBook,
      title: t('helpSupportPage.step3Title'),
      body: t('helpSupportPage.step3Body'),
      link: '/client-images',
      linkLabel: t('helpSupportPage.step3Link'),
    },
  ];

  const faqs = [
    { q: t('helpSupportPage.faq1Q'), a: t('helpSupportPage.faq1A') },
    { q: t('helpSupportPage.faq2Q'), a: t('helpSupportPage.faq2A') },
    { q: t('helpSupportPage.faq3Q'), a: t('helpSupportPage.faq3A') },
    { q: t('helpSupportPage.faq4Q'), a: t('helpSupportPage.faq4A') },
  ];

  return (
    <div className="portal-page-surface min-h-full p-4 md:p-8 text-slate-900 dark:text-slate-100 transition-colors duration-200">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-300">
            <FaQuestionCircle className="h-7 w-7" aria-hidden />
          </div>
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl">{t('helpSupportPage.title')}</h1>
          <p className="mx-auto mt-3 max-w-2xl text-base text-slate-600 dark:text-slate-400">
            {t('helpSupportPage.subtitle')}
          </p>
        </div>

        <div className="mb-8 grid gap-4 sm:grid-cols-2">
          <a
            href={`mailto:${SUPPORT_EMAIL}`}
            className="portal-card group flex items-start gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-indigo-300 hover:shadow-md dark:border-slate-700 dark:bg-slate-900"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-300">
              <FaEnvelope className="h-5 w-5" />
            </span>
            <span className="min-w-0">
              <span className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                {t('helpSupportPage.emailLabel')}
              </span>
              <span className="mt-1 block text-sm font-semibold text-slate-900 group-hover:text-indigo-600 dark:text-slate-100">
                {SUPPORT_EMAIL}
              </span>
            </span>
          </a>

          <a
            href={SUPPORT_WEBSITE}
            target="_blank"
            rel="noopener noreferrer"
            className="portal-card group flex items-start gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-indigo-300 hover:shadow-md dark:border-slate-700 dark:bg-slate-900"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-300">
              <FaExternalLinkAlt className="h-5 w-5" />
            </span>
            <span className="min-w-0">
              <span className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                {t('helpSupportPage.websiteLabel')}
              </span>
              <span className="mt-1 block text-sm font-semibold text-slate-900 group-hover:text-indigo-600 dark:text-slate-100">
                snssystem.com
              </span>
            </span>
          </a>
        </div>

        <section className="portal-card mb-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">{t('helpSupportPage.gettingStartedTitle')}</h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{t('helpSupportPage.gettingStartedSubtitle')}</p>
          <div className="mt-5 space-y-4">
            {steps.map((step, index) => {
              const Icon = step.icon;
              return (
                <div
                  key={step.title}
                  className="flex gap-4 rounded-xl border border-slate-100 bg-slate-50/80 p-4 dark:border-slate-700 dark:bg-slate-800/50"
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-indigo-600 shadow-sm dark:bg-slate-900 dark:text-indigo-300">
                    <Icon className="h-5 w-5" aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold uppercase tracking-wide text-indigo-600 dark:text-indigo-400">
                      {t('helpSupportPage.stepLabel', { n: index + 1 })}
                    </p>
                    <h3 className="mt-0.5 font-semibold text-slate-900 dark:text-slate-100">{step.title}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-slate-600 dark:text-slate-400">{step.body}</p>
                    <Link
                      to={step.link}
                      className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
                    >
                      {step.linkLabel}
                      <FaExternalLinkAlt className="h-3 w-3" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="portal-card mb-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <div className="mb-4 flex items-center gap-2">
            <FaQuestionCircle className="h-5 w-5 text-indigo-600" aria-hidden />
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">{t('helpSupportPage.faqTitle')}</h2>
          </div>
          <div className="space-y-3">
            {faqs.map((faq) => (
              <details
                key={faq.q}
                className="group rounded-xl border border-slate-100 bg-slate-50/50 open:bg-white dark:border-slate-700 dark:bg-slate-800/40 dark:open:bg-slate-900"
              >
                <summary className="cursor-pointer list-none px-4 py-3 text-sm font-semibold text-slate-900 marker:content-none dark:text-slate-100">
                  {faq.q}
                </summary>
                <p className="border-t border-slate-100 px-4 py-3 text-sm leading-relaxed text-slate-600 dark:border-slate-700 dark:text-slate-400">
                  {faq.a}
                </p>
              </details>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50 to-white p-6 text-center dark:border-indigo-900 dark:from-slate-900 dark:to-slate-900">
          <p className="text-sm text-slate-600 dark:text-slate-400">{t('helpSupportPage.stillNeedHelp')}</p>
          <a
            href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(t('helpSupportPage.emailSubject'))}`}
            className="btn-primary mt-4 inline-flex items-center gap-2"
          >
            <FaEnvelope className="h-4 w-4" />
            {t('helpSupportPage.contactBtn')}
          </a>
        </section>
      </div>
    </div>
  );
};

export default HelpSupportPage;
