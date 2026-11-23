export const authorQueryKeys = {
  all: ["authors"],

  lists: () => [...authorQueryKeys.all, "list"],

  dashboardList: (filters = {}) => [
    ...authorQueryKeys.lists(),
    "dashboard",
    filters,
  ],
};
