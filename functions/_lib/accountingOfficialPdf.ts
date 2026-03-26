import {
  PDFCheckBox,
  PDFDocument,
  PDFTextField,
  StandardFonts,
  type PDFForm
} from "pdf-lib";
import {
  chunkOfficialFormRows,
  formatOfficialAmount,
  formatOfficialDate,
  getLedgerRowsByType,
  splitAddressForOfficialForm,
  summarizePartIiAssetsForOfficialForm
} from "../../src/lib/accountingOfficialForm";
import type {
  ProbateAccountingDetail,
  ProbateAccountingEntryType,
  ProbateAccountingLedgerEntry
} from "../../src/types/accounting";
import { getProbateAccountingDetail } from "./accountingRepository";

const OFFICIAL_FORM_PAGE_URL = "https://www.nccourts.gov/documents/forms/account";
const BASE_ROW_LIMIT = 10;
const ATTACHMENT_ROW_LIMIT = 34;

const FALLBACK_TEMPLATE_URLS = {
  main:
    "https://www.nccourts.gov/assets/documents/forms/e506-nocalc_0.pdf?VersionId=uC7rb2d4iOqZjln8rNLJsRwsAsnyTbxL",
  partIII:
    "https://www.nccourts.gov/assets/documents/forms/e506-cont-iii.pdf?VersionId=S4WhbJxWhfHvzkh6s6p1ehwPJE26knZJ",
  partIV:
    "https://www.nccourts.gov/assets/documents/forms/e506-cont-iv.pdf?VersionId=lTB9LcqoJ_tI2e5FZ.9dvQVLj60oakxV",
  partV:
    "https://www.nccourts.gov/assets/documents/forms/e506-cont-v_0.pdf?VersionId=jYcZ78w5_MDd.JU3C0WI1N2cJt.OVkHT"
};

type OfficialTemplateKey = keyof typeof FALLBACK_TEMPLATE_URLS;

type OfficialSectionConfig = {
  continuationTemplate: OfficialTemplateKey;
  mainFrontTotalField: string;
  mainBodyTotalField: string;
  mainAttachmentTotalField: string;
  continuationTotalField: string;
  fillMainRow: (form: PDFForm, rowIndex: number, row: ProbateAccountingLedgerEntry) => void;
  fillContinuationRow: (
    form: PDFForm,
    rowIndex: number,
    row: ProbateAccountingLedgerEntry
  ) => void;
};

type OfficialSectionData = {
  baseRows: ProbateAccountingLedgerEntry[];
  attachments: ProbateAccountingLedgerEntry[][];
  baseTotalCents: number;
  attachmentTotalCents: number;
  grandTotalCents: number;
};

let templateUrlsPromise: Promise<typeof FALLBACK_TEMPLATE_URLS> | null = null;
const templateBytesCache = new Map<string, Promise<Uint8Array>>();

