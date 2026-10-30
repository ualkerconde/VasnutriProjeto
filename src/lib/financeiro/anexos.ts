import "server-only";
import { apagarArquivo, salvarArquivo } from "@/lib/armazenamento";
import { hoje } from "@/lib/datas";
import { db } from "@/lib/db";
import { ErroValidacao } from "@/lib/form";

/** Grava os arquivos enviados no campo e liga à parcela (NF) ou à despesa (comprovante). */
export async function anexarArquivos(
  f: FormData,
  campo: string,
  dono: { parcelaId?: string; despesaId?: string },
  p: { tipo: string; usuarioId: string; obrigatorio?: boolean },
) {
  const arquivos = f.getAll(campo).filter((v): v is File => v instanceof File && v.size > 0);
  if (arquivos.length === 0) {
    if (p.obrigatorio) throw new ErroValidacao("Escolha o arquivo.");
    return 0;
  }
  const salvos: { caminho: string; mime: string; tamanho: number }[] = [];
  try {
    for (const a of arquivos) salvos.push(await salvarArquivo(a));
    await db.arquivo.createMany({
      data: salvos.map((s, i) => ({
        ...dono,
        categoria: "ANEXO" as const,
        tipo: p.tipo,
        descricao: arquivos[i].name,
        data: hoje(),
        caminhoStorage: s.caminho,
        mime: s.mime,
        tamanhoBytes: s.tamanho,
        enviadoPorId: p.usuarioId,
      })),
    });
  } catch (erro) {
    await Promise.all(salvos.map((s) => apagarArquivo(s.caminho)));
    throw new ErroValidacao(erro instanceof Error ? erro.message : "Não foi possível salvar o arquivo.");
  }
  return salvos.length;
}

export async function apagarArquivosDe(where: { parcelaId?: string; despesaId?: string }) {
  const arquivos = await db.arquivo.findMany({ where, select: { caminhoStorage: true } });
  await Promise.all(arquivos.map((a) => apagarArquivo(a.caminhoStorage)));
}
