import type { MatterDeadlineSettingsInput } from "@/types/deadlines";

export const DEFAULT_NEW_MATTER_DEADLINE_TEMPLATE_KEY = "standard_estate_administration";

export function applyAnchorDateChangeToDeadlineSettingsDraft(
  draft: MatterDeadlineSettingsInput,
  updates: Partial<Pick<MatterDeadlineSettingsInput, "qualificationDate" | "publicationDate">>
): MatterDeadlineSettingsInput {
  const nextDraft: MatterDeadlineSettingsInput = {
    ...draft,
    ...updates
  };

  const addedQualificationDate = !draft.qualificationDate && Boolean(nextDraft.qualificationDate);
  const addedPublicationDate = !draft.publicationDate && Boolean(nextDraft.publicationDate);

  if (
    draft.templateKey === "custom_manual_only" &&
    nextDraft.templateKey === "custom_manual_only" &&
    (addedQualificationDate || addedPublicationDate)
  ) {
    return {
      ...nextDraft,
      templateKey: DEFAULT_NEW_MATTER_DEADLINE_TEMPLATE_KEY
    };
  }

  return nextDraft;
}
