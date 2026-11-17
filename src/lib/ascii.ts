/**
 * Conversion "tout ASCII" pour la machine de publipostage (qui affiche
 * les accents en unicode brut). On remplace chaque caractère accentué
 * ou spécial par son équivalent sans accent.
 *
 *   "Zoë Müller, 3 rue de l’Église" → "Zoe Muller, 3 rue de l'Eglise"
 *   "Straße" → "Strasse", "Søren" → "Soren", "Œuvre" → "Oeuvre"
 */

/** Lettres qui ne se décomposent pas en "lettre + accent" via Unicode. */
const SPECIAL_CHARS: Record<string, string> = {
  ß: "ss", ẞ: "SS",
  æ: "ae", Æ: "Ae",
  œ: "oe", Œ: "Oe",
  ø: "o", Ø: "O",
  ł: "l", Ł: "L",
  đ: "d", Đ: "D",
  ð: "d", Ð: "D",
  þ: "th", Þ: "Th",
  ı: "i", ħ: "h", Ħ: "H",
  ŧ: "t", Ŧ: "T",
  ŋ: "n", Ŋ: "N",
  ĸ: "k", ſ: "s",
  // Ponctuation "typographique" → équivalent clavier
  "‘": "'", "’": "'", "‚": "'", "‛": "'", "ʼ": "'", "´": "'", "`": "'",
  "“": '"', "”": '"', "„": '"', "‟": '"', "«": '"', "»": '"',
  "‹": "'", "›": "'",
  "‐": "-", "‑": "-", "‒": "-", "–": "-", "—": "-", "―": "-", "−": "-",
  "…": "...",
  "°": "o", "º": "o", "ª": "a",
  "•": "-", "·": ".",
  "€": "EUR", "£": "GBP",
};

const SPECIAL_RE = new RegExp(`[${Object.keys(SPECIAL_CHARS).join("")}]`, "g");
// Espaces exotiques (insécable, fine insécable, etc.) → espace normal
const SPACES_RE = /[\u00A0\u1680\u2000-\u200A\u202F\u205F\u3000\t\r\n]+/g;
// Caractères invisibles (zero-width, BOM, soft hyphen)
const INVISIBLE_RE = /[\u00AD\u200B-\u200D\u2060\uFEFF]/g;
const COMBINING_MARKS_RE = /\p{M}/gu;

export const toAscii = (input: string | null | undefined): string => {
  if (!input) return "";
  return input
    .replace(INVISIBLE_RE, "")
    .replace(SPACES_RE, " ")
    .replace(SPECIAL_RE, (c) => SPECIAL_CHARS[c] ?? c)
    .normalize("NFKD") // é → e + ◌́ ; ﬁ → fi ; ² → 2
    .replace(COMBINING_MARKS_RE, "") // retire les accents détachés
    .normalize("NFC")
    .replace(/ {2,}/g, " ")
    .trim();
};

/** Vrai s'il reste des caractères hors ASCII imprimable (ex: cyrillique, chinois). */
export const hasNonAscii = (s: string) => /[^\x20-\x7E]/.test(s);

/** Version pour la recherche : sans accent + minuscules. */
export const searchable = (s: string | null | undefined) =>
  toAscii(s).toLowerCase();
