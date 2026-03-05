import { redirect } from "next/navigation";
import AdminNav from "@/components/AdminNav";
import SignOutButton from "@/components/SignOutButton";
import { requireSuperadmin } from "@/lib/adminData";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }) {
  const auth = await requireSuperadmin();
  console.log("[AUTH] AdminLayout auth result", {
    userId: auth.user?.id ?? null,
    isSuperadmin: Boolean(auth.isSuperadmin)
  });

  if (!auth.user) {
    console.log("[AUTH] About to redirect to:", "/login");
    redirect("/login");
  }

  if (!auth.isSuperadmin) {
    console.log("[AUTH] About to redirect to:", "/login?error=superadmin_required");
    redirect("/login?error=superadmin_required");
  }

  return (
    <main className="shell">
      <div className="topbar">
        <div>
          <p className="kicker">Humor Project</p>
          <h1 style={{ margin: 0 }}>Superadmin Console</h1>
        </div>
        <SignOutButton />
      </div>
      <div className="panel" style={{ marginBottom: "1rem" }}>
        <AdminNav />
      </div>
      {children}
    </main>
  );
}
