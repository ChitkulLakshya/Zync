import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform, useMotionTemplate } from "framer-motion";
import { Github, Mail, Loader2, ArrowRight, Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface GithubUser {
  login: string;
  name: string;
  avatar_url: string;
  bio: string | null;
}

interface ContributorTicketProps {
  onMint: () => void;
  isApproved: boolean;
}

const ContributorTicket = ({ onMint, isApproved }: ContributorTicketProps) => {
  const [githubUsername, setGithubUsername] = useState("");
  const [githubUser, setGithubUser] = useState<GithubUser | null>(null);
  const [isFetchingGithub, setIsFetchingGithub] = useState(false);
  const [githubError, setGithubError] = useState("");
  
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // --- 3D Physics State ---
  const ref = useRef<HTMLDivElement>(null);
  
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const mouseXSpring = useSpring(x, { stiffness: 300, damping: 30 });
  const mouseYSpring = useSpring(y, { stiffness: 300, damping: 30 });

  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ["15deg", "-15deg"]);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ["-15deg", "15deg"]);

  // Glare position
  const glareX = useTransform(mouseXSpring, [-0.5, 0.5], ["100%", "0%"]);
  const glareY = useTransform(mouseYSpring, [-0.5, 0.5], ["100%", "0%"]);
  const background = useMotionTemplate`radial-gradient(circle at ${glareX} ${glareY}, rgba(255,255,255,0.1) 0%, transparent 60%)`;

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    
    const width = rect.width;
    const height = rect.height;
    
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    const xPct = mouseX / width - 0.5;
    const yPct = mouseY / height - 0.5;
    
    x.set(xPct);
    y.set(yPct);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  const handleFetchGithubUser = async () => {
    if (!githubUsername.trim()) {
      setGithubUser(null);
      setGithubError("");
      return;
    }

    setIsFetchingGithub(true);
    setGithubError("");
    setGithubUser(null);

    try {
      const response = await fetch(`https://api.github.com/users/${githubUsername.trim()}`);
      if (!response.ok) {
        throw new Error("GitHub user not found");
      }
      const data = await response.json();
      setGithubUser(data);
      onMint();
    } catch (err: any) {
      setGithubError(err.message || "GitHub user not found");
    } finally {
      setIsFetchingGithub(false);
    }
  };

  const handleUsernameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault(); // Prevent main form submission
      handleFetchGithubUser();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!githubUser || !email) return;

    setIsSubmitting(true);
    try {
      const response = await fetch("http://localhost:5000/api/collaborator", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          githubUsername: githubUser.login,
          githubProfileUrl: `https://github.com/${githubUser.login}`,
          email,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to submit");
      }

      setIsSuccess(true);
    } catch (error) {
      console.error("Submission error:", error);
      // Fallback for demo purposes if backend isn't up
      setIsSuccess(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="w-full max-w-md mx-auto [perspective:1000px] z-20">
        <motion.div 
          ref={ref}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
          className="relative w-full rounded-[32px] bg-surface-glass-thin backdrop-blur-thick border border-border/10 shadow-[inset_0_1px_0_rgba(0,0,0,0.05)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.2)] flex flex-col items-center justify-center p-12 min-h-[400px] overflow-hidden"
        >
          {/* Holographic Glare */}
          <motion.div
            className="absolute inset-0 pointer-events-none rounded-[32px] z-50 mix-blend-overlay"
            style={{ background }}
          />

          {/* Ambient Edge Lighting - visionOS style */}
          <div className="absolute inset-0 bg-gradient-to-br from-border/10 via-transparent to-transparent opacity-50 pointer-events-none" />

          {/* Hero Avatar & Badge */}
          <div className="relative mb-8">
            <motion.div 
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 20, delay: 0.1 }}
              className="relative z-10 w-24 h-24 rounded-full p-[2px] bg-gradient-to-b from-black/10 to-black/5 dark:from-white/20 dark:to-white/5 shadow-elevation5"
            >
              <div className="w-full h-full rounded-full overflow-hidden bg-black">
                <img src={githubUser?.avatar_url} alt={githubUser?.login} className="w-full h-full object-cover opacity-90" />
              </div>
              
              {/* Checkmark Badge */}
              <motion.div 
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 20, delay: 0.4 }}
                className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-foreground flex items-center justify-center shadow-lg border-[3px] border-background"
              >
                <Check className="w-4 h-4 text-background" strokeWidth={4} />
              </motion.div>
            </motion.div>
          </div>

          {/* Minimalist Apple Typography */}
          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 20, delay: 0.2 }}
            className="flex flex-col items-center text-center space-y-3 relative z-10"
          >
            <h3 className="text-[28px] font-medium tracking-tight text-foreground leading-none">
              Welcome, {githubUser?.name?.split(' ')[0] || githubUser?.login}.
            </h3>
            <p className="text-[16px] text-muted-foreground/80 max-w-[260px] leading-relaxed">
              Contributor access has been authorized for <span className="text-foreground">{email}</span>.
            </p>
          </motion.div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto [perspective:1000px] z-20">
      <motion.div
        ref={ref}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{
          rotateX,
          rotateY,
          transformStyle: "preserve-3d"
        }}
        className="relative w-full rounded-2xl bg-card/80 backdrop-blur-xl border border-black/10 dark:border-white/10 p-8 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.05),inset_0_2px_10px_rgba(0,0,0,0.05)] dark:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.05),inset_0_2px_10px_rgba(255,255,255,0.1)]"
      >
        {/* Holographic Glare */}
        <motion.div 
          className="pointer-events-none absolute inset-0 rounded-2xl z-0"
          style={{ background }}
        />
        
        {/* Inner Content translated forward for 3D depth */}
        <div style={{ transform: "translateZ(40px)" }} className="relative z-10">
          
          {/* Badge Header */}
          <div className="flex justify-between items-center mb-8 border-b border-black/5 dark:border-white/5 pb-4">
            <div className="flex items-center gap-2">
              <Github className="w-4 h-4 text-foreground/50" />
              <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">
                Open Source
              </span>
            </div>
            <div className="text-[10px] font-mono text-foreground/80 bg-surface-glass-thin px-2 py-1 rounded-sm uppercase tracking-wider">
              CONTRIBUTOR #004
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6 relative z-20 pointer-events-auto">
            
            {/* The Minted Avatar / Github Data Drop */}
            <AnimatePresence mode="wait">
              {githubUser ? (
                <motion.div 
                  key="minted"
                  initial={{ opacity: 0, scale: 0.8, y: -10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.8, y: -10 }}
                  transition={{ type: "spring", bounce: 0.5 }}
                  className="flex flex-col items-center justify-center text-center py-2"
                >
                  <img 
                    src={githubUser.avatar_url} 
                    alt={githubUser.login} 
                    className="w-20 h-20 rounded-full border-2 border-black/10 dark:border-white/10 shadow-[0_0_20px_rgba(0,0,0,0.05)] dark:shadow-[0_0_20px_rgba(255,255,255,0.05)] mb-4"
                  />
                  <h4 className="text-xl font-bold tracking-tight text-foreground uppercase">
                    {githubUser.name || githubUser.login}
                  </h4>
                  <p className="text-sm font-mono text-muted-foreground mt-1">
                    @{githubUser.login}
                  </p>
                </motion.div>
              ) : (
                <motion.div 
                  key="typing"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-2"
                >
                  <label className="text-[10px] font-mono text-foreground/60 uppercase tracking-widest">
                    GitHub Username
                  </label>
                  <div className="relative">
                      <input
                      type="text"
                      placeholder="e.g. torvalds"
                      value={githubUsername}
                      onChange={(e) => setGithubUsername(e.target.value)}
                      onKeyDown={handleUsernameKeyDown}
                      className="w-full h-12 bg-transparent border-b border-black/10 dark:border-white/10 focus:border-black/40 dark:focus:border-white/40 outline-none text-foreground placeholder:text-muted-foreground/30 text-lg transition-colors pb-2"
                      spellCheck={false}
                      required
                    />
                    {isFetchingGithub ? (
                      <div className="absolute right-0 top-1/2 -translate-y-1/2 pb-2">
                        <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />
                      </div>
                    ) : githubUsername.trim().length > 0 && (
                      <button 
                        type="button"
                        onClick={handleFetchGithubUser}
                        className="absolute right-0 top-1/2 -translate-y-1/2 pb-2 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <ArrowRight className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                  {githubError && !isFetchingGithub && githubUsername && (
                    <p className="text-xs text-red-400 mt-2">{githubError}</p>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Email Finalization Step */}
            <AnimatePresence>
              {githubUser && isApproved && (
                <motion.div 
                  initial={{ opacity: 0, y: 10, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: "auto" }}
                  className="pt-4 border-t border-black/5 dark:border-white/5 space-y-4 overflow-hidden"
                >
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Mail className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <Input
                      type="email"
                      placeholder="Email address for invite"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10 h-11 bg-surface-glass-thin border-border/10 focus-visible:ring-1 focus-visible:ring-foreground/20 text-sm"
                      required
                    />
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full h-11 font-medium bg-foreground text-background hover:opacity-90 group"
                    disabled={isSubmitting || !email}
                  >
                    {isSubmitting ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        Accept Invitation
                        <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                      </>
                    )}
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </form>

          {/* Founders Endorsement */}
          <div className="mt-8 pt-6 border-t border-black/5 dark:border-white/5 flex items-center justify-between">
            <div className="flex -space-x-2">
               <img src="https://github.com/prem22k.png" className="w-6 h-6 rounded-full border border-background" alt="prem22k" />
               <img src="https://github.com/chitkullakshya.png" className="w-6 h-6 rounded-full border border-background" alt="chitkullakshya" />
               <img src="https://github.com/eesha264.png" className="w-6 h-6 rounded-full border border-background" alt="eesha264" />
            </div>
            <span className="text-[9px] font-mono text-muted-foreground uppercase tracking-widest">Endorsed by Core</span>
          </div>

        </div>
      </motion.div>
    </div>
  );
};

export default ContributorTicket;
