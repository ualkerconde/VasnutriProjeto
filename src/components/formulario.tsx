"use client";

import { useActionState, useEffect, useRef, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import type { EstadoForm } from "@/lib/form";
import { classeBotao, type VarianteBotao } from "./ui";

type Acao = (anterior: EstadoForm, formData: FormData) => Promise<EstadoForm>;

/** Formulário ligado a uma ação de servidor, com mensagem de erro/sucesso e botão que mostra o envio. */
export function Formulario({
  acao,
  children,
  botao = "Salvar",
  variante = "primario",
  className = "",
  limparAoSalvar = false,
  confirmar,
}: {
  acao: Acao;
  children?: ReactNode;
  /** null esconde o botão (formulário só de leitura). */
  botao?: ReactNode;
  variante?: VarianteBotao;
  className?: string;
  limparAoSalvar?: boolean;
  confirmar?: string;
}) {
  const [estado, executar] = useActionState(acao, {});
  const ref = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (estado.ok && limparAoSalvar) ref.current?.reset();
  }, [estado, limparAoSalvar]);

  return (
    <form
      ref={ref}
      action={executar}
      onSubmit={(e) => {
        if (confirmar && !window.confirm(confirmar)) e.preventDefault();
      }}
      className={`flex flex-col gap-4 ${className}`}
    >
      {children}
      {estado.erro && (
        <p role="alert" className="rounded-xl bg-[#FCE4DE] px-4 py-3 text-sm font-medium text-[#9A2B12]">
          {estado.erro}
        </p>
      )}
      {estado.ok && !estado.erro && (
        <p role="status" className="rounded-xl bg-[#E1F5EA] px-4 py-3 text-sm font-medium text-[#0B5F3B]">
          {estado.ok}
        </p>
      )}
      {botao !== null && (
        <div>
          <BotaoEnviar variante={variante}>{botao}</BotaoEnviar>
        </div>
      )}
    </form>
  );
}

export function BotaoEnviar({
  children,
  variante = "primario",
  pequeno = false,
}: {
  children: ReactNode;
  variante?: VarianteBotao;
  pequeno?: boolean;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={classeBotao(variante, pequeno)}>
      {pending ? "Salvando…" : children}
    </button>
  );
}

/** Um botão só, para ações rápidas (marcar, concluir, apagar). Erros aparecem num alerta. */
export function BotaoAcao({
  acao,
  children,
  variante = "secundario",
  pequeno = true,
  confirmar,
  rotulo,
}: {
  acao: Acao;
  children: ReactNode;
  variante?: VarianteBotao;
  pequeno?: boolean;
  confirmar?: string;
  rotulo?: string;
}) {
  const [estado, executar, enviando] = useActionState(acao, {});

  useEffect(() => {
    if (estado.erro) window.alert(estado.erro);
  }, [estado]);

  return (
    <form
      action={executar}
      onSubmit={(e) => {
        if (confirmar && !window.confirm(confirmar)) e.preventDefault();
      }}
      className="inline-flex"
    >
      <button type="submit" disabled={enviando} aria-label={rotulo} title={rotulo} className={classeBotao(variante, pequeno)}>
        {children}
      </button>
    </form>
  );
}
