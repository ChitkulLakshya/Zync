import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/landing/Footer";
import { Separator } from "@/components/ui/separator";

const PrivacyPolicy = () => {
  return (
    // What: Main container with minimum full viewport height and theme background.
    // Why: Ensures the page spans the screen and maintains visual consistency.
    <div className="min-h-screen bg-background flex flex-col">
      {/* What: The site's top navigation bar.
          Why: Allows users to navigate to other parts of the site from the policy page. */}
      <Navbar />
      {/* What: Main content area with padding and constrained maximum width.
          Why: Provides a clean, readable layout for text-heavy content like a privacy policy. */}
      <main className="flex-1 container mx-auto px-6 pt-32 pb-20 max-w-2xl">
        <div className="space-y-6">
          <div className="space-y-2">
            <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl">Privacy Policy</h1>
            <p className="text-muted-foreground text-lg">
              Transparency about how we handle your data.
            </p>
          </div>

          <Separator className="my-8" />

          <div className="prose prose-gray dark:prose-invert max-w-none space-y-6 leading-relaxed">
            <p className="text-lg leading-7">
              We only use user data for internal project collaboration.
            </p>

            <p className="leading-7">
              User data such as name, email, and activity logs are used solely to
              provide authentication, workspace management, and collaboration features.
              We do not sell, share, or distribute user data to third parties.
            </p>

            <p className="font-medium">
              This application is intended for internal or personal organizational use only.
            </p>

            <div className="pt-8">
              <p className="text-sm text-muted-foreground">
                Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default PrivacyPolicy;
