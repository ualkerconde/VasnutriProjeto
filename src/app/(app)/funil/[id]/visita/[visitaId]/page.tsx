import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BotaoAcao } from "@/components/formulario";
import { CabecalhoPagina, Cartao, LinkBotao } from "@/components/ui";
import { exigirModulo } from "@/lib/auth/sessao";
import { fmtDataHora, paraInputDataHora } from "@/lib/datas";
import { db } from "@/lib/db";
import { opcoes, usuariosAtivos } from "@/lib/listas";
import { excluirVisita, salvarVisita } from "../../acoes-tecnicas";
import { FormVisita } from "../form-visita";
import { TravaProcesso } from "../../trava";

export const metadata: Metadata = { title: "Visita" };

export default async function EditarVisita({ params }: PageProps<"/funil/[id]/visita/[visitaId]">) {
  await exigirModulo("FUNIL");
  const { id, visitaId } = await params;
  const [visita, usuarios] = await Promise.all([
    db.visita.findUnique({ where: { id: visitaId }, include: { processo: { include: { cliente: true } } } }),
    usuariosAtivos(),
  ]);
  if (!visita || visita.processoId !== id) notFound();
  const p = visita.processo;

  return (
    <>
      <CabecalhoPagina
        sobretitulo={`Visita de ${fmtDataHora(visita.inicio)}`}
        titulo={p.cliente.nomeFantasia}
        acoes={
          <LinkBotao href={`/funil/${id}#visitas`} variante="secundario">
            Voltar
          </LinkBotao>
        }
      />
      <TravaProcesso processoId={id}>
        <Cartao>
          <FormVisita
            acao={salvarVisita.bind(null, id, visita.id)}
            tecnicos={opcoes(usuarios, (u) => u.nome)}
            inclui={{
              fichas: p.incluiFichasTecnicas || visita.fichasTecnicas !== null,
              info: p.incluiInfoNutricional || visita.infoNutricional !== null,
              cardapios: p.incluiCardapios || visita.cardapios !== null,
            }}
            visita={{
              inicio: paraInputDataHora(visita.inicio),
              fim: paraInputDataHora(visita.fim),
              tecnicoId: visita.tecnicoId ?? "",
              realizado: visita.realizado ?? "",
              recebidoPor: visita.recebidoPor ?? "",
              placasColadas: visita.placasColadas,
              fichasTecnicas: visita.fichasTecnicas,
              infoNutricional: visita.infoNutricional,
              cardapios: visita.cardapios,
              teveInconformidade: visita.teveInconformidade,
              inconformidades: visita.inconformidades ?? "",
            }}
          />
        </Cartao>
        <Cartao titulo="Excluir visita">
          <BotaoAcao acao={excluirVisita.bind(null, id, visita.id)} variante="perigo" confirmar="Excluir esta visita?">
            Excluir visita
          </BotaoAcao>
        </Cartao>
      </TravaProcesso>
    </>
  );
}
