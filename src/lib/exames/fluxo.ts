import type { FormData } from "@/lib/redcap-schema/types";
import { matchPacienteByFilename } from "@/lib/utils/fuzzy-match-paciente";
import {
  sendMessage,
  answerCallbackQuery,
  clearButtons,
  downloadFile,
  type InlineButton,
} from "@/lib/telegram/api";
import { extrairTextoPdf } from "./parse-pdf";
import { parseLaudo } from "./parse-laudo";
import { parseFilename } from "./parse-filename";
import { planejarSeguimentos } from "./seguimento-plan";
import { LOCAL_PCT_LABEL } from "./local";
import { usuarioNaEnvAllowlist } from "@/lib/telegram/auth";
import {
  listarPacientes,
  getDataNascimento,
  getAdmissaoIso,
  getSeguimentos,
  commitPlano,
  criarPending,
  getPendingById,
  getUltimoPending,
  apagarPending,
  usuarioNoBanco,
  autorizarUsuario,
  type PacienteRef,
} from "./repo";
import type { LaudoParse } from "./types";

// ─── Tipos mínimos do update do Telegram ─────────────────────────────────────

type TgUser = { id: number; first_name?: string; last_name?: string; username?: string };
type TgDoc = { file_id: string; file_name?: string; mime_type?: string };
type TgMessage = { chat: { id: number }; from?: TgUser; document?: TgDoc; text?: string };
type TgCallback = { id: string; from: TgUser; message?: { chat: { id: number }; message_id: number }; data?: string };
export type TgUpdate = { message?: TgMessage; callback_query?: TgCallback };

// ─── Helpers ─────────────────────────────────────────────────────────────────

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function nomeRemetente(u: TgUser | undefined): string {
  if (!u) return "Bot Telegram";
  const nome = [u.first_name, u.last_name].filter(Boolean).join(" ").trim();
  return nome || (u.username ? `@${u.username}` : `id ${u.id}`);
}

