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

Requisitos: Node.js 22+ e Docker (ou um PostgreSQL 16 já instalado).

```bash
cp .env.example .env          # ajuste ADMIN_EMAIL e ADMIN_SENHA
docker compose up -d          # sobe o banco
npm install
npm run db:migrate            # cria as tabelas
npm run db:seed               # etapas, checklist, perfis e o primeiro administrador
npm run dev                   # http://localhost:3000
```

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
| `npm run db:studio` | Abre o Prisma Studio para ver os dados |

## Organização

```
prisma/schema.prisma      modelo de dados completo (todas as entregas)
prisma/seed.ts            dados iniciais
src/app/login             tela de login
src/app/(app)             telas logadas (menu lateral + painel)
src/lib/auth              sessão, login e permissões
src/lib/modulos.ts        menu e módulos por perfil
```

## Perfis

| Perfil | Módulos |
| --- | --- |
| Administrador | todos |
| Comercial | Painel, Funil, Clientes, Solicitações, Mapa de comercialização |
| Técnico | Painel, Funil, Clientes, Visitas, Solicitações |

## Regras de negócio já no modelo

- Número do orçamento gerado pelo banco (sem repetição).
- Valor do contrato visível só nas etapas marcadas com `exibe_valor_contrato` (1 a 4).
- Checklist por etapa em tabela (não mais colunas fixas).
- Ciclos de contrato (`processo_ciclos`): na etapa 11, visitas periódicas; no fim, após
  confirmação de uma pessoa, o processo volta para a etapa 7.
- "Um processo ativo por cliente" é uma configuração (`configuracoes`), não uma trava do banco.
- O log de acessos nunca guarda senha.

## Plano de entregas

1. **Base, banco e login com perfis** (esta)
2. Cadastros: clientes, usuários, motivos de recusa, etapas e checklist
3. Funil: processos, mudança de etapa com histórico, orçamento
4. Parte técnica: coleta de dados, setores, visitas, plano de ação, solicitações e arquivos
5. Ciclos do contrato e notificações
6. Migração da planilha do AppSheet
