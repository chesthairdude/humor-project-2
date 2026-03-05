import { redirect } from "next/navigation";

export default async function HomePage({ searchParams }) {
  const params = await searchParams;
  const code = params?.code;
  console.log("[AUTH] Root page hit", {
    hasCode: Boolean(code)
  });

  if (code) {
    const callbackPath = `/auth/callback?code=${encodeURIComponent(code)}`;
    console.log("[AUTH] About to redirect to:", callbackPath);
    redirect(callbackPath);
  }

  console.log("[AUTH] About to redirect to:", "/admin");
  redirect("/admin");
}
