import {
  Alert,
  Badge,
  Box,
  Button,
  Code,
  Field,
  HStack,
  IconButton,
  Input,
  InputGroup,
  Link,
  List,
  Stack,
  Table,
  Text,
} from "@chakra-ui/react";
import { useQueryClient } from "@tanstack/react-query";
import { Check, ExternalLink, Eye, EyeOff, X } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router";
import { paths } from "../../../config/paths";
import {
  describeStripeError,
  detectKey,
  sanitizeKey,
  setStripeApiKey,
  verifyStripeKey,
  type KeyInfo,
} from "../../../lib/stripe";

const KEY_KIND_LABEL: Record<KeyInfo["kind"], string> = {
  restricted: "Clé restreinte",
  secret: "Clé secrète",
  publishable: "Clé publiable",
  webhook: "Secret de webhook",
  unknown: "Format non reconnu",
};

/** Retour immédiat sous le champ pendant la saisie. */
const KeyFeedback = ({ info }: { info: KeyInfo }) => {
  if (info.kind === "unknown") {
    return (
      <Text fontSize='sm' color='red.600'>
        Une clé Stripe commence par <Code>rk_live_</Code> ou{" "}
        <Code>sk_live_</Code>.
      </Text>
    );
  }
  if (!info.usable) {
    return (
      <Text fontSize='sm' color='red.600'>
        <b>{KEY_KIND_LABEL[info.kind]}</b> : ne permet pas de lire les
        abonnements. Il faut une clé <b>restreinte</b> (<Code>rk_</Code>) ou{" "}
        <b>secrète</b> (<Code>sk_</Code>).
      </Text>
    );
  }
  return (
    <HStack fontSize='sm' gap={2}>
      <Badge colorPalette={info.mode === "live" ? "green" : "orange"} variant='solid'>
        {info.mode === "live" ? "LIVE" : "TEST"}
      </Badge>
      <Text>
        {KEY_KIND_LABEL[info.kind]}
        {info.mode === "test" && " — données de test, pas les vrais clients"}
        {!info.wellFormed && (
          <Text as='span' color='orange.600'>
            {" "}— semble incomplète, vérifie le copier-coller
          </Text>
        )}
      </Text>
    </HStack>
  );
};

const LoginForm = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [value, setValue] = useState("");
  const [show, setShow] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const key = sanitizeKey(value);
  const info = detectKey(key);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!key || !info.usable || checking) return;
    setChecking(true);
    setError(null);
    try {
      await verifyStripeKey(key);
      setStripeApiKey(key);
      queryClient.clear(); // au cas où on change de compte
      navigate(paths.app.dashboard.getHref(), { replace: true });
    } catch (err) {
      setError(describeStripeError(err));
      setChecking(false);
    }
  };

  return (
    <Stack gap={6}>
      <form onSubmit={onSubmit}>
        <Stack gap={3}>
          <Field.Root invalid={!!error || (key !== "" && !info.usable)}>
            <Field.Label>Clé API Stripe</Field.Label>
            <InputGroup
              endElement={
                <IconButton
                  aria-label={show ? "Masquer" : "Afficher"}
                  size='xs'
                  variant='ghost'
                  onClick={() => setShow((s) => !s)}
                >
                  {show ? <EyeOff size={15} /> : <Eye size={15} />}
                </IconButton>
              }
            >
              <Input
                autoFocus
                type={show ? "text" : "password"}
                autoComplete='off'
                spellCheck={false}
                fontFamily='mono'
                placeholder='rk_live_51…'
                value={value}
                onChange={(e) => {
                  setValue(e.target.value);
                  setError(null);
                }}
              />
            </InputGroup>
            {key !== "" && <KeyFeedback info={info} />}
          </Field.Root>

          {error && (
            <Alert.Root status='error'>
              <Alert.Indicator />
              <Alert.Title>{error}</Alert.Title>
            </Alert.Root>
          )}

          <Button
            type='submit'
            colorPalette='teal'
            loading={checking}
            loadingText='Vérification auprès de Stripe…'
            disabled={!info.usable}
          >
            Se connecter
          </Button>
          <Text fontSize='xs' color='fg.muted'>
            La clé est vérifiée auprès de Stripe puis gardée uniquement dans ce
            navigateur. Rien n'est envoyé ailleurs.
          </Text>
        </Stack>
      </form>

      {/* ------------- Aide ------------- */}
      <Box borderWidth='1px' borderRadius='md' p={4} bg='bg.subtle'>
        <Text fontWeight='semibold' mb={2}>
          Où trouver la clé ?
        </Text>
        <List.Root as='ol' gap={1.5} fontSize='sm' ps={4}>
          <List.Item>
            Ouvre le dashboard Stripe → <b>Développeurs</b> → <b>Clés API</b>{" "}
            <Link
              href='https://dashboard.stripe.com/apikeys'
              target='_blank'
              rel='noreferrer'
              colorPalette='teal'
              color='colorPalette.600'
            >
              dashboard.stripe.com/apikeys <ExternalLink size={12} />
            </Link>
          </List.Item>
          <List.Item>
            Vérifie que le bouton <b>« Mode test »</b> en haut est{" "}
            <b>désactivé</b> (sinon tu auras les données de test).
          </List.Item>
          <List.Item>
            Recommandé : <b>Créer une clé restreinte</b>, avec la permission{" "}
            <b>Lecture</b> sur <b>Customers</b> et sur <b>Subscriptions</b>{" "}
            (tout le reste sur « Aucun »). Sinon, la <b>Clé secrète</b> marche
            aussi.
          </List.Item>
          <List.Item>Clique sur la clé pour la révéler, copie-la et colle-la ici.</List.Item>
        </List.Root>

        <Table.Root size='sm' mt={4} variant='outline' bg='bg'>
          <Table.Header>
            <Table.Row>
              <Table.ColumnHeader>Commence par</Table.ColumnHeader>
              <Table.ColumnHeader>Type</Table.ColumnHeader>
              <Table.ColumnHeader textAlign='center'>OK ?</Table.ColumnHeader>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {[
              ["rk_live_…", "Restreinte — recommandée", true],
              ["sk_live_…", "Secrète — accès total au compte", true],
              ["rk_test_… / sk_test_…", "Mode test — faux clients", true],
              ["pk_live_… / pk_test_…", "Publiable — ne peut rien lire", false],
              ["whsec_…", "Secret de webhook", false],
            ].map(([prefix, label, ok]) => (
              <Table.Row key={prefix as string}>
                <Table.Cell>
                  <Code>{prefix}</Code>
                </Table.Cell>
                <Table.Cell>{label}</Table.Cell>
                <Table.Cell textAlign='center'>
                  {ok ? (
                    <Check size={16} color='green' style={{ display: "inline" }} />
                  ) : (
                    <X size={16} color='red' style={{ display: "inline" }} />
                  )}
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Root>
      </Box>
    </Stack>
  );
};

export default LoginForm;
