import { useEffect, useState, type ReactNode } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { NetworkMemberDetail } from "@/lib/ownerr-network/adminMembersTypes";
import {
  deleteNetworkUser,
  updateNetworkProfile,
  updateNetworkUser,
  type PlatformUserRole,
} from "@/lib/ownerr-network/adminApi";
import { trackAdminCrud } from "@/lib/admin/analytics";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  detail: NetworkMemberDetail | null | undefined;
  loading: boolean;
  onSaved: () => void;
};

export function NetworkMemberSheet({
  open,
  onOpenChange,
  detail,
  loading,
  onSaved,
}: Props) {
  const queryClient = useQueryClient();
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [verificationStatus, setVerificationStatus] = useState("unverified");
  const [platformRole, setPlatformRole] = useState<PlatformUserRole>("member");
  const [points, setPoints] = useState("");
  const [headline, setHeadline] = useState("");
  const [userType, setUserType] = useState("");
  const [experienceLevel, setExperienceLevel] = useState("");
  const [remotePreference, setRemotePreference] = useState("");
  const [bio, setBio] = useState("");
  const [onboardingDone, setOnboardingDone] = useState(false);

  useEffect(() => {
    if (!detail?.account) return;
    const a = detail.account;
    const p = detail.profile ?? {};
    setFullName(a.fullName);
    setUsername(a.username);
    setVerificationStatus(a.verificationStatus);
    setPlatformRole(a.platformRole as PlatformUserRole);
    setPoints(String(detail.scores?.points ?? 0));
    setHeadline(p.headline ?? "");
    setUserType(p.userType ?? "");
    setExperienceLevel(p.experienceLevel ?? "");
    setRemotePreference(p.remotePreference ?? "");
    setBio(p.bio ?? "");
    setOnboardingDone(Boolean(p.onboardingCompleted));
  }, [detail]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!detail?.account) return;
      const userId = detail.account.userId;
      await updateNetworkUser(userId, {
        name: fullName,
        username,
        verificationStatus: verificationStatus as
          | "unverified"
          | "pending"
          | "verified"
          | "rejected",
        platformRole,
        points: points ? Number(points) : undefined,
      });
      await updateNetworkProfile(userId, {
        display_name: headline || null,
        user_type: userType || null,
        experience_level: experienceLevel || null,
        work_preference: remotePreference || null,
        bio: bio || null,
        onboarding_completed: onboardingDone,
      });
      trackAdminCrud("ownerr_network", "update", "member", { id: userId });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["admin", "ownerr-network"],
      });
      onSaved();
    },
  });

  const suspendMutation = useMutation({
    mutationFn: async () => {
      if (!detail?.account) return;
      await deleteNetworkUser(detail.account.userId);
      trackAdminCrud("ownerr_network", "update", "member_suspend", {
        id: detail.account.userId,
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["admin", "ownerr-network"],
      });
      onOpenChange(false);
      onSaved();
    },
  });

  const a = detail?.account;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{a ? `@${a.username}` : "Member"}</SheetTitle>
          <SheetDescription>
            Account settings, network profile, wallet, and referrals in one
            place
          </SheetDescription>
        </SheetHeader>

        {loading ? (
          <p className="mt-6 text-sm text-muted-foreground">Loading…</p>
        ) : !detail || !a ? (
          <p className="mt-6 text-sm text-muted-foreground">
            Member not found.
          </p>
        ) : (
          <div className="mt-6 space-y-8 pb-8 text-sm">
            <ReadOnlyBlock title="At a glance">
              <p>
                Status: <strong>{a.status}</strong> · Verification:{" "}
                <strong>{a.verificationStatus}</strong>
              </p>
              <p className="text-muted-foreground text-xs mt-1">
                Joined{" "}
                {formatDistanceToNow(new Date(a.createdAt), {
                  addSuffix: true,
                })}
                {a.lastLoginAt
                  ? ` · Last login ${formatDistanceToNow(new Date(a.lastLoginAt), { addSuffix: true })}`
                  : ""}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Referral code: {a.referralCode}
              </p>
            </ReadOnlyBlock>

            <section className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Account
              </h3>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Full name">
                  <Input
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                  />
                </Field>
                <Field label="Username">
                  <Input
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                  />
                </Field>
                <Field label="Email">
                  <Input value={a.email} disabled className="bg-muted" />
                </Field>
                <Field label="Verification">
                  <Select
                    value={verificationStatus}
                    onValueChange={setVerificationStatus}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unverified">Unverified</SelectItem>
                      <SelectItem value="pending">Pending review</SelectItem>
                      <SelectItem value="verified">Verified</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Platform role">
                  <Select
                    value={platformRole}
                    onValueChange={(v) =>
                      setPlatformRole(v as PlatformUserRole)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="member">Member</SelectItem>
                      <SelectItem value="moderator">Moderator</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Points (user_scores)">
                  <Input
                    type="number"
                    value={points}
                    onChange={(e) => setPoints(e.target.value)}
                  />
                </Field>
              </div>
            </section>

            <section className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Network profile
              </h3>
              <p className="text-xs text-muted-foreground">
                What members show in the network (headline, skills, onboarding)
                — not login credentials.
              </p>
              <div className="grid gap-3">
                <Field label="Headline">
                  <Input
                    value={headline}
                    onChange={(e) => setHeadline(e.target.value)}
                  />
                </Field>
                <Field label="Bio">
                  <Input value={bio} onChange={(e) => setBio(e.target.value)} />
                </Field>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="User type">
                    <Input
                      value={userType}
                      onChange={(e) => setUserType(e.target.value)}
                    />
                  </Field>
                  <Field label="Experience">
                    <Input
                      value={experienceLevel}
                      onChange={(e) => setExperienceLevel(e.target.value)}
                    />
                  </Field>
                  <Field label="Remote preference">
                    <Input
                      value={remotePreference}
                      onChange={(e) => setRemotePreference(e.target.value)}
                    />
                  </Field>
                  <div className="flex items-end gap-2 pb-2">
                    <Switch
                      checked={onboardingDone}
                      onCheckedChange={setOnboardingDone}
                    />
                    <Label>Onboarding complete</Label>
                  </div>
                </div>
                {detail.profile?.profileCompletionScore != null ? (
                  <p className="text-xs text-muted-foreground">
                    Completion score: {detail.profile.profileCompletionScore}%
                  </p>
                ) : null}
                {detail.profile?.skillTags?.length ? (
                  <p className="text-xs">
                    Skills: {detail.profile.skillTags.join(", ")}
                  </p>
                ) : null}
              </div>
            </section>

            {detail.wallet ? (
              <ReadOnlyBlock title="Wallet">
                <p>
                  Balance {detail.wallet.balance.toLocaleString()} · Earned{" "}
                  {detail.wallet.totalEarned.toLocaleString()} · Spent{" "}
                  {detail.wallet.totalSpent.toLocaleString()}
                </p>
              </ReadOnlyBlock>
            ) : null}

            {detail.scores ? (
              <ReadOnlyBlock title="Score breakdown">
                <p className="text-xs text-muted-foreground">
                  Activity {detail.scores.activityScore} · Referrals{" "}
                  {detail.scores.referralsScore} · Network{" "}
                  {detail.scores.networkScore}
                </p>
              </ReadOnlyBlock>
            ) : null}

            {detail.badges.length > 0 ? (
              <ReadOnlyBlock title="Badges">
                <p>{detail.badges.map((b) => b.badgeSlug).join(", ")}</p>
              </ReadOnlyBlock>
            ) : null}

            <ActivityList
              title="Referrals made"
              empty="None yet"
              items={detail.referralsMade.map(
                (r) =>
                  `@${r.referredUsername} · ${r.status} · ${r.source ?? "—"}`,
              )}
            />
            <ActivityList
              title="Referred by"
              empty="Organic / unknown"
              items={detail.referralsReceived.map(
                (r) => `@${r.referrerUsername} · ${r.status}`,
              )}
            />
            <ActivityList
              title="Recent wallet activity"
              empty="No transactions"
              items={detail.recentTransactions.map(
                (t) =>
                  `${t.type}: ${t.amount} · ${formatDistanceToNow(new Date(t.createdAt), { addSuffix: true })}`,
              )}
            />

            <div className="flex flex-wrap gap-2 pt-2">
              <Button
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending}
              >
                Save changes
              </Button>
              {a.status !== "suspended" ? (
                <Button
                  variant="destructive"
                  onClick={() => {
                    if (confirm(`Suspend @${a.username}?`))
                      suspendMutation.mutate();
                  }}
                  disabled={suspendMutation.isPending}
                >
                  Suspend member
                </Button>
              ) : null}
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}

function ReadOnlyBlock({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-lg border bg-muted/30 px-4 py-3">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
        {title}
      </h3>
      {children}
    </section>
  );
}

function ActivityList({
  title,
  items,
  empty,
}: {
  title: string;
  items: string[];
  empty: string;
}) {
  return (
    <section>
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
        {title}
      </h3>
      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground">{empty}</p>
      ) : (
        <ul className="text-xs divide-y rounded-md border max-h-32 overflow-y-auto">
          {items.map((line, i) => (
            <li key={i} className="px-3 py-2">
              {line}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
