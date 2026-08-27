import { cyaniteGraphQL, sendJson, methodNotAllowed } from "./_cyanite.js";

const FILE_UPLOAD_MUTATION = `
  mutation ReferenceFinderFileUploadRequest {
    fileUploadRequest { id uploadUrl }
  }
`;

export default async function handler(request, response) {
  if (request.method !== "POST") return methodNotAllowed(response, ["POST"]);
  try {
    const data = await cyaniteGraphQL(FILE_UPLOAD_MUTATION);
    const upload = data?.fileUploadRequest;
    if (!upload?.id || !upload?.uploadUrl) {
      return sendJson(response, 502, { ok: false, error: "Cyanite did not return an upload URL." });
    }
    return sendJson(response, 200, {
      ok: true,
      uploadId: upload.id,
      uploadUrl: upload.uploadUrl,
      maxBytes: 20 * 1024 * 1024,
      acceptedMime: "audio/mpeg",
    });
  } catch (error) {
    console.error("[reference-finder] start failed", error);
    return sendJson(response, error.code === "CYANITE_NOT_CONFIGURED" ? 503 : 502, {
      ok: false,
      error: error.message || "Unable to start Cyanite upload.",
    });
  }
}
