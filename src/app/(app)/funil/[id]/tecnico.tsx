import Link from "next/link";
import { BotaoAcao, Formulario } from "@/components/formulario";
import { AreaTexto, Campo, Cartao, Grade, LinkBotao, Selecao, Selo } from "@/components/ui";
import { fmtData, fmtDataHora, hoje, paraInputData } from "@/lib/datas";
import { db } from "@/lib/db";
import { ETAPA, situacaoVisitas } from "@/lib/funil/regras";
import { opcoes } from "@/lib/listas";
import { ROTULO_STATUS_VISITA } from "@/lib/planejamento/regras";
import {
  adicionarPlano,
  ajustarCiclo,
  alternarDocumento,
  alternarPlano,
  encerrarCiclo,
  enviarArquivo,
  novaColeta,
  removerDocumento,
  removerPlano,
  solicitarDocumento,
  solicitarPlacas,
} from "./acoes-tecnicas";
import { FormArquivo, ItemArquivo } from "@/components/arquivos";
import type { ProcessoCompleto } from "./dados";

type Pessoa = { id: string; nome: string };

export async function SecoesTecnicas({
  processo,
  usuarios,
  podeAlterar,
}: {
  processo: ProcessoCompleto;
  usuarios: Pessoa[];
  podeAlterar: boolean;
}) {
  const id = processo.id;
  const [coletas, visitas, planos, documentos, arquivos, solicitacoes] = await Promise.all([
    db.coletaDados.findMany({ where: { processoId: id }, orderBy: { dataPreenchimento: "desc" }, include: { _count: { select: { setores: true } } } }),
    db.visita.findMany({ where: { processoId: id }, orderBy: { inicio: "desc" }, include: { tecnico: { select: { nome: true } }, ciclo: { select: { numero: true } } } }),
    db.planoAcao.findMany({ where: { processoId: id }, orderBy: [{ status: "asc" }, { prazo: "asc" }] }),
    db.solicitacaoDocumento.findMany({ where: { processoId: id }, orderBy: { data: "desc" } }),
    db.arquivo.findMany({ where: { processoId: id }, orderBy: { criadoEm: "desc" }, include: { enviadoPor: { select: { nome: true } } } }),
    db.solicitacaoEscritorio.findMany({ where: { processoId: id }, orderBy: { data: "desc" } }),
  ]);

  const etapa = processo.etapaAtualId;
  const ciclo = processo.ciclos.find((c) => !c.encerradoEm);
  const hojeData = hoje();
  // Só visitas finalizadas contam; as agendadas no Planejamento aparecem na lista com o status.
  const concluidas = visitas.filter((v) => v.status === "CONCLUIDA");
  const visitasDoCiclo = ciclo ? concluidas.filter((v) => v.cicloId === ciclo.id).length : 0;
  const situacao = ciclo
    ? situacaoVisitas({ inicio: ciclo.inicio, fimPrevisto: ciclo.fimPrevisto, contratadas: processo.visitasContratadas, feitas: visitasDoCiclo, hoje: hojeData })
    : null;
  const ciclosAnteriores = processo.ciclos.filter((c) => c.encerradoEm);

  return (
    <>
      <nav aria-label="Seções do processo" className="flex flex-wrap gap-2">
        {[
          ["ciclo", "Ciclo", Boolean(ciclo) || ciclosAnteriores.length > 0],
          ["coletas", `Coleta de dados (${coletas.length})`, true],
          ["visitas", `Visitas (${visitas.length})`, true],
          ["planos", `Plano de ação (${planos.length})`, true],
          ["documentos", `Documentos (${documentos.length})`, true],
          ["solicitacoes", `Solicitações (${solicitacoes.length})`, true],
          ["arquivos", `Fotos e anexos (${arquivos.length})`, true],
        ]
          .filter(([, , mostrar]) => mostrar)
          .map(([ancora, rotulo]) => (
            <a key={String(ancora)} href={`#${ancora}`} className="rounded-full border border-linha bg-superficie px-3 py-1.5 text-[13px] font-semibold text-texto-2 hover:border-verde hover:text-verde">
              {rotulo}
            </a>
          ))}
      </nav>

      {ciclo && situacao && (
        <Cartao id="ciclo" titulo={`Ciclo ${ciclo.numero} do contrato`} escuro>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(140px,1fr))] gap-4">
            <Indicador rotulo="Visitas no ciclo" valor={`${visitasDoCiclo}${processo.visitasContratadas ? ` de ${processo.visitasContratadas}` : ""}`} />
            <Indicador rotulo="Esperadas até hoje" valor={situacao.esperadas ?? "—"} />
            <Indicador rotulo="Atrasadas" valor={situacao.atrasadas} alerta={situacao.atrasadas > 0} />
            <Indicador rotulo="Fim previsto" valor={fmtData(ciclo.fimPrevisto)} alerta={Boolean(ciclo.fimPrevisto && ciclo.fimPrevisto <= hojeData)} />
          </div>
          {!processo.visitasContratadas && <p className="mt-3 text-sm text-claro-2">Informe as visitas contratadas nos dados do contrato para acompanhar atrasos.</p>}
          <details className="mt-4 rounded-xl bg-claro/5 p-3">
            <summary className="cursor-pointer text-sm font-semibold">Ajustar datas do ciclo</summary>
            <div className="mt-3 rounded-xl bg-superficie p-3 text-texto">
              <Formulario acao={ajustarCiclo.bind(null, ciclo.id)} variante="secundario">
                <Grade>
                  <Campo rotulo="Início" nome="inicio" type="date" required defaultValue={paraInputData(ciclo.inicio)} />
                  <Campo rotulo="Fim previsto" nome="fimPrevisto" type="date" defaultValue={paraInputData(ciclo.fimPrevisto)} />
                </Grade>
              </Formulario>
            </div>
          </details>
          {etapa === ETAPA.VISITAS && (
            <details className="mt-3 rounded-xl bg-claro/5 p-3">
              <summary className="cursor-pointer text-sm font-semibold text-ambar">Encerrar ciclo (fim do contrato)</summary>
              <div className="mt-3 rounded-xl bg-superficie p-3 text-texto">
                <p className="mb-3 text-sm text-suave">
                  Confirme só quando o contrato tiver terminado. O processo volta para Agendamento de diagnóstico, e um novo ciclo começa quando ele chegar de novo em Visitas técnicas.
                </p>
                <Formulario acao={encerrarCiclo.bind(null, id, ciclo.id)} botao="Confirmar fim do ciclo" variante="perigo" confirmar={`Encerrar o ciclo ${ciclo.numero} e voltar para Agendamento de diagnóstico?`}>
                  <Selecao rotulo="Responsável pelo novo diagnóstico" nome="responsavelId" defaultValue={processo.responsavelId ?? ""} vazio="Manter o atual" opcoes={opcoes(usuarios, (u) => u.nome)} />
                  <Campo rotulo="Observação (opcional)" nome="observacao" />
                </Formulario>
              </div>
            </details>
          )}
        </Cartao>
      )}

      {ciclosAnteriores.length > 0 && (
        <Cartao titulo="Ciclos anteriores" id={ciclo ? undefined : "ciclo"}>
          <ul className="flex flex-col gap-2 text-sm">
            {ciclosAnteriores.map((c) => (
              <li key={c.id} className="rounded-xl bg-fundo px-3 py-2">
                <strong>Ciclo {c.numero}</strong>: {fmtData(c.inicio)} a {fmtData(c.fimPrevisto)} · {concluidas.filter((v) => v.cicloId === c.id).length} visita(s) · encerrado em{" "}
                {fmtDataHora(c.encerradoEm)}
                {c.encerradoPor && ` por ${c.encerradoPor.nome}`}
              </li>
            ))}
          </ul>
        </Cartao>
      )}

      <Cartao
        id="coletas"
        titulo="Coleta de dados (diagnóstico)"
        acoes={
          <BotaoAcao acao={novaColeta.bind(null, id)} variante="secundario">
            Nova coleta
          </BotaoAcao>
        }
      >
        {etapa < ETAPA.AGENDAMENTO_DIAGNOSTICO && coletas.length === 0 && <p className="text-sm text-suave">A coleta é feita a partir do Agendamento de diagnóstico (etapa 7).</p>}
        {coletas.length > 0 && (
          <ul className="flex flex-col gap-2">
            {coletas.map((c) => (
              <li key={c.id}>
                <Link href={`/funil/${id}/coleta/${c.id}`} className="flex flex-wrap items-center gap-3 rounded-xl bg-fundo px-3 py-2.5 text-sm hover:text-verde">
                  <span className="font-semibold">Coleta de {fmtData(c.dataPreenchimento)}</span>
                  <span className="text-suave">{c._count.setores} setor(es)</span>
                  {c.responsavelLegalNome && <span className="text-suave">· {c.responsavelLegalNome}</span>}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Cartao>

      <Cartao
        id="visitas"
        titulo="Visitas técnicas"
        acoes={
          podeAlterar && (
            <LinkBotao href={`/funil/${id}/visita/nova`} variante="secundario" pequeno>
              Registrar visita
            </LinkBotao>
          )
        }
      >
        {visitas.length === 0 ? (
          <p className="text-sm text-suave">Nenhuma visita registrada.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {visitas.map((v) => (
              <li key={v.id}>
                <Link href={`/funil/${id}/visita/${v.id}`} className="flex flex-col gap-1 rounded-xl bg-fundo px-3 py-2.5 text-sm hover:text-verde">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold">{fmtDataHora(v.inicio)}</span>
                    {v.fim && <span className="text-suave">{Math.round((v.fim.getTime() - v.inicio.getTime()) / 60000)} min</span>}
                    {v.tecnico && <span className="text-suave">· {v.tecnico.nome}</span>}
                    {v.status !== "CONCLUIDA" && <Selo cor={v.status === "EM_ANDAMENTO" ? "ambar" : "cinza"}>{ROTULO_STATUS_VISITA[v.status]}</Selo>}
                    {v.ciclo && <Selo>Ciclo {v.ciclo.numero}</Selo>}
                    {v.teveInconformidade && <Selo cor="ambar">Inconformidades</Selo>}
                  </span>
                  {v.realizado && <span className="line-clamp-2 text-texto-2">{v.realizado}</span>}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Cartao>

      <Cartao id="planos" titulo="Plano de ação">
        {planos.length > 0 && (
          <ul className="mb-4 flex flex-col gap-2">
            {planos.map((p) => {
              const vencido = p.status === "ABERTO" && p.prazo && p.prazo < hojeData;
              return (
                <li key={p.id} className="flex items-start gap-3 rounded-xl bg-fundo px-3 py-2.5">
                  <BotaoAcao acao={alternarPlano.bind(null, p.id)} variante={p.status === "CONCLUIDO" ? "menta" : "secundario"} rotulo={p.status === "CONCLUIDO" ? "Reabrir ação" : "Concluir ação"}>
                    {p.status === "CONCLUIDO" ? "✓" : "○"}
                  </BotaoAcao>
                  <span className="min-w-0 flex-1 text-sm">
                    <span className={p.status === "CONCLUIDO" ? "text-suave line-through" : "font-medium"}>{p.descricao}</span>
                    <span className="mt-0.5 flex flex-wrap gap-2 text-xs text-suave">
                      <span>{fmtData(p.data)}</span>
                      {p.prazo && <span className={vencido ? "font-semibold text-[#9A2B12]" : ""}>prazo {fmtData(p.prazo)}</span>}
                      {p.origem && <span>· {p.origem}</span>}
                    </span>
                  </span>
                  <BotaoAcao acao={removerPlano.bind(null, p.id)} variante="fantasma" rotulo="Remover ação" confirmar="Remover esta ação?">
                    ✕
                  </BotaoAcao>
                </li>
              );
            })}
          </ul>
        )}
        <details className="rounded-xl border border-dashed border-linha p-3" open={planos.length === 0}>
          <summary className="cursor-pointer text-sm font-semibold">Nova ação</summary>
          <div className="mt-3">
            <Formulario acao={adicionarPlano.bind(null, id)} botao="Adicionar ação" variante="secundario" limparAoSalvar>
              <AreaTexto rotulo="Ação" nome="descricao" required rows={2} />
              <Grade colunas={3}>
                <Campo rotulo="Data" nome="data" type="date" defaultValue={paraInputData(hojeData)} />
                <Campo rotulo="Prazo" nome="prazo" type="date" />
                <Campo rotulo="Origem" nome="origem" placeholder="Ex.: visita, auditoria" />
              </Grade>
              {visitas.length > 0 && (
                <Selecao rotulo="Visita relacionada" nome="visitaId" vazio="Nenhuma" opcoes={visitas.map((v) => ({ valor: v.id, rotulo: fmtDataHora(v.inicio) }))} />
              )}
            </Formulario>
          </div>
        </details>
      </Cartao>

      <Cartao id="documentos" titulo="Pedidos de documento">
        {documentos.length > 0 && (
          <ul className="mb-4 flex flex-col gap-2">
            {documentos.map((d) => (
              <li key={d.id} className="flex items-center gap-3 rounded-xl bg-fundo px-3 py-2.5">
                <BotaoAcao acao={alternarDocumento.bind(null, d.id)} variante={d.realizadoEm ? "menta" : "secundario"} rotulo={d.realizadoEm ? "Marcar como pendente" : "Marcar como feito"}>
                  {d.realizadoEm ? "✓" : "○"}
                </BotaoAcao>
                <span className="min-w-0 flex-1 text-sm">
                  <span className="font-medium">{d.tipoDocumento}</span>
                  <span className="block text-xs text-suave">
                    Pedido em {fmtData(d.data)}
                    {d.realizadoEm && ` · feito em ${fmtData(d.realizadoEm)}`}
                  </span>
                </span>
                <BotaoAcao acao={removerDocumento.bind(null, d.id)} variante="fantasma" rotulo="Remover pedido" confirmar="Remover este pedido?">
                  ✕
                </BotaoAcao>
              </li>
            ))}
          </ul>
        )}
        <Formulario acao={solicitarDocumento.bind(null, id)} botao="Registrar pedido" variante="secundario" limparAoSalvar>
          <Grade>
            <Campo rotulo="Qual documento?" nome="tipoDocumento" required list="tipos-documento" placeholder="Ficha técnica, informação nutricional…" />
            <Campo rotulo="Data do pedido" nome="data" type="date" defaultValue={paraInputData(hojeData)} />
          </Grade>
          <datalist id="tipos-documento">
            <option value="Ficha técnica" />
            <option value="Informação nutricional" />
            <option value="Cardápio" />
          </datalist>
        </Formulario>
      </Cartao>

      <Cartao id="solicitacoes" titulo="Solicitações ao escritório">
        {solicitacoes.length > 0 && (
          <ul className="mb-4 flex flex-col gap-2">
            {solicitacoes.map((s) => (
              <li key={s.id}>
                <Link href={`/solicitacoes/${s.id}`} className="flex flex-wrap items-center gap-2 rounded-xl bg-fundo px-3 py-2.5 text-sm hover:text-verde">
                  <span className="font-semibold">{s.servico}</span>
                  <span className="text-suave">{fmtData(s.data)}</span>
                  <Selo cor={s.status === "CONCLUIDO" ? "verde" : "ambar"}>{s.status === "CONCLUIDO" ? "Concluída" : "Em aberto"}</Selo>
                </Link>
              </li>
            ))}
          </ul>
        )}
        <details className="rounded-xl border border-dashed border-linha p-3">
          <summary className="cursor-pointer text-sm font-semibold">Solicitar placas</summary>
          <div className="mt-3">
            <Formulario acao={solicitarPlacas.bind(null, id)} botao="Enviar ao escritório" variante="secundario" limparAoSalvar>
              <Grade>
                <Campo rotulo="Qual placa?" nome="placa" required />
                <Campo rotulo="Quantidade" nome="quantidade" type="number" min={1} />
                <Campo rotulo="Para quais setores?" nome="setores" />
                <Campo rotulo="Prazo" nome="prazo" type="date" />
                <Selecao rotulo="Responsável no escritório" nome="responsavelId" vazio="—" opcoes={opcoes(usuarios, (u) => u.nome)} />
              </Grade>
              <Campo rotulo="Observações" nome="observacoes" />
            </Formulario>
          </div>
        </details>
      </Cartao>

      <Cartao id="arquivos" titulo="Fotos e anexos">
        {arquivos.length > 0 && (
          <ul className="mb-4 grid gap-2 [grid-template-columns:repeat(auto-fill,minmax(min(260px,100%),1fr))]">
            {arquivos.map((a) => (
              <ItemArquivo key={a.id} arquivo={a} hoje={hojeData} />
            ))}
          </ul>
        )}
        <FormArquivo acao={enviarArquivo.bind(null, { processoId: id })} />
      </Cartao>
    </>
  );
}

function Indicador({ rotulo, valor, alerta = false }: { rotulo: string; valor: string | number; alerta?: boolean }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-claro-2">{rotulo}</span>
      <span className={`font-display text-3xl font-extrabold tracking-tight ${alerta ? "text-ambar" : ""}`}>{valor}</span>
    </div>
  );
}
