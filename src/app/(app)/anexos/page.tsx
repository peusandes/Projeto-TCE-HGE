import { createClient } from "@/lib/supabase/server";
import { AnexosOverview } from "@/components/anexos/AnexosOverview";

export const dynamic = "force-dynamic";

export default async function AnexosPage() {
  const supabase = createClient();
  const { data: anexos } = await supabase
    .from("anexos")
    .select("*, pacientes(id, nome), plantoes(id, data)")
    .order("enviado_em", { ascending: false })
    .limit(200);

  return (
    <div className="container max-w-4xl py-4 space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Anexos</h1>
        <p className="text-sm text-muted-foreground">
          Fotos e PDFs de prontuários. Marque como processado após transcrever para o REDCap.
        </p>
      </div>
      <AnexosOverview anexos={(anexos ?? []) as never} />
    </div>
  );
}
