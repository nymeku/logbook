import {
  Alert,
  Badge,
  Box,
  Button,
  Checkbox,
  CloseButton,
  Code,
  Dialog,
  HStack,
  Portal,
  Spinner,
  Stack,
  Text,
} from "@chakra-ui/react";
import { Download } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { toaster } from "../../../components/ui/toaster";
import type { AllSubscriptionsState } from "../../subscriptions/api/get-subscriptions";
import {
  ALL_STATUS_FILTERS,
  DEFAULT_STATUS_FILTERS,
  STATUS_FILTER_META,
  countByStatusFilter,
  statusFilterOf,
  type StatusFilter,
} from "../../subscriptions/api/subscription-row";
import {
  analyzeExport,
  defaultExportFilename,
  downloadCsv,
} from "../api/export-subscriptions-csv";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: AllSubscriptionsState;
}

const nf = new Intl.NumberFormat("fr-FR");

export const ExportDialog = ({ open, onOpenChange, data }: Props) => {
  const exportButtonRef = useRef<HTMLButtonElement>(null);
  const [statuses, setStatuses] = useState<Set<StatusFilter>>(
    () => new Set(DEFAULT_STATUS_FILTERS)
  );
  const [includeNoAddress, setIncludeNoAddress] = useState(false);

  const { rows, isComplete, error } = data;

  const statusCounts = useMemo(() => countByStatusFilter(rows), [rows]);

  const byStatus = useMemo(
    () => rows.filter((r) => statuses.has(statusFilterOf(r))),
    [rows, statuses]
  );
  // Les "Annulé sans adresse" cochés explicitement sont toujours exportés ;
  // la case "sans adresse" ne concerne que les autres statuts.
  const noAddressCount = byStatus.filter(
    (r) => !r.hasAddress && r.status !== "canceled"
  ).length;
  const toExport = useMemo(
    () =>
      includeNoAddress
        ? byStatus
        : byStatus.filter((r) => r.hasAddress || r.status === "canceled"),
    [byStatus, includeNoAddress]
  );

  const analysis = useMemo(
    () => (open ? analyzeExport(toExport) : null),
    [open, toExport]
  );

  const toggleStatus = (s: StatusFilter) =>
    setStatuses((prev) => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s);
      else next.add(s);
      return next;
    });

  const handleExport = () => {
    if (!analysis || analysis.records.length === 0) return;
    const filename = defaultExportFilename(analysis.records.length);
    downloadCsv(analysis.records, filename);
    toaster.create({
      type: isComplete ? "success" : "warning",
      title: `${nf.format(analysis.records.length)} lignes exportées (sans accents)`,
      description: isComplete
        ? filename
        : `${filename} — ATTENTION : export fait avant la fin du chargement, il est incomplet.`,
      duration: isComplete ? 5000 : 10000,
    });
    onOpenChange(false);
  };

  const incomplete = !isComplete;
  const empty = !analysis || analysis.records.length === 0;

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(e) => onOpenChange(e.open)}
      size='lg'
      scrollBehavior='inside'
      initialFocusEl={() => exportButtonRef.current}
    >
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content>
            <Dialog.Header>
              <Dialog.Title>Exporter en CSV</Dialog.Title>
            </Dialog.Header>
            <Dialog.Body>
              <Stack gap={5}>
                {/* 1. État du chargement */}
                {error ? (
                  <Alert.Root status='error'>
                    <Alert.Indicator />
                    <Alert.Content>
                      <Alert.Title>
                        Chargement interrompu : seuls{" "}
                        {nf.format(rows.length)} abonnements sont chargés
                      </Alert.Title>
                      <Alert.Description>
                        {error.message}{" "}
                        <Button size='xs' variant='outline' onClick={data.resume} ml={2}>
                          Réessayer
                        </Button>
                      </Alert.Description>
                    </Alert.Content>
                  </Alert.Root>
                ) : incomplete ? (
                  <Alert.Root status='warning'>
                    <Alert.Indicator>
                      <Spinner size='sm' />
                    </Alert.Indicator>
                    <Alert.Content>
                      <Alert.Title>
                        Tous les abonnements ne sont pas encore chargés (
                        {nf.format(rows.length)} pour l'instant)
                      </Alert.Title>
                      <Alert.Description>
                        Le chargement continue tout seul. Attends que ce
                        message passe au vert pour avoir un export complet.
                      </Alert.Description>
                    </Alert.Content>
                  </Alert.Root>
                ) : (
                  <Alert.Root status='success'>
                    <Alert.Indicator />
                    <Alert.Title>
                      Tous les abonnements sont chargés (
                      {nf.format(rows.length)})
                    </Alert.Title>
                  </Alert.Root>
                )}

                {/* 2. Quels statuts exporter */}
                <Box>
                  <Text fontWeight='semibold' mb={2}>
                    Statuts à inclure
                  </Text>
                  <HStack wrap='wrap' gap={3}>
                    {ALL_STATUS_FILTERS.filter((s) => statusCounts.has(s)).map((s) => (
                      <Checkbox.Root
                        key={s}
                        size='sm'
                        checked={statuses.has(s)}
                        onCheckedChange={() => toggleStatus(s)}
                      >
                        <Checkbox.HiddenInput />
                        <Checkbox.Control />
                        <Checkbox.Label>
                          <Badge colorPalette={STATUS_FILTER_META[s].color} variant='subtle'>
                            {STATUS_FILTER_META[s].label}
                          </Badge>{" "}
                          <Text as='span' color='fg.muted'>
                            {nf.format(statusCounts.get(s) ?? 0)}
                          </Text>
                        </Checkbox.Label>
                      </Checkbox.Root>
                    ))}
                  </HStack>
                </Box>

                {/* 3. Sans adresse */}
                {noAddressCount > 0 && (
                  <Alert.Root status='info' variant='surface'>
                    <Alert.Indicator />
                    <Alert.Content>
                      <Alert.Title>
                        {nf.format(noAddressCount)} abonnement
                        {noAddressCount > 1 ? "s n'ont" : " n'a"} pas d'adresse
                        de livraison
                      </Alert.Title>
                      <Alert.Description>
                        <Checkbox.Root
                          size='sm'
                          mt={1}
                          checked={includeNoAddress}
                          onCheckedChange={(e) => setIncludeNoAddress(!!e.checked)}
                        >
                          <Checkbox.HiddenInput />
                          <Checkbox.Control />
                          <Checkbox.Label>
                            Les inclure quand même (lignes vides dans le CSV)
                          </Checkbox.Label>
                        </Checkbox.Root>
                      </Alert.Description>
                    </Alert.Content>
                  </Alert.Root>
                )}

                {/* 4. Accents */}
                <Alert.Root status='neutral' variant='outline'>
                  <Alert.Indicator />
                  <Alert.Content>
                    <Alert.Title>Le fichier ne contiendra AUCUN accent</Alert.Title>
                    <Alert.Description>
                      <Text>
                        Pour la machine de publipostage, chaque caractère
                        accentué ou spécial est remplacé : é→e, ü→u, ç→c,
                        ß→ss, ø→o, œ→oe, ’→'.{" "}
                        {analysis && (
                          <b>
                            {nf.format(analysis.changedCount)} ligne
                            {analysis.changedCount > 1 ? "s" : ""} concernée
                            {analysis.changedCount > 1 ? "s" : ""}.
                          </b>
                        )}
                      </Text>
                      {analysis && analysis.samples.length > 0 && (
                        <Stack gap={1} mt={2} fontSize='xs'>
                          {analysis.samples.map((s) => (
                            <Box key={s.id}>
                              <Code size='sm' colorPalette='red' variant='plain'>
                                {s.before}
                              </Code>
                              <br />→{" "}
                              <Code size='sm' colorPalette='green' variant='plain'>
                                {s.after}
                              </Code>
                            </Box>
                          ))}
                        </Stack>
                      )}
                    </Alert.Description>
                  </Alert.Content>
                </Alert.Root>

                {analysis && analysis.nonAscii.length > 0 && (
                  <Alert.Root status='warning'>
                    <Alert.Indicator />
                    <Alert.Content>
                      <Alert.Title>
                        {analysis.nonAscii.length} ligne
                        {analysis.nonAscii.length > 1 ? "s contiennent" : " contient"}{" "}
                        des caractères non latins impossibles à convertir
                      </Alert.Title>
                      <Alert.Description>
                        À vérifier / corriger à la main (cyrillique, chinois…) :
                        <Stack gap={1} mt={1} fontSize='xs'>
                          {analysis.nonAscii.slice(0, 10).map((s) => (
                            <Code key={s.id} size='sm' variant='plain'>
                              {s.after}
                            </Code>
                          ))}
                        </Stack>
                      </Alert.Description>
                    </Alert.Content>
                  </Alert.Root>
                )}
              </Stack>
            </Dialog.Body>
            <Dialog.Footer>
              <Text fontSize='sm' color='fg.muted' mr='auto'>
                Séparateur virgule · colonnes name, postal_code, line1, line2,
                city, state, country
              </Text>
              <Dialog.ActionTrigger asChild>
                <Button variant='outline'>Annuler</Button>
              </Dialog.ActionTrigger>
              <Button
                ref={exportButtonRef}
                colorPalette={incomplete ? "orange" : "teal"}
                onClick={handleExport}
                disabled={empty}
              >
                <Download size={16} />
                {incomplete
                  ? `Exporter quand même (${nf.format(analysis?.records.length ?? 0)}, incomplet)`
                  : `Exporter ${nf.format(analysis?.records.length ?? 0)} lignes`}
              </Button>
            </Dialog.Footer>
            <Dialog.CloseTrigger asChild>
              <CloseButton size='sm' />
            </Dialog.CloseTrigger>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
};