const OFFICIAL_SECTION_CONFIGS: Record<ProbateAccountingEntryType, OfficialSectionConfig> = {
  receipt: {
    continuationTemplate: "partIII",
    mainFrontTotalField: "ReceiptsPartIIITotal",
    mainBodyTotalField: "PartIIITotal",
    mainAttachmentTotalField: "ReceiptsAttachmentTotal",
    continuationTotalField: "PartIIITotal",
    fillMainRow(form, rowIndex, row) {
      const fieldIndex = rowIndex + 1;
      setTextField(form, `ReceiptsReceived${fieldIndex}Date`, formatOfficialDate(row.entryDate));
      setTextField(form, `ReceiptsReceived${fieldIndex}From`, row.partyName);
      setTextField(form, `Receipts${fieldIndex}Description`, row.description);
      setTextField(form, `Receipts${fieldIndex}Amt`, formatOfficialAmount(row.amountCents));
    },
    fillContinuationRow(form, rowIndex, row) {
      const fieldIndex = rowIndex + 1;
      setTextField(form, `${fieldIndex}Date`, formatOfficialDate(row.entryDate));
      setTextField(form, `${fieldIndex}Received`, row.partyName);
      setTextField(form, `${fieldIndex}Desc`, row.description);
      setTextField(form, `${fieldIndex}Amt`, formatOfficialAmount(row.amountCents));
    }
  },
  disbursement: {
    continuationTemplate: "partIV",
    mainFrontTotalField: "DisbursementsPartIVTotal",
    mainBodyTotalField: "PartIVTotal",
    mainAttachmentTotalField: "DisburseAttachmentTotal",
    continuationTotalField: "PartIVTotal",
    fillMainRow(form, rowIndex, row) {
      const fieldIndex = rowIndex + 1;
      setTextField(form, `Disbursements${fieldIndex}Date`, formatOfficialDate(row.entryDate));
      setTextField(form, `Disbursements${fieldIndex}PaidOrDistributedTo`, row.partyName);
      setTextField(form, `Disbursements${fieldIndex}Description`, row.description);
      setTextField(form, `Disbursements${fieldIndex}Amt`, formatOfficialAmount(row.amountCents));
    },
    fillContinuationRow(form, rowIndex, row) {
      const fieldIndex = rowIndex + 1;
      setTextField(form, `${fieldIndex}Date`, formatOfficialDate(row.entryDate));
      setTextField(form, `${fieldIndex}Disbursed`, row.partyName);
      setTextField(form, `${fieldIndex}Desc`, row.description);
      setTextField(form, `${fieldIndex}Amt`, formatOfficialAmount(row.amountCents));
    }
  },
  distribution: {
    continuationTemplate: "partV",
    mainFrontTotalField: "DistributionsPartVTotal",
    mainBodyTotalField: "PartVTotal",
    mainAttachmentTotalField: "DistributionsAttachmentTotal",
    continuationTotalField: "PartVTotal",
    fillMainRow(form, rowIndex, row) {
      const fieldIndex = rowIndex + 1;
      setTextField(form, `Distributions${fieldIndex}Date`, formatOfficialDate(row.entryDate));
      setTextField(form, `Distributions${fieldIndex}DistributedTo`, formatDistributionTarget(row));
      setTextField(form, `Distributions${fieldIndex}Amt`, formatOfficialAmount(row.amountCents));
    },
    fillContinuationRow(form, rowIndex, row) {
      const fieldIndex = rowIndex + 1;
      setTextField(form, `${fieldIndex}Date`, formatOfficialDate(row.entryDate));
      setTextField(form, `${fieldIndex}Distributed`, formatDistributionTarget(row));
      setTextField(form, `${fieldIndex}Amt`, formatOfficialAmount(row.amountCents));
    }
  }
};

