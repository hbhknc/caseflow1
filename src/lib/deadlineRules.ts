import type {
  Deadline,
  DeadlineDashboardBucket,
  DeadlinePriority,
  DeadlineStatus,
  DeadlineTemplateItemConfig,
  DeadlineTemplateItemKey,
  DeadlineTemplateKey,
  DeadlineTemplateSettings,
  MatterDeadlineSettings,
  MatterDeadlineSummary
} from "@/types/deadlines";

type DeadlineLike = Pick<Deadline, "dueDate" | "completedAt" | "dismissedAt">;

export type GeneratedDeadlineDraft = {
  templateKey: DeadlineTemplateKey;
  templateItemKey: DeadlineTemplateItemKey;
  title: string;
  category: string;
  dueDate: string;
  priority: DeadlinePriority;
};

export type ReconciledGeneratedDeadline = GeneratedDeadlineDraft & {
  id: string;
};

export type ExistingGeneratedDeadline = {
  id: string;
  templateKey: DeadlineTemplateKey | null;
  templateItemKey: DeadlineTemplateItemKey | null;
  sourceType: Deadline["sourceType"];
  isOverridden: boolean;
  completedAt: string | null;
  dismissedAt: string | null;
};

export type GeneratedDeadlineReconciliation = {
  toCreate: GeneratedDeadlineDraft[];
  toUpdate: ReconciledGeneratedDeadline[];
  toDismiss: string[];
};

const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export const DEFAULT_DEADLINE_TEMPLATE_SETTINGS: DeadlineTemplateSettings = {
  templates: [
    {
      key: "standard_estate_administration",
      label: "Standard Estate Administration",
      description: "Generated probate deadlines based on qualification and publication anchors.",
      items: [
        {
          key: "inventory_due",
          title: "Inventory Due",
          category: "Inventory",
          anchorType: "qualification_date",
          offsetDays: 90,
          defaultPriority: "high",
          enabled: true
        },
        {
          key: "accounting_due",
          title: "Accounting Due",
          category: "Accounting",
          anchorType: "qualification_date",
          offsetDays: 365,
          defaultPriority: "medium",
          enabled: true
        },
        {
          key: "publication_follow_up",
          title: "Publication Follow-Up",
          category: "Notice to Creditors",
          anchorType: "publication_date",
          offsetDays: 30,
          defaultPriority: "medium",
          enabled: true
        },
        {
          key: "closing_review_target",
          title: "Closing Review Target",
          category: "Closing",
          anchorType: "qualification_date",
          offsetDays: 270,
          defaultPriority: "low",
          enabled: true
        }
      ]
    },
    {
      key: "custom_manual_only",
      label: "Custom / Manual Only",
      description: "No generated deadlines. Manage deadlines manually for this matter.",
      items: []
    }
  ]
};

