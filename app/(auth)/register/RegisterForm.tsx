"use client";

import { useState } from "react";
import Image from "next/image";
import { Mail, Globe, MessageSquare } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import LoadingOverlay from "@/components/LoadingOverlay";

type AuthStatus = "idle" | "submitting" | "success" | "error";

export default function RegisterForm() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<AuthStatus>("idle");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("submitting");
    setError(null);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Registration failed. Please try a different username.");
        setStatus("error");
        return;
      }

      setStatus("success");
      setTimeout(() => {
        router.push("/login?registered=1");
      }, 1200);
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
        message={status === "success" ? "Account created!" : "Creating account..."}
      />

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
            <h1>Create Account</h1>
          </div>

          <form onSubmit={handleSubmit} className="auth-form" data-testid="register-form">
            <div className="auth-field">
              <input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Choose a username"
                minLength={3}
                autoComplete="username"
                required
                disabled={isSubmitting}
                data-testid="register-username"
              />
            </div>

            <div className="auth-field">
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Create a password"
                minLength={4}
                autoComplete="new-password"
                required
                disabled={isSubmitting}
                data-testid="register-password"
              />
            </div>

            {status === "error" && error && (
              <div className="auth-error" data-testid="register-error">{error}</div>
            )}

            {status === "success" && (
              <div className="auth-success" data-testid="register-success">
                Account created successfully! Redirecting to login...
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="auth-submit-btn"
              data-testid="register-submit"
            >
              {isSubmitting ? "Creating..." : "Sign Up"}
            </button>
          </form>

          <div className="auth-secondary-card">
            <p>
              Already registered?{" "}
              <Link href="/login">Sign in here</Link>
            </p>
          </div>
        </div>

        <footer className="auth-footer-links">
          <div className="auth-socials">
            <Link href="#" className="auth-social-icon" aria-label="Email us"><Mail size={20} /></Link>
            <Link href="#" className="auth-social-icon" aria-label="Visit website"><Globe size={20} /></Link>
            <Link href="#" className="auth-social-icon" aria-label="Contact support"><MessageSquare size={20} /></Link>
          </div>
          <nav className="auth-legal-nav">
            <Link href="#">Terms of Use</Link>
            <Link href="#">Privacy Policy</Link>
            <Link href="#">Careers</Link>
            <Link href="#">FAQ</Link>
          </nav>
          <div className="auth-copyright">
            © {new Date().getFullYear()} Play
          </div>
        </footer>
      </main>
    </>
  );
}