function buildFileName(accounting: ProbateAccountingDetail) {
  const safeParts = [accounting.fileNumber, accounting.decedentName]
    .map((value) =>
      value
        .trim()
        .replace(/[^A-Za-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
    )
    .filter(Boolean);

  return `AOC-E-506-${safeParts.join("-") || accounting.id}.pdf`;
}

function sumLedgerAmountCents(rows: ProbateAccountingLedgerEntry[]) {
  return rows.reduce((total, row) => total + row.amountCents, 0);
}

function formatDistributionTarget(row: ProbateAccountingLedgerEntry) {
  const partyName = row.partyName.trim();
  const description = row.description.trim();

  if (partyName && description) {
    return `${partyName} - ${description}`;
  }

  return partyName || description;
}

function splitLossExplanation(explanation: string) {
  const trimmed = explanation.trim();

  if (!trimmed) {
    return ["", ""] as const;
  }

  const splitIndex = (() => {
    if (trimmed.length <= 70) {
      return trimmed.length;
    }

    const preferredBreak = trimmed.lastIndexOf(" ", 70);
    return preferredBreak >= 20 ? preferredBreak : 70;
  })();

  return [
    trimmed.slice(0, splitIndex).trim(),
    trimmed.slice(splitIndex).trim()
  ] as const;
}

function buildSectionData(
  accounting: ProbateAccountingDetail,
  entryType: ProbateAccountingEntryType
): OfficialSectionData {
  const rows = getLedgerRowsByType(accounting.entries, entryType);
  const { baseRows, attachments } = chunkOfficialFormRows(rows, BASE_ROW_LIMIT, ATTACHMENT_ROW_LIMIT);
  const baseTotalCents = sumLedgerAmountCents(baseRows);
  const attachmentTotalCents = attachments.reduce(
    (total, attachmentRows) => total + sumLedgerAmountCents(attachmentRows),
    0
  );

  return {
    baseRows,
    attachments,
    baseTotalCents,
    attachmentTotalCents,
    grandTotalCents: baseTotalCents + attachmentTotalCents
  };
}

function setTextField(form: PDFForm, fieldName: string, value: string) {
  try {
    const field = form.getField(fieldName);

    if (!(field instanceof PDFTextField)) {
      return;
    }

    field.setText(value);
  } catch {
    // Ignore missing or incompatible fields so minor upstream form revisions do not crash export.
  }
}

function setCheckboxField(form: PDFForm, fieldName: string, checked: boolean) {
  try {
    const field = form.getField(fieldName);

    if (!(field instanceof PDFCheckBox)) {
      return;
    }

    if (checked) {
      field.check();
    } else {
      field.uncheck();
    }
  } catch {
    // Ignore missing or incompatible fields so minor upstream form revisions do not crash export.
  }
}

function fillMainHeader(form: PDFForm, accounting: ProbateAccountingDetail) {
  setTextField(form, "FileNumber", accounting.fileNumber);
  setTextField(form, "CountyName", accounting.county);
  setTextField(form, "Name", accounting.decedentName);
  setTextField(form, "AcctPeriod", formatOfficialDate(accounting.periodStart));
  setTextField(form, "ExtendingTo", formatOfficialDate(accounting.periodEnd));
  setTextField(form, "DateOfDeath", formatOfficialDate(accounting.dateOfDeath));

  setCheckboxField(form, "AnnualAccountCbx", accounting.accountType === "annual");
  setCheckboxField(form, "FinalAccountCbx", accounting.accountType === "final");
  setCheckboxField(form, "DeceasedCbx", true);
  setCheckboxField(form, "MinorCbx", false);
  setCheckboxField(form, "IncompetentCbx", false);
  setCheckboxField(form, "TrustCbx", false);

  const fiduciaryAddress = splitAddressForOfficialForm(accounting.fiduciaryAddress);
  setTextField(form, "FiduciaryName", accounting.fiduciaryName);
  setTextField(form, "FiduciaryAddr1", fiduciaryAddress.line1);
  setTextField(form, "FiduciaryAddr2", fiduciaryAddress.line2);
  setTextField(form, "FiduciaryCity", fiduciaryAddress.city);
  setTextField(form, "FiduciaryState", fiduciaryAddress.state);
  setTextField(form, "FiduciaryZip", fiduciaryAddress.zip);

  const coFiduciaryAddress = splitAddressForOfficialForm(accounting.coFiduciaryAddress);
  setTextField(form, "CoFiduciaryName", accounting.coFiduciaryName);
  setTextField(form, "CoFiduciaryAddr1", coFiduciaryAddress.line1);
  setTextField(form, "CoFiduciaryAddr2", coFiduciaryAddress.line2);
  setTextField(form, "CoFiduciaryCity", coFiduciaryAddress.city);
  setTextField(form, "CoFiduciaryState", coFiduciaryAddress.state);
  setTextField(form, "CoFiduciaryZip", coFiduciaryAddress.zip);
}

function fillContinuationHeader(
  form: PDFForm,
  accounting: ProbateAccountingDetail,
  pageNumber: number,
  pageCount: number
) {
  setTextField(form, "FileNumber", accounting.fileNumber);
  setTextField(form, "CountyName", accounting.county);
  setTextField(form, "Name", accounting.decedentName);
  setTextField(form, "AcctPeriod", formatOfficialDate(accounting.periodStart));
  setTextField(form, "ExtendingTo", formatOfficialDate(accounting.periodEnd));
  setTextField(form, "Page", String(pageNumber));
  setTextField(form, "PageOf", String(pageCount));

  setCheckboxField(form, "Deceased", true);
  setCheckboxField(form, "Minor", false);
  setCheckboxField(form, "AdultWard", false);
  setCheckboxField(form, "Trust", false);
}

function fillPartISummary(form: PDFForm, accounting: ProbateAccountingDetail) {
  const totals = accounting.computed.totals;
  const [lossExplanationLine1, lossExplanationLine2] = splitLossExplanation(
    accounting.lossExplanation
  );

  setTextField(
    form,
    "PersonalPropertySubTotal",
    formatOfficialAmount(totals.openingSubtotalCents)
  );
  setTextField(form, "PersonalPropertySaleLossText1", lossExplanationLine1);
  setTextField(form, "PersonalPropertySaleLossText2", lossExplanationLine2);
  setTextField(
    form,
    "PersonalPropertySaleLossAmt",
    formatOfficialAmount(totals.lossFromSaleCents, true)
  );
  setTextField(form, "SubTotal1", formatOfficialAmount(totals.line3SubtotalCents));
  setTextField(form, "AssetsTotal", formatOfficialAmount(totals.line5SubtotalCents));
  setTextField(form, "SubTotal2", formatOfficialAmount(totals.line7SubtotalCents));
  setTextField(
    form,
    "AccountingEndPeriodBalanceAmt",
    formatOfficialAmount(totals.line9BalanceCents)
  );
}

function fillPartII(form: PDFForm, accounting: ProbateAccountingDetail) {
  if (accounting.accountType !== "annual") {
    return;
  }

  const summary = summarizePartIiAssetsForOfficialForm(accounting.assets);

  summary.bankLines.forEach((bankLine, index) => {
    const fieldIndex = index + 1;
    setTextField(form, `DepositInBanks${fieldIndex}`, bankLine.description);
    setTextField(
      form,
      `AccountNumber${fieldIndex}BalanceAmt`,
      formatOfficialAmount(bankLine.balanceCents, true)
    );
  });

  setTextField(
    form,
    "InvestedInSecuritiesAmt",
    formatOfficialAmount(summary.securitiesTotalCents, true)
  );
  setTextField(
    form,
    "TangiblePersonalPropertyAmt",
    formatOfficialAmount(summary.tangibleTotalCents, true)
  );
  setTextField(
    form,
    "PersonalPropertyPartIISubTotal",
    formatOfficialAmount(summary.personalPropertySubtotalCents, true)
  );
  setTextField(
    form,
    "RealEstateFairMarketValue",
    formatOfficialAmount(summary.realEstateWilledNotSoldTotalCents, true)
  );
  setTextField(
    form,
    "RealEstateAcquiredAmt",
    formatOfficialAmount(summary.realEstateAcquiredTotalCents, true)
  );
  setTextField(form, "OtherAmt", formatOfficialAmount(summary.otherTotalCents, true));
  setTextField(
    form,
    "BalanceHeldOrInvestedTotal",
    formatOfficialAmount(summary.totalBalanceHeldOrInvestedCents, true)
  );
}

function fillSectionOnMainForm(
  form: PDFForm,
  config: OfficialSectionConfig,
  sectionData: OfficialSectionData
) {
  sectionData.baseRows.forEach((row, index) => {
    config.fillMainRow(form, index, row);
  });

  setTextField(
    form,
    config.mainBodyTotalField,
    formatOfficialAmount(sectionData.baseTotalCents)
  );
  setTextField(
    form,
    config.mainAttachmentTotalField,
    formatOfficialAmount(sectionData.attachmentTotalCents, true)
  );
  setTextField(
    form,
    config.mainFrontTotalField,
    formatOfficialAmount(sectionData.grandTotalCents)
  );
}

async function finalizePdfDocument(pdfDocument: PDFDocument) {
  const font = await pdfDocument.embedFont(StandardFonts.Helvetica);
  const form = pdfDocument.getForm();
  form.updateFieldAppearances(font);
  form.flatten();
}

function findTemplateUrl(
  html: string,
  pattern: RegExp,
  fallbackUrl: string
) {
  const match = pattern.exec(html);

  if (!match?.[1]) {
    return fallbackUrl;
  }

  return new URL(match[1], OFFICIAL_FORM_PAGE_URL).toString();
}

async function discoverTemplateUrls() {
  const response = await fetch(OFFICIAL_FORM_PAGE_URL);

  if (!response.ok) {
    throw new Error(`Unable to load official form page (${response.status}).`);
  }

  const html = await response.text();

  return {
    main: findTemplateUrl(
      html,
      /href="([^"]*\/assets\/documents\/forms\/e506-nocalc[^"]*\.pdf\?VersionId=[^"]+)"/i,
      FALLBACK_TEMPLATE_URLS.main
    ),
    partIII: findTemplateUrl(
      html,
      /href="([^"]*\/assets\/documents\/forms\/e506-cont-iii[^"]*\.pdf\?VersionId=[^"]+)"/i,
      FALLBACK_TEMPLATE_URLS.partIII
    ),
    partIV: findTemplateUrl(
      html,
      /href="([^"]*\/assets\/documents\/forms\/e506-cont-iv[^"]*\.pdf\?VersionId=[^"]+)"/i,
      FALLBACK_TEMPLATE_URLS.partIV
    ),
    partV: findTemplateUrl(
      html,
      /href="([^"]*\/assets\/documents\/forms\/e506-cont-v[^"]*\.pdf\?VersionId=[^"]+)"/i,
      FALLBACK_TEMPLATE_URLS.partV
    )
  };
}

