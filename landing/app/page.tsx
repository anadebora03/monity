import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Hero } from "@/components/sections/hero";
import { TrackEverything } from "@/components/sections/track-everything";
import { ConnectedFlow } from "@/components/sections/connected-flow";
import { AppShowcase } from "@/components/sections/app-showcase";
import { PremiumFeatures } from "@/components/sections/premium-features";
import { Comparison } from "@/components/sections/comparison";
import { HowItWorks } from "@/components/sections/how-it-works";
import { Testimonials } from "@/components/sections/testimonials";
import { Faq } from "@/components/sections/faq";
import { FinalCta } from "@/components/sections/final-cta";

export default function Home() {
  return (
    <>
      <Navbar />
      <main className="flex-1">
        <Hero />
        <TrackEverything />
        <ConnectedFlow />
        <AppShowcase />
        <PremiumFeatures />
        <Comparison />
        <HowItWorks />
        <Testimonials />
        <Faq />
        <FinalCta />
      </main>
      <Footer />
    </>
  );
}
