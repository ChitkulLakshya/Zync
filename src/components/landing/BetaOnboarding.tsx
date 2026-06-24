import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Github, Mail, Loader2, CheckCircle2, ArrowRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface GithubUser {
  login: string;
  name: string;
  avatar_url: string;
  bio: string | null;
}

const BetaOnboarding = () => {
  const [githubUsername, setGithubUsername] = useState("");
  const [debouncedUsername, setDebouncedUsername] = useState("");
  const [githubUser, setGithubUser] = useState<GithubUser | null>(null);
  const [isFetchingGithub, setIsFetchingGithub] = useState(false);
  const [githubError, setGithubError] = useState("");
  
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const [otp, setOtp] = useState("");
  const [showOtp, setShowOtp] = useState(false);
  const [otpError, setOtpError] = useState("");

  // Debounce the github username input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedUsername(githubUsername);
    }, 500);
    return () => clearTimeout(timer);
  }, [githubUsername]);

  // Fetch github user details when debounced username changes
  useEffect(() => {
    if (!debouncedUsername) {
      setGithubUser(null);
      setGithubError("");
      return;
    }

    const fetchGithubUser = async () => {
      setIsFetchingGithub(true);
      setGithubError("");
      setGithubUser(null);

      try {
        const response = await fetch(`https://api.github.com/users/${debouncedUsername}`);
        if (!response.ok) {
          throw new Error("GitHub user not found");
        }
        const data = await response.json();
        setGithubUser(data);
      } catch (err: any) {
        setGithubError(err.message || "GitHub user not found");
      } finally {
        setIsFetchingGithub(false);
      }
    };

    fetchGithubUser();
  }, [debouncedUsername]);

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!githubUser || !email) return;

    setIsSubmitting(true);
    setOtpError("");
    try {
      const response = await fetch("http://localhost:5000/api/collaborator/request-otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          githubUsername: githubUser.login,
          email,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to request OTP");
      }

      setShowOtp(true);
    } catch (error: any) {
      console.error("Submission error:", error);
      setOtpError(error.message || "Failed to send OTP. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp) return;

    setIsSubmitting(true);
    setOtpError("");
    try {
      const response = await fetch("http://localhost:5000/api/collaborator/verify-otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          githubUsername: githubUser?.login,
          email,
          otp
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to verify OTP");
      }

      setIsSuccess(true);
    } catch (error: any) {
      console.error("Verification error:", error);
      setOtpError(error.message || "Invalid OTP code.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md mx-auto bg-surface-glass-regular backdrop-blur-md border border-white/10 dark:border-white/5 rounded-2xl p-8 text-center shadow-xl"
      >
        <div className="w-16 h-16 bg-emerald-500/20 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <h3 className="text-2xl font-bold text-foreground mb-2">You're on the list!</h3>
        <p className="text-muted-foreground">
          Thanks for joining the Zync beta, {githubUser?.name || githubUser?.login}! An official GitHub invitation has been sent to your email <strong className="text-foreground">{email}</strong>.
        </p>
      </motion.div>
    );
  }

  if (showOtp) {
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md mx-auto"
      >
        <form onSubmit={handleVerifyOtp} className="space-y-6">
          <div className="bg-surface-glass-regular backdrop-blur-md border border-white/10 dark:border-white/5 rounded-2xl p-6 shadow-lg">
            <h3 className="text-xl font-bold text-foreground mb-2">Check your email</h3>
            <p className="text-sm text-muted-foreground mb-6">
              We sent a 6-digit verification code to <span className="font-semibold text-foreground">{email}</span>.
            </p>
            
            <div className="space-y-4">
              <Input
                type="text"
                placeholder="Enter 6-digit OTP"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="h-12 text-center text-xl tracking-widest bg-black/5 dark:bg-white/5 border-white/10 focus-visible:ring-primary/30"
                required
              />
              {otpError && (
                <p className="text-xs text-red-400 text-center">{otpError}</p>
              )}
              <Button 
                type="submit" 
                size="lg" 
                className="w-full h-12 font-medium text-base group"
                disabled={isSubmitting || otp.length < 6}
              >
                {isSubmitting ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    Verify & Join
                    <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </Button>
              <button 
                type="button" 
                onClick={() => {
                  setShowOtp(false);
                  setOtp("");
                  setOtpError("");
                }}
                className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors mt-2"
              >
                Back to email entry
              </button>
            </div>
          </div>
        </form>
      </motion.div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto">
      <form onSubmit={handleRequestOtp} className="space-y-6">
        {/* GitHub Integration Section */}
        <div className="relative bg-surface-glass-regular backdrop-blur-md border border-white/10 dark:border-white/5 rounded-2xl p-1 shadow-lg transition-all duration-300 focus-within:ring-2 focus-within:ring-primary/30">
          <div className="flex items-center px-4 py-3 gap-3 border-b border-border/5">
            <Github className="w-5 h-5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Enter your GitHub username"
              value={githubUsername}
              onChange={(e) => setGithubUsername(e.target.value)}
              className="flex-1 bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground text-sm font-medium"
              spellCheck={false}
              required
            />
            {isFetchingGithub && <Loader2 className="w-4 h-4 text-muted-foreground animate-spin" />}
          </div>

          <AnimatePresence mode="wait">
            {githubUser && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="px-4 py-4 flex items-start gap-4">
                  <img 
                    src={githubUser.avatar_url} 
                    alt={githubUser.login} 
                    className="w-12 h-12 rounded-full border border-border/10 shadow-sm"
                  />
                  <div className="flex-1 min-w-0 text-left">
                    <p className="text-sm font-semibold text-foreground truncate">
                      {githubUser.name || githubUser.login}
                    </p>
                    <p className="text-xs text-muted-foreground truncate mb-1">
                      @{githubUser.login}
                    </p>
                    {githubUser.bio && (
                      <p className="text-xs text-muted-foreground/80 line-clamp-2 leading-relaxed">
                        {githubUser.bio}
                      </p>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {githubError && !isFetchingGithub && githubUsername && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="px-4 py-3 text-xs text-red-400 text-left"
              >
                {githubError}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Email & Submit Section */}
        <AnimatePresence>
          {githubUser && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                </div>
                <Input
                  type="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-11 h-12 bg-surface-glass-regular border-white/10 dark:border-white/5 focus-visible:ring-primary/30"
                  required
                />
              </div>
              
              {otpError && !showOtp && (
                <p className="text-xs text-red-400 text-center mt-2">{otpError}</p>
              )}

              <Button 
                type="submit" 
                size="lg" 
                className="w-full h-12 font-medium text-base group"
                disabled={isSubmitting || !email}
              >
                {isSubmitting ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    Send Verification Code
                    <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </form>
    </div>
  );
};

export default BetaOnboarding;
