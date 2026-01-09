import { useInfiniteQuery } from "@tanstack/react-query";
import { getStripeClient } from "../../../lib/stripe";
import type Stripe from "stripe";

const fetchCustomersPage = async ({
  pageParam,
}: { pageParam?: string } = {}): Promise<Stripe.ApiList<Stripe.Customer>> => {
  const stripe = getStripeClient();
  const params: Stripe.CustomerListParams = {};
  if (pageParam) {
    params.starting_after = pageParam;
  }
  const customers = await stripe.customers.list({
    ...params,
    limit: 100,
  });

  return customers;
};

export const useCustomers = () =>
  useInfiniteQuery({
    queryKey: ["customers"],
    queryFn: ({ pageParam }: { pageParam?: string }) =>
      fetchCustomersPage({ pageParam }),
    getNextPageParam: (lastPage) => {
      if (lastPage.has_more && lastPage.data.length > 0) {
        return lastPage.data[lastPage.data.length - 1].id;
      }
      return undefined;
    },
    initialPageParam: undefined,
  });

export default fetchCustomersPage;
