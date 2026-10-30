const fusoBrasil = "America/Sao_Paulo";

export function saudacao(agora: Date): string {
  const hora = Number(
    new Intl.DateTimeFormat("pt-BR", { hour: "numeric", hourCycle: "h23", timeZone: fusoBrasil }).format(agora),
  );
  if (hora < 12) return "Bom dia";
  if (hora < 18) return "Boa tarde";
  return "Boa noite";
}

/** Ex.: "TERÇA, 27 DE OUTUBRO" */
export function dataPorExtenso(agora: Date): string {
  return new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "numeric", month: "long", timeZone: fusoBrasil })
    .format(agora)
    .replace("-feira", "")
    .toUpperCase();
}

export function formatarDias(dias: number | null): string {
  if (dias === null) return "—";
  return `${dias.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} d`;
}

export function primeiroNome(nome: string): string {
  return nome.trim().split(/\s+/)[0] ?? nome;
}

/** 95 → "1h35", 45 → "45 min", 120 → "2h". */
export function fmtDuracao(minutos: number | null | undefined): string {
  if (minutos === null || minutos === undefined) return "—";
  const m = Math.max(0, Math.round(minutos));
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const resto = m % 60;
  return resto ? `${h}h${String(resto).padStart(2, "0")}` : `${h}h`;
}
