# Tool: ElevenLabs Victoria (locked)

> Verified 2026-05-06 against ElevenLabs API docs at elevenlabs.io/docs.

---

## What this is

Victoria is the permanent, locked voice for all Ryan Realty video and audio production. No substitutions. No experiments. Every VO line — listing reels, market reports, news clips, neighborhood guides, area overviews — uses Victoria.

**Voice ID:** `qSeXEcewz7tA0Q0qk9fH`
**Saved on account as:** "Victoria — Ryan Realty Anchor"
**Profile:** Middle-aged American, conversational, warm, trustworthy. Designed for explainer video, viral social, and modern brand VO.
**Locked:** 2026-04-27 per CLAUDE.md. Do not override without explicit Matt direction.

### Canonical settings (default for all production use)

| Parameter | Value | Notes |
|-----------|-------|-------|
| `model_id` | `eleven_turbo_v2_5` | See model section below — turbo_v2_5 is still available but see migration note |
| `stability` | `0.50` | Lower = more emotional range; 0.50 is the production-tested sweet spot |
| `similarity_boost` | `0.75` | Adherence to original voice character |
| `style` | `0.35` | Style amplification; higher values increase compute and can introduce artifacts |
| `use_speaker_boost` | `true` | Boosts similarity; adds slight latency — acceptable for batch pre-render |

**API env vars in `.env.local`:**
```
ELEVENLABS_API_KEY=...
ELEVENLABS_VOICE_ID=qSeXEcewz7tA0Q0qk9fH
ELEVENLABS_VOICE_ID_VICTORIA=qSeXEcewz7tA0Q0qk9fH
```

---

## Model selection: turbo_v2_5 vs v3 vs flash_v2_5

### Current model landscape (verified 2026-05-06)

| Model ID | Status | Latency | Char limit | Languages | Phoneme (IPA/CMU) | Use case |
|----------|--------|---------|------------|-----------|-------------------|----------|
| `eleven_v3` | Current flagship | ~1–2s | 5,000 | 70+ | NOT supported | Premium narration, audiobooks, emotional dialogue |
| `eleven_flash_v2_5` | Recommended production | ~75ms | 40,000 | 32 | NOT supported | Real-time, bulk, cost-sensitive |
| `eleven_multilingual_v2` | Current quality tier | ~1–2s | 10,000 | 29 | NOT supported | Professional content, quality-first |
| `eleven_turbo_v2_5` | Available, superseded | Higher than flash | 40,000 | 32 | SUPPORTED | Legacy; migrate to flash_v2_5 |
| `eleven_flash_v2` | Current | ~75ms | 30,000 | English | SUPPORTED (primary) | The only fully phoneme-capable production model |
| `eleven_turbo_v2` | Available, superseded | — | — | English | SUPPORTED | Legacy English-only |

### Phoneme tag support — CRITICAL FINDING

SSML `<phoneme>` tags (IPA and CMU Arpabet) are supported **only on:**
- `eleven_flash_v2`
- `eleven_turbo_v2`
- `eleven_monolingual_v1` (deprecated)

**`eleven_v3` does NOT support phoneme tags.** Tags are silently skipped — no error thrown, just wrong pronunciation.

**`eleven_turbo_v2_5` DOES support phoneme tags** (it is the turbo-v2-series model, equivalent to flash series but with different latency). However ElevenLabs recommends migrating from turbo to flash models, so the forward-looking choice is `eleven_flash_v2` for any phoneme-critical generation.

### Migration note for Ryan Realty

CLAUDE.md locks `eleven_turbo_v2_5` as canonical. As of 2026-05-06, `eleven_turbo_v2_5` is still available in the API with no announced deprecation date. ElevenLabs documentation lists it as "superseded" by `eleven_flash_v2_5` for latency reasons, not functional removal. The locked CLAUDE.md setting is safe to keep for now.

**If phoneme IPA tags are required (Bend place names):** use `eleven_flash_v2` for that specific generation pass. The Victoria voice ID is the same; only the model changes.

### When to use which model

| Situation | Model | Reason |
|-----------|-------|--------|
| Standard production VO (all Ryan Realty video) | `eleven_turbo_v2_5` | Locked canonical; matches approved scorecards |
| Bend place name pronunciation correction needed | `eleven_flash_v2` | Only model with reliable phoneme IPA support |
| Cost-reduction bulk generation (future) | `eleven_flash_v2_5` | Lower latency, same cost tier, 40K char limit |
| Maximum expressiveness / emotional dialogue | `eleven_v3` | Best prosody — but no phoneme tags; use alias dictionary workaround |
| Real-time / streaming (future agent feature) | `eleven_flash_v2_5` | ~75ms latency |

---

## IPA phoneme library — Bend & Central Oregon

