import type { FounderSubmissionRecord } from "@/lib/founderTypes";
import { FounderSharePanel } from "./FounderSharePanel";

type Props = {
  record: FounderSubmissionRecord;
  compact?: boolean;
};

/** Compact share UI (e.g. if embedded elsewhere). Full flow uses FounderOsResultsDashboard. */
export function FounderSuccessScreen({ record, compact }: Props) {
  return <FounderSharePanel record={record} compact={compact} />;
}
