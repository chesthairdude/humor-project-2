import { redirect } from "next/navigation";
import AdminNav from "@/components/AdminNav";
import SignOutButton from "@/components/SignOutButton";
import { requireSuperadmin } from "@/lib/adminData";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }) {
  const auth = await requireSuperadmin();

  if (!auth.user) {
    redirect("/login?next=/admin");
  }

  if (!auth.isSuperadmin) {
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