### How to apply phoneme tags

**Syntax (IPA — for `eleven_flash_v2` / `eleven_turbo_v2`):**
```xml
<phoneme alphabet="ipa" ph="IPA_STRING">Word</phoneme>
```

**Syntax (CMU Arpabet — preferred by ElevenLabs for reliability):**
```xml
<phoneme alphabet="cmu-arpabet" ph="CMU_STRING">Word</phoneme>
```

**ElevenLabs recommendation:** CMU Arpabet is "more predictable and consistent" than IPA in their current models. Use CMU when both options are available. IPA is used here for canonical documentation because it is language-standard; CMU alternatives are noted where known.

**For `eleven_v3` (no phoneme support):** use the Pronunciation Dictionary alias approach (see "Pronunciation Dictionary" section) or spell-out-phonetically for the place name (e.g., write "duh SHOOTS" instead of "Deschutes").

**Note:** Phoneme tags work **word-level only**. Multi-word place names require separate tags per word.

---

### Complete IPA library — verified against local sources

Sources used: Visit Bend official mispronunciation guide, University of Portland Oregon Pronunciation Guide, Wikipedia etymologies, Travel Oregon, howtopronounce.com audio cross-reference.

| Place | Plain text for script | IPA | CMU Arpabet | Canonical tag (IPA) | Notes |
|-------|----------------------|-----|-------------|---------------------|-------|
| **Deschutes** | Deschutes | dəˈʃuːts | d ah sh UW T S | `<phoneme alphabet="ipa" ph="dəˈʃuːts">Deschutes</phoneme>` | Confirmed: "duh-SHOOTS" — river and county. Common error: "deh-SHOOTS" or "des-CHOOTS". |
| **Tumalo** | Tumalo | ˈtʌməloʊ | T AH M ah L OW | `<phoneme alphabet="ipa" ph="ˈtʌməloʊ">Tumalo</phoneme>` | "TUM-uh-low" — like TUMS antacid + low. Confirmed by Visit Bend. NOT "TOO-muh-low". Means "wild plum" or "cold water" in Klamath. |
| **Tetherow** | Tetherow | ˈtɛðəroʊ | T EH DH er OW | `<phoneme alphabet="ipa" ph="ˈtɛðəroʊ">Tetherow</phoneme>` | "TETH-er-oh" — three syllables, stress on first. Named for pioneer Solomon Tetherow. Standard English pronunciation of the surname. |
| **Awbrey** | Awbrey | ˈɔːbri | AO B R IY | `<phoneme alphabet="ipa" ph="ˈɔːbri">Awbrey</phoneme>` | "AW-bree" — two syllables. Named for pioneer Marshall Clay Awbrey. Rhymes with "aubrey." Not on Visit Bend mispronunciation list = locals say it as spelled. |
| **Terrebonne** | Terrebonne | ˈtɛrəbɒn | T EH R ah B AO N | `<phoneme alphabet="ipa" ph="ˈtɛrəbɒn">Terrebonne</phoneme>` | "TERRA-bon" — confirmed by Visit Bend. NOT the French "tehr-BONE." Small town north of Redmond near Smith Rock. |
| **Sisters** | Sisters | ˈsɪstərz | S IH S T er Z | `<phoneme alphabet="ipa" ph="ˈsɪstərz">Sisters</phoneme>` | "SIS-terz" — standard English. No local twist. The Three Sisters mountains are the namesake. |
| **Redmond** | Redmond | ˈrɛdmənd | R EH D M ah N D | `<phoneme alphabet="ipa" ph="ˈrɛdmənd">Redmond</phoneme>` | "RED-mund" — standard English pronunciation. No local variation. |
| **Madras** | Madras | ˈmædrəs | M AE D R ah S | `<phoneme alphabet="ipa" ph="ˈmædrəs">Madras</phoneme>` | "MAD-russ" — confirmed by University of Portland guide. NOT "mah-DRAS" (the Indian city). Named after the cotton fabric, which was named after the Indian city, but the Oregon town uses the American cotton pronunciation. |
| **Prineville** | Prineville | ˈpraɪnvɪl | P R AY N V IH L | `<phoneme alphabet="ipa" ph="ˈpraɪnvɪl">Prineville</phoneme>` | "PRYNE-vil" — standard American pronunciation of the name. Two syllables effective, stress first. |
| **La Pine** | La Pine | lɑ ˈpaɪn | L AA P AY N | `<phoneme alphabet="ipa" ph="lɑ ˈpaɪn">La Pine</phoneme>` | "lah PINE" — two distinct words. Standard English. No French pronunciation — this is Central Oregon, not Louisiana. |
| **Sunriver** | Sunriver | ˈsʌnrɪvər | S AH N R IH V er | `<phoneme alphabet="ipa" ph="ˈsʌnrɪvər">Sunriver</phoneme>` | "SUN-riv-er" — compound word, stress on first syllable. No local variation. |
| **Bachelor** | Bachelor | ˈbætʃələr | B AE CH ah L er | `<phoneme alphabet="ipa" ph="ˈbætʃələr">Bachelor</phoneme>` | "BATCH-uh-ler" — Mt. Bachelor ski area. Standard English. |
| **Cascades** | Cascades | kæˈskeɪdz | k ae S K EY D Z | `<phoneme alphabet="ipa" ph="kæˈskeɪdz">Cascades</phoneme>` | "kaz-KAYDZ" — stress on second syllable. Standard English for the mountain range. |
| **Pilot Butte** | Pilot Butte | ˈpaɪlət bjuːt | P AY L ah T B Y UW T | `<phoneme alphabet="ipa" ph="ˈpaɪlət ˈbjuːt">Pilot Butte</phoneme>` | "PIE-lut BYOOT" — landmark cinder cone in central Bend. Standard English. |
| **Smith Rock** | Smith Rock | smɪθ rɒk | S M IH TH R AA K | `<phoneme alphabet="ipa" ph="smɪθ ˈrɒk">Smith Rock</phoneme>` | "SMITH ROCK" — standard English. No local quirk. World-class climbing destination. |
| **Crooked River** | Crooked River | ˈkrʊkɪd ˈrɪvər | K R UH K IH D R IH V er | `<phoneme alphabet="ipa" ph="ˈkrʊkɪd ˈrɪvər">Crooked River</phoneme>` | "CROO-kid RIV-er" — standard English. Tributary of the Deschutes. |
| **Drake Park** | Drake Park | dreɪk pɑːrk | D R EY K P AA R K | `<phoneme alphabet="ipa" ph="ˈdreɪk ˈpɑːrk">Drake Park</phoneme>` | "DRAYK PARK" — standard English. Downtown Bend park on the Deschutes. |
| **Old Mill District** | Old Mill District | oʊld mɪl ˈdɪstrɪkt | OW L D M IH L D IH S T R IH K T | `<phoneme alphabet="ipa" ph="ˈoʊld ˈmɪl ˈdɪstrɪkt">Old Mill District</phoneme>` | "OLD MILL DIS-trikt" — standard English. No variation. |
| **Newport Avenue** | Newport Avenue | ˈnjuːpɔːrt ˈævɪnjuː | N UW P AO R T AE V IH N Y UW | `<phoneme alphabet="ipa" ph="ˈnjuːpɔːrt ˈævɪnjuː">Newport Avenue</phoneme>` | "NOO-port AV-uh-nyoo" — standard English. |
| **Awbrey Butte** | Awbrey Butte | ˈɔːbri bjuːt | AO B R IY B Y UW T | `<phoneme alphabet="ipa" ph="ˈɔːbri ˈbjuːt">Awbrey Butte</phoneme>` | "AW-bree BYOOT" — neighborhood west of downtown. Named for same pioneer as Awbrey Hall. |
| **Skyline Forest** | Skyline Forest | ˈskaɪlaɪn ˈfɒrɪst | S K AY L AY N F AO R IH S T | `<phoneme alphabet="ipa" ph="ˈskaɪlaɪn ˈfɒrɪst">Skyline Forest</phoneme>` | "SKY-line FOR-est" — 33,000 acre tree farm/community forest west of Bend. Standard English. |
| **Westside** | Westside | ˈwɛstaɪd | W EH S T AY D | `<phoneme alphabet="ipa" ph="ˈwɛstaɪd">Westside</phoneme>` | "WEST-side" — Bend's western neighborhoods. Standard. |
| **Brooks Resources** | Brooks Resources | brʊks ˈriːsɔːrsɪz | B R UH K S R IY S AO R S IH Z | `<phoneme alphabet="ipa" ph="ˈbrʊks ˈriːsɔːrsɪz">Brooks Resources</phoneme>` | "BROOKS REE-sor-siz" — legacy developer of NW Bend neighborhoods including NorthWest Crossing. Named after Brooks-Scanlon lumber company. |
| **Caldera Springs** | Caldera Springs | kælˈdɛrə sprɪŋz | k ae L D EH R ah S P R IH NG Z | `<phoneme alphabet="ipa" ph="kælˈdɛrə ˈsprɪŋz">Caldera Springs</phoneme>` | "kal-DAIR-uh SPRINGZ" — resort community adjacent to Sunriver. Named for nearby Newberry Caldera. Stress on second syllable of caldera. |
| **Black Butte Ranch** | Black Butte Ranch | blæk bjuːt ræntʃ | B L AE K B Y UW T R AE N CH | `<phoneme alphabet="ipa" ph="ˈblæk ˈbjuːt ˈræntʃ">Black Butte Ranch</phoneme>` | "BLACK BYOOT RANCH" — resort community near Sisters. Standard English. |
| **Eagle Crest** | Eagle Crest | ˈiːɡəl krɛst | IY G ah L K R EH S T | `<phoneme alphabet="ipa" ph="ˈiːɡəl ˈkrɛst">Eagle Crest</phoneme>` | "EE-gul KREST" — resort near Redmond. Standard English. |
| **Three Sisters** | Three Sisters | θriː ˈsɪstərz | TH R IY S IH S T er Z | `<phoneme alphabet="ipa" ph="ˈθriː ˈsɪstərz">Three Sisters</phoneme>` | "THREE SIS-terz" — volcanic peaks. Originally named Faith, Hope, and Charity. Standard. |
| **Faith Hope and Charity** | Faith, Hope, and Charity | feɪθ hoʊp ænd ˈtʃærɪti | F EY TH H OW P AE N D CH EH R IH T IY | (none needed) | "FAYTH HOPE and CHAIR-uh-tee" — Three Sisters original names; also a Terrebonne winery. Fully standard English. |
| **Metolius** | Metolius | məˈtoʊliəs | m ah T OW L IY ah S | `<phoneme alphabet="ipa" ph="məˈtoʊliəs">Metolius</phoneme>` | "muh-TOE-lee-us" — confirmed by Visit Bend. River north of Sisters. Four syllables, stress on second. |
| **Paulina** | Paulina | pɒˈlaɪnə | p AO L AY N ah | `<phoneme alphabet="ipa" ph="pɒˈlaɪnə">Paulina</phoneme>` | "pol-EYE-nuh" — confirmed by Visit Bend and Visit Central Oregon. Middle syllable rhymes with "high." Named for Chief Paulina, Northern Paiute leader. NOT "paw-LEE-nuh." |
| **Newberry** | Newberry | ˈnjuːbɛri | N UW B EH R IY | `<phoneme alphabet="ipa" ph="ˈnjuːbɛri">Newberry</phoneme>` | "NOO-ber-ee" — Newberry National Volcanic Monument, Newberry Crater. Standard English surname. |
| **Klamath** | Klamath | ˈklæməθ | K L AE M ah TH | `<phoneme alphabet="ipa" ph="ˈklæməθ">Klamath</phoneme>` | "CLAM-ath" — confirmed University of Portland guide. Falls city and lake to south. NOT "kla-MATH." |
| **Willamette** | Willamette | wɪˈlæmɪt | W IH L AE M IH T | `<phoneme alphabet="ipa" ph="wɪˈlæmɪt">Willamette</phoneme>` | "will-LAMB-et" — confirmed multiple sources. Final -e is silent. The most common Oregon mispronunciation by newcomers. |
| **Oregon** | Oregon | ˈɔːrɪɡən | AO R ah G ah N | `<phoneme alphabet="ipa" ph="ˈɔːrɪɡən">Oregon</phoneme>` | "ORE-uh-gun" — confirmed University of Portland guide. NOT "or-ee-GONE." Final syllable is "gun" not "gone." |
| **Deschutes National Forest** | Deschutes National Forest | dəˈʃuːts ˈnæʃənəl ˈfɒrɪst | — | Same dəˈʃuːts tag on "Deschutes" | Apply phoneme tag to Deschutes only; rest is standard English. |
| **NorthWest Crossing** | NorthWest Crossing | nɔːrθˈwɛst ˈkrɒsɪŋ | N AO R TH W EH S T K R AO S IH NG | (none needed) | "NORTH-west CROSS-ing" — standard English. Brooks Resources master-planned community. |

