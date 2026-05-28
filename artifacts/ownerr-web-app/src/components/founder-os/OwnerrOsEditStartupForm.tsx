import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FOUNDER_CATEGORIES } from "@/components/founder-os/founderOsQuestions";
import type { FounderSubmissionRecord } from "@/lib/founderTypes";
import { submitFounder, updateFounderSubmission } from "@/lib/founderService";
import { draftToCreateFounderInput } from "@/lib/auth/mergeOwnerrOsDraft";
import type { OwnerrOsDraft } from "@/lib/auth/ownerrOsDraft";
import { useFounderOs } from "@/context/FounderOsContext";
import { useToast } from "@/hooks/use-toast";

type Props = {
  record?: FounderSubmissionRecord | null;
  mode?: "create" | "edit";
  onSaved: (record?: FounderSubmissionRecord) => void;
  onCancel?: () => void;
};

function recordToDraft(record: FounderSubmissionRecord): OwnerrOsDraft {
  return {
    fullName: record.founderName,
    startupName: record.startupName,
    industry: record.category ?? "Other",
    ideaDescription: record.description,
    updatedAt: Date.now(),
  };
}

export function OwnerrOsEditStartupForm({
  record,
  mode = record ? "edit" : "create",
  onSaved,
  onCancel,
}: Props) {
  const { setCompletedRecord } = useFounderOs();
  const { toast } = useToast();
  const initial = record
    ? recordToDraft(record)
    : {
        fullName: "",
        startupName: "",
        industry: "SaaS",
        ideaDescription: "",
        updatedAt: Date.now(),
      };
  const [fullName, setFullName] = useState(initial.fullName);
  const [startupName, setStartupName] = useState(initial.startupName);
  const [industry, setIndustry] = useState(initial.industry);
  const [ideaDescription, setIdeaDescription] = useState(
    initial.ideaDescription,
  );
  const [saving, setSaving] = useState(false);

  async function onSave() {
    if (
      fullName.trim().length < 2 ||
      startupName.trim().length < 2 ||
      ideaDescription.trim().length < 12
    ) {
      toast({ title: "Fill in all required fields", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const draft: OwnerrOsDraft = {
        fullName: fullName.trim(),
        startupName: startupName.trim(),
        industry: industry.trim() || "Other",
        ideaDescription: ideaDescription.trim(),
        updatedAt: Date.now(),
      };
      const input = draftToCreateFounderInput(draft);
      if (mode === "create" || !record) {
        const { record: created } = await submitFounder(input);
        setCompletedRecord(created);
        toast({ title: "Listing created" });
        onSaved(created);
        return;
      }
      const { record: updated } = await updateFounderSubmission(
        record.id,
        input,
      );
      setCompletedRecord(updated);
      toast({ title: "Listing updated" });
      onSaved(updated);
    } catch (e) {
      toast({
        title: "Could not save",
        description: e instanceof Error ? e.message : "Try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      {onCancel ? (
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          ← Back to listing
        </Button>
      ) : null}
      <div className="space-y-4 rounded-xl border border-border bg-muted/20 p-6">
        <h2 className="text-lg font-bold">
          {mode === "create" ? "Create your startup listing" : "Edit startup"}
        </h2>
        <div className="space-y-2">
          <Label htmlFor="edit-name">Your name</Label>
          <Input
            id="edit-name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="edit-startup">Startup name</Label>
          <Input
            id="edit-startup"
            value={startupName}
            onChange={(e) => setStartupName(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label>Industry</Label>
          <Select value={industry} onValueChange={setIndustry}>
            <SelectTrigger>
              <SelectValue />
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
        <div className="space-y-2">
          <Label htmlFor="edit-desc">Description</Label>
          <Textarea
            id="edit-desc"
            rows={4}
            value={ideaDescription}
            onChange={(e) => setIdeaDescription(e.target.value)}
          />
        </div>
        <Button
          type="button"
          className="btn-platform-gradient w-full font-bold"
          disabled={saving}
          onClick={() => void onSave()}
        >
          {saving
            ? "Saving…"
            : mode === "create"
              ? "Publish listing"
              : "Save changes"}
        </Button>
      </div>
    </div>
  );
}
