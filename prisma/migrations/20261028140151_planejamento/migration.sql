-- CreateEnum
CREATE TYPE "StatusVisita" AS ENUM ('AGENDADA', 'EM_ANDAMENTO', 'CONCLUIDA');

-- AlterEnum
ALTER TYPE "Modulo" ADD VALUE 'PLANEJAMENTO';

-- AlterEnum
ALTER TYPE "TipoNotificacao" ADD VALUE 'VISITA_AGENDADA';

-- AlterTable
ALTER TABLE "arquivos" ADD COLUMN     "visita_id" UUID;

-- AlterTable
ALTER TABLE "visitas" ADD COLUMN     "agendada_para" TIMESTAMP(3),
ADD COLUMN     "agendada_por_id" UUID,
ADD COLUMN     "status" "StatusVisita" NOT NULL DEFAULT 'CONCLUIDA';

-- CreateTable
CREATE TABLE "checklist_visita_itens" (
    "id" UUID NOT NULL,
    "descricao" TEXT NOT NULL,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "ativo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "checklist_visita_itens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "visita_checklist" (
    "visita_id" UUID NOT NULL,
    "item_id" UUID NOT NULL,

    CONSTRAINT "visita_checklist_pkey" PRIMARY KEY ("visita_id","item_id")
);

-- CreateTable
CREATE TABLE "planejamento_perfis" (
    "perfil_id" UUID NOT NULL,
    "criar" BOOLEAN NOT NULL DEFAULT true,
    "mover" BOOLEAN NOT NULL DEFAULT true,
    "iniciar" BOOLEAN NOT NULL DEFAULT true,
    "finalizar" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "planejamento_perfis_pkey" PRIMARY KEY ("perfil_id")
);

-- CreateTable
CREATE TABLE "planejamento_colunas" (
    "usuario_id" UUID NOT NULL,
    "ordem" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "planejamento_colunas_pkey" PRIMARY KEY ("usuario_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "checklist_visita_itens_descricao_key" ON "checklist_visita_itens"("descricao");

-- CreateIndex
CREATE INDEX "arquivos_visita_id_idx" ON "arquivos"("visita_id");

-- CreateIndex
CREATE INDEX "visitas_inicio_idx" ON "visitas"("inicio");

-- AddForeignKey
ALTER TABLE "visitas" ADD CONSTRAINT "visitas_agendada_por_id_fkey" FOREIGN KEY ("agendada_por_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visita_checklist" ADD CONSTRAINT "visita_checklist_visita_id_fkey" FOREIGN KEY ("visita_id") REFERENCES "visitas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visita_checklist" ADD CONSTRAINT "visita_checklist_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "checklist_visita_itens"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "arquivos" ADD CONSTRAINT "arquivos_visita_id_fkey" FOREIGN KEY ("visita_id") REFERENCES "visitas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "planejamento_perfis" ADD CONSTRAINT "planejamento_perfis_perfil_id_fkey" FOREIGN KEY ("perfil_id") REFERENCES "perfis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "planejamento_colunas" ADD CONSTRAINT "planejamento_colunas_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
