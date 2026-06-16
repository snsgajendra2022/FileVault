import Header from "./components/Header";
import Hero from "./components/Hero";
import BlogSection from "./components/BlogSection";
import Footer from "./components/Footer";
import { AudienceSection, CtaSection, FeaturesSection, HowItWorksSection } from "./components/Sections";
import BlogPage from "./pages/BlogPage";
import { Contact, PrivacyPolicy, Terms } from "./pages/PolicyPages";
import { appConfig } from "./data/config";

export function HomePage() {
  document.title = `${appConfig.appName} - Digital Album Maker, Flipbook & Guest Book App`;

  return (
    <>
      <Hero />
      <FeaturesSection />
      <HowItWorksSection />
      <AudienceSection />
      <BlogSection />
      <CtaSection />
    </>
  );
}

export default function App() {
  const path = window.location.pathname.replace(/\/$/, "") || "/";

  if (path === "/privacy-policy") {
    return (
      <>
        <Header />
        <PrivacyPolicy />
        <Footer />
      </>
    );
  }

  if (path === "/terms") {
    return (
      <>
        <Header />
        <Terms />
        <Footer />
      </>
    );
  }

  if (path === "/contact") {
    return (
      <>
        <Header />
        <Contact />
        <Footer />
      </>
    );
  }

  if (path.startsWith("/blog/")) {
    const slug = path.replace("/blog/", "");
    return (
      <>
        <Header />
        <BlogPage slug={slug} />
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header />
      <HomePage />
      <Footer />
    </>
  );
}
