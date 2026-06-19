/**
 * Normalização de nome de paciente para o REDCap, onde o record_id É o nome.
 *  - normalizeNome: o que VAI como record_id — preserva caixa/acento (precisa
 *    casar com records legados gravados pelo nome), só colapsa espaços/trim.
 *  - canonNome: chave canônica AGRESSIVA (sem acento/caixa) usada SÓ pra DETECTAR
 *    a mesma pessoa com grafia divergente ("José da Silva" vs "JOSE DA SILVA").
 *    NUNCA usar canonNome como record_id.
 */

export function normalizeNome(nome: string): string {
  return nome.trim().replace(/\s+/g, " ");
}

export function canonNome(nome: string): string {
  return normalizeNome(nome)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}
