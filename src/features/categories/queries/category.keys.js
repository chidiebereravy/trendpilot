export const categoryQueryKeys = {
  all: ["categories"],

  lists: () => [...categoryQueryKeys.all, "list"],

  list: (filters = {}) => [...categoryQueryKeys.lists(), filters],

  details: () => [...categoryQueryKeys.all, "detail"],

  detail: (categoryId) => [...categoryQueryKeys.details(), categoryId],
};
