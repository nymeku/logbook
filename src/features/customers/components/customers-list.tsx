import { Box, Button, Flex, Spinner, Text, Table } from "@chakra-ui/react";
import { useCustomers } from "../api/get-customers";
import type Stripe from "stripe";

// Copy-paste Address interface from @shared.d.ts (21-51)
interface Address {
  city: string | null;
  country: string | null;
  line1: string | null;
  line2: string | null;
  postal_code: string | null;
  state: string | null;
}

// Define the Shipping interface as described, using the Address from above
interface Shipping {
  address?: Address;
  carrier?: string | null;
  name?: string;
  phone?: string | null;
  tracking_number?: string | null;
}

// Helper: Format shipping address as one line
const formatShippingAddress = (shipping: Shipping | null | undefined) => {
  if (!shipping?.address) return "";
  const address = shipping.address;
  const parts: string[] = [];
  if (address.line1) parts.push(address.line1);
  if (address.line2) parts.push(address.line2);
  const cityStatePostal = [address.city, address.state, address.postal_code]
    .filter(Boolean)
    .join(", ");
  if (cityStatePostal) parts.push(cityStatePostal);
  if (address.country) parts.push(address.country);
  return parts.join(" | ");
};

const CustomersList = () => {
  const customersQuery = useCustomers();
  const customers = customersQuery.data?.pages.flatMap((page) => page.data);

  if (customersQuery.isLoading) {
    return (
      <Flex justify='center' align='center' py={10}>
        <Spinner size='xl' />
        <Text ml={4}>Loading...</Text>
      </Flex>
    );
  }

  if (customersQuery.isError) {
    return (
      <Flex justify='center' align='center' py={10}>
        <Text color='red.500'>Error: {customersQuery.error.message}</Text>
      </Flex>
    );
  }

  return (
    <Box p={4} width='100%' overflowX='auto'>
      <Table.Root size='sm'>
        <Table.Header>
          <Table.Row>
            <Table.ColumnHeader>Email</Table.ColumnHeader>
            <Table.ColumnHeader>Name</Table.ColumnHeader>
            <Table.ColumnHeader>Shipping Name</Table.ColumnHeader>
            <Table.ColumnHeader>Shipping Address</Table.ColumnHeader>
            <Table.ColumnHeader>Carrier</Table.ColumnHeader>
            <Table.ColumnHeader>Tracking #</Table.ColumnHeader>
            <Table.ColumnHeader>Phone</Table.ColumnHeader>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {customers?.map((customer: Stripe.Customer) => {
            const shipping = customer.shipping as Shipping | undefined;
            return (
              <Table.Row key={customer.id}>
                <Table.Cell>{customer.email}</Table.Cell>
                <Table.Cell>{customer.name || "-"}</Table.Cell>
                <Table.Cell>{shipping?.name || "-"}</Table.Cell>
                <Table.Cell>
                  {shipping ? formatShippingAddress(shipping) : "-"}
                </Table.Cell>
                <Table.Cell>{shipping?.carrier || "-"}</Table.Cell>
                <Table.Cell>{shipping?.tracking_number || "-"}</Table.Cell>
                <Table.Cell>{shipping?.phone || "-"}</Table.Cell>
              </Table.Row>
            );
          })}
        </Table.Body>
      </Table.Root>
      {customersQuery.hasNextPage && (
        <Flex justify='center' mt={8}>
          <Button
            colorScheme='blue'
            onClick={() => customersQuery.fetchNextPage()}
            loading={customersQuery.isFetchingNextPage}
          >
            {customersQuery.isFetchingNextPage
              ? "Loading more..."
              : "Load more"}
          </Button>
        </Flex>
      )}
    </Box>
  );
};

export default CustomersList;
