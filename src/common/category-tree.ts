export type CategoryTreeItem = {
  id: number;
  name: string;
  slug: string;
  imageUrl?: string | null;
  description?: string | null;
  parentId: number | null;
  isActive?: boolean;
  sortOrder?: number;
};

export type CategoryLevelB = {
  id: number;
  name: string;
  slug: string;
  imageUrl?: string | null;
  description?: string | null;
  parentId: number | null;
  isActive?: boolean;
  sortOrder?: number;
};

export type CategoryLevelA = {
  id: number;
  name: string;
  slug: string;
  imageUrl?: string | null;
  description?: string | null;
  parentId: number | null;
  isActive?: boolean;
  sortOrder?: number;
  subcategoriesB: CategoryLevelB[];
};

export type CategoryTreeRoot = {
  id: number;
  name: string;
  slug: string;
  imageUrl?: string | null;
  description?: string | null;
  parentId: number | null;
  isActive?: boolean;
  sortOrder?: number;
  subcategoriesA: CategoryLevelA[];
};

function sortCategories<T extends { sortOrder?: number; id: number }>(items: T[]) {
  return [...items].sort(
    (left, right) => (left.sortOrder ?? 0) - (right.sortOrder ?? 0) || left.id - right.id,
  );
}

export function buildCategoryTree(items: CategoryTreeItem[]): CategoryTreeRoot[] {
  const byParentId = new Map<number | null, CategoryTreeItem[]>();

  for (const item of items) {
    const siblings = byParentId.get(item.parentId) ?? [];
    siblings.push(item);
    byParentId.set(item.parentId, siblings);
  }

  const roots = sortCategories(byParentId.get(null) ?? []);

  return roots.map((root) => {
    const subcategoriesA = sortCategories(byParentId.get(root.id) ?? []).map((subA) => ({
      ...subA,
      subcategoriesB: sortCategories(byParentId.get(subA.id) ?? []).map((subB) => ({
        ...subB,
      })),
    }));

    return {
      ...root,
      subcategoriesA,
    };
  });
}
