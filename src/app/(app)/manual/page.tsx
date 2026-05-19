import Link from "next/link";
import {
  Download,
  FileText,
  Building2,
  Stethoscope,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Phone,
  Mail,
  Monitor,
  ListChecks,
  FlaskConical,
  Brain,
  ArrowRight,
} from "lucide-react";
import { CredentialCard } from "@/components/manual/CredentialCard";

export const metadata = { title: "Manual de coleta — LANC TCE" };
export const dynamic = "force-static";

const SETORES_HGE = [
  { nome: "OBS 1", local: "Subsolo 1 · HGE 1", pcs: 1, pcsNota: "" },
  { nome: "UTI 1", local: "Subsolo 1 · HGE 1", pcs: 2, pcsNota: "" },
  { nome: "UTI 2", local: "Térreo · HGE 2", pcs: 4, pcsNota: "" },
  { nome: "UTI 3", local: "Térreo · HGE 2", pcs: 4, pcsNota: "" },
  { nome: "UI 1", local: "3º andar · HGE 1", pcs: 3, pcsNota: "geralmente cheio" },
  { nome: "UI 2", local: "5º andar · HGE 2", pcs: 3, pcsNota: "" },
  { nome: "UI 3", local: "5º andar · HGE 2", pcs: 3, pcsNota: "1 quebrado" },
];

const CRITERIOS_EXCLUSAO = [
  "Pacientes com menos de 18 anos",
  "Pacientes provenientes de regulação com mais de 48h do acidente",
  "Pacientes regulados de outro serviço",
];

