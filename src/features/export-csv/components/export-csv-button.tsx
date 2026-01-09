import { Button, Text } from "@chakra-ui/react";
import { useCustomers } from "../../customers/api/get-customers";
import { exportCustomersToCsv } from "../api/export-csv";

const ExportCsvButton = () => {
  const customersQuery = useCustomers();
  const customers = customersQuery.data?.pages.flatMap((page) => page.data);
  const handleExportCsv = () => {
    if (customers) {
      exportCustomersToCsv(customers);
    }
  };
  return (
    <>
      {customers && customers.length > 0 ? (
        <Button onClick={handleExportCsv}>
          Export {customers?.length} customers to CSV
        </Button>
      ) : (
        <Text>No customers to export</Text>
      )}
    </>
  );
};

export default ExportCsvButton;
