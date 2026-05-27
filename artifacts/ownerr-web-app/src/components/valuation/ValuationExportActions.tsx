import { useCallback, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { ValuationExportBundle } from '@/lib/valuationExport';
import { downloadValuationPdf } from '@/lib/valuationExport';

type Props = ValuationExportBundle & {
  className?: string;
  layout?: 'inline' | 'fab';
};

const limeButtonClass =
  'border border-[color:var(--terminal-lime)]/45 bg-[color:var(--terminal-lime)] text-[#0a0a0a] shadow-[0_0_20px_color-mix(in_srgb,var(--terminal-lime)_20%,transparent)] hover:bg-[color:var(--terminal-lime)]/88 hover:text-[#0a0a0a] hover:border-[color:var(--terminal-lime)]/60 disabled:opacity-55';

export function ValuationExportActions({
  inputs,
  outputs,
  insights,
  meta,
  startupName,
  className,
  layout = 'inline',
}: Props) {
  const [pdfBusy, setPdfBusy] = useState(false);
  const bundle = useMemo(
    () => ({ inputs, outputs, insights, meta, startupName }),
    [inputs, outputs, insights, meta, startupName],
  );

  const onPdf = useCallback(async () => {
    if (pdfBusy) return;
    setPdfBusy(true);
    try {
      await downloadValuationPdf(bundle);
    } finally {
      setPdfBusy(false);
    }
  }, [bundle, pdfBusy]);

  const ariaLabel = pdfBusy ? 'Preparing PDF report' : 'Download report as PDF';

  if (layout === 'fab') {
    const fab = (
      <Button
        type="button"
        variant="outline"
        className={cn(
          'fixed z-[60] flex h-14 w-14 items-center justify-center rounded-full p-0 sm:hidden',
          'bottom-[max(1.25rem,env(safe-area-inset-bottom))] right-[max(1rem,env(safe-area-inset-right))]',
          limeButtonClass,
          className,
        )}
        disabled={pdfBusy}
        aria-label={ariaLabel}
        onClick={() => void onPdf()}
      >
        <Download className={cn('size-6 shrink-0 stroke-[2.25]', pdfBusy && 'animate-pulse')} aria-hidden />
      </Button>
    );
    if (typeof document !== 'undefined') {
      return createPortal(fab, document.body);
    }
    return fab;
  }

  return (
    <Button
      type="button"
      variant="outline"
      className={cn(
        'h-11 w-full min-w-0 gap-2.5 rounded-[10px] px-4 font-bold sm:h-10 sm:w-auto',
        limeButtonClass,
        className,
      )}
      disabled={pdfBusy}
      aria-label={ariaLabel}
      onClick={() => void onPdf()}
    >
      <Download className="size-5 shrink-0 stroke-[2.25]" aria-hidden />
      <span className="truncate">
        {pdfBusy ? (
          'Preparing…'
        ) : (
          <>
            <span className="sm:hidden">Download PDF</span>
            <span className="hidden sm:inline">Download report (PDF)</span>
          </>
        )}
      </span>
    </Button>
  );
}
