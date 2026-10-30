"use client";

import { useRef, useState, useTransition } from "react";
import { Campo, classeBotao } from "@/components/ui";
import { somenteDigitos } from "@/lib/clientes";
import type { DadosCnpj } from "@/lib/cnpj";
import { consultarCnpj } from "./consulta-cnpj";

type Aviso = { tipo: "ok" | "alerta" | "erro"; texto: string };

const corAviso = { ok: "text-verde", alerta: "text-ambar-texto", erro: "text-[#9A2B12]" };

const CAMPOS_RECEITA = ["nomeFantasia", "razaoSocial", "logradouro", "numero", "complemento", "bairro", "cidade", "uf", "cep"] as const;

/** Apaga os campos vindos da Receita e escreve os da nova consulta (sem dados = limpa tudo). */
function preencher(form: HTMLFormElement, dados: DadosCnpj | null) {
  const valores: Record<(typeof CAMPOS_RECEITA)[number], string | null> = {
    nomeFantasia: dados ? (dados.nomeFantasia ?? dados.razaoSocial) : null,
    razaoSocial: dados?.razaoSocial ?? null,
    logradouro: dados?.logradouro ?? null,
    numero: dados?.numero ?? null,
    complemento: dados?.complemento ?? null,
    bairro: dados?.bairro ?? null,
    cidade: dados?.cidade ?? null,
    uf: dados?.uf ?? null,
    cep: dados?.cep ?? null,
  };
  for (const nome of CAMPOS_RECEITA) {
    const campo = form.elements.namedItem(nome);
    if (campo instanceof HTMLInputElement || campo instanceof HTMLSelectElement) campo.value = valores[nome] ?? "";
  }
}

/** Campo de CNPJ que busca os dados da empresa na Receita Federal ao completar os 14 números. */
export function CampoCnpj({ valorInicial }: { valorInicial: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const ultimaConsulta = useRef(somenteDigitos(valorInicial));
  const [aviso, setAviso] = useState<Aviso | null>(null);
  const [buscando, iniciar] = useTransition();

  function buscar(valor: string) {
    const cnpj = somenteDigitos(valor);
    if (cnpj.length !== 14) {
      setAviso({ tipo: "erro", texto: "Digite os 14 números do CNPJ." });
      return;
    }
    ultimaConsulta.current = cnpj;
    setAviso(null);
    const form = ref.current?.closest("form");
    if (form) preencher(form, null);
    iniciar(async () => {
      const r = await consultarCnpj(cnpj);
      if (r.erro !== undefined || !form) {
        setAviso({ tipo: "erro", texto: r.erro ?? "Não foi possível preencher." });
        return;
      }
      preencher(form, r.dados);
      const situacao = r.dados.situacao?.toUpperCase();
      setAviso(
        situacao && situacao !== "ATIVA"
          ? { tipo: "alerta", texto: `Dados preenchidos. Atenção: situação na Receita é ${situacao}.` }
          : { tipo: "ok", texto: "Dados preenchidos pela Receita Federal. Confira antes de salvar." },
      );
    });
  }

  return (
    <div ref={ref} className="flex min-w-0 flex-col gap-1.5">
      <div className="flex items-end gap-2">
        <Campo
          rotulo="CNPJ"
          nome="cnpj"
          inputMode="numeric"
          placeholder="00.000.000/0000-00"
          defaultValue={valorInicial}
          className="flex-1"
          onChange={(e) => {
            const cnpj = somenteDigitos(e.target.value);
            if (cnpj.length === 14 && cnpj !== ultimaConsulta.current) buscar(cnpj);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              buscar(e.currentTarget.value);
            }
          }}
        />
        <button
          type="button"
          disabled={buscando}
          title="Buscar dados na Receita Federal"
          className={`${classeBotao("secundario")} h-11 shrink-0`}
          onClick={(e) => {
            const campo = e.currentTarget.form?.elements.namedItem("cnpj");
            if (campo instanceof HTMLInputElement) buscar(campo.value);
          }}
        >
          {buscando ? "Buscando…" : "Buscar"}
        </button>
      </div>
      {aviso && (
        <span role="status" className={`text-xs font-medium ${corAviso[aviso.tipo]}`}>
          {aviso.texto}
        </span>
      )}
    </div>
  );
}
