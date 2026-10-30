import type { Metadata } from "next";
import Link from "next/link";
import { BotaoAcao } from "@/components/formulario";
import { BarrasHorizontais, ColunasMensais, GradeKpis } from "@/components/graficos";
import { NavegadorMes } from "@/components/navegador-mes";
import { CabecalhoPagina, Cartao, EstadoVazio, LinkBotao, Selo, Tabela } from "@/components/ui";
import { exigirModulo } from "@/lib/auth/sessao";
import { fmtData, fmtMoeda, hoje } from "@/lib/datas";
import { dadosFinanceiro } from "@/lib/financeiro/painel";
import { COR_SITUACAO, intervaloDoMes, ROTULO_SITUACAO, situacaoParcela } from "@/lib/financeiro/regras";
import { receberParcela } from "./acoes";

export const metadata: Metadata = { title: "Financeiro" };

export default async function Financeiro({ searchParams }: PageProps<"/financeiro">) {
  await exigirModulo("FINANCEIRO");
  const { mes } = await searchParams;
  const d = await dadosFinanceiro(typeof mes === "string" ? mes : undefined);
  const atual = intervaloDoMes(undefined, hoje()).chave;
  const moeda = (v: number) => fmtMoeda(v);

  return (
    <>
      <CabecalhoPagina
        sobretitulo="Financeiro"
        titulo="Painel financeiro"
        descricao="Contas a receber geradas pelas parcelas mensais dos contratos e as despesas lançadas pela equipe."
        acoes={<LinkBotao href="/despesas" variante="secundario">Despesas</LinkBotao>}
      />

      <NavegadorMes caminho="/financeiro" mes={d.periodo.chave} atual={atual} />

      <GradeKpis
        min={230}
        itens={[
          { rotulo: "Recebido no mês", valor: moeda(d.recebido), nota: `de ${moeda(d.previsto.valor)} previstos (${d.previsto.quantidade} parcela(s))`, selo: "RECEBIDO", escuro: true },
          { rotulo: "A receber", valor: moeda(d.emAberto.aReceber.valor), nota: `${d.emAberto.aReceber.quantidade} parcela(s) em aberto, no prazo`, selo: "EM ABERTO" },
          {
            rotulo: "Vencido",
            valor: moeda(d.emAberto.vencido.valor),
            nota: `${d.emAberto.vencido.quantidade} parcela(s) com vencimento passado`,
            selo: "ATRASO",
            alerta: d.emAberto.vencido.quantidade > 0,
          },
          { rotulo: "Total a receber", valor: moeda(d.emAberto.aReceber.valor + d.emAberto.vencido.valor), nota: "Em aberto + vencido", selo: "TOTAL" },
          { rotulo: "Despesas no mês", valor: moeda(d.despesas.valor), nota: `${d.despesas.quantidade} lançamento(s)`, selo: "DESPESAS", href: `/despesas?mes=${d.periodo.chave}&todos=1` },
          { rotulo: "Resultado do mês", valor: moeda(d.resultado), nota: "Recebido menos despesas", selo: d.resultado >= 0 ? "POSITIVO" : "NEGATIVO", alerta: d.resultado < 0 },
        ]}
      />

      <div className="flex flex-wrap items-start gap-5">
        <Cartao titulo="Recebido x despesas" className="flex-[999_1_480px]">
          <ColunasMensais
            meses={d.serie}
            series={[
              { nome: "Recebido", cor: "bg-menta" },
              { nome: "Despesas", cor: "bg-ambar" },
            ]}
            formato={moeda}
          />
        </Cartao>
        <Cartao titulo="Despesas por categoria" className="flex-[1_1_300px]">
          <BarrasHorizontais itens={d.porCategoria} formato={moeda} cor="bg-ambar" vazio="Nenhuma despesa neste mês." />
        </Cartao>
      </div>

      <Cartao titulo="Vencidas e próximos 30 dias">
        {d.proximas.length === 0 ? (
          <EstadoVazio>Nenhuma parcela vencida ou vencendo nos próximos 30 dias.</EstadoVazio>
        ) : (
          <Tabela cabecalho={["Cliente", "Vencimento", "Valor", "Situação", "NF", ""]}>
            {d.proximas.map((p) => {
              const sit = situacaoParcela(p, d.hoje);
              return (
                <tr key={p.id}>
                  <td>
                    <Link href={`/financeiro/contrato/${p.processo.id}`} className="font-semibold hover:text-verde">
                      {p.processo.cliente.nomeFantasia}
                    </Link>
                  </td>
                  <td>{fmtData(p.vencimento)}</td>
                  <td className="font-mono">{fmtMoeda(p.valor)}</td>
                  <td>
                    <Selo cor={COR_SITUACAO[sit]}>{ROTULO_SITUACAO[sit]}</Selo>
                  </td>
                  <td className="text-texto-2">{p.numeroNf ?? (p._count.arquivos ? "Anexada" : "—")}</td>
                  <td className="text-right">
                    <BotaoAcao acao={receberParcela.bind(null, p.id)} variante="menta" confirmar={`Registrar o recebimento de ${fmtMoeda(p.valor)} com data de hoje?`}>
                      Receber
                    </BotaoAcao>
                  </td>
                </tr>
              );
            })}
          </Tabela>
        )}
      </Cartao>

      <Cartao titulo="Contratos">
        {d.contratos.length === 0 ? (
          <EstadoVazio>Nenhum contrato com valor mensal ainda. As parcelas aparecem quando o contrato tem valor e entra em Visitas técnicas, ou ao gerar no contrato.</EstadoVazio>
        ) : (
          <Tabela cabecalho={["Cliente", "Valor mensal", "Vencimento do contrato", "Total", "Recebido", "A receber", ""]}>
            {d.contratos.map((c) => {
              const dias = c.validadeContrato ? Math.round((c.validadeContrato.getTime() - d.hoje.getTime()) / 86_400_000) : null;
              return (
                <tr key={c.id}>
                  <td>
                    <Link href={`/financeiro/contrato/${c.id}`} className="font-semibold hover:text-verde">
                      {c.cliente.nomeFantasia}
                    </Link>
                    <span className="block text-xs text-suave">
                      {c.numeroContrato ? `Contrato ${c.numeroContrato}` : `Orçamento nº ${c.numeroOrcamento}`} · {c.etapaAtual.nome}
                    </span>
                  </td>
                  <td className="font-mono">{fmtMoeda(c.valorMensal)}</td>
                  <td>
                    <span className="flex flex-wrap items-center justify-end gap-2 sm:justify-start">
                      {fmtData(c.validadeContrato)}
                      {dias !== null && dias < 0 && <Selo cor="vermelho">Vencido</Selo>}
                      {dias !== null && dias >= 0 && dias <= 60 && <Selo cor="ambar">{dias} dia(s)</Selo>}
                    </span>
                  </td>
                  <td className="font-mono">{fmtMoeda(c.totais.total)}</td>
                  <td className="font-mono text-verde">{fmtMoeda(c.totais.recebido)}</td>
                  <td className="font-mono">
                    {fmtMoeda(c.totais.aberto)}
                    {c.totais.vencido > 0 && <span className="block text-xs font-semibold text-[#9A2B12]">{fmtMoeda(c.totais.vencido)} vencido</span>}
                  </td>
                  <td className="text-right">
                    <LinkBotao href={`/financeiro/contrato/${c.id}`} variante="secundario" pequeno>
                      {c.totais.parcelas ? "Parcelas" : "Gerar parcelas"}
                    </LinkBotao>
                  </td>
                </tr>
              );
            })}
          </Tabela>
        )}
      </Cartao>
    </>
  );
}
