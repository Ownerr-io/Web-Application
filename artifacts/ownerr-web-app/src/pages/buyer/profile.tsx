import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useMockSession } from "@/context/MockSessionContext";
import { founderAvatarUrl } from "@/lib/utils";

export default function BuyerProfilePage() {
  const { currentUser, logout } = useMockSession();

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle>My Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/20 p-3">
            <img
              src={founderAvatarUrl(currentUser?.avatarSeed ?? currentUser?.id ?? "buyer")}
              alt=""
              className="h-12 w-12 rounded-full border border-border object-cover"
            />
            <div>
              <p className="text-sm font-semibold text-foreground">{currentUser?.name ?? "Account"}</p>
              <p className="text-xs text-muted-foreground capitalize">{currentUser?.role ?? "buyer"}</p>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-border px-3 py-2">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Preferred Budget</p>
              <p className="mt-1 text-lg font-bold">$100k - $300k</p>
            </div>
            <div className="rounded-lg border border-border px-3 py-2">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Primary Focus</p>
              <p className="mt-1 text-lg font-bold">B2B SaaS</p>
            </div>
            <div className="rounded-lg border border-border px-3 py-2">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Response SLA</p>
              <p className="mt-1 text-lg font-bold">&lt; 24h</p>
            </div>
          </div>
          <div>
            <p className="font-semibold">Name</p>
            <p>{currentUser?.name}</p>
          </div>
          <div>
            <p className="font-semibold">Email</p>
            <p>{currentUser?.email}</p>
          </div>
          <div>
            <p className="font-semibold">Role</p>
            <p className="capitalize">{currentUser?.role}</p>
          </div>
          <Button onClick={logout} variant="outline">
            Logout
          </Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Buyer Preferences</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p className="rounded-md border border-border px-3 py-2">Categories: AI, Developer Tools, Marketing</p>
          <p className="rounded-md border border-border px-3 py-2">Verified revenue required: Yes</p>
          <p className="rounded-md border border-border px-3 py-2">Target monthly revenue: $5k - $25k</p>
          <p className="rounded-md border border-border px-3 py-2">Preferred deal stage: Negotiating</p>
        </CardContent>
      </Card>
    </div>
  );
}