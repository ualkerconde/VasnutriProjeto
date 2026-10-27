// Conversões dos valores da planilha do AppSheet (datas dd/mm/aaaa, números pt-BR, Sim/Não).
// Funções puras: usadas pelo script scripts/migrar-appsheet.ts e cobertas por testes.

/** Valor bruto de uma célula, como vem do .xlsx. */
export type Celula = string | number | boolean | Date | null | undefined;

export function textoDe(v: Celula): string | null {
  if (v === null || v === undefined) return null;
  if (v instanceof Date) return v.toISOString();
  const t = String(v).replace(/\s+/g, " ").trim();
  if (!t || t === "#ERROR!" || t === "#N/A" || t === "#REF!") return null;
  return t;
}

/** Texto com quebras de linha preservadas (campos longos). */
export function textoLongoDe(v: Celula): string | null {
  if (v === null || v === undefined || v instanceof Date) return textoDe(v);
  const t = String(v).trim();
  return t ? t : null;
}

export function simNao(v: Celula): boolean | null {
  const t = semAcento(textoDe(v) ?? "").toLowerCase();
  if (["sim", "s", "true", "verdadeiro", "y", "yes"].includes(t)) return true;
  if (["nao", "n", "false", "falso", "no"].includes(t)) return false;
  return null;
}

/**
 * Data (sem hora) em meia-noite UTC, como o resto do sistema grava.
 * Aceita "dd/mm/aaaa", "dd/mm/aaaa hh:mm[:ss]", "aaaa-mm-dd" e células de data do Excel.
 */
export function dataDe(v: Celula): Date | null {
  if (v instanceof Date) {
    if (Number.isNaN(v.getTime())) return null;
    return new Date(Date.UTC(v.getUTCFullYear(), v.getUTCMonth(), v.getUTCDate()));
  }
  if (typeof v === "number") return dataDe(dataDoExcel(v));
  const t = textoDe(v);
  if (!t) return null;
  let m = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
  if (m) return dataValida(anoCompleto(Number(m[3])), Number(m[2]), Number(m[1]));
  m = t.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return dataValida(Number(m[1]), Number(m[2]), Number(m[3]));
  return null;
}

/**
 * Data e hora. Os horários da planilha estão no fuso de São Paulo (-03:00).
 * Células de data do Excel chegam com a hora "de parede" em UTC, então também são lidas como -03:00.
 */
export function dataHoraDe(v: Celula): Date | null {
  if (typeof v === "number") return dataHoraDe(dataDoExcel(v));
  if (v instanceof Date) {
    if (Number.isNaN(v.getTime())) return null;
    return paraSaoPaulo(v.getUTCFullYear(), v.getUTCMonth() + 1, v.getUTCDate(), v.getUTCHours(), v.getUTCMinutes(), v.getUTCSeconds());
  }
  const t = textoDe(v);
  if (!t) return null;
  const m = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})(?:[ T]+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
  if (!m) return null;
  const dia = dataValida(anoCompleto(Number(m[3])), Number(m[2]), Number(m[1]));
  if (!dia) return null;
  return paraSaoPaulo(dia.getUTCFullYear(), dia.getUTCMonth() + 1, dia.getUTCDate(), Number(m[4] ?? 0), Number(m[5] ?? 0), Number(m[6] ?? 0));
}

/** Horário "hh:mm" (de texto "15:32:00" ou de célula de hora do Excel). */
export function horaDe(v: Celula): string | null {
  if (v instanceof Date) return `${dois(v.getUTCHours())}:${dois(v.getUTCMinutes())}`;
  if (typeof v === "number" && v >= 0 && v < 1) {
    const minutos = Math.round(v * 24 * 60);
    return `${dois(Math.floor(minutos / 60))}:${dois(minutos % 60)}`;
  }
  const t = textoDe(v);
  if (!t) return null;
  const m = t.match(/^(\d{1,2}):(\d{2})/);
  return m ? `${dois(Number(m[1]))}:${m[2]}` : t;
}

/** Número em formato brasileiro ("1.000,50", "R$ 449,10") ou já numérico. */
export function numeroDe(v: Celula): number | null {
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  const t = textoDe(v);
  if (!t) return null;
  let limpo = t.replace(/[^\d,.-]/g, "");
  if (!limpo || !/\d/.test(limpo)) return null;
  if (limpo.includes(",")) limpo = limpo.replace(/\./g, "").replace(",", ".");
  else if (/^\d{1,3}(\.\d{3})+$/.test(limpo)) limpo = limpo.replace(/\./g, "");
  const n = Number(limpo);
  return Number.isFinite(n) ? n : null;
}

