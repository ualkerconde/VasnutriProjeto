import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Formulario } from "@/components/formulario";
import { CabecalhoPagina, Caixa, Campo, Cartao, Grade, LinkBotao, Selo, Tabela } from "@/components/ui";
import { exigirModulo } from "@/lib/auth/sessao";
import { fmtDataHora } from "@/lib/datas";
import { db } from "@/lib/db";
import { redefinirSenha, salvarUsuario } from "../acoes";

export const metadata: Metadata = { title: "Usuário" };

export default async function DetalheUsuario({ params }: PageProps<"/usuarios/[id]">) {
  await exigirModulo("USUARIOS");
  const { id } = await params;
  const [usuario, perfis] = await Promise.all([
    db.usuario.findUnique({
      where: { id },
      include: { perfis: true, acessos: { orderBy: { dataHora: "desc" }, take: 10 } },
    }),
    db.perfil.findMany({ orderBy: { nome: "asc" }, include: { permissoes: true } }),
  ]);
  if (!usuario) notFound();
  const marcados = usuario.perfis.map((p) => p.perfilId);

  return (
    <>
      <CabecalhoPagina
        sobretitulo="Usuários"
        titulo={usuario.nome}
        descricao={usuario.email}
        acoes={
          <LinkBotao href="/usuarios" variante="secundario">
            Voltar
          </LinkBotao>
        }
      />
      <div className="flex flex-wrap items-start gap-5">
        <Cartao titulo="Dados e perfis" className="flex-[999_1_480px]">
          <Formulario acao={salvarUsuario.bind(null, usuario.id)}>
            <Grade>
              <Campo rotulo="Nome" nome="nome" required defaultValue={usuario.nome} />
              <Campo rotulo="E-mail" nome="email" type="email" required defaultValue={usuario.email} />
            </Grade>
            <fieldset>
              <legend className="mb-1 text-[13px] font-semibold text-texto-2">Perfis</legend>
              <div className="flex flex-wrap gap-x-6">
                {perfis.map((p) => (
                  <Caixa key={p.id} rotulo={p.nome} nome="perfis" value={p.id} defaultChecked={marcados.includes(p.id)} />
                ))}
              </div>
            </fieldset>
            <Caixa rotulo="Usuário ativo (pode entrar no sistema)" nome="ativo" defaultChecked={usuario.ativo} />
          </Formulario>
        </Cartao>

        <Cartao titulo="Redefinir senha" className="flex-[1_1_300px]">
          <Formulario acao={redefinirSenha.bind(null, usuario.id)} botao="Redefinir senha" variante="secundario" limparAoSalvar>
            <Campo rotulo="Nova senha" nome="senha" type="password" required minLength={10} autoComplete="new-password" />
          </Formulario>
        </Cartao>
      </div>

      <Cartao titulo="Últimos acessos">
        {usuario.acessos.length === 0 ? (
          <p className="text-sm text-suave">Nenhum acesso registrado.</p>
        ) : (
          <Tabela cabecalho={["Data e hora", "Resultado", "IP", "Navegador"]}>
            {usuario.acessos.map((a) => (
              <tr key={a.id}>
                <td className="whitespace-nowrap">{fmtDataHora(a.dataHora)}</td>
                <td>{a.sucesso ? <Selo cor="verde">Entrou</Selo> : <Selo cor="vermelho">Senha errada</Selo>}</td>
                <td className="font-mono text-[13px]">{a.ip ?? "—"}</td>
                <td className="max-w-[360px] truncate text-xs text-suave">{a.dispositivo ?? "—"}</td>
              </tr>
            ))}
          </Tabela>
        )}
      </Cartao>
    </>
  );
}
