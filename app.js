const exampleGcode = `; Example sequence
M300 S196 P125
M300 S220 P125
M300 S262 P125
M300 S220 P125
M300 S330 P375
M300 S330 P250
G4 P125
M300 S294 P500
G4 P250
M300 S196 P125
M300 S220 P125
M300 S262 P125
M300 S220 P125
M300 S294 P375
M300 S294 P250
G4 P125
M300 S262 P375
M300 S247 P125
M300 S220 P125
G4 P125
M300 S196 P125
M300 S220 P125
M300 S262 P125
M300 S220 P125
M300 S262 P250
G4 P250
M300 S294 P250
M300 S247 P375
M300 S220 P125
M300 S196 P250
G4 P250
M300 S196 P250
M300 S294 P375
G4 P125
M300 S262 P750`;

const GM_INSTRUMENT_NAMES = [
  "Acoustic Grand Piano",
  "Bright Acoustic Piano",
  "Electric Grand Piano",
  "Honky-tonk Piano",
  "Electric Piano 1",
  "Electric Piano 2",
  "Harpsichord",
  "Clavinet",
  "Celesta",
  "Glockenspiel",
  "Music Box",
  "Vibraphone",
  "Marimba",
  "Xylophone",
  "Tubular Bells",
  "Dulcimer",
  "Drawbar Organ",
  "Percussive Organ",
  "Rock Organ",
  "Church Organ",
  "Reed Organ",
  "Accordion",
  "Harmonica",
  "Tango Accordion",
  "Acoustic Guitar (nylon)",
  "Acoustic Guitar (steel)",
  "Electric Guitar (jazz)",
  "Electric Guitar (clean)",
  "Electric Guitar (muted)",
  "Overdriven Guitar",
  "Distortion Guitar",
  "Guitar Harmonics",
  "Acoustic Bass",
  "Electric Bass (finger)",
  "Electric Bass (pick)",
  "Fretless Bass",
  "Slap Bass 1",
  "Slap Bass 2",
  "Synth Bass 1",
  "Synth Bass 2",
  "Violin",
  "Viola",
  "Cello",
  "Contrabass",
  "Tremolo Strings",
  "Pizzicato Strings",
  "Orchestral Harp",
  "Timpani",
  "String Ensemble 1",
  "String Ensemble 2",
  "Synth Strings 1",
  "Synth Strings 2",
  "Choir Aahs",
  "Voice Oohs",
  "Synth Choir",
  "Orchestra Hit",
  "Trumpet",
  "Trombone",
  "Tuba",
  "Muted Trumpet",
  "French Horn",
  "Brass Section",
  "Synth Brass 1",
  "Synth Brass 2",
  "Soprano Sax",
  "Alto Sax",
  "Tenor Sax",
  "Baritone Sax",
  "Oboe",
  "English Horn",
  "Bassoon",
  "Clarinet",
  "Piccolo",
  "Flute",
  "Recorder",
  "Pan Flute",
  "Blown Bottle",
  "Shakuhachi",
  "Whistle",
  "Ocarina",
  "Lead 1 (square)",
  "Lead 2 (sawtooth)",
  "Lead 3 (calliope)",
  "Lead 4 (chiff)",
  "Lead 5 (charang)",
  "Lead 6 (voice)",
  "Lead 7 (fifths)",
  "Lead 8 (bass + lead)",
  "Pad 1 (new age)",
  "Pad 2 (warm)",
  "Pad 3 (polysynth)",
  "Pad 4 (choir)",
  "Pad 5 (bowed)",
  "Pad 6 (metallic)",
  "Pad 7 (halo)",
  "Pad 8 (sweep)",
  "FX 1 (rain)",
  "FX 2 (soundtrack)",
  "FX 3 (crystal)",
  "FX 4 (atmosphere)",
  "FX 5 (brightness)",
  "FX 6 (goblins)",
  "FX 7 (echoes)",
  "FX 8 (sci-fi)",
  "Sitar",
  "Banjo",
  "Shamisen",
  "Koto",
  "Kalimba",
  "Bag pipe",
  "Fiddle",
  "Shanai",
  "Tinkle Bell",
  "Agogo",
  "Steel Drums",
  "Woodblock",
  "Taiko Drum",
  "Melodic Tom",
  "Synth Drum",
  "Reverse Cymbal",
  "Guitar Fret Noise",
  "Breath Noise",
  "Seashore",
  "Bird Tweet",
  "Telephone Ring",
  "Helicopter",
  "Applause",
  "Gunshot",
];

const PREVIEW_STARTUP_COMPENSATION_MS = 5;
const PREVIEW_RELEASE_MS = 1;
const MAX_PREVIEW_GAIN = 0.18;

