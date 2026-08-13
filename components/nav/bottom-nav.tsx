"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { HomeIcon, ListIcon, PlusIcon, TagIcon } from "@/components/nav/nav-icons";

/**
 * Fixed bottom nav: Início / Lançamentos / + / Tags — the one-handed mobile
 * layout the spec calls for. "+" is a standalone shortcut to /entries/new,
 * not a route this component highlights as "active".
 */
export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="pb-safe fixed inset-x-0 bottom-0 z-20 border-t border-black/10 bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/80 dark:border-white/10 lg:hidden"
      aria-label="Navegação principal"
    >
      <div className="mx-auto flex max-w-md items-center justify-around">
        <NavLink href="/" label="Início" active={pathname === "/"}>
          <HomeIcon />
        </NavLink>
        <NavLink href="/entries" label="Lançamentos" active={pathname.startsWith("/entries") && pathname !== "/entries/new"}>
          <ListIcon />
        </NavLink>
        <Link
          href="/entries/new"
          className="-mt-5 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-600 text-white shadow-lg shadow-emerald-600/30 active:bg-emerald-700"
          aria-label="Novo lançamento"
        >
          <PlusIcon />
        </Link>
        <NavLink href="/tags" label="Tags" active={pathname.startsWith("/tags")}>
          <TagIcon />
        </NavLink>
        {/* spacer to balance the raised + button visually */}
        <div className="w-10" aria-hidden />
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
      className={`flex flex-col items-center gap-0.5 px-3 py-2 text-xs ${
        active ? "text-emerald-600 dark:text-emerald-400" : "text-foreground/60"
      }`}
      aria-current={active ? "page" : undefined}
    >
      {children}
      <span>{label}</span>
    </Link>
  );
}

