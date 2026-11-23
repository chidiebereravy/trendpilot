export const articleQueryKeys = {
  all: ["articles"],

  lists: () => [...articleQueryKeys.all, "list"],

  list: (filters = {}) => [...articleQueryKeys.lists(), filters],

  details: () => [...articleQueryKeys.all, "detail"],

  detail: (articleId) => [...articleQueryKeys.details(), articleId],
};