const state = {
  audioContext: null,
  masterGain: null,
  abortController: null,
  activeOscillators: new Set(),
  playing: false,
  pendingRestart: false,
  pendingRestartOffsetMs: 0,
  playbackBaseOffsetMs: 0,
  playbackAnchorMs: 0,
  appliedSpeedPercent: 100,
  midiSource: null,
  selectedMidiTrackIds: new Set(),
};

const playbackToggleButton = document.querySelector("#playbackToggleButton");
const copyGcodeButton = document.querySelector("#copyGcodeButton");
const saveGcodeButton = document.querySelector("#saveGcodeButton");
const loadExampleButton = document.querySelector("#loadExampleButton");
const clearLogButton = document.querySelector("#clearLogButton");
const midiFileInput = document.querySelector("#midiFileInput");
const trackSelectionPanel = document.querySelector("#trackSelectionPanel");
const trackList = document.querySelector("#trackList");
const trackSummary = document.querySelector("#trackSummary");
const selectAllTracksButton = document.querySelector("#selectAllTracksButton");
const clearTracksButton = document.querySelector("#clearTracksButton");
const volumeInput = document.querySelector("#volumeInput");
const speedInput = document.querySelector("#speedInput");
const speedValue = document.querySelector("#speedValue");
const gcodeInput = document.querySelector("#gcodeInput");
const logOutput = document.querySelector("#logOutput");
const importStatus = document.querySelector("#importStatus");
const outputValue = document.querySelector("#outputValue");
const audioValue = document.querySelector("#audioValue");
const playbackValue = document.querySelector("#playbackValue");

function appendLog(message) {
  const timestamp = new Date().toLocaleTimeString();
  logOutput.textContent += `\n[${timestamp}] ${message}`;
  logOutput.scrollTop = logOutput.scrollHeight;
}

function setStatus() {
  outputValue.textContent = "Laptop speakers";
  audioValue.textContent = state.audioContext
    ? state.audioContext.state === "running"
      ? "Ready"
      : "Waiting for click"
    : "Ready";
  playbackValue.textContent = state.playing ? "Playing" : "Idle";

  if (playbackToggleButton) {
    if (state.playing) {
      playbackToggleButton.textContent = "Stop";
      playbackToggleButton.classList.remove("primary");
      playbackToggleButton.classList.add("danger");
    } else {
      playbackToggleButton.textContent = "Play";
      playbackToggleButton.classList.remove("danger");
      playbackToggleButton.classList.add("primary");
    }
  }
}

function setImportStatus(message) {
  importStatus.textContent = message;
}

function setTrackSummary(message) {
  trackSummary.textContent = message;
}

function updateSpeedLabel() {
  speedValue.textContent = `${speedInput.value}%`;
}

function getPreviewGain() {
  return (Number(volumeInput.value) / 100) * MAX_PREVIEW_GAIN;
}

function scaleDurationValue(value, ratio, minimum = 1) {
  const scaled = Math.round(value * ratio);
  return Math.max(minimum, scaled);
}

function scaleGcodeLine(line, ratio) {
  const commentStart = line.indexOf(";");
  const codePart = commentStart >= 0 ? line.slice(0, commentStart) : line;
  const commentPart = commentStart >= 0 ? line.slice(commentStart) : "";
  const trimmed = codePart.trim();

  if (!trimmed) {
    return line;
  }

  const tokens = trimmed.split(/\s+/);
  const command = tokens[0].toUpperCase();

  if (command === "M300") {
    const scaledTokens = tokens.map((token, index) => {
      if (index === 0 || token[0]?.toUpperCase() !== "P") {
        return token;
      }

      const value = Number(token.slice(1));
      return Number.isFinite(value) ? `P${scaleDurationValue(value, ratio)}` : token;
    });

    const leadingWhitespace = codePart.match(/^\s*/)?.[0] ?? "";
    const trailingWhitespace = codePart.match(/\s*$/)?.[0] ?? "";
    return `${leadingWhitespace}${scaledTokens.join(" ")}${trailingWhitespace}${commentPart}`;
  }

  if (command === "G4") {
    const scaledTokens = tokens.map((token, index) => {
      if (index === 0) {
        return token;
      }

      const key = token[0]?.toUpperCase();
      const value = Number(token.slice(1));

      if (!Number.isFinite(value)) {
        return token;
      }

      if (key === "P") {
        return `P${scaleDurationValue(value, ratio, 0)}`;
      }

      if (key === "S") {
        const scaled = Math.max(0, value * ratio);
        return `S${Number.isInteger(scaled) ? scaled : scaled.toFixed(3).replace(/\.?0+$/, "")}`;
      }

      return token;
    });

    const leadingWhitespace = codePart.match(/^\s*/)?.[0] ?? "";
    const trailingWhitespace = codePart.match(/\s*$/)?.[0] ?? "";
    return `${leadingWhitespace}${scaledTokens.join(" ")}${trailingWhitespace}${commentPart}`;
  }

  return line;
}

