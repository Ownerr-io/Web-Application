export const config = {
    api: {
        bodyParser: false,
    },
};
function internalWorkerBase() {
    const raw = process.env.SYNC_WORKER_INTERNAL_URL?.trim() ??
        process.env.SYNC_WORKER_PROXY_TARGET?.trim();
    if (!raw)
        return null;
    return raw.replace(/\/$/, "");
}
export default async function handler(req, res) {
    const base = internalWorkerBase();
    if (!base) {
        res.status(503).json({
            error: "Optional verification routes are not configured. Marketplace uses Supabase only; set verification invoke URLs in platform_internal_config or SYNC_WORKER_INTERNAL_URL if you enable async verification.",
        });
        return;
    }
    const slug = req.query.path;
    const segments = Array.isArray(slug) ? slug : slug ? [slug] : [];
    const pathSuffix = segments.join("/");
    if (!pathSuffix) {
        res.status(404).json({ error: "not found" });
        return;
    }
    const qs = req.url?.includes("?") ? req.url.slice(req.url.indexOf("?")) : "";
    const target = `${base}/${pathSuffix}${qs}`;
    const headers = new Headers();
    const auth = req.headers.authorization;
    if (typeof auth === "string")
        headers.set("Authorization", auth);
    const contentType = req.headers["content-type"];
    if (typeof contentType === "string")
        headers.set("Content-Type", contentType);
    const origin = req.headers.origin;
    if (typeof origin === "string")
        headers.set("Origin", origin);
    let body;
    if (req.method !== "GET" && req.method !== "HEAD") {
        const chunks = [];
        for await (const chunk of req) {
            chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
        }
        body = Buffer.concat(chunks).toString("utf8");
    }
    try {
        const upstream = await fetch(target, {
            method: req.method,
            headers,
            body: body && body.length > 0 ? body : undefined,
        });
        const text = await upstream.text();
        const upstreamType = upstream.headers.get("content-type");
        if (upstreamType)
            res.setHeader("Content-Type", upstreamType);
        res.status(upstream.status).send(text);
    }
    catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        res.status(502).json({ error: message });
    }
}