function fmtBr(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

/** Lê DD/MM ou DD/MM/AAAA (também _ - .) de um texto livre. */
function parseDataLivre(text: string, refIso: string): string | null {
  const m = text.match(/(\d{1,2})[\/._-](\d{1,2})(?:[\/._-](\d{2,4}))?/);
  if (!m) return null;
  const dia = Number(m[1]);
  const mes = Number(m[2]);
  if (dia < 1 || dia > 31 || mes < 1 || mes > 12) return null;
  const refY = Number(refIso.slice(0, 4));
  const ano = m[3] ? (m[3].length <= 2 ? 2000 + Number(m[3]) : Number(m[3])) : refY;
  const mk = (a: number) => `${a}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
  let iso = mk(ano);
  if (!m[3] && iso > refIso) iso = mk(ano - 1); // admissão não pode ser depois do exame
  return iso;
}

// Rótulos curtos pro resumo (ordem de exibição).
const LABELS: [string, string][] = [
  ["hemoglobina_seg", "Hb"],
  ["hemacias_seg", "Hem"],
  ["hematocrito_seg", "Ht"],
  ["leucograma_total_seg", "Leuco"],
  ["neutrofilos_seg", "Segm"],
  ["bastoes_seg", "Bast"],
  ["linfocitos_seg", "Linf"],
  ["eosinofilos_seg", "Eos"],
  ["plaquetas_seg", "Plaq"],
  ["ttpa_seg", "TTPa"],
  ["rni_seg", "RNI"],
  ["bicarbonato_seg", "HCO3"],
  ["lactato_seg", "Lac"],
  ["sodio_seg", "Na"],
  ["potassio_seg", "K"],
  ["calcio_seg", "Ca"],
  ["creatinina_seg", "Creat"],
  ["ureia_seg", "Ureia"],
  ["cpk_seg", "CPK"],
];

function resumoLabs(dados: FormData): string {
  const partes = LABELS.filter(([k]) => dados[k] != null && dados[k] !== "").map(
    ([k, lbl]) => `${lbl} ${dados[k]}`,
  );
  return partes.length ? partes.join(" · ") : "(nenhum valor laboratorial lido)";
}

// ─── Núcleo: planeja + grava + responde ──────────────────────────────────────

async function gravarExame(
  chatId: number,
  paciente: PacienteRef,
  admissaoIso: string,
  parse: LaudoParse,
  examIso: string,
  ligante: string,
): Promise<void> {
  const existentes = await getSeguimentos(paciente.paciente_id);
  const plano = planejarSeguimentos({ admissaoIso, exameIso: examIso, existentes });
  if ("erro" in plano) {
    await sendMessage(chatId, `⚠️ ${esc(plano.erro)} (admissão ${fmtBr(admissaoIso)}, exame ${fmtBr(examIso)})`);
    return;
  }

  const examDados: FormData = { ...parse.dados, data_seg: examIso, ligante_seg: ligante };
  if (parse.localPct != null) examDados.local_pct = parse.localPct;

  const { criadosBranco, exameSeq } = await commitPlano({
    pacienteId: paciente.paciente_id,
    plantaoId: paciente.plantao_id,
    plano,
    examDados,
  });

  const linhas: string[] = [];
  linhas.push("✅ <b>GRAVADO</b>");
  linhas.push("");
  linhas.push(`👤 <b>${esc(paciente.nome)}</b>`);
  linhas.push(`📅 Seguimento dia ${plano.diaExame} — seq ${exameSeq} (${fmtBr(examIso)})`);
  if (parse.localPct != null) linhas.push(`🏥 ${LOCAL_PCT_LABEL[parse.localPct]}`);
  linhas.push("");
  linhas.push(resumoLabs(examDados));
  if (criadosBranco.length) {
    linhas.push("");
    linhas.push(`📋 Criados em branco: ${criadosBranco.length} dia(s) (seq ${criadosBranco[0]}–${criadosBranco[criadosBranco.length - 1]})`);
  }
  for (const a of [...parse.avisos, ...plano.avisos]) linhas.push(`⚠️ ${esc(a)}`);
  linhas.push("");
  linhas.push("➡️ Para corrigir, abra o paciente no site (seguimento marcado como INCOMPLETO).");

  await sendMessage(chatId, linhas.join("\n"));
}

/** Após ter o paciente resolvido: confere nascimento → admissão → grava. */
async function comPacienteResolvido(
  chatId: number,
  userId: number,
  paciente: PacienteRef,
  parse: LaudoParse,
  examIso: string,
  ligante: string,
  jaConferiuNascimento = false,
): Promise<void> {
  if (!jaConferiuNascimento) {
    const nasc = await getDataNascimento(paciente.paciente_id);
    if (nasc && parse.nascimentoIso && nasc !== parse.nascimentoIso) {
      const id = await criarPending({
        chatId,
        userId,
        kind: "await_birthdate",
        payload: { paciente, parse, examIso, ligante },
      });
      await sendMessage(
        chatId,
        [
          "⚠️ <b>Data de nascimento não bate.</b>",
          `Paciente: <b>${esc(paciente.nome)}</b>`,
          `No site: ${fmtBr(nasc)} · no PDF: ${fmtBr(parse.nascimentoIso)}`,
          "",
          "É a mesma pessoa?",
        ].join("\n"),
        {
          buttons: [[
            { text: "✅ Sim, é ele(a)", callback_data: `b:${id}:y` },
            { text: "❌ Não", callback_data: `b:${id}:n` },
          ]],
        },
      );
      return;
    }
  }

  const adm = await getAdmissaoIso(paciente.paciente_id);
  if (!adm) {
    await criarPending({
      chatId,
      userId,
      kind: "await_admission",
      payload: { paciente, parse, examIso, ligante },
    });
    await sendMessage(
      chatId,
      [
        `📅 Não encontrei a data de admissão de <b>${esc(paciente.nome)}</b> no site.`,
        "Qual foi a data de admissão? Responda neste chat (ex.: <code>09/05</code> ou <code>09/05/2026</code>).",
      ].join("\n"),
    );
    return;
  }

  await gravarExame(chatId, paciente, adm, parse, examIso, ligante);
}

// ─── Entradas ────────────────────────────────────────────────────────────────

async function onDocument(msg: TgMessage): Promise<void> {
  const chatId = msg.chat.id;
  const doc = msg.document!;
  const ligante = nomeRemetente(msg.from);

  const ehPdf = doc.mime_type === "application/pdf" || /\.pdf$/i.test(doc.file_name ?? "");
  if (!ehPdf) {
    await sendMessage(chatId, "📎 Me mande o laudo em PDF (nome do arquivo: <code>Nome DD_MM</code>).");
    return;
  }

  const fname = parseFilename(doc.file_name ?? "");
  if (!fname.dataIso) {
    await sendMessage(
      chatId,
      "❓ Não consegui ler a data no nome do arquivo. Renomeie como <code>Nome Sobrenome DD_MM</code> (ex.: <code>Joao Freitas 12_05</code>) e reenvie.",
    );
    return;
  }
  if (!fname.nome) {
    await sendMessage(chatId, "❓ Não consegui ler o nome do paciente no nome do arquivo.");
    return;
  }

  const bytes = await downloadFile(doc.file_id);
  const texto = await extrairTextoPdf(bytes);
  const parse = parseLaudo(texto);

  const pacientes = await listarPacientes();
  const match = matchPacienteByFilename(fname.nome, pacientes);

  if (match.classification === "AUTO" && match.top) {
    const ref = pacientes.find((p) => p.paciente_id === match.top!.paciente_id)!;
    await comPacienteResolvido(chatId, msg.from!.id, ref, parse, fname.dataIso, ligante);
    return;
  }

  // Precisa escolher o paciente.
  const candidatos = match.candidates
    .map((c) => pacientes.find((p) => p.paciente_id === c.paciente_id))
    .filter((p): p is PacienteRef => Boolean(p));

  const id = await criarPending({
    chatId,
    userId: msg.from!.id,
    kind: "await_patient",
    payload: { candidatos, parse, examIso: fname.dataIso, ligante },
  });

  const buttons: InlineButton[][] = candidatos.map((c, i) => [
    { text: c.nome, callback_data: `p:${id}:${i}` },
  ]);
  buttons.push([{ text: "❌ Nenhum desses", callback_data: `p:${id}:x` }]);

  const titulo =
    match.classification === "NAO_ATRIBUIDO"
      ? `Não achei "${esc(fname.nome)}" na lista. Qual é o paciente?`
      : `Qual é o paciente "${esc(fname.nome)}"?`;
  await sendMessage(chatId, `🔎 ${titulo}`, { buttons });
}

async function onCallback(cb: TgCallback): Promise<void> {
  const chatId = cb.message?.chat.id;
  if (!chatId || !cb.data) {
    await answerCallbackQuery(cb.id);
    return;
  }
  const [tipo, pendingId, arg] = cb.data.split(":");
  const pending = await getPendingById(pendingId);
  if (!pending) {
    await answerCallbackQuery(cb.id, "Essa solicitação expirou. Reenvie o PDF.");
    if (cb.message) await clearButtons(chatId, cb.message.message_id);
    return;
  }
  await answerCallbackQuery(cb.id);
  if (cb.message) await clearButtons(chatId, cb.message.message_id);

  const p = pending.payload as {
    candidatos?: PacienteRef[];
    paciente?: PacienteRef;
    parse: LaudoParse;
    examIso: string;
    ligante: string;
  };

  if (tipo === "p") {
    await apagarPending(pendingId);
    if (arg === "x") {
      await sendMessage(chatId, "Ok, descartei esse PDF. Confira o nome do arquivo e reenvie.");
      return;
    }
    const ref = p.candidatos?.[Number(arg)];
    if (!ref) {
      await sendMessage(chatId, "Opção inválida. Reenvie o PDF.");
      return;
    }
    await comPacienteResolvido(chatId, pending.user_id, ref, p.parse, p.examIso, p.ligante);
    return;
  }

  if (tipo === "b") {
    await apagarPending(pendingId);
    if (arg === "n") {
      await sendMessage(chatId, "Ok, não gravei. Confira o nome do arquivo e reenvie.");
      return;
    }
    if (p.paciente) {
      await comPacienteResolvido(chatId, pending.user_id, p.paciente, p.parse, p.examIso, p.ligante, true);
    }
    return;
  }
}

async function onText(msg: TgMessage): Promise<void> {
  const chatId = msg.chat.id;
  const pending = await getUltimoPending(chatId);
  if (!pending || pending.kind !== "await_admission") {
    await sendMessage(
      chatId,
      "📎 Me envie o laudo em PDF com o nome <code>Nome DD_MM</code>. Eu leio e preencho o seguimento no site.",
    );
    return;
  }

  const p = pending.payload as { paciente: PacienteRef; parse: LaudoParse; examIso: string; ligante: string };
  const admIso = parseDataLivre(msg.text ?? "", p.examIso);
  if (!admIso) {
    await sendMessage(chatId, "Não entendi a data. Responda como <code>09/05</code> ou <code>09/05/2026</code>.");
    return;
  }
  await apagarPending(pending.id);
  await gravarExame(chatId, p.paciente, admIso, p.parse, p.examIso, p.ligante);
}

/**
 * Controle de acesso por código compartilhado. Retorna true se o usuário já
 * está liberado (env allowlist ou tabela telegram_users). Se não estiver,
 * trata a mensagem como tentativa de código: acertou → libera e salva o ID;
 * errou → pede o código. Em ambos os casos retorna false (não processa o
 * conteúdo desta mensagem).
 */
export async function garantirAcesso(update: TgUpdate): Promise<boolean> {
  const msg = update.message;
  const cb = update.callback_query;
  const userId = msg?.from?.id ?? cb?.from?.id;
  const chatId = msg?.chat.id ?? cb?.message?.chat.id;
  if (userId == null || chatId == null) return false;

  if (usuarioNaEnvAllowlist(userId) || (await usuarioNoBanco(userId))) return true;

  // Não liberado. Callback de quem não tem acesso → bloqueia.
  if (cb) {
    await answerCallbackQuery(cb.id, "Acesso não liberado.");
    return false;
  }

  const code = process.env.TELEGRAM_ACCESS_CODE?.trim();
  const txt = (msg?.text ?? "").trim();
  const candidato = txt.startsWith("/start ") ? txt.slice(7).trim() : txt;

  if (code && candidato && candidato === code) {
    await autorizarUsuario(userId, nomeRemetente(msg?.from));
    await sendMessage(
      chatId,
      "✅ Acesso liberado! Agora é só me mandar os PDFs dos exames (nome do arquivo: <code>Nome DD_MM</code>).",
    );
    return false;
  }

  if (code) {
    await sendMessage(chatId, "🔒 Para usar o bot, mande o <b>código de acesso</b> da liga (peça ao responsável).");
  } else {
    await sendMessage(chatId, "🔒 Bot ainda não configurado para liberar acesso. Avise o administrador.");
  }
  return false;
}

export async function handleUpdate(update: TgUpdate): Promise<void> {
  if (update.callback_query) {
    await onCallback(update.callback_query);
    return;
  }
  const msg = update.message;
  if (!msg) return;
  if (msg.document) {
    await onDocument(msg);
    return;
  }
  if (msg.text) {
    await onText(msg);
    return;
  }
}
