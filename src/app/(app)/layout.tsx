import { AppHeader } from "@/components/shell/AppHeader";
import { AppFooter } from "@/components/shell/AppFooter";
import { BottomNav } from "@/components/shell/BottomNav";
import { SyncProvider } from "@/components/sync/SyncProvider";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <SyncProvider />
      <AppHeader />
      <main className="flex-1 pb-2">{children}</main>
      <AppFooter />
      <BottomNav />
    </div>
  );
}
