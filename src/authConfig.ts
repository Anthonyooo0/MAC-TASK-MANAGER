import { Configuration } from "@azure/msal-browser";

export const msalConfig: Configuration = {
  auth: {
    clientId: "89dd1228-06e7-4368-89d3-bcec7afb521a",
    authority: "https://login.microsoftonline.com/422e0e56-e8fe-4fc5-8554-b9b89f3cadac",
    redirectUri: window.location.origin,
    postLogoutRedirectUri: window.location.origin,
  },
  cache: { cacheLocation: "sessionStorage" },
};

export const loginRequest = { scopes: [] };
export const ALLOWED_DOMAIN = "macproducts.net";
