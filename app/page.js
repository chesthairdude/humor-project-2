import { redirect } from "next/navigation";

export default async function HomePage({ searchParams }) {
  const params = await searchParams;
  const code = params?.code;
  const nextParam = params?.next;
  const safeNext = typeof nextParam === "string" && nextParam.startsWith("/") ? nextParam : "/admin";
  console.log("[AUTH] Root page hit", {
    hasCode: Boolean(code),
    nextParam,
    safeNext
  });

  if (code) {
    const callbackPath = `/auth/callback?code=${encodeURIComponent(code)}&next=${encodeURIComponent(safeNext)}`;
    console.log("[AUTH] About to redirect to:", callbackPath);
    redirect(callbackPath);
  }

  console.log("[AUTH] About to redirect to:", "/admin");
  redirect("/admin");
}