function applySpeedToGcode(nextSpeedPercent) {
  const currentSpeedPercent = state.appliedSpeedPercent || 100;

  if (nextSpeedPercent === currentSpeedPercent) {
    return;
  }

  const ratio = currentSpeedPercent / nextSpeedPercent;
  gcodeInput.value = gcodeInput.value
    .split(/\r?\n/)
    .map((line) => scaleGcodeLine(line, ratio))
    .join("\n");

  state.appliedSpeedPercent = nextSpeedPercent;
}

function setEditorGcode(nextGcode) {
  gcodeInput.value = nextGcode;
  state.appliedSpeedPercent = 100;
  applySpeedToGcode(Number(speedInput.value));
}

async function ensureAudioGraph() {
  const AudioCtor = window.AudioContext || window.webkitAudioContext;

  if (!AudioCtor) {
    throw new Error("This browser does not support Web Audio.");
  }

  if (!state.audioContext) {
    state.audioContext = new AudioCtor();
    state.masterGain = state.audioContext.createGain();
    state.masterGain.gain.value = getPreviewGain();
    state.masterGain.connect(state.audioContext.destination);
  }

  if (state.audioContext.state !== "running") {
    await state.audioContext.resume();
  }
}

function parseLine(rawLine) {
  const withoutComment = rawLine.split(";")[0].trim();

  if (!withoutComment) {
    return null;
  }

  const parts = withoutComment.split(/\s+/);
  const command = parts[0].toUpperCase();
  const params = new Map();

  for (const part of parts.slice(1)) {
    const key = part[0]?.toUpperCase();
    const value = Number(part.slice(1));

    if (key && Number.isFinite(value)) {
      params.set(key, value);
    }
  }

  if (command === "M300") {
    const frequency = params.get("S") ?? 440;
    const duration = Math.max(1, params.get("P") ?? 150);

    if (frequency <= 0) {
      return {
        type: "pause",
        raw: withoutComment,
        duration,
      };
    }

    return {
      type: "tone",
      raw: withoutComment,
      frequency: Math.max(20, frequency),
      duration,
    };
  }

  if (command === "G4") {
    const duration = params.has("P")
      ? params.get("P")
      : params.has("S")
        ? params.get("S") * 1000
        : 0;

    return {
      type: "pause",
      raw: withoutComment,
      duration: Math.max(0, duration),
    };
  }

  return {
    type: "unsupported",
    raw: withoutComment,
  };
}

function readAscii(view, offset, length) {
  let text = "";

  for (let index = 0; index < length; index += 1) {
    text += String.fromCharCode(view.getUint8(offset + index));
  }

  return text;
}

function decodeMidiText(bytes, offset, length) {
  const slice = bytes.slice(offset, offset + length);

  try {
    return new TextDecoder("utf-8").decode(slice).replace(/\0/g, "").trim();
  } catch (error) {
    return Array.from(slice, (byte) => String.fromCharCode(byte)).join("").replace(/\0/g, "").trim();
  }
}

function getInstrumentLabel(programNumber, percussion) {
  if (percussion) {
    return "Standard Drum Kit";
  }

  if (Number.isInteger(programNumber) && programNumber >= 0 && programNumber < 128) {
    return GM_INSTRUMENT_NAMES[programNumber];
  }

  return "Unknown Instrument";
}

function readVariableLength(bytes, startOffset) {
  let value = 0;
  let offset = startOffset;

  while (offset < bytes.length) {
    const byte = bytes[offset];
    value = (value << 7) | (byte & 0x7f);
    offset += 1;

    if ((byte & 0x80) === 0) {
      return { value, offset };
    }
  }

  throw new Error("Unexpected end of MIDI data while reading variable-length value.");
}

