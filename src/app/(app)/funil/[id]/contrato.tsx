import { Formulario } from "@/components/formulario";
import { AreaTexto, Caixa, Campo, Cartao, Grade } from "@/components/ui";
import { paraInputData } from "@/lib/datas";
import type { ChaveCampo, RegraCampo } from "@/lib/funil/campos";
import { salvarContrato } from "../acoes";
import type { ProcessoCompleto } from "./dados";

export function Contrato({
  processo,
  tipos,
  campos,
}: {
  processo: ProcessoCompleto;
  tipos: { id: string; nome: string }[];
  campos: Record<ChaveCampo, RegraCampo>;
}) {
  const exibeValor = processo.etapaAtual.exibeValorContrato && campos.valorMensal.visivel;
  const marcados = processo.documentacoes.map((d) => d.tipoDocumentacaoId);
  const valor = processo.valorMensal
    ? Number(processo.valorMensal).toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
      })
    : "";
  // Campo oculto: não aparece. Campo sem edição nesta etapa: aparece travado.
  const ver = (c: ChaveCampo) => campos[c].visivel;
  const travado = (c: ChaveCampo) => !campos[c].editavel;
  const algumEditavel = Object.values(campos).some((c) => c.editavel);
  const algumTravado = Object.values(campos).some((c) => c.visivel && !c.editavel);

  return (
    <Cartao titulo="Dados do contrato" id="contrato">
      <Formulario acao={salvarContrato.bind(null, processo.id)} botao={algumEditavel ? "Salvar contrato" : null}>
        <Grade colunas={3}>
          {ver("numeroContrato") && (
            <Campo rotulo="Nº do contrato" nome="numeroContrato" disabled={travado("numeroContrato")} defaultValue={processo.numeroContrato ?? ""} />
          )}
          {ver("plano") && <Campo rotulo="Plano" nome="plano" disabled={travado("plano")} defaultValue={processo.plano ?? ""} />}
          {exibeValor && (
            <Campo
              rotulo="Valor mensal (R$)"
              nome="valorMensal"
              inputMode="decimal"
              placeholder="0,00"
              disabled={travado("valorMensal")}
              defaultValue={valor}
            />
          )}
          {ver("diaVencimento") && (
            <Campo
              rotulo="Dia de vencimento"
              nome="diaVencimento"
              type="number"
              min={1}
              max={31}
              disabled={travado("diaVencimento")}
              defaultValue={processo.diaVencimento ?? ""}
            />
          )}
          {ver("validadeContrato") && (
            <Campo
              rotulo="Validade do contrato"
              nome="validadeContrato"
              type="date"
              disabled={travado("validadeContrato")}
              defaultValue={paraInputData(processo.validadeContrato)}
            />
          )}
          {ver("visitasContratadas") && (
            <Campo
              rotulo="Visitas contratadas"
              nome="visitasContratadas"
              type="number"
              min={0}
              disabled={travado("visitasContratadas")}
              defaultValue={processo.visitasContratadas ?? ""}
            />
          )}
          {ver("cargaHorariaVisita") && (
            <Campo
              rotulo="Carga horária por visita (h)"
              nome="cargaHorariaVisita"
              type="number"
              min={0}
              disabled={travado("cargaHorariaVisita")}
              defaultValue={processo.cargaHorariaVisita ?? ""}
            />
          )}
          {ver("dataEnvioAssinatura") && (
            <Campo
              rotulo="Envio para assinatura"
              nome="dataEnvioAssinatura"
              type="date"
              disabled={travado("dataEnvioAssinatura")}
              defaultValue={paraInputData(processo.dataEnvioAssinatura)}
            />
          )}
          {ver("dataAssinatura") && (
            <Campo
              rotulo="Assinado em"
              nome="dataAssinatura"
              type="date"
              disabled={travado("dataAssinatura")}
              defaultValue={paraInputData(processo.dataAssinatura)}
            />
          )}
          {ver("emailRelatorios") && (
            <Campo
              rotulo="E-mail para relatórios técnicos"
              nome="emailRelatorios"
              disabled={travado("emailRelatorios")}
              defaultValue={processo.emailRelatorios ?? ""}
            />
          )}
        </Grade>
        {!processo.etapaAtual.exibeValorContrato && campos.valorMensal.visivel && (
          <p className="text-xs text-suave">O valor do contrato fica visível só até a etapa 4.</p>
        )}
        {ver("inclusoes") && (
          <fieldset disabled={travado("inclusoes")}>
            <legend className="mb-1 text-[13px] font-semibold text-texto-2">O contrato inclui</legend>
            <div className="flex flex-wrap gap-x-6">
              <Caixa rotulo="Fichas técnicas" nome="incluiFichasTecnicas" defaultChecked={processo.incluiFichasTecnicas} />
              <Caixa rotulo="Informação nutricional" nome="incluiInfoNutricional" defaultChecked={processo.incluiInfoNutricional} />
              <Caixa rotulo="Cardápios" nome="incluiCardapios" defaultChecked={processo.incluiCardapios} />
            </div>
          </fieldset>
        )}
        {ver("documentacoes") && tipos.length > 0 && (
          <fieldset disabled={travado("documentacoes")}>
            <legend className="mb-1 text-[13px] font-semibold text-texto-2">Documentação contratada</legend>
            <div className="flex flex-wrap gap-x-6">
              {tipos.map((t) => (
                <Caixa key={t.id} rotulo={t.nome} nome="documentacoes" value={t.id} defaultChecked={marcados.includes(t.id)} />
              ))}
            </div>
          </fieldset>
        )}
        <Grade>
          {ver("observacoes") && (
            <AreaTexto rotulo="Observações" nome="observacoes" disabled={travado("observacoes")} defaultValue={processo.observacoes ?? ""} />
          )}
          {ver("pendencias") && (
            <AreaTexto rotulo="Pendências" nome="pendencias" disabled={travado("pendencias")} defaultValue={processo.pendencias ?? ""} />
          )}
        </Grade>
        {algumTravado && <p className="text-xs text-suave">Campos em cinza não podem ser alterados nesta etapa pelo seu perfil.</p>}
      </Formulario>
    </Cartao>
  );
}