export function inteiroDe(v: Celula): number | null {
  const n = numeroDe(v);
  return n === null ? null : Math.round(n);
}

/** Dia do mês para vencimento: aceita "05", "10" ou uma data (usa o dia). */
export function diaDe(v: Celula): number | null {
  const data = typeof v === "number" ? null : dataDe(v);
  const dia = data ? data.getUTCDate() : inteiroDe(v);
  return dia !== null && dia >= 1 && dia <= 31 ? dia : null;
}

/** CNPJ só com dígitos, ou null se não tiver 14 dígitos. */
export function cnpjDe(v: Celula): string | null {
  const digitos = (textoDe(v) ?? "").replace(/\D/g, "");
  return digitos.length === 14 ? digitos : null;
}

/** "a , b,c" → ["a", "b", "c"]. */
export function listaDe(v: Celula, separador: RegExp = /\s*,\s*/): string[] {
  const t = textoDe(v);
  if (!t) return [];
  return [...new Set(t.split(separador).map((s) => s.trim()).filter(Boolean))];
}

export function emailsDe(v: Celula): string[] {
  return listaDe(v, /[\s/;,]+/).filter((e) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)).map((e) => e.toLowerCase());
}

/** CEP no meio de um endereço livre. */
export function cepDe(endereco: string | null): string | null {
  const m = endereco?.match(/(\d{2})\.?(\d{3})-?(\d{3})(?!\d)/);
  return m ? `${m[1]}${m[2]}-${m[3]}` : null;
}

export function semAcento(t: string) {
  return t.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

/** Chave para comparar nomes: minúsculas, sem acento, sem pontuação. */
export function chaveNome(t: string) {
  return semAcento(t).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

/** "ualker.conde@dolean.com.br" → "Ualker Conde". */
export function nomeDoEmail(email: string) {
  return email
    .split("@")[0]
    .split(/[._-]+/)
    .filter(Boolean)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase())
    .join(" ");
}

/**
 * Acha o usuário citado num texto livre ("Pedro Tirello", "pedro", "Vagner (selecionar...)").
 * Compara o primeiro nome do texto com o primeiro nome (ou o começo do e-mail) de cada usuário.
 * Só devolve quando há exatamente um candidato.
 */
export function acharUsuario<U extends { nome: string; email: string }>(texto: string | null, usuarios: U[]): U | null {
  if (!texto) return null;
  const chave = chaveNome(texto);
  if (!chave) return null;
  const exato = usuarios.filter((u) => chaveNome(u.nome) === chave);
  if (exato.length === 1) return exato[0];
  const primeiro = chave.split(" ")[0];
  if (primeiro.length < 3) return null;
  const candidatos = usuarios.filter(
    (u) => chaveNome(u.nome).split(" ")[0] === primeiro || chaveNome(u.email.split("@")[0]).split(" ")[0] === primeiro,
  );
  return candidatos.length === 1 ? candidatos[0] : null;
}

export function mimeDe(caminho: string) {
  const ext = caminho.toLowerCase().split(".").pop() ?? "";
  const tipos: Record<string, string> = {
    pdf: "application/pdf",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    gif: "image/gif",
    webp: "image/webp",
    doc: "application/msword",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    xls: "application/vnd.ms-excel",
    xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  };
  return tipos[ext] ?? "application/octet-stream";
}

function dataDoExcel(serial: number) {
  // Dia 0 do Excel = 30/12/1899.
  return new Date(Date.UTC(1899, 11, 30) + Math.round(serial * 86_400_000));
}

function anoCompleto(ano: number) {
  return ano < 100 ? 2000 + ano : ano;
}

function dataValida(ano: number, mes: number, dia: number) {
  const d = new Date(Date.UTC(ano, mes - 1, dia));
  return d.getUTCFullYear() === ano && d.getUTCMonth() === mes - 1 && d.getUTCDate() === dia ? d : null;
}

function paraSaoPaulo(ano: number, mes: number, dia: number, h: number, min: number, s: number) {
  return new Date(Date.UTC(ano, mes - 1, dia, h + 3, min, s));
}

function dois(n: number) {
  return String(n).padStart(2, "0");
}
