export const paths = {
  home: {
    path: "/",
    getHref: () => "/",
  },
  auth: {
    login: {
      path: "/login",
      getHref: () => "/login",
    },
  },
  app: {
    root: {
      path: "/app",
      getHref: () => "/app",
    },
    dashboard: {
      path: "",
      getHref: () => "/app",
    },
  },
};
