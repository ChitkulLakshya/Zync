import Navbar from "@/components/layout/Navbar";
import HeroSection from "@/components/landing/HeroSection";
import FeaturesSection from "@/components/landing/FeaturesSection";
import MobileAppSection from "@/components/landing/MobileAppSection";
import CTASection from "@/components/landing/CTASection";
import Footer from "@/components/landing/Footer";
import { IntegrationMarquee } from "@/components/landing/IntegrationMarquee";
import { DotPatternBackground } from "@/components/layout/DotPatternBackground";
import { VerticalConnectingLine, HorizontalDivider } from "@/components/layout/ConnectingLines";

const Index = () => {
  return (
    <DotPatternBackground containerClassName="min-h-screen">
      <Navbar />
      <main>
        <HeroSection />
        <VerticalConnectingLine height="h-32" />
        <FeaturesSection />
        <HorizontalDivider className="py-4" />
        <IntegrationMarquee />
        <VerticalConnectingLine height="h-24" className="mt-8" />
        <MobileAppSection />
        <VerticalConnectingLine height="h-32" />
        <CTASection />
      </main>
      <Footer />
    </DotPatternBackground>
  );
};

export default Index;
