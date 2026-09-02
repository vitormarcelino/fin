import Link from "next/link";
import { requireSession } from "@/lib/auth/session";
import { logoutAction } from "@/lib/auth/actions";
import { ImportIcon, RecurringIcon, TagIcon } from "@/components/nav/nav-icons";
import { PushManager } from "@/components/pwa/push-manager";

/**
 * "Config" — general settings. Currently just a flat list of links to
 * other configuration areas, but structured as a list so more settings
 * can be appended here later without a redesign.
 */
export default async function SettingsPage() {
  const session = await requireSession();

  return (
    <div className="flex flex-col gap-4 p-4 pb-24 lg:pb-6">
      <h1 className="text-xl font-semibold">Configurações</h1>
      <p className="text-sm text-foreground/60">Logado como {session.user.username}.</p>

      <div className="flex flex-col gap-2">
        <SettingsLink href="/recurring" title="Gastos fixos" subtitle="Gerencie lançamentos recorrentes">
          <RecurringIcon />
        </SettingsLink>
        <SettingsLink href="/tags" title="Tags" subtitle="Gerencie as tags usadas nos lançamentos">
          <TagIcon />
        </SettingsLink>
        <SettingsLink
          href="/import"
          title="Importar histórico"
          subtitle="Importe gastos de meses anteriores via CSV ou XLSX"
        >
          <ImportIcon />
        </SettingsLink>

        <PushManager />

        <form action={logoutAction}>
          <button
            type="submit"
            className="flex w-full items-center gap-3 rounded-xl border border-black/10 bg-white p-4 text-left text-sm font-medium text-red-600 active:opacity-70 dark:border-white/15 dark:bg-transparent dark:text-red-400"
          >
            Sair
          </button>
        </form>
      </div>
    </div>
  );
}

function SettingsLink({
  href,
  title,
  subtitle,
  children,
}: {
  href: string;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-xl border border-black/10 bg-white p-4 active:opacity-70 dark:border-white/15 dark:bg-transparent"
    >
      <span className="text-foreground/70">{children}</span>
      <span className="flex-1">
        <span className="block text-[15px] font-medium text-slate-900 dark:text-foreground">{title}</span>
        <span className="block text-xs text-slate-500 dark:text-foreground/60">{subtitle}</span>
      </span>
    </Link>
  );
}