### Place names with no pronunciation risk

These names require no phoneme tag — standard English pronunciation is correct and unambiguous:

- Bend, Oregon
- Redmond (confirmed standard)
- Sisters (confirmed standard)
- Smith Rock
- Drake Park
- Old Mill District
- NorthWest Crossing
- Westside / NE Bend / NW Bend
- Sunriver
- Bachelor (Mt. Bachelor)
- Eagle Crest
- Black Butte Ranch
- Three Sisters
- Faith, Hope, and Charity (winery name)

---

## Pronunciation Dictionary — cross-model solution for eleven_v3

When using `eleven_v3` (which does NOT support phoneme tags), use the Pronunciation Dictionary API with **alias rules** instead. Alias rules work across all models.

### How alias works

An alias rule tells ElevenLabs: "whenever you see this word, pronounce it as if it were spelled differently." For place names with phoneme issues, the alias phonetic spelling drives correct TTS output.

**Alias entry format (in .pls XML file):**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<lexicon version="1.0"
         xmlns="http://www.w3.org/2005/01/pronunciation-lexicon"
         alphabet="ipa" xml:lang="en-US">

  <lexeme>
    <grapheme>Deschutes</grapheme>
    <alias>duh SHOOTS</alias>
  </lexeme>

  <lexeme>
    <grapheme>Tumalo</grapheme>
    <alias>TUM uh low</alias>
  </lexeme>

  <lexeme>
    <grapheme>Terrebonne</grapheme>
    <alias>TERRA bon</alias>
  </lexeme>

  <lexeme>
    <grapheme>Paulina</grapheme>
    <alias>pol EYE nuh</alias>
  </lexeme>

  <lexeme>
    <grapheme>Metolius</grapheme>
    <alias>muh TOE lee us</alias>
  </lexeme>

  <lexeme>
    <grapheme>Klamath</grapheme>
    <alias>CLAM ath</alias>
  </lexeme>

  <lexeme>
    <grapheme>Willamette</grapheme>
    <alias>will LAM et</alias>
  </lexeme>

