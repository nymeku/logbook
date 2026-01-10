import { HStack, Text, VStack } from "@chakra-ui/react";
import ExportCsvButton from "../../../features/export-csv/components/export-csv-button";
import SubscriptionsList from "../../../features/subscriptions/components/subscriptions-list";

const DashboardRoute = () => {
  return (
    <VStack>
      <HStack p={4} align='start' w={"full"} gap={20}>
        <Text fontSize='2xl' fontWeight='bold'>
          Logbook
        </Text>
        <ExportCsvButton />
      </HStack>
      {/* <CustomersList /> */}
      <SubscriptionsList />
    </VStack>
  );
};

export default DashboardRoute;
