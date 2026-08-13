"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarIcon, OverviewIcon, PlusIcon, QueueIcon, SettingsIcon } from "@/components/nav/nav-icons";

/**
 * Fixed bottom nav: Geral / Mensal / + / Fila / Config — the one-handed
 * mobile layout the spec calls for. "+" is a standalone shortcut to
 * /entries/new, not a route this component highlights as "active".
 *
 * Laid out as a 5-column grid (not `justify-around` + a balancing spacer)
 * so the "+" button sits in a real, symmetric center column — it stays
 * centered no matter what the other four items render, instead of relying
 * on a hand-tuned spacer to visually offset it.
 */
export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="pb-safe fixed inset-x-0 bottom-0 z-20 border-t border-black/10 bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/80 dark:border-white/10 lg:hidden"
      aria-label="Navegação principal"
    >
      <div className="mx-auto grid max-w-md grid-cols-5 items-center">
        <NavLink href="/overview" label="Geral" active={pathname.startsWith("/overview")}>
          <OverviewIcon />
        </NavLink>
        <NavLink href="/" label="Mensal" active={pathname === "/"}>
          <CalendarIcon />
        </NavLink>
        <div className="flex justify-center">
          <Link
            href="/entries/new"
            className="-mt-5 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-600 text-white shadow-lg shadow-emerald-600/30 active:bg-emerald-700"
            aria-label="Novo lançamento"
          >
            <PlusIcon />
          </Link>
        </div>
        <NavLink href="/queue" label="Fila" active={pathname.startsWith("/queue")}>
          <QueueIcon />
        </NavLink>
        <NavLink
          href="/settings"
          label="Config"
          active={pathname.startsWith("/settings") || pathname.startsWith("/recurring") || pathname.startsWith("/tags")}
        >
          <SettingsIcon />
        </NavLink>
      </div>
    </nav>
  );
}

function NavLink({
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
      className={`flex flex-col items-center gap-0.5 py-2 text-xs ${
        active ? "text-emerald-600 dark:text-emerald-400" : "text-foreground/60"
      }`}
      aria-current={active ? "page" : undefined}
    >
      {children}
      <span>{label}</span>
    </Link>
  );
}