function parseMidi(arrayBuffer) {
  const view = new DataView(arrayBuffer);

  if (readAscii(view, 0, 4) !== "MThd") {
    throw new Error("Invalid MIDI file header.");
  }

  const headerLength = view.getUint32(4);
  const format = view.getUint16(8);
  const trackCount = view.getUint16(10);
  const division = view.getUint16(12);

  if ((division & 0x8000) !== 0) {
    throw new Error("SMPTE time division is not supported yet.");
  }

  const ticksPerQuarter = division;
  const tempoEvents = [];
  const tracks = [];
  let offset = 8 + headerLength;

  for (let trackIndex = 0; trackIndex < trackCount; trackIndex += 1) {
    if (readAscii(view, offset, 4) !== "MTrk") {
      throw new Error(`Track ${trackIndex + 1} is missing an MTrk chunk.`);
    }

    const trackLength = view.getUint32(offset + 4);
    const trackBytes = new Uint8Array(arrayBuffer, offset + 8, trackLength);
    let trackOffset = 0;
    let absoluteTick = 0;
    let runningStatus = null;
    let trackName = "";
    let instrumentName = "";
    let programNumber = null;
    let percussion = false;
    const noteEvents = [];
    const notes = [];
    const activeNotes = new Map();

    while (trackOffset < trackBytes.length) {
      const delta = readVariableLength(trackBytes, trackOffset);
      absoluteTick += delta.value;
      trackOffset = delta.offset;

      const rawStatus = trackBytes[trackOffset];
      let status = rawStatus;

      if (rawStatus >= 0x80) {
        trackOffset += 1;
        if (rawStatus < 0xf0) {
          runningStatus = rawStatus;
        } else {
          runningStatus = null;
        }
      } else if (runningStatus !== null) {
        status = runningStatus;
      } else {
        throw new Error(`Running status is missing near tick ${absoluteTick}.`);
      }

      if (status === 0xff) {
        const metaType = trackBytes[trackOffset];
        trackOffset += 1;
        const metaLength = readVariableLength(trackBytes, trackOffset);
        trackOffset = metaLength.offset;

        if (metaType === 0x51 && metaLength.value === 3) {
          const tempo =
            (trackBytes[trackOffset] << 16) |
            (trackBytes[trackOffset + 1] << 8) |
            trackBytes[trackOffset + 2];

          tempoEvents.push({ tick: absoluteTick, tempo });
        }

        if (metaType === 0x03) {
          trackName = decodeMidiText(trackBytes, trackOffset, metaLength.value) || trackName;
        }

        if (metaType === 0x04) {
          instrumentName =
            decodeMidiText(trackBytes, trackOffset, metaLength.value) || instrumentName;
        }

        trackOffset += metaLength.value;
        continue;
      }

      if (status === 0xf0 || status === 0xf7) {
        const sysExLength = readVariableLength(trackBytes, trackOffset);
        trackOffset = sysExLength.offset + sysExLength.value;
        continue;
      }

      const eventType = status & 0xf0;
      const channel = status & 0x0f;
      const firstDataByte = trackBytes[trackOffset];
      trackOffset += 1;

      const secondDataByte =
        eventType === 0xc0 || eventType === 0xd0 ? null : trackBytes[trackOffset++];

      if (eventType === 0xc0 && channel !== 9 && programNumber === null) {
        programNumber = firstDataByte;
      }

      if (eventType === 0x90) {
        const velocity = secondDataByte ?? 0;
        percussion = percussion || channel === 9;
        const isPercussion = channel === 9;

        noteEvents.push({
          tick: absoluteTick,
          type: velocity === 0 ? "off" : "on",
          note: firstDataByte,
          velocity,
          channel,
          trackIndex,
          percussion: isPercussion,
        });

        const noteKey = `${channel}:${firstDataByte}`;

        if (velocity > 0) {
          activeNotes.set(noteKey, {
            tick: absoluteTick,
            note: firstDataByte,
            velocity,
            channel,
            trackIndex,
            percussion: isPercussion,
          });
        } else {
          const startNote = activeNotes.get(noteKey);

          if (startNote) {
            notes.push({
              ...startNote,
              durationTicks: Math.max(1, absoluteTick - startNote.tick),
            });
            activeNotes.delete(noteKey);
          }
        }
      } else if (eventType === 0x80) {
        percussion = percussion || channel === 9;
        const isPercussion = channel === 9;
        noteEvents.push({
          tick: absoluteTick,
          type: "off",
          note: firstDataByte,
          velocity: secondDataByte ?? 0,
          channel,
          trackIndex,
          percussion: isPercussion,
        });

        const noteKey = `${channel}:${firstDataByte}`;
        const startNote = activeNotes.get(noteKey);

        if (startNote) {
          notes.push({
            ...startNote,
            durationTicks: Math.max(1, absoluteTick - startNote.tick),
          });
          activeNotes.delete(noteKey);
        }
      }
    }

    for (const lingeringNote of activeNotes.values()) {
      notes.push({
        ...lingeringNote,
        durationTicks: 1,
      });
    }

    const noteCount = notes.length;

    tracks.push({
      index: trackIndex,
      name: trackName,
      instrumentName,
      instrumentLabel: getInstrumentLabel(programNumber, percussion),
      percussion,
      programNumber,
      noteCount,
      notes,
      noteEvents,
    });

    offset += 8 + trackLength;
  }

  return {
    format,
    ticksPerQuarter,
    tempoEvents,
    tracks,
  };
}

function buildTempoMap(tempoEvents, ticksPerQuarter) {
  const normalizedEvents = [...tempoEvents, { tick: 0, tempo: 500000 }]
    .sort((left, right) => left.tick - right.tick)
    .reduce((events, event) => {
      const previous = events[events.length - 1];

      if (previous && previous.tick === event.tick) {
        previous.tempo = event.tempo;
      } else {
        events.push({ ...event });
      }

      return events;
    }, []);

  let elapsedMs = 0;

  return normalizedEvents.map((event, index) => {
    if (index > 0) {
      const previous = normalizedEvents[index - 1];
      elapsedMs += ((event.tick - previous.tick) * previous.tempo) / ticksPerQuarter / 1000;
    }

    return {
      tick: event.tick,
      tempo: event.tempo,
      elapsedMs,
    };
  });
}

