import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { FOUNDER_CATEGORIES } from '@/components/founder-os/founderOsQuestions';
import {
  isOwnerrOsDraftComplete,
  peekOwnerrOsDraft,
  persistOwnerrOsDraft,
  type OwnerrOsDraft,
} from '@/lib/auth/ownerrOsDraft';
import { resolveProductAuthPath } from '@/lib/auth/productAuthRoutes';
import { PRODUCT_ROUTES } from '@/routing/routeRegistry';
import { getStoredReferralAttribution } from '@/lib/founderReferral';

type Props = {
  referralCode?: string | null;
};

export function OwnerrOsPublicIdeaForm({ referralCode }: Props) {
  const { signInWithGoogle } = useAuth();
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);

  const [fullName, setFullName] = useState('');
  const [startupName, setStartupName] = useState('');
  const [industry, setIndustry] = useState<string>('SaaS');
  const [ideaDescription, setIdeaDescription] = useState('');

  useEffect(() => {
    const saved = peekOwnerrOsDraft();
    if (!saved) return;
    setFullName(saved.fullName);
    setStartupName(saved.startupName);
    setIndustry(saved.industry || 'SaaS');
    setIdeaDescription(saved.ideaDescription);
  }, []);

  function buildDraft(): OwnerrOsDraft {
    const ref =
      referralCode ??
      getStoredReferralAttribution()?.referralCode ??
      peekOwnerrOsDraft()?.referralCode;
    return {
      fullName: fullName.trim(),
      startupName: startupName.trim(),
      industry: industry.trim() || 'Other',
      ideaDescription: ideaDescription.trim(),
      referralCode: ref,
      updatedAt: Date.now(),
    };
  }

  function saveDraft() {
    const draft = buildDraft();
    if (draft.fullName && draft.startupName && draft.ideaDescription) {
      persistOwnerrOsDraft({
        fullName: draft.fullName,
        startupName: draft.startupName,
        industry: draft.industry,
        ideaDescription: draft.ideaDescription,
        referralCode: draft.referralCode,
      });
    }
  }

  async function onGoogle() {
    saveDraft();
    const draft = peekOwnerrOsDraft();
    if (!isOwnerrOsDraftComplete(draft)) {
      toast({
        title: 'Complete your idea first',
        description: 'Add your name, startup, and a short description (12+ characters).',
        variant: 'destructive',
      });
      return;
    }

    const callbackPath = resolveProductAuthPath('ownerr_os', 'callback');
    const base = import.meta.env.BASE_URL.replace(/\/$/, '');
    const returnTo = encodeURIComponent(PRODUCT_ROUTES.ownerrOsDashboard);
    const redirectTo = `${window.location.origin}${base}${callbackPath}?returnTo=${returnTo}`;

    setBusy(true);
    try {
      await signInWithGoogle(redirectTo);
    } catch (err) {
      toast({
        title: 'Google sign-in failed',
        description: err instanceof Error ? err.message : 'Try again.',
        variant: 'destructive',
      });
      setBusy(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="saas-glass-card w-full max-w-none space-y-5 rounded-[14px] border border-[color:var(--terminal-border)]/80 p-6 sm:p-8 lg:p-8"
    >
      <div>
        <p className="text-sm font-bold text-[color:var(--terminal-fg)]">Your startup idea</p>
        <p className="mt-1 text-xs text-[color:var(--terminal-muted)]">
          No account needed yet — we save your answers locally, then you continue with Google.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 md:items-start">
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="idea-full-name">Your name</Label>
          <Input
            id="idea-full-name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            onBlur={saveDraft}
            className="border-[color:var(--terminal-border)] bg-[color:var(--terminal-bg)]"
            autoComplete="name"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="idea-startup">Startup name</Label>
          <Input
            id="idea-startup"
            value={startupName}
            onChange={(e) => setStartupName(e.target.value)}
            onBlur={saveDraft}
            className="border-[color:var(--terminal-border)] bg-[color:var(--terminal-bg)]"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="idea-industry">Industry</Label>
          <Select value={industry} onValueChange={(v) => { setIndustry(v); setTimeout(saveDraft, 0); }}>
            <SelectTrigger id="idea-industry" className="border-[color:var(--terminal-border)] bg-[color:var(--terminal-bg)]">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              {FOUNDER_CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="idea-desc">What are you building?</Label>
          <Textarea
            id="idea-desc"
            value={ideaDescription}
            onChange={(e) => setIdeaDescription(e.target.value)}
            onBlur={saveDraft}
            rows={4}
            className="border-[color:var(--terminal-border)] bg-[color:var(--terminal-bg)]"
            placeholder="Describe the problem, product, and who it's for…"
          />
        </div>
      </div>

      {referralCode ? (
        <p className="text-xs text-[color:var(--brand-orange)]">
          Referred by <span className="font-mono">{referralCode}</span>
        </p>
      ) : null}

      <Button
        type="button"
        disabled={busy}
        className="btn-platform-gradient h-12 w-full font-bold"
        onClick={() => void onGoogle()}
      >
        {busy ? 'Opening Google…' : 'Continue with Google'}
      </Button>
    </motion.div>
  );
}
