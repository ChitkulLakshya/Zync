import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/landing/Footer";

const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-12 max-w-3xl">
        <h1 className="text-3xl font-bold mb-8">Privacy Policy</h1>
        
        <div className="prose dark:prose-invert">
          <p className="mb-4">
            We only use user data for internal project collaboration.
          </p>
          
          <p className="mb-4">
            User data such as name, email, and activity logs are used solely to
            provide authentication, workspace management, and collaboration features.
            We do not sell, share, or distribute user data to third parties.
          </p>
          
          <p className="mb-8">
            This application is intended for internal or personal organizational use only.
          </p>

          <p className="text-sm text-muted-foreground mt-8 pt-8 border-t">
            Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default PrivacyPolicy;
