export const affiliateKeys = {
  all: ["dashboard", "affiliate"],

  links: () => [...affiliateKeys.all, "links"],
  linkList: (filters) => [...affiliateKeys.links(), filters],

  linkStats: () => [...affiliateKeys.links(), "stats"],

  linkDetail: (linkId) => [...affiliateKeys.links(), "detail", linkId],

  articlePlacements: (articleId) => [
    ...affiliateKeys.all,
    "article-placements",
    articleId,
  ],

  programs: () => [...affiliateKeys.all, "programs"],
  programList: (filters) => [...affiliateKeys.programs(), filters],
};
