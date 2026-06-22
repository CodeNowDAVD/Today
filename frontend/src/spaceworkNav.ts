export type SpaceworkTab =
  | "items"
  | "tasks"
  | "wiki"
  | "presentation"
  | "chat"
  | "members"
  | "activity";

export type SpaceworkNavTarget = {
  projectId: number;
  tab?: SpaceworkTab;
  wikiSlug?: string;
  fileId?: number;
};
