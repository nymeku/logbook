import {
  Badge,
  Box,
  Button,
  EmptyState,
  Flex,
  HStack,
  IconButton,
  Input,
  InputGroup,
  Kbd,
  Spinner,
  Text,
} from "@chakra-ui/react";
import { useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  KeyRound,
  RefreshCw,
  Search,
  X,
} from "lucide-react";
import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { Tooltip } from "../../../components/ui/tooltip";
import { paths } from "../../../config/paths";
import { ExportDialog } from "../../../features/export-csv/components/export-dialog";
import {
  SUBSCRIPTIONS_QUERY_KEY,
  useAllSubscriptions,
} from "../../../features/subscriptions/api/get-subscriptions";
import {
  ALL_STATUS_FILTERS,
  DEFAULT_STATUS_FILTERS,
  STATUS_FILTER_META,
  STATUS_META,
  countByStatusFilter,
  statusFilterOf,
  type StatusFilter,
  type SubscriptionRow,
} from "../../../features/subscriptions/api/subscription-row";
import {
  SubscriptionsTable,
  type SortKey,
  type SortState,
} from "../../../features/subscriptions/components/subscriptions-table";
import { searchable } from "../../../lib/ascii";
import {
  clearStripeApiKey,
  describeStripeError,
  getKeyMode,
} from "../../../lib/stripe";

const nf = new Intl.NumberFormat("fr-FR");
const collator = new Intl.Collator("fr", { sensitivity: "base", numeric: true });

const SORT_VALUE: Record<SortKey, (r: SubscriptionRow) => string | number> = {
  status: (r) => STATUS_META[r.status].order,
  name: (r) => r.shipName || r.customerName,
  postalCode: (r) => r.postalCode,
  city: (r) => r.city,
  country: (r) => r.country,
  created: (r) => r.created,
};

const sortRows = (rows: SubscriptionRow[], sort: SortState) => {
  const get = SORT_VALUE[sort.key];
  const factor = sort.dir === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => {
    const va = get(a);
    const vb = get(b);
    // Les valeurs vides toujours à la fin, quel que soit le sens
    if (va === "" && vb !== "") return 1;
    if (vb === "" && va !== "") return -1;
    const cmp =
      typeof va === "number" && typeof vb === "number"
        ? va - vb
        : collator.compare(String(va), String(vb));
    return cmp * factor || b.created - a.created;
  });
};

type Flag = "zeroPostal" | "noAddress";

