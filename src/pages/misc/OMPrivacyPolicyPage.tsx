import React from 'react';
import { useTranslation } from 'react-i18next';

const OMPrivacyPolicyPage = () => {
  const { t } = useTranslation();
  const APP_NAME = 'OM';
  const effectiveDate = 'January 28, 2026';
  const CONTACT_EMAIL = 'mobileapps@snssystem.com';

  return (
    <div className="min-h-screen bg-[#ffffff] px-4 py-10">
      <div className="mx-auto w-full max-w-4xl">

        <div className="rounded-3xl border border-white/60 bg-white/70 p-8 shadow-2xl backdrop-blur-xl">
          <h1 className="text-4xl font-extrabold tracking-tight text-gray-900">{t('privacyPolicyPage.title')}</h1>
          <p className="mt-2 text-sm text-gray-600">
            {t('privacyPolicyPage.effectiveDate', { date: effectiveDate })}
          </p>

          <div className="mt-8 space-y-8 text-gray-800">
            <section>
              <h2 className="text-xl font-bold text-gray-900">{t('privacyPolicyPage.overviewTitle')}</h2>
              <p className="mt-2 text-gray-700">
                {t('privacyPolicyPage.overviewBody', { appName: APP_NAME })}
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-gray-900">{t('privacyPolicyPage.collectTitle')}</h2>
              <div className="mt-3 space-y-3">
                <div>
                  <h3 className="font-semibold text-gray-900">{t('privacyPolicyPage.accountH3')}</h3>
                  <p className="text-gray-700">{t('privacyPolicyPage.accountP')}</p>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{t('privacyPolicyPage.filesH3')}</h3>
                  <p className="text-gray-700">{t('privacyPolicyPage.filesP')}</p>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{t('privacyPolicyPage.billingH3')}</h3>
                  <p className="text-gray-700">{t('privacyPolicyPage.billingP')}</p>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{t('privacyPolicyPage.usageH3')}</h3>
                  <p className="text-gray-700">{t('privacyPolicyPage.usageP')}</p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-bold text-gray-900">{t('privacyPolicyPage.useTitle')}</h2>
              <ul className="mt-3 list-disc space-y-2 pl-6 text-gray-700">
                <li>{t('privacyPolicyPage.useLi1')}</li>
                <li>{t('privacyPolicyPage.useLi2')}</li>
                <li>{t('privacyPolicyPage.useLi3')}</li>
                <li>{t('privacyPolicyPage.useLi4')}</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold text-gray-900">{t('privacyPolicyPage.shareTitle')}</h2>
              <p className="mt-2 text-gray-700">{t('privacyPolicyPage.shareP')}</p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-gray-900">{t('privacyPolicyPage.securityTitle')}</h2>
              <p className="mt-2 text-gray-700">{t('privacyPolicyPage.securityP')}</p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-gray-900">{t('privacyPolicyPage.retentionTitle')}</h2>
              <p className="mt-2 text-gray-700">{t('privacyPolicyPage.retentionP')}</p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-gray-900">{t('privacyPolicyPage.choicesTitle')}</h2>
              <ul className="mt-3 list-disc space-y-2 pl-6 text-gray-700">
                <li>{t('privacyPolicyPage.choicesLi1')}</li>
                <li>{t('privacyPolicyPage.choicesLi2')}</li>
                <li>{t('privacyPolicyPage.choicesLi3')}</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold text-gray-900">{t('privacyPolicyPage.childrenTitle')}</h2>
              <p className="mt-2 text-gray-700">{t('privacyPolicyPage.childrenP')}</p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-gray-900">{t('privacyPolicyPage.changesTitle')}</h2>
              <p className="mt-2 text-gray-700">{t('privacyPolicyPage.changesP')}</p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-gray-900">{t('privacyPolicyPage.contactTitle')}</h2>
              <p className="mt-2 text-gray-700">
                {t('privacyPolicyPage.contactP', { email: CONTACT_EMAIL })}
              </p>
            </section>
          </div>
        </div>

        <div className="mt-6 text-center text-xs text-gray-600">
          <p>{t('privacyPolicyPage.footerTip')}</p>
        </div>
      </div>
    </div>
  );
};

export default OMPrivacyPolicyPage;
