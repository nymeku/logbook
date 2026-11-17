import { Box, Flex } from "@chakra-ui/react";
import { Navigate } from "react-router";
import { paths } from "../../config/paths";
import { getStripeApiKey } from "../../lib/stripe";

export function AuthLayout({ children }: { children: React.ReactNode }) {
  if (getStripeApiKey()) {
    return <Navigate to={paths.app.dashboard.getHref()} replace />;
  }
  return (
    <Flex minH='100vh' align='center' justify='center' bg='bg.subtle' p={4}>
      <Box as='main' w='full' maxW='520px' bg='bg' borderWidth='1px' borderRadius='lg' p={8} shadow='sm'>
        {children}
      </Box>
    </Flex>
  );
}
