import { redirect } from "next/navigation";

export default async function HomePage({ searchParams }) {
  const params = await searchParams;
  const code = params?.code;
  const nextParam = params?.next;
  const safeNext = typeof nextParam === "string" && nextParam.startsWith("/") ? nextParam : "/admin";

  if (code) {
    const callbackPath = `/auth/callback?code=${encodeURIComponent(code)}&next=${encodeURIComponent(safeNext)}`;
    redirect(callbackPath);
  }

  redirect("/admin");
}
