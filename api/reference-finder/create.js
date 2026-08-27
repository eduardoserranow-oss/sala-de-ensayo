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

const LIST_TRACKS_QUERY = `query ReferenceFinderTempSweep($first:Int!,$after:String){libraryTracks(first:$first,after:$after){pageInfo{hasNextPage}edges{cursor node{id externalId}}}}`;
const DELETE_TRACKS_MUTATION = `mutation ReferenceFinderTempSweepDelete($input:LibraryTracksDeleteInput!){libraryTracksDelete(input:$input){__typename ... on LibraryTracksDeleteSuccess{libraryTrackIds} ... on LibraryTracksDeleteError{code message}}}`;

function cleanTitle(value) {
  return String(value || "Reference Finder upload").replace(/\.[^.]+$/, "").slice(0, 150);
}

async function purgeStaleReferenceFinderTracks(){
  try{
    const ids=[];
    let after=null,guard=0;
    do{
      const data=await cyaniteGraphQL(LIST_TRACKS_QUERY,{first:50,after});
      const conn=data?.libraryTracks,edges=conn?.edges||[];
      for(const edge of edges){
        const node=edge?.node;
        if(node?.id && String(node.externalId||"").startsWith("fortissimo-rf-")) ids.push(node.id);
      }
      after=conn?.pageInfo?.hasNextPage && edges.length ? edges[edges.length-1].cursor : null;
      guard++;
    }while(after && guard<20);
    for(let i=0;i<ids.length;i+=100){
      const result=await cyaniteGraphQL(DELETE_TRACKS_MUTATION,{input:{libraryTrackIds:ids.slice(i,i+100)}});
      if(result?.libraryTracksDelete?.__typename!=="LibraryTracksDeleteSuccess") break;
    }
    return ids.length;
  }catch(error){
    console.warn("[reference-finder] stale temp sweep skipped",error.message);
    return 0;
  }
}

export default async function handler(request, response) {
  if (request.method !== "POST") return methodNotAllowed(response, ["POST"]);
  const { uploadId, title } = request.body || {};
  if (!uploadId) return sendJson(response, 400, { ok: false, error: "uploadId is required." });
  try {
    // Defensive sweep: if a previous analysis was abandoned, timed out, or the browser closed,
    // remove its Reference Finder LibraryTrack before creating a new one.
    const purgedBeforeCreate=await purgeStaleReferenceFinderTracks();
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
      retention:{temporary:true,purgedStaleTracks:purgedBeforeCreate},
    });
  } catch (error) {
    console.error("[reference-finder] create failed", error);
    return sendJson(response, error.code === "CYANITE_NOT_CONFIGURED" ? 503 : 502, {
      ok: false,
      error: error.message || "Unable to create Cyanite track.",
    });
  }
}
