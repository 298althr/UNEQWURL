import { Suspense } from "react";
import LoginPage from "./LoginForm";

function AuthFallback() {
  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="dashboard-loading">
          <div className="loading-spinner" />
          <p>Loading...</p>
        </div>
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<AuthFallback />}>
      <LoginPage />
    </Suspense>
  );
}
