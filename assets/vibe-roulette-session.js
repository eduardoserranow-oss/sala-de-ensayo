export const FEEDBACK_OPTIONS = {
  inspire: { label: 'Inspires me', weight: 1 },
  interesting: { label: 'Interesting', weight: 0.45 },
  generic: { label: 'Too generic', weight: -0.45 },
  wrongVibe: { label: 'Not my vibe', weight: -1 }
};

export function createSessionSnapshot(result, context = {}) {
  if (!result) throw new Error('A roulette result is required.');
  const title = String(context.title || '').trim();
  return {
    id: context.id || `${Date.now()}-${result.progressionId || 'direction'}`,
    createdAt: context.createdAt || new Date().toISOString(),
    title,
    mood: result.mood,
    energyTarget: Number(context.energyTarget ?? result.intent?.energyTarget ?? 0.5),
    recommendedBpm: Number(context.recommendedBpm ?? result.intent?.recommendedBpm ?? 0),
    playbackBars: Number(context.playbackBars ?? 4),
    beatsPerBar: Number(context.beatsPerBar ?? 4),
    key: result.key,
    mode: result.mode,
    progressionId: result.progressionId,
    roman: [...(result.roman || [])],
    chords: [...(result.chords || [])],
    chorusVariation: {
      strategy: result.chorusVariation?.strategy || '',
      note: result.chorusVariation?.note || '',
      roman: [...(result.chorusVariation?.roman || [])],
      chords: [...(result.chorusVariation?.chords || [])]
    },
    sourceSongIds: [...(result.evidenceSummary?.supportedSongIds || [])],
    evidenceConfidence: Number(result.evidenceConfidence || 0),
    feedback: context.feedback || null
  };
}

export function formatSnapshotForClipboard(snapshot) {
  if (!snapshot) return '';
  const title = snapshot.title ? `${snapshot.title}\n` : '';
  const mood = snapshot.mood ? `${snapshot.mood}` : 'vibe';
  const energy = Math.round((Number(snapshot.energyTarget) || 0) * 100);
  const bpm = Number(snapshot.recommendedBpm) > 0 ? ` · ${Math.round(snapshot.recommendedBpm)} BPM` : '';
  const meter = Number(snapshot.playbackBars) > 0 ? ` · ${snapshot.playbackBars} bars / ${snapshot.beatsPerBar || 4}/4` : '';
  const roman = (snapshot.roman || []).join(' – ');
  const chords = (snapshot.chords || []).join(' – ');
  const chorusRoman = (snapshot.chorusVariation?.roman || []).join(' – ');
  const chorusChords = (snapshot.chorusVariation?.chords || []).join(' – ');
  return `${title}${mood} · energy ${energy}%${bpm}${meter} · ${snapshot.key} ${snapshot.mode}\n${roman}\n${chords}\nChorus: ${chorusRoman}\n${chorusChords}`.trim();
}

export function upsertRecentSnapshot(items = [], snapshot, maxItems = 8) {
  if (!snapshot?.id) return items.slice(0, maxItems);
  const next = [snapshot, ...items.filter(item => item.id !== snapshot.id)];
  return next.slice(0, maxItems);
}

export function applyFeedback(snapshot, feedbackKey) {
  const option = FEEDBACK_OPTIONS[feedbackKey];
  if (!option) throw new Error(`Unsupported feedback: ${feedbackKey}`);
  return {
    ...snapshot,
    feedback: {
      key: feedbackKey,
      label: option.label,
      weight: option.weight,
      createdAt: new Date().toISOString()
    }
  };
}