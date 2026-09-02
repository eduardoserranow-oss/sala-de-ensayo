// FORTISSIMO Vibe Roulette — Emotional Engine v4
// Expanded wheel-derived musical vocabulary + contextual evidence guards.
const n=(s='')=>String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9ñ\s'-]/g,' ').replace(/\s+/g,' ').trim();
const has=(t,terms=[])=>terms.reduce((s,x)=>s+(t.includes(n(x))?1:0),0);
const E=(id,label,family,territory,terms,effects,evidence=[])=>({id,label,family,territory,terms,effects,evidence});
export const EMOTIONAL_DICTIONARY={
 joy:E('joy','Alegría','light','illusion',['alegria','feliz','felicidad','sonrie','sonrisa','reir','se rien','disfruta','disfrutan'],{valence:.95,brightness:.9,tension:-.2,movement:.35}),
 hope:E('hope','Esperanza','light','illusion',['esperanza','ojala','puede pasar','posibilidad'],{valence:.8,brightness:.7,resolution:.35}),
 enthusiasm:E('enthusiasm','Entusiasmo','light','illusion',['entusiasmo','emocionado','emocionada','ganas de'],{valence:.85,arousal:.8,movement:.75}),
 euphoria:E('euphoria','Euforia','light','illusion',['euforia','euforico','extasis'],{valence:.95,arousal:1,movement:.95}),
 optimism:E('optimism','Optimismo','light','illusion',['optimismo','optimista','algo bueno','va a estar bien'],{valence:.85,brightness:.85,certainty:.6}),
 curiosity:E('curiosity','Curiosidad','light','illusion',['curiosidad','curioso','curiosa','quiero saber','descubrir','conociendo','apenas se conocen'],{valence:.45,arousal:.45,resolution:.15}),
 inspiration:E('inspiration','Inspiración','light','illusion',['inspiracion','inspira','inspirado','inspirada'],{valence:.75,brightness:.75}),
 creativity:E('creativity','Creatividad','light','illusion',['creatividad','crear','imaginacion'],{valence:.55,brightness:.65}),
 illusion:E('illusion','Ilusión','light','illusion',['ilusion','ilusionado','ilusionada','por primera vez','empieza a ocupar un lugar','todo se sienta diferente'],{valence:.82,brightness:.78,resolution:.18}),
 fascination:E('fascination','Fascinación','light','illusion',['fascina','fascinacion','no puede dejar de pensar','no paro de pensar'],{valence:.72,arousal:.58,intimacy:.35}),
 interest:E('interest','Interés','light','illusion',['interes','interesado','interesada','conocerla','conocerlo','hablan durante horas'],{valence:.55,arousal:.4}),
 expectation:E('expectation','Expectación','light','illusion',['expectacion','que pasara','que puede pasar','lo que viene'],{valence:.45,tension:.12,resolution:.08}),
 calm:E('calm','Calma','calm','calm',['calma','sin prisa','despacio'],{valence:.45,arousal:-.55,tension:-.7,stability:.8}),
 security:E('security','Seguridad','calm','calm',['seguridad','seguro','segura','lugar seguro'],{certainty:.9,stability:.9,tension:-.7}),
 trust:E('trust','Confianza','calm','connection',['confianza','bajan la guardia','bajar la guardia','se abre','se abren'],{certainty:.75,stability:.7,intimacy:.55}),
 gratitude:E('gratitude','Agradecimiento','calm','connection',['agradecido','agradecida','gracias','valoro'],{valence:.75,stability:.65}),
 fulfillment:E('fulfillment','Plenitud','calm','calm',['plenitud','pleno','plena','completo','completa'],{valence:.8,stability:.9,resolution:.85}),
 acceptance:E('acceptance','Aceptación','calm','calm',['acepto','aceptar','aceptacion'],{valence:.35,stability:.85,resolution:.8}),
 serenity:E('serenity','Serenidad','calm','calm',['serenidad','sereno','serena','en paz'],{arousal:-.7,tension:-.85,stability:.95}),
 peace:E('peace','Paz','calm','calm',['paz','en paz'],{arousal:-.65,tension:-.85,stability:.9}),
 tranquility:E('tranquility','Tranquilidad','calm','calm',['tranquilidad','tranquilo','tranquila'],{arousal:-.6,tension:-.8}),
 satisfaction:E('satisfaction','Satisfacción','calm','calm',['satisfaccion','satisfecho','satisfecha'],{valence:.7,resolution:.75}),
 sensuality:E('sensuality','Sensualidad','bond','desire',['sensual','piel','roza','rozar','labios'],{valence:.55,arousal:.5,intimacy:.75,tension:.25}),
 desire:E('desire','Deseo','bond','desire',['deseo','atraccion','quiero besarte','ganas de verte','me atrae'],{valence:.55,arousal:.7,intimacy:.65,tension:.35}),
 intimacy:E('intimacy','Intimidad','bond','connection',['intimidad','cercania','cerca','toma la mano','tomar la mano','recuerda cada momento','hombro'],{valence:.7,intimacy:.95,stability:.5}),
 tenderness:E('tenderness','Ternura','bond','connection',['ternura','carino','cariño','abrazo','le acomoda la camisa','acomoda la camisa','toma la mano','se recuesta en su hombro'],{valence:.82,intimacy:.9,tension:-.35}),
 love:E('love','Amor','bond','connection',['amor','te amo','enamorado','enamorada'],{valence:.85,intimacy:.95}),
 connection:E('connection','Conexión','bond','connection',['conexion','conectan','conectando','lugar dentro de el','lugar dentro de ella'],{valence:.72,intimacy:.85}),
 attraction:E('attraction','Atracción','bond','desire',['atraccion','me atrae','quimica'],{valence:.55,arousal:.6,intimacy:.55}),
 sadness:E('sadness','Tristeza','pain','nostalgia',['triste','tristeza','llora','llorar','dolor emocional','corazon roto'],{valence:-.85,tension:.35},['loss']),
 melancholy:E('melancholy','Melancolía','pain','nostalgia',['melancolia','melancolico','melancolica','nostalgia','anorar','añorar'],{valence:-.65,nostalgia:.9},['loss']),
 vulnerability:E('vulnerability','Vulnerabilidad','pain','introspection',['vulnerable','fragil','fragilidad','miedo de decir'],{valence:-.2,intimacy:.65,tension:.35}),
 abandonment:E('abandonment','Abandono','pain','nostalgia',['abandono','me dejaste','te fuiste','me reemplazaste'],{valence:-.9,tension:.7},['loss']),
 grief:E('grief','Pena','pain','nostalgia',['pena','duelo','perdida','despedida','fallecio','ya no esta'],{valence:-.95,tension:.55},['loss']),
 disappointment:E('disappointment','Decepción','pain','nostalgia',['decepcion','me fallaste','no era lo que creia'],{valence:-.7,tension:.45},['rupture']),
 loneliness:E('loneliness','Soledad','pain','nostalgia',['soledad','me siento solo','me siento sola'],{valence:-.75,intimacy:-.65},['loss']),
 longing:E('longing','Añoranza','pain','nostalgia',['anoro','añoro','extrano','extraño','hace falta'],{valence:-.45,nostalgia:.95},['loss']),
 anxiety:E('anxiety','Ansiedad','uncertainty','introspection',['ansiedad','ansioso','ansiosa','angustia'],{valence:-.55,arousal:.8,tension:.85}),
 insecurity:E('insecurity','Inseguridad','uncertainty','introspection',['inseguridad','inseguro','insegura','no soy suficiente'],{valence:-.45,tension:.7,certainty:-.7}),
 confusion:E('confusion','Confusión','uncertainty','introspection',['confusion','confundido','confundida','no entiendo','no se que siento'],{certainty:-.9,tension:.45}),
 worry:E('worry','Preocupación','uncertainty','introspection',['preocupacion','preocupado','preocupada','me preocupa'],{valence:-.4,tension:.65}),
 fear:E('fear','Miedo','uncertainty','introspection',['miedo','temor','asustado','asustada'],{valence:-.65,arousal:.65,tension:.85}),
 doubt:E('doubt','Duda','uncertainty','introspection',['duda','dudo','no se si'],{certainty:-.8,tension:.4}),
 distrust:E('distrust','Desconfianza','uncertainty','introspection',['desconfianza','no confio','sospecha'],{certainty:-.8,tension:.6}),
 frustration:E('frustration','Frustración','tension','introspection',['frustracion','frustrado','frustrada','impotencia'],{valence:-.55,tension:.8}),
 resentment:E('resentment','Resentimiento','tension','nostalgia',['resentimiento','rencor','no te perdono'],{valence:-.7,tension:.85}),
 jealousy:E('jealousy','Celos','tension','desire',['celos','celoso','celosa'],{valence:-.45,tension:.8,intimacy:.35}),
 irritation:E('irritation','Irritación','tension','introspection',['irritacion','irritado','irritada','molesto','molesta'],{valence:-.45,arousal:.6,tension:.7}),
 introspection:E('introspection','Introspección','processing','introspection',['introspeccion','reflexionar','me di cuenta','entenderme'],{arousal:-.2,space:.8}),
 liberation:E('liberation','Liberación','processing','liberation',['liberacion','soltar','dejar ir','seguir adelante','pasar pagina'],{valence:.55,resolution:.8,movement:.45}),
 transformation:E('transformation','Transformación','processing','liberation',['transformacion','cambiar','cambio en mi','renacer'],{valence:.4,movement:.5}),
 overcoming:E('overcoming','Superación','processing','liberation',['superacion','superar','sali adelante','me levante'],{valence:.65,movement:.6}),
 detachment:E('detachment','Desapego','processing','liberation',['desapego','soltar','dejar atras'],{valence:.15,intimacy:-.4,resolution:.65}),
 determination:E('determination','Determinación','processing','liberation',['determinacion','decidido','decidida','voy a hacerlo'],{valence:.4,certainty:.85,movement:.65})
};
const LOSS=['perdi','perdí','perdida','ruptura','terminamos','se termino','te fuiste','me dejaste','ya no esta','despedida','extrano','extraño','anoro','añoro','duelo','fallecio','rechazo'];
const RUPTURE=['me fallaste','decepcion','traicion','mentira','ruptura','terminamos','me dejaste'];
const POSITIVE_CLOSENESS=['se rien','ríen','sonrie','sonríe','toma la mano','acomoda la camisa','recuesta en su hombro','bajan la guardia','hablan durante horas','no puede dejar de pensar','sonrie mientras recuerda'];
export function analyzeEmotionalContext(text,{limit=4}={}){
 const t=n(text), loss=has(t,LOSS), rupture=has(t,RUPTURE), positiveClose=has(t,POSITIVE_CLOSENESS);
 const scored=[];
 for(const e of Object.values(EMOTIONAL_DICTIONARY)){
   let score=has(t,e.terms)*1.5;
   if(e.evidence.includes('loss')&&!loss) score-=5;
   if(e.evidence.includes('rupture')&&!rupture) score-=4;
   if(positiveClose){if(['joy','intimacy','tenderness','trust','illusion','fascination','interest','connection','curiosity'].includes(e.id))score+=1.6;if(['sadness','grief','abandonment','melancholy'].includes(e.id)&&!loss)score-=4;}
   if(score>0)scored.push({...e,score});
 }
 scored.sort((a,b)=>b.score-a.score);
 const top=scored.slice(0,limit);
 const territoryScores={}; for(const x of scored)territoryScores[x.territory]=(territoryScores[x.territory]||0)+x.score;
 const territories=Object.entries(territoryScores).sort((a,b)=>b[1]-a[1]).map(([id,score])=>({id,score}));
 const aggregate={valence:0,arousal:0,tension:0,intimacy:0,certainty:0,nostalgia:0,brightness:0,movement:0,resolution:0,space:0};
 let weight=0; for(const x of top){weight+=x.score;for(const k of Object.keys(aggregate))aggregate[k]+=(x.effects[k]||0)*x.score;} if(weight)for(const k of Object.keys(aggregate))aggregate[k]/=weight;
 return {filters:top.map(x=>x.id),ranked:scored.map(x=>({id:x.id,label:x.label,score:x.score})),primaryTerritory:territories[0]?.id||'connection',secondaryTerritory:territories[1]?.id||null,territoryScores:Object.fromEntries(territories.map(x=>[x.id,x.score])),dimensions:aggregate,evidence:{loss:Boolean(loss),rupture:Boolean(rupture),positiveCloseness:Boolean(positiveClose)}};
}
export function musicalBehaviorFromEmotion(profile){const d=profile?.dimensions||{};return {brightness:d.brightness||0,tension:d.tension||0,intimacy:d.intimacy||0,resolution:d.resolution||0,space:d.space||0,movement:d.movement||0,voicing:(d.intimacy||0)>.55?'warm-close/open-top':(d.space||0)>.45?'spacious':'balanced',cadence:(d.resolution||0)>.6?'resolved':(d.tension||0)>.5?'suspended':'open',topVoice:(d.valence||0)>.45?'gentle-upward':(d.nostalgia||0)>.55?'soft-descending':'common-tone',density:(d.arousal||0)>.65?'active':(d.space||0)>.5?'sparse':'medium'};}
if(typeof window!=='undefined')window.FortissimoEmotionalEngineV4={dictionary:EMOTIONAL_DICTIONARY,analyze:analyzeEmotionalContext,musicalBehavior:musicalBehaviorFromEmotion};
