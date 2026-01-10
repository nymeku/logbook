import { useInfiniteQuery } from "@tanstack/react-query";
import { getStripeClient } from "../../../lib/stripe";
import Stripe from "stripe";

const getSubscriptions = async ({
  pageParam,
}: { pageParam?: string } = {}): Promise<
  Stripe.ApiList<Stripe.Subscription>
> => {
  const stripe = getStripeClient();
  const params: Stripe.SubscriptionListParams = {};
  if (pageParam) {
    params.starting_after = pageParam;
  }
  const subscriptions = await stripe.subscriptions.list({
    ...params,
    limit: 100,
    expand: ["data.customer"],
    status: "all",
  });

  return subscriptions;
};

export const useSubscriptions = () =>
  useInfiniteQuery({
    queryKey: ["subscriptions"],
    queryFn: ({ pageParam }: { pageParam?: string }) =>
      getSubscriptions({ pageParam }),
    getNextPageParam: (lastPage) => {
      if (lastPage.has_more && lastPage.data.length > 0) {
        return lastPage.data[lastPage.data.length - 1].id;
      }
      return undefined;
    },
    initialPageParam: undefined,
  });

export default getSubscriptions;