function ticksToMs(tick, tempoMap, ticksPerQuarter) {
  let selected = tempoMap[0];

  for (const entry of tempoMap) {
    if (entry.tick > tick) {
      break;
    }

    selected = entry;
  }

  return selected.elapsedMs + ((tick - selected.tick) * selected.tempo) / ticksPerQuarter / 1000;
}

function tickSpanToMs(startTick, endTick, tempoMap, ticksPerQuarter) {
  return ticksToMs(endTick, tempoMap, ticksPerQuarter) - ticksToMs(startTick, tempoMap, ticksPerQuarter);
}

function pickLeadNote(activeNotes) {
  const choices = [...activeNotes.values()];

  if (!choices.length) {
    return null;
  }

  choices.sort((left, right) => {
    if (right.note !== left.note) {
      return right.note - left.note;
    }

    return right.velocity - left.velocity;
  });

  return choices[0];
}

function deriveMonophonicSegments(noteEvents) {
  const sortedEvents = [...noteEvents].sort((left, right) => {
    if (left.tick !== right.tick) {
      return left.tick - right.tick;
    }

    if (left.type !== right.type) {
      return left.type === "off" ? -1 : 1;
    }

    return left.note - right.note;
  });

  const activeNotes = new Map();
  const segments = [];
  let previousTick = 0;
  let currentLead = null;

  for (let index = 0; index < sortedEvents.length; ) {
    const tick = sortedEvents[index].tick;

    if (currentLead && tick > previousTick) {
      segments.push({
        note: currentLead.note,
        startTick: previousTick,
        endTick: tick,
      });
    }

    while (index < sortedEvents.length && sortedEvents[index].tick === tick) {
      const event = sortedEvents[index];
      const key = `${event.trackIndex}:${event.channel}:${event.note}`;

      if (event.type === "on") {
        activeNotes.set(key, event);
      } else {
        activeNotes.delete(key);
      }

      index += 1;
    }

    previousTick = tick;
    currentLead = pickLeadNote(activeNotes);
  }

  return segments;
}

function midiNoteToFrequency(note) {
  return 440 * 2 ** ((note - 69) / 12);
}

function describeTrack(track) {
  const primaryLabel =
    track.instrumentLabel !== "Unknown Instrument"
      ? track.instrumentLabel
      : track.name || track.instrumentName || track.instrumentLabel;
  const title = `Track ${track.index + 1}: ${primaryLabel}`;
  const extras = [`${track.noteCount} note${track.noteCount === 1 ? "" : "s"}`];

  if (track.name && track.name !== primaryLabel) {
    extras.push(`MIDI name: ${track.name}`);
  }

  if (track.instrumentName && track.instrumentName !== primaryLabel) {
    extras.push(`Instrument meta: ${track.instrumentName}`);
  }

  return {
    title,
    detail: extras.join(" - "),
  };
}

function renderTrackSelection() {
  const midi = state.midiSource?.midi;

  if (!midi) {
    trackSelectionPanel.hidden = true;
    trackList.replaceChildren();
    setTrackSummary("Choose which MIDI tracks should be converted into beep G-code.");
    selectAllTracksButton.disabled = true;
    clearTracksButton.disabled = true;
    return;
  }

  trackSelectionPanel.hidden = false;
  trackList.replaceChildren();

  const playableTracks = midi.tracks.filter((track) => track.noteCount > 0);
  const selectedCount = playableTracks.filter((track) =>
    state.selectedMidiTrackIds.has(track.index),
  ).length;

  for (const track of midi.tracks) {
    const item = document.createElement("label");
    item.className = "track-item";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.dataset.trackIndex = String(track.index);
    checkbox.checked = state.selectedMidiTrackIds.has(track.index);
    checkbox.disabled = track.noteCount === 0;

    const textWrap = document.createElement("div");
    const title = document.createElement("strong");
    const detail = document.createElement("span");
    const description = describeTrack(track);

    title.textContent = description.title;
    detail.textContent =
      track.noteCount > 0 ? description.detail : "No note events found in this track";

    textWrap.append(title, detail);
    item.append(checkbox, textWrap);
    trackList.append(item);
  }

  setTrackSummary(
    `${selectedCount} of ${playableTracks.length} playable track${
      playableTracks.length === 1 ? "" : "s"
    } selected.`,
  );
  selectAllTracksButton.disabled = playableTracks.length === 0;
  clearTracksButton.disabled = playableTracks.length === 0;
}

