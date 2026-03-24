import {
  Box,
  Button,
  Flex,
  HStack,
  Spinner,
  Table,
  Text,
} from "@chakra-ui/react";
import type Stripe from "stripe";
import {
  ClipboardIconButton,
  ClipboardRoot,
  ClipboardTrigger,
} from "../../../components/ui/clipboard";
import { useSubscriptions } from "../api/get-subscriptions";
import { Tooltip } from "../../../components/ui/tooltip";

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

// Helper: Determine if the row should have a red or yellow background
const getRowHighlight = (status: Stripe.Subscription.Status) => {
  // "past_due" is highlighted yellow
  if (status === "past_due") {
    return { bg: "yellow.100", color: "yellow.600" };
  }
  // "canceled", "incomplete", "incomplete_expired", "unpaid" are highlighted red
  if (
    status === "canceled" ||
    status === "incomplete" ||
    status === "incomplete_expired" ||
    status === "unpaid"
  ) {
    return { bg: "red.100", color: "red.500" };
  }
  // Default, no highlight
  return { bg: undefined, color: undefined };
};

// Helper: Determine if a postal code starts with "0"
const isZeroPostalCode = (postal_code?: string | null) => {
  if (!postal_code) return false;
  // Trim possible quotes/formulas and check first actual char
  let s = postal_code.trim();
  // Remove common Excel formula for postal codes
  if (s.startsWith('="') && s.endsWith('"')) {
    s = s.slice(2, -1);
  }
  return s.startsWith("0");
};

const SubscriptionsList = () => {
  const subscriptionsQuery = useSubscriptions();
  const subscriptions = subscriptionsQuery.data?.pages.flatMap(
    (page) => page.data
  );

  if (subscriptionsQuery.isLoading) {
    return (
      <Flex justify='center' align='center' py={10}>
        <Spinner size='xl' />
        <Text ml={4}>Loading...</Text>
      </Flex>
    );
  }

  if (subscriptionsQuery.isError) {
    return (
      <Flex justify='center' align='center' py={10}>
        <Text color='red.500'>Error: {subscriptionsQuery.error.message}</Text>
      </Flex>
    );
  }

  return (
    <Box p={4} width='100%' overflowX='auto'>
      <Table.Root size='sm'>
        <Table.Header>
          <Table.Row>
            <Table.ColumnHeader>Subscription ID</Table.ColumnHeader>
            <Table.ColumnHeader>Status</Table.ColumnHeader>
            <Table.ColumnHeader>Customer Email</Table.ColumnHeader>
            <Table.ColumnHeader>Customer Name</Table.ColumnHeader>
            <Table.ColumnHeader>Shipping Name</Table.ColumnHeader>
            <Table.ColumnHeader>Shipping Address</Table.ColumnHeader>
            <Table.ColumnHeader>Carrier</Table.ColumnHeader>
            <Table.ColumnHeader>Tracking #</Table.ColumnHeader>
            <Table.ColumnHeader>Phone</Table.ColumnHeader>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {subscriptions?.map((subscription: Stripe.Subscription) => {
            const customer = subscription.customer as Stripe.Customer;
            const shipping = customer.shipping as Shipping | undefined;
            const { bg, color } = getRowHighlight(subscription.status);
            const postalCode = shipping?.address?.postal_code || "";
            const isViolet = isZeroPostalCode(postalCode);

            // Cell styles for postal_code (when in the address)
            // We assume postal_code appears in "Shipping Address", which is a single cell string built by formatShippingAddress
            // But in this table, we do NOT show postal_code as its own cell ("Shipping Address" contains it together with city/state)
            // Therefore, user wants the ENTIRE row if postal_code starts with "0" to have the Shipping Address cell in violet.

            // -- Actually: According to original, the only cells styled individually are those rendered as cells.
            // There is no separate cell for postal_code, and postal_code only appears within formatted shipping address.
            // So: Let's highlight the "Shipping Address" cell in violet if postal_code starts with 0.

            // Define violet and fallback styles
            const violetCellProps = {
              bg: "purple.100",
              color: "purple.800",
              fontWeight: "bold",
            };

            return (
              <Table.Row key={subscription.id} bg={bg} color={color}>
                <Table.Cell>
                  <HStack>
                    <Tooltip content={subscription.id}>
                      <Text truncate w={32} cursor='pointer'>
                        {subscription.id}
                      </Text>
                    </Tooltip>
                  </HStack>
                </Table.Cell>
                <Table.Cell>{subscription.status}</Table.Cell>
                <Table.Cell>
                  <HStack>
                    <ClipboardRoot value={customer.email ?? ""}>
                      <ClipboardTrigger>
                        <ClipboardIconButton variant={"ghost"} />
                      </ClipboardTrigger>
                    </ClipboardRoot>
                    <Text>{customer.email || "-"}</Text>
                  </HStack>
                </Table.Cell>
                <Table.Cell>{customer.name || "-"}</Table.Cell>
                <Table.Cell>{shipping?.name || "-"}</Table.Cell>
                <Table.Cell
                  // Si postal_code commence par 0, violet même si ligne jaune
                  {...(isViolet ? violetCellProps : {})}
                >
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
      {subscriptionsQuery.hasNextPage && (
        <Flex justify='center' mt={8}>
          <Button
            colorScheme='blue'
            onClick={() => subscriptionsQuery.fetchNextPage()}
            loading={subscriptionsQuery.isFetchingNextPage}
          >
            {subscriptionsQuery.isFetchingNextPage
              ? "Loading more..."
              : "Load more"}
          </Button>
        </Flex>
      )}
    </Box>
  );
};

export default SubscriptionsList;
