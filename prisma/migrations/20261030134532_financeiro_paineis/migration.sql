-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "Modulo" ADD VALUE 'FINANCEIRO';
ALTER TYPE "Modulo" ADD VALUE 'DESPESAS';
ALTER TYPE "Modulo" ADD VALUE 'INDICADORES';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "TipoNotificacao" ADD VALUE 'CONTRATO_MARCO';
ALTER TYPE "TipoNotificacao" ADD VALUE 'PARCELA_VENCIDA';

-- AlterTable
ALTER TABLE "arquivos" ADD COLUMN     "despesa_id" UUID,
ADD COLUMN     "parcela_id" UUID;

-- AlterTable
ALTER TABLE "processo_etapas_historico" ADD COLUMN     "autor_id" UUID;

-- AlterTable
ALTER TABLE "visitas" ADD COLUMN     "duracao_prevista_min" INTEGER;

-- CreateTable
CREATE TABLE "parcelas" (
    "id" UUID NOT NULL,
    "processo_id" UUID NOT NULL,
    "competencia" DATE NOT NULL,
    "vencimento" DATE NOT NULL,
    "valor" DECIMAL(12,2) NOT NULL,
    "recebido_em" DATE,
    "valor_recebido" DECIMAL(12,2),
    "baixado_por_id" UUID,
    "numero_nf" TEXT,
    "observacao" TEXT,
    "cancelada" BOOLEAN NOT NULL DEFAULT false,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "parcelas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categorias_despesa" (
    "id" UUID NOT NULL,
    "nome" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "categorias_despesa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "despesas" (
    "id" UUID NOT NULL,
    "usuario_id" UUID NOT NULL,
    "categoria_id" UUID NOT NULL,
    "cliente_id" UUID,
    "data" DATE NOT NULL,
    "valor" DECIMAL(12,2) NOT NULL,
    "descricao" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "despesas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "parcelas_vencimento_idx" ON "parcelas"("vencimento");

-- CreateIndex
CREATE UNIQUE INDEX "parcelas_processo_id_competencia_key" ON "parcelas"("processo_id", "competencia");

-- CreateIndex
CREATE UNIQUE INDEX "categorias_despesa_nome_key" ON "categorias_despesa"("nome");

-- CreateIndex
CREATE INDEX "despesas_data_idx" ON "despesas"("data");

-- CreateIndex
CREATE INDEX "despesas_usuario_id_data_idx" ON "despesas"("usuario_id", "data");

-- CreateIndex
CREATE INDEX "despesas_cliente_id_idx" ON "despesas"("cliente_id");

-- CreateIndex
CREATE INDEX "arquivos_parcela_id_idx" ON "arquivos"("parcela_id");

-- CreateIndex
CREATE INDEX "arquivos_despesa_id_idx" ON "arquivos"("despesa_id");

-- AddForeignKey
ALTER TABLE "processo_etapas_historico" ADD CONSTRAINT "processo_etapas_historico_autor_id_fkey" FOREIGN KEY ("autor_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "arquivos" ADD CONSTRAINT "arquivos_parcela_id_fkey" FOREIGN KEY ("parcela_id") REFERENCES "parcelas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "arquivos" ADD CONSTRAINT "arquivos_despesa_id_fkey" FOREIGN KEY ("despesa_id") REFERENCES "despesas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parcelas" ADD CONSTRAINT "parcelas_processo_id_fkey" FOREIGN KEY ("processo_id") REFERENCES "processos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parcelas" ADD CONSTRAINT "parcelas_baixado_por_id_fkey" FOREIGN KEY ("baixado_por_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "despesas" ADD CONSTRAINT "despesas_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "despesas" ADD CONSTRAINT "despesas_categoria_id_fkey" FOREIGN KEY ("categoria_id") REFERENCES "categorias_despesa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "despesas" ADD CONSTRAINT "despesas_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "clientes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
