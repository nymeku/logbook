import { Button, EmptyState } from "@chakra-ui/react";
import { Outlet, useRouteError } from "react-router";
import { DashboardLayout } from "../../../components/layouts/dashboard-layout";

export const ErrorBoundary = () => {
  const error = useRouteError() as Error | undefined;
  return (
    <EmptyState.Root>
      <EmptyState.Content>
        <EmptyState.Title>Une erreur est survenue</EmptyState.Title>
        <EmptyState.Description>{error?.message}</EmptyState.Description>
        <Button size='sm' onClick={() => window.location.reload()}>
          Recharger la page
        </Button>
      </EmptyState.Content>
    </EmptyState.Root>
  );
};

const AppRoot = () => {
  return (
    <DashboardLayout>
      <Outlet />
    </DashboardLayout>
  );
};

export default AppRoot;
