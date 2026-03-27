import { redirect } from "next/navigation";
import SignOutButton from "@/components/SignOutButton";
import Sidebar from "@/components/admin/Sidebar";
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
    <div className="admin-viewport">
      <header className="admin-topbar">
        <div>
          <p className="kicker">Humor Project</p>
          <h1>Superadmin Console</h1>
        </div>
        <SignOutButton className="admin-button ghost admin-signout-button" />
      </header>
      <div className="admin-layout">
        <Sidebar />
        <section className="admin-main">{children}</section>
      </div>
    </div>
  );
}
