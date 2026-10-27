import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CabecalhoPagina, Cartao, LinkBotao } from "@/components/ui";
import { exigirModulo } from "@/lib/auth/sessao";
import { paraInputDataHora } from "@/lib/datas";
import { db } from "@/lib/db";
import { opcoes, usuariosAtivos } from "@/lib/listas";
import { registrarVisita } from "../../acoes-tecnicas";
import { FormVisita } from "../form-visita";

export const metadata: Metadata = { title: "Registrar visita" };

export default async function NovaVisita({ params }: PageProps<"/funil/[id]/visita/nova">) {
  const usuario = await exigirModulo("FUNIL");
  const { id } = await params;
  const [processo, usuarios] = await Promise.all([
    db.processo.findUnique({ where: { id }, include: { cliente: true } }),
    usuariosAtivos(),
  ]);
  if (!processo) notFound();

  return (
    <>
      <CabecalhoPagina
        sobretitulo="Registrar visita"
        titulo={processo.cliente.nomeFantasia}
        acoes={
          <LinkBotao href={`/funil/${id}#visitas`} variante="secundario">
            Voltar
          </LinkBotao>
        }
      />
      <Cartao>
        <FormVisita
          acao={registrarVisita.bind(null, id)}
          tecnicos={opcoes(usuarios, (u) => u.nome)}
          inclui={{ fichas: processo.incluiFichasTecnicas, info: processo.incluiInfoNutricional, cardapios: processo.incluiCardapios }}
          visita={{
            inicio: paraInputDataHora(new Date()),
            fim: "",
            tecnicoId: usuario.id,
            realizado: "",
            recebidoPor: "",
            placasColadas: null,
            fichasTecnicas: null,
            infoNutricional: null,
            cardapios: null,
            teveInconformidade: false,
            inconformidades: "",
          }}
        />
      </Cartao>
    </>
  );
}