function parseDateOnly(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

export function isValidDateOnly(value: string) {
  if (!DATE_ONLY_PATTERN.test(value)) {
    return false;
  }

  const parsed = parseDateOnly(value);
  return parsed.toISOString().slice(0, 10) === value;
}

export function normalizeOptionalDateOnly(value: string | null | undefined) {
  const trimmed = value?.trim();

  if (!trimmed) {
    return null;
  }

  return isValidDateOnly(trimmed) ? trimmed : null;
}

export function getTodayDateOnly(referenceDate = new Date()) {
  return referenceDate.toISOString().slice(0, 10);
}

export function addDaysToDateOnly(value: string, offsetDays: number) {
  const date = parseDateOnly(value);
  date.setUTCDate(date.getUTCDate() + offsetDays);
  return date.toISOString().slice(0, 10);
}

export function differenceInDays(fromDate: string, toDate: string) {
  const from = parseDateOnly(fromDate).getTime();
  const to = parseDateOnly(toDate).getTime();
  return Math.round((to - from) / (1000 * 60 * 60 * 24));
}

export function calculateDeadlineStatus(
  deadline: DeadlineLike,
  referenceDate = new Date()
): DeadlineStatus {
  if (deadline.completedAt) {
    return "completed";
  }

  if (deadline.dismissedAt) {
    return "dismissed";
  }

  const today = getTodayDateOnly(referenceDate);

  if (deadline.dueDate < today) {
    return "overdue";
  }

  if (deadline.dueDate === today) {
    return "due_today";
  }

  return "upcoming";
}

export function getDeadlineDashboardBucket(
  deadline: DeadlineLike,
  referenceDate = new Date()
): DeadlineDashboardBucket {
  const status = calculateDeadlineStatus(deadline, referenceDate);

  if (status === "completed") {
    return "completed";
  }

  if (status === "dismissed") {
    return "dismissed";
  }

  if (status === "overdue") {
    return "overdue";
  }

  if (status === "due_today") {
    return "due_today";
  }

  const daysUntilDue = differenceInDays(getTodayDateOnly(referenceDate), deadline.dueDate);

  if (daysUntilDue <= 7) {
    return "next_7_days";
  }

  if (daysUntilDue <= 30) {
    return "next_30_days";
  }

  return "later";
}

export function getDeadlineTemplate(
  templateSettings: DeadlineTemplateSettings,
  templateKey: DeadlineTemplateKey
) {
  return templateSettings.templates.find((template) => template.key === templateKey) ?? null;
}

function getAnchorDate(
  settings: MatterDeadlineSettings,
  item: DeadlineTemplateItemConfig
) {
  return item.anchorType === "qualification_date"
    ? settings.qualificationDate
    : settings.publicationDate;
}

export function buildGeneratedDeadlineDrafts(
  settings: MatterDeadlineSettings,
  templateSettings: DeadlineTemplateSettings
): GeneratedDeadlineDraft[] {
  const template = getDeadlineTemplate(templateSettings, settings.templateKey);

  if (!template || template.key === "custom_manual_only") {
    return [];
  }

  return template.items.flatMap((item) => {
    if (!item.enabled) {
      return [];
    }

    const anchorDate = getAnchorDate(settings, item);

    if (!anchorDate) {
      return [];
    }

    return [
      {
        templateKey: template.key,
        templateItemKey: item.key,
        title: item.title,
        category: item.category,
        dueDate: addDaysToDateOnly(anchorDate, item.offsetDays),
        priority: item.defaultPriority
      }
    ];
  });
}

export function reconcileGeneratedDeadlines(input: {
  settings: MatterDeadlineSettings;
  templateSettings: DeadlineTemplateSettings;
  existingDeadlines: ExistingGeneratedDeadline[];
}): GeneratedDeadlineReconciliation {
  const expectedDrafts = buildGeneratedDeadlineDrafts(input.settings, input.templateSettings);
  const expectedByItem = new Map(
    expectedDrafts.map((draft) => [draft.templateItemKey, draft])
  );
  const activeByItem = new Map<DeadlineTemplateItemKey, ExistingGeneratedDeadline>();
  const completedItems = new Set<DeadlineTemplateItemKey>();

  for (const deadline of input.existingDeadlines) {
    if (deadline.sourceType !== "template" || !deadline.templateItemKey) {
      continue;
    }

    if (deadline.completedAt) {
      completedItems.add(deadline.templateItemKey);
      continue;
    }

    if (!deadline.dismissedAt && !activeByItem.has(deadline.templateItemKey)) {
      activeByItem.set(deadline.templateItemKey, deadline);
    }
  }

  const toDismiss: string[] = [];
  const toUpdate: ReconciledGeneratedDeadline[] = [];

  for (const [itemKey, existing] of activeByItem) {
    const expected = expectedByItem.get(itemKey);

    if (existing.isOverridden) {
      expectedByItem.delete(itemKey);
      continue;
    }

    if (!expected) {
      toDismiss.push(existing.id);
      continue;
    }

    toUpdate.push({
      ...expected,
      id: existing.id
    });
    expectedByItem.delete(itemKey);
  }

  const toCreate = [...expectedByItem.values()].filter(
    (draft) => !completedItems.has(draft.templateItemKey)
  );

  return { toCreate, toUpdate, toDismiss };
}

export function buildMatterDeadlineSummary(
  deadlines: Deadline[],
  referenceDate = new Date()
): MatterDeadlineSummary {
  const activeDeadlines = deadlines.filter((deadline) => {
    const status = calculateDeadlineStatus(deadline, referenceDate);
    return status !== "completed" && status !== "dismissed";
  });
  const overdueCount = activeDeadlines.filter(
    (deadline) => calculateDeadlineStatus(deadline, referenceDate) === "overdue"
  ).length;
  const dueTodayCount = activeDeadlines.filter(
    (deadline) => calculateDeadlineStatus(deadline, referenceDate) === "due_today"
  ).length;
  const nextDeadline = [...activeDeadlines].sort((left, right) => {
    if (left.dueDate !== right.dueDate) {
      return left.dueDate.localeCompare(right.dueDate);
    }

    return left.title.localeCompare(right.title, undefined, { sensitivity: "base" });
  })[0] ?? null;

  return {
    overdueCount,
    dueTodayCount,
    activeCount: activeDeadlines.length,
    nextDeadlineTitle: nextDeadline?.title ?? null,
    nextDeadlineDueDate: nextDeadline?.dueDate ?? null,
    nextDeadlineStatus: nextDeadline
      ? (calculateDeadlineStatus(nextDeadline, referenceDate) as
          | "upcoming"
          | "due_today"
          | "overdue")
      : null
  };
}
