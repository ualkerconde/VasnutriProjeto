"use client";

import Link from "next/link";
import { useCallback, useEffect, useOptimistic, useRef, useState, useTransition, type ReactNode } from "react";
import { BotaoAcao, Formulario } from "@/components/formulario";
import { AreaTexto, Campo, Caixa, classeBotao, Grade, Selecao, Selo } from "@/components/ui";
import type { StatusVisita } from "@/generated/prisma/enums";
import { proximasAcoes, ROTULO_STATUS_VISITA, type PermissoesCartao } from "@/lib/planejamento/regras";
import { agendarVisita, cancelarVisita, finalizarVisita, iniciarVisita, moverVisita, moverVisitaForm } from "./acoes";

export type CartaoVisita = {
  id: string;
  processoId: string;
  cliente: string;
  local: string;
  tecnicoId: string | null;
  status: StatusVisita;
  inicio: string;
  inicioInput: string;
  fim: string | null;
  dia: string;
  resumo: string | null;
  itensChecklist: number;
  fotos: number;
  atrasada: boolean;
};

type Pessoa = { id: string; nome: string };
type Opcao = { valor: string; rotulo: string };

const SEM_CONSULTOR = "";
const fuso = "America/Sao_Paulo";
const fmtHora = new Intl.DateTimeFormat("pt-BR", { timeZone: fuso, hour: "2-digit", minute: "2-digit" });
const fmtDia = new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC", weekday: "short", day: "2-digit", month: "2-digit" });
const COR_STATUS = { AGENDADA: "cinza", EM_ANDAMENTO: "ambar", CONCLUIDA: "verde" } as const;

type Janela =
  | { tipo: "agendar"; tecnicoId: string }
  | { tipo: "mover"; cartao: CartaoVisita }
  | { tipo: "finalizar"; cartao: CartaoVisita }
  | null;

/**
 * Quadro estilo Trello: uma coluna por consultor (mais "A distribuir").
 * No computador o cartão é arrastado entre colunas; no celular, o botão Mover faz o mesmo.
 */
