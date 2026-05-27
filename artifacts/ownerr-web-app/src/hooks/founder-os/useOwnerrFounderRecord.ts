import { useEffect } from 'react';
import { useFounderOs } from '@/context/FounderOsContext';
import { useOwnerr } from '@/context/ownerr/OwnerrProvider';
import type { FounderSubmissionRecord } from '@/lib/founderTypes';

/** Founder listing for OWNERR OS app — prefers OwnerrProvider, syncs into FounderOsContext. */
export function useOwnerrFounderRecord(): {
  record: FounderSubmissionRecord | null;
  loading: boolean;
  reload: () => Promise<void>;
} {
  const { founderRecord, loading: ownerrLoading, reload } = useOwnerr();
  const { completedRecord, completedRecordLoading, setCompletedRecord } = useFounderOs();

  useEffect(() => {
    if (founderRecord) {
      setCompletedRecord(founderRecord);
    }
  }, [founderRecord, setCompletedRecord]);

  const record = founderRecord ?? completedRecord;
  const loading = ownerrLoading || (completedRecordLoading && !record);

  return { record, loading, reload };
}
