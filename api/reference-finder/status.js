import { cyaniteGraphQL, sendJson, methodNotAllowed } from "./_cyanite.js";

const ANALYSIS_QUERY = `
  query ReferenceFinderAnalysis($trackId: ID!) {
    libraryTrack(id: $trackId) {
      __typename
      ... on LibraryTrackNotFoundError { message }
      ... on LibraryTrack {
        id
        title
        audioAnalysisV7 {
          __typename
          ... on AudioAnalysisV7Finished {
            result {
              bpmPrediction { value confidence }
              keyPrediction { value confidence }
              timeSignature
              genreTags
              subgenreTags
              moodTags
              moodAdvancedTags
              instrumentTags
              movementTags
              characterTags
              valence
              arousal
              transformerCaption
              freeGenreTags
            }
          }
          ... on AudioAnalysisV7Failed { error { message } }
        }
      }
    }
  }
`;

const SIMILAR_QUERY = `
  query ReferenceFinderSimilar($trackId: ID!) {
    libraryTrack(id: $trackId) {
      __typename
      ... on LibraryTrack {
        id
        title
        similarTracks(
          target: { spotify: {} }
          searchMode: { complete: true }
          first: 100
        ) {
          __typename
          ... on SimilarTracksError { code message }
          ... on SimilarTracksConnection {
            edges { node { id title } }
          }
        }
      }
    }
  }
`;

const FILTERED_SIMILAR_QUERY = `
  query ReferenceFinderFilteredSimilar($trackId: ID!) {
    libraryTrack(id: $trackId) {
      __typename
      ... on LibraryTrack {
        similarTracks(
          target: { spotify: {} }
          searchMode: { complete: true }
          first: 100
          experimental_filter: { bpm: { input: {} }, genre: { input: {} } }
        ) {
          __typename
          ... on SimilarTracksError { code message }
          ... on SimilarTracksConnection {
            edges { node { id title } }
          }
        }
      }
    }
  }
`;

const REPRESENTATIVE_QUERY = `
  query ReferenceFinderRepresentative($trackId: ID!) {
    libraryTrack(id: $trackId) {
      __typename
      ... on LibraryTrack {
        similarTracks(
          target: { spotify: {} }
          searchMode: { mostRepresentative: true }
          first: 100
        ) {
          __typename
          ... on SimilarTracksError { code message }
          ... on SimilarTracksConnection {
            edges { node { id title } }
          }
        }
      }
    }
  }
`;

function edgesOf(result) {
  return result?.__typename === "SimilarTracksConnection" ? (result.edges || []) : [];
}

function unique(values, max = 6) {
  return [...new Set((values || []).filter(Boolean))].slice(0, max);
}

function makeDNA(result) {
  return {
    bpm: result?.bpmPrediction?.value ? Math.round(result.bpmPrediction.value) : null,
    bpmConfidence: result?.bpmPrediction?.confidence ?? null,
    key: result?.keyPrediction?.value || null,
    keyConfidence: result?.keyPrediction?.confidence ?? null,
    timeSignature: result?.timeSignature || null,
    genres: unique(result?.genreTags),
    subgenres: unique(result?.subgenreTags),
    moods: unique([...(result?.moodAdvancedTags || []), ...(result?.moodTags || [])]),
    instruments: unique(result?.instrumentTags, 8),
    movement: unique(result?.movementTags),
    character: unique(result?.characterTags),
    valence: result?.valence ?? null,
    arousal: result?.arousal ?? null,
    caption: result?.transformerCaption || null,
    freeGenre: result?.freeGenreTags || null,
  };
}

const TECHNICAL_TITLE_WORDS = new Set([
  "final","master","mastered","mix","mixed","mixdown","rough","demo","bounce","export","preview",
  "version","ver","rev","revision","edit","radio","instrumental","client","cliente","fortissimo","analysis"
]);

function normalizeTitle(value) {
  return String(value || "")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/\.[a-z0-9]{2,5}$/i, "")
    .toLowerCase()
    .replace(/\b(v|ver|version|rev)\s*\d+(?:\.\d+)?\b/g, " ")
    .replace(/\b\d{4}[-_.]\d{1,2}[-_.]\d{1,2}\b/g, " ")
    .replace(/[()[\]{}]/g, " ")
    .replace(/[^a-z0-9áéíóúñü]+/gi, " ")
    .split(/\s+/)
    .filter(word => word && !TECHNICAL_TITLE_WORDS.has(word))
    .join(" ")
    .trim();
}

function titleTokens(value) {
  return new Set(normalizeTitle(value).split(/\s+/).filter(token => token.length > 1));
}

function tokenOverlap(a, b) {
  const left = titleTokens(a), right = titleTokens(b);
  if (!left.size || !right.size) return 0;
  let shared = 0;
  for (const token of left) if (right.has(token)) shared++;
  return shared / Math.min(left.size, right.size);
}

function titleSegments(value) {
  const raw = String(value || "").replace(/\.[^.]+$/, "");
  return [raw, ...raw.split(/\s[-–—]\s|\s+x\s+/i)]
    .map(normalizeTitle)
    .filter(Boolean);
}