export function QuadroPlanejamento({
  cartoes,
  colunas,
  mostrarSemConsultor,
  pode,
  usuarioId,
  consultores,
  processos,
  checklist,
  sugestaoInicio,
}: {
  cartoes: CartaoVisita[];
  colunas: Pessoa[];
  mostrarSemConsultor: boolean;
  pode: PermissoesCartao;
  usuarioId: string;
  consultores: Pessoa[];
  processos: Opcao[];
  checklist: { id: string; descricao: string }[];
  sugestaoInicio: string;
}) {
  const [lista, moverOtimista] = useOptimistic(cartoes, (atual, m: { id: string; tecnicoId: string | null }) =>
    atual.map((c) => (c.id === m.id ? { ...c, tecnicoId: m.tecnicoId } : c)),
  );
  const [, iniciarTransicao] = useTransition();
  const [arrastando, setArrastando] = useState<string | null>(null);
  const [alvo, setAlvo] = useState<string | null>(null);
  const [janela, setJanela] = useState<Janela>(null);
  const fechar = useCallback(() => setJanela(null), []);

  const todasColunas = [...(mostrarSemConsultor ? [{ id: SEM_CONSULTOR, nome: "A distribuir" }] : []), ...colunas];

  function soltar(tecnicoId: string) {
    const id = arrastando;
    setArrastando(null);
    setAlvo(null);
    if (!id) return;
    const cartao = lista.find((c) => c.id === id);
    if (!cartao || (cartao.tecnicoId ?? SEM_CONSULTOR) === tecnicoId) return;
    iniciarTransicao(async () => {
      moverOtimista({ id, tecnicoId: tecnicoId || null });
      const r = await moverVisita(id, tecnicoId || null);
      if (r.erro) window.alert(r.erro);
    });
  }

  return (
    <>
      {/* No celular: atalhos para cada coluna, como no funil. */}
      <nav aria-label="Ir para o consultor" className="-mx-4 flex gap-2 overflow-x-auto px-4 sm:hidden">
        {todasColunas.map((col) => (
          <a
            key={col.id || "sem"}
            href={`#consultor-${col.id || "sem"}`}
            className="flex flex-none items-center gap-1.5 rounded-full border border-linha bg-superficie px-3 py-1.5 text-[13px] font-semibold text-texto-2"
          >
            <span className="max-w-[140px] truncate">{col.nome}</span>
            <span className="rounded-full bg-linha-suave px-1.5 font-mono text-[11px] text-suave">
              {lista.filter((c) => (c.tecnicoId ?? SEM_CONSULTOR) === col.id).length}
            </span>
          </a>
        ))}
      </nav>

      <div className="-mx-4 snap-x snap-mandatory scroll-px-4 overflow-x-auto px-4 pb-2 sm:-mx-[clamp(16px,3vw,40px)] sm:snap-none sm:px-[clamp(16px,3vw,40px)]">
        <ol className="flex items-start gap-3">
          {todasColunas.map((col) => {
            const doConsultor = lista.filter((c) => (c.tecnicoId ?? SEM_CONSULTOR) === col.id);
            const destacada = alvo === col.id && arrastando !== null;
            return (
              <li
                key={col.id || "sem"}
                id={`consultor-${col.id || "sem"}`}
                onDragOver={(e) => {
                  if (!arrastando) return;
                  e.preventDefault();
                  e.dataTransfer.dropEffect = "move";
                  if (alvo !== col.id) setAlvo(col.id);
                }}
                onDragLeave={(e) => {
                  if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setAlvo(null);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  soltar(col.id);
                }}
                className={`flex min-h-40 w-[82vw] max-w-[310px] flex-none snap-start scroll-mt-20 flex-col gap-2 rounded-[18px] p-2.5 transition-colors sm:w-[290px] ${
                  destacada ? "bg-[#D7F3E4] outline-2 outline-menta outline-dashed" : col.id === SEM_CONSULTOR ? "bg-[#F6EFDF]" : "bg-linha-suave"
                }`}
              >
                <div className="flex items-center justify-between gap-2 px-1.5 pt-1">
                  <h2 className="flex min-w-0 items-center gap-2 text-[13px] leading-tight font-bold">
                    {col.id !== SEM_CONSULTOR && (
                      <span className="flex size-6 flex-none items-center justify-center rounded-full bg-tinta text-[11px] font-bold text-menta">
                        {col.nome.slice(0, 1).toUpperCase()}
                      </span>
                    )}
                    <span className="truncate">{col.nome}</span>
                    {col.id === usuarioId && <span className="font-normal text-suave">(você)</span>}
                  </h2>
                  <span className="flex items-center gap-1">
                    <span className="rounded-full bg-superficie px-2 py-0.5 font-mono text-xs">{doConsultor.length}</span>
                    {pode.criar && (
                      <button
                        type="button"
                        onClick={() => setJanela({ tipo: "agendar", tecnicoId: col.id })}
                        aria-label={`Agendar visita para ${col.nome}`}
                        title="Agendar visita"
                        className="flex size-8 cursor-pointer items-center justify-center rounded-lg text-lg font-bold text-verde hover:bg-superficie"
                      >
                        +
                      </button>
                    )}
                  </span>
                </div>

                {doConsultor.length === 0 && (
                  <p className="px-1.5 py-3 text-xs text-suave">{arrastando ? "Solte aqui" : "Nenhuma visita nesta semana"}</p>
                )}
                {doConsultor.map((c, i) => (
                  <div key={c.id} className="flex flex-col gap-2">
                    {doConsultor[i - 1]?.dia !== c.dia && (
                      <span className="px-1.5 pt-1 font-mono text-[11px] tracking-[0.06em] text-suave uppercase">
                        {fmtDia.format(new Date(`${c.dia}T00:00:00Z`))}
                      </span>
                    )}
                    <Cartao
                      cartao={c}
                      pode={pode}
                      arrastando={arrastando === c.id}
                      aoArrastar={(ativo) => setArrastando(ativo ? c.id : null)}
                      aoMover={() => setJanela({ tipo: "mover", cartao: c })}
                      aoFinalizar={() => setJanela({ tipo: "finalizar", cartao: c })}
                    />
                  </div>
                ))}
              </li>
            );
          })}
        </ol>
      </div>

      {janela?.tipo === "agendar" && (
        <JanelaModal titulo="Agendar visita" aoFechar={fechar}>
          <Formulario acao={agendarVisita} botao="Agendar" aoSalvar={fechar}>
            <Selecao rotulo="Cliente" nome="processoId" required vazio="Escolha o cliente" opcoes={processos} />
            <Grade>
              <Selecao
                rotulo="Consultor"
                nome="tecnicoId"
                defaultValue={janela.tecnicoId}
                vazio="A distribuir"
                opcoes={consultores.map((p) => ({ valor: p.id, rotulo: p.nome }))}
              />
              <Campo rotulo="Dia e hora" nome="inicio" type="datetime-local" required defaultValue={sugestaoInicio} />
            </Grade>
            <AreaTexto rotulo="Observação (opcional)" nome="observacao" rows={2} placeholder="Ex.: levar pasta de visita" />
          </Formulario>
        </JanelaModal>
      )}

      {janela?.tipo === "mover" && (
        <JanelaModal titulo={`Mover: ${janela.cartao.cliente}`} aoFechar={fechar}>
          <Formulario acao={moverVisitaForm.bind(null, janela.cartao.id)} botao="Mover cartão" aoSalvar={fechar}>
            <Selecao
              rotulo="Para o consultor"
              nome="tecnicoId"
              defaultValue={janela.cartao.tecnicoId ?? ""}
              vazio="A distribuir"
              opcoes={consultores.map((p) => ({ valor: p.id, rotulo: p.nome }))}
            />
            {janela.cartao.status === "AGENDADA" && (
              <Campo rotulo="Dia e hora" nome="inicio" type="datetime-local" required defaultValue={janela.cartao.inicioInput} />
            )}
          </Formulario>
          {pode.criar && proximasAcoes(janela.cartao.status).cancelar && (
            <div className="border-t border-linha pt-4">
              <Formulario
                acao={cancelarVisita.bind(null, janela.cartao.id)}
                botao="Cancelar agendamento"
                variante="perigo"
                confirmar="Cancelar este agendamento?"
                aoSalvar={fechar}
              />
            </div>
          )}
        </JanelaModal>
      )}

      {janela?.tipo === "finalizar" && (
        <JanelaModal titulo={`Finalizar: ${janela.cartao.cliente}`} aoFechar={fechar}>
          <Formulario acao={finalizarVisita.bind(null, janela.cartao.id)} botao="Finalizar visita" variante="menta" aoSalvar={fechar}>
            <AreaTexto rotulo="Resumo da visita" nome="realizado" required rows={4} defaultValue={janela.cartao.resumo ?? ""} placeholder="O que foi feito e combinado" />
            {checklist.length > 0 && (
              <fieldset className="flex flex-col rounded-xl bg-fundo px-3 py-1">
                <legend className="sr-only">Checklist</legend>
                <span className="pt-2 text-[13px] font-semibold text-texto-2">Checklist</span>
                {checklist.map((item) => (
                  <Caixa key={item.id} rotulo={item.descricao} nome="checklist" value={item.id} />
                ))}
              </fieldset>
            )}
            <Campo rotulo="Fotos (até 15 MB cada)" nome="fotos" type="file" accept="image/*" multiple className="[&_input]:py-2" />
            <Campo rotulo="Quem recebeu" nome="recebidoPor" />
            <AreaTexto rotulo="Inconformidades (se houver)" nome="inconformidades" rows={3} ajuda="Deixe em branco se não houve. Depois, crie as ações no plano de ação do processo." />
          </Formulario>
        </JanelaModal>
      )}
    </>
  );
}