</lexicon>
```

### Attaching dictionary to a TTS request

```typescript
const response = await elevenlabs.textToSpeech.convert(voiceId, {
  text: scriptText,
  model_id: "eleven_v3",
  voice_settings: { stability: 0.50, similarity_boost: 0.75, style: 0.35, use_speaker_boost: true },
  pronunciation_dictionary_locators: [
    {
      pronunciation_dictionary_id: "ryan_realty_bend_oregon",
      version_id: "v1"
    }
  ]
});
```

---

## Forced alignment for caption sync

### Two endpoints — choose based on workflow

| Endpoint | When to use | Output |
|----------|-------------|--------|
| `POST /v1/text-to-speech/{voice_id}/with-timestamps` | Generating new VO from text (standard Ryan Realty workflow) | audio_base64 + character-level timestamps in one response |
| `POST /v1/forced-alignment` | You already have an MP3 from a prior TTS call and need timestamps separately | word-level timestamps with confidence scores |

**For Ryan Realty caption sync: use `/v1/text-to-speech/{voice_id}/with-timestamps`** — it generates audio and timing in a single request. No separate forced-alignment call needed when generating fresh VO.

### TTS with timestamps — full spec

**Endpoint:** `POST https://api.elevenlabs.io/v1/text-to-speech/{voice_id}/with-timestamps`

