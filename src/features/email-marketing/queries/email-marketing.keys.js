export const emailMarketingKeys = {
  all: ["email-marketing"],

  campaigns: () => [...emailMarketingKeys.all, "campaigns"],

  campaignList: (filters = {}) => [...emailMarketingKeys.campaigns(), filters],

  campaignDetail: (campaignId) => [
    ...emailMarketingKeys.campaigns(),
    campaignId,
  ],

  subscribers: () => [...emailMarketingKeys.all, "subscribers"],

  subscriberList: (filters = {}) => [
    ...emailMarketingKeys.subscribers(),
    filters,
  ],

  reports: () => [...emailMarketingKeys.all, "reports"],

  report: (filters = {}) => [...emailMarketingKeys.reports(), filters],
};