function Cartao({
  cartao: c,
  pode,
  arrastando,
  aoArrastar,
  aoMover,
  aoFinalizar,
}: {
  cartao: CartaoVisita;
  pode: PermissoesCartao;
  arrastando: boolean;
  aoArrastar: (ativo: boolean) => void;
  aoMover: () => void;
  aoFinalizar: () => void;
}) {
  const acoes = proximasAcoes(c.status);
  const arrastavel = pode.mover && acoes.mover;
  const duracao = c.fim ? Math.round((new Date(c.fim).getTime() - new Date(c.inicio).getTime()) / 60_000) : null;

  return (
    <article
      draggable={arrastavel}
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", c.id);
        aoArrastar(true);
      }}
      onDragEnd={() => aoArrastar(false)}
      className={`flex flex-col gap-2 rounded-[14px] bg-superficie p-3 shadow-[0_1px_0_rgb(11_22_18/0.06)] transition-[transform,box-shadow,opacity] ${
        arrastavel ? "cursor-grab active:cursor-grabbing" : ""
      } ${arrastando ? "opacity-40" : "hover:-translate-y-0.5 hover:shadow-[0_10px_24px_-12px_rgb(11_22_18/0.3)]"} ${
        c.status === "EM_ANDAMENTO" ? "border-l-4 border-ambar" : c.status === "CONCLUIDA" ? "border-l-4 border-menta" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <Link href={`/funil/${c.processoId}/visita/${c.id}`} className="min-w-0 text-sm leading-snug font-semibold hover:text-verde" draggable={false}>
          {c.cliente}
        </Link>
        <span className="flex-none font-mono text-xs text-texto-2">{fmtHora.format(new Date(c.inicio))}</span>
      </div>
      {c.local && <span className="-mt-1 truncate text-xs text-suave">{c.local}</span>}
      <span className="flex flex-wrap gap-1.5">
        <Selo cor={c.atrasada ? "vermelho" : COR_STATUS[c.status]}>{c.atrasada ? "Atrasada" : ROTULO_STATUS_VISITA[c.status]}</Selo>
        {c.status === "CONCLUIDA" && duracao !== null && <Selo>{duracao} min</Selo>}
        {c.itensChecklist > 0 && <Selo>✓ {c.itensChecklist}</Selo>}
        {c.fotos > 0 && <Selo>{c.fotos} foto(s)</Selo>}
      </span>
      {c.status === "CONCLUIDA" && c.resumo && <p className="line-clamp-2 text-xs text-texto-2">{c.resumo}</p>}

      {(acoes.iniciar && pode.iniciar) || (acoes.finalizar && pode.finalizar) || arrastavel ? (
        <div className="flex flex-wrap gap-1.5 border-t border-linha-suave pt-2">
          {acoes.iniciar && pode.iniciar && (
            <BotaoAcao acao={iniciarVisita.bind(null, c.id)} variante="primario">
              Iniciar
            </BotaoAcao>
          )}
          {acoes.finalizar && pode.finalizar && (
            <button type="button" onClick={aoFinalizar} className={classeBotao("menta", true)}>
              Finalizar
            </button>
          )}
          {arrastavel && (
            <button type="button" onClick={aoMover} className={classeBotao("secundario", true)}>
              Mover
            </button>
          )}
        </div>
      ) : null}
    </article>
  );
}

/** Janela sobre a tela (dialog nativo): fecha com Esc, no X ou clicando fora. */
function JanelaModal({ titulo, aoFechar, children }: { titulo: string; aoFechar: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
  }, []);

  return (
    <dialog
      ref={ref}
      onClose={aoFechar}
      onClick={(e) => e.target === ref.current && ref.current?.close()}
      className="m-auto w-[min(520px,calc(100vw-24px))] rounded-[22px] bg-superficie p-0 text-texto backdrop:bg-tinta/60 max-sm:mb-0 max-sm:rounded-b-none"
    >
      <div className="flex max-h-[85dvh] flex-col gap-4 overflow-y-auto p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))]">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-display text-[20px] font-bold tracking-[-0.02em]">{titulo}</h2>
          <button
            type="button"
            onClick={() => ref.current?.close()}
            aria-label="Fechar"
            className="flex size-11 flex-none cursor-pointer items-center justify-center rounded-xl hover:bg-fundo"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
        {children}
      </div>
    </dialog>
  );
}
