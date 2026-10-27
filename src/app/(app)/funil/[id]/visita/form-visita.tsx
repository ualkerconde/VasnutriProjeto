"use client";

import { useState } from "react";
import { Formulario } from "@/components/formulario";
import { AreaTexto, Campo, Grade, Selecao, SimNao } from "@/components/ui";
import type { EstadoForm } from "@/lib/form";

type Visita = {
  inicio: string;
  fim: string;
  tecnicoId: string;
  realizado: string;
  recebidoPor: string;
  placasColadas: boolean | null;
  fichasTecnicas: boolean | null;
  infoNutricional: boolean | null;
  cardapios: boolean | null;
  teveInconformidade: boolean;
  inconformidades: string;
};

/** As perguntas de fichas, informação nutricional e cardápios só aparecem se o contrato inclui o serviço. */
export function FormVisita({
  acao,
  visita,
  tecnicos,
  inclui,
}: {
  acao: (anterior: EstadoForm, f: FormData) => Promise<EstadoForm>;
  visita: Visita;
  tecnicos: { valor: string; rotulo: string }[];
  inclui: { fichas: boolean; info: boolean; cardapios: boolean };
}) {
  const [inconformidade, setInconformidade] = useState(visita.teveInconformidade ? "sim" : "nao");

  return (
    <Formulario acao={acao} botao="Salvar visita">
      <Grade colunas={3}>
        <Campo rotulo="Início" nome="inicio" type="datetime-local" required defaultValue={visita.inicio} />
        <Campo rotulo="Fim" nome="fim" type="datetime-local" defaultValue={visita.fim} />
        <Selecao rotulo="Técnico" nome="tecnicoId" vazio="—" defaultValue={visita.tecnicoId} opcoes={tecnicos} />
        <Campo rotulo="Quem recebeu" nome="recebidoPor" defaultValue={visita.recebidoPor} />
      </Grade>
      <AreaTexto rotulo="O que foi realizado" nome="realizado" rows={4} defaultValue={visita.realizado} />
      <Grade colunas={4}>
        <SimNao rotulo="Placas foram coladas?" nome="placasColadas" valor={visita.placasColadas} />
        {inclui.fichas && <SimNao rotulo="Fichas técnicas feitas?" nome="fichasTecnicas" valor={visita.fichasTecnicas} />}
        {inclui.info && <SimNao rotulo="Informação nutricional feita?" nome="infoNutricional" valor={visita.infoNutricional} />}
        {inclui.cardapios && <SimNao rotulo="Cardápios feitos?" nome="cardapios" valor={visita.cardapios} />}
        <Selecao
          rotulo="Encontradas inconformidades?"
          nome="teveInconformidade"
          value={inconformidade}
          onChange={(e) => setInconformidade(e.target.value)}
          opcoes={[
            { valor: "nao", rotulo: "Não" },
            { valor: "sim", rotulo: "Sim" },
          ]}
        />
      </Grade>
      {inconformidade === "sim" && (
        <AreaTexto rotulo="Quais inconformidades" nome="inconformidades" rows={8} defaultValue={visita.inconformidades} ajuda="Descreva por setor. Depois, crie as ações no plano de ação do processo." />
      )}
    </Formulario>
  );
}
