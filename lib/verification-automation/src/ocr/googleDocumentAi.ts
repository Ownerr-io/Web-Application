import { createSign } from "node:crypto";

type ServiceAccount = {
  client_email: string;
  private_key: string;
  token_uri?: string;
};

type OcrExtract = {
  company_name: string | null;
  registration_number: string | null;
  country: string | null;
  incorporation_date: string | null;
  ocr_provider: string;
  raw_text: string;
};

function parseServiceAccount(raw: string): ServiceAccount {
  const parsed = JSON.parse(raw) as ServiceAccount;
  if (!parsed.client_email || !parsed.private_key) {
    throw new Error("Invalid GOOGLE_SERVICE_ACCOUNT_JSON");
  }
  return parsed;
}

async function getAccessToken(sa: ServiceAccount): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(
    JSON.stringify({ alg: "RS256", typ: "JWT" }),
  ).toString("base64url");
  const claim = Buffer.from(
    JSON.stringify({
      iss: sa.client_email,
      scope: "https://www.googleapis.com/auth/cloud-platform",
      aud: sa.token_uri ?? "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    }),
  ).toString("base64url");
  const unsigned = `${header}.${claim}`;
  const sign = createSign("RSA-SHA256");
  sign.update(unsigned);
  sign.end();
  const signature = sign
    .sign(sa.private_key.replace(/\\n/g, "\n"))
    .toString("base64url");
  const jwt = `${unsigned}.${signature}`;

  const tokenRes = await fetch(
    sa.token_uri ?? "https://oauth2.googleapis.com/token",
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion: jwt,
      }),
    },
  );
  const tokenJson = (await tokenRes.json()) as {
    access_token?: string;
    error?: string;
  };
  if (!tokenRes.ok || !tokenJson.access_token) {
    throw new Error(tokenJson.error ?? "Google OAuth token failed");
  }
  return tokenJson.access_token;
}

function extractFields(
  text: string,
): Omit<OcrExtract, "ocr_provider" | "raw_text"> {
  const normalized = text.replace(/\s+/g, " ").trim();
  const regMatch =
    normalized.match(
      /(?:registration|company|corp(?:oration)?\.?\s*(?:no|number|#)?)[:\s#]*([A-Z0-9][A-Z0-9\-/]{4,})/i,
    ) ?? normalized.match(/\b([A-Z]{1,3}\d{6,12})\b/);
  const dateMatch = normalized.match(
    /(?:incorporated|incorporation|date of incorporation)[:\s]*([0-9]{1,2}[/.-][0-9]{1,2}[/.-][0-9]{2,4}|[A-Za-z]+ \d{1,2},? \d{4})/i,
  );
  const countryMatch = normalized.match(
    /(?:country|jurisdiction)[:\s]*([A-Za-z][A-Za-z\s]{2,40})/i,
  );
  const nameMatch = normalized.match(
    /(?:company name|registered name|name of company)[:\s]*([^\n\r]{3,120})/i,
  );

  return {
    company_name: nameMatch?.[1]?.trim() ?? null,
    registration_number: regMatch?.[1]?.trim() ?? null,
    country: countryMatch?.[1]?.trim() ?? null,
    incorporation_date: dateMatch?.[1]?.trim() ?? null,
  };
}

export async function runGoogleDocumentAiOcr(input: {
  fileBytes: Uint8Array;
  mimeType: string;
}): Promise<{ extracted: OcrExtract; confidence: number }> {
  const projectId = process.env.GOOGLE_DOCUMENT_AI_PROJECT_ID?.trim();
  const location = process.env.GOOGLE_DOCUMENT_AI_LOCATION?.trim() ?? "us";
  const processorId = process.env.GOOGLE_DOCUMENT_AI_PROCESSOR_ID?.trim();
  const saRaw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON?.trim();

  if (!projectId || !processorId || !saRaw) {
    throw new Error(
      "GOOGLE_DOCUMENT_AI_PROJECT_ID, GOOGLE_DOCUMENT_AI_PROCESSOR_ID, and GOOGLE_SERVICE_ACCOUNT_JSON are required",
    );
  }

  const sa = parseServiceAccount(saRaw);
  const token = await getAccessToken(sa);
  const endpoint = `https://${location}-documentai.googleapis.com/v1/projects/${projectId}/locations/${location}/processors/${processorId}:process`;

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      rawDocument: {
        content: Buffer.from(input.fileBytes).toString("base64"),
        mimeType: input.mimeType,
      },
    }),
  });

  const json = (await res.json()) as {
    document?: { text?: string };
    error?: { message?: string };
  };
  if (!res.ok) {
    throw new Error(json.error?.message ?? "Document AI request failed");
  }

  const rawText = json.document?.text?.trim() ?? "";
  if (rawText.length < 8) {
    throw new Error("Document AI returned insufficient text");
  }

  const fields = extractFields(rawText);
  const confidence =
    fields.registration_number && fields.company_name
      ? 0.92
      : fields.company_name
        ? 0.86
        : 0.72;

  return {
    extracted: {
      ...fields,
      ocr_provider: "google_document_ai",
      raw_text: rawText.slice(0, 8000),
    },
    confidence,
  };
}
