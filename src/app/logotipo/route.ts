import { lerArquivo } from "@/lib/armazenamento";
import { lerLogotipo } from "@/lib/logotipo";

// Logotipo da empresa. Público, porque também aparece na tela de login.
export async function GET() {
  const logo = await lerLogotipo();
  if (!logo) return new Response("Sem logotipo", { status: 404 });
  try {
    const conteudo = await lerArquivo(logo.caminho);
    return new Response(new Uint8Array(conteudo), {
      headers: { "Content-Type": logo.mime, "X-Content-Type-Options": "nosniff", "Cache-Control": "public, max-age=86400" },
    });
  } catch {
    return new Response("Logotipo não encontrado", { status: 404 });
  }
}
