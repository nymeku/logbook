import { ArrowDown, ArrowUp, ArrowUpDown, Copy, ExternalLink } from "lucide-react";
import { memo } from "react";
import { copyToClipboard } from "../../../lib/clipboard";
import {
  STATUS_META,
  formatAddressBlock,
  stripeDashboardUrl,
  type SubscriptionRow,
} from "../api/subscription-row";
import "./subscriptions-table.css";

export type SortKey =
  | "status"
  | "name"
  | "postalCode"
  | "city"
  | "country"
  | "created";

export interface SortState {
  key: SortKey;
  dir: "asc" | "desc";
}

const dateFmt = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

const ROW_TINT: Partial<Record<SubscriptionRow["status"], string>> = {
  past_due: "row-warn",
  unpaid: "row-bad",
  incomplete: "row-bad",
  incomplete_expired: "row-bad",
  canceled: "row-bad",
};

const SortHeader = ({
  label,
  k,
  sort,
  onSort,
  className,
}: {
  label: string;
  k: SortKey;
  sort: SortState;
  onSort: (k: SortKey) => void;
  className?: string;
}) => {
  const active = sort.key === k;
  const Icon = !active ? ArrowUpDown : sort.dir === "asc" ? ArrowUp : ArrowDown;
  return (
    <th
      className={className}
      aria-sort={active ? (sort.dir === "asc" ? "ascending" : "descending") : "none"}
    >
      <button
        type='button'
        className={`sort-btn ${active ? "is-active" : ""}`}
        onClick={() => onSort(k)}
      >
        {label}
        <Icon size={13} />
      </button>
    </th>
  );
};

const Row = memo(({ row }: { row: SubscriptionRow }) => {
  const meta = STATUS_META[row.status];
  const displayName = row.shipName || row.customerName;
  return (
    <tr className={ROW_TINT[row.status] ?? ""}>
      <td>
        <span className={`badge badge-${meta.color}`}>{meta.label}</span>
      </td>
      <td className='col-name'>
        <div className='name'>
          {displayName || <span className='muted'>—</span>}
          {!row.shipName && row.customerName && (
            <span className='hint' title="Pas de nom de livraison : c'est le nom du client Stripe">
              {" "}(client)
            </span>
          )}
        </div>
        {row.email ? (
          <button
            type='button'
            className='link-btn email'
            title="Copier l'email"
            onClick={() => copyToClipboard(row.email, "Email")}
          >
            {row.email}
          </button>
        ) : row.customerDeleted ? (
          <span className='muted small'>client supprimé</span>
        ) : null}
      </td>
      <td className='col-address'>
        {row.hasAddress ? (
          <>
            <div>{row.line1}</div>
            {row.line2 && <div className='muted'>{row.line2}</div>}
          </>
        ) : (
          <span className='no-address'>Pas d'adresse de livraison</span>
        )}
      </td>
      <td
        className={`mono ${row.postalStartsWithZero ? "cell-zero" : ""}`}
        title={row.postalStartsWithZero ? "Code postal commençant par 0 : vérifier qu'il n'a pas perdu son 0 dans Excel" : undefined}
      >
        {row.postalCode}
      </td>
      <td>
        {row.city}
        {row.state && <div className='muted small'>{row.state}</div>}
      </td>
      <td className='mono'>{row.country}</td>
      <td className='nowrap muted'>{dateFmt.format(row.created * 1000)}</td>
      <td className='nowrap actions'>
        {row.hasAddress && (
          <button
            type='button'
            className='icon-btn'
            title="Copier l'adresse complète (format étiquette)"
            onClick={() => copyToClipboard(formatAddressBlock(row), "Adresse")}
          >
            <Copy size={15} />
          </button>
        )}
        <a
          className='icon-btn'
          href={stripeDashboardUrl(row)}
          target='_blank'
          rel='noreferrer'
          title={`Ouvrir ${row.id} dans Stripe`}
        >
          <ExternalLink size={15} />
        </a>
      </td>
    </tr>
  );
});

interface Props {
  rows: SubscriptionRow[];
  sort: SortState;
  onSort: (key: SortKey) => void;
}

export const SubscriptionsTable = ({ rows, sort, onSort }: Props) => (
  <table className='subs-table'>
    <thead>
      <tr>
        <SortHeader label='Statut' k='status' sort={sort} onSort={onSort} />
        <SortHeader label='Destinataire' k='name' sort={sort} onSort={onSort} />
        <th>Adresse</th>
        <SortHeader label='CP' k='postalCode' sort={sort} onSort={onSort} />
        <SortHeader label='Ville' k='city' sort={sort} onSort={onSort} />
        <SortHeader label='Pays' k='country' sort={sort} onSort={onSort} />
        <SortHeader label='Créé le' k='created' sort={sort} onSort={onSort} />
        <th aria-label='Actions' />
      </tr>
    </thead>
    <tbody>
      {rows.map((row) => (
        <Row key={row.id} row={row} />
      ))}
    </tbody>
  </table>
);
