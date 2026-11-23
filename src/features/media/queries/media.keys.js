export const mediaQueryKeys = {
  all: ["media"],

  lists: () => [...mediaQueryKeys.all, "list"],

  list: (filters = {}) => [...mediaQueryKeys.lists(), filters],

  details: () => [...mediaQueryKeys.all, "detail"],

  detail: (mediaId) => [...mediaQueryKeys.details(), mediaId],
};
