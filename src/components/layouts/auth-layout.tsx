import { useLocalStorage } from "react-use";
import { STRIPE_API_KEY } from "../../constants/stripe-api-key";
import { Navigate } from "react-router";
import { paths } from "../../config/paths";

export function AuthLayout({ children }: { children: React.ReactNode }) {
  const [apiKey] = useLocalStorage<string>(STRIPE_API_KEY, "");
  if (apiKey) {
    return <Navigate to={paths.app.dashboard.getHref()} replace />;
  }
  return (
    <div>
      <main>{children}</main>
    </div>
  );
}
