export const authQueryKeys = {
  all: ["auth"],
  session: () => [...authQueryKeys.all, "session"],
};
