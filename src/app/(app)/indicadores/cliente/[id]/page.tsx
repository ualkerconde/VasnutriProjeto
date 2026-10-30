import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { BarrasHorizontais, ColunasMensais, GradeKpis } from "@/components/graficos";
import { CabecalhoPagina, Cartao, EstadoVazio, LinkBotao, Selo, Tabela } from "@/components/ui";
import { exigirUsuario } from "@/lib/auth/sessao";
import { filtroContratoVigente } from "@/lib/clientes";
import { fmtData, fmtMoeda, hoje } from "@/lib/datas";
import { db } from "@/lib/db";
import { serieMensal, totaisPorContrato } from "@/lib/financeiro/painel";
import { descreverMeses, intervaloDoMes, mesesEntre } from "@/lib/financeiro/regras";
import { fmtDuracao } from "@/lib/formato";

export const metadata: Metadata = { title: "Painel do cliente" };

export default async function PainelCliente({ params }: PageProps<"/indicadores/cliente/[id]">) {
  const usuario = await exigirUsuario();
  if (!usuario.modulos.includes("INDICADORES") && !usuario.modulos.includes("FINANCEIRO")) redirect("/?sem-acesso=1");
  const { id } = await params;
  const hojeData = hoje();

  const [cliente, vigente, despesas, porCategoria, categorias, visitas] = await Promise.all([
    db.cliente.findUnique({
      where: { id },
      include: {
        gestor: { select: { nome: true } },
        processos: {
          where: { OR: [{ dataAssinatura: { not: null } }, { parcelas: { some: {} } }] },
          orderBy: { criadoEm: "desc" },
          select: { id: true, numeroOrcamento: true, numeroContrato: true, valorMensal: true, dataAssinatura: true, validadeContrato: true, etapaAtual: { select: { nome: true } } },
        },
      },
    }),
    db.processo.findFirst({ where: { clienteId: id, ...filtroContratoVigente() }, orderBy: { dataAssinatura: "asc" }, select: { dataAssinatura: true, validadeContrato: true } }),
    db.despesa.findMany({ where: { clienteId: id }, orderBy: { data: "desc" }, take: 10, include: { categoria: { select: { nome: true } }, usuario: { select: { nome: true } } } }),
    db.despesa.groupBy({ by: ["categoriaId"], where: { clienteId: id }, _sum: { valor: true } }),
    db.categoriaDespesa.findMany({ select: { id: true, nome: true } }),
    db.$queryRaw<{ n: number; minutos: number; ultima: Date | null }[]>`
      SELECT count(*)::int AS n, coalesce(sum(extract(epoch FROM (v.fim - v.inicio)) / 60), 0)::float8 AS minutos, max(v.inicio) AS ultima
      FROM visitas v JOIN processos p ON p.id = v.processo_id
      WHERE p.cliente_id = ${id}::uuid AND v.status = 'CONCLUIDA'`,
  ]);
  if (!cliente) notFound();

  const totais = await totaisPorContrato(cliente.processos.map((p) => p.id));
  const soma = (campo: "total" | "recebido" | "aberto" | "vencido") => [...totais.values()].reduce((s, t) => s + t[campo], 0);
  const despesaTotal = porCategoria.reduce((s, c) => s + Number(c._sum.valor ?? 0), 0);
  const faturamento = soma("recebido");
  const margem = faturamento - despesaTotal;
  const serie = await serieMensal(intervaloDoMes(undefined, hojeData).chave, 12, { clienteId: id });
  const nomeCategoria = new Map(categorias.map((c) => [c.id, c.nome]));
  const desde = cliente.processos.map((p) => p.dataAssinatura).filter((d): d is Date => Boolean(d)).sort((a, b) => a.getTime() - b.getTime())[0];
  const v = visitas[0] ?? { n: 0, minutos: 0, ultima: null };

  return (
    <>
      <CabecalhoPagina
        sobretitulo="Painel do cliente"
        titulo={cliente.nomeFantasia}
        descricao={
          <>
            {desde ? <>Cliente desde {fmtData(desde)} ({descreverMeses(mesesEntre(desde, hojeData))})</> : "Sem contrato assinado"}
            {vigente?.validadeContrato && <> · contrato atual até {fmtData(vigente.validadeContrato)}</>}
            {cliente.gestor && <> · gestor: {cliente.gestor.nome}</>}
          </>
        }
        acoes={
          <>
            {vigente ? <Selo cor="verde">Contrato ativo</Selo> : <Selo>Sem contrato ativo</Selo>}
            <LinkBotao href={`/clientes/${cliente.id}`} variante="secundario">
              Cadastro
            </LinkBotao>
          </>
        }
      />

      <GradeKpis
        min={230}
        itens={[
          { rotulo: "Faturamento", valor: fmtMoeda(faturamento), nota: "Total recebido do cliente", escuro: true },
          { rotulo: "Despesas", valor: fmtMoeda(despesaTotal), nota: "Lançadas para este cliente" },
          {
            rotulo: "Margem",
            valor: fmtMoeda(margem),
            nota: faturamento > 0 ? `${Math.round((margem / faturamento) * 100)}% do faturamento` : "Sem faturamento ainda",
            alerta: margem < 0,
            selo: margem < 0 ? "NEGATIVA" : undefined,
          },
          {
            rotulo: "A receber",
            valor: fmtMoeda(soma("aberto")),
            nota: soma("vencido") > 0 ? `${fmtMoeda(soma("vencido"))} vencido` : "Nada vencido",
            alerta: soma("vencido") > 0,
            selo: soma("vencido") > 0 ? "ATRASO" : undefined,
          },
          { rotulo: "Visitas realizadas", valor: v.n, nota: `${fmtDuracao(v.minutos)} em campo · última ${v.ultima ? fmtData(v.ultima) : "—"}` },
        ]}
      />

      <div className="flex flex-wrap items-start gap-5">
        <Cartao titulo="Faturamento x despesas (12 meses)" className="flex-[999_1_480px]">
          <ColunasMensais
            meses={serie}
            series={[
              { nome: "Recebido", cor: "bg-menta" },
              { nome: "Despesas", cor: "bg-ambar" },
            ]}
            formato={(x) => fmtMoeda(x)}
          />
        </Cartao>
        <Cartao titulo="Despesas por categoria" className="flex-[1_1_300px]">
          <BarrasHorizontais
            itens={porCategoria
              .map((c) => ({ chave: c.categoriaId, rotulo: nomeCategoria.get(c.categoriaId) ?? "—", valor: Number(c._sum.valor ?? 0) }))
              .sort((a, b) => b.valor - a.valor)}
            formato={(x) => fmtMoeda(x)}
            cor="bg-ambar"
            vazio="Nenhuma despesa ligada a este cliente."
          />
        </Cartao>
      </div>

      <Cartao titulo="Contratos">
        {cliente.processos.length === 0 ? (
          <EstadoVazio>Nenhum contrato assinado.</EstadoVazio>
        ) : (
          <Tabela cabecalho={["Contrato", "Valor mensal", "Assinado em", "Validade", "Recebido", "A receber"]}>
            {cliente.processos.map((p) => {
              const t = totais.get(p.id);
              return (
                <tr key={p.id}>
                  <td>
                    {usuario.modulos.includes("FINANCEIRO") ? (
                      <Link href={`/financeiro/contrato/${p.id}`} className="font-semibold hover:text-verde">
                        {p.numeroContrato ?? `Orçamento nº ${p.numeroOrcamento}`}
                      </Link>
                    ) : (
                      <span className="font-semibold">{p.numeroContrato ?? `Orçamento nº ${p.numeroOrcamento}`}</span>
                    )}
                    <span className="block text-xs text-suave">{p.etapaAtual.nome}</span>
                  </td>
                  <td className="font-mono">{fmtMoeda(p.valorMensal)}</td>
                  <td>{fmtData(p.dataAssinatura)}</td>
                  <td>{fmtData(p.validadeContrato)}</td>
                  <td className="font-mono">{fmtMoeda(t?.recebido ?? 0)}</td>
                  <td className="font-mono">{fmtMoeda(t?.aberto ?? 0)}</td>
                </tr>
              );
            })}
          </Tabela>
        )}
      </Cartao>

      {despesas.length > 0 && (
        <Cartao titulo="Últimas despesas com o cliente">
          <Tabela cabecalho={["Descrição", "Data", "Categoria", "Quem lançou", "Valor"]}>
            {despesas.map((d) => (
              <tr key={d.id}>
                <td className="font-semibold">{d.descricao || d.categoria.nome}</td>
                <td>{fmtData(d.data)}</td>
                <td>{d.categoria.nome}</td>
                <td>{d.usuario.nome}</td>
                <td className="font-mono">{fmtMoeda(d.valor)}</td>
              </tr>
            ))}
          </Tabela>
        </Cartao>
      )}
    </>
  );
}
