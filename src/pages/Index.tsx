import Navbar from "@/components/layout/Navbar";
import HeroSection from "@/components/landing/HeroSection";
import FeaturesSection from "@/components/landing/FeaturesSection";
import MobileAppSection from "@/components/landing/MobileAppSection";
import CTASection from "@/components/landing/CTASection";
import Footer from "@/components/landing/Footer";
import { DotPatternBackground } from "@/components/layout/DotPatternBackground";

const Index = () => {
  return (
    <DotPatternBackground containerClassName="min-h-screen">
      <Navbar />
      <main>
        <HeroSection />
        <FeaturesSection />
        <MobileAppSection />
        <CTASection />
      </main>
      <Footer />
    </DotPatternBackground>
  );
};

export default Index;
