export const analyticsKeys = {
  all: ["dashboard", "analytics"],
  detail: (range) => [...analyticsKeys.all, range],
};
