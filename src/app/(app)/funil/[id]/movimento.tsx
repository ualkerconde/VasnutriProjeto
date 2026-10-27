import Link from "next/link";
import { BotaoAcao, Formulario } from "@/components/formulario";
import { AreaTexto, Aviso, Campo, Cartao, Dados, Selecao, Selo } from "@/components/ui";
import { fmtData } from "@/lib/datas";
import { acoesOrcamento, bloqueioAvanco, ETAPA, etapasDeRetorno, ROTULO_STATUS } from "@/lib/funil/regras";
import { opcoes } from "@/lib/listas";
import { aprovarOrcamento, avancarEtapa, enviarOrcamento, recuperarOrcamento, recusarOrcamento, retornarEtapa } from "../acoes";
import type { ProcessoCompleto } from "./dados";

type Pessoa = { id: string; nome: string };

/** Orçamento e movimentação entre etapas. */
export function Movimento({
  processo,
  etapas,
  usuarios,
  motivos,
  treinamentoRealizado,
}: {
  processo: ProcessoCompleto;
  etapas: { id: number; nome: string }[];
  usuarios: Pessoa[];
  motivos: { id: string; descricao: string }[];
  treinamentoRealizado: boolean;
}) {
  const etapa = processo.etapaAtualId;
  const proxima = etapas.find((e) => e.id === etapa + 1);
  const bloqueio = bloqueioAvanco({ etapa, statusOrcamento: processo.statusOrcamento, treinamentoRealizado });
  const retornos = etapasDeRetorno(etapa);
  const orc = acoesOrcamento(etapa, processo.statusOrcamento);
  const nomeEtapa = (id: number) => etapas.find((e) => e.id === id)?.nome ?? `Etapa ${id}`;
  const responsavelPadrao = processo.responsavelId ?? "";

  return (
    <>
      <Cartao
        titulo="Orçamento"
        acoes={
          <Selo cor={processo.statusOrcamento === "APROVADO" ? "verde" : processo.statusOrcamento === "RECUSADO" ? "vermelho" : "ambar"}>
            {ROTULO_STATUS[processo.statusOrcamento]}
          </Selo>
        }
      >
        <Dados
          itens={[
            ["Nº do orçamento", <span key="n" className="font-mono">{processo.numeroOrcamento}</span>],
            ["Enviado em", fmtData(processo.dataEnvioOrcamento)],
            ["Aprovado em", fmtData(processo.dataAprovacao)],
            ...(processo.motivoRecusa ? ([["Motivo da recusa", processo.motivoRecusa.descricao]] as [string, string][]) : []),
          ]}
        />
        {(orc.enviar || orc.aprovar || orc.recuperar) && (
          <div className="mt-4 flex flex-wrap gap-2">
            {orc.enviar && (
              <BotaoAcao acao={enviarOrcamento.bind(null, processo.id)} pequeno={false}>
                Marcar como enviado
              </BotaoAcao>
            )}
            {orc.aprovar && (
              <BotaoAcao acao={aprovarOrcamento.bind(null, processo.id)} variante="menta" pequeno={false} confirmar="Confirmar que o cliente aprovou o orçamento?">
                Orçamento aprovado
              </BotaoAcao>
            )}
            {orc.recuperar && (
              <BotaoAcao acao={recuperarOrcamento.bind(null, processo.id)} variante="menta" pequeno={false} confirmar="Voltar este orçamento para o Comercial?">
                Recuperar orçamento
              </BotaoAcao>
            )}
          </div>
        )}
        {orc.recusar && (
          <details className="mt-4 rounded-xl bg-fundo p-3">
            <summary className="cursor-pointer text-sm font-semibold text-[#9A2B12]">Orçamento recusado pelo cliente</summary>
            <div className="mt-3">
              {motivos.length === 0 ? (
                <p className="text-sm text-suave">
                  Cadastre os motivos de recusa em{" "}
                  <Link href="/cadastros#motivos" className="font-semibold">
                    Cadastros
                  </Link>{" "}
                  primeiro.
                </p>
              ) : (
                <Formulario acao={recusarOrcamento.bind(null, processo.id)} botao="Registrar recusa" variante="perigo" confirmar="O processo vai para Orçamentos recusados. Confirmar?">
                  <Selecao rotulo="Motivo" nome="motivoRecusaId" required vazio="Escolha" opcoes={opcoes(motivos, (m) => m.descricao)} />
                  <Campo rotulo="Detalhe (opcional)" nome="detalhe" />
                </Formulario>
              )}
            </div>
          </details>
        )}
      </Cartao>

      <Cartao titulo="Mudar de etapa">
        {proxima && etapa !== ETAPA.RECUSADOS && (
          <div className="mb-5">
            <h3 className="mb-2 text-sm font-bold">
              Enviar para <span className="text-verde">{proxima.nome}</span>
            </h3>
            {bloqueio ? (
              <Aviso>{bloqueio}</Aviso>
            ) : (
              <Formulario acao={avancarEtapa.bind(null, processo.id)} botao={`Enviar para ${proxima.nome}`} variante="menta">
                <Selecao rotulo="Responsável na próxima etapa" nome="responsavelId" required defaultValue={responsavelPadrao} vazio="Escolha" opcoes={opcoes(usuarios, (u) => u.nome)} />
                <Campo rotulo="Observação (opcional)" nome="motivo" />
              </Formulario>
            )}
          </div>
        )}
        {etapa === ETAPA.VISITAS && <Aviso cor="verde">Em Visitas técnicas. No fim do contrato, encerre o ciclo no quadro do ciclo.</Aviso>}

        {retornos.length > 0 && (
          <details className="rounded-xl bg-fundo p-3">
            <summary className="cursor-pointer text-sm font-semibold">Retornar para uma etapa anterior</summary>
            <div className="mt-3">
              <Formulario acao={retornarEtapa.bind(null, processo.id)} botao="Retornar" variante="secundario">
                <Selecao
                  rotulo="Voltar para"
                  nome="etapa"
                  required
                  defaultValue={retornos.at(-1)}
                  opcoes={retornos.map((id) => ({ valor: id, rotulo: `${id}. ${nomeEtapa(id)}` }))}
                />
                <Selecao rotulo="Responsável" nome="responsavelId" required defaultValue={responsavelPadrao} vazio="Escolha" opcoes={opcoes(usuarios, (u) => u.nome)} />
                <AreaTexto rotulo="Motivo" nome="motivo" required rows={2} />
              </Formulario>
            </div>
          </details>
        )}
      </Cartao>
    </>
  );
}
