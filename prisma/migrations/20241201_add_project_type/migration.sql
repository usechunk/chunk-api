-- CreateEnum
CREATE TYPE "ProjectType" AS ENUM ('MOD', 'MODPACK', 'RESOURCEPACK', 'SHADER', 'PLUGIN', 'DATAPACK');

-- AlterTable
ALTER TABLE "modpacks" ADD COLUMN "project_type" "ProjectType" NOT NULL DEFAULT 'MODPACK';

-- CreateIndex
CREATE INDEX "modpacks_project_type_idx" ON "modpacks"("project_type");
