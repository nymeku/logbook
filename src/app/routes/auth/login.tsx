import { Heading, Text } from "@chakra-ui/react";
import { AuthLayout } from "../../../components/layouts/auth-layout";
import LoginForm from "../../../features/login/components/login-form";

const LoginRoute = () => {
  return (
    <AuthLayout>
      <Heading size='xl'>Logbook</Heading>
      <Text color='fg.muted' mb={6}>
        Connecte-toi avec une clé API Stripe pour voir et exporter les abonnés.
      </Text>
      <LoginForm />
    </AuthLayout>
  );
};

export default LoginRoute;