async function getTemplateUrls() {
  if (!templateUrlsPromise) {
    templateUrlsPromise = discoverTemplateUrls().catch((error) => {
      console.warn("Falling back to pinned official AOC-E-506 template URLs.", error);
      templateUrlsPromise = null;
      return FALLBACK_TEMPLATE_URLS;
    });
  }

  return await templateUrlsPromise;
}

async function getTemplateBytes(templateKey: OfficialTemplateKey) {
  const templateUrls = await getTemplateUrls();
  const templateUrl = templateUrls[templateKey];
  const cached = templateBytesCache.get(templateUrl);

  if (cached) {
    return await cached;
  }

  const pendingBytes = fetch(templateUrl)
    .then(async (response) => {
      if (!response.ok) {
        throw new Error(`Unable to load official PDF template (${response.status}).`);
      }

      return new Uint8Array(await response.arrayBuffer());
    })
    .catch((error) => {
      templateBytesCache.delete(templateUrl);
      throw error;
    });

  templateBytesCache.set(templateUrl, pendingBytes);
  return await pendingBytes;
}

async function loadTemplate(templateKey: OfficialTemplateKey) {
  return await PDFDocument.load(await getTemplateBytes(templateKey));
}

async function appendDocumentPages(target: PDFDocument, source: PDFDocument) {
  const copiedPages = await target.copyPages(source, source.getPageIndices());
  copiedPages.forEach((page) => target.addPage(page));
}

