const CYANITE_GRAPHQL_URL = "https://api.cyanite.ai/graphql";

export function getCyaniteToken() {
  return process.env.CYANITE_ACCESS_TOKEN || process.env.CYANITE_API_KEY || "";
}

export async function cyaniteGraphQL(query, variables = {}) {
  const token = getCyaniteToken();
  if (!token) {
    const error = new Error("Cyanite credentials are not configured.");
    error.code = "CYANITE_NOT_CONFIGURED";
    throw error;
  }
  const response = await fetch(CYANITE_GRAPHQL_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
    body: JSON.stringify({ query, variables }),
  });
  const text = await response.text();
  let payload;
  try { payload = JSON.parse(text); }
  catch {
    const error = new Error(`Cyanite returned a non-JSON response (${response.status}).`);
    error.status = response.status;
    throw error;
  }
  if (!response.ok) {
    const error = new Error(payload?.errors?.[0]?.message || `Cyanite HTTP ${response.status}`);
    error.status = response.status;
    error.payload = payload;
    throw error;
  }
  if (payload?.errors?.length) {
    const error = new Error(payload.errors.map(item => item.message).join("; "));
    error.payload = payload;
    throw error;
  }
  return payload.data;
}

export function sendJson(response, status, data) {
  response.setHeader("Cache-Control", "no-store");
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  return response.status(status).json(data);
}

export function methodNotAllowed(response, allowed) {
  response.setHeader("Allow", allowed.join(", "));
  return sendJson(response, 405, { ok: false, error: "Method not allowed" });
}
