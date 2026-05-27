import { useEffect, useMemo } from 'react';
import { useFounderOs } from '@/context/FounderOsContext';
import { useOwnerr } from '@/context/ownerr/OwnerrProvider';
import type { FounderSubmissionRecord } from '@/lib/founderTypes';

export function useOwnerrFounderRecords(): {
  records: FounderSubmissionRecord[];
  loading: boolean;
  reload: () => Promise<void>;
  totals: { visits: number; signups: number };
} {
  const { founderRecords, loading: ownerrLoading, reload } = useOwnerr();
  const { completedRecord, completedRecordLoading, setCompletedRecord } = useFounderOs();

  useEffect(() => {
    const primary = founderRecords[0];
    if (primary) setCompletedRecord(primary);
  }, [founderRecords, setCompletedRecord]);

  const records = founderRecords.length > 0 ? founderRecords : completedRecord ? [completedRecord] : [];
  const loading = ownerrLoading || (completedRecordLoading && records.length === 0);

  const totals = useMemo(
    () => ({
      visits: records.reduce((sum, r) => sum + (r.visitCount ?? 0), 0),
      signups: records.reduce((sum, r) => sum + (r.referralSignupCount ?? 0), 0),
    }),
    [records],
  );

  return { records, loading, reload, totals };
}
