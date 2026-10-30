import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BotaoAcao, Formulario } from "@/components/formulario";
import { GradeKpis } from "@/components/graficos";
import { CabecalhoPagina, Campo, Cartao, EstadoVazio, Grade, Selo } from "@/components/ui";
import { exigirModulo } from "@/lib/auth/sessao";
import { fmtData, fmtMoeda, hoje, paraInputData } from "@/lib/datas";
import { db } from "@/lib/db";
import { totaisPorContrato } from "@/lib/financeiro/painel";
import { COR_SITUACAO, mesesEntre, planoDeParcelas, ROTULO_SITUACAO, situacaoParcela, vencimentoNoMes } from "@/lib/financeiro/regras";
import { alternarCancelamento, anexarNf, estornarParcela, excluirParcela, gerarParcelas, receberParcela, removerNf, salvarParcela } from "../../acoes";

export const metadata: Metadata = { title: "Contas a receber" };

const fmtCompetencia = new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC", month: "short", year: "numeric" });

export default async function ContratoFinanceiro({ params }: PageProps<"/financeiro/contrato/[id]">) {
  await exigirModulo("FINANCEIRO");
  const { id } = await params;
  const [processo, totais] = await Promise.all([
    db.processo.findUnique({
      where: { id },
      include: {
        cliente: { select: { id: true, nomeFantasia: true } },
        etapaAtual: { select: { nome: true } },
        parcelas: {
          orderBy: { vencimento: "asc" },
          include: { arquivos: { orderBy: { criadoEm: "asc" }, select: { id: true, descricao: true } }, baixadoPor: { select: { nome: true } } },
        },
      },
    }),
    totaisPorContrato([id]),
  ]);
  if (!processo) notFound();
  const t = totais.get(id) ?? { total: 0, recebido: 0, aberto: 0, vencido: 0, parcelas: 0 };
  const hojeData = hoje();

  // Sugestão para gerar: continua depois da última parcela, ou começa na assinatura.
  const ultima = processo.parcelas.at(-1);
  const dia = processo.diaVencimento ?? (processo.dataAssinatura ?? hojeData).getUTCDate();
  const base = ultima ? vencimentoNoMes(ultima.vencimento.getUTCFullYear(), ultima.vencimento.getUTCMonth() + 1, dia) : (processo.dataAssinatura ?? hojeData);
  const primeiro = planoDeParcelas({ inicio: base, diaVencimento: dia, quantidade: 1 })[0]?.vencimento ?? base;
  const restantes = processo.validadeContrato && processo.validadeContrato > primeiro ? mesesEntre(primeiro, processo.validadeContrato) + 1 : 12;

  return (
    <>
      <CabecalhoPagina
        sobretitulo={processo.numeroContrato ? `Contrato ${processo.numeroContrato}` : `Orçamento nº ${processo.numeroOrcamento}`}
        titulo={processo.cliente.nomeFantasia}
        descricao={
          <>
            Valor mensal <strong>{fmtMoeda(processo.valorMensal)}</strong> · vencimento dia {processo.diaVencimento ?? "—"} · contrato até{" "}
            <strong>{fmtData(processo.validadeContrato)}</strong> · {processo.etapaAtual.nome}
          </>
        }
        acoes={
          <>
            <Link href={`/funil/${processo.id}`} className="min-h-11 content-center rounded-xl px-3 text-sm font-semibold text-verde hover:bg-[#E6EEE9]">
              Abrir processo
            </Link>
            <Link href={`/indicadores/cliente/${processo.cliente.id}`} className="min-h-11 content-center rounded-xl px-3 text-sm font-semibold text-verde hover:bg-[#E6EEE9]">
              Painel do cliente
            </Link>
          </>
        }
      />

      <GradeKpis
        min={230}
        itens={[
          { rotulo: "Total do contrato", valor: fmtMoeda(t.total), nota: `${t.parcelas} parcela(s)`, escuro: true },
          { rotulo: "Recebido", valor: fmtMoeda(t.recebido) },
          { rotulo: "A receber", valor: fmtMoeda(t.aberto - t.vencido) },
          { rotulo: "Vencido", valor: fmtMoeda(t.vencido), alerta: t.vencido > 0, selo: t.vencido > 0 ? "ATRASO" : undefined },
        ]}
      />

      <Cartao titulo="Parcelas">
        {processo.parcelas.length === 0 ? (
          <EstadoVazio>Nenhuma parcela ainda. Gere as parcelas mensais abaixo.</EstadoVazio>
        ) : (
          <ul className="flex flex-col gap-2">
            {processo.parcelas.map((p) => {
              const sit = situacaoParcela(p, hojeData);
              return (
                <li key={p.id} className="rounded-xl bg-fundo px-3 py-2">
                  <details>
                    <summary className="flex min-h-11 cursor-pointer list-none flex-wrap items-center gap-x-4 gap-y-1">
                      <span className="w-20 font-mono text-xs text-suave uppercase">{fmtCompetencia.format(p.competencia).replace(" de ", "/").replace(".", "")}</span>
                      <span className="text-sm">Vence {fmtData(p.vencimento)}</span>
                      <span className={`font-mono text-sm font-semibold ${p.cancelada ? "text-suave line-through" : ""}`}>{fmtMoeda(p.valor)}</span>
                      <Selo cor={COR_SITUACAO[sit]}>{ROTULO_SITUACAO[sit]}</Selo>
                      {p.recebidoEm && <span className="text-xs text-suave">em {fmtData(p.recebidoEm)}{p.baixadoPor && ` · ${p.baixadoPor.nome}`}</span>}
                      {(p.numeroNf || p.arquivos.length > 0) && <Selo cor="tinta">NF {p.numeroNf ?? ""}</Selo>}
                      <span className="ml-auto text-xs font-semibold text-verde">Detalhes</span>
                    </summary>
                    <div className="mt-3 grid gap-5 border-t border-linha pt-3 [grid-template-columns:repeat(auto-fit,minmax(min(300px,100%),1fr))]">
                      <div className="flex flex-col gap-4">
                        {!p.recebidoEm && !p.cancelada ? (
                          <Formulario acao={receberParcela.bind(null, p.id)} botao="Registrar recebimento" variante="menta">
                            <Grade>
                              <Campo rotulo="Recebido em" nome="recebidoEm" type="date" defaultValue={paraInputData(hojeData)} />
                              <Campo rotulo="Valor recebido (R$)" nome="valorRecebido" inputMode="decimal" defaultValue={Number(p.valor).toLocaleString("pt-BR", { minimumFractionDigits: 2 })} />
                            </Grade>
                            <Grade>
                              <Campo rotulo="Nº da NF" nome="numeroNf" defaultValue={p.numeroNf ?? ""} />
                              <Campo rotulo="Arquivo da NF" nome="nf" type="file" accept="application/pdf,image/*,.xml" className="[&_input]:py-2" />
                            </Grade>
                          </Formulario>
                        ) : (
                          p.recebidoEm && (
                            <div className="flex flex-wrap items-center gap-3 text-sm">
                              Recebido {fmtMoeda(p.valorRecebido ?? p.valor)} em {fmtData(p.recebidoEm)}.
                              <BotaoAcao acao={estornarParcela.bind(null, p.id)} confirmar="Desfazer este recebimento?">
                                Desfazer recebimento
                              </BotaoAcao>
                            </div>
                          )
                        )}
                        <div className="flex flex-col gap-2">
                          <span className="text-[13px] font-semibold text-texto-2">Notas fiscais</span>
                          {p.arquivos.length > 0 && (
                            <ul className="flex flex-col gap-1.5">
                              {p.arquivos.map((a) => (
                                <li key={a.id} className="flex items-center justify-between gap-2 rounded-lg bg-superficie px-3 py-1.5 text-sm">
                                  <a href={`/arquivos/${a.id}`} target="_blank" rel="noopener" className="truncate font-semibold hover:text-verde">
                                    {a.descricao ?? "Nota fiscal"}
                                  </a>
                                  <BotaoAcao acao={removerNf.bind(null, a.id)} variante="fantasma" rotulo="Remover NF" confirmar="Remover este arquivo?">
                                    ✕
                                  </BotaoAcao>
                                </li>
                              ))}
                            </ul>
                          )}
                          <Formulario acao={anexarNf.bind(null, p.id)} botao="Anexar NF" variante="secundario" limparAoSalvar>
                            <Grade>
                              <Campo rotulo="Arquivo" nome="nf" type="file" required accept="application/pdf,image/*,.xml" className="[&_input]:py-2" />
                              <Campo rotulo="Nº da NF" nome="numeroNf" defaultValue={p.numeroNf ?? ""} />
                            </Grade>
                          </Formulario>
                        </div>
                      </div>
                      <div className="flex flex-col gap-4">
                        <Formulario acao={salvarParcela.bind(null, p.id)} botao="Salvar parcela" variante="secundario">
                          <Grade>
                            <Campo rotulo="Vencimento" nome="vencimento" type="date" required defaultValue={paraInputData(p.vencimento)} />
                            <Campo rotulo="Valor (R$)" nome="valor" inputMode="decimal" required defaultValue={Number(p.valor).toLocaleString("pt-BR", { minimumFractionDigits: 2 })} />
                            {p.recebidoEm && (
                              <>
                                <Campo rotulo="Recebido em" nome="recebidoEm" type="date" defaultValue={paraInputData(p.recebidoEm)} />
                                <Campo
                                  rotulo="Valor recebido (R$)"
                                  nome="valorRecebido"
                                  inputMode="decimal"
                                  defaultValue={Number(p.valorRecebido ?? p.valor).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                                />
                              </>
                            )}
                            <Campo rotulo="Nº da NF" nome="numeroNf" defaultValue={p.numeroNf ?? ""} />
                          </Grade>
                          <Campo rotulo="Observação" nome="observacao" defaultValue={p.observacao ?? ""} />
                        </Formulario>
                        <div className="flex flex-wrap gap-2">
                          <BotaoAcao acao={alternarCancelamento.bind(null, p.id)}>{p.cancelada ? "Reativar parcela" : "Cancelar parcela"}</BotaoAcao>
                          <BotaoAcao acao={excluirParcela.bind(null, p.id)} variante="perigo" confirmar="Excluir esta parcela de vez?">
                            Excluir
                          </BotaoAcao>
                        </div>
                      </div>
                    </div>
                  </details>
                </li>
              );
            })}
          </ul>
        )}
      </Cartao>

      <Cartao titulo="Gerar parcelas mensais" className="max-w-3xl">
        <p className="mb-4 text-sm text-suave">
          Cria uma parcela por mês a partir do primeiro vencimento. Meses que já têm parcela são mantidos como estão.
        </p>
        <Formulario acao={gerarParcelas.bind(null, processo.id)} botao="Gerar parcelas">
          <Grade colunas={3}>
            <Campo rotulo="Primeiro vencimento" nome="primeiroVencimento" type="date" required defaultValue={paraInputData(primeiro)} />
            <Campo rotulo="Quantidade de meses" nome="quantidade" type="number" min={1} max={60} required defaultValue={Math.max(1, restantes)} />
            <Campo
              rotulo="Valor da parcela (R$)"
              nome="valor"
              inputMode="decimal"
              required
              defaultValue={processo.valorMensal ? Number(processo.valorMensal).toLocaleString("pt-BR", { minimumFractionDigits: 2 }) : ""}
            />
          </Grade>
        </Formulario>
      </Cartao>
    </>
  );
}