const DashboardRoute = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const data = useAllSubscriptions();
  const { rows, isComplete, isInitialLoading, error } = data;
  const keyMode = getKeyMode();

  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [statuses, setStatuses] = useState<Set<StatusFilter>>(
    () => new Set(DEFAULT_STATUS_FILTERS)
  );
  const [flag, setFlag] = useState<Flag | null>(null);
  const [sort, setSort] = useState<SortState>({ key: "created", dir: "desc" });
  const [exportOpen, setExportOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  // Raccourcis : "/" → recherche ; "e" → export
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const typing =
        target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable;
      if (e.key === "/" && !typing) {
        e.preventDefault();
        searchRef.current?.focus();
        searchRef.current?.select();
      } else if (e.key === "e" && !typing && !e.metaKey && !e.ctrlKey && !exportOpen) {
        e.preventDefault();
        setExportOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [exportOpen]);

  const statusCounts = useMemo(() => countByStatusFilter(rows), [rows]);

  const byStatus = useMemo(
    () => rows.filter((r) => statuses.has(statusFilterOf(r))),
    [rows, statuses]
  );
  const flagCounts = useMemo(
    () => ({
      zeroPostal: byStatus.filter((r) => r.postalStartsWithZero).length,
      noAddress: byStatus.filter((r) => !r.hasAddress).length,
    }),
    [byStatus]
  );

  const visible = useMemo(() => {
    const terms = searchable(deferredSearch).split(" ").filter(Boolean);
    const filtered = byStatus.filter(
      (r) =>
        (flag !== "zeroPostal" || r.postalStartsWithZero) &&
        (flag !== "noAddress" || !r.hasAddress) &&
        terms.every((t) => r.haystack.includes(t))
    );
    return sortRows(filtered, sort);
  }, [byStatus, deferredSearch, flag, sort]);

  const filtersActive =
    search !== "" ||
    flag !== null ||
    statuses.size !== DEFAULT_STATUS_FILTERS.length ||
    !DEFAULT_STATUS_FILTERS.every((s) => statuses.has(s));

  const resetFilters = () => {
    setSearch("");
    setFlag(null);
    setStatuses(new Set(DEFAULT_STATUS_FILTERS));
  };

  const toggleStatus = (s: StatusFilter, only: boolean) =>
    setStatuses((prev) => {
      if (only) return new Set([s]);
      const next = new Set(prev);
      if (next.has(s)) next.delete(s);
      else next.add(s);
      return next;
    });

  const onSort = (key: SortKey) =>
    setSort((prev) =>
      prev.key === key
        ? { key, dir: prev.dir === "asc" ? "desc" : "asc" }
        : { key, dir: key === "created" ? "desc" : "asc" }
    );

  const refresh = () =>
    queryClient.resetQueries({ queryKey: SUBSCRIPTIONS_QUERY_KEY });

  const logout = () => {
    clearStripeApiKey();
    queryClient.clear();
    navigate(paths.auth.login.getHref(), { replace: true });
  };

  const errorStatus = (error as { statusCode?: number } | null)?.statusCode;
  const authError = errorStatus === 401 || errorStatus === 403;

  return (
    <Flex direction='column' h='100vh' overflow='hidden'>
      {/* ---------------- Barre du haut ---------------- */}
      <Flex
        as='header'
        align='center'
        gap={3}
        px={4}
        py={2.5}
        borderBottomWidth='1px'
        wrap='wrap'
      >
        <Text fontSize='lg' fontWeight='bold'>
          Logbook
        </Text>
        {keyMode === "test" && (
          <Badge colorPalette='orange' variant='solid'>
            MODE TEST
          </Badge>
        )}

        <LoadStatus data={data} />

        <HStack ml='auto' gap={2}>
          <Tooltip content='Recharger tous les abonnements depuis Stripe'>
            <IconButton
              aria-label='Recharger'
              variant='ghost'
              size='sm'
              onClick={refresh}
              disabled={isInitialLoading}
            >
              <RefreshCw size={16} />
            </IconButton>
          </Tooltip>
          <Tooltip content='Changer de clé Stripe / se déconnecter'>
            <IconButton aria-label='Changer de clé' variant='ghost' size='sm' onClick={logout}>
              <KeyRound size={16} />
            </IconButton>
          </Tooltip>
          <Button
            size='sm'
            colorPalette='teal'
            onClick={() => setExportOpen(true)}
            disabled={rows.length === 0}
          >
            {isComplete ? <Download size={16} /> : <Spinner size='xs' />}
            Exporter CSV
            <Kbd size='sm' variant='subtle' colorPalette='teal' ml={1}>
              E
            </Kbd>
          </Button>
        </HStack>
      </Flex>

      {/* ---------------- Filtres ---------------- */}
      <Flex px={4} py={2} gap={3} align='center' wrap='wrap' borderBottomWidth='1px' bg='bg.subtle'>
        <InputGroup
          maxW='340px'
          startElement={<Search size={15} />}
          endElement={
            search ? (
              <IconButton
                aria-label='Effacer'
                size='2xs'
                variant='ghost'
                onClick={() => {
                  setSearch("");
                  searchRef.current?.focus();
                }}
              >
                <X size={14} />
              </IconButton>
            ) : (
              <Kbd size='sm'>/</Kbd>
            )
          }
        >
          <Input
            ref={searchRef}
            size='sm'
            bg='bg'
            placeholder='Nom, email, adresse, CP, ville, ID…'
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                if (search) setSearch("");
                else searchRef.current?.blur();
              }
            }}
          />
        </InputGroup>

        <HStack gap={1.5} wrap='wrap'>
          {ALL_STATUS_FILTERS.filter((s) => statusCounts.has(s)).map((s) => {
            const on = statuses.has(s);
            return (
              <Tooltip key={s} content='Clic : afficher/masquer · Alt+clic : uniquement ce statut'>
                <Button
                  size='xs'
                  variant={on ? "subtle" : "outline"}
                  colorPalette={on ? STATUS_FILTER_META[s].color : "gray"}
                  opacity={on ? 1 : 0.6}
                  textDecoration={on ? undefined : "line-through"}
                  onClick={(e) => toggleStatus(s, e.altKey)}
                >
                  {STATUS_FILTER_META[s].label}
                  <Text as='span' fontWeight='normal'>
                    {nf.format(statusCounts.get(s) ?? 0)}
                  </Text>
                </Button>
              </Tooltip>
            );
          })}
        </HStack>

        <HStack gap={1.5}>
          <Button
            size='xs'
            variant={flag === "zeroPostal" ? "solid" : "outline"}
            colorPalette='purple'
            onClick={() => setFlag((f) => (f === "zeroPostal" ? null : "zeroPostal"))}
            disabled={flagCounts.zeroPostal === 0}
          >
            CP commençant par 0 · {nf.format(flagCounts.zeroPostal)}
          </Button>
          <Button
            size='xs'
            variant={flag === "noAddress" ? "solid" : "outline"}
            colorPalette='orange'
            onClick={() => setFlag((f) => (f === "noAddress" ? null : "noAddress"))}
            disabled={flagCounts.noAddress === 0}
          >
            Sans adresse · {nf.format(flagCounts.noAddress)}
          </Button>
        </HStack>

        <HStack ml='auto' gap={2}>
          <Text fontSize='sm' color='fg.muted'>
            {nf.format(visible.length)} affiché{visible.length > 1 ? "s" : ""}
          </Text>
          {filtersActive && (
            <Button size='xs' variant='ghost' onClick={resetFilters}>
              Réinitialiser
            </Button>
          )}
        </HStack>
      </Flex>

      {/* ---------------- Contenu ---------------- */}
      <Box flex='1' overflow='auto'>
        {isInitialLoading ? (
          <Flex justify='center' align='center' h='full' gap={3}>
            <Spinner size='lg' />
            <Text color='fg.muted'>Connexion à Stripe…</Text>
          </Flex>
        ) : error && rows.length === 0 ? (
          <EmptyState.Root>
            <EmptyState.Content>
              <EmptyState.Indicator>
                <AlertTriangle />
              </EmptyState.Indicator>
              <EmptyState.Title>Impossible de charger les abonnements</EmptyState.Title>
              <EmptyState.Description>{describeStripeError(error)}</EmptyState.Description>
              <HStack>
                <Button size='sm' variant='outline' onClick={refresh}>
                  Réessayer
                </Button>
                {authError && (
                  <Button size='sm' colorPalette='teal' onClick={logout}>
                    Changer de clé
                  </Button>
                )}
              </HStack>
            </EmptyState.Content>
          </EmptyState.Root>
        ) : visible.length === 0 ? (
          <EmptyState.Root>
            <EmptyState.Content>
              <EmptyState.Title>Aucun résultat</EmptyState.Title>
              <EmptyState.Description>
                {rows.length === 0
                  ? "Aucun abonnement sur ce compte Stripe."
                  : "Aucun abonnement ne correspond à ces filtres."}
              </EmptyState.Description>
              {filtersActive && (
                <Button size='sm' variant='outline' onClick={resetFilters}>
                  Réinitialiser les filtres
                </Button>
              )}
            </EmptyState.Content>
          </EmptyState.Root>
        ) : (
          <SubscriptionsTable rows={visible} sort={sort} onSort={onSort} />
        )}
      </Box>

      <ExportDialog open={exportOpen} onOpenChange={setExportOpen} data={data} />
    </Flex>
  );
};

/** Indicateur du chargement progressif de toutes les pages Stripe. */
const LoadStatus = ({ data }: { data: ReturnType<typeof useAllSubscriptions> }) => {
  const { rows, isComplete, isInitialLoading, isLoadingMore, error, resume } = data;
  if (isInitialLoading) return null;
  if (error && rows.length > 0) {
    return (
      <HStack gap={2} color='red.600' fontSize='sm'>
        <AlertTriangle size={15} />
        <Text>
          Chargement interrompu à {nf.format(rows.length)} — {describeStripeError(error)}
        </Text>
        <Button size='2xs' variant='outline' colorPalette='red' onClick={resume}>
          Reprendre
        </Button>
      </HStack>
    );
  }
  if (isLoadingMore || !isComplete) {
    return (
      <HStack gap={2} color='fg.muted' fontSize='sm'>
        <Spinner size='xs' />
        <Text>Chargement… {nf.format(rows.length)} abonnements</Text>
      </HStack>
    );
  }
  return (
    <HStack gap={1.5} color='green.600' fontSize='sm'>
      <CheckCircle2 size={15} />
      <Text>{nf.format(rows.length)} abonnements · tout est chargé</Text>
    </HStack>
  );
};

export default DashboardRoute;
