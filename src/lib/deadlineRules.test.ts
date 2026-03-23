import { describe, expect, it } from "vitest";
import type {
  Deadline,
  DeadlineTemplateSettings,
  MatterDeadlineSettings
} from "@/types/deadlines";
import {
  buildMatterAnchorAlerts,
  DEFAULT_DEADLINE_TEMPLATE_SETTINGS,
  buildGeneratedDeadlineDrafts,
  buildMatterDeadlineSummary,
  calculateDeadlineReminderState,
  calculateDeadlineStatus,
  getDeadlineDashboardBucket,
  reconcileGeneratedDeadlines
} from "@/lib/deadlineRules";

function createDeadline(overrides: Partial<Deadline> = {}): Deadline {
  return {
    id: "deadline_001",
    matterId: "matter_001",
    boardId: "probate",
    boardName: "Probate",
    matterName: "Estate of Jane Doe",
    clientName: "John Doe",
    fileNumber: "PR-2026-0001",
    title: "Inventory Due",
    category: "Inventory",
    dueDate: "2026-03-25",
    assignee: "Case Manager",
    status: "upcoming",
    reminderState: "none",
    priority: "high",
    sourceType: "manual",
    notes: null,
    createdAt: "2026-03-01T12:00:00.000Z",
    updatedAt: "2026-03-01T12:00:00.000Z",
    completedAt: null,
    completedBy: null,
    completionNote: null,
    dismissedAt: null,
    dismissedBy: null,
    templateKey: null,
    templateItemKey: null,
    isOverridden: false,
    ...overrides
  };
}

function createMatterDeadlineSettings(
  overrides: Partial<MatterDeadlineSettings> = {}
): MatterDeadlineSettings {
  return {
    matterId: "matter_001",
    templateKey: "standard_estate_administration",
    qualificationDate: "2026-01-10",
    publicationDate: "2026-01-18",
    ...overrides
  };
}

describe("calculateDeadlineStatus", () => {
  const referenceDate = new Date("2026-03-22T12:00:00.000Z");

  it("derives overdue, due today, and upcoming from due date", () => {
    expect(
      calculateDeadlineStatus(createDeadline({ dueDate: "2026-03-21" }), referenceDate)
    ).toBe("overdue");
    expect(
      calculateDeadlineStatus(createDeadline({ dueDate: "2026-03-22" }), referenceDate)
    ).toBe("due_today");
    expect(
      calculateDeadlineStatus(createDeadline({ dueDate: "2026-03-23" }), referenceDate)
    ).toBe("upcoming");
  });

  it("treats completed and dismissed as terminal states", () => {
    expect(
      calculateDeadlineStatus(
        createDeadline({ completedAt: "2026-03-22T10:00:00.000Z" }),
        referenceDate
      )
    ).toBe("completed");
    expect(
      calculateDeadlineStatus(
        createDeadline({ dismissedAt: "2026-03-22T10:00:00.000Z" }),
        referenceDate
      )
    ).toBe("dismissed");
  });
});

describe("calculateDeadlineReminderState", () => {
  const referenceDate = new Date("2026-03-22T12:00:00.000Z");

  it("derives reminder windows for overdue, today, tomorrow, 7 days, and 14 days", () => {
    expect(
      calculateDeadlineReminderState(createDeadline({ dueDate: "2026-03-21" }), referenceDate)
    ).toBe("overdue");
    expect(
      calculateDeadlineReminderState(createDeadline({ dueDate: "2026-03-22" }), referenceDate)
    ).toBe("due_today");
    expect(
      calculateDeadlineReminderState(createDeadline({ dueDate: "2026-03-23" }), referenceDate)
    ).toBe("due_tomorrow");
    expect(
      calculateDeadlineReminderState(createDeadline({ dueDate: "2026-03-29" }), referenceDate)
    ).toBe("due_in_7_days");
    expect(
      calculateDeadlineReminderState(createDeadline({ dueDate: "2026-04-05" }), referenceDate)
    ).toBe("due_in_14_days");
    expect(
      calculateDeadlineReminderState(createDeadline({ dueDate: "2026-04-10" }), referenceDate)
    ).toBe("none");
  });

  it("does not emit reminder states for completed or dismissed deadlines", () => {
    expect(
      calculateDeadlineReminderState(
        createDeadline({ completedAt: "2026-03-22T10:00:00.000Z" }),
        referenceDate
      )
    ).toBe("none");
    expect(
      calculateDeadlineReminderState(
        createDeadline({ dismissedAt: "2026-03-22T10:00:00.000Z" }),
        referenceDate
      )
    ).toBe("none");
  });
});

