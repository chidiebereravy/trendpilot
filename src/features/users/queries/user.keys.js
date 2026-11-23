export const userQueryKeys = {
  all: ["users"],

  lists: () => [...userQueryKeys.all, "list"],

  dashboardList: (filters = {}) => [
    ...userQueryKeys.lists(),
    "dashboard",
    filters,
  ],
};
