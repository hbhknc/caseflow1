import { describe, expect, it } from "vitest";
import { createDemoMatter } from "@/lib/demoData";
import {
  applyAnchorDateChangeToDeadlineSettingsDraft,
  DEFAULT_NEW_MATTER_DEADLINE_TEMPLATE_KEY
} from "@/lib/matterDeadlineSettings";
import type { MatterDeadlineSettingsInput } from "@/types/deadlines";

function createSettingsDraft(
  overrides: Partial<MatterDeadlineSettingsInput> = {}
): MatterDeadlineSettingsInput {
  return {
    templateKey: "custom_manual_only",
    qualificationDate: null,
    publicationDate: null,
    ...overrides
  };
}

describe("DEFAULT_NEW_MATTER_DEADLINE_TEMPLATE_KEY", () => {
  it("defaults new demo matters to the probate deadline template", () => {
    const matter = createDemoMatter({
      boardId: "probate",
      decedentName: "Jane Doe",
      clientName: "John Doe",
      fileNumber: "PR-2026-9999",
      stage: "intake"
    });

    expect(matter.deadlineTemplateKey).toBe(DEFAULT_NEW_MATTER_DEADLINE_TEMPLATE_KEY);
  });
});

describe("applyAnchorDateChangeToDeadlineSettingsDraft", () => {
  it("promotes manual-only matters when a qualification date is added", () => {
    expect(
      applyAnchorDateChangeToDeadlineSettingsDraft(createSettingsDraft(), {
        qualificationDate: "2026-03-23"
      })
    ).toEqual(
      expect.objectContaining({
        templateKey: DEFAULT_NEW_MATTER_DEADLINE_TEMPLATE_KEY,
        qualificationDate: "2026-03-23"
      })
    );
  });

  it("promotes manual-only matters when a publication date is added", () => {
    expect(
      applyAnchorDateChangeToDeadlineSettingsDraft(createSettingsDraft(), {
        publicationDate: "2026-03-23"
      })
    ).toEqual(
      expect.objectContaining({
        templateKey: DEFAULT_NEW_MATTER_DEADLINE_TEMPLATE_KEY,
        publicationDate: "2026-03-23"
      })
    );
  });

  it("preserves the current template when an anchor date is cleared", () => {
    expect(
      applyAnchorDateChangeToDeadlineSettingsDraft(
        createSettingsDraft({
          templateKey: DEFAULT_NEW_MATTER_DEADLINE_TEMPLATE_KEY,
          qualificationDate: "2026-03-23"
        }),
        {
          qualificationDate: null
        }
      )
    ).toEqual({
      templateKey: DEFAULT_NEW_MATTER_DEADLINE_TEMPLATE_KEY,
      qualificationDate: null,
      publicationDate: null
    });
  });
});
