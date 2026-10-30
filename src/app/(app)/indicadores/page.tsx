import type { Metadata } from "next";
import Link from "next/link";
import { BarrasHorizontais, GradeKpis } from "@/components/graficos";
import { CabecalhoPagina, Cartao, EstadoVazio, Selo, Tabela } from "@/components/ui";
import { exigirModulo } from "@/lib/auth/sessao";
import { fmtMoeda } from "@/lib/datas";
import { fmtDuracao } from "@/lib/formato";
import { periodoIndicadores, resultadoPorCliente, resultadoPorFuncionario, top } from "@/lib/indicadores";
import { SeletorPeriodo } from "./periodo";

export const metadata: Metadata = { title: "Indicadores" };

export default async function Indicadores({ searchParams }: PageProps<"/indicadores">) {
  await exigirModulo("INDICADORES");
  const { periodo: chave } = await searchParams;
  const periodo = periodoIndicadores(typeof chave === "string" ? chave : undefined);
  const [clientes, funcionarios] = await Promise.all([resultadoPorCliente(periodo.inicio, periodo.fim), resultadoPorFuncionario(periodo.inicio, periodo.fim)]);

  const moeda = (v: number) => fmtMoeda(v);
  const faturamento = clientes.reduce((s, c) => s + c.faturamento, 0);
  const despesasClientes = clientes.reduce((s, c) => s + c.despesas, 0);
  const despesasTotal = funcionarios.reduce((s, f) => s + f.despesas, 0);
  const visitas = funcionarios.reduce((s, f) => s + f.visitas, 0);
  const minutos = funcionarios.reduce((s, f) => s + f.minutosCampo, 0);
  const previstos = funcionarios.reduce((s, f) => s + f.minutosPrevistos, 0);
  const realComPrevisto = funcionarios.reduce((s, f) => s + f.minutosRealComPrevisto, 0);
  const linkCliente = (id: string, nome: string) => (
    <Link href={`/indicadores/cliente/${id}`} className="hover:text-verde">
      {nome}
    </Link>
  );

  return (
    <>
      <CabecalhoPagina
        sobretitulo="Indicadores"
        titulo="Rankings e resultados"
        descricao="Quem mais fatura, onde se gasta e como a equipe está trabalhando. Faturamento = parcelas recebidas no período."
      />
      <SeletorPeriodo caminho="/indicadores" atual={periodo.chave} />

      <GradeKpis
        min={230}
        itens={[
          { rotulo: "Faturamento", valor: moeda(faturamento), nota: `Recebido nos últimos ${periodo.rotulo}`, escuro: true },
          { rotulo: "Despesas", valor: moeda(despesasTotal), nota: `${moeda(despesasClientes)} ligadas a clientes` },
          { rotulo: "Visitas realizadas", valor: visitas, nota: `${fmtDuracao(minutos)} em campo` },
          {
            rotulo: "Previsto x realizado",
            valor: previstos ? `${Math.round((realComPrevisto / previstos) * 100)}%` : "—",
            nota: previstos ? `${fmtDuracao(realComPrevisto)} realizados de ${fmtDuracao(previstos)} previstos` : "Informe o tempo previsto ao agendar visitas",
            selo: "TEMPO",
          },
        ]}
      />

      <div className="grid gap-5 [grid-template-columns:repeat(auto-fit,minmax(min(340px,100%),1fr))]">
        <Cartao titulo="Maiores faturamentos">
          <BarrasHorizontais itens={top(clientes, (c) => c.faturamento).map((c) => ({ chave: c.id, rotulo: linkCliente(c.id, c.nome), valor: c.faturamento }))} formato={moeda} vazio="Nenhum recebimento no período." />
        </Cartao>
        <Cartao titulo="Maiores despesas por cliente">
          <BarrasHorizontais
            itens={top(clientes, (c) => c.despesas).map((c) => ({ chave: c.id, rotulo: linkCliente(c.id, c.nome), valor: c.despesas }))}
            formato={moeda}
            cor="bg-ambar"
            vazio="Nenhuma despesa ligada a cliente no período."
          />
        </Cartao>
      </div>

      <Cartao titulo="Margem por cliente">
        {clientes.length === 0 ? (
          <EstadoVazio>Sem faturamento nem despesas por cliente no período.</EstadoVazio>
        ) : (
          <Tabela cabecalho={["Cliente", "Faturamento", "Despesas", "Margem", "Margem %"]}>
            {[...clientes]
              .sort((a, b) => b.faturamento - a.faturamento || a.margem - b.margem)
              .map((c) => (
                <tr key={c.id}>
                  <td className="font-semibold">{linkCliente(c.id, c.nome)}</td>
                  <td className="font-mono">{moeda(c.faturamento)}</td>
                  <td className="font-mono">{moeda(c.despesas)}</td>
                  <td className={`font-mono font-semibold ${c.margem < 0 ? "text-[#9A2B12]" : "text-verde"}`}>{moeda(c.margem)}</td>
                  <td>
                    {c.faturamento > 0 ? (
                      <Selo cor={c.margem / c.faturamento >= 0.7 ? "verde" : c.margem >= 0 ? "ambar" : "vermelho"}>{Math.round((c.margem / c.faturamento) * 100)}%</Selo>
                    ) : (
                      <Selo cor="vermelho">Sem receita</Selo>
                    )}
                  </td>
                </tr>
              ))}
          </Tabela>
        )}
      </Cartao>

      <div className="grid gap-5 [grid-template-columns:repeat(auto-fit,minmax(min(240px,100%),1fr))]">
        <Cartao titulo="Mais ações">
          <BarrasHorizontais
            itens={top(funcionarios, (f) => f.acoes).map((f) => ({
              chave: f.id,
              rotulo: f.nome,
              valor: f.acoes,
              detalhe: `${f.movimentos} etapa(s) · ${f.checklist} checklist · ${f.visitas} visita(s) · ${f.solicitacoes} solicitação(ões)`,
            }))}
            vazio="Nenhuma ação no período."
          />
        </Cartao>
        <Cartao titulo="Mais visitas">
          <BarrasHorizontais
            itens={top(funcionarios, (f) => f.visitas).map((f) => ({ chave: f.id, rotulo: f.nome, valor: f.visitas, detalhe: `${fmtDuracao(f.minutosCampo)} em campo` }))}
            vazio="Nenhuma visita finalizada no período."
          />
        </Cartao>
        <Cartao titulo="Mais horas em campo">
          <BarrasHorizontais itens={top(funcionarios, (f) => f.minutosCampo).map((f) => ({ chave: f.id, rotulo: f.nome, valor: f.minutosCampo }))} formato={fmtDuracao} vazio="Nenhuma visita finalizada no período." />
        </Cartao>
        <Cartao titulo="Mais despesas">
          <BarrasHorizontais itens={top(funcionarios, (f) => f.despesas).map((f) => ({ chave: f.id, rotulo: f.nome, valor: f.despesas }))} formato={moeda} cor="bg-ambar" vazio="Nenhuma despesa no período." />
        </Cartao>
      </div>

      <Cartao titulo="Equipe">
        {funcionarios.length === 0 ? (
          <EstadoVazio>Ninguém ativo.</EstadoVazio>
        ) : (
          <Tabela cabecalho={["Funcionário", "Ações", "Visitas", "Horas em campo", "Previsto x realizado", "Despesas"]}>
            {[...funcionarios]
              .sort((a, b) => b.acoes - a.acoes)
              .map((f) => (
                <tr key={f.id}>
                  <td className="font-semibold">{f.nome}</td>
                  <td className="font-mono">{f.acoes}</td>
                  <td className="font-mono">{f.visitas}</td>
                  <td className="font-mono">{fmtDuracao(f.minutosCampo)}</td>
                  <td>
                    {f.minutosPrevistos ? (
                      <span className="flex items-center justify-end gap-2 sm:justify-start">
                        <span className="font-mono text-[13px]">
                          {fmtDuracao(f.minutosRealComPrevisto)} / {fmtDuracao(f.minutosPrevistos)}
                        </span>
                        <Selo cor={Math.abs(f.minutosRealComPrevisto / f.minutosPrevistos - 1) <= 0.15 ? "verde" : "ambar"}>
                          {Math.round((f.minutosRealComPrevisto / f.minutosPrevistos) * 100)}%
                        </Selo>
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="font-mono">{moeda(f.despesas)}</td>
                </tr>
              ))}
          </Tabela>
        )}
      </Cartao>
    </>
  );
}