function resetMidiState() {
  state.midiSource = null;
  state.selectedMidiTrackIds = new Set();
  renderTrackSelection();
}

function convertParsedMidiToGcode(midi, selectedTrackIds, filename) {
  const selectedNotes = midi.tracks
    .filter((track) => selectedTrackIds.includes(track.index))
    .flatMap((track) => track.notes);

  if (!selectedNotes.length) {
    throw new Error("Select at least one MIDI track with notes.");
  }

  const tempoMap = buildTempoMap(midi.tempoEvents, midi.ticksPerQuarter);
  const sortedNotes = [...selectedNotes].sort((left, right) => {
    if (left.tick !== right.tick) {
      return left.tick - right.tick;
    }

    if (left.percussion !== right.percussion) {
      return left.percussion ? 1 : -1;
    }

    return right.note - left.note;
  });

  const lines = [
    `; Generated from ${filename}`,
    `; MIDI format ${midi.format}, ${midi.ticksPerQuarter} ticks per quarter note`,
    `; Tracks: ${selectedTrackIds.map((trackId) => trackId + 1).join(", ")}`,
    "; Polyphony collapsed to the highest active note",
  ];

  let lastEndMs = 0;
  let convertedCount = 0;
  let currentIndex = 0;
  const percussionFrequency = 100;
  const percussionDurationMs = 20;

  while (currentIndex < sortedNotes.length) {
    const baseNote = sortedNotes[currentIndex];
    const startTick = baseNote.tick;
    let chosenNote = baseNote;
    let highestMidi = baseNote.percussion ? -1 : baseNote.note;

    while (
      currentIndex + 1 < sortedNotes.length &&
      sortedNotes[currentIndex + 1].tick === startTick
    ) {
      currentIndex += 1;
      const candidate = sortedNotes[currentIndex];

      if (!candidate.percussion && candidate.note > highestMidi) {
        highestMidi = candidate.note;
        chosenNote = candidate;
      }
    }

    const startMs = ticksToMs(startTick, tempoMap, midi.ticksPerQuarter);
    const nextStartMs =
      currentIndex + 1 < sortedNotes.length
        ? ticksToMs(sortedNotes[currentIndex + 1].tick, tempoMap, midi.ticksPerQuarter)
        : null;

    let frequency = chosenNote.percussion ? percussionFrequency : midiNoteToFrequency(chosenNote.note);
    let durationMs = chosenNote.percussion
      ? percussionDurationMs
      : tickSpanToMs(
          chosenNote.tick,
          chosenNote.tick + chosenNote.durationTicks,
          tempoMap,
          midi.ticksPerQuarter,
        );

    if (nextStartMs !== null) {
      durationMs = Math.min(durationMs, nextStartMs - startMs);
    }

    durationMs = Math.max(1, Math.round(durationMs));
    const silenceMs = Math.max(0, Math.round(startMs - lastEndMs));

    if (silenceMs > 0) {
      lines.push(`G4 P${silenceMs}`);
    }

    lines.push(`M300 S${Math.round(frequency)} P${durationMs}`);
    lastEndMs = Math.round(startMs) + durationMs;
    convertedCount += 1;
    currentIndex += 1;
  }

  return {
    gcode: lines.join("\n"),
    summary: `${convertedCount} note${convertedCount === 1 ? "" : "s"} converted from ${
      selectedTrackIds.length
    } selected track${selectedTrackIds.length === 1 ? "" : "s"}.`,
  };
}

function getSelectedTrackIds() {
  return [...state.selectedMidiTrackIds].sort((left, right) => left - right);
}

function updateSelectedTrackIdsFromUi() {
  const nextSelection = new Set();

  for (const input of trackList.querySelectorAll("input[data-track-index]")) {
    if (input.checked && !input.disabled) {
      nextSelection.add(Number(input.dataset.trackIndex));
    }
  }

  state.selectedMidiTrackIds = nextSelection;
  renderTrackSelection();
  convertSelectedMidiTracks();
}

function convertSelectedMidiTracks() {
  if (!state.midiSource?.midi) {
    return;
  }

  const selectedTrackIds = getSelectedTrackIds();

  try {
    const { gcode, summary } = convertParsedMidiToGcode(
      state.midiSource.midi,
      selectedTrackIds,
      state.midiSource.filename,
    );
    setEditorGcode(gcode);
    setImportStatus(`Loaded ${state.midiSource.filename}. ${summary}`);
    appendLog(`Converted MIDI selection: ${summary}`);

    if (state.playing) {
      state.pendingRestartOffsetMs = getPlaybackOffsetMs();
      state.pendingRestart = true;
      appendLog(
        `Track selection changed. Restarting playback from ${Math.round(
          state.pendingRestartOffsetMs,
        )}ms with the updated G-code...`,
      );
      stopPlayback();
    }
  } catch (error) {
    state.pendingRestart = false;
    state.pendingRestartOffsetMs = 0;
    setImportStatus(`Could not convert ${state.midiSource.filename}: ${error.message}`);
    appendLog(`MIDI conversion failed: ${error.message}`);

    if (state.playing) {
      appendLog("Stopping playback because the current MIDI selection is not playable.");
      stopPlayback();
    }
  }
}

