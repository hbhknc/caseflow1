export type DeadlineStatus =
  | "upcoming"
  | "due_today"
  | "overdue"
  | "completed"
  | "dismissed";

export type DeadlinePriority = "low" | "medium" | "high";

export type DeadlineSourceType = "manual" | "template";

export type DeadlineTemplateKey =
  | "standard_estate_administration"
  | "custom_manual_only";

export type DeadlineAnchorType = "qualification_date" | "publication_date";

export type DeadlineTemplateItemKey =
  | "inventory_due"
  | "accounting_due"
  | "publication_follow_up"
  | "closing_review_target";

export type DeadlineDashboardBucket =
  | "overdue"
  | "due_today"
  | "next_7_days"
  | "next_30_days"
  | "later"
  | "completed"
  | "dismissed";

export type DeadlineTemplateItemConfig = {
  key: DeadlineTemplateItemKey;
  title: string;
  category: string;
  anchorType: DeadlineAnchorType;
  offsetDays: number;
  defaultPriority: DeadlinePriority;
  enabled: boolean;
};

export type DeadlineTemplateDefinition = {
  key: DeadlineTemplateKey;
  label: string;
  description: string;
  items: DeadlineTemplateItemConfig[];
};

export type DeadlineTemplateSettings = {
  templates: DeadlineTemplateDefinition[];
};

export type MatterDeadlineSettings = {
  matterId: string;
  templateKey: DeadlineTemplateKey;
  qualificationDate: string | null;
  publicationDate: string | null;
};

export type MatterDeadlineSettingsInput = Omit<MatterDeadlineSettings, "matterId">;

export type MatterDeadlineSummary = {
  overdueCount: number;
  dueTodayCount: number;
  activeCount: number;
  nextDeadlineTitle: string | null;
  nextDeadlineDueDate: string | null;
  nextDeadlineStatus: Extract<DeadlineStatus, "upcoming" | "due_today" | "overdue"> | null;
};

export type Deadline = {
  id: string;
  matterId: string;
  boardId: string;
  boardName: string | null;
  matterName: string;
  clientName: string;
  fileNumber: string;
  title: string;
  category: string;
  dueDate: string;
  assignee: string | null;
  status: DeadlineStatus;
  priority: DeadlinePriority;
  sourceType: DeadlineSourceType;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  completedBy: string | null;
  completionNote: string | null;
  dismissedAt: string | null;
  dismissedBy: string | null;
  templateKey: DeadlineTemplateKey | null;
  templateItemKey: DeadlineTemplateItemKey | null;
  isOverridden: boolean;
};

export type DeadlineInput = {
  matterId: string;
  title: string;
  category: string;
  dueDate: string;
  assignee: string;
  priority: DeadlinePriority;
  notes: string;
};

export type DeadlineUpdateInput = Omit<DeadlineInput, "matterId">;

export type DeadlineCompletionInput = {
  completionNote: string;
};

export type DeadlineDashboardFilters = {
  assignee: string;
  matterId: string;
  status: DeadlineStatus | "all";
};

export type DeadlineDashboardMatterOption = {
  matterId: string;
  boardId: string;
  boardName: string | null;
  label: string;
};

export type DeadlineDashboardData = {
  deadlines: Deadline[];
  assignees: string[];
  matters: DeadlineDashboardMatterOption[];
};
