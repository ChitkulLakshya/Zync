import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Navbar from '@/components/layout/Navbar';
import HeroSection from '@/components/landing/HeroSection';
import FeaturesSection from '@/components/landing/FeaturesSection';
import MobileAppSection from '@/components/landing/MobileAppSection';
import CTASection from '@/components/landing/CTASection';
import Footer from '@/components/landing/Footer';

const Index = () => {
  const [phase, setPhase] = useState<'loading' | 'snapping' | 'done'>('loading');

  useEffect(() => {
    // Hold the loading shimmer for a brief moment to establish the calm aesthetic
    const timer1 = setTimeout(() => {
      setPhase('snapping');
    }, 1200);

    // After the snap/blur effect, reveal the main page
    const timer2 = setTimeout(() => {
      setPhase('done');
    }, 1500);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, []);

  return (
    <div className="min-h-screen bg-background relative selection:bg-primary/10">
      <AnimatePresence mode="wait">
        {phase !== 'done' ? (
          <motion.div
            key="loader"
            className="fixed inset-0 z-[100] flex items-center justify-center bg-background"
            exit={{ opacity: 0, transition: { duration: 0.3, ease: 'easeInOut' } }}
          >
            <motion.div
              initial={{ opacity: 0.5, scale: 1, filter: 'blur(0px)' }}
              animate={
                phase === 'loading'
                  ? { opacity: [0.5, 0.9, 0.5] }
                  : { scale: 0.95, opacity: 0, filter: 'blur(8px)' }
              }
              transition={
                phase === 'loading'
                  ? { duration: 1.5, repeat: Infinity, ease: 'easeInOut' }
                  : {
                      type: 'spring',
                      stiffness: 400,
                      damping: 25,
                      opacity: { duration: 0.2 },
                      filter: { duration: 0.2 },
                    }
              }
              className={`text-2xl sm:text-3xl font-semibold tracking-tight transition-colors duration-150 ${
                phase === 'loading' ? 'text-muted-foreground' : 'text-foreground'
              }`}
            >
              Zync
            </motion.div>
          </motion.div>
        ) : (
          <motion.div
            key="content"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.25, 1, 0.5, 1] }}
            className="min-h-screen flex flex-col"
          >
            <Navbar />
            <main>
              <HeroSection />
              <FeaturesSection />
              <MobileAppSection />
              <CTASection />
            </main>
            <Footer />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Index;
