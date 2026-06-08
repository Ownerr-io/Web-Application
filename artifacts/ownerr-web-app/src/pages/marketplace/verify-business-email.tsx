import { useEffect, useState } from "react";
import { useSearch } from "wouter";
import { confirmBusinessEmailVerification } from "@/lib/intelligence/listingVerificationApi";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { MARKETPLACE_ROUTES } from "@/routing/routeRegistry";

export default function VerifyBusinessEmailPage() {
  const search = useSearch();
  const [status, setStatus] = useState<"idle" | "loading" | "ok" | "error">(
    "idle",
  );
  const [message, setMessage] = useState("");

  useEffect(() => {
    const q = search.startsWith("?") ? search.slice(1) : search;
    const token = new URLSearchParams(q).get("token");
    if (!token) {
      setStatus("error");
      setMessage("Missing verification token.");
      return;
    }
    setStatus("loading");
    confirmBusinessEmailVerification(token)
      .then(() => {
        setStatus("ok");
        setMessage(
          "Your business email is verified. If all other checks are complete, your listing will publish automatically.",
        );
      })
      .catch((e: Error) => {
        setStatus("error");
        setMessage(e.message);
      });
  }, [search]);

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col justify-center gap-4 px-4 py-12">
      <h1 className="text-2xl font-bold">Business email verification</h1>
      {status === "loading" ? (
        <p className="text-sm text-muted-foreground">Confirming…</p>
      ) : (
        <p className="text-sm text-muted-foreground">{message}</p>
      )}
      <Button asChild variant="secondary">
        <Link href={MARKETPLACE_ROUTES.sellerCompanies}>Back to companies</Link>
      </Button>
    </div>
  );
}
