"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser, ForbiddenError, NotFoundError } from "@/lib/auth";
import { requireProjectRole } from "@/lib/authorization";
import { satisfiesRole } from "@/lib/roles";
import { logActivity } from "@/lib/activity";
import { assertRateLimited, actionError, type ActionResult } from "@/lib/rate-limit";
import {
  updateDatasetSchema,
  datasetIdSchema,
  restoreVersionSchema,
} from "@/features/datasets/schemas";

/**
 * Server Actions for the Datasets module.
 *
 * House rules, applied uniformly:
 *  1. `requireUser()` first — never trust a client-supplied user id.
 *  2. Validate with Zod before touching the database.
 *  3. Resolve the dataset's project, then `requireProjectRole()` — dataset access
 *     is inherited from project access.
 *  4. Rate-limit mutations per user.
 *  5. Return `ActionResult` rather than throwing, so forms can render errors.
 *
 * Uploading is not here: it needs a multipart stream and progress reporting, so
 * it lives in a route handler instead.
 */

function revalidateDataset(datasetId?: string, projectId?: string) {
  revalidatePath("/dashboard/datasets");
  revalidatePath("/dashboard");
  if (datasetId) revalidatePath(`/dashboard/datasets/${datasetId}`);
  if (projectId) revalidatePath(`/dashboard/projects/${projectId}`);
}

/**
 * Loads the fields needed to authorize a dataset mutation.
 *
 * Throws NotFoundError when the dataset does not exist. Callers must still run a
 * role check — this only resolves *which* project to check against.
 */
async function loadDatasetForAuth(datasetId: string) {
  const dataset = await prisma.dataset.findUnique({
    where: { id: datasetId },
    select: { id: true, name: true, projectId: true, uploadedById: true },
  });
  if (!dataset) throw new NotFoundError("Dataset not found");
  return dataset;
}

export async function updateDataset(input: unknown): Promise<ActionResult<undefined>> {
  try {
    const user = await requireUser();
    assertRateLimited(`dataset:update:${user.id}`, { limit: 40, windowMs: 60_000 });

    const { id, ...changes } = updateDatasetSchema.parse(input);
    const dataset = await loadDatasetForAuth(id);
    await requireProjectRole(user, dataset.projectId, "EDITOR");

    await prisma.dataset.update({
      where: { id },
      data: {
        ...(changes.name !== undefined ? { name: changes.name } : {}),
        ...(changes.description !== undefined
          ? { description: changes.description || null }
          : {}),
      },
    });

    await logActivity({
      actorId: user.id,
      action: "DATASET_UPDATED",
      projectId: dataset.projectId,
      metadata: { entityName: changes.name ?? dataset.name, datasetId: id },
    });

    revalidateDataset(id, dataset.projectId);
    return { success: true, data: undefined };
  } catch (error) {
    return actionError(error);
  }
}

export async function deleteDataset(input: unknown): Promise<ActionResult<undefined>> {
  try {
    const user = await requireUser();
    assertRateLimited(`dataset:delete:${user.id}`, { limit: 20, windowMs: 60_000 });

    const { id } = datasetIdSchema.parse(input);
    const dataset = await loadDatasetForAuth(id);

    // An EDITOR may reshape data but must not destroy a colleague's upload.
    // Deleting requires ADMIN on the project, or having uploaded it yourself.
    const role = await requireProjectRole(user, dataset.projectId, "VIEWER");
    const isUploader = dataset.uploadedById === user.id;
    if (!satisfiesRole(role, "ADMIN") && !isUploader) {
      throw new ForbiddenError(
        "Only a project admin or the person who uploaded this dataset can delete it"
      );
    }

    // Cascades remove versions, and detach reports and charts.
    await prisma.dataset.delete({ where: { id } });

    await logActivity({
      actorId: user.id,
      action: "DATASET_DELETED",
      projectId: dataset.projectId,
      metadata: { entityName: dataset.name },
    });

    revalidateDataset(undefined, dataset.projectId);
    return { success: true, data: undefined };
  } catch (error) {
    return actionError(error);
  }
}

/**
 * Promotes a historical version to be the dataset's current state.
 *
 * This appends a new version rather than rewinding the history, so restoring is
 * itself an auditable, reversible event — nothing is ever discarded.
 */
export async function restoreDatasetVersion(
  input: unknown
): Promise<ActionResult<{ version: number }>> {
  try {
    const user = await requireUser();
    assertRateLimited(`dataset:restore:${user.id}`, { limit: 20, windowMs: 60_000 });

    const { datasetId, versionId } = restoreVersionSchema.parse(input);
    const dataset = await loadDatasetForAuth(datasetId);
    await requireProjectRole(user, dataset.projectId, "EDITOR");

    // Scoped by datasetId as well as id, so a version id from another dataset
    // can't be redirected into this one.
    const source = await prisma.datasetVersion.findFirst({
      where: { id: versionId, datasetId },
      select: { version: true, label: true, storagePath: true, rowCount: true, checksum: true },
    });
    if (!source) throw new NotFoundError("Version not found");

    const latest = await prisma.datasetVersion.findFirst({
      where: { datasetId },
      orderBy: { version: "desc" },
      select: { version: true },
    });
    const nextVersion = (latest?.version ?? 0) + 1;

    await prisma.$transaction([
      prisma.datasetVersion.create({
        data: {
          datasetId,
          version: nextVersion,
          label: `Restored from v${source.version}`,
          storagePath: source.storagePath,
          rowCount: source.rowCount,
          checksum: source.checksum,
        },
      }),
      prisma.dataset.update({
        where: { id: datasetId },
        data: {
          storagePath: source.storagePath,
          rowCount: source.rowCount,
          checksum: source.checksum,
          status: "READY",
          errorMessage: null,
        },
      }),
    ]);

    await logActivity({
      actorId: user.id,
      action: "DATASET_VERSION_RESTORED",
      projectId: dataset.projectId,
      metadata: {
        entityName: dataset.name,
        datasetId,
        restoredFrom: source.version,
        newVersion: nextVersion,
      },
    });

    revalidateDataset(datasetId, dataset.projectId);
    return { success: true, data: { version: nextVersion } };
  } catch (error) {
    return actionError(error);
  }
}
