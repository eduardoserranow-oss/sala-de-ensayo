import { cyaniteGraphQL, sendJson, methodNotAllowed } from "./_cyanite.js";

const LIST = `query ReferenceFinderCleanupList($first:Int!,$after:String){libraryTracks(first:$first,after:$after){pageInfo{hasNextPage}edges{cursor node{id title externalId}}}}`;
const DELETE = `mutation ReferenceFinderCleanupDelete($input:LibraryTracksDeleteInput!){libraryTracksDelete(input:$input){__typename ... on LibraryTracksDeleteError{code message}}}`;

export default async function handler(req,res){
  if(req.method!=="GET") return methodNotAllowed(res,["GET"]);
  if(String(req.query?.confirm||"")!=="purge-reference-finder-temp") return sendJson(res,403,{ok:false,error:"Explicit cleanup confirmation required."});
  try{
    const found=[];
    let after=null, guard=0;
    do{
      const data=await cyaniteGraphQL(LIST,{first:50,after});
      const conn=data?.libraryTracks;
      const edges=conn?.edges||[];
      for(const edge of edges){
        const node=edge?.node;
        if(node?.id && String(node.externalId||"").startsWith("fortissimo-rf-")) found.push({id:node.id,title:node.title||"",externalId:node.externalId});
      }
      after=conn?.pageInfo?.hasNextPage && edges.length ? edges[edges.length-1].cursor : null;
      guard++;
    }while(after && guard<20);
    if(!found.length) return sendJson(res,200,{ok:true,found:0,deleted:0,message:"No Reference Finder temporary tracks found."});
    let deleted=0;
    for(let i=0;i<found.length;i+=100){
      const ids=found.slice(i,i+100).map(x=>x.id);
      const result=await cyaniteGraphQL(DELETE,{input:{libraryTrackIds:ids}});
      const out=result?.libraryTracksDelete;
      if(out?.__typename!=="LibraryTracksDeleteSuccess") return sendJson(res,502,{ok:false,found:found.length,deleted,error:out?.message||"Cyanite cleanup failed.",code:out?.code||null});
      deleted+=ids.length;
    }
    return sendJson(res,200,{ok:true,found:found.length,deleted,tracks:found.map(x=>({id:x.id,title:x.title}))});
  }catch(error){
    console.error("[reference-finder] cleanup failed",error);
    return sendJson(res,502,{ok:false,error:error.message||"Unable to clean Cyanite Reference Finder tracks."});
  }
}
