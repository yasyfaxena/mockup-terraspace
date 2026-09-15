import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { buildExportUrl, type ExportParams } from "../reports.api";

/**
 * BE streams the CSV directly (`Content-Disposition: attachment`) — a
 * real top-level navigation triggers the browser's native download and
 * sends the session cookie same as any other cross-origin credentialed
 * request, so this is deliberately not a `fetch` (features/reports.md §8).
 */
export function ExportReportButton({ params }: { params: ExportParams }) {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="gap-1.5"
      onClick={() => {
        window.location.href = buildExportUrl(params);
      }}
    >
      <Download className="size-3.5" /> Export CSV
    </Button>
  );
}
