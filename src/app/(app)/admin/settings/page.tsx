import { listSettings } from "@/lib/data/settings";
import { getPesquisadorContext } from "@/lib/data/pesquisador-context";
import { redirect } from "next/navigation";
import { SettingsEditor } from "@/components/admin/SettingsEditor";

export const dynamic = "force-dynamic";
export const metadata = { title: "Configurações — Admin" };

export default async function AdminSettingsPage() {
  const ctx = await getPesquisadorContext();
  if (!ctx?.isAdmin) redirect("/inicio");

  const settings = await listSettings();

  return (
    <div className="container max-w-2xl space-y-6 py-5">
      <section>
        <p className="text-[10px] uppercase tracking-ultra text-ash">Administração</p>
        <h1 className="mt-2 font-display text-[36px] font-light leading-none text-ink">
          Configurações<span className="font-display-italic text-ash">.</span>
        </h1>
        <p className="mt-3 text-sm text-graphite">
          Parâmetros chave-valor do sistema. Use com cuidado — alguns valores controlam comportamento da escala.
        </p>
        <div className="rule-dotted mt-4" />
      </section>

      {settings.length === 0 ? (
        <SettingsEditor settings={[]} />
      ) : (
        <SettingsEditor settings={settings.map((s) => ({ key: s.key, value: s.value }))} />
      )}

      <div className="h-24" aria-hidden />
    </div>
  );
}
