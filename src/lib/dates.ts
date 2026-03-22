const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric"
});

const dateTimeFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit"
});

const DAY_IN_MS = 1000 * 60 * 60 * 24;

function parseDateOnly(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

  if (!match) {
    return null;
  }

  const [, year, month, day] = match;
  const parsed = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));

  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function formatDate(value: string | null): string {
  if (!value) {
    return "Not available";
  }

  return dateFormatter.format(new Date(value));
}

export function formatDateTime(value: string | null): string {
  if (!value) {
    return "Not available";
  }

  return dateTimeFormatter.format(new Date(value));
}

export function formatDateOnly(value: string | null): string {
  if (!value) {
    return "Not available";
  }

  const parsed = parseDateOnly(value);

  if (!parsed) {
    return "Not available";
  }

  return dateFormatter.format(parsed);
}

export function countDaysSince(
  value: string | null,
  referenceTime = Date.now()
): number {
  if (!value) {
    return 0;
  }

  const timestamp = new Date(value).getTime();

  if (Number.isNaN(timestamp)) {
    return 0;
  }

  return Math.max(0, Math.floor((referenceTime - timestamp) / DAY_IN_MS));
}
