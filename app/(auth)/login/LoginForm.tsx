"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import LoadingOverlay from "@/components/LoadingOverlay";
import Image from "next/image";
import { Download, Smartphone, X, Mail, Globe, MessageSquare } from "lucide-react";

type AuthStatus = "idle" | "submitting" | "success" | "error";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/dashboard";

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<AuthStatus>("idle");

  // PWA install prompt state
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [showInstallModal, setShowInstallModal] = useState(false);
  const [installDismissed, setInstallDismissed] = useState(false);
  const [isIos, setIsIos] = useState(false);

  useEffect(() => {
    // Check if already dismissed
    if (localStorage.getItem("UNEQWURL-install-dismissed") === "1") {
      setInstallDismissed(true);
    }
    // Detect iOS (no beforeinstallprompt)
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIos(ios);

    const handler = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e);
      if (!installDismissed && !localStorage.getItem("UNEQWURL-install-dismissed")) {
        setShowInstallModal(true);
      }
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, [installDismissed]);

  async function handleInstall() {
    if (!installPrompt) return;
    // Copy session cookie to localStorage as backup for PWA session persistence
    try {
      const meRes = await fetch("/api/auth/me", { credentials: "include" });
      if (meRes.ok) {
        const user = await meRes.json();
        if (user?.id) {
          localStorage.setItem("UNEQWURL-pwa-user", JSON.stringify(user));
        }
      }
    } catch { /* ignore */ }

    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === "accepted") {
      localStorage.setItem("UNEQWURL-installed", "1");
    }
    setInstallPrompt(null);
    setShowInstallModal(false);
  }

  function handleDismiss() {
    localStorage.setItem("UNEQWURL-install-dismissed", "1");
    setInstallDismissed(true);
    setShowInstallModal(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("submitting");
    setError(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Login failed. Please check your credentials.");
        setStatus("error");
        return;
      }

      setStatus("success");
      // Brief delay to show success state before redirecting
      setTimeout(() => {
        router.push(next);
        router.refresh();
      }, 800);
    } catch {
      setError("Network error. Please try again.");
      setStatus("error");
    }
  }

  const isSubmitting = status === "submitting";

  const bgImages = [
    "https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=400&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1514525253361-bee243870eb2?w=400&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1493225255756-d9584f8606e9?w=400&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1520529612739-e47954932378?w=400&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1459749411177-042180ce673c?w=400&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1516280440614-37939bbacd81?w=400&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=400&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=400&auto=format&fit=crop",
  ];

  return (
    <>
      <LoadingOverlay
        visible={status === "submitting" || status === "success"}
        message={status === "success" ? "Welcome back!" : "Signing in..."}
      />

      {/* PWA Install Modal */}
      {showInstallModal && (
        <div className="pwa-install-overlay" onClick={handleDismiss}>
          <div className="pwa-install-modal" onClick={(e) => e.stopPropagation()}>
            <div className="pwa-install-header">
              <div className="pwa-install-icon">
                <Smartphone size={28} />
              </div>
              <h3>Install UNEQWURL</h3>
              <p>Install the app for the best experience — faster loading, offline access, and a native feel.</p>
            </div>
            <div className="pwa-install-actions">
              <button type="button" className="btn btn-primary pwa-install-btn" onClick={handleInstall}>
                <Download size={16} />
                Install App
              </button>
              <button type="button" className="pwa-dismiss-btn" onClick={handleDismiss}>
                <X size={14} />
                Ignore
              </button>
            </div>
            {isIos && (
              <p className="pwa-ios-hint">
                On iOS: tap the share icon in Safari, then &quot;Add to Home Screen&quot;.
              </p>
            )}
          </div>
        </div>
      )}

      <main className="auth-page">
        {/* Background Gallery */}
        <div className="auth-bg-gallery">
          {bgImages.map((src, i) => (
            <div key={i} className="auth-bg-img" style={{ backgroundImage: `url('${src}')` }} />
          ))}
          {bgImages.map((src, i) => (
            <div key={`dup-${i}`} className="auth-bg-img" style={{ backgroundImage: `url('${src}')` }} />
          ))}
        </div>

        <div className="auth-card">
          <div className="auth-logo">
            <Image 
              src="/assets/logo/footer-logo-allpages.png" 
              alt="UNEQWURL Logo" 
              width={180} 
              height={48} 
              priority
            />
          </div>

          <div className="auth-header">
            <h1>Welcome</h1>
          </div>

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="auth-field">
              <input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Email"
                autoComplete="username"
                required
                disabled={isSubmitting}
              />
            </div>

            <div className="auth-field">
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                autoComplete="current-password"
                required
                disabled={isSubmitting}
              />
              <Link href="#" className="auth-forgot-link">Forgot your password?</Link>
            </div>

            {status === "error" && error && (
              <div className="auth-error">{error}</div>
            )}

            {status === "success" && (
              <div className="auth-success">Login successful! Redirecting...</div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="auth-submit-btn"
            >
              {isSubmitting ? "Signing in..." : "Sign In"}
            </button>
          </form>

          <div className="auth-secondary-card">
            <p>
              Don&apos;t have an account?{" "}
              <Link href="/register">Register here</Link>
            </p>
          </div>
        </div>

        <footer className="auth-footer-links">
          <div className="auth-socials">
            <Link href="#" className="auth-social-icon"><Mail size={20} /></Link>
            <Link href="#" className="auth-social-icon"><Globe size={20} /></Link>
            <Link href="#" className="auth-social-icon"><MessageSquare size={20} /></Link>
          </div>
          <nav className="auth-legal-nav">
            <Link href="#">Terms of Use</Link>
            <Link href="#">Privacy Policy</Link>
            <Link href="#">Careers</Link>
            <Link href="#">FAQ</Link>
          </nav>
          <div className="auth-copyright">
            © {new Date().getFullYear()}UNEQWURL
          </div>
        </footer>
      </main>
    </>
  );
}
