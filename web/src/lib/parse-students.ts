export type BulkStudentRow = {
  line: number;
  raw: string;
  firstName: string;
  lastName: string;
  externalId: string;
  error?: string;
};

export type BulkParseResult = {
  rows: BulkStudentRow[];
  errors: BulkStudentRow[];
};

const ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{1,31}$/;

/**
 * Accepts one student per line using either:
 *   Maya Rodriguez, 100100001
 *   Maya, Rodriguez, 100100001
 * Columns may be comma- or tab-separated. A header row is ignored.
 */
export function parseBulkStudents(text: string): BulkParseResult {
  const rows: BulkStudentRow[] = [];
  const seen = new Set<string>();
  const lines = String(text ?? "").replace(/\r/g, "").split("\n");

  lines.forEach((line, index) => {
    const raw = line.trim();
    if (!raw || raw.startsWith("#")) return;
    if (index === 0 && /first|last|name/i.test(raw) && /\bid\b/i.test(raw)) return;

    const parts = raw.split(/\t|,/).map((part) => part.trim());
    let firstName = "";
    let lastName = "";
    let externalId = "";

    if (parts.length === 2) {
      externalId = parts[1];
      const tokens = parts[0].split(/\s+/).filter(Boolean);
      if (tokens.length >= 2) {
        firstName = tokens[0];
        lastName = tokens.slice(1).join(" ");
      } else {
        firstName = parts[0];
      }
    } else if (parts.length >= 3) {
      firstName = parts[0];
      externalId = parts[parts.length - 1];
      lastName = parts.slice(1, -1).join(" ").trim();
    }

    let error = "";
    if (!parts[0] || !externalId) error = "Use name, ID — or first, last, ID.";
    else if (!firstName) error = "Add a first and last name.";
    else if (!lastName) error = "Add a last name (or use first, last, ID).";
    else if (!ID_PATTERN.test(externalId)) error = "That student ID has unsupported characters.";
    else if (firstName.length > 30 || lastName.length > 30) error = "Names must be 30 characters or fewer.";
    else if (seen.has(externalId.toLowerCase())) error = "This ID appears more than once in the list.";

    if (!error) seen.add(externalId.toLowerCase());
    rows.push({ line: index + 1, raw, firstName, lastName, externalId, ...(error ? { error } : {}) });
  });

  return { rows, errors: rows.filter((row) => row.error) };
}
