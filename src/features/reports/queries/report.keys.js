export const reportKeys = {
  all: ["reports"],

  lists: () => [...reportKeys.all, "list"],

  list: (filters = {}) => [...reportKeys.lists(), filters],
};
