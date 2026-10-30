import { AreaTexto, Campo, Grade, Selecao } from "@/components/ui";
import { paraInputData } from "@/lib/datas";

type Opcao = { valor: string; rotulo: string };

export function CamposDespesa({
  categorias,
  clientes,
  despesa,
  hoje,
}: {
  categorias: Opcao[];
  clientes: Opcao[];
  despesa?: { data: Date; valor: { toString(): string }; categoriaId: string; clienteId: string | null; descricao: string | null };
  hoje: Date;
}) {
  return (
    <>
      <Grade colunas={3}>
        <Campo rotulo="Data" nome="data" type="date" required defaultValue={paraInputData(despesa?.data ?? hoje)} />
        <Campo
          rotulo="Valor (R$)"
          nome="valor"
          inputMode="decimal"
          required
          placeholder="0,00"
          defaultValue={despesa ? Number(despesa.valor.toString()).toLocaleString("pt-BR", { minimumFractionDigits: 2 }) : ""}
        />
        <Selecao rotulo="Categoria" nome="categoriaId" required vazio="Escolha" opcoes={categorias} defaultValue={despesa?.categoriaId ?? ""} />
      </Grade>
      <Selecao
        rotulo="Cliente (se a despesa foi para um cliente)"
        nome="clienteId"
        vazio="Nenhum (despesa geral)"
        opcoes={clientes}
        defaultValue={despesa?.clienteId ?? ""}
        ajuda="Ligada a um cliente, a despesa entra na margem dele no painel do cliente."
      />
      <AreaTexto rotulo="Descrição" nome="descricao" rows={2} defaultValue={despesa?.descricao ?? ""} placeholder="Ex.: abastecimento para visita" />
    </>
  );
}
