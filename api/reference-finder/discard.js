import { cyaniteGraphQL, sendJson, methodNotAllowed } from "./_cyanite.js";

const TRACK_QUERY = `query ReferenceFinderDiscardTrack($trackId:ID!){libraryTrack(id:$trackId){__typename ... on LibraryTrack{id externalId title} ... on LibraryTrackNotFoundError{message}}}`;
const DELETE_MUTATION = `mutation ReferenceFinderDiscard($input:LibraryTracksDeleteInput!){libraryTracksDelete(input:$input){__typename ... on LibraryTracksDeleteSuccess{libraryTrackIds} ... on LibraryTracksDeleteError{code message}}}`;

export default async function handler(req,res){
  if(req.method!=="POST") return methodNotAllowed(res,["POST"]);
  const trackId=String(req.body?.trackId||"");
  if(!trackId) return sendJson(res,400,{ok:false,error:"trackId is required."});
  try{
    const data=await cyaniteGraphQL(TRACK_QUERY,{trackId});
    const track=data?.libraryTrack;
    if(!track || track.__typename==="LibraryTrackNotFoundError") return sendJson(res,200,{ok:true,deleted:false,alreadyGone:true});
    if(!String(track.externalId||"").startsWith("fortissimo-rf-")) return sendJson(res,403,{ok:false,error:"Only FORTISSIMO Reference Finder temporary tracks can be discarded."});
    const deleted=await cyaniteGraphQL(DELETE_MUTATION,{input:{libraryTrackIds:[trackId]}});
    const result=deleted?.libraryTracksDelete;
    if(result?.__typename!=="LibraryTracksDeleteSuccess") return sendJson(res,502,{ok:false,error:result?.message||"Cyanite did not confirm deletion.",code:result?.code||null});
    return sendJson(res,200,{ok:true,deleted:true,trackId});
  }catch(error){
    console.error("[reference-finder] discard failed",error);
    return sendJson(res,502,{ok:false,error:error.message||"Unable to discard temporary Cyanite track."});
  }
}