describe("buildGeneratedDeadlineDrafts", () => {
  it("creates generated deadlines from qualification and publication anchors", () => {
    const drafts = buildGeneratedDeadlineDrafts(
      createMatterDeadlineSettings(),
      DEFAULT_DEADLINE_TEMPLATE_SETTINGS
    );

    expect(drafts.map((draft) => draft.templateItemKey)).toEqual([
      "inventory_due",
      "accounting_due",
      "publication_follow_up",
      "closing_review_target"
    ]);
    expect(drafts.find((draft) => draft.templateItemKey === "inventory_due")?.dueDate).toBe(
      "2026-04-10"
    );
    expect(
      drafts.find((draft) => draft.templateItemKey === "publication_follow_up")?.dueDate
    ).toBe("2026-02-17");
  });

  it("returns no generated deadlines for manual-only matters", () => {
    expect(
      buildGeneratedDeadlineDrafts(
        createMatterDeadlineSettings({ templateKey: "custom_manual_only" }),
        DEFAULT_DEADLINE_TEMPLATE_SETTINGS
      )
    ).toEqual([]);
  });
});

describe("reconcileGeneratedDeadlines", () => {
  it("updates non-overridden generated deadlines when anchors change", () => {
    const result = reconcileGeneratedDeadlines({
      settings: createMatterDeadlineSettings({ qualificationDate: "2026-02-01" }),
      templateSettings: DEFAULT_DEADLINE_TEMPLATE_SETTINGS,
      existingDeadlines: [
        {
          id: "deadline_inventory",
          templateKey: "standard_estate_administration",
          templateItemKey: "inventory_due",
          sourceType: "template",
          isOverridden: false,
          completedAt: null,
          dismissedAt: null
        }
      ]
    });

    expect(result.toUpdate).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "deadline_inventory",
          templateItemKey: "inventory_due",
          dueDate: "2026-05-02"
        })
      ])
    );
  });

  it("preserves overridden generated deadlines and does not dismiss them when anchors clear", () => {
    const result = reconcileGeneratedDeadlines({
      settings: createMatterDeadlineSettings({ publicationDate: null }),
      templateSettings: DEFAULT_DEADLINE_TEMPLATE_SETTINGS,
      existingDeadlines: [
        {
          id: "deadline_publication",
          templateKey: "standard_estate_administration",
          templateItemKey: "publication_follow_up",
          sourceType: "template",
          isOverridden: true,
          completedAt: null,
          dismissedAt: null
        }
      ]
    });

    expect(result.toDismiss).toEqual([]);
    expect(result.toUpdate).toEqual([]);
    expect(result.toCreate).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ templateItemKey: "publication_follow_up" })
      ])
    );
  });

  it("does not recreate completed generated deadlines", () => {
    const result = reconcileGeneratedDeadlines({
      settings: createMatterDeadlineSettings(),
      templateSettings: DEFAULT_DEADLINE_TEMPLATE_SETTINGS,
      existingDeadlines: [
        {
          id: "deadline_accounting",
          templateKey: "standard_estate_administration",
          templateItemKey: "accounting_due",
          sourceType: "template",
          isOverridden: false,
          completedAt: "2026-03-20T12:00:00.000Z",
          dismissedAt: null
        }
      ]
    });

    expect(result.toCreate.find((draft) => draft.templateItemKey === "accounting_due")).toBe(
      undefined
    );
  });

  it("dismisses generated deadlines when a template item is removed", () => {
    const templateSettings: DeadlineTemplateSettings = {
      templates: DEFAULT_DEADLINE_TEMPLATE_SETTINGS.templates.map((template) =>
        template.key === "standard_estate_administration"
          ? {
              ...template,
              items: template.items.filter((item) => item.key !== "closing_review_target")
            }
          : template
      )
    };

    const result = reconcileGeneratedDeadlines({
      settings: createMatterDeadlineSettings(),
      templateSettings,
      existingDeadlines: [
        {
          id: "deadline_closing",
          templateKey: "standard_estate_administration",
          templateItemKey: "closing_review_target",
          sourceType: "template",
          isOverridden: false,
          completedAt: null,
          dismissedAt: null
        }
      ]
    });

    expect(result.toDismiss).toEqual(["deadline_closing"]);
  });
});

