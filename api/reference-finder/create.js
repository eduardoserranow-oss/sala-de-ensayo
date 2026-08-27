import { cyaniteGraphQL, sendJson, methodNotAllowed } from "./_cyanite.js";

const CREATE_TRACK_MUTATION = `
  mutation ReferenceFinderCreateTrack($input: LibraryTrackCreateInput!) {
    libraryTrackCreate(input: $input) {
      __typename
      ... on LibraryTrackCreateSuccess {
        createdLibraryTrack { id title }
      }
      ... on LibraryTrackCreateError {
        code
        message
      }
    }
  }
`;

function cleanTitle(value) {
  return String(value || "Reference Finder upload").replace(/\.[^.]+$/, "").slice(0, 150);
}

export default async function handler(request, response) {
  if (request.method !== "POST") return methodNotAllowed(response, ["POST"]);
  const { uploadId, title } = request.body || {};
  if (!uploadId) return sendJson(response, 400, { ok: false, error: "uploadId is required." });
  try {
    const data = await cyaniteGraphQL(CREATE_TRACK_MUTATION, {
      input: {
        uploadId,
        title: cleanTitle(title),
        externalId: `fortissimo-rf-${Date.now()}`,
      },
    });
    const result = data?.libraryTrackCreate;
    if (result?.__typename !== "LibraryTrackCreateSuccess") {
      return sendJson(response, 422, {
        ok: false,
        error: result?.message || "Cyanite could not create the LibraryTrack.",
        code: result?.code || null,
      });
    }
    const track = result.createdLibraryTrack;
    return sendJson(response, 200, {
      ok: true,
      trackId: track.id,
      title: track.title || cleanTitle(title),
      state: "analyzing",
    });
  } catch (error) {
    console.error("[reference-finder] create failed", error);
    return sendJson(response, error.code === "CYANITE_NOT_CONFIGURED" ? 503 : 502, {
      ok: false,
      error: error.message || "Unable to create Cyanite track.",
    });
  }
}
