import { BottomNav } from "@/components/nav/bottom-nav";
import { Sidebar } from "@/components/nav/sidebar";
import { requireSession } from "@/lib/auth/session";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Guards every route under this group. Real per-request check — the
  // proxy only does an optimistic cookie-presence check.
  const session = await requireSession();

  return (
    <div className="min-h-dvh lg:flex">
      <Sidebar username={session.user.username} />
      <div className="flex-1 lg:pl-64">
        {/* bottom padding clears the fixed BottomNav + its safe-area inset
        on mobile; desktop has no BottomNav, so it gets a plain bottom gap
        and the content column is capped to a comfortable reading width. */}
        <div className="mx-auto w-full pb-20 lg:pb-12">{children}</div>
      </div>
      <BottomNav />
    </div>
  );
}