describe("deadline dashboard helpers", () => {
  const referenceDate = new Date("2026-03-22T12:00:00.000Z");

  it("assigns deadlines to dashboard buckets", () => {
    expect(getDeadlineDashboardBucket(createDeadline({ dueDate: "2026-03-20" }), referenceDate)).toBe(
      "overdue"
    );
    expect(getDeadlineDashboardBucket(createDeadline({ dueDate: "2026-03-22" }), referenceDate)).toBe(
      "due_today"
    );
    expect(getDeadlineDashboardBucket(createDeadline({ dueDate: "2026-03-27" }), referenceDate)).toBe(
      "next_7_days"
    );
    expect(getDeadlineDashboardBucket(createDeadline({ dueDate: "2026-04-10" }), referenceDate)).toBe(
      "next_30_days"
    );
  });

  it("builds a matter summary that excludes completed deadlines from overdue counts", () => {
    const summary = buildMatterDeadlineSummary(
      [
        createDeadline({ title: "Overdue", dueDate: "2026-03-15" }),
        createDeadline({ id: "deadline_today", title: "Today", dueDate: "2026-03-22" }),
        createDeadline({ id: "deadline_tomorrow", title: "Tomorrow", dueDate: "2026-03-23" }),
        createDeadline({
          id: "deadline_completed",
          title: "Completed",
          dueDate: "2026-03-10",
          completedAt: "2026-03-11T12:00:00.000Z"
        }),
        createDeadline({ id: "deadline_next", title: "Next", dueDate: "2026-03-24" })
      ],
      referenceDate,
      [
        {
          id: "matter_001:qualification_missing",
          matterId: "matter_001",
          boardId: "probate",
          boardName: "Probate",
          matterName: "Estate of Jane Doe",
          clientName: "John Doe",
          fileNumber: "PR-2026-0001",
          type: "qualification_missing",
          severity: "warning",
          message: "Qualification date missing."
        },
        {
          id: "matter_001:generated_deadlines_blocked",
          matterId: "matter_001",
          boardId: "probate",
          boardName: "Probate",
          matterName: "Estate of Jane Doe",
          clientName: "John Doe",
          fileNumber: "PR-2026-0001",
          type: "generated_deadlines_blocked",
          severity: "critical",
          message: "Generated deadlines blocked."
        }
      ]
    );

    expect(summary.overdueCount).toBe(1);
    expect(summary.activeCount).toBe(4);
    expect(summary.urgentReminderCount).toBe(3);
    expect(summary.anchorAlertCount).toBe(2);
    expect(summary.nextDeadlineTitle).toBe("Overdue");
    expect(summary.nextDeadlineDueDate).toBe("2026-03-15");
    expect(summary.nextReminderState).toBe("overdue");
  });
});

describe("buildMatterAnchorAlerts", () => {
  it("flags missing qualification dates for probate template matters", () => {
    const alerts = buildMatterAnchorAlerts(
      {
        matterId: "matter_001",
        boardId: "probate",
        boardName: "Probate",
        matterName: "Estate of Jane Doe",
        clientName: "John Doe",
        fileNumber: "PR-2026-0001",
        templateKey: "standard_estate_administration",
        qualificationDate: null,
        publicationDate: null
      },
      DEFAULT_DEADLINE_TEMPLATE_SETTINGS
    );

    expect(alerts.map((alert) => alert.type)).toEqual([
      "qualification_missing",
      "generated_deadlines_blocked"
    ]);
  });

  it("flags missing publication dates once qualification is present", () => {
    const alerts = buildMatterAnchorAlerts(
      {
        matterId: "matter_001",
        boardId: "probate",
        boardName: "Probate",
        matterName: "Estate of Jane Doe",
        clientName: "John Doe",
        fileNumber: "PR-2026-0001",
        templateKey: "standard_estate_administration",
        qualificationDate: "2026-03-01",
        publicationDate: null
      },
      DEFAULT_DEADLINE_TEMPLATE_SETTINGS
    );

    expect(alerts.map((alert) => alert.type)).toEqual([
      "publication_missing",
      "generated_deadlines_blocked"
    ]);
  });

  it("clears anchor alerts once required dates are present or the matter is manual only", () => {
    expect(
      buildMatterAnchorAlerts(
        {
          matterId: "matter_001",
          boardId: "probate",
          boardName: "Probate",
          matterName: "Estate of Jane Doe",
          clientName: "John Doe",
          fileNumber: "PR-2026-0001",
          templateKey: "standard_estate_administration",
          qualificationDate: "2026-03-01",
          publicationDate: "2026-03-10"
        },
        DEFAULT_DEADLINE_TEMPLATE_SETTINGS
      )
    ).toEqual([]);
    expect(
      buildMatterAnchorAlerts(
        {
          matterId: "matter_001",
          boardId: "probate",
          boardName: "Probate",
          matterName: "Estate of Jane Doe",
          clientName: "John Doe",
          fileNumber: "PR-2026-0001",
          templateKey: "custom_manual_only",
          qualificationDate: null,
          publicationDate: null
        },
        DEFAULT_DEADLINE_TEMPLATE_SETTINGS
      )
    ).toEqual([]);
  });
});
