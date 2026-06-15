import { listDocumentos } from "@/lib/data/documentos";
import { listMembros } from "@/lib/data/membros";
import { DocumentUploader } from "@/components/admin/DocumentUploader";
import { DocumentoRowActions } from "@/components/admin/DocumentoRowActions";
import { DOCUMENTO_TIPO_LABEL } from "@/lib/lanc/enums";

export const dynamic = "force-dynamic";
export const metadata = { title: "Documentos — Admin" };

const STATUS_CLASS: Record<string, string> = {
  PENDENTE: "bg-amber-500/10 text-amber-700",
  APROVADO: "bg-moss/10 text-moss",
  REJEITADO: "bg-vermillion/10 text-vermillion",
};

export default async function AdminDocumentosPage() {
  const [docs, membros] = await Promise.all([listDocumentos(), listMembros()]);
  const opcoesMembros = membros.map((m) => ({ id: m.id, nome: m.nome ?? m.email }));

  return (
    <div className="container max-w-2xl space-y-6 py-5">
      <section>
        <p className="text-[10px] uppercase tracking-ultra text-ash">Administração</p>
        <h1 className="mt-2 font-display text-[36px] font-light leading-none text-ink">
          Documentos<span className="font-display-italic text-ash">.</span>
        </h1>
        <div className="rule-dotted mt-4" />
      </section>

      <DocumentUploader membros={opcoesMembros} />

      <section className="space-y-2">
        <h2 className="text-sm font-medium text-graphite">Enviados ({docs.length})</h2>
        {docs.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-hairline bg-paper p-6 text-center text-sm text-ash">
            Nenhum documento ainda.
          </p>
        ) : (
          <ul className="space-y-2">
            {docs.map((d) => (
              <li
                key={d.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-hairline bg-paper px-4 py-3"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[14px] font-medium text-ink">{d.nome_membro}</span>
                    <span className={`rounded px-1.5 py-[2px] text-[9px] font-medium uppercase ${STATUS_CLASS[d.status] ?? ""}`}>
                      {d.status}
                    </span>
                  </div>
                  <p className="truncate text-[11.5px] text-graphite">
                    {DOCUMENTO_TIPO_LABEL[d.tipo]} · {d.nome_arquivo}
                  </p>
                </div>
                <DocumentoRowActions id={d.id} status={d.status} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="h-24" aria-hidden />
    </div>
  );
}
