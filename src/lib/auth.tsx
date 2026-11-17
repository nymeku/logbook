import { Navigate } from "react-router";
import { paths } from "../config/paths";
import { getStripeApiKey } from "./stripe";

export const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  if (!getStripeApiKey()) {
    return <Navigate to={paths.auth.login.getHref()} replace />;
  }
  return children;
};
