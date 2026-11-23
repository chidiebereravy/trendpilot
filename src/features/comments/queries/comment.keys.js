export const commentQueryKeys = {
  all: ["comments"],

  lists: () => [...commentQueryKeys.all, "list"],

  dashboardList: (filters = {}) => [
    ...commentQueryKeys.lists(),
    "dashboard",
    filters,
  ],

  articleList: (slug, filters = {}) => [
    ...commentQueryKeys.lists(),
    "article",
    slug,
    filters,
  ],

  options: () => [...commentQueryKeys.all, "options"],

  replies: (commentId, filters = {}) => [
    ...commentQueryKeys.all,
    "replies",
    commentId,
    filters,
  ],
};
