import { Navigate } from "react-router";
import { paths } from "../config/paths";
import { useLocalStorage } from "react-use";
import { STRIPE_API_KEY } from "../constants/stripe-api-key";

export const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const [apiKey] = useLocalStorage<string>(STRIPE_API_KEY, "");
  if (!apiKey) {
    return <Navigate to={paths.auth.login.getHref()} replace />;
  }
  return children;
};
