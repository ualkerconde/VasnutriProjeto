import { Formulario } from "@/components/formulario";
import { AreaTexto, Caixa, Campo, Cartao, Grade } from "@/components/ui";
import { paraInputData } from "@/lib/datas";
import { salvarContrato } from "../acoes";
import type { ProcessoCompleto } from "./dados";

export function Contrato({ processo, tipos }: { processo: ProcessoCompleto; tipos: { id: string; nome: string }[] }) {
  const exibeValor = processo.etapaAtual.exibeValorContrato;
  const marcados = processo.documentacoes.map((d) => d.tipoDocumentacaoId);
  const valor = processo.valorMensal ? Number(processo.valorMensal).toLocaleString("pt-BR", { minimumFractionDigits: 2 }) : "";

  return (
    <Cartao titulo="Dados do contrato" id="contrato">
      <Formulario acao={salvarContrato.bind(null, processo.id)} botao="Salvar contrato">
        <Grade colunas={3}>
          <Campo rotulo="Nº do contrato" nome="numeroContrato" defaultValue={processo.numeroContrato ?? ""} />
          <Campo rotulo="Plano" nome="plano" defaultValue={processo.plano ?? ""} />
          {exibeValor && <Campo rotulo="Valor mensal (R$)" nome="valorMensal" inputMode="decimal" placeholder="0,00" defaultValue={valor} />}
          <Campo rotulo="Dia de vencimento" nome="diaVencimento" type="number" min={1} max={31} defaultValue={processo.diaVencimento ?? ""} />
          <Campo rotulo="Validade do contrato" nome="validadeContrato" type="date" defaultValue={paraInputData(processo.validadeContrato)} />
          <Campo rotulo="Visitas contratadas" nome="visitasContratadas" type="number" min={0} defaultValue={processo.visitasContratadas ?? ""} />
          <Campo rotulo="Carga horária por visita (h)" nome="cargaHorariaVisita" type="number" min={0} defaultValue={processo.cargaHorariaVisita ?? ""} />
          <Campo rotulo="Envio para assinatura" nome="dataEnvioAssinatura" type="date" defaultValue={paraInputData(processo.dataEnvioAssinatura)} />
          <Campo rotulo="Assinado em" nome="dataAssinatura" type="date" defaultValue={paraInputData(processo.dataAssinatura)} />
          <Campo rotulo="E-mail para relatórios técnicos" nome="emailRelatorios" defaultValue={processo.emailRelatorios ?? ""} />
        </Grade>
        {!exibeValor && <p className="text-xs text-suave">O valor do contrato fica visível só até a etapa 4.</p>}
        <fieldset>
          <legend className="mb-1 text-[13px] font-semibold text-texto-2">O contrato inclui</legend>
          <div className="flex flex-wrap gap-x-6">
            <Caixa rotulo="Fichas técnicas" nome="incluiFichasTecnicas" defaultChecked={processo.incluiFichasTecnicas} />
            <Caixa rotulo="Informação nutricional" nome="incluiInfoNutricional" defaultChecked={processo.incluiInfoNutricional} />
            <Caixa rotulo="Cardápios" nome="incluiCardapios" defaultChecked={processo.incluiCardapios} />
          </div>
        </fieldset>
        {tipos.length > 0 && (
          <fieldset>
            <legend className="mb-1 text-[13px] font-semibold text-texto-2">Documentação contratada</legend>
            <div className="flex flex-wrap gap-x-6">
              {tipos.map((t) => (
                <Caixa key={t.id} rotulo={t.nome} nome="documentacoes" value={t.id} defaultChecked={marcados.includes(t.id)} />
              ))}
            </div>
          </fieldset>
        )}
        <Grade>
          <AreaTexto rotulo="Observações" nome="observacoes" defaultValue={processo.observacoes ?? ""} />
          <AreaTexto rotulo="Pendências" nome="pendencias" defaultValue={processo.pendencias ?? ""} />
        </Grade>
      </Formulario>
    </Cartao>
  );
}
