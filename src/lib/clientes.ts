import type { Prisma } from "@/generated/prisma/client";
import { hoje } from "@/lib/datas";

/** Contrato vigente: assinado, fora dos recusados e dentro da validade (ou sem validade). */
export function filtroContratoVigente(agora = new Date()): Prisma.ProcessoWhereInput {
  return {
    dataAssinatura: { not: null },
    etapaAtual: { final: false },
    OR: [{ validadeContrato: null }, { validadeContrato: { gte: hoje(agora) } }],
  };
}

export function somenteDigitos(valor: string): string {
  return valor.replace(/\D/g, "");
}

export function formatarCnpj(cnpj: string | null | undefined): string {
  if (!cnpj) return "—";
  const d = somenteDigitos(cnpj);
  if (d.length !== 14) return cnpj;
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
}

export function enderecoCompleto(c: {
  logradouro: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  uf: string | null;
  cep: string | null;
}): string {
  const linha1 = [c.logradouro, c.numero, c.complemento].filter(Boolean).join(", ");
  const cidade = [c.cidade, c.uf].filter(Boolean).join("/");
  return [linha1, c.bairro, cidade, c.cep].filter(Boolean).join(" · ") || "—";
}

export const UFS = "AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO".split(" ");

export const TIPOS_CONTATO = {
  EMAIL_NF: "E-mail para NF",
  EMAIL_RELATORIO: "E-mail para relatórios",
  TELEFONE: "Telefone",
  RESPONSAVEL_LEGAL: "Responsável legal",
  OUTRO: "Outro",
} as const;
