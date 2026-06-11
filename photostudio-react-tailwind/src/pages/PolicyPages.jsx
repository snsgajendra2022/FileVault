import { ArrowLeft, Mail, MapPin } from "lucide-react";
import { appConfig } from "../data/config";

export function PrivacyPolicy() {
  document.title = `Privacy Policy | ${appConfig.appName}`;

  return (
    <SimplePage title="Privacy Policy" subtitle="How we protect your data and memories">
      <p className="text-sm font-semibold text-blue-600">Last updated: June 2026</p>
      <p>{appConfig.appName} respects your privacy. This page explains how we collect, use, and protect information when users access our website and mobile app.</p>
      <h2>Information We Collect</h2>
      <p>We may collect basic account information, uploaded photos or album content, device information, app usage information, and contact/support details when users voluntarily provide them.</p>
      <h2>How We Use Information</h2>
      <p>We use information to provide app features, create and manage albums, improve the user experience, respond to support requests, and maintain app security.</p>
      <h2>Photos and Uploaded Content</h2>
      <p>Photos and album content are used only to provide the services requested by the user. Users should upload only content they have permission to use.</p>
      <h2>Contact</h2>
      <p>
        For privacy questions, contact us at:{" "}
        <a href={`mailto:${appConfig.supportEmail}`} className="font-semibold text-blue-600 hover:underline">
          {appConfig.supportEmail}
        </a>
      </p>
    </SimplePage>
  );
}

export function Terms() {
  document.title = `Terms and Conditions | ${appConfig.appName}`;

  return (
    <SimplePage title="Terms and Conditions" subtitle="Rules for using Our Memories">
      <p className="text-sm font-semibold text-blue-600">Last updated: June 2026</p>
      <p>By using {appConfig.appName}, you agree to these terms.</p>
      <h2>Use of Service</h2>
      <p>Users may use {appConfig.appName} to create, manage, and share digital albums, flipbooks, guest books, and event memories.</p>
      <h2>User Content</h2>
      <p>Users are responsible for the photos, text, and content they upload. Do not upload illegal, harmful, copyrighted, or unauthorized content.</p>
      <h2>Account Responsibility</h2>
      <p>Users are responsible for maintaining the security of their accounts and devices.</p>
      <h2>Contact</h2>
      <p>
        For questions, contact us at:{" "}
        <a href={`mailto:${appConfig.supportEmail}`} className="font-semibold text-blue-600 hover:underline">
          {appConfig.supportEmail}
        </a>
      </p>
    </SimplePage>
  );
}

export function Contact() {
  document.title = `Contact | ${appConfig.appName}`;

  return (
    <SimplePage title="Contact Us" subtitle="We're here to help">
      <p>Need help with {appConfig.appName}? Contact our team.</p>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <ContactCard icon={Mail} label="Email" value={appConfig.supportEmail} href={`mailto:${appConfig.supportEmail}`} />
        <ContactCard icon={MapPin} label="Website" value={appConfig.domain} href={appConfig.domain} />
      </div>
      <h2>Quick links</h2>
      <p>
        <strong>Main App:</strong>{" "}
        <a href={appConfig.mainAppUrl} className="font-semibold text-blue-600 hover:underline">
          {appConfig.mainAppUrl}
        </a>
      </p>
      <p>
        <strong>Google Play:</strong>{" "}
        <a href={appConfig.playStoreUrl} target="_blank" rel="noreferrer" className="font-semibold text-blue-600 hover:underline">
          View on Play Store
        </a>
      </p>
      <p>
        <strong>App Store:</strong>{" "}
        <a href={appConfig.appStoreUrl} target="_blank" rel="noreferrer" className="font-semibold text-blue-600 hover:underline">
          View on App Store
        </a>
      </p>
    </SimplePage>
  );
}

function ContactCard({ icon: Icon, label, value, href }) {
  return (
    <a
      href={href}
      className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 transition hover:border-blue-200 hover:bg-blue-50"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
        <Icon size={18} />
      </span>
      <span>
        <span className="block text-xs font-bold uppercase tracking-wider text-slate-500">{label}</span>
        <span className="mt-0.5 block break-all text-sm font-semibold text-slate-900">{value}</span>
      </span>
    </a>
  );
}

function SimplePage({ title, subtitle, children }) {
  return (
    <main className="bg-slate-50 py-10 md:py-14">
      <div className="container-page max-w-3xl">
        <a href="/" className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-800">
          <ArrowLeft size={16} />
          Back to home
        </a>

        <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="bg-gradient-to-r from-blue-600 to-sky-500 px-6 py-7 md:px-8 md:py-8">
            <h1 className="text-2xl font-bold tracking-tight text-white md:text-4xl">{title}</h1>
            {subtitle && <p className="mt-1.5 text-sm text-white/90 md:text-base">{subtitle}</p>}
          </div>
          <div className="prose-page space-y-4 px-6 py-7 md:px-8 md:py-8">{children}</div>
        </article>
      </div>
    </main>
  );
}
