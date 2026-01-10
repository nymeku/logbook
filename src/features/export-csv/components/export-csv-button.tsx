import { Box, Button, HStack, Text } from "@chakra-ui/react";
import { exportSubscriptionsToCsv } from "../api/export-subscriptions-csv";
import { useSubscriptions } from "../../subscriptions/api/get-subscriptions";
import { Info } from "lucide-react";

const ExportCsvButton = () => {
  const subscriptionsQuery = useSubscriptions();
  const subscriptions = subscriptionsQuery.data?.pages.flatMap(
    (page) => page.data
  );
  const handleExportCsv = () => {
    if (subscriptions) {
      exportSubscriptionsToCsv(subscriptions);
    }
  };
  return (
    <>
      {subscriptions && subscriptions.length > 0 ? (
        <Box spaceY={1}>
          <Button onClick={handleExportCsv}>
            Export {subscriptions.filter((s) => s.status !== "canceled").length}{" "}
            subscriptions to CSV
          </Button>
          <HStack>
            <Info size={16} color='gray' />
            <Text fontSize='sm' color='gray.500'>
              canceled subscriptions are not included
            </Text>
          </HStack>
        </Box>
      ) : (
        <Text>No customers to export</Text>
      )}
    </>
  );
};

export default ExportCsvButton;
