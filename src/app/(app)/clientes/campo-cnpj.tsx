"use client";

import { useRef, useState, useTransition } from "react";
import { Campo, classeBotao } from "@/components/ui";
import { somenteDigitos } from "@/lib/clientes";
import type { DadosCnpj } from "@/lib/cnpj";
import { consultarCnpj } from "./consulta-cnpj";

type Aviso = { tipo: "ok" | "alerta" | "erro"; texto: string };

const corAviso = { ok: "text-verde", alerta: "text-ambar-texto", erro: "text-[#9A2B12]" };

/** Escreve os dados da Receita nos campos do formulário. O nome fantasia só é preenchido se estiver vazio. */
function preencher(form: HTMLFormElement, dados: DadosCnpj) {
  const definir = (nome: string, valor: string | null, soSeVazio = false) => {
    const campo = form.elements.namedItem(nome);
    if (!(campo instanceof HTMLInputElement || campo instanceof HTMLSelectElement)) return;
    if (soSeVazio && campo.value.trim() !== "") return;
    campo.value = valor ?? "";
  };
  definir("nomeFantasia", dados.nomeFantasia ?? dados.razaoSocial, true);
  definir("razaoSocial", dados.razaoSocial);
  definir("logradouro", dados.logradouro);
  definir("numero", dados.numero);
  definir("complemento", dados.complemento);
  definir("bairro", dados.bairro);
  definir("cidade", dados.cidade);
  definir("uf", dados.uf);
  definir("cep", dados.cep);
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
    iniciar(async () => {
      const r = await consultarCnpj(cnpj);
      const form = ref.current?.closest("form");
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
