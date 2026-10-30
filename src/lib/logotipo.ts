import "server-only";
import { db } from "@/lib/db";

// O logotipo enviado em Cadastros fica no armazenamento de arquivos; a configuração guarda o caminho.

export const CHAVE_LOGOTIPO = "_logotipo";
export const TIPOS_LOGOTIPO = ["image/png", "image/jpeg", "image/webp", "image/gif"];

export type Logotipo = { caminho: string; mime: string; versao: string };

export async function lerLogotipo(): Promise<Logotipo | null> {
  const linha = await db.configuracao.findUnique({ where: { chave: CHAVE_LOGOTIPO } });
  const v = linha?.valor as Partial<Logotipo> | null | undefined;
  if (!v || typeof v.caminho !== "string" || typeof v.mime !== "string") return null;
  return { caminho: v.caminho, mime: v.mime, versao: String(v.versao ?? "") };
}
