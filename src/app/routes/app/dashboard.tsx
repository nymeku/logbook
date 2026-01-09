import { HStack, Text, VStack } from "@chakra-ui/react";
import CustomersList from "../../../features/customers/components/customers-list";
import ExportCsvButton from "../../../features/export-csv/components/export-csv-button";

const DashboardRoute = () => {
  return (
    <VStack>
      <HStack p={4} align='center' w={"full"} gap={20}>
        <Text fontSize='2xl' fontWeight='bold'>
          Logbook
        </Text>
        <ExportCsvButton />
      </HStack>
      <CustomersList />
    </VStack>
  );
};

export default DashboardRoute;
