import type { FileTagItem } from "./api";

export type TagSetter = (itemId: number, tagIds: number[]) => Promise<FileTagItem[]>;

export function tagIdsFrom(tags: FileTagItem[] | undefined): number[] {
  return tags?.map((t) => t.id) ?? [];
}

export async function pinTagOnItem(
  setter: TagSetter,
  itemId: number,
  tags: FileTagItem[] | undefined,
  tagId: number,
): Promise<FileTagItem[]> {
  const ids = tagIdsFrom(tags);
  if (ids.includes(tagId)) return tags ?? [];
  return setter(itemId, [...ids, tagId]);
}

export async function unpinTagFromItem(
  setter: TagSetter,
  itemId: number,
  tags: FileTagItem[] | undefined,
  tagId: number,
): Promise<FileTagItem[]> {
  return setter(itemId, tagIdsFrom(tags).filter((id) => id !== tagId));
}
