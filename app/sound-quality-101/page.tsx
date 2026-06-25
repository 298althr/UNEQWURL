import Image from "next/image";
import Link from "next/link";

export default function SoundQuality101Page() {
  return (
    <main className="auth-page">
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
          <h1>Sound Quality 101</h1>
        </div>

        <p className="auth-coming-soon">
          Coming soon. Learn the fundamentals of audio quality, EQ, and mixing.
        </p>

        <div className="landing-cta-row">
          <Link href="/" className="landing-btn landing-btn-primary">
            Go Home
          </Link>
        </div>
      </div>
    </main>
  );
}
