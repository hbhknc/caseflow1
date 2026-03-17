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