export default function ManualPage() {
  return (
    <div className="container max-w-3xl py-5 space-y-8">
      {/* HERO */}
      <section className="space-y-3">
        <p className="text-[10px] uppercase tracking-ultra text-cobalt-soft font-medium">
          Edição HGE · v1
        </p>
        <h1 className="text-[32px] leading-[1.05] font-semibold text-ink tracking-tight">
          Manual de coleta
          <span className="block text-graphite font-normal italic">
            Projeto TCE — Hospital Geral do Estado
          </span>
        </h1>
        <p className="text-[14px] text-graphite leading-relaxed max-w-prose">
          Aspectos clínico-epidemiológicos em pacientes vítimas de Traumatismo
          Cranioencefálico. Liga Acadêmica de Neurocirurgia da Bahia (LANC),
          sob orientação do Dr. Davi Jorge Fontoura Solla.
        </p>

        {/* Contatos compactos */}
        <div className="mt-4 grid sm:grid-cols-2 gap-2">
          <ContactPill icon={<Phone className="h-3 w-3" />} label="Orientador" value="Dr. Davi Solla · (11) 94234-1989" href="tel:+5511942341989" />
          <ContactPill icon={<Mail className="h-3 w-3" />} label="E-mail" value="davisolla@hotmail.com" href="mailto:davisolla@hotmail.com" />
        </div>
      </section>

      {/* TCLE DOWNLOADS */}
      <Section
        eyebrow="Documentos primeiro"
        title="Termos de Consentimento (TCLE)"
        description="Imprima e leve impresso para o plantão. Use o TCLE Responsável quando o paciente estiver intubado, em coma, ou sem condição de compreender."
        accent="cobalt"
      >
        <div className="grid sm:grid-cols-2 gap-3">
          <TcleCard
            href="/tcle/TCLE-Paciente.pdf"
            filename="TCLE-Paciente.pdf"
            title="TCLE — Paciente"
            description="Para pacientes lúcidos, orientados e capazes de assinar."
            badge="Apêndice I"
          />
          <TcleCard
            href="/tcle/TCLE-Responsavel.pdf"
            filename="TCLE-Responsavel.pdf"
            title="TCLE — Responsável"
            description="Para pacientes graves, intubados ou com impossibilidade de compreender."
            badge="Apêndice II"
          />
        </div>
      </Section>

      {/* CRITÉRIOS */}
      <Section
        eyebrow="Quem entra · quem não entra"
        title="Critérios de elegibilidade"
        accent="moss"
      >
        <div className="grid md:grid-cols-2 gap-3">
          <CriteriaCard kind="incluir" title="Incluir">
            <ul className="space-y-1.5 text-[13px] text-graphite leading-relaxed">
              <li>Todo paciente vítima de TCE que (ou cujo responsável) assine o TCLE.</li>
              <li>Pacientes graves ou intubados entram com TCLE do responsável.</li>
            </ul>
          </CriteriaCard>
          <CriteriaCard kind="excluir" title="Excluir">
            <ul className="space-y-1.5 text-[13px] text-graphite leading-relaxed">
              {CRITERIOS_EXCLUSAO.map((c) => (
                <li key={c}>{c}</li>
              ))}
              <li className="text-vermillion font-medium">
                História/imagem que afaste o diagnóstico de TCE.
              </li>
            </ul>
          </CriteriaCard>
        </div>
      </Section>

      {/* ESTRUTURA DO HGE */}
      <Section
        eyebrow="Geografia do hospital"
        title="Onde estão os pacientes"
        description="O HGE se divide em dois prédios: HGE 1 (4 andares + 2 subsolos) e HGE 2 (5 andares + 2 subsolos). O subsolo 1 do HGE 1 é o mesmo nível do térreo do HGE 2."
        accent="plum"
      >
        <div className="overflow-hidden rounded-xl border border-hairline bg-paper-soft">
          <div className="grid grid-cols-[1fr,auto,auto] text-[10px] uppercase tracking-editorial text-ash bg-paper px-4 py-2 border-b border-hairline">
            <span>Setor</span>
            <span className="px-3">Localização</span>
            <span className="text-right pr-1">PCs</span>
          </div>
          {SETORES_HGE.map((s) => (
            <div
              key={s.nome}
              className="grid grid-cols-[1fr,auto,auto] items-center px-4 py-3 border-b border-hairline last:border-b-0"
            >
              <div className="flex items-center gap-2">
                <Building2 className="h-3.5 w-3.5 text-cobalt-soft" strokeWidth={1.8} />
                <span className="text-[13px] font-medium text-ink">{s.nome}</span>
              </div>
              <span className="text-[12px] text-graphite px-3">{s.local}</span>
              <div className="text-right pr-1">
                <span className="font-mono text-[13px] text-ink tab-num">{s.pcs}</span>
                {s.pcsNota && (
                  <span className="block text-[10px] text-ash italic">{s.pcsNota}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* FLUXO DE COLETA */}
      <Section
        eyebrow="Passo a passo"
        title="Fluxo de coleta — Admissão"
        description="Comece pelo mapeamento no Doutore, cheque elegibilidade e só depois desça pra pegar o prontuário físico. Os dados vivem em 3 lugares: físico, digital e Doutore."
        accent="cobalt"
      >
        <Step number={1} icon={<Stethoscope className="h-4 w-4" />}>
          <h4 className="text-[14px] font-semibold text-ink">Acessar o Doutore</h4>
          <p className="text-[13px] text-graphite leading-relaxed">
            Login compartilhado pra mapear pacientes em todas as unidades do HGE.
          </p>
          <CredentialCard
            title="Doutore"
            url="https://www.doutore.com/index.html"
            urlLabel="doutore.com"
            login="leonardo@fnnic.com.br"
            password="youmans"
            note="No canto superior direito, troque pra Hospital Geral do Estado · HGE."
            accent="cobalt"
          />
        </Step>

        <Step number={2} icon={<ListChecks className="h-4 w-4" />}>
          <h4 className="text-[14px] font-semibold text-ink">Triar pacientes</h4>
          <p className="text-[13px] text-graphite leading-relaxed">
            Na barra esquerda, navegue por OBS 1, UTI 1/2/3, UI 1/2/3. Em
            cada paciente clique <em>“ver prontuário”</em> e descarte os que
            batem em algum critério de exclusão antes de adicionar ao mapa.
          </p>
        </Step>

        <Step number={3} icon={<Monitor className="h-4 w-4" />}>
          <h4 className="text-[14px] font-semibold text-ink">
            Prontuário digital do HGE
          </h4>
          <p className="text-[13px] text-graphite leading-relaxed">
            No computador da unidade, abra o ícone com o logo <strong>HGE</strong>.
            Login compartilhado de UTI.
          </p>
          <CredentialCard
            title="Prontuário digital HGE"
            login="uti"
            password="1234"
            note="Ícone amarelo com HGE escrito no desktop dos computadores da unidade."
            accent="saffron"
          />
        </Step>

        <Step number={4} icon={<FileText className="h-4 w-4" />}>
          <h4 className="text-[14px] font-semibold text-ink">Prontuário físico</h4>
          <p className="text-[13px] text-graphite leading-relaxed">
            Busque o prontuário em papel na unidade. A coleta precisa cruzar{" "}
            <strong>físico + digital + Doutore</strong> — os 3 lugares.
          </p>
        </Step>

        <Step number={5} icon={<ArrowRight className="h-4 w-4" />}>
          <h4 className="text-[14px] font-semibold text-ink">Lançar no REDCap</h4>
          <p className="text-[13px] text-graphite leading-relaxed">
            Use a aba REDCap dentro do paciente neste app — os dados vão
            direto pro projeto LANC TCE 3.0 do REDCap após exportação.
          </p>
          <Link
            href="/pacientes"
            className="inline-flex items-center gap-1.5 text-[12px] text-cobalt-soft hover:text-cobalt font-medium"
          >
            Ir pra pacientes <ArrowRight className="h-3 w-3" />
          </Link>
        </Step>
      </Section>

      {/* LABORATÓRIO */}
      <Section
        eyebrow="Exames"
        title="Dados laboratoriais"
        description="Acessível pelos computadores do HGE, fora do prontuário digital."
        accent="moss"
      >
        <Step number={1} icon={<FlaskConical className="h-4 w-4" />}>
          <h4 className="text-[14px] font-semibold text-ink">
            Abrir o app de laboratório
          </h4>
          <p className="text-[13px] text-graphite leading-relaxed">
            Procure no desktop o ícone <strong>“M” vermelho</strong>{" "}
            (atalho “NOVO_CO… - Atalho”).
          </p>
          <CredentialCard title="App laboratorial (ícone M)" login="UI1" password="UI1" accent="moss" />
        </Step>

        <Step number={2}>
          <h4 className="text-[14px] font-semibold text-ink">
            Buscar pelo nome do paciente
          </h4>
          <p className="text-[13px] text-graphite leading-relaxed">
            <em>Central de pacientes</em> → <em>Nome</em>. Digite{" "}
            <strong>exatamente</strong> como está no prontuário. Confira o
            período pesquisado pra não pegar exame do internamento errado.
          </p>
        </Step>

        <Step number={3}>
          <h4 className="text-[14px] font-semibold text-ink">
            Datar pelo cadastro, não pela entrega
          </h4>
          <p className="text-[13px] text-graphite leading-relaxed">
            Use sempre a <strong>data do cadastro</strong> do exame — nunca a
            data da entrega.
          </p>
        </Step>

        <Warning>
          <strong>Leucócitos totais</strong> são reportados em milhar. Antes de
          lançar no REDCap, <strong>divida por 1.000</strong>.
        </Warning>
      </Section>

      {/* NEUROIMAGEM */}
      <Section
        eyebrow="Imagem"
        title="Dados de neuroimagem (RBD)"
        description="Duas formas de chegar ao laudo. A segunda evita o problema dos homônimos."
        accent="plum"
      >
        <CredentialCard
          title="RBD Imagem"
          url="https://pacientes.rbdimagem.com.br"
          urlLabel="pacientes.rbdimagem.com.br"
          login="hge.uti"
          password="rbd@hge"
          note="Senha tudo em minúsculo."
          accent="plum"
        />

        <Step number={1} icon={<Brain className="h-4 w-4" />}>
          <h4 className="text-[14px] font-semibold text-ink">
            Forma 1 — Por sobrenome formatado
          </h4>
          <p className="text-[13px] text-graphite leading-relaxed">
            No campo <em>SOBRENOME</em> do RBD, escreva o nome do paciente como
            iniciais + sobrenome, incluindo o <em>“de”</em>.
          </p>
          <div className="rounded-lg border border-hairline bg-paper-soft px-3 py-2.5 font-mono text-[12px] text-ink">
            Maria José de Lourdes Santana
            <span className="text-ash mx-2">→</span>
            <span className="text-cobalt-soft">Maria J. D. L. Santana</span>
          </div>
        </Step>

        <Step number={2}>
          <h4 className="text-[14px] font-semibold text-ink">
            Forma 2 — Por ID do RBD (recomendada)
          </h4>
          <p className="text-[13px] text-graphite leading-relaxed">
            No Doutore, abra o paciente → <em>Cadastro</em> →{" "}
            <em>Prontuário RBD</em>. Copie o número e cole no campo{" "}
            <em>ID do paciente</em> do RBD. Funciona perfeito com homônimos.
          </p>
        </Step>

        <Step number={3}>
          <h4 className="text-[14px] font-semibold text-ink">
            Pegar o laudo da admissão
          </h4>
          <p className="text-[13px] text-graphite leading-relaxed">
            Vai aparecer uma lista de exames em datas diferentes. Selecione o
            da <strong>data da admissão</strong> e use o painel{" "}
            <em>“laudos do paciente”</em> (lado direito da tela) pra preencher
            a neuroimagem da admissão no REDCap.
          </p>
        </Step>
      </Section>

      {/* ATENÇÕES */}
      <Section
        eyebrow="Cuidado"
        title="Pontos que travam a coleta"
        accent="vermillion"
      >
        <div className="grid gap-2">
          <Warning>
            <strong>Pacientes regulados de outro serviço:</strong> excluir.
            Mesmo com TCE confirmado, não entram no projeto.
          </Warning>
          <Warning>
            <strong>Regulação &gt; 48h do acidente:</strong> excluir.
          </Warning>
          <Warning>
            <strong>Menores de 18:</strong> excluir.
          </Warning>
          <Warning>
            <strong>Sigilo:</strong> não compartilhe nome, CPF ou foto de
            prontuário fora deste sistema. O app está atrás de login e tudo
            que sobe pro Supabase é protegido por RLS.
          </Warning>
        </div>
      </Section>

      {/* CEP */}
      <section className="rounded-xl border border-hairline bg-paper-soft p-5 space-y-2">
        <p className="text-[10px] uppercase tracking-editorial text-ash">
          Comitê de Ética em Pesquisa
        </p>
        <p className="text-[13px] text-graphite leading-relaxed">
          <strong className="text-ink">CEP do Instituto Gonçalo Muniz — Fiocruz Bahia</strong>
          <br />
          Rua Waldemar Falcão 121, Candeal — Salvador/BA · CEP 40296-710
          <br />
          <a href="tel:+557131762234" className="text-cobalt-soft hover:underline">
            (71) 3176-2234
          </a>{" "}
          ·{" "}
          <a href="mailto:cep.igm@fiocruz.br" className="text-cobalt-soft hover:underline">
            cep.igm@fiocruz.br
          </a>
        </p>
      </section>

      <div className="h-24" aria-hidden />
    </div>
  );
}

/* ─────────────── helpers ─────────────── */

function Section({
  eyebrow,
  title,
  description,
  children,
  accent,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  children: React.ReactNode;
  accent: "cobalt" | "moss" | "plum" | "vermillion";
}) {
  const dot = {
    cobalt: "bg-cobalt",
    moss: "bg-moss",
    plum: "bg-plum",
    vermillion: "bg-vermillion",
  }[accent];

  return (
    <section className="space-y-4">
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <span className={`size-1.5 rounded-full ${dot}`} />
          <p className="text-[10px] uppercase tracking-ultra text-ash">{eyebrow}</p>
        </div>
        <h2 className="text-[22px] leading-tight font-semibold text-ink">{title}</h2>
        {description && (
          <p className="text-[13px] text-graphite leading-relaxed max-w-prose">
            {description}
          </p>
        )}
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function Step({
  number,
  icon,
  children,
}: {
  number: number;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="relative pl-10 space-y-2.5">
      <div className="absolute left-0 top-0 size-7 rounded-full bg-paper border border-hairline flex items-center justify-center">
        {icon ? (
          <span className="text-cobalt-soft">{icon}</span>
        ) : (
          <span className="font-mono text-[12px] text-ink tab-num">{number}</span>
        )}
      </div>
      {children}
    </div>
  );
}

function Warning({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-vermillion/30 bg-vermillion/[0.05] px-3.5 py-3 flex items-start gap-2.5">
      <AlertTriangle className="h-4 w-4 text-vermillion shrink-0 mt-0.5" strokeWidth={1.8} />
      <p className="text-[13px] text-graphite leading-relaxed">{children}</p>
    </div>
  );
}

function ContactPill({
  icon,
  label,
  value,
  href,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  href: string;
}) {
  return (
    <a
      href={href}
      className="flex items-center gap-2.5 rounded-lg border border-hairline bg-paper-soft px-3 py-2 hover:border-cobalt/50 transition-colors min-w-0"
    >
      <span className="size-7 rounded-md bg-paper border border-hairline flex items-center justify-center text-cobalt-soft shrink-0">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[9px] uppercase tracking-editorial text-ash leading-none">{label}</p>
        <p className="text-[12px] text-ink truncate mt-0.5">{value}</p>
      </div>
    </a>
  );
}

function TcleCard({
  href,
  filename,
  title,
  description,
  badge,
}: {
  href: string;
  filename: string;
  title: string;
  description: string;
  badge: string;
}) {
  return (
    <a
      href={href}
      download={filename}
      className="group relative overflow-hidden rounded-xl border border-cobalt/25 bg-gradient-to-br from-cobalt/[0.06] to-cobalt/[0.02] p-4 hover:border-cobalt/50 hover:shadow-lg hover:shadow-cobalt/5 transition-all"
    >
      <div className="flex items-start gap-3">
        <div className="size-11 rounded-lg bg-cobalt/10 border border-cobalt/20 flex items-center justify-center shrink-0">
          <FileText className="h-5 w-5 text-cobalt-soft" strokeWidth={1.6} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-[14px] font-semibold text-ink leading-tight">{title}</h3>
            <span className="text-[9px] uppercase tracking-editorial text-ash bg-paper-soft border border-hairline px-1.5 py-0.5 rounded-full shrink-0">
              {badge}
            </span>
          </div>
          <p className="text-[12px] text-graphite leading-snug mt-1">{description}</p>
          <div className="mt-3 inline-flex items-center gap-1.5 text-[11px] uppercase tracking-editorial text-cobalt-soft font-semibold">
            <Download className="h-3 w-3" strokeWidth={2} />
            Baixar PDF
          </div>
        </div>
      </div>
    </a>
  );
}

function CriteriaCard({
  kind,
  title,
  children,
}: {
  kind: "incluir" | "excluir";
  title: string;
  children: React.ReactNode;
}) {
  const incluir = kind === "incluir";
  return (
    <div
      className={
        "rounded-xl border p-4 space-y-2.5 " +
        (incluir
          ? "border-moss/25 bg-moss/[0.04]"
          : "border-vermillion/25 bg-vermillion/[0.04]")
      }
    >
      <div className="flex items-center gap-2">
        {incluir ? (
          <CheckCircle2 className="h-4 w-4 text-moss" strokeWidth={1.8} />
        ) : (
          <XCircle className="h-4 w-4 text-vermillion" strokeWidth={1.8} />
        )}
        <h3 className="text-[13px] font-semibold text-ink">{title}</h3>
      </div>
      {children}
    </div>
  );
}
