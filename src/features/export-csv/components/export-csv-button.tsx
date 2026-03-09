import { Box, Button, HStack, Text, VStack } from "@chakra-ui/react";
import {
  exportCsvCommaFormula,
  exportCsvSemicolonFormula,
  exportCsvStandard,
} from "../api/export-subscriptions-csv";
import { useSubscriptions } from "../../subscriptions/api/get-subscriptions";
import { Info } from "lucide-react";

const ExportCsvButton = () => {
  const subscriptionsQuery = useSubscriptions();
  const subscriptions = subscriptionsQuery.data?.pages.flatMap(
    (page) => page.data
  );

  const activeCount =
    subscriptions?.filter((s) => s.status !== "canceled").length ?? 0;

  const handleExport = (
    exportFn: (subs: import("stripe").default.Subscription[]) => void
  ) => {
    if (subscriptions) {
      exportFn(subscriptions);
    }
  };

  return (
    <>
      {subscriptions && subscriptions.length > 0 ? (
        <Box spaceY={2}>
          <Text fontSize="sm" fontWeight="bold">
            {activeCount} subscriptions to export
          </Text>
          <VStack align="start" gap={2}>
            <Button
              onClick={() => handleExport(exportCsvCommaFormula)}
              size="sm"
              colorPalette="blue"
            >
              Export 1 — Formule (virgule)
            </Button>
            <Button
              onClick={() => handleExport(exportCsvSemicolonFormula)}
              size="sm"
              colorPalette="teal"
            >
              Export 2 — Formule (point-virgule)
            </Button>
            <Button
              onClick={() => handleExport(exportCsvStandard)}
              size="sm"
              variant="outline"
            >
              Export 3 — Standard
            </Button>
          </VStack>
          <HStack>
            <Info size={16} color="gray" />
            <Text fontSize="sm" color="gray.500">
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