function getPreparedCommands() {
  return gcodeInput.value
    .split(/\r?\n/)
    .map(parseLine)
    .filter(Boolean);
}

function getPlaybackOffsetMs() {
  if (!state.playing) {
    return state.playbackBaseOffsetMs;
  }

  return state.playbackBaseOffsetMs + Math.max(0, performance.now() - state.playbackAnchorMs);
}

function wait(ms, signal) {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(new DOMException("Playback stopped.", "AbortError"));
      return;
    }

    const timer = window.setTimeout(() => {
      signal.removeEventListener("abort", onAbort);
      resolve();
    }, ms);

    function onAbort() {
      window.clearTimeout(timer);
      reject(new DOMException("Playback stopped.", "AbortError"));
    }

    signal.addEventListener("abort", onAbort, { once: true });
  });
}

async function playTone(frequency, duration, signal) {
  const oscillator = state.audioContext.createOscillator();
  const toneGain = state.audioContext.createGain();
  const durationSeconds = duration / 1000;
  const adjustedDuration = Math.max(
    PREVIEW_RELEASE_MS / 1000,
    durationSeconds - PREVIEW_STARTUP_COMPENSATION_MS / 1000,
  );
  const startTime = state.audioContext.currentTime;
  const releaseStart = Math.max(
    startTime,
    startTime + adjustedDuration - PREVIEW_RELEASE_MS / 1000,
  );
  const endTime = startTime + adjustedDuration;

  oscillator.type = "square";
  oscillator.frequency.value = frequency;
  toneGain.gain.value = 0.0001;

  oscillator.connect(toneGain);
  toneGain.connect(state.masterGain);

  toneGain.gain.setValueAtTime(1, startTime);
  toneGain.gain.setValueAtTime(1, releaseStart);
  toneGain.gain.linearRampToValueAtTime(0.0001, endTime);

  state.activeOscillators.add(oscillator);
  oscillator.start(startTime);
  oscillator.stop(endTime);

  return new Promise((resolve, reject) => {
    function cleanup() {
      state.activeOscillators.delete(oscillator);
      signal.removeEventListener("abort", onAbort);
      oscillator.disconnect();
      toneGain.disconnect();
    }

    function onAbort() {
      try {
        oscillator.stop();
      } catch (error) {
        // Ignore repeated stop calls during teardown.
      }
      cleanup();
      reject(new DOMException("Playback stopped.", "AbortError"));
    }

    oscillator.addEventListener(
      "ended",
      () => {
        cleanup();
        resolve();
      },
      { once: true },
    );

    signal.addEventListener("abort", onAbort, { once: true });
  });
}

async function playGcode(startOffsetMs = 0) {
  const resumeOffsetMs = Number.isFinite(startOffsetMs) ? Math.max(0, startOffsetMs) : 0;
  const commands = getPreparedCommands();
  const playableCommands = commands.filter((command) => command.type !== "unsupported");

  if (!playableCommands.length) {
    appendLog("No playable commands found. Add M300 tones or G4 pauses first.");
    return;
  }

  try {
    await ensureAudioGraph();
  } catch (error) {
    appendLog(`Audio setup failed: ${error.message}`);
    setStatus();
    return;
  }

  state.playing = true;
  state.abortController = new AbortController();
  state.playbackBaseOffsetMs = resumeOffsetMs;
  state.playbackAnchorMs = performance.now();
  setStatus();
  appendLog(
    `Starting run with ${playableCommands.length} playable command${
      playableCommands.length === 1 ? "" : "s"
    }${resumeOffsetMs > 0 ? ` from ${Math.round(resumeOffsetMs)}ms.` : "."}`,
  );

  try {
    let cursorMs = 0;

    for (const command of commands) {
      if (command.type === "unsupported") {
        appendLog(`[ignored] ${command.raw}`);
        continue;
      }

      const commandStartMs = cursorMs;
      const commandEndMs = commandStartMs + command.duration;
      cursorMs = commandEndMs;

      if (commandEndMs <= resumeOffsetMs) {
        continue;
      }

      const remainingDurationMs = Math.max(
        1,
        Math.round(commandEndMs - Math.max(resumeOffsetMs, commandStartMs)),
      );

      if (command.type === "pause") {
        appendLog(
          `[pause] ${remainingDurationMs}ms${
            remainingDurationMs !== Math.round(command.duration)
              ? ` remaining from ${Math.round(command.duration)}ms`
              : ""
          }`,
        );
        await wait(remainingDurationMs, state.abortController.signal);
        continue;
      }

      appendLog(
        `[tone] ${Math.round(command.frequency)}Hz for ${remainingDurationMs}ms${
          remainingDurationMs !== Math.round(command.duration)
            ? ` remaining from ${Math.round(command.duration)}ms`
            : ""
        }`,
      );
      await playTone(command.frequency, remainingDurationMs, state.abortController.signal);
    }

    appendLog("Run finished.");
  } catch (error) {
    if (error.name === "AbortError") {
      appendLog("Playback stopped.");
    } else {
      appendLog(`Playback failed: ${error.message}`);
    }
  } finally {
    state.playing = false;
    state.abortController = null;
    state.playbackBaseOffsetMs = 0;
    state.playbackAnchorMs = 0;
    setStatus();

    if (state.pendingRestart) {
      const restartOffsetMs = state.pendingRestartOffsetMs;
      state.pendingRestart = false;
      state.pendingRestartOffsetMs = 0;
      playGcode(restartOffsetMs);
    }
  }
}

