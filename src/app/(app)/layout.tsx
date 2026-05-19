import { AppHeader } from "@/components/shell/AppHeader";
import { BottomNav } from "@/components/shell/BottomNav";
import { getCurrentPesquisador } from "@/lib/data/pesquisadores";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const me = await getCurrentPesquisador();
  return (
    <div className="flex min-h-svh flex-col">
      <AppHeader />
      <main className="flex-1 pb-2">{children}</main>
      <BottomNav isAdmin={Boolean(me?.is_admin)} />
    </div>
  );
}