**Auth header:** `xi-api-key: YOUR_KEY`

**Request body:**
```json
{
  "text": "script line here",
  "model_id": "eleven_turbo_v2_5",
  "voice_settings": {
    "stability": 0.50,
    "similarity_boost": 0.75,
    "style": 0.35,
    "use_speaker_boost": true
  }
}
```

**Response structure:**
```json
{
  "audio_base64": "string",
  "alignment": {
    "characters": ["H", "e", "l", "l", "o", ...],
    "character_start_times_seconds": [0.0, 0.05, 0.10, ...],
    "character_end_times_seconds": [0.05, 0.10, 0.15, ...]
  },
  "normalized_alignment": {
    "characters": ["H", "e", "l", "l", "o", ...],
    "character_start_times_seconds": [0.0, 0.05, ...],
    "character_end_times_seconds": [0.05, 0.10, ...]
  }
}
```

**Key note:** This endpoint returns **character-level timestamps only** (not word-level). Caption components must group characters into words/chunks themselves.

### Forced alignment endpoint — spec (for pre-existing audio)

**Endpoint:** `POST https://api.elevenlabs.io/v1/forced-alignment`

**Auth header:** `xi-api-key: YOUR_KEY`

**Request:** `multipart/form-data`
- `file` (binary): Audio file, any major format, max 1GB
- `text` (string): Transcript to align. Plain text only — no JSON, no SSML markup

**Response structure:**
```json
{
  "characters": [
    { "text": "H", "start": 0.0, "end": 0.05 }
  ],
  "words": [
    { "text": "Hello", "start": 0.0, "end": 0.4, "loss": 0.012 }
  ],
  "loss": 0.015
}
```

**Key differences from with-timestamps:**
- Returns **word-level timestamps** (the `words` array) — the main reason to prefer this endpoint when you need word-level sync
- `loss` per word is a confidence score — values near 0 = high confidence alignment
- Maximum file size: 1GB; maximum duration: 10 hours
- Diarization NOT supported — don't pass speaker-labeled transcripts

### Which endpoint for CLAUDE.md §0.5 caption sync?

Per CLAUDE.md §0.5: "Caption timing syncs to natural speech cadence via ElevenLabs `/v1/forced-alignment` word-level timestamps."

