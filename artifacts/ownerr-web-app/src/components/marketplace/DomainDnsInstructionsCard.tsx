import { Copy, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { hostNameFieldOptions } from "@workspace/integrations-core/domain-dns-host";
import type {
  DomainDnsDiagnosticView,
  SyncWorkerHealthView,
} from "@/lib/marketplace/domainVerificationDiagnostics";

type DnsHint = {
  host: string;
  expectedRecord: string;
};

type Props = {
  dnsHint: DnsHint | null;
  diagnostic: DomainDnsDiagnosticView | null;
  workerHealth: SyncWorkerHealthView | null;
  autoRecheckActive: boolean;
  autoRecheckAttempt: number;
  autoRecheckMax: number;
  onCopyHost: () => void;
  onCopyValue: () => void;
  onCopyDiagnostic: () => void;
  copyDiagnosticPending?: boolean;
};

function severityBorder(severity: DomainDnsDiagnosticView["severity"]) {
  if (severity === "error")
    return "border-destructive/40 bg-destructive/[0.04]";
  if (severity === "warning") return "border-amber-500/35 bg-amber-500/5";
  return "border-emerald-500/25 bg-emerald-500/[0.04]";
}

export function DomainDnsInstructionsCard({
  dnsHint,
  diagnostic,
  workerHealth,
  autoRecheckActive,
  autoRecheckAttempt,
  autoRecheckMax,
  onCopyHost,
  onCopyValue,
  onCopyDiagnostic,
  copyDiagnosticPending,
}: Props) {
  const host = dnsHint?.host ?? diagnostic?.verification_host ?? "";
  const expected = dnsHint?.expectedRecord ?? diagnostic?.expected_token ?? "";
  const hostOptions = host ? hostNameFieldOptions(host) : null;

  return (
    <div className="space-y-3 max-w-lg">
      {host && expected ? (
        <div className="rounded-md border bg-muted/30 p-3 text-xs space-y-3">
          <p className="text-muted-foreground font-medium">TXT record to add</p>
          <div className="space-y-2">
            <p className="text-muted-foreground">
              Name / Host (varies by DNS panel)
            </p>
            <div className="font-mono space-y-1 rounded border bg-background/60 p-2">
              <p>
                Option A:{" "}
                <span className="font-semibold text-foreground">
                  {hostOptions?.optionA}
                </span>
              </p>
              <p>
                Option B:{" "}
                <span className="font-semibold text-foreground">
                  {hostOptions?.optionB}
                </span>
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={onCopyHost}
              >
                <Copy className="mr-1.5 h-3.5 w-3.5" />
                Copy host hint
              </Button>
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-muted-foreground">Value (must match exactly)</p>
            <p className="font-mono break-all font-semibold">{expected}</p>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={onCopyValue}
            >
              <Copy className="mr-1.5 h-3.5 w-3.5" />
              Copy value
            </Button>
          </div>
          <p className="text-muted-foreground">
            Queried hostname:{" "}
            <span className="font-mono text-foreground">{host}</span>
          </p>
        </div>
      ) : null}

      {workerHealth ? (
        <div className="rounded-md border p-3 text-xs space-y-1">
          <p className="font-semibold">Verification engine</p>
          <p>
            {workerHealth.engine_status === "online" ? (
              <span className="text-emerald-700 dark:text-emerald-400">
                Online
              </span>
            ) : workerHealth.engine_status === "degraded" ? (
              <span className="text-amber-700 dark:text-amber-400">Busy</span>
            ) : (
              <span className="text-destructive">Offline</span>
            )}
            {" · "}
            Queue: {workerHealth.queue_pending} pending
            {workerHealth.avg_processing_seconds != null
              ? ` · ~${workerHealth.avg_processing_seconds.toFixed(1)}s per job`
              : null}
          </p>
          {workerHealth.last_success_at ? (
            <p className="text-muted-foreground">
              Last successful run:{" "}
              {new Date(workerHealth.last_success_at).toLocaleString()}
            </p>
          ) : null}
        </div>
      ) : null}

      {autoRecheckActive ? (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Checking DNS… attempt {autoRecheckAttempt}/{autoRecheckMax}
        </div>
      ) : null}

      {diagnostic ? (
        <div
          className={cn(
            "rounded-md border p-3 text-xs space-y-2",
            severityBorder(diagnostic.severity),
          )}
        >
          <p className="font-semibold">{diagnostic.title}</p>
          <p>{diagnostic.description}</p>
          <p className="text-muted-foreground">
            <span className="font-medium text-foreground">Next:</span>{" "}
            {diagnostic.next_action}
          </p>
          {diagnostic.nameservers.length > 0 ? (
            <p className="font-mono break-all text-muted-foreground">
              Nameservers: {diagnostic.nameservers.join(", ")}
            </p>
          ) : null}
          {diagnostic.found_records.length > 0 ? (
            <p className="font-mono break-all">
              Found TXT: {diagnostic.found_records.join(" | ")}
            </p>
          ) : null}
          {diagnostic.checked_at ? (
            <p className="text-muted-foreground">
              Last checked: {new Date(diagnostic.checked_at).toLocaleString()}
            </p>
          ) : null}
        </div>
      ) : null}

      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={copyDiagnosticPending}
        onClick={onCopyDiagnostic}
      >
        {copyDiagnosticPending ? (
          <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
        ) : (
          <Copy className="mr-1.5 h-3.5 w-3.5" />
        )}
        Copy diagnostic
      </Button>
    </div>
  );
}