function looksLikeSameSong(sourceTitle, candidateTitle) {
  const sourceSegments = titleSegments(sourceTitle);
  const candidateSegments = titleSegments(candidateTitle);
  for (const source of sourceSegments) {
    if (source.length < 4) continue;
    for (const candidate of candidateSegments) {
      if (candidate.length < 4) continue;
      if (source === candidate) return true;
      if (Math.min(source.length, candidate.length) >= 7 && (source.includes(candidate) || candidate.includes(source))) return true;
      if (tokenOverlap(source, candidate) >= 0.85 && Math.min(titleTokens(source).size, titleTokens(candidate).size) >= 2) return true;
    }
  }
  return false;
}

function reciprocalRankFusion(groups, { sourceTitle = "", excludeSpotifyId = "" } = {}) {
  const scores = new Map();
  const tracks = new Map();
  const K = 60;
  for (const { edges, weight, label } of groups) {
    edges.forEach((edge, index) => {
      const node = edge?.node;
      if (!node?.id) return;
      if (excludeSpotifyId && node.id === excludeSpotifyId) return;
      if (sourceTitle && looksLikeSameSong(sourceTitle, node.title)) return;
      tracks.set(node.id, node);
      const entry = scores.get(node.id) || { score: 0, sources: [] };
      entry.score += weight / (K + index + 1);
      if (!entry.sources.includes(label)) entry.sources.push(label);
      scores.set(node.id, entry);
    });
  }
  const ranked = [...scores.entries()]
    .map(([id, value]) => ({ id, ...tracks.get(id), fusion: value.score, sources: value.sources }))
    .sort((a, b) => b.fusion - a.fusion);
  const top = ranked[0]?.fusion || 1;
  return ranked.slice(0, 4).map((item, index) => {
    const normalized = item.fusion / top;
    const matchScore = Math.max(70, Math.min(98, Math.round(70 + normalized * 28 - index * 1.5)));
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

async function safeSimilar(query, trackId) {
  try {
    const data = await cyaniteGraphQL(query, { trackId });
    return edgesOf(data?.libraryTrack?.similarTracks);
  } catch (error) {
    console.warn("[reference-finder] optional similarity lane skipped", error.message);
    return [];
  }
}

export default async function handler(request, response) {
  if (request.method !== "GET") return methodNotAllowed(response, ["GET"]);
  const trackId = String(request.query?.trackId || "");
  const excludeSpotifyId = String(request.query?.excludeSpotifyId || "");
  if (!trackId) return sendJson(response, 400, { ok: false, error: "trackId is required." });

  try {
    const analysisData = await cyaniteGraphQL(ANALYSIS_QUERY, { trackId });
    const track = analysisData?.libraryTrack;
    if (!track || track.__typename === "LibraryTrackNotFoundError") {
      return sendJson(response, 404, { ok: false, error: track?.message || "Cyanite track not found." });
    }

    const analysis = track.audioAnalysisV7;
    if (analysis?.__typename === "AudioAnalysisV7Failed") {
      return sendJson(response, 200, {
        ok: true,
        state: "failed",
        trackId,
        error: analysis?.error?.message || "Cyanite analysis failed.",
      });
    }
    if (analysis?.__typename !== "AudioAnalysisV7Finished") {
      return sendJson(response, 200, {
        ok: true,
        state: "analyzing",
        trackId,
        title: track.title || "",
        analysisState: analysis?.__typename || "pending",
      });
    }

    const dna = makeDNA(analysis.result);
    const broadData = await cyaniteGraphQL(SIMILAR_QUERY, { trackId });
    const broadResult = broadData?.libraryTrack?.similarTracks;
    const broad = edgesOf(broadResult);
    if (!broad.length) {
      return sendJson(response, 200, {
        ok: true,
        state: "searching",
        trackId,
        title: track.title || "",
        dna,
        message: broadResult?.message || "Analysis is ready; Spotify similarity index is still preparing.",
      });
    }

    const [genreTempo, representative] = await Promise.all([
      safeSimilar(FILTERED_SIMILAR_QUERY, trackId),
      safeSimilar(REPRESENTATIVE_QUERY, trackId),
    ]);

    const matches = reciprocalRankFusion([
      { edges: broad, weight: 0.55, label: "complete-audio" },
      { edges: genreTempo, weight: 0.25, label: "genre+tempo" },
      { edges: representative, weight: 0.20, label: "representative-segment" },
    ], { sourceTitle: track.title || "", excludeSpotifyId });

    return sendJson(response, 200, {
      ok: true,
      state: "ready",
      trackId,
      title: track.title || "",
      dna,
      candidates: {
        complete: broad.length,
        genreTempo: genreTempo.length,
        representative: representative.length,
      },
      exclusions: {
        sourceSong: true,
        excludedSpotifyId: excludeSpotifyId || null,
      },
      matches,
      scoreVersion: "FORTISSIMO Reference Match v0.3",
      scoreNote: "Internal rank-fusion score. The uploaded/source song is excluded from recommendations.",
    });
  } catch (error) {
    console.error("[reference-finder] status failed", error);
    return sendJson(response, error.code === "CYANITE_NOT_CONFIGURED" ? 503 : 502, {
      ok: false,
      state: "error",
      error: error.message || "Unable to read Cyanite analysis.",
    });
  }
}
