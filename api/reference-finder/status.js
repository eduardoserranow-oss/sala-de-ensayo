import { cyaniteGraphQL, sendJson, methodNotAllowed } from "./_cyanite.js";

const STATUS_QUERY = `
  query ReferenceFinderStatus($trackId: ID!) {
    libraryTrack(id: $trackId) {
      __typename
      ... on Error { message }
      ... on Track {
        id
        title
        broad: similarTracks(target: { spotify: {} }, searchMode: { complete: {} }, first: 100) {
          __typename
          ... on SimilarTracksError { code message }
          ... on SimilarTracksConnection { edges { node { id title } } }
        }
        genreTempo: similarTracks(
          target: { spotify: {} }
          searchMode: { complete: {} }
          first: 100
          experimental_filter: { bpm: { input: {} }, genre: { input: {} } }
        ) {
          __typename
          ... on SimilarTracksError { code message }
          ... on SimilarTracksConnection { edges { node { id title } } }
        }
        genreTempoKey: similarTracks(
          target: { spotify: {} }
          searchMode: { complete: {} }
          first: 100
          experimental_filter: { bpm: { input: {} }, genre: { input: {} }, key: { matching: { input: {} } } }
        ) {
          __typename
          ... on SimilarTracksError { code message }
          ... on SimilarTracksConnection { edges { node { id title } } }
        }
      }
    }
  }
`;

function edgesOf(result) {
  return result?.__typename === "SimilarTracksConnection" ? (result.edges || []) : [];
}

function reciprocalRankFusion(groups) {
  const scores = new Map();
  const tracks = new Map();
  const K = 60;
  for (const { edges, weight, label } of groups) {
    edges.forEach((edge, index) => {
      const node = edge?.node;
      if (!node?.id) return;
      tracks.set(node.id, node);
      const entry = scores.get(node.id) || { score: 0, sources: [] };
      entry.score += weight / (K + index + 1);
      entry.sources.push(label);
      scores.set(node.id, entry);
    });
  }
  const ranked = [...scores.entries()]
    .map(([id, value]) => ({ id, ...tracks.get(id), fusion: value.score, sources: value.sources }))
    .sort((a, b) => b.fusion - a.fusion);
  const top = ranked[0]?.fusion || 1;
  return ranked.slice(0, 4).map((item, index) => {
    const normalized = item.fusion / top;
    const matchScore = Math.max(70, Math.min(99, Math.round(72 + normalized * 27 - index * 1.5)));
    return {
      id: item.id,
      title: item.title || "Spotify reference",
      spotifyUrl: `https://open.spotify.com/track/${encodeURIComponent(item.id)}`,
      matchScore,
      rank: index + 1,
      signals: item.sources,
    };
  });
}

export default async function handler(request, response) {
  if (request.method !== "GET") return methodNotAllowed(response, ["GET"]);
  const trackId = String(request.query?.trackId || "");
  if (!trackId) return sendJson(response, 400, { ok: false, error: "trackId is required." });
  try {
    const data = await cyaniteGraphQL(STATUS_QUERY, { trackId });
    const track = data?.libraryTrack;
    if (!track || track.__typename === "Error") {
      return sendJson(response, 404, { ok: false, error: track?.message || "Cyanite track not found." });
    }
    const broad = edgesOf(track.broad);
    const genreTempo = edgesOf(track.genreTempo);
    const genreTempoKey = edgesOf(track.genreTempoKey);
    if (!broad.length) {
      const reason = track?.broad?.message || track?.genreTempo?.message || track?.genreTempoKey?.message || "Cyanite is still analyzing the track.";
      return sendJson(response, 200, { ok: true, state: "analyzing", trackId, title: track.title || "", message: reason });
    }
    const matches = reciprocalRankFusion([
      { edges: broad, weight: 0.55, label: "complete-audio" },
      { edges: genreTempo, weight: 0.30, label: "genre+tempo" },
      { edges: genreTempoKey, weight: 0.15, label: "genre+tempo+key" },
    ]);
    return sendJson(response, 200, {
      ok: true,
      state: "ready",
      trackId,
      title: track.title || "",
      candidates: { broad: broad.length, genreTempo: genreTempo.length, genreTempoKey: genreTempoKey.length },
      matches,
      scoreVersion: "FORTISSIMO Reference Match v0.1",
      scoreNote: "Score is an internal rank-fusion score, not a literal acoustic percentage.",
    });
  } catch (error) {
    console.error("[reference-finder] status failed", error);
    const message = error.message || "Unable to read Cyanite analysis.";
    const likelyProcessing = /analysis|processing|not.*available|not.*finished|similar/i.test(message);
    return sendJson(response, likelyProcessing ? 200 : 502, {
      ok: likelyProcessing,
      state: likelyProcessing ? "analyzing" : "error",
      error: likelyProcessing ? undefined : message,
      message: likelyProcessing ? message : undefined,
    });
  }
}
