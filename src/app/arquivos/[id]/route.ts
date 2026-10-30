import { lerArquivo, nomeOriginal } from "@/lib/armazenamento";
import { usuarioAtual } from "@/lib/auth/sessao";
import { db } from "@/lib/db";

// Download de foto ou anexo, só para quem está logado.
export async function GET(_req: Request, ctx: RouteContext<"/arquivos/[id]">) {
  const usuario = await usuarioAtual();
  if (!usuario) return new Response("Não autorizado", { status: 401 });

  const { id } = await ctx.params;
  const arquivo = await db.arquivo.findUnique({ where: { id }, include: { despesa: { select: { usuarioId: true } } } });
  if (!arquivo) return new Response("Arquivo não encontrado", { status: 404 });
  // Notas fiscais: só o financeiro. Comprovantes: quem lançou a despesa e o financeiro.
  const financeiro = usuario.modulos.includes("FINANCEIRO");
  if ((arquivo.parcelaId && !financeiro) || (arquivo.despesa && arquivo.despesa.usuarioId !== usuario.id && !financeiro)) {
    return new Response("Sem acesso", { status: 403 });
  }

  try {
    const conteudo = await lerArquivo(arquivo.caminhoStorage);
    const nome = nomeOriginal(arquivo.caminhoStorage);
    const mime = arquivo.mime ?? "application/octet-stream";
    // SVG sempre baixado: pode conter script.
    const exibir = (mime.startsWith("image/") && mime !== "image/svg+xml") || mime === "application/pdf";
    return new Response(new Uint8Array(conteudo), {
      headers: {
        "Content-Type": mime,
        "Content-Disposition": `${exibir ? "inline" : "attachment"}; filename="${nome}"`,
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch {
    return new Response("O arquivo não está mais no servidor.", { status: 410 });
  }
}
