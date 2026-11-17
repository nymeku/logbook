import { useInfiniteQuery } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";
import type Stripe from "stripe";
import { getStripeClient } from "../../../lib/stripe";
import { toSubscriptionRow, type SubscriptionRow } from "./subscription-row";

export const SUBSCRIPTIONS_QUERY_KEY = ["subscriptions"] as const;

const getSubscriptions = async ({
  pageParam,
}: { pageParam?: string } = {}): Promise<
  Stripe.ApiList<Stripe.Subscription>
> => {
  const stripe = getStripeClient();
  return stripe.subscriptions.list({
    limit: 100, // max autorisé par Stripe
    expand: ["data.customer"],
    status: "all",
    ...(pageParam ? { starting_after: pageParam } : {}),
  });
};

export const useSubscriptions = () =>
  useInfiniteQuery({
    queryKey: SUBSCRIPTIONS_QUERY_KEY,
    queryFn: ({ pageParam }: { pageParam?: string }) =>
      getSubscriptions({ pageParam }),
    getNextPageParam: (lastPage) => {
      if (lastPage.has_more && lastPage.data.length > 0) {
        return lastPage.data[lastPage.data.length - 1].id;
      }
      return undefined;
    },
    initialPageParam: undefined,
    // Les données ne bougent pas pendant une session : on recharge à la main.
    staleTime: Infinity,
  });

export interface AllSubscriptionsState {
  rows: SubscriptionRow[];
  /** Toutes les pages Stripe ont été récupérées */
  isComplete: boolean;
  /** Chargement de la toute première page */
  isInitialLoading: boolean;
  /** Pages suivantes en cours de chargement */
  isLoadingMore: boolean;
  error: Error | null;
  /** Relance le chargement là où il s'est arrêté (après une erreur) */
  resume: () => void;
  isRefetching: boolean;
}

/**
 * Charge automatiquement TOUTES les pages (Stripe renvoie 100 abonnements
 * max par appel) l'une après l'autre, sans action de l'utilisateur.
 */
export const useAllSubscriptions = (): AllSubscriptionsState => {
  const query = useSubscriptions();
  const {
    hasNextPage,
    isFetchingNextPage,
    isFetchNextPageError,
    isFetching,
    fetchNextPage,
  } = query;

  useEffect(() => {
    if (hasNextPage && !isFetching && !isFetchNextPageError) {
      void fetchNextPage();
    }
  }, [hasNextPage, isFetching, isFetchNextPageError, fetchNextPage]);

  const rows = useMemo(
    () =>
      query.data?.pages.flatMap((page) => page.data.map(toSubscriptionRow)) ??
      [],
    [query.data]
  );

  return {
    rows,
    isComplete: query.isSuccess && !hasNextPage && !isFetching,
    isInitialLoading: query.isPending,
    isLoadingMore: Boolean(hasNextPage) && !isFetchNextPageError,
    error: query.error,
    resume: () => void fetchNextPage(),
    isRefetching: query.isRefetching && !isFetchingNextPage,
  };
};

export default getSubscriptions;
