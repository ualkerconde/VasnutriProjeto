import "server-only";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

// Fotos e anexos ficam numa pasta do servidor (ARQUIVOS_DIR). O banco guarda só o caminho relativo.

const TAMANHO_MAXIMO = 15 * 1024 * 1024;

function raiz() {
  return path.resolve(/*turbopackIgnore: true*/ process.cwd(), process.env.ARQUIVOS_DIR || "armazenamento");
}

function caminhoSeguro(relativo: string) {
  const base = raiz();
  const completo = path.resolve(base, relativo);
  if (!completo.startsWith(base + path.sep)) throw new Error("Caminho de arquivo inválido.");
  return completo;
}

export function nomeSeguro(nome: string) {
  const limpo = nome
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return limpo.slice(-80) || "arquivo";
}

export async function salvarArquivo(arquivo: File): Promise<{ caminho: string; mime: string; tamanho: number }> {
  if (arquivo.size === 0) throw new Error("Arquivo vazio.");
  if (arquivo.size > TAMANHO_MAXIMO) throw new Error("O arquivo passa de 15 MB.");
  const agora = new Date();
  const pasta = `${agora.getUTCFullYear()}/${String(agora.getUTCMonth() + 1).padStart(2, "0")}`;
  const relativo = `${pasta}/${randomUUID()}-${nomeSeguro(arquivo.name)}`;
  const destino = caminhoSeguro(relativo);
  await mkdir(path.dirname(destino), { recursive: true });
  await writeFile(destino, Buffer.from(await arquivo.arrayBuffer()));
  return { caminho: relativo, mime: arquivo.type || "application/octet-stream", tamanho: arquivo.size };
}

export async function lerArquivo(relativo: string) {
  return readFile(caminhoSeguro(relativo));
}

export async function apagarArquivo(relativo: string) {
  await rm(caminhoSeguro(relativo), { force: true });
}

/** Nome original, sem o prefixo aleatório. */
export function nomeOriginal(relativo: string) {
  return path.basename(relativo).replace(/^[0-9a-f-]{36}-/, "");
}
