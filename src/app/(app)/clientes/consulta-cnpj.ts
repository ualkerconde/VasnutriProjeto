"use server";

import { exigirModulo } from "@/lib/auth/sessao";
import { somenteDigitos } from "@/lib/clientes";
import { cnpjValido, deBrasilApi, deReceitaWs, type DadosCnpj } from "@/lib/cnpj";

export type ResultadoCnpj = { dados: DadosCnpj; erro?: undefined } | { dados?: undefined; erro: string };

async function buscarJson(url: string): Promise<{ status: number; corpo: Record<string, unknown> | null }> {
  const resposta = await fetch(url, {
    headers: { Accept: "application/json", "User-Agent": "vasnutri" },
    cache: "no-store",
    signal: AbortSignal.timeout(8000),
  });
  const corpo = (await resposta.json().catch(() => null)) as Record<string, unknown> | null;
  return { status: resposta.status, corpo };
}

/** Consulta a Receita Federal (BrasilAPI, com a ReceitaWS de reserva) para preencher o cadastro do cliente. */
export async function consultarCnpj(valor: string): Promise<ResultadoCnpj> {
  await exigirModulo("CLIENTES");
  const cnpj = somenteDigitos(valor);
  if (!cnpjValido(cnpj)) return { erro: "CNPJ inválido. Confira os números." };

  try {
    const { status, corpo } = await buscarJson(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`);
    if (status === 200 && corpo) return { dados: deBrasilApi(corpo) };
    if (status === 404) return { erro: "CNPJ não encontrado na Receita Federal." };
  } catch {
    // tenta a reserva
  }

  try {
    const { status, corpo } = await buscarJson(`https://receitaws.com.br/v1/cnpj/${cnpj}`);
    if (status === 200 && corpo && corpo.status !== "ERROR") return { dados: deReceitaWs(corpo) };
    if (status === 429) return { erro: "Muitas consultas seguidas. Espere um minuto e tente de novo." };
    if (corpo?.status === "ERROR") return { erro: "CNPJ não encontrado na Receita Federal." };
  } catch {
    // cai na mensagem abaixo
  }
  return { erro: "Não foi possível consultar a Receita agora. Preencha manualmente ou tente de novo." };
}
