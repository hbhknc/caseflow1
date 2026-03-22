import { describe, expect, it } from "vitest";
import type {
  Deadline,
  DeadlineTemplateSettings,
  MatterDeadlineSettings
} from "@/types/deadlines";
import {
  DEFAULT_DEADLINE_TEMPLATE_SETTINGS,
  buildGeneratedDeadlineDrafts,
  buildMatterDeadlineSummary,
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
        createDeadline({
          id: "deadline_completed",
          title: "Completed",
          dueDate: "2026-03-10",
          completedAt: "2026-03-11T12:00:00.000Z"
        }),
        createDeadline({ id: "deadline_next", title: "Next", dueDate: "2026-03-24" })
      ],
      referenceDate
    );

    expect(summary.overdueCount).toBe(1);
    expect(summary.activeCount).toBe(2);
    expect(summary.nextDeadlineTitle).toBe("Overdue");
    expect(summary.nextDeadlineDueDate).toBe("2026-03-15");
  });
});