function stopPlayback() {
  if (!state.playing || !state.abortController) {
    return;
  }

  for (const oscillator of [...state.activeOscillators]) {
    try {
      oscillator.stop();
    } catch (error) {
      // Ignore repeated stop calls while the node is already ending.
    }
  }

  state.abortController.abort();
}

function updateVolume() {
  if (state.masterGain) {
    state.masterGain.gain.value = getPreviewGain();
  }
}

async function copyGcodeToClipboard() {
  const text = gcodeInput.value.trim();

  if (!text) {
    appendLog("Copy skipped: there is no G-code to copy.");
    return;
  }

  try {
    await navigator.clipboard.writeText(gcodeInput.value);
    appendLog("Copied G-code to clipboard.");
  } catch (error) {
    appendLog(`Copy failed: ${error.message}`);
  }
}

function getSuggestedGcodeFilename() {
  const midiName = state.midiSource?.filename?.replace(/\.[^.]+$/, "");
  const baseName = midiName || "beep-test";
  return `${baseName}.gcode`;
}

function saveGcodeToFile() {
  const text = gcodeInput.value.trim();

  if (!text) {
    appendLog("Save skipped: there is no G-code to save.");
    return;
  }

  const blob = new Blob([gcodeInput.value], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = getSuggestedGcodeFilename();
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
  appendLog(`Saved G-code as ${anchor.download}.`);
}

async function handleMidiUpload(event) {
  const file = event.target.files?.[0];

  if (!file) {
    return;
  }

  setImportStatus(`Converting ${file.name} into G-code...`);

  try {
    const midi = parseMidi(await file.arrayBuffer());
    const playableTrackIds = midi.tracks
      .filter((track) => track.noteCount > 0)
      .map((track) => track.index);

    if (!playableTrackIds.length) {
      throw new Error("This MIDI file does not contain note events.");
    }

    state.midiSource = {
      filename: file.name,
      midi,
    };
    state.selectedMidiTrackIds = new Set(playableTrackIds);
    renderTrackSelection();
    convertSelectedMidiTracks();
  } catch (error) {
    resetMidiState();
    setImportStatus(`Could not convert ${file.name}: ${error.message}`);
    appendLog(`MIDI import failed: ${error.message}`);
  } finally {
    event.target.value = "";
  }
}

loadExampleButton.addEventListener("click", () => {
  setEditorGcode(exampleGcode);
  appendLog("Loaded example beep sequence.");
});

clearLogButton.addEventListener("click", () => {
  logOutput.textContent = "Log cleared.";
});

copyGcodeButton.addEventListener("click", copyGcodeToClipboard);
saveGcodeButton.addEventListener("click", saveGcodeToFile);
midiFileInput.addEventListener("change", handleMidiUpload);
trackList.addEventListener("change", updateSelectedTrackIdsFromUi);
selectAllTracksButton.addEventListener("click", () => {
  if (!state.midiSource?.midi) {
    return;
  }

  state.selectedMidiTrackIds = new Set(
    state.midiSource.midi.tracks.filter((track) => track.noteCount > 0).map((track) => track.index),
  );
  renderTrackSelection();
  convertSelectedMidiTracks();
});
clearTracksButton.addEventListener("click", () => {
  state.selectedMidiTrackIds = new Set();
  renderTrackSelection();
  convertSelectedMidiTracks();
});
volumeInput.addEventListener("input", updateVolume);
speedInput.addEventListener("input", () => {
  updateSpeedLabel();
  applySpeedToGcode(Number(speedInput.value));
});
if (playbackToggleButton) {
  playbackToggleButton.addEventListener("click", () => {
    if (state.playing) {
      stopPlayback();
    } else {
      playGcode();
    }
  });
}

updateSpeedLabel();
state.appliedSpeedPercent = Number(speedInput.value);
resetMidiState();
setStatus();
