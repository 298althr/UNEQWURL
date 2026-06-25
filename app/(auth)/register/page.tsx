import Image from "next/image";
import Link from "next/link";
import RegisterForm from "./RegisterForm";

const registrationEnabled =
  process.env.REGISTRATION_ENABLED === "true" ||
  process.env.NODE_ENV !== "production";

export default function RegisterPage() {
  if (!registrationEnabled) {
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
            <h1>Coming Soon</h1>
          </div>

          <p className="auth-coming-soon">
            New registrations are temporarily closed. Please check back later.
          </p>

          <div className="auth-secondary-card">
            <p>
              Already have an account?{" "}
              <Link href="/login">Sign in here</Link>
            </p>
          </div>
        </div>
      </main>
    );
  }

  return <RegisterForm />;
}
