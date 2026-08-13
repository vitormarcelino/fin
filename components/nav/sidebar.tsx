"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logoutAction } from "@/lib/auth/actions";
import { CalendarIcon, OverviewIcon, PlusIcon, QueueIcon, SettingsIcon } from "@/components/nav/nav-icons";

/**
 * Desktop-only sidebar nav (SaaS-style), `lg:` and up. Mobile keeps the
 * BottomNav untouched — this is a wholly separate presentation, not a
 * responsive variant of the same component.
 */
export function Sidebar({ username }: { username: string }) {
  const pathname = usePathname();

  return (
    <aside
      className="fixed inset-y-0 left-0 z-20 hidden w-64 flex-col border-r border-black/10 bg-background lg:flex dark:border-white/15"
      aria-label="Navegação principal"
    >
      <div className="p-4">
        <span className="text-lg font-semibold">Fin</span>
      </div>

      <div className="px-4">
        <Link
          href="/entries/new"
          className="flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 text-sm font-medium text-white shadow-sm active:bg-emerald-700"
        >
          <PlusIcon />
          Novo lançamento
        </Link>
      </div>

      <nav className="mt-6 flex flex-col gap-1 px-3">
        <SidebarLink href="/overview" label="Geral" active={pathname.startsWith("/overview")}>
          <OverviewIcon />
        </SidebarLink>
        <SidebarLink href="/" label="Mensal" active={pathname === "/"}>
          <CalendarIcon />
        </SidebarLink>
        <SidebarLink href="/queue" label="Fila de pagamentos" active={pathname.startsWith("/queue")}>
          <QueueIcon />
        </SidebarLink>
        <SidebarLink
          href="/settings"
          label="Config"
          active={pathname.startsWith("/settings") || pathname.startsWith("/recurring") || pathname.startsWith("/tags")}
        >
          <SettingsIcon />
        </SidebarLink>
      </nav>

      <div className="mt-auto flex items-center justify-between gap-2 border-t border-black/10 p-4 dark:border-white/15">
        <span className="truncate text-sm font-medium">{username}</span>
        <form action={logoutAction}>
          <button
            type="submit"
            className="h-9 shrink-0 rounded-xl border border-black/10 px-3 text-xs font-medium active:opacity-70 dark:border-white/15"
          >
            Sair
          </button>
        </form>
      </div>
    </aside>
  );
}

function SidebarLink({
  href,
  label,
  active,
  children,
}: {
  href: string;
  label: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm ${
        active
          ? "bg-emerald-600/10 font-medium text-emerald-600 dark:text-emerald-400"
          : "text-foreground/70 hover:bg-black/5 dark:hover:bg-white/5"
      }`}
      aria-current={active ? "page" : undefined}
    >
      {children}
      {label}
    </Link>
  );
}
