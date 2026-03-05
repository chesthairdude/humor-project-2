import LoginForm from "./LoginForm";

export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }) {
  const params = await searchParams;
  const error = params?.error;

  return (
    <main className="shell">
      <section className="panel" style={{ maxWidth: 480, margin: "5rem auto" }}>
        <p className="kicker">Admin Access</p>
        <h1>Sign in</h1>
        <p>Only users with <code>profiles.is_superadmin = TRUE</code> can enter the admin area.</p>
        {error === "superadmin_required" ? (
          <p className="error">Your account is authenticated but is not marked as superadmin.</p>
        ) : null}
        <LoginForm />
      </section>
    </main>
  );
}
