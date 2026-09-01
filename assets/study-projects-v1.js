(function(){
  "use strict";
  const KEY="fortissimo.studyPaths.projects.v1";
  const HISTORY_KEY="fortissimo.studyPaths.projects.history.v1";
  const MAX_HISTORY=12;
  const instruments=["Guitarra eléctrica","Bajo eléctrico","Guitarra acústica","Voz","Piano / Keys","Otro"];
  const roadStages=[
    ["Blues → Blues moderno","Construir fraseo expresivo, control dinámico y sentido del espacio.","B.B. King","The Thrill Is Gone","Fraseo, bends, vibrato, pentatónica, dinámica y espacio.","John Mayer","Gravity","Aplicar el blues a fills, pocket y clean/crunch modernos.","Aprendes intención y respiración; después aplicas esa expresividad dentro de un arreglo moderno."],
    ["Hendrix → Guitarra moderna","Unir acordes, melodía y ornamentación sin separar ritmo y lead.","Jimi Hendrix","Little Wing","Acordes con melodía, double-stops, hammer-ons, fills e inversiones.","John Mayer","Slow Dancing in a Burning Room","Aplicar el vocabulario Hendrix a una balada blues contemporánea.","Little Wing presenta el idioma; Slow Dancing lo organiza con más espacio y control."],
    ["Funk → Funk moderno","Desarrollar precisión de semicorcheas, muting y mano derecha.","Chic","Le Freak","Tríadas, inversiones, semicorcheas, muting y staccato.","Daft Punk","Get Lucky","Aplicar el ADN de Nile Rodgers en producción moderna.","Le Freak enseña la mecánica clásica; Get Lucky la convierte en pop moderno."],
    ["Rock / Texturas → Rock latino","Construir resistencia, arpegios precisos y criterio con efectos.","The Police","Message in a Bottle","Arpegios, add9, precisión, resistencia y efectos.","Soda Stereo","En la Ciudad de la Furia","Texturas y uso musical de chorus, delay y reverb.","The Police desarrolla precisión; Soda Stereo transforma esos recursos en atmósfera."],
    ["Reggae: contratiempo y espacio","Dominar el contratiempo y entender el silencio como groove.","Bob Marley & The Wailers","Stir It Up","Skank, contratiempo, staccato, muting y espacio.","Bob Marley & The Wailers","Could You Be Loved","Añadir movimiento sin perder el pocket reggae.","Stir It Up establece el skank; Could You Be Loved añade movimiento y variación."],
    ["Soul/Funk → Pop-Funk moderno","Crear impacto con pocas notas, dinámica y articulación limpia.","Prince","Kiss","Minimalismo, clean funk, muting y economía de notas.","John Mayer","New Light","Aplicar esa economía a pop moderno.","Kiss demuestra que la energía no depende de llenar; New Light lleva esa idea al pop."],
    ["Guitarra latina","Integrar fraseo, riffs y fills con percusión sin competir.","Santana","Oye Como Va","Fraseo latino, sustain, pentatónica/dórico y percusión.","Maná","Oye Mi Amor","Riff, acompañamiento rock latino, fills y espacio.","Santana conversa melódicamente con la percusión; Maná lo convierte en riff y acompañamiento."],
    ["Neo-Soul → R&B moderno","Ampliar vocabulario armónico y voice leading.","Tom Misch","It Runs Through Me","Tríadas, séptimas, slides, ghost notes y funk/jazz.","Daniel Caesar ft. H.E.R.","Best Part","Maj7/m7, voice leading, dinámica y R&B.","Tom Misch mezcla funk y jazz; Best Part reduce el lenguaje a movimientos suaves."],
    ["Palm-Wine → Highlife","Entender patrones cíclicos que evolucionan hacia guitarras interconectadas.","S.E. Rogie","My Lovely Elizabeth","Fingerstyle, bajo + melodía y patrones cíclicos.","E.T. Mensah & His Tempos","All For You","Guitarra rítmica, sincopada e interconectada.","Palm-Wine presenta bajo y melodía; Highlife distribuye esa lógica en la banda."],
    ["Highlife → Makossa","Fortalecer groove repetitivo y conversación rítmica colectiva.","Osibisa","Sunshine Day","Highlife con funk, jazz, rock y figuras repetitivas.","Manu Dibango","Soul Makossa","Conversación entre guitarra, bajo y percusión.","Sunshine Day integra lenguajes; Soul Makossa revela el lugar exacto de la guitarra."],
    ["Afrobeat → Afrobeats moderno","Desarrollar disciplina repetitiva y comprender su reducción moderna.","Fela Kuti","Zombie","Interlocking guitars, Highlife, funk, jazz y disciplina.","Burna Boy","On The Low","Minimalismo, pocket y síncopa contemporáneos.","Zombie reúne las raíces; On The Low reduce la información y deja espacio a la voz."],
    ["Afrobeats / Afropop actual","Integrar síncopa, pocket, muting, melodía y minimalismo.","Wizkid","Joro","Línea limpia repetitiva, síncopa, espacio y pocket.","Rema","Calm Down","Muting, melodía, groove y producción moderna.","Joro consolida repetición y espacio; Calm Down reúne todo el recorrido."]
  ].map((s,index)=>({id:`stage-${index+1}`,title:s[0],objective:s[1],a:{artist:s[2],title:s[3],study:s[4]},b:{artist:s[5],title:s[6],study:s[7]},connection:s[8]}));

  function deep(value){return JSON.parse(JSON.stringify(value))}
  function makeId(prefix="project"){return`${prefix}-${Date.now()}-${Math.random().toString(36).slice(2,8)}`}
  function emit(name,detail){try{window.dispatchEvent(new CustomEvent(name,{detail}))}catch(_){}}
  function storageError(error,operation){emit("fortissimo:storage-error",{area:"study-paths",operation,error:String(error?.message||error||"Storage error")})}
  function safeGet(key){try{return localStorage.getItem(key)}catch(error){storageError(error,"read");return null}}
  function safeSet(key,value){try{localStorage.setItem(key,value);return true}catch(error){storageError(error,"write");return false}}

  function normalizeSong(song){
    return{
      artist:String(song?.artist||"").trim(),
      title:String(song?.title||"").trim(),
      study:String(song?.study||"").trim()
    };
  }
  function normalizeStage(stage,idFallback){
    return{
      id:String(stage?.id||idFallback||makeId("stage")),
      title:String(stage?.title||"").trim(),
      objective:String(stage?.objective||"").trim(),
      a:normalizeSong(stage?.a),
      b:normalizeSong(stage?.b),
      connection:String(stage?.connection||"").trim()
    };
  }
  function normalizeProject(item){
    const stages=Array.isArray(item?.stages)?item.stages.map(stage=>normalizeStage(stage)): [];
    return{
      ...item,
      id:String(item?.id||makeId()),
      name:String(item?.name||"Proyecto sin nombre").trim()||"Proyecto sin nombre",
      instrument:instruments.includes(item?.instrument)?item.instrument:(String(item?.instrument||"Otro").trim()||"Otro"),
      objective:String(item?.objective||"").trim(),
      knownSongs:String(item?.knownSongs||"").trim(),
      archived:!!item?.archived,
      createdAt:Number(item?.createdAt)||Date.now(),
      sourceId:item?.sourceId||null,
      stages
    };
  }
  function parseProjects(raw){
    if(!raw)return[];
    try{
      const value=JSON.parse(raw);
      return Array.isArray(value)?value.filter(Boolean).map(normalizeProject):[];
    }catch(error){
      storageError(error,"parse-projects");
      return[];
    }
  }
  function read(){
    const raw=safeGet(KEY);
    const projects=parseProjects(raw);
    if(raw){
      try{
        const original=JSON.parse(raw);
        const needsMigration=Array.isArray(original)&&original.some(item=>{
          if(!item||!Array.isArray(item.stages))return false;
          return item.stages.some(stage=>!stage?.id)||typeof item.knownSongs!=="string";
        });
        if(needsMigration)safeSet(KEY,JSON.stringify(projects));
      }catch(_){}
    }
    return projects;
  }

  function readHistory(){
    try{
      const value=JSON.parse(safeGet(HISTORY_KEY)||"[]");
      return Array.isArray(value)?value.filter(item=>item&&Array.isArray(item.projects)).slice(0,MAX_HISTORY):[];
    }catch(error){
      storageError(error,"parse-history");
      return[];
    }
  }
  function remember(reason){
    const current=read(),history=readHistory();
    const serialized=JSON.stringify(current);
    if(history[0]&&JSON.stringify(history[0].projects)===serialized)return true;
    history.unshift({at:Date.now(),reason:String(reason||"Último cambio"),projects:deep(current)});
    return safeSet(HISTORY_KEY,JSON.stringify(history.slice(0,MAX_HISTORY)));
  }
  function write(projects,options={}){
    const normalized=Array.isArray(projects)?projects.map(normalizeProject):[];
    if(options.backup!==false&&!remember(options.reason))return null;
    if(!safeSet(KEY,JSON.stringify(normalized)))return null;
    emit("fortissimo:projects",{reason:options.reason||"update",projects:deep(normalized)});
    return normalized;
  }
  function canUndo(){return readHistory().length>0}
  function undoLabel(){return readHistory()[0]?.reason||"Último cambio"}
  function undo(){
    const history=readHistory(),snapshot=history.shift();
    if(!snapshot)return false;
    if(!safeSet(KEY,JSON.stringify(snapshot.projects)))return false;
    safeSet(HISTORY_KEY,JSON.stringify(history));
    emit("fortissimo:projects",{reason:"restore",restored:true,projects:deep(snapshot.projects)});
    return true;
  }
  function clearHistory(){safeSet(HISTORY_KEY,"[]");emit("fortissimo:projects-history",{cleared:true})}

  function create(data){
    const projects=read();
    const project=normalizeProject({
      id:makeId(),
      name:String(data?.name||"").trim(),
      instrument:data?.instrument,
      objective:String(data?.objective||"").trim(),
      knownSongs:String(data?.knownSongs||"").trim(),
      archived:false,
      createdAt:Date.now(),
      sourceId:data?.sourceId||null,
      stages:Array.isArray(data?.stages)?data.stages:[]
    });
    projects.unshift(project);
    return write(projects,{reason:"Crear proyecto"})?project:null;
  }
  function update(id,data){
    const projects=read(),project=projects.find(item=>item.id===id);
    if(!project)return null;
    project.name=String(data?.name||"").trim()||project.name;
    project.instrument=instruments.includes(data?.instrument)?data.instrument:project.instrument;
    project.objective=String(data?.objective||"").trim();
    if(typeof data?.knownSongs==="string")project.knownSongs=data.knownSongs.trim();
    return write(projects,{reason:"Editar proyecto"})?project:null;
  }
  function duplicate(id){
    const source=id==="road-to-afrobeats"
      ?{name:"Road to Afrobeats",instrument:"Guitarra eléctrica",objective:"Construir repertorio desde las raíces del blues y el funk hasta el Afropop actual.",knownSongs:"",stages:roadStages}
      :read().find(item=>item.id===id);
    if(!source)return null;
    return create({name:`${source.name} · Copia`,instrument:source.instrument,objective:source.objective,knownSongs:source.knownSongs||"",sourceId:id,stages:source.stages});
  }
  function archive(id,value=true){
    const projects=read(),project=projects.find(item=>item.id===id);
    if(!project)return null;
    project.archived=!!value;
    return write(projects,{reason:value?"Archivar proyecto":"Restaurar proyecto"})?project:null;
  }
  function get(id){return read().find(item=>item.id===id)||null}

  function saveStage(projectId,data,stageId=null){
    const projects=read(),project=projects.find(item=>item.id===projectId);
    if(!project)return null;
    const stage=normalizeStage({
      id:stageId||makeId("stage"),
      title:String(data?.title||"").trim(),
      objective:String(data?.objective||"").trim(),
      a:{artist:String(data?.aArtist||"").trim(),title:String(data?.aTitle||"").trim(),study:String(data?.aStudy||"").trim()},
      b:{artist:String(data?.bArtist||"").trim(),title:String(data?.bTitle||"").trim(),study:String(data?.bStudy||"").trim()},
      connection:String(data?.connection||"").trim()
    });
    const index=project.stages.findIndex(item=>item.id===stageId);
    const reason=index>=0?"Editar etapa":"Agregar etapa";
    if(index>=0)project.stages[index]=stage;else project.stages.push(stage);
    return write(projects,{reason})?stage:null;
  }
  function replaceStages(projectId,stages,knownSongs){
    const projects=read(),project=projects.find(item=>item.id===projectId);
    if(!project||!Array.isArray(stages))return null;
    project.stages=stages.map((stage,index)=>normalizeStage(stage,project.stages[index]?.id||makeId("stage")));
    if(typeof knownSongs==="string")project.knownSongs=knownSongs.trim();
    project.adaptedAt=Date.now();
    return write(projects,{reason:"Adaptar ruta con IA"})?project:null;
  }
  function removeStage(projectId,stageId){
    const projects=read(),project=projects.find(item=>item.id===projectId);
    if(!project)return null;
    const before=project.stages.length;
    project.stages=project.stages.filter(item=>item.id!==stageId);
    if(project.stages.length===before)return project;
    return write(projects,{reason:"Eliminar etapa"})?project:null;
  }
  function moveStage(projectId,from,to){
    const projects=read(),project=projects.find(item=>item.id===projectId);
    if(!project||from===to||from<0||to<0||from>=project.stages.length||to>=project.stages.length)return project||null;
    const [stage]=project.stages.splice(from,1);
    project.stages.splice(to,0,stage);
    return write(projects,{reason:"Reordenar etapas"})?project:null;
  }

  function loadPolish(){
    if(!document.querySelector('link[data-study-polish="v1"]')){
      const link=document.createElement("link");
      link.rel="stylesheet";link.href="assets/study-paths-polish-v1.css?v=phase10";link.dataset.studyPolish="v1";
      document.head.appendChild(link);
    }
    if(!document.querySelector('script[data-study-polish="v1"]')){
      const script=document.createElement("script");
      script.src="assets/study-paths-polish-v1.js?v=phase10";script.dataset.studyPolish="v1";script.defer=true;
      document.head.appendChild(script);
    }
  }
  loadPolish();

  window.FortissimoProjects={
    instruments,roadStages,read,create,update,duplicate,archive,get,saveStage,replaceStages,removeStage,moveStage,
    canUndo,undo,undoLabel,clearHistory
  };
})();
