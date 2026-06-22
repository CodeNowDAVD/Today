export type LifeView = "today" | "tasks" | "inbox" | "workspaces" | "contacts";

export type LifeNavTarget = {
  view: LifeView;
  workspaceId?: number;
  taskId?: number;
  contactId?: number;
  inboxId?: number;
};