**Recommended production pattern:**
1. Generate audio with `/v1/text-to-speech/{voice_id}` (standard, no timestamps endpoint)
2. Save MP3 to disk alongside script
3. Submit MP3 + script text to `/v1/forced-alignment`
4. Use the `words` array (word-level timestamps) to drive caption chunk rendering
5. Group 1–3 words per caption chunk per CLAUDE.md §0.5 spec

This two-step pattern is preferred over with-timestamps because:
- `/v1/forced-alignment` returns word-level timestamps (grouped) vs. character-level only from with-timestamps
- The forced-alignment `loss` field enables confidence-based quality checks
- MP3 can be pre-generated and cached; timestamps generated separately

**TypeScript pattern:**
```typescript
import fs from "fs";
import FormData from "form-data";
import axios from "axios";

async function getWordTimestamps(audioPath: string, transcript: string) {
  const form = new FormData();
  form.append("file", fs.createReadStream(audioPath), { contentType: "audio/mpeg" });
  form.append("text", transcript);

  const response = await axios.post(
    "https://api.elevenlabs.io/v1/forced-alignment",
    form,
    {
      headers: {
        ...form.getHeaders(),
        "xi-api-key": process.env.ELEVENLABS_API_KEY!,
      },
    }
  );

  return response.data.words as Array<{
    text: string;
    start: number;
    end: number;
    loss: number;
  }>;
}
```

---

## previous_text chaining pattern

### Why it matters

ElevenLabs processes each API call as an isolated context. Without chaining, the model doesn't know whether a sentence is the opening line or the 10th line of a narration — so pitch, energy, and cadence can shift between lines. `previous_text` gives the model the utterance that just ended so it can maintain consistent prosody into the current line.

### Canonical chaining pattern (TypeScript)

```typescript
interface VOLine {
  text: string;
  outputPath: string;
}

async function generateChainedVO(lines: VOLine[], voiceId: string) {
  let previousText = "";

  for (let i = 0; i < lines.length; i++) {
    const { text, outputPath } = lines[i];
    const nextText = i < lines.length - 1 ? lines[i + 1].text : "";

    const response = await elevenlabs.textToSpeech.convert(voiceId, {
      text,
      model_id: "eleven_turbo_v2_5",
      voice_settings: {
        stability: 0.50,
        similarity_boost: 0.75,
        style: 0.35,
        use_speaker_boost: true,
      },
      previous_text: previousText || undefined,
      next_text: nextText || undefined,
    });

    // Write audio to disk
    await writeStream(response, outputPath);

    // Advance chain
    previousText = text;
  }
}
```

### When to break the chain

- **Scene change:** if VO jumps from one visual concept to another (e.g., exterior tour to price reveal), start a new chain. The mood shift should be explicit.
- **Beat boundary with hard cut:** use `previous_text: ""` (or omit the parameter) to let the new segment start fresh.
- **Different delivery style:** e.g., switching from news-anchor to excited hook — break the chain so the deviation settings take effect cleanly.

### `previous_request_ids` alternative

For fine-grained prosody continuity, ElevenLabs also accepts `previous_request_ids` (array of up to 3 prior request IDs). This can be more reliable than `previous_text` when the generated audio is what matters (not the script text). Use whichever is available:

```typescript
{
  previous_request_ids: ["req_abc123", "req_def456"],
}
```

---

## Number-spelling for TTS ingestion

ElevenLabs TTS reads numbers phonetically. Always spell out for `eleven_turbo_v2_5` — `apply_text_normalization: "auto"` handles many cases but not all. Safe practice: always pre-process.

### Canonical rules

| Input | Speak as | Notes |
|-------|----------|-------|
| `$475,000` | `four hundred seventy-five thousand dollars` | Always spell currency and include "dollars" |
| `$3.2M` | `three point two million dollars` | Never abbreviate M/K |
| `$1.25M` | `one point two five million dollars` | |
| `475,000` | `four hundred seventy-five thousand` | No currency prefix = no "dollars" |
| `12%` | `twelve percent` | |
| `4.3` (months) | `four point three` | Always say "point" not "and" for decimals |
| `2.1%` | `two point one percent` | |
| `30` (days) | `thirty` | Plain integers under 1000: spell or use numeral (model handles) |
| `$3,025,000` | `three million twenty-five thousand dollars` | |
| `1st` | `first` | |
| `2nd` | `second` | |
| `Q1` | `first quarter` | Quarters must be spelled — model reads "Q one" |
| `YoY` | `year over year` | Abbreviations to spell out |
| `DOM` | `days on market` | |
| `MoS` | `months of supply` | |
| `2026` (year) | `twenty twenty-six` | Years: use "twenty" not "two thousand" |
| `January 2026` | `January twenty twenty-six` | Month + year pattern |
| `I-97` | `Interstate ninety-seven` | Highway refs |
| `US-20` | `Highway twenty` | |
| `sq ft` | `square feet` | |
| `3/2` (bed/bath) | `three bedroom two bath` | Never say "three slash two" |
| `97702` (zip) | `nine seven seven zero two` | Zip codes: digit by digit |

