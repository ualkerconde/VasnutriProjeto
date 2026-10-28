import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BotaoAcao } from "@/components/formulario";
import { CabecalhoPagina, Cartao, Selo } from "@/components/ui";
import { exigirModulo } from "@/lib/auth/sessao";
import { db } from "@/lib/db";
import { ETAPA, ITEM_TREINAMENTO } from "@/lib/funil/regras";
import { regrasDoProcesso } from "@/lib/funil/permissoes";
import { usuariosAtivos } from "@/lib/listas";
import { excluirProcesso } from "../acoes";
import { Checklist, Historico } from "./checklist-historico";
import { Contrato } from "./contrato";
import { carregarProcesso } from "./dados";
import { Movimento } from "./movimento";
import { SecoesTecnicas } from "./tecnico";
import { TravaProcesso } from "./trava";

export const metadata: Metadata = { title: "Processo" };

export default async function DetalheProcesso({ params }: PageProps<"/funil/[id]">) {
  const usuario = await exigirModulo("FUNIL");
  const { id } = await params;

  const [processo, etapas, usuarios, motivos, tipos, itens] = await Promise.all([
    carregarProcesso(id),
    db.etapa.findMany({ orderBy: { ordem: "asc" } }),
    usuariosAtivos(),
    db.motivoRecusa.findMany({ where: { ativo: true }, orderBy: { descricao: "asc" } }),
    db.tipoDocumentacao.findMany({ where: { ativo: true }, orderBy: { nome: "asc" } }),
    db.checklistItem.findMany({ where: { ativo: true }, orderBy: [{ etapaId: "asc" }, { ordem: "asc" }] }),
  ]);
  if (!processo) notFound();

  const treinamentoRealizado = processo.checklist.some(
    (c) => c.concluido && itens.find((i) => i.id === c.itemId)?.descricao === ITEM_TREINAMENTO,
  );
  const etapa = processo.etapaAtualId;
  const regras = await regrasDoProcesso(usuario, etapa);
  const caminho = etapas.filter((e) => !e.final);

  return (
    <>
      <CabecalhoPagina
        sobretitulo={`Orçamento nº ${processo.numeroOrcamento}`}
        titulo={
          <Link href={`/clientes/${processo.clienteId}`} className="hover:text-verde">
            {processo.cliente.nomeFantasia}
          </Link>
        }
        descricao={
          <>
            Responsável: <strong>{processo.responsavel?.nome ?? "ninguém"}</strong>
            {processo.numeroContrato && regras.campos.numeroContrato.visivel && <> · Contrato {processo.numeroContrato}</>}
          </>
        }
        acoes={
          <Selo cor={etapa === ETAPA.RECUSADOS ? "vermelho" : etapa === ETAPA.VISITAS ? "verde" : "tinta"}>
            {etapa}. {processo.etapaAtual.nome}
          </Selo>
        }
      />

      <nav aria-label="Etapas do funil" className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <ol className="flex min-w-[720px] items-center gap-1">
          {caminho.map((e) => {
            const feita = etapa !== ETAPA.RECUSADOS && e.id < etapa;
            const atual = e.id === etapa;
            return (
              <li key={e.id} className="flex min-w-0 flex-1 basis-0 flex-col gap-1.5" title={e.nome}>
                <span className={`h-1.5 rounded-full ${atual ? "bg-menta" : feita ? "bg-verde" : "bg-linha"}`} />
                <span className={`truncate text-[11px] ${atual ? "font-bold text-texto" : "text-suave"}`}>
                  {e.id}. {e.nome}
                </span>
              </li>
            );
          })}
        </ol>
      </nav>

      <TravaProcesso processoId={processo.id}>
        <div className="flex flex-col gap-5 lg:flex-row lg:flex-wrap lg:items-start">
          {/* No celular as colunas se desfazem e o que mais se usa (mudar etapa, checklist) vem primeiro. */}
          <div className="contents min-w-0 flex-[999_1_560px] flex-col gap-5 lg:flex">
            <div className="flex min-w-0 flex-col gap-5 max-lg:order-3"><Contrato processo={processo} tipos={tipos} campos={regras.campos} /></div>
            <div className="flex min-w-0 flex-col gap-5 max-lg:order-4"><SecoesTecnicas processo={processo} usuarios={usuarios} podeAlterar={regras.podeAlterar} /></div>
          </div>
          <div className="contents min-w-0 flex-[1_1_340px] flex-col gap-5 lg:flex">
            <div className="flex min-w-0 flex-col gap-5 max-lg:order-1"><Movimento processo={processo} etapas={etapas} usuarios={usuarios} motivos={motivos} treinamentoRealizado={treinamentoRealizado} /></div>
            <div className="flex min-w-0 flex-col gap-5 max-lg:order-2"><Checklist processo={processo} itens={itens} etapas={etapas} /></div>
            <div className="flex min-w-0 flex-col gap-5 max-lg:order-5"><Historico processo={processo} agora={new Date().getTime()} /></div>
            {usuario.perfis.includes("Administrador") && (
              <Cartao titulo="Excluir processo" className="max-lg:order-6">
                <p className="mb-3 text-sm text-suave">Apaga o processo e tudo ligado a ele (histórico, visitas, anexos). Não dá para desfazer.</p>
                <BotaoAcao acao={excluirProcesso.bind(null, processo.id)} variante="perigo" confirmar="Excluir este processo e tudo ligado a ele?">
                  Excluir processo
                </BotaoAcao>
              </Cartao>
            )}
          </div>
        </div>
      </TravaProcesso>
    </>
  );
}
