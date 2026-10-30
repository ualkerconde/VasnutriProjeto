import { AreaTexto, Caixa, Campo, Grade, Selecao } from "@/components/ui";
import type { Cliente } from "@/generated/prisma/client";
import { formatarCnpj, UFS } from "@/lib/clientes";
import { CampoCnpj } from "./campo-cnpj";

export function CamposCliente({
  cliente,
  servicos,
  servicosMarcados = [],
  gestores,
}: {
  cliente?: Cliente;
  servicos: { id: string; nome: string }[];
  servicosMarcados?: string[];
  gestores: { id: string; nome: string }[];
}) {
  return (
    <>
      <Grade>
        <CampoCnpj valorInicial={cliente?.cnpj ? formatarCnpj(cliente.cnpj) : ""} />
        <Campo rotulo="Nome fantasia" nome="nomeFantasia" required defaultValue={cliente?.nomeFantasia} />
        <Campo rotulo="Razão social" nome="razaoSocial" defaultValue={cliente?.razaoSocial ?? ""} />
        <Selecao
          rotulo="Gestor da conta"
          nome="gestorId"
          vazio="—"
          defaultValue={cliente?.gestorId ?? ""}
          opcoes={gestores.map((g) => ({ valor: g.id, rotulo: g.nome }))}
        />
      </Grade>
      <Grade colunas={3}>
        <Campo rotulo="Logradouro" nome="logradouro" defaultValue={cliente?.logradouro ?? ""} />
        <Campo rotulo="Número" nome="numero" defaultValue={cliente?.numero ?? ""} />
        <Campo rotulo="Complemento" nome="complemento" defaultValue={cliente?.complemento ?? ""} />
        <Campo rotulo="Bairro" nome="bairro" defaultValue={cliente?.bairro ?? ""} />
        <Campo rotulo="Cidade" nome="cidade" defaultValue={cliente?.cidade ?? ""} />
        <Selecao rotulo="UF" nome="uf" vazio="—" defaultValue={cliente?.uf ?? ""} opcoes={UFS.map((u) => ({ valor: u, rotulo: u }))} />
        <Campo rotulo="CEP" nome="cep" inputMode="numeric" defaultValue={cliente?.cep ?? ""} />
      </Grade>
      <AreaTexto
        rotulo="Instruções para nota fiscal"
        nome="observacaoNf"
        defaultValue={cliente?.observacaoNf ?? ""}
        placeholder="Ex.: emitir CF, endereço diferente para NF…"
      />
      {servicos.length > 0 && (
        <fieldset className="flex flex-col gap-1">
          <legend className="mb-1 text-[13px] font-semibold text-texto-2">Serviços do cliente</legend>
          <div className="flex flex-wrap gap-x-6">
            {servicos.map((s) => (
              <Caixa key={s.id} rotulo={s.nome} nome="servicos" value={s.id} defaultChecked={servicosMarcados.includes(s.id)} />
            ))}
          </div>
        </fieldset>
      )}
    </>
  );
}