---

## Voice settings tuning (rare deviation cases)

The locked canonical settings (stability 0.50, similarity 0.75, style 0.35) match Matt's approved scorecards for standard content. Deviate only in these edge cases — and document the reason in the script file.

| Delivery mode | stability | similarity_boost | style | use_speaker_boost | When to use |
|---------------|-----------|-----------------|-------|-------------------|-------------|
| **Standard (all production)** | `0.50` | `0.75` | `0.35` | `true` | Default. Market reports, listing reels, neighborhood guides, area overviews. |
| **News-anchor / breaking** | `0.45` | `0.75` | `0.30` | `true` | News clips with urgent delivery. Slightly lower stability for more natural urgency; lower style to prevent over-acting. |
| **Excited hook (viral opener)** | `0.40` | `0.75` | `0.50` | `true` | First 2-3 seconds of hook-first viral content. Higher style for energized delivery. Use only on hook line; return to standard for body. |
| **Somber / serious market data** | `0.55` | `0.75` | `0.25` | `true` | Content about market slowdowns, cautionary data, or sensitive topics. Higher stability = steadier, less emotional; lower style = subdued. |
| **Long-form narration (60s+)** | `0.55` | `0.80` | `0.30` | `true` | Extended narrations where consistency > expressiveness. Higher stability prevents drift across long renders. |

**Never change:** `similarity_boost` below 0.70 (risks voice character loss) or `use_speaker_boost: false` (reduces voice similarity).

---

## Common failure modes

### 1. Place-name mispronunciation
**Symptom:** "Deschutes" sounds like "deh-SHOOTS" or "des-CHOOTS." "Tumalo" sounds like "TOO-mah-lo."
**Fix:** Insert phoneme tag or alias. Switch to `eleven_flash_v2` for the affected line if on `eleven_turbo_v2_5` — phoneme tags are confirmed to work on the flash_v2 model. Alternatively, write phonetically in the script text: "duh SHOOTS" instead of "Deschutes."

### 2. Mid-word fade or glitch artifacts
**Symptom:** A syllable cuts out mid-word, especially at chunk boundaries.
**Fix:** Ensure no sentence breaks mid-phrase. Each TTS call should contain a complete grammatical unit (at minimum a complete clause). Do NOT split "four hundred seventy-five" across two calls.

### 3. Speed creep on long sentences
**Symptom:** Delivery accelerates through a long sentence, rushing the end.
**Fix:** Break at natural clause boundaries. Two clauses max per VO line per CLAUDE.md. Comma placement controls pacing — add commas where you want a natural pause. Avoid more than ~18 words per TTS call.

### 4. Prosody drops between lines (disconnected clips)
**Symptom:** Adjacent VO lines feel like two different recordings — pitch shift, energy change.
**Fix:** Use `previous_text` chaining. Ensure the previous line's text is passed exactly as generated (no edits). If using `previous_request_ids`, ensure request IDs are stored immediately after each API call.

### 5. Numbers spoken incorrectly
**Symptom:** "$475,000" becomes "four hundred seventy five thousand" without "dollars"; "Q1" becomes "Q one."
**Fix:** Pre-process all numbers per the spelling table above. Set `apply_text_normalization: "off"` if you want full control and have pre-processed everything; use `"auto"` if you want the model to handle standard patterns and only pre-process edge cases.

### 6. Banned opening words in VO script
**Symptom:** Quality gate flags "stunning," "nestled," or "boasts."
**Fix:** Grep script for banned words before any TTS generation. Do not generate audio for a script that fails the banned-word check — the words will be spoken verbatim.

### 7. Phoneme tags silently skipped on wrong model
**Symptom:** You included `<phoneme>` tags but the place name is still wrong.
**Fix:** Confirm `model_id` is `eleven_flash_v2` (not `eleven_turbo_v2_5`, not `eleven_v3`). Phoneme tags are silently ignored on all other models. The only model with confirmed reliable phoneme support is `eleven_flash_v2`.

---

## Code pattern — full production VO generation (TypeScript)

Follows existing project conventions. Assumes `ELEVENLABS_API_KEY` and `ELEVENLABS_VOICE_ID` in `.env.local`.

