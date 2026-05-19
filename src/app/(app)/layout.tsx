import { AppHeader } from "@/components/shell/AppHeader";
import { AppFooter } from "@/components/shell/AppFooter";
import { BottomNav } from "@/components/shell/BottomNav";
import { OfflineBanner } from "@/components/shell/OfflineBanner";
import { IosInstallHint } from "@/components/shell/IosInstallHint";
import { SyncProvider } from "@/components/sync/SyncProvider";
import { OnboardingMount } from "@/components/onboarding/OnboardingMount";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <SyncProvider />
      <AppHeader />
      <OfflineBanner />
      <main className="flex-1 pb-2">{children}</main>
      <AppFooter />
      <BottomNav />
      <IosInstallHint />
      <OnboardingMount />
    </div>
  );
}
