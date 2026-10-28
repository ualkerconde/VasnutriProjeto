# Vasnutri

Sistema de gestão da consultoria Vasnutri (segurança alimentar), que substitui o app AppSheet.
Acompanha cada cliente pelas 12 etapas do funil, do escopo às visitas técnicas, com histórico,
checklist por etapa, ciclos de contrato e notificações.

## Tecnologia

- [Next.js](https://nextjs.org) 16 + TypeScript (telas e servidor no mesmo projeto)
- PostgreSQL com [Prisma](https://www.prisma.io) 7
- Tailwind CSS 4
- Login próprio: senha com bcrypt, sessão em cookie `httpOnly`, perfis com módulos permitidos

## Rodando no computador

Requisitos: Git, Node.js 22+ e Docker Desktop aberto (ou um PostgreSQL 16 já instalado).

Rode um comando por vez. Primeiro, crie o `.env` a partir do exemplo:

```powershell
Copy-Item .env.example .env
```

No Mac ou Linux, o equivalente é `cp .env.example .env`. Ajuste `ADMIN_EMAIL` e `ADMIN_SENHA` no `.env` se quiser. Depois:

```bash
docker compose up -d
npm install
npm run db:migrate
npm run db:seed
npm run dev
```

Abra http://localhost:3000 e entre com o e-mail e a senha do administrador definidos no `.env`.

### Logins de teste

| Perfil | E-mail | Senha |
| --- | --- | --- |
| Administrador (do `.env`) | `admin@vasnutri.local` | `troque-esta-senha` |
| Administrador | `teste.admin@vasnutri.local` | `teste-admin-123` |
| Comercial | `teste.comercial@vasnutri.local` | `teste-comercial-123` |
| Técnico | `teste.tecnico@vasnutri.local` | `teste-tecnico-123` |

O primeiro é criado pelo `npm run db:seed` com `ADMIN_EMAIL` e `ADMIN_SENHA` do `.env` (se você
mudou esses valores, vale o que está no seu `.env`). Os outros três são criados com:

```powershell
npm run db:usuarios-teste
```

Rodar de novo volta as senhas de teste. **Só para testes no computador:** em produção, não crie
esses usuários e troque a senha do administrador.

O banco do Docker usa a porta **5433** do computador, para não conflitar com um PostgreSQL
já instalado na 5432. Para usar outra, mude `DB_PORTA` e a porta da `DATABASE_URL` no `.env`.

## Comandos

| Comando | O que faz |
| --- | --- |
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` / `npm start` | Build e servidor de produção |
| `npm test` | Testes automáticos (Vitest) |
| `npm run lint` / `npm run typecheck` | Verificações de código |
| `npm run db:migrate` | Cria/aplica migrações no banco local |
| `npm run db:deploy` | Aplica migrações em produção |
| `npm run db:seed` | Dados iniciais (pode rodar de novo sem duplicar) |
| `npm run db:usuarios-teste` | Cria os usuários de teste (um por perfil) |
| `npm run db:studio` | Abre o Prisma Studio para ver os dados |
| `npm run migrar -- arquivo.xlsx` | Migração do AppSheet (veja abaixo) |

## O que o sistema faz

| Tela | Para quê |
| --- | --- |
| Painel | Processos por etapa, tempo médio em cada etapa, visitas do ciclo e avisos pendentes |
| Funil | Quadro com as 12 etapas; cada processo tem orçamento, contrato, checklist, histórico, mudança e retorno de etapa |
| Processo (parte técnica) | Coleta de dados com setores, visitas, plano de ação, pedidos de documento, placas, fotos e anexos |
| Clientes | Cadastro com CNPJ, endereço, contatos, serviços e gestor; "ativo" vem do contrato vigente |
| Visitas | Clientes na etapa 11 com visitas feitas x esperadas no ciclo e atrasos |
| Solicitações | Pedidos ao escritório com responsável, prazo, validação e anexos |
| Mapa de comercialização | Quem já pediu o mapa no ciclo, com botão para reiniciar o ciclo |
| Notificações | Mudanças de etapa, orçamento parado, contrato ou documento vencendo, visita atrasada, prazos |
| Cadastros | Motivos de recusa, serviços, tipos de documentação, checklist por etapa, perfis, permissões do funil e configurações |
| Usuários | Usuários, perfis, ativar/desativar e redefinir senha |

Os avisos automáticos são gerados quando alguém abre o sistema (no máximo uma vez por hora),
então não é preciso agendador no servidor. Os prazos ficam em Cadastros > Configurações.

## Uso no celular

O sistema se adapta à tela do celular:

- Barra de atalhos fixa embaixo (Painel, Funil, Clientes, Visitas) e o botão **Menu** com todas as telas, o usuário e o botão de sair.
- Sino de notificações no topo, com o número de não lidas.
- Tabelas viram cartões, um por linha, com o nome de cada coluna ao lado do valor.
- No funil, as etapas aparecem como atalhos no topo e as colunas encaixam ao deslizar para o lado.
- Na tela do processo, as ações (mudar de etapa, orçamento) vêm antes dos formulários longos.
- Campos com fonte de 16px, para o iPhone não dar zoom ao tocar.

## Fotos e anexos

Os arquivos enviados ficam na pasta `armazenamento/` do projeto (ou na pasta definida em
`ARQUIVOS_DIR` no `.env`). O banco guarda só o caminho. Faça backup dessa pasta junto com o banco.

## Migração dos dados do AppSheet

A planilha do AppSheet não é alterada: o script lê uma cópia baixada.

1. No Google Planilhas, abra a planilha do AppSheet e use **Arquivo > Fazer download > Microsoft Excel (.xlsx)**.
2. Salve o arquivo na pasta do projeto como `appsheet.xlsx`.
3. Com o banco recém-criado (`npm run db:migrate` e `npm run db:seed`), simule a migração:

```powershell
npm run migrar -- appsheet.xlsx
```

4. Leia o relatório (também salvo em `migracao-relatorio.txt`). Se estiver tudo certo, grave:

```powershell
npm run migrar -- appsheet.xlsx --aplicar
```

O que o script faz:

- Usuários vêm da aba `usuarios`, **sem as senhas**. O perfil sai das telas que cada um via
  (Gestão dos usuários = Administrador, Comercial = Comercial, senão Técnico). Depois da migração,
  defina uma senha para cada um em Usuários > Redefinir senha.
- Clientes vêm das abas `Clientes`, `baseprincipal` e `solicitacaoEscritorio`, juntados pelo CNPJ.
- Cada linha da `baseprincipal` vira um processo com o mesmo nº de orçamento; as colunas Sim/Não
  viram itens do checklist; o histórico vem da aba `historico`.
- Nomes digitados em "Responsável" são ligados ao usuário quando o primeiro nome bate
  (ex.: "Pedro Tirello" → pedro@...). Quando não bate, o texto fica nas observações.
- Coleta de dados, setores, visitas, plano de ação, placas, documentos, solicitações,
  mapa de comercialização, anexos, fotos e atividades também são migrados.
- Linhas que apontam para um processo que não existe mais (testes antigos) são puladas e listadas no relatório.
- Só roda num funil vazio e só pode ser gravada uma vez, para não duplicar dados.

Fotos e anexos: o AppSheet guarda os arquivos no Google Drive, em pastas como `anexos_Files_`,
`anexos_Images` e `fotos_Images` (dentro da pasta do app). Baixe essas pastas e copie para
`armazenamento/appsheet/`, mantendo os nomes. O relatório avisa quantos arquivos ainda faltam.

## Organização

```
prisma/schema.prisma      modelo de dados
prisma/seed.ts            dados iniciais
scripts/migrar-appsheet.ts migração da planilha do AppSheet
src/app/login             tela de login
src/app/(app)             telas logadas (menu lateral)
src/app/(app)/funil       funil, processo e parte técnica
src/lib/funil             regras e mudança de etapa
src/lib/alertas.ts        avisos automáticos
src/lib/auth              sessão, login e permissões
```

## Perfis

| Perfil | Módulos |
| --- | --- |
| Administrador | todos |
| Comercial | Painel, Funil, Clientes, Solicitações, Mapa de comercialização |
| Técnico | Painel, Funil, Clientes, Visitas, Solicitações |

Os módulos de cada perfil podem ser mudados em Cadastros > Perfis.

### Permissões do funil (Cadastros > Permissões do funil)

1. **Quem altera em cada etapa:** para cada etapa, os perfis que podem mexer no processo (dados,
   checklist, visitas, arquivos, mudança de etapa). Os outros só veem. O Administrador pode sempre.
2. **Edição por etapa:** para cada campo do contrato, as etapas em que ele pode ser editado. Nas
   outras ele aparece travado.
3. **Informações sensíveis:** campos marcados como sensíveis só aparecem para os perfis escolhidos
   (e para o Administrador).

Tudo começa liberado; as regras valem também no servidor, não só na tela.

## Regras de negócio

- Número do orçamento gerado pelo banco (sem repetição).
- Só passa do Comercial com o orçamento aprovado, e só sai do Agendamento de treinamento com o treinamento feito.
- Valor do contrato visível só nas etapas 1 a 4.
- Ciclos de contrato: na etapa 11 as visitas são contadas por ciclo; no fim do contrato, uma pessoa
  confirma o encerramento e o processo volta para o Agendamento de diagnóstico.
- Recusa sempre com motivo cadastrado; orçamento recusado pode ser recuperado.
- "Um processo ativo por cliente" é uma configuração, não uma trava do banco.
- O log de acessos nunca guarda senha.
