import { AppHeader } from "@/components/shell/AppHeader";
import { BottomNav } from "@/components/shell/BottomNav";
import { SyncProvider } from "@/components/sync/SyncProvider";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-svh flex-col">
      <SyncProvider />
      <AppHeader />
      <main className="flex-1 pb-2">{children}</main>
      <BottomNav />
    </div>
  );
}
