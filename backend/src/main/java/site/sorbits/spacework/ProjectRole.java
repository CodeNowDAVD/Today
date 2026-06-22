package site.sorbits.spacework;

public enum ProjectRole {
    OWNER,
    ADMIN,
    MEMBER,
    VIEWER;

    public boolean canManageMembers() {
        return this == OWNER || this == ADMIN;
    }

    public boolean canEditProject() {
        return this == OWNER || this == ADMIN;
    }

    public boolean canAddItems() {
        return this != VIEWER;
    }

    public boolean canRemoveAnyItem() {
        return this == OWNER || this == ADMIN;
    }
}
