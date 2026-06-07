import { Link } from "react-router-dom";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/landing/Footer";
import { Separator } from "@/components/ui/separator";

const Terms = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <main className="flex-1 container mx-auto px-6 pt-32 pb-20 max-w-3xl">
        <div className="space-y-8">
          <div className="space-y-2">
            <Link
              to="/"
              className="text-sm text-primary hover:text-primary/90 transition-colors"
            >
              ← Back to Home
            </Link>
            <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl text-foreground">
              Terms of Service
            </h1>
            <p className="text-muted-foreground text-sm">
              Last updated:{" "}
              {new Date().toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>

          <Separator className="my-8" />

          <div className="space-y-8 leading-relaxed text-muted-foreground">
            <section className="space-y-4">
              <h2 className="text-xl font-semibold text-foreground">
                Agreement to Terms
              </h2>
              <p>
                By accessing or using Zync, you agree to be bound by these Terms
                of Service. If you do not agree to these terms, you may not use
                the service.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-semibold text-foreground">
                Description of Service
              </h2>
              <p>
                Zync is a real-time collaboration platform built for development
                teams, providing a unified interface for communication, project
                management, and code collaboration. Features include Dashboard,
                Workspace (Kanban boards), Calendar, Notes, Tasks, Chat, Meet
                (video conferencing), and Activity Log. The service is provided
                &quot;as is&quot; without warranties of any kind, express or
                implied. Zync is available as both a web application and a
                cross-platform desktop application (Electron). Its availability,
                features, and functionality may change over time.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-semibold text-foreground">
                User Responsibility
              </h2>
              <p>
                You are fully responsible for all actions you take through Zync.
                This includes, but is not limited to: content you create or
                share in notes, tasks, and chat; data you upload or sync (e.g.,
                via GitHub integration or Google Calendar); invitations you send
                to team members; and any decisions you make regarding project
                management, task assignments, or workspace configuration. You
                must ensure you have appropriate authorization to share content
                and collaborate with others. You are responsible for maintaining
                the confidentiality of your account credentials.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-semibold text-foreground">
                Limitation of Liability
              </h2>
              <p>
                To the maximum extent permitted by law, the creators,
                contributors, and maintainers of Zync shall not be liable for
                any direct, indirect, incidental, special, consequential, or
                punitive damages, including but not limited to: data loss,
                service interruptions, loss of revenue, or any other damages
                arising from your use of the platform. You use Zync at your own
                risk. We are not liable for harm caused by user-initiated
                actions, third-party integrations (e.g., GitHub, Google
                Calendar), or circumstances beyond our control.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-semibold text-foreground">
                Acceptable Use
              </h2>
              <p>
                You agree not to use Zync for any unlawful purpose or in any way
                that could harm, disable, or overburden the service. You will
                not attempt to gain unauthorized access to any systems or
                accounts, distribute malware, or use the platform to harass or
                harm others.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-semibold text-foreground">
                Third-Party Services
              </h2>
              <p>
                Zync integrates with third-party services such as Firebase,
                GitHub, and Google. Your use of these integrations is subject to
                their respective terms and policies. We are not responsible for
                the availability or conduct of third-party services.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-semibold text-foreground">
                Modifications
              </h2>
              <p>
                We reserve the right to modify these Terms of Service at any
                time. Continued use of Zync after changes constitutes acceptance
                of the updated terms. We encourage you to review this page
                periodically.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-semibold text-foreground">
                License
              </h2>
              <p>
                Zync is licensed under the MIT License. You may use, modify, and
                distribute it in accordance with the license. Contributions to
                the project are welcome and subject to our contribution
                guidelines.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-semibold text-foreground">
                Contact
              </h2>
              <p>
                For questions about these Terms of Service, please contact us at{" "}
                <a
                  href="mailto:consolemaster.app@gmail.com"
                  className="text-primary hover:underline"
                >
                  consolemaster.app@gmail.com
                </a>
                .
              </p>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Terms;