```typescript
import ElevenLabs from "elevenlabs";
import fs from "fs";
import path from "path";

const VOICE_ID = process.env.ELEVENLABS_VOICE_ID!; // qSeXEcewz7tA0Q0qk9fH
const API_KEY = process.env.ELEVENLABS_API_KEY!;

const elevenlabs = new ElevenLabs({ apiKey: API_KEY });

// Canonical voice settings (locked per CLAUDE.md)
const VICTORIA_SETTINGS = {
  stability: 0.50,
  similarity_boost: 0.75,
  style: 0.35,
  use_speaker_boost: true,
} as const;

// Pre-process numbers for ingestion
function spellOutNumbers(text: string): string {
  return text
    .replace(/\$(\d+),(\d{3}),(\d{3})/g, (_, m, t, h) =>
      `${spellMillion(parseInt(m))} million ${spellThousands(parseInt(t))} thousand dollars`)
    .replace(/\$(\d+),(\d{3})/g, (_, t, h) =>
      `${spellThousands(parseInt(t))} thousand dollars`)
    .replace(/(\d+)%/g, (_, n) => `${n} percent`)
    .replace(/Q([1-4])/g, (_, q) => `${['first','second','third','fourth'][parseInt(q)-1]} quarter`);
  // ... extend as needed
}

interface ScriptLine {
  text: string;
  fileName: string;
  deliveryMode?: "standard" | "news" | "excited" | "somber";
}

async function generateVO(
  lines: ScriptLine[],
  outputDir: string,
): Promise<string[]> {
  const outputPaths: string[] = [];
  let previousText = "";

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const processedText = spellOutNumbers(line.text);
    const nextText = i < lines.length - 1
      ? spellOutNumbers(lines[i + 1].text)
      : "";

    // Delivery-mode overrides
    const settings = line.deliveryMode === "excited"
      ? { ...VICTORIA_SETTINGS, stability: 0.40, style: 0.50 }
      : line.deliveryMode === "somber"
      ? { ...VICTORIA_SETTINGS, stability: 0.55, style: 0.25 }
      : line.deliveryMode === "news"
      ? { ...VICTORIA_SETTINGS, stability: 0.45, style: 0.30 }
      : VICTORIA_SETTINGS;

    const audioStream = await elevenlabs.textToSpeech.convert(VOICE_ID, {
      text: processedText,
      model_id: "eleven_turbo_v2_5",
      voice_settings: settings,
      previous_text: previousText || undefined,
      next_text: nextText || undefined,
    });

    const outputPath = path.join(outputDir, line.fileName);
    const writeStream = fs.createWriteStream(outputPath);

    for await (const chunk of audioStream) {
      writeStream.write(chunk);
    }
    await new Promise((resolve, reject) => {
      writeStream.end(resolve);
      writeStream.on("error", reject);
    });

    outputPaths.push(outputPath);
    previousText = processedText; // advance chain
    console.log(`Generated: ${line.fileName}`);
  }

  return outputPaths;
}

// Forced alignment — word-level timestamps for caption sync
async function getWordTimestamps(
  audioPath: string,
  transcript: string,
): Promise<Array<{ text: string; start: number; end: number; loss: number }>> {
  const FormData = (await import("form-data")).default;
  const axios = (await import("axios")).default;

  const form = new FormData();
  form.append("file", fs.createReadStream(audioPath), {
    contentType: "audio/mpeg",
    filename: path.basename(audioPath),
  });
  form.append("text", transcript);

  const response = await axios.post(
    "https://api.elevenlabs.io/v1/forced-alignment",
    form,
    {
      headers: {
        ...form.getHeaders(),
        "xi-api-key": API_KEY,
      },
    },
  );

  return response.data.words;
}

// Group word timestamps into 1-3 word caption chunks
function buildCaptionChunks(
  words: Array<{ text: string; start: number; end: number }>,
  wordsPerChunk = 2,
) {
  const chunks = [];
  for (let i = 0; i < words.length; i += wordsPerChunk) {
    const slice = words.slice(i, i + wordsPerChunk);
    chunks.push({
      text: slice.map((w) => w.text).join(" "),
      startFrame: Math.round(slice[0].start * 30), // 30fps
      endFrame: Math.round(slice[slice.length - 1].end * 30),
    });
  }
  return chunks;
}
```

---

## Quick reference — production checklist

Before any VO generation:
- [ ] Script passes banned-word grep (stunning, nestled, boasts, charming, etc.)
- [ ] All numbers pre-processed per spelling table
- [ ] Place names: phoneme tags added if using `eleven_flash_v2`, OR alias dictionary attached if using `eleven_v3`
- [ ] `previous_text` chaining set up for multi-line scripts
- [ ] Model set to `eleven_turbo_v2_5` (canonical) unless phoneme tags required (use `eleven_flash_v2`)
- [ ] Forced alignment called post-generation to produce word-level timestamps for caption sync
- [ ] Caption chunks built from word timestamps (1–3 words per chunk, per CLAUDE.md §0.5)
