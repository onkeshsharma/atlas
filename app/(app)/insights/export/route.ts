/**
 * M16 — GET /insights/export?range= : the OO:379–387 "Insights as CSV"
 * affordance made real. Serializes the SAME insightsData read the page
 * renders (src/domain/insights/csv.ts) — one derivation, two outputs.
 * Owner-guarded like the page; signed-out hits redirect to /sign-in.
 */
import { requireOwner } from "@/src/domain/auth/guard";
import { insightsCsv, insightsCsvFilename } from "@/src/domain/insights/csv";
import { isInsightsRange, type InsightsRange } from "@/src/domain/insights/derive";
import { insightsData } from "@/src/domain/insights/queries";

export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  await requireOwner();
  const rangeParam = new URL(request.url).searchParams.get("range") ?? undefined;
  const range: InsightsRange = isInsightsRange(rangeParam) ? rangeParam : "12w";
  const data = await insightsData(range);
  return new Response(insightsCsv(data), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${insightsCsvFilename(range)}"`,
    },
  });
}
