import { AreaTexto, Caixa, Campo, Grade, Selecao } from "@/components/ui";
import { paraInputData } from "@/lib/datas";

type Opcao = { valor: string; rotulo: string };

export function CamposSolicitacao({
  clientes,
  processos,
  usuarios,
  s,
}: {
  clientes: Opcao[];
  processos: Opcao[];
  usuarios: Opcao[];
  s?: {
    clienteId: string;
    processoId: string | null;
    data: Date;
    servico: string;
    descricao: string | null;
    responsavelId: string | null;
    prazo: Date | null;
    requerValidacao: boolean;
    observacao: string | null;
  };
}) {
  return (
    <>
      <Grade>
        <Selecao rotulo="Cliente" nome="clienteId" required vazio="Escolha" defaultValue={s?.clienteId ?? ""} opcoes={clientes} />
        {processos.length > 0 && <Selecao rotulo="Processo (opcional)" nome="processoId" vazio="Nenhum" defaultValue={s?.processoId ?? ""} opcoes={processos} />}
        <Campo rotulo="Serviço" nome="servico" required list="servicos-escritorio" defaultValue={s?.servico} placeholder="Ex.: Placas, Alvará, Relatório" />
        <Selecao rotulo="Responsável" nome="responsavelId" vazio="—" defaultValue={s?.responsavelId ?? ""} opcoes={usuarios} />
        <Campo rotulo="Data da solicitação" nome="data" type="date" defaultValue={paraInputData(s?.data ?? new Date())} />
        <Campo rotulo="Prazo" nome="prazo" type="date" defaultValue={paraInputData(s?.prazo)} />
      </Grade>
      <datalist id="servicos-escritorio">
        <option value="Placas" />
        <option value="Mapa de comercialização" />
        <option value="Relatório técnico" />
        <option value="Documentação" />
      </datalist>
      <AreaTexto rotulo="Descrição" nome="descricao" defaultValue={s?.descricao ?? ""} />
      <Caixa rotulo="Necessita de validação" nome="requerValidacao" defaultChecked={s?.requerValidacao} />
      <Campo rotulo="Observação" nome="observacao" defaultValue={s?.observacao ?? ""} />
    </>
  );
}
