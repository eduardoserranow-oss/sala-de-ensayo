import {SkyKeysSoundEngine} from './vibe-roulette-skykeys-engine-v1.js';

export const SKYKEYS_CATALOG_GAP_REPAIR_INFO={
  version:'1.0.0',
  expectedCatalogCount:222,
  observedCatalogCountBeforeRepair:221,
  repairedPreset:{id:183,name:'Fame Chime'},
  policy:'Restore the Phase 1 audited preset that is missing from the generated CSV. Do not alter pianist, harmony, drums or audio mappings.'
};

export const FAME_CHIME_CATALOG_RECORD=Object.freeze({
  id:183,
  name:'Fame Chime',
  function:'Keys',
  source:'Synths',
  section:'Synth Digital',
  favorite:false,
  pianistCompatibility:'preferred',
  roleScores:{main_harmony:.92,rhythmic_chords:.78,support_pad:.28,pluck_arp:.35,hook_lead:.42,texture:.25}
});

const originalLoadCatalog=SkyKeysSoundEngine.prototype.loadCatalog;
if(!originalLoadCatalog.__skyKeysCatalogGapRepairPatched){
  const patched=async function(...args){
    await originalLoadCatalog.apply(this,args);
    if(this.catalog.length===221&&!this.catalogByName.has(FAME_CHIME_CATALOG_RECORD.name)){
      const record={...FAME_CHIME_CATALOG_RECORD,roleScores:{...FAME_CHIME_CATALOG_RECORD.roleScores}};
      this.catalog.push(record);
      this.catalogByName.set(record.name,record);
      this.onStatus({type:'catalog-repair',preset:record.name,id:record.id,count:this.catalog.length});
    }
    return this.catalog.length;
  };
  patched.__skyKeysCatalogGapRepairPatched=true;
  patched.__skyKeysCatalogGapRepairOriginal=originalLoadCatalog;
  SkyKeysSoundEngine.prototype.loadCatalog=patched;
}