async function createContinuationDocument(
  accounting: ProbateAccountingDetail,
  entryType: ProbateAccountingEntryType,
  rows: ProbateAccountingLedgerEntry[],
  pageNumber: number,
  pageCount: number
) {
  const config = OFFICIAL_SECTION_CONFIGS[entryType];
  const pdfDocument = await loadTemplate(config.continuationTemplate);
  const form = pdfDocument.getForm();

  fillContinuationHeader(form, accounting, pageNumber, pageCount);
  rows.forEach((row, index) => config.fillContinuationRow(form, index, row));
  setTextField(
    form,
    config.continuationTotalField,
    formatOfficialAmount(sumLedgerAmountCents(rows))
  );

  await finalizePdfDocument(pdfDocument);
  return pdfDocument;
}

export async function createOfficialAocE506Pdf(
  db: D1Database,
  accountId: string,
  accountingId: string
) {
  const accounting = await getProbateAccountingDetail(db, accountId, accountingId);

  if (!accounting) {
    return null;
  }

  const receipts = buildSectionData(accounting, "receipt");
  const disbursements = buildSectionData(accounting, "disbursement");
  const distributions = buildSectionData(accounting, "distribution");

  const mainDocument = await loadTemplate("main");
  const mainForm = mainDocument.getForm();

  fillMainHeader(mainForm, accounting);
  fillPartISummary(mainForm, accounting);
  fillPartII(mainForm, accounting);
  fillSectionOnMainForm(mainForm, OFFICIAL_SECTION_CONFIGS.receipt, receipts);
  fillSectionOnMainForm(mainForm, OFFICIAL_SECTION_CONFIGS.disbursement, disbursements);
  fillSectionOnMainForm(mainForm, OFFICIAL_SECTION_CONFIGS.distribution, distributions);

  await finalizePdfDocument(mainDocument);

  const output = await PDFDocument.create();
  await appendDocumentPages(output, mainDocument);

  for (const [pageIndex, rows] of receipts.attachments.entries()) {
    const document = await createContinuationDocument(
      accounting,
      "receipt",
      rows,
      pageIndex + 1,
      receipts.attachments.length
    );
    await appendDocumentPages(output, document);
  }

  for (const [pageIndex, rows] of disbursements.attachments.entries()) {
    const document = await createContinuationDocument(
      accounting,
      "disbursement",
      rows,
      pageIndex + 1,
      disbursements.attachments.length
    );
    await appendDocumentPages(output, document);
  }

  for (const [pageIndex, rows] of distributions.attachments.entries()) {
    const document = await createContinuationDocument(
      accounting,
      "distribution",
      rows,
      pageIndex + 1,
      distributions.attachments.length
    );
    await appendDocumentPages(output, document);
  }

  return {
    fileName: buildFileName(accounting),
    bytes: await output.save()
  };
}
