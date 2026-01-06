import LoginForm from "../../../features/login/components/login-form";
import { AuthLayout } from "../../../components/layouts/auth-layout";

const LoginRoute = () => {
  return (
    <AuthLayout>
      <h1>Connexion Stripe</h1>
      <LoginForm />
    </AuthLayout>
  );
};

export default LoginRoute;
