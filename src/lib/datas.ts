const fuso = "America/Sao_Paulo";

/** Data de hoje no Brasil, à meia-noite UTC (formato das colunas date do banco). */
export function hoje(agora = new Date()): Date {
  const iso = new Intl.DateTimeFormat("en-CA", { timeZone: fuso }).format(agora);
  return new Date(`${iso}T00:00:00Z`);
}

export function somarDias(d: Date, dias: number): Date {
  return new Date(d.getTime() + dias * 86_400_000);
}

export function somarMeses(d: Date, meses: number): Date {
  const r = new Date(d);
  r.setUTCMonth(r.getUTCMonth() + meses);
  return r;
}

export function diasEntre(inicio: Date, fim: Date): number {
  return Math.round((fim.getTime() - inicio.getTime()) / 86_400_000);
}

/** Para colunas date (guardadas em UTC). */
export function fmtData(d: Date | null | undefined): string {
  if (!d) return "—";
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(d);
}

/** Para colunas com hora. */
export function fmtDataHora(d: Date | null | undefined): string {
  if (!d) return "—";
  return new Intl.DateTimeFormat("pt-BR", { timeZone: fuso, dateStyle: "short", timeStyle: "short" }).format(d);
}

/** Valor para <input type="date">. */
export function paraInputData(d: Date | null | undefined): string {
  return d ? d.toISOString().slice(0, 10) : "";
}

/** Valor para <input type="datetime-local"> no horário de Brasília. */
export function paraInputDataHora(d: Date | null | undefined): string {
  if (!d) return "";
  const partes = new Intl.DateTimeFormat("sv-SE", {
    timeZone: fuso,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
  return partes.replace(" ", "T");
}

export function fmtMoeda(valor: { toString(): string } | null | undefined): string {
  if (valor === null || valor === undefined) return "—";
  return Number(valor.toString()).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function tempoRelativo(d: Date, agora = new Date()): string {
  const min = Math.round((agora.getTime() - d.getTime()) / 60_000);
  if (min < 1) return "agora";
  if (min < 60) return `há ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `há ${h} h`;
  const dias = Math.round(h / 24);
  return dias === 1 ? "ontem" : `há ${dias} dias`;
}
