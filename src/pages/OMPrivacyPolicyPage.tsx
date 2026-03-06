import React from 'react';

const OMPrivacyPolicyPage = () => {
  const APP_NAME = 'OM';
  const effectiveDate = 'January 28, 2026';
  const CONTACT_EMAIL = 'mobileapps@snssystem.com';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 px-4 py-10">
      <div className="mx-auto w-full max-w-4xl">

        <div className="rounded-3xl border border-white/60 bg-white/70 p-8 shadow-2xl backdrop-blur-xl">
          <h1 className="text-4xl font-extrabold tracking-tight text-gray-900">Privacy Policy</h1>
          <p className="mt-2 text-sm text-gray-600">
            Effective date: <span className="font-semibold">{effectiveDate}</span>
          </p>

          <div className="mt-8 space-y-8 text-gray-800">
            <section>
              <h2 className="text-xl font-bold text-gray-900">Overview</h2>
              <p className="mt-2 text-gray-700">
                This Privacy Policy explains how <span className="font-semibold">{APP_NAME}</span> ("we", "us", "our")
                collects, uses, and protects information when you use our web application and related services (the
                "Service").
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-gray-900">Information We Collect</h2>
              <div className="mt-3 space-y-3">
                <div>
                  <h3 className="font-semibold text-gray-900">Account information</h3>
                  <p className="text-gray-700">
                    When you register or log in, we may collect details such as username, email, name, phone number,
                    and account type.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Files, images, and related metadata</h3>
                  <p className="text-gray-700">
                    When you upload or manage content, we may process files/images and associated metadata needed to
                    provide storage, sharing, and gallery features (for example: filenames, sizes, timestamps, and
                    identifiers).
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Billing & payment information (if you subscribe)</h3>
                  <p className="text-gray-700">
                    If you purchase a plan, we may process subscription and payment-related details (for example: plan
                    selected, billing cycle, and payment status). Sensitive payment details are typically handled by the
                    payment processor.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Usage data</h3>
                  <p className="text-gray-700">
                    We may collect basic usage and diagnostics information (such as pages visited, feature usage, and
                    error logs) to improve reliability and security.
                  </p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-bold text-gray-900">How We Use Information</h2>
              <ul className="mt-3 list-disc space-y-2 pl-6 text-gray-700">
                <li>Provide and operate the Service (authentication, uploads, viewing, sharing, and account features)</li>
                <li>Maintain safety and prevent abuse, fraud, and unauthorized access</li>
                <li>Support billing/subscriptions (if applicable) and customer support</li>
                <li>Improve performance, usability, and feature quality</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold text-gray-900">Sharing of Information</h2>
              <p className="mt-2 text-gray-700">
                We do not sell your personal information. We may share information only as necessary to provide the
                Service (for example, with cloud storage or payment providers), to comply with legal obligations, or to
                protect users and the Service from harm.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-gray-900">Data Security</h2>
              <p className="mt-2 text-gray-700">
                We take reasonable measures to protect your data. However, no method of transmission or storage is
                100% secure. Please use strong passwords and keep your credentials confidential.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-gray-900">Data Retention</h2>
              <p className="mt-2 text-gray-700">
                We retain information for as long as needed to provide the Service and comply with legal obligations.
                You may request deletion of your account data, subject to applicable laws and operational requirements.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-gray-900">Your Choices</h2>
              <ul className="mt-3 list-disc space-y-2 pl-6 text-gray-700">
                <li>Access and update your profile information within the Service (where available)</li>
                <li>Log out and manage device/browser access</li>
                <li>Request account deletion by contacting us</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold text-gray-900">Children’s Privacy</h2>
              <p className="mt-2 text-gray-700">
                The Service is not intended for children under 13. If you believe a child has provided personal
                information, contact us so we can delete it.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-gray-900">Changes to This Policy</h2>
              <p className="mt-2 text-gray-700">
                We may update this policy from time to time. We will post the updated version in the app with a revised
                effective date.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-gray-900">Contact</h2>
              <p className="mt-2 text-gray-700">
                For privacy questions or requests, contact us at <span className="font-semibold">{CONTACT_EMAIL}</span>.
              </p>
            </section>
          </div>
        </div>

        <div className="mt-6 text-center text-xs text-gray-600">
          <p>
            Tip: You can bookmark this page at <span className="font-mono">/privacy-policy</span>.
          </p>
        </div>
      </div>
    </div>
  );
};

export default OMPrivacyPolicyPage;