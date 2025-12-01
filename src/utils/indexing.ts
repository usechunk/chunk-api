import { prisma } from '../prisma.js';
import {
  ProjectDocument,
  indexProject,
  indexProjects,
  updateProjectIndex,
  removeProjectFromIndex,
} from '../services/meilisearch.js';

/**
 * Convert a database modpack record to a search document
 */
export function modpackToSearchDocument(
  modpack: {
    id: number;
    name: string;
    slug: string;
    description: string | null;
    projectType: string;
    mcVersion: string;
    loader: string;
    loaderVersion: string | null;
    downloads: number;
    authorId: number;
    licenseId: string | null;
    createdAt: Date;
    updatedAt: Date;
    author?: { username: string } | null;
    tags?: Array<{ tag: { slug: string } }>;
  }
): ProjectDocument {
  return {
    id: modpack.id,
    name: modpack.name,
    slug: modpack.slug,
    description: modpack.description,
    projectType: modpack.projectType,
    mcVersion: modpack.mcVersion,
    loader: modpack.loader,
    loaderVersion: modpack.loaderVersion,
    downloads: modpack.downloads,
    authorId: modpack.authorId,
    authorUsername: modpack.author?.username ?? '',
    licenseId: modpack.licenseId,
    tags: modpack.tags?.map((t) => t.tag.slug) ?? [],
    createdAt: modpack.createdAt.toISOString(),
    updatedAt: modpack.updatedAt.toISOString(),
  };
}

/**
 * Index a single project by its ID
 * Use after creating or publishing a project
 */
export async function indexProjectById(projectId: number): Promise<void> {
  const modpack = await prisma.modpack.findUnique({
    where: { id: projectId, isPublished: true },
    include: {
      author: { select: { username: true } },
      tags: { include: { tag: true } },
    },
  });

  if (!modpack) {
    // If project is not found or not published, try to remove it from index
    try {
      await removeProjectFromIndex(projectId);
    } catch {
      // Ignore errors when removing non-existent documents
    }
    return;
  }

  const document = modpackToSearchDocument(modpack);
  await indexProject(document);
}

/**
 * Update a project in the search index
 * Use after updating a project
 * 
 * Note: We intentionally query without filtering by isPublished because
 * we need to check if a project was unpublished to remove it from the index.
 */
export async function updateProjectInIndex(projectId: number): Promise<void> {
  const modpack = await prisma.modpack.findUnique({
    where: { id: projectId },
    include: {
      author: { select: { username: true } },
      tags: { include: { tag: true } },
    },
  });

  if (!modpack) {
    return;
  }

  // If unpublished, remove from index
  if (!modpack.isPublished) {
    try {
      await removeProjectFromIndex(projectId);
    } catch {
      // Ignore errors when removing non-existent documents
    }
    return;
  }

  const document = modpackToSearchDocument(modpack);
  await updateProjectIndex(document);
}

/**
 * Remove a project from the search index
 * Use after deleting a project
 */
export async function removeProjectById(projectId: number): Promise<void> {
  try {
    await removeProjectFromIndex(projectId);
  } catch {
    // Ignore errors when removing non-existent documents
  }
}

/**
 * Reindex all published projects
 * Use for bulk reindexing (e.g., initial setup or recovery)
 */
export async function reindexAllProjects(): Promise<{ indexed: number }> {
  const modpacks = await prisma.modpack.findMany({
    where: { isPublished: true },
    include: {
      author: { select: { username: true } },
      tags: { include: { tag: true } },
    },
  });

  const documents = modpacks.map(modpackToSearchDocument);
  await indexProjects(documents);

  return { indexed: documents.length };
}
