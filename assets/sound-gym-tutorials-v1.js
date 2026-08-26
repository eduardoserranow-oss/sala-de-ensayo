(function(){
  "use strict";

  const STORAGE_KEY="fortissimo.soundGym.tutorials.v1";
  const TITLE_TO_GAME={
    "brighter or darker?":"brighter-darker",
    "louder or quieter?":"louder-quieter",
    "bass / mid / treble":"bass-mid-treble",
    "left / center / right":"left-center-right",
    "clean or distorted?":"clean-distorted",
    "more or less compressed?":"more-less-compressed",
    "frequency regions":"frequency-regions",
    "compression basics":"compression-basics",
    "eq match":"eq-match",
    "frequency hunt":"frequency-hunt",
    "balance memory":"balance-memory",
    "compression match":"compression-match",
    "low end hunt":"low-end-hunt",
    "compression a/b":"compression-ab"
  };

  const TUTORIALS={
    "brighter-darker":{
      title:"Brighter or Darker?",
      subtitle:"Aprende a oír el brillo sin confundirlo con volumen.",
      steps:[
        step("Tu misión","Escucharás dos versiones del mismo sonido. Una tendrá más energía arriba. Tu trabajo es decidir cuál suena más <b>brillante</b>.",null,"Piensa en brillo, aire y detalle; no en cuál suena más fuerte."),
        step("¿Qué significa brighter?","Brighter quiere decir <b>más contenido agudo</b>. Suele hacer que platos, consonantes, pick de guitarra y aire se sientan más presentes."),
        step("¿Qué significa darker?","Darker quiere decir <b>menos agudos</b> o un balance más inclinado hacia graves/medios. Puede sentirse más opaco, suave o cerrado."),
        step("No te dejes engañar por el volumen","Más brillante <b>no significa necesariamente más fuerte</b>. Intenta ignorar el loudness y escucha el color del sonido."),
        step("Cómo responder","Compara A y B varias veces si lo necesitas. Elige cuando estés seguro y usa el feedback para aprender qué detalle se te escapó.",null,"Primero color; después decisión.")
      ]
    },
    "louder-quieter":{
      title:"Louder or Quieter?",
      subtitle:"Entrena diferencias de nivel, desde grandes hasta muy pequeñas.",
      steps:[
        step("Tu misión","Escucharás dos versiones iguales en tono, pero con diferente <b>nivel</b>. Decide cuál está más fuerte o más bajita."),
        step("Louder","Louder = <b>más nivel</b>. Imagina que subiste un fader."),
        step("Quieter","Quieter = <b>menos nivel</b>. Imagina que bajaste un fader."),
        step("No confundas tono con volumen","Un sonido con más agudos puede parecer más presente. Aquí concéntrate solamente en <b>cuánto</b> sonido llega, no en su color."),
        step("La meta real","Con práctica podrás notar cambios pequeños de dB, que es justo lo que haces al balancear una mezcla.")
      ]
    },
    "bass-mid-treble":{
      title:"Bass / Mid / Treble",
      subtitle:"Divide el espectro en tres zonas fáciles de reconocer.",
      steps:[
        step("Tu misión","El juego cambia una parte del espectro. Debes decir si el cambio está en <b>Bass, Mid o Treble</b>."),
        step("Bass = peso","Bass es la parte grave: sub, kick, cuerpo del bajo, sensación de peso. Si lo sientes más que lo oyes, probablemente estás abajo."),
        step("Mid = cuerpo y voz","Mid es donde vive muchísimo de la música: voz, guitarras, cajas, cuerpo de instrumentos y definición principal."),
        step("Treble = brillo","Treble es la parte alta: aire, platos, sibilancia, ataque y brillo."),
        step("No memorices palabras: escucha sensaciones","Peso = abajo. Cuerpo = medio. Brillo = arriba. Esa asociación simple te servirá después cuando trabajemos frecuencias exactas.")
      ]
    },
    "left-center-right":{
      title:"Left / Center / Right",
      subtitle:"Encuentra exactamente dónde está una fuente dentro del estéreo.",
      steps:[
        step("Tu misión","La fuente aparece escondida en algún punto entre izquierda y derecha. No son solo tres botones: puedes elegir <b>cualquier posición</b> del panorama."),
        step("Escucha primero","Pulsa Escuchar fuente y usa audífonos o monitores bien colocados. El audio está paneado de verdad.","[data-lcr-play]","Si cierras un oído, pierdes la comparación entre L y R.",true),
        step("El campo estéreo","LEFT está a un extremo, CENTER en el medio y RIGHT al otro. El centro es tu regla de referencia.","[data-lcr-track]"),
        step("Arrastra tu respuesta","Pon el dedo o mouse donde creas que está la fuente y arrastra. Al soltar, esa será tu respuesta.","[data-lcr-track]","Cerca del centro, pequeños errores son más difíciles de oír.",true),
        step("Yours vs Target","Después de responder verás tu posición, la posición real y la zona de tolerancia. El objetivo es ir cerrando esa distancia con cada ronda.","[data-lcr-track]"),
        step("Qué estás aprendiendo","Esto se traduce directamente a colocar guitarras, coros, percusiones, doubles y otros elementos dentro de una mezcla.")
      ]
    },
    "clean-distorted":{
      title:"Clean or Distorted?",
      subtitle:"Reconoce cuándo una señal tiene saturación o distorsión.",
      steps:[
        step("Tu misión","Una versión está limpia y otra tiene distorsión. Debes reconocer cuál fue procesada."),
        step("Clean","Clean conserva la forma de la señal con menos armónicos añadidos. Suele sentirse más abierta o natural."),
        step("Distorted","Distorted añade armónicos y cambia la forma de onda. Puede sentirse más áspera, densa, agresiva o brillante."),
        step("Distorsión no significa necesariamente horrible","Saturación suave también es distorsión. Puede sonar cálida y agradable. Escucha textura, no solo ruido."),
        step("No uses solo el volumen","La distorsión puede hacer parecer una señal más fuerte. Busca la <b>textura nueva</b>, especialmente en transientes y frecuencias altas.")
      ]
    },
    "more-less-compressed":{
      title:"More or Less Compressed?",
      subtitle:"Escucha la dinámica antes de aprender los knobs.",
      steps:[
        step("Tu misión","Dos versiones tienen distinta cantidad de compresión. Decide cuál está <b>más comprimida</b>."),
        step("¿Qué hace un compresor?","Piensa en una mano automática que baja los picos cuando sobresalen demasiado. Reduce la diferencia entre lo fuerte y lo suave."),
        step("Más comprimido","Suele tener picos más controlados, menos contraste y una sensación más densa o sostenida."),
        step("Menos comprimido","Suele dejar más dinámica y más diferencia entre el golpe inicial y lo que viene después."),
        step("Escucha el golpe y la cola","En drums, compara transient y sustain. Esa relación te prepara para entender Attack y Release en los juegos avanzados.")
      ]
    },
    "frequency-regions":{
      title:"Frequency Regions",
      subtitle:"Aprende el mapa del espectro antes de buscar frecuencias exactas.",
      steps:[
        step("Tu misión","Debes identificar en qué <b>zona</b> ocurrió el cambio. Aquí no buscamos todavía un número exacto en Hz."),
        step("Sub y Bass","Sub = profundidad y sensación física. Bass = peso y fundamentales graves de kick/bajo."),
        step("Low Mid y Mid","Low Mid da cuerpo pero también puede acumular barro. Mid contiene gran parte de voz, guitarras y definición musical."),
        step("Upper Mid","Upper Mid aporta presencia, ataque e inteligibilidad. Demasiado puede sentirse agresivo."),
        step("High y Air","High aporta brillo y detalle. Air es la sensación muy alta de apertura y aire."),
        step("La regla fácil","No memorices primero números: aprende <b>profundidad → peso → cuerpo → presencia → brillo → aire</b>. Después ponemos Hz.")
      ]
    },
    "compression-basics":{
      title:"Compression Basics",
      subtitle:"Entiende transient, sustain y velocidad del compresor.",
      steps:[
        step("Primero: transient","Transient es el golpe inicial. En una caja es el crack; en un kick es el click/punch del comienzo."),
        step("Después: sustain","Sustain es lo que queda después del golpe: cuerpo, cola, room y resonancia."),
        step("Fast Attack","Attack rápido hace que el compresor agarre el golpe muy pronto. Resultado típico: menos transient y más sensación de control."),
        step("Slow Attack","Attack lento deja pasar una parte del golpe antes de comprimir. Resultado típico: más punch."),
        step("Release","Release decide cuánto tarda el compresor en dejar de reducir. Rápido = vuelve pronto; lento = permanece trabajando."),
        step("Qué debes llevarte","Attack cambia el inicio. Release cambia la recuperación. Esa idea simple será la base de Compression Match.")
      ]
    },
    "eq-match":{
      title:"EQ Match",
      subtitle:"Escucha una EQ y reconstruye la misma forma con tus controles.",
      steps:[
        step("Tu misión","Reference es la EQ correcta escondida. Yours es tu propia EQ. Debes hacer que ambas suenen lo más parecidas posible."),
        step("Horizontal = frecuencia","Moverte a izquierda significa frecuencias más graves. Moverte a derecha significa frecuencias más agudas.",".sg-eqm-graph, [data-eqm-graph], canvas"),
        step("Vertical = boost o cut","Subir un punto aumenta esa zona. Bajarlo la reduce. Piensa: <b>¿qué parte sobra o falta?</b>",".sg-eqm-graph, [data-eqm-graph], canvas",null,true),
        step("Bell, shelf y forma","Una campana afecta una zona alrededor de una frecuencia. Un shelf levanta o baja todo lo que queda hacia un extremo."),
        step("Reference / Yours","Cambia entre ambos sin perseguir números. Primero escucha si falta peso, cuerpo, presencia o brillo; luego afina la frecuencia."),
        step("Confirmar y aprender","Al confirmar verás tu curva junto al target. No mires solo si ganaste: observa <b>dónde</b> te equivocaste.")
      ]
    },
    "frequency-hunt":{
      title:"Frequency Hunt",
      subtitle:"Encuentra la frecuencia exacta donde ocurrió un cambio.",
      steps:[
        step("Tu misión","Hay una frecuencia escondida que fue modificada. Debes encontrarla moviendo tu selector por el espectro."),
        step("Compara procesado y original","Alterna las dos versiones. Pregúntate: ¿en qué zona aparece el cambio? Primero encuentra la región, luego afina."),
        step("La escala es logarítmica","50→100 Hz es una octava, igual que 100→200. Por eso el gráfico no se comporta como una regla lineal normal."),
        step("Arrastra el selector","Mueve tu respuesta hasta que el punto coincida con lo que escuchas. No persigas el número: persigue la sensación.","[data-fh-spectrum], .sg-fhpro-spectrum, [role='slider']",null,true),
        step("Perfect vs cerca","El juego premia la distancia real. Estar a pocos cents es mejor que acertar solo la región."),
        step("Qué entrenas","Con práctica empezarás a pensar: ‘eso está cerca de 2.5 kHz’ en vez de solo ‘suena medio-agudo’.")
      ]
    },
    "balance-memory":{
      title:"Balance Memory",
      subtitle:"Memoriza una mezcla y reconstruye la relación entre sus stems.",
      steps:[
        step("Tu misión","Primero oyes la mezcla correcta. Memoriza quién está adelante y quién está atrás. Luego el juego <b>desordena los niveles</b> y tú reconstruyes el balance."),
        step("Listen & memorize","Durante esta parte no mezcles. Solo escucha la jerarquía: voz, drums, bass y music.","[data-bm-memory]"),
        step("Start mixing","Al entrar al mixer los gains cambian de forma deliberada. Si suena mal, es correcto: ahora empieza el reto.","[data-bm-start]"),
        step("Los faders","Cada fader controla el nivel real de un stem en dB. 0 dB es unity; bajar un fader reduce ese elemento.","[data-bm-mixer]",null,true),
        step("No busques un volumen master","El juego evalúa principalmente las <b>relaciones</b>. Si todos están 3 dB más bajos pero conservas la misma jerarquía, estás mucho más cerca que una mezcla con relaciones incorrectas."),
        step("Confirm y reveal","Al confirmar se detiene el audio, se evalúa y aparece el target. Mira qué stem te costó más y corrige esa percepción en la próxima ronda.","[data-bm-confirm]")
      ]
    },
    "compression-match":{
      title:"Compression Match",
      subtitle:"Aprende qué hace cada control de un compresor, sin memorizar palabras raras.",
      steps:[
        step("La idea más simple","Un compresor es como una <b>mano automática</b>: cuando el sonido sobresale demasiado, esa mano lo controla. Aquí copiarás la forma en que esa mano se mueve."),
        step("Compressed vs Yours","<b>Compressed</b> es la respuesta que debes copiar. <b>Yours</b> es tu compresor. Cambia entre ambos y compara transient, sustain y movimiento.","[data-cm-side]",null,true),
        step("Threshold: existe, pero está escondido","Threshold responde: <b>¿a partir de qué nivel empieza a trabajar?</b> En este juego está fijado internamente en −22 dB para que no tengas cinco problemas a la vez. Makeup NO reemplaza al Threshold."),
        step("Ratio = cuánto","Ratio decide <b>cuánto controla</b> una señal después de pasar el Threshold. 2:1 es suave; 12:1 es mucho más fuerte.",".sg-cm-param:nth-child(1)","Arrastra la columna. Escucha cómo cambia la cantidad de control.",true),
        step("Attack = cuándo entra","Attack decide <b>qué tan rápido</b> empieza a comprimir. Muy rápido captura el transient. Más lento deja pasar más golpe y punch.",".sg-cm-param:nth-child(2)","Prueba 1 ms y luego 100 ms sobre drums.",true),
        step("Release = cuándo suelta","Release decide <b>qué tan rápido deja de comprimir</b>. Rápido vuelve pronto a 0; lento mantiene la reducción entre golpes.",".sg-cm-param:nth-child(3)","Mira la aguja mientras cambias 40 ms ↔ 800 ms.",true),
        step("Makeup = recuperar nivel","Después de comprimir normalmente pierdes nivel. Makeup lo recupera <b>después</b> del compresor. Otros plugins pueden llamarlo Output, Output Gain o simplemente Gain.",".sg-cm-makeup",null,true),
        step("Gain Reduction VU","Este VU no mide volumen de salida. Mide <b>cuántos dB está quitando el compresor</b>. Si marca 6 dB, en ese instante está reduciendo aproximadamente 6 dB.",".sg-cm-gr"),
        step("Cómo leer Attack con el VU","Attack rápido: la aguja reacciona antes al golpe. Attack lento: pasa más transient antes de que la reducción aparezca. Oído + aguja = aprendizaje.",".sg-cm-gr"),
        step("Cómo leer Release con el VU","Release rápido: la aguja regresa pronto. Release lento: tarda en volver. Esa recuperación cambia el groove y puede crear pumping.",".sg-cm-gr"),
        step("No caigas en el truco del volumen","Más fuerte no significa más comprimido. Makeup puede hacer una señal comprimida más fuerte. Escucha <b>transient, sustain y movimiento</b>."),
        step("Ahora juega","Compara Compressed/Yours, ajusta Ratio, Attack, Release y Makeup, y confirma cuando el envelope se parezca. El reveal te dirá qué parámetro fue tu punto débil.","[data-cm-confirm]")
      ]
    },
    "low-end-hunt":{
      title:"Low End Hunt",
      subtitle:"Aprende a distinguir qué parte exacta del grave cambió.",
      steps:[
        step("Tu misión","Hay un boost escondido entre <b>50 y 400 Hz</b>. Debes encontrar exactamente dónde está."),
        step("EQ OFF / EQ ON","OFF es la fuente original. ON añade el peak escondido. Alterna varias veces y escucha qué parte gana peso.","[data-leh-side]",null,true),
        step("50–80 Hz","Aquí vive mucho sub y profundidad. Se siente grande y profundo."),
        step("80–150 Hz","Aquí suele aparecer punch, peso de kick y fundamentales del bajo."),
        step("150–400 Hz","Aquí escuchas más cuerpo y low-mid. Si sobra, puede sentirse boxy o muddy."),
        step("Selector continuo","Arrastra por el gráfico. La escala es logarítmica y la zona aceptada se hace más estrecha según avanzas.","[data-leh-spectrum]",null,true),
        step("Reveal","Después de confirmar verás Yours y Target. Mira si tendías a escoger demasiado arriba o demasiado abajo: ese patrón te enseña cómo oye tu cerebro.")
      ]
    },
    "compression-ab":{
      title:"Compression A/B",
      subtitle:"Identifica cuál versión está más comprimida sin mirar parámetros.",
      steps:[
        step("Tu misión","Escucharás A y B. Una versión tiene más compresión. Debes reconocerla usando solo el oído."),
        step("Primero transient","Compara el golpe inicial. La versión más comprimida puede tener picos más controlados."),
        step("Después sustain","Escucha lo que queda detrás del golpe. Más compresión puede hacer que el cuerpo y room se sientan relativamente más presentes."),
        step("Escucha movimiento","Release puede hacer que una versión respire o bombee diferente. No todo es volumen."),
        step("No uses loudness como respuesta","Makeup/output puede igualar o incluso invertir el volumen percibido. Pregunta: <b>¿cuál tiene menos dinámica?</b>"),
        step("Decide y aprende","El feedback te dirá si reconociste la versión más controlada. Repite A/B si lo necesitas antes de responder.")
      ]
    }
  };

  function step(title,body,selector,tip,tryable){return{title,body,selector:selector||null,tip:tip||"",tryable:!!tryable};}

  let overlay=null,spotlight=null,panel=null,resumeChip=null,current=null,currentTrainer=null,index=0,tryMode=false;

  function readState(){try{const v=JSON.parse(localStorage.getItem(STORAGE_KEY)||"{}");return v&&typeof v==="object"?v:{};}catch(_){return{};}}
  function writeState(value){try{localStorage.setItem(STORAGE_KEY,JSON.stringify(value));}catch(_){ }}
  function markPrompted(gameId){const s=readState();s[gameId]=Object.assign({},s[gameId],{prompted:true});writeState(s);}
  function hasPrompted(gameId){return !!readState()?.[gameId]?.prompted;}

  function normalizeTitle(value){return String(value||"").trim().toLowerCase().replace(/\s+/g," ");}
  function detectGame(trainer){
    const title=normalizeTitle(trainer.querySelector("h2")?.textContent);
    if(TITLE_TO_GAME[title]) return TITLE_TO_GAME[title];
    for(const [gameId,config] of Object.entries(TUTORIALS)){
      if(normalizeTitle(config.title)===title) return gameId;
    }
    return "";
  }

  function ensureHelpButton(trainer,gameId){
    if(!TUTORIALS[gameId]||trainer.querySelector("[data-sg-tutorial-help]"))return;
    const head=trainer.querySelector(".sg-trainer-head")||trainer.firstElementChild;
    if(!head)return;
    const button=document.createElement("button");
    button.type="button";button.className="sg-tutorial-help";button.dataset.sgTutorialHelp=gameId;
    button.setAttribute("aria-label",`Abrir tutorial de ${TUTORIALS[gameId].title}`);
    button.innerHTML="<span>?</span><b>Tutorial</b>";
    button.addEventListener("click",event=>{event.preventDefault();event.stopPropagation();openTutorial(gameId,trainer,0);});
    head.appendChild(button);
  }

  function maybePrompt(trainer,gameId){
    if(!TUTORIALS[gameId]||hasPrompted(gameId))return;
    markPrompted(gameId);
    window.setTimeout(()=>{
      if(!trainer.classList.contains("show")||document.querySelector(".sg-tutorial-welcome"))return;
      const config=TUTORIALS[gameId];
      const host=document.createElement("div");host.className="sg-tutorial-welcome";
      host.innerHTML=`<button class="sg-tutorial-welcome-x" type="button" aria-label="Cerrar">×</button><span class="sg-tutorial-mini-kicker">Primera vez aquí</span><strong>¿Quieres aprender ${escapeHtml(config.title)} primero?</strong><p>${escapeHtml(config.subtitle)}</p><div><button type="button" class="sg-tutorial-welcome-primary">Ver tutorial</button><button type="button" class="sg-tutorial-welcome-secondary">Ahora no</button></div><small>Solo aparece una vez. Siempre puedes volver desde <b>?</b> Tutorial.</small>`;
      trainer.appendChild(host);
      const close=()=>host.remove();
      host.querySelector(".sg-tutorial-welcome-x").addEventListener("click",close);
      host.querySelector(".sg-tutorial-welcome-secondary").addEventListener("click",close);
      host.querySelector(".sg-tutorial-welcome-primary").addEventListener("click",()=>{close();openTutorial(gameId,trainer,0);});
    },420);
  }

  function ensureOverlay(){
    if(overlay)return;
    overlay=document.createElement("div");overlay.className="sg-tutorial-overlay";overlay.hidden=true;
    overlay.innerHTML=`<div class="sg-tutorial-spotlight"></div><section class="sg-tutorial-panel" role="dialog" aria-modal="true" aria-live="polite"><header><div><span class="sg-tutorial-kicker">FORTISSIMO · Tutorial</span><strong data-sgt-game></strong></div><button type="button" data-sgt-close aria-label="Saltar tutorial">×</button></header><div class="sg-tutorial-progress"><span data-sgt-count></span><i><b data-sgt-progress></b></i></div><div class="sg-tutorial-copy"><h3 data-sgt-title></h3><p data-sgt-body></p><aside data-sgt-tip hidden></aside></div><footer><button type="button" class="sg-tutorial-skip" data-sgt-skip>Saltar</button><div><button type="button" class="sg-tutorial-prev" data-sgt-prev>Anterior</button><button type="button" class="sg-tutorial-try" data-sgt-try hidden>Probar esto</button><button type="button" class="sg-tutorial-next" data-sgt-next>Siguiente</button></div></footer></section>`;
    document.body.appendChild(overlay);
    spotlight=overlay.querySelector(".sg-tutorial-spotlight");panel=overlay.querySelector(".sg-tutorial-panel");
    overlay.querySelector("[data-sgt-close]").addEventListener("click",closeTutorial);
    overlay.querySelector("[data-sgt-skip]").addEventListener("click",closeTutorial);
    overlay.querySelector("[data-sgt-prev]").addEventListener("click",()=>go(index-1));
    overlay.querySelector("[data-sgt-next]").addEventListener("click",()=>{if(index>=current.steps.length-1)closeTutorial();else go(index+1);});
    overlay.querySelector("[data-sgt-try]").addEventListener("click",enterTryMode);
    window.addEventListener("resize",positionSpotlight,{passive:true});
    window.addEventListener("scroll",positionSpotlight,{passive:true,capture:true});
    document.addEventListener("keydown",event=>{
      if(overlay.hidden||tryMode)return;
      if(event.key==="Escape")closeTutorial();
      if(event.key==="ArrowRight"){event.preventDefault();overlay.querySelector("[data-sgt-next]").click();}
      if(event.key==="ArrowLeft"){event.preventDefault();overlay.querySelector("[data-sgt-prev]").click();}
    });
  }

  function openTutorial(gameId,trainer,startIndex){
    const config=TUTORIALS[gameId];if(!config)return;
    ensureOverlay();current=config;current.gameId=gameId;currentTrainer=trainer||findTrainer(gameId);index=Math.max(0,Math.min(config.steps.length-1,startIndex||0));tryMode=false;
    overlay.hidden=false;document.documentElement.classList.add("sg-tutorial-open");
    go(index);
  }

  function closeTutorial(){
    if(!overlay)return;overlay.hidden=true;document.documentElement.classList.remove("sg-tutorial-open");clearFocus();exitTryMode(false);current=null;currentTrainer=null;
  }

  function findTrainer(gameId){
    const config=TUTORIALS[gameId];if(!config)return null;
    return Array.from(document.querySelectorAll(".sg-trainer")).find(t=>detectGame(t)===gameId)||null;
  }

  function resolveTarget(selector){
    if(!currentTrainer)return null;
    if(selector){
      try{const t=currentTrainer.querySelector(selector);if(t)return t;}catch(_){ }
    }
    return currentTrainer.querySelector(".sg-trainer-head")||currentTrainer;
  }

  function clearFocus(){
    document.querySelectorAll(".sg-tutorial-target").forEach(n=>n.classList.remove("sg-tutorial-target"));
    if(spotlight)spotlight.classList.remove("show");
  }

  function positionSpotlight(){
    if(!current||overlay?.hidden||tryMode)return;
    const target=resolveTarget(current.steps[index]?.selector);if(!target)return;
    const r=target.getBoundingClientRect();
    const pad=8,left=Math.max(6,r.left-pad),top=Math.max(6,r.top-pad),right=Math.min(innerWidth-6,r.right+pad),bottom=Math.min(innerHeight-6,r.bottom+pad);
    spotlight.style.left=`${left}px`;spotlight.style.top=`${top}px`;spotlight.style.width=`${Math.max(20,right-left)}px`;spotlight.style.height=`${Math.max(20,bottom-top)}px`;spotlight.classList.add("show");
  }

  function focusStep(stepData){
    clearFocus();const target=resolveTarget(stepData.selector);if(target){target.classList.add("sg-tutorial-target");requestAnimationFrame(positionSpotlight);}
  }

  function go(nextIndex){
    if(!current)return;exitTryMode(false);index=Math.max(0,Math.min(current.steps.length-1,nextIndex));const s=current.steps[index];
    panel.querySelector("[data-sgt-game]").textContent=current.title;
    panel.querySelector("[data-sgt-count]").textContent=`${index+1} / ${current.steps.length}`;
    panel.querySelector("[data-sgt-progress]").style.width=`${((index+1)/current.steps.length)*100}%`;
    panel.querySelector("[data-sgt-title]").textContent=s.title;
    panel.querySelector("[data-sgt-body]").innerHTML=s.body;
    const tip=panel.querySelector("[data-sgt-tip]");tip.hidden=!s.tip;tip.innerHTML=s.tip?`<b>Escucha esto:</b> ${s.tip}`:"";
    panel.querySelector("[data-sgt-prev]").disabled=index===0;
    const next=panel.querySelector("[data-sgt-next]");next.textContent=index===current.steps.length-1?"Entendido":"Siguiente";
    panel.querySelector("[data-sgt-try]").hidden=!s.tryable;
    focusStep(s);
  }

  function enterTryMode(){
    if(!current||tryMode)return;tryMode=true;overlay.classList.add("is-trying");clearFocus();
    resumeChip=document.createElement("button");resumeChip.type="button";resumeChip.className="sg-tutorial-resume";resumeChip.innerHTML="← Volver al tutorial";
    resumeChip.addEventListener("click",()=>exitTryMode(true));document.body.appendChild(resumeChip);
  }
  function exitTryMode(render){
    if(!tryMode&&!resumeChip)return;tryMode=false;overlay?.classList.remove("is-trying");resumeChip?.remove();resumeChip=null;if(render&&current)go(index);
  }

  function escapeHtml(value){return String(value??"").replace(/[&<>'\"]/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[ch]));}

  function scan(){
    document.querySelectorAll(".sg-trainer").forEach(trainer=>{
      const gameId=detectGame(trainer);if(!gameId)return;ensureHelpButton(trainer,gameId);
      if(trainer.classList.contains("show"))maybePrompt(trainer,gameId);
    });
  }

  const observer=new MutationObserver(records=>{
    let needsScan=false;
    for(const record of records){
      if(record.type==="childList"&&record.addedNodes.length)needsScan=true;
      if(record.type==="attributes"&&record.target instanceof Element&&record.target.classList.contains("sg-trainer"))needsScan=true;
    }
    if(needsScan)scan();
  });
  observer.observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:["class"]});
  document.addEventListener("DOMContentLoaded",scan,{once:true});
  if(document.readyState!=="loading")scan();

  window.SoundGymTutorials={
    open(gameId){const trainer=findTrainer(gameId);if(trainer)openTutorial(gameId,trainer,0);},
    reset(gameId){const s=readState();if(gameId)delete s[gameId];else Object.keys(s).forEach(k=>delete s[k]);writeState(s);},
    registry:TUTORIALS
  };
})();
