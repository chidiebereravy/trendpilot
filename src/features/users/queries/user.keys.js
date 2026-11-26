export const userQueryKeys = {
  all: ["users"],

  lists: () => [...userQueryKeys.all, "list"],

  dashboardList: (filters = {}) => [
    ...userQueryKeys.lists(),
    "dashboard",
    filters,
  ],

  authorApplications: () => [...userQueryKeys.all, "author-applications"],

  authorApplicationLists: () => [...userQueryKeys.authorApplications(), "list"],

  adminAuthorApplications: (filters = {}) => [
    ...userQueryKeys.authorApplicationLists(),
    "admin",
    filters,
  ],
  editorInvitations: () => [...userQueryKeys.all, "editor-invitations"],

  editorInvitationLists: () => [...userQueryKeys.editorInvitations(), "list"],

  adminEditorInvitations: (filters = {}) => [
    ...userQueryKeys.editorInvitationLists(),
    "admin",
    filters,
  ],
  roleHistory: () => [...userQueryKeys.all, "role-history"],

  roleHistoryLists: () => [...userQueryKeys.roleHistory(), "list"],

  adminRoleHistory: (filters = {}) => [
    ...userQueryKeys.roleHistoryLists(),
    "admin",
    filters,
  ],
  myAuthorApplication: () => [...userQueryKeys.authorApplications(), "mine"],
};
