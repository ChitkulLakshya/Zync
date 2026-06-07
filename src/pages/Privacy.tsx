import { Link } from "react-router-dom";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/landing/Footer";
import { Separator } from "@/components/ui/separator";

const Privacy = () => {
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
              Privacy Policy
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
                Introduction
              </h2>
              <p>
                Zync (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;) is a real-time
                collaboration desktop application designed to streamline team
                workflows. This Privacy Policy explains our practices regarding
                the collection, use, and disclosure of your information,
                including data received from Google APIs.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-semibold text-foreground">
                Information We Collect
              </h2>
              <p>
                To provide our core collaboration features, Zync collects the
                following information:
              </p>
              <div className="space-y-3 pl-4 border-l-2 border-border">
                <div>
                  <h3 className="font-medium text-foreground">
                    Google User Data
                  </h3>
                  <p className="mt-1">
                    When you connect your Google Account to Zync, we request
                    access to your <strong>Google Calendar</strong> data via
                    OAuth 2.0. The specific information we collect includes:
                    calendar event summaries, start/end times, descriptions of
                    team meetings, and names/identifiers of calendars you choose
                    to synchronize.
                  </p>
                </div>
                <div>
                  <h3 className="font-medium text-foreground">
                    Local Application Data
                  </h3>
                  <p className="mt-1">
                    Application settings (theme, notification preferences) and
                    technical logs stored locally on your device for debugging.
                  </p>
                </div>
                <div>
                  <h3 className="font-medium text-foreground">
                    Profile Information
                  </h3>
                  <p className="mt-1">
                    User profile data (display name, email, photo) is stored in
                    our database and Cloudinary for profile photos. This data is
                    used solely for authentication, workspace management, and
                    collaboration features.
                  </p>
                </div>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-semibold text-foreground">
                Google Workspace API Usage
              </h2>
              <p>
                Zync uses Google OAuth to authenticate users and integrate with
                Google Calendar. We request the{" "}
                <code className="rounded bg-muted px-1.5 py-0.5 text-sm">
                  https://www.googleapis.com/auth/calendar
                </code>{" "}
                scope solely to display your team meetings, synchronize
                schedules, and provide desktop notifications for upcoming
                meetings. Zync does not request, and does not have the ability
                to read, store, delete, or share your personal inbox data or
                existing emails. All calendar data is processed and cached
                locally on your device. We do not store your calendar data on
                centralized external servers, nor do we share or sell this
                information to third parties.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-semibold text-foreground">
                Google API &quot;Limited Use&quot; Disclosure
              </h2>
              <p>
                Zync&apos;s use and transfer to any other app of information
                received from Google APIs will adhere to the{" "}
                <a
                  href="https://developers.google.com/terms/api-services-user-data-policy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  Google API Services User Data Policy
                </a>
                , including the Limited Use requirements.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-semibold text-foreground">
                How We Use Your Information
              </h2>
              <p>
                We use Google Calendar data exclusively to: (1) display team
                meetings in the Zync dashboard, (2) synchronize schedules so
                meeting changes in Google Calendar are reflected in Zync in
                real-time, and (3) provide desktop notifications for upcoming
                meetings. We do not use your Google Calendar data for marketing,
                profiling, or selling to third parties.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-semibold text-foreground">
                Data Retention and Deletion
              </h2>
              <p>
                Google Calendar data is cached locally and cleared when you log
                out or disconnect the integration. OAuth tokens are stored
                securely in your system&apos;s credentials manager. You can
                revoke Zync&apos;s access at any time via your{" "}
                <a
                  href="https://myaccount.google.com/permissions"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  Google Security Settings
                </a>
                .
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-semibold text-foreground">
                Third-Party Disclosure
              </h2>
              <p>
                We do not share your personal information or Google Calendar
                data with third-party services, except as required to provide
                core functionality (e.g., Firebase for real-time
                synchronization, Cloudinary for profile photos) or as required
                by law.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-semibold text-foreground">
                Security
              </h2>
              <p>
                We implement industry-standard security measures including
                encryption in transit (HTTPS/TLS) and Electron&apos;s context
                isolation and sandboxing to protect your local data.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-semibold text-foreground">
                Changes to This Policy
              </h2>
              <p>
                We may update this Privacy Policy from time to time. We will
                notify you of significant changes via the application or our
                official website.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-semibold text-foreground">
                Contact
              </h2>
              <p>
                If you have questions about this Privacy Policy or our data
                practices, please contact us at{" "}
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

export default Privacy;
