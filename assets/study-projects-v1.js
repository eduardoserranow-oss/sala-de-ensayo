(function(){
  const KEY="fortissimo.studyPaths.projects.v1";
  const instruments=["Guitarra eléctrica","Bajo eléctrico","Guitarra acústica","Voz","Piano / Keys","Otro"];
  function read(){try{const value=JSON.parse(localStorage.getItem(KEY));return Array.isArray(value)?value:[]}catch(error){return[]}}
  function write(projects){localStorage.setItem(KEY,JSON.stringify(projects));window.dispatchEvent(new CustomEvent("fortissimo:projects"));return projects}
  function makeId(){return`project-${Date.now()}-${Math.random().toString(36).slice(2,7)}`}
  function create(data){const projects=read();const project={id:makeId(),name:data.name.trim(),instrument:data.instrument,objective:data.objective.trim(),archived:false,createdAt:Date.now(),sourceId:data.sourceId||null};projects.unshift(project);write(projects);return project}
  function update(id,data){const projects=read(),project=projects.find(item=>item.id===id);if(!project)return null;project.name=data.name.trim();project.instrument=data.instrument;project.objective=data.objective.trim();write(projects);return project}
  function duplicate(id){const source=id==="road-to-afrobeats"?{name:"Road to Afrobeats",instrument:"Guitarra eléctrica",objective:"Construir repertorio desde las raíces del blues y el funk hasta el Afropop actual."}:read().find(item=>item.id===id);if(!source)return null;return create({name:`${source.name} · Copia`,instrument:source.instrument,objective:source.objective,sourceId:id})}
  function archive(id,value=true){const projects=read(),project=projects.find(item=>item.id===id);if(!project)return null;project.archived=value;write(projects);return project}
  function get(id){return read().find(item=>item.id===id)||null}
  window.FortissimoProjects={instruments,read,create,update,duplicate,archive,get};
})();
