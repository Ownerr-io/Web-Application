import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FounderCaptureSummary } from "@/components/founder-os/FounderCaptureSummary";
import { recordToFounderDraft } from "@/components/founder-os/founderOsQuestions";
import { OwnerrOsEditStartupForm } from "@/components/founder-os/OwnerrOsEditStartupForm";
import { OwnerrOsAppPageShell } from "@/components/founder-os/OwnerrOsAppPageShell";
import { useOwnerrFounderRecords } from "@/hooks/founder-os/useOwnerrFounderRecords";
import { fetchFounderSubmissionById } from "@/lib/founderService";
import { getFounderSharePageUrl } from "@/lib/founderShareUrls";
import { PRODUCT_ROUTES } from "@/routing/routeRegistry";
import { OWNERR_OS_APP_CONTENT_CLASS } from "@/lib/ownerrOsAppLayout";
import { cn } from "@/lib/utils";
import type { FounderSubmissionRecord } from "@/lib/founderTypes";

type Props = {
  startupId: string;
};

export function OwnerrOsStartupDetail({ startupId }: Props) {
  const [, navigate] = useLocation();
  const { records, loading: listLoading, reload } = useOwnerrFounderRecords();
  const [record, setRecord] = useState<FounderSubmissionRecord | null>(null);
  const [fetching, setFetching] = useState(true);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    const fromList = records.find((r) => r.id === startupId);
    if (fromList) {
      setRecord(fromList);
      setFetching(false);
      return;
    }
    if (listLoading) return;
    setFetching(true);
    void fetchFounderSubmissionById(startupId)
      .then((r) => setRecord(r))
      .finally(() => setFetching(false));
  }, [startupId, records, listLoading]);

  if (listLoading || fetching) {
    return (
      <div
        className={cn(
          OWNERR_OS_APP_CONTENT_CLASS,
          "flex min-h-[40vh] items-center justify-center text-sm font-bold text-muted-foreground",
        )}
      >
        Loading startup…
      </div>
    );
  }

  if (!record) {
    return (
      <OwnerrOsAppPageShell
        title="Startup not found"
        description="This listing does not exist or you do not have access."
      >
        <Button type="button" variant="secondary" asChild>
          <Link href={PRODUCT_ROUTES.ownerrOsListings}>
            Back to My Startups
          </Link>
        </Button>
      </OwnerrOsAppPageShell>
    );
  }

  if (editing) {
    return (
      <OwnerrOsAppPageShell
        title={record.startupName}
        description="Edit your public listing."
      >
        <OwnerrOsEditStartupForm
          record={record}
          mode="edit"
          onSaved={() => {
            void reload();
            setEditing(false);
          }}
          onCancel={() => setEditing(false)}
        />
      </OwnerrOsAppPageShell>
    );
  }

  const draft = recordToFounderDraft(record);
  const shareUrl = getFounderSharePageUrl(record);

  return (
    <OwnerrOsAppPageShell
      title={record.startupName}
      description={record.tagline}
    >
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="-mt-2 mb-2 w-fit"
        onClick={() => navigate(PRODUCT_ROUTES.ownerrOsListings)}
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        All startups
      </Button>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => setEditing(true)}
        >
          Edit listing
        </Button>
        <Button type="button" variant="outline" size="sm" asChild>
          <a href={shareUrl} target="_blank" rel="noopener noreferrer">
            Public share page
          </a>
        </Button>
      </div>
      <FounderCaptureSummary draft={draft} />
    </OwnerrOsAppPageShell>
  );
}
