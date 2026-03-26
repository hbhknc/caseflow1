import { requireAuth } from "../../_lib/auth";
import { badRequest, notFound, serverError } from "../../_lib/http";
import { createOfficialAocE506Pdf } from "../../_lib/accountingOfficialPdf";
import type { Env, RequestContextData } from "../../_lib/types";

export const onRequestGet: PagesFunction<Env, string, RequestContextData> = async ({
  data,
  env,
  request
}) => {
  try {
    const auth = requireAuth(data);
    if ("response" in auth) {
      return auth.response;
    }

    const accountingId = new URL(request.url).searchParams.get("accountingId")?.trim();
    if (!accountingId) {
      return badRequest("Accounting id is required.");
    }

    const officialPdf = await createOfficialAocE506Pdf(env.DB, auth.auth.accountId, accountingId);
    if (!officialPdf) {
      return notFound("Accounting not found.");
    }

    const pdfBytes = Uint8Array.from(officialPdf.bytes);
    const responseBody = new Blob([pdfBytes.buffer], {
      type: "application/pdf"
    });

    return new Response(responseBody, {
      headers: {
        "Cache-Control": "no-store",
        "Content-Disposition": `attachment; filename="${officialPdf.fileName}"`,
        "Content-Type": "application/pdf"
      }
    });
  } catch (error) {
    console.error(error);
    return serverError("Unable to generate the official AOC-E-506 PDF.");
  }
};
