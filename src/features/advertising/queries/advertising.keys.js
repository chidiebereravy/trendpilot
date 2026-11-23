export const advertisingKeys = {
  all: ["dashboard", "advertising"],
  overview: () => [...advertisingKeys.all, "overview"],

  campaigns: () => [...advertisingKeys.all, "campaigns"],
  campaignList: (filters) => [...advertisingKeys.campaigns(), filters],

  networks: () => [...advertisingKeys.all, "networks"],
  networkList: (filters) => [...advertisingKeys.networks(), filters],

  advertisers: () => [...advertisingKeys.all, "advertisers"],
  advertiserList: (filters) => [...advertisingKeys.advertisers(), filters],

  placements: () => [...advertisingKeys.all, "placements"],
  placementList: (filters) => [...advertisingKeys.placements(), filters],

  sponsoredContent: () => [...advertisingKeys.all, "sponsored-content"],
  sponsoredContentList: (filters) => [
    ...advertisingKeys.sponsoredContent(),
    "list",
    filters,
  ],
  sponsoredContentOptions: (sponsoredContentId = null) => [
    ...advertisingKeys.sponsoredContent(),
    "options",
    sponsoredContentId,
  ],
};
