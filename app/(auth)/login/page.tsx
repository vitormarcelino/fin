import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { LoginForm } from "@/components/auth/login-form";

export default async function LoginPage() {
  // Authoritative check (real DB lookup, not just cookie presence) — the
  // proxy no longer bounces already-logged-in visitors away from /login,
  // so this is the only place that does. See proxy.ts for why.
  const session = await getSession();
  if (session) {
    redirect("/");
  }

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm flex flex-col gap-8">
        <div className="flex flex-col gap-1 text-center">
          <h1 className="text-2xl font-semibold">Fin</h1>
          <p className="text-sm text-black/60 dark:text-white/60">
            Entre para acessar suas finanças.
          </p>
        </div>
        <LoginForm />
      </div>
    </main>
  );
}
