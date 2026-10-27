import "server-only";
import { db } from "@/lib/db";

/** Regras ajustáveis na tela de Cadastros, com o valor usado quando ninguém mudou. */
export const CONFIGURACOES = {
  um_processo_ativo_por_cliente: {
    padrao: true,
    rotulo: "Um processo em andamento por cliente",
    descricao: "Impede abrir um segundo processo para um cliente que já tem um em andamento.",
  },
  dias_orcamento_parado: {
    padrao: 7,
    rotulo: "Avisar orçamento aguardando há (dias)",
    descricao: "Notifica o responsável quando o orçamento espera aprovação por mais tempo que isso.",
  },
  dias_aviso_fim_contrato: {
    padrao: 30,
    rotulo: "Avisar fim do contrato com antecedência de (dias)",
    descricao: "Notifica o responsável antes do fim do ciclo do contrato.",
  },
  dias_aviso_validade_documento: {
    padrao: 30,
    rotulo: "Avisar validade de documentos com antecedência de (dias)",
    descricao: "Vale para anexos com data de validade.",
  },
  dias_aviso_prazo_solicitacao: {
    padrao: 2,
    rotulo: "Avisar prazo de solicitação com antecedência de (dias)",
    descricao: "Solicitações do escritório em aberto perto do prazo.",
  },
} as const;

export type ChaveConfig = keyof typeof CONFIGURACOES;
type Valor<K extends ChaveConfig> = (typeof CONFIGURACOES)[K]["padrao"] extends boolean ? boolean : number;

export async function lerConfig<K extends ChaveConfig>(chave: K): Promise<Valor<K>> {
  const linha = await db.configuracao.findUnique({ where: { chave } });
  const padrao = CONFIGURACOES[chave].padrao;
  if (!linha || typeof linha.valor !== typeof padrao) return padrao as Valor<K>;
  return linha.valor as Valor<K>;
}

export async function lerTodasConfigs() {
  const linhas = await db.configuracao.findMany();
  const valores = new Map(linhas.map((l) => [l.chave, l.valor]));
  return (Object.keys(CONFIGURACOES) as ChaveConfig[]).map((chave) => {
    const padrao = CONFIGURACOES[chave].padrao;
    const salvo = valores.get(chave);
    return { chave, ...CONFIGURACOES[chave], valor: typeof salvo === typeof padrao ? (salvo as boolean | number) : padrao };
  });
}
