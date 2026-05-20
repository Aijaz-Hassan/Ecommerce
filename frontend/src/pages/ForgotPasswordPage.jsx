import { useMemo, useState } from "react";
import { ArrowLeft, Mail, Send } from "lucide-react";
import { Link } from "react-router-dom";
import LoadingSpinner from "../components/LoadingSpinner";
import { useAuth } from "../context/AuthContext";

export default function ForgotPasswordPage() {
  const { requestPasswordReset, resendPasswordReset } = useAuth();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [toast, setToast] = useState(null);

  const emailValid = useMemo(() => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()), [email]);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    window.setTimeout(() => setToast(null), 3200);
  };

  const submitRequest = async (event, resend = false) => {
    event.preventDefault();
    if (!emailValid) {
      showToast("Enter a valid email address.", "error");
      return;
    }
    setLoading(true);
    try {
      const payload = { email: email.trim() };
      let response;
      if (resend) {
        response = await resendPasswordReset(payload);
      } else {
        response = await requestPasswordReset(payload);
      }
      setSent(true);
      showToast(response?.message || "A password reset link has been sent to your email.");
    } catch (error) {
      showToast(error.response?.data?.message || "Unable to send reset email. Please try again later.", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-page reset-auth-page">
      {toast && <div className={`floating-toast ${toast.type}`}>{toast.message}</div>}
      <section className="auth-card reset-auth-card">
        <Link className="link-button auth-back-link" to="/login">
          <ArrowLeft size={17} />
          Back to login
        </Link>
        <div className="reset-icon-panel">
          <Mail size={34} />
        </div>
        <div>
          <p className="eyebrow">Forgot password</p>
          <h1>Recover access to your account.</h1>
          <p className="auth-helper-text">Enter your account email and we will send a secure password reset link that expires in 15 minutes.</p>
        </div>

        <form className="auth-form" onSubmit={(event) => submitRequest(event)}>
          <label>
            Email address
            <input name="email" type="email" placeholder="you@example.com" value={email} onChange={(event) => setEmail(event.target.value)} required />
          </label>
          <button className="solid-button" type="submit" disabled={loading}>
            {loading ? <LoadingSpinner label="Sending..." /> : <><Send size={18} /> Send Reset Link</>}
          </button>
        </form>

        {sent && (
          <div className="success-panel">
            <strong>Check your inbox</strong>
            <p>The link expires soon. Check your inbox and spam folder before requesting another link.</p>
            <button className="ghost-button" type="button" disabled={loading} onClick={(event) => submitRequest(event, true)}>
              Resend reset link
            </button>
          </div>
        )}
      </section>
    </main>
  );
}
