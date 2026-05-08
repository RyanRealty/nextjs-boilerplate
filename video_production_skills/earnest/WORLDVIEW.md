# Worldview — Earnest.

The brand proposition, the category position, the founding principles, and the discipline that governs every story this series tells.

## The Worldview (one sentence)

Real estate is human emotion at every dimension, and Earnest. is the show that sees the emotion, names it, holds space for it, and refuses to look away.

Every other rule in this skill flows from that sentence. When in doubt, return to it.

## The Brand Architecture

Earnest. is a fully separate brand. It is not a Ryan Realty marketing property. It does not carry Ryan Realty visual identity, Ryan Realty typography, Ryan Realty color, or Ryan Realty messaging anywhere in the frame.

The Ryan Realty connection lives off-frame:
- A "Produced by Ryan Realty" credit on the Earnest. microsite About page
- A reference in the platform bio for viewers who go looking
- The lead-gen flow that follows when curious viewers click through

This is the **A24 model**. A24 doesn't put a parent-company logo on its films. The films earn the brand. People who care enough to look up who made *Everything Everywhere All at Once* find A24, and the brand authority compounds. Ryan Realty earns prestige by being the source of a piece of work too good to look away from, not by stamping its name on the work.

This is also the **BMW Films model** (the 2001-02 Clive Owen short films). BMW never said "drive a BMW" in any frame. The films were prestige cinema. Sales lifted 12% the year they ran. The brand authority did the work.

## The Category Gap

In residential real estate today:

- **Compass** owns lifestyle (agent personal brands, marketing-as-product).
- **Zillow** owns data (Zestimate, search-as-discovery).
- **Redfin** owns efficiency (commission disruption, tech-led brokerage).
- **The Agency** owns luxury (founder-led reality TV, celebrity-adjacent listings).
- **Open Door** owns convenience (instant offers, friction removal).

Nobody owns the inner life of the transaction. Nobody is doing prestige brand-first serialized drama. There is no *Black Mirror* of real estate. There is no *Modern Love* of real estate. There is no BMW Films of real estate. The category is wide open.

Earnest. is the play to occupy that empty territory before anyone else notices it is empty.

## The Three-Axis Framework

Every episode operates on three axes lifted from the academic literature on housing decisions (Bachelard's *Poetics of Space*, Lewicka on place attachment, Pauline Boss on ambiguous loss, Kahneman on loss aversion, Pillemer on inheriting siblings, Gottman on couples and shared meaning):

- **Identity.** What story is this house telling about who they are?
- **Security.** What threat is the transaction managing or producing?
- **Belonging.** Who is this person to the people they love, with or without this house?

A character who only operates on one axis is a stock figure. The dramatic real characters are the ones in whom the three axes are in conflict with each other.

Linda needs to leave for her identity (the marriage is over and she needs a third act), cannot leave for her security (the equity is her retirement), and will not leave for her belonging (her sister lives three blocks away). That is a character. That is a series.

Every Earnest. character must be buildable on this three-axis map, and the conflict between the axes is the engine of the episode.

## Season 1 Thematic Question

**"Why is this so hard?"**

Every Season 1 episode is a different position on that question. The brand earns authority by being the first one in the room to NAME the question every real-estate transaction is implicitly asking, and by treating the question with the seriousness the academic literature says it deserves.

Future seasons can carry different thematic questions:

- Season 2 candidate: "What did we think we were buying?" (the gap between the fantasy and the reality of homeownership)
- Season 3 candidate: "Who do you become here?" (identity as the thing the house authors)
- Season 4 candidate: "What does it cost to stay?" (the inverse of leaving)

The thematic question is the season's spine. Every character is a different position on it. Every plot is a stress-test of those positions. (Source: McKee's *Story* on theme; Truby's Moral Argument.)

## Structure: Anthology

Earnest. is anthology, not serial-arc. Each episode is a complete story. Different family, different scenario, different beat. Recurring cast walks across episodes (Linda from "The Empty Room" might appear silently in "The Open House" as one of six visitors), but no episode requires you to have seen another.

Why anthology is correct for Earnest.:

- A cold viewer can enter at any episode.
- The brand worldview does the through-line work that a recurring protagonist would do in a serial.
- Each episode is searchable, savable, shareable on its own merits.
- Production parallelism. Different episodes can be in different stages.
- Library compounds in value over years.
- Avoids the trust-collapse risk of single-protagonist series. One weak episode is one weak episode, not a season-long signal.

Reference models: *Black Mirror* (Charlie Brooker's "psychologically shared universe"), *Modern Love* (NYT), *Love Death + Robots*, BMW Films "The Hire."

## The No-Broker-On-Screen Rule (non-negotiable)

Locked in CLAUDE.md and `~/.claude/projects/-Users-matthewryan-RyanRealty/memory/feedback_brand_first_not_broker_first.md`:

- Matt's avatar, voice, image, persona NEVER on screen, never in the audio, never the constant.
- No broker character at all. The brokerage is implied in the act of curation, not in any avatar. Earnest. operates the way a god operates in Greek tragedy: omnipresent, never embodied.
- The brand's only visible presence in any frame is the "Earnest." wordmark in the cold open and end card. No other Earnest. branding in-frame.
- The brand's audible presence is The Voice (the unseen narrator).
- Future agents joining Ryan Realty inherit the off-frame brand authority through the show; the show does not inherit any one agent's brand.

This rule is what makes Earnest. defensible long-term. A series anchored on a face cannot survive that person leaving. A series anchored on the worldview compounds value indefinitely.

## The Voice (the brand made audible)

The unseen omniscient narrator. Built once via Hume Octave 2 Voice Design with a long natural-language prompt. Saved as a custom voice ID. Locked, never edited.

Voice prompt (working draft, refine as needed):
> "Mid-40s American voice. Slightly weathered timbre, attentive listener, pauses to think before speaking. Literate but never literary. Wry without being arch. Warmth that earns trust without selling. Reads like someone who has noticed the thing you missed. Sarah Koenig's attentiveness, Ira Glass's confidence, Anthony Bourdain's restraint. Never preachy. Never explanatory. Never breaks the spell."

Why Hume Octave 2 over ElevenLabs for the Narrator:
- Hume's Voice Design is the only platform in 2026 that interprets natural-language voice prompts as semantic direction (warmth, attentiveness, restraint as actual model parameters, not just speed/pitch sliders).
- Octave 2's Acting Instructions per line let us direct subtle emotional shifts (`[contemplative]`, `[wry]`, `[long pause, then quiet]`) better than ElevenLabs's audio-tag grammar.
- No real-actor licensing required. Custom voice ID locked at design time.

The Voice's discipline:
- Speaks only where her presence adds something the visual cannot deliver. Default position: silent.
- Speaks in short sentences. One clause max. No commas where Matt would not pause. No AI filler. No hedging.
- Numbers spelled out for ingestion ("475,000" → "four hundred seventy five thousand").
- IPA phoneme tags for tricky place names (Deschutes, Tumalo, Tetherow, Awbrey, Terrebonne, Paulina, Madras) per `video_production_skills/elevenlabs_voice/SKILL.md` IPA conventions, adapted for Hume.
- Never says her own name. Never says "Earnest." Never says "Ryan Realty." Never says "real estate" or "broker."
- Maximum total Voice runtime per episode: 20 seconds out of 60. If The Voice is on screen more than that, the visual is failing.

## Recurring Cast (voiced separately)

The 15+ recurring characters are cast from the **ElevenLabs Voice Library** (Eleven v3, GA March 14, 2026). Each character locked to a stable Voice ID in `cast.json`. Voice IDs never edited.

Why ElevenLabs for the cast:
- The Voice Library has 10,000+ public voices to cast from.
- Eleven v3's audio-tag grammar (`[whispers]`, `[crying]`, `[sighs]`, `[sarcastic]`, etc.) inline in the script.
- Text-to-Dialogue API handles native overlap and cross-talk for ensemble scenes (the three siblings rivalry in Episode 2, the Cassidys signing simultaneously in Episode 5).
- Studio 3.0 timeline editor with per-fragment voice assignment.
- Forced-alignment endpoint for caption sync.

Specialty pickups for emotionally heaviest lines (Linda's grief whisper, Carlos's voice cracking at the closing table) get rendered through Hume Octave 2 with plain-English Acting Instructions, time-aligned with WhisperX, dropped into the Eleven Studio timeline.

AI voice disclosure: "Voices generated using AI models" appears in the credits crawl on the microsite episode page. Disclosed, never concealed.

## Visual Identity

See `BRAND_SYSTEM.md` for the complete spec. Summary:

- 1080×1920 portrait (TikTok / Reels / Shorts native), 30 fps, h264 + aac, file under 100 MB.
- Length: 45-60 seconds. Long-form companion handled separately.
- Aesthetic: stylized AI cinema — claymation, Lego, paper craft, or a custom style chosen per season. Hyperreal materiality, sub-surface scattering, 35mm anamorphic, Lego Movie / Aardman / Pixar reference depending on choice. (Season 1 aesthetic locked in `PRODUCTION_PIPELINE.md`.)
- Color palette: Ink `#0B0F14`, Bone `#E8E2D6`, Bruise `#3D2E3F`, Ember `#B25535`. No additions.
- Typography: Inter Display (display) + Editorial New (pull-quotes) + Inter (body and captions). All free or trial.
- Captions: per CLAUDE.md §0.5 with Earnest. styling (Bone on Ink-pill 70% opacity, Ember active-word highlight).
- The "Earnest." wordmark in the cold open and end card is the entire brand presence on screen. No logo, no phone, no agent name, no URL, no Ryan Realty mention in any frame.

## Anti-Slop Application

Every Earnest. episode clears `video_production_skills/ANTI_SLOP_MANIFESTO.md` before publish:

- No banned words (stunning, nestled, charming, breathtaking, must-see, dream home, meticulously maintained, entertainer's dream, tucked away, hidden gem, truly, spacious, cozy, luxurious, updated throughout). Full list in CLAUDE.md.
- No AI filler (delve, leverage, navigate, robust, seamless, comprehensive, elevate, unlock, tapestry).
- No em-dashes, no semicolons.
- Every figure (price, market stat, neighborhood claim, square footage, days on market) traces to a verified source per CLAUDE.md §0.
- Fair-housing review on every script. No language that excludes by protected class, family status, source of income, or race-coded neighborhood claims.
- AI disclosure in credits crawl on microsite episode page. The series stands on its craft, not on deception.
- Minimum scorecard 80/100 against `video_production_skills/VIRAL_GUARDRAILS.md`.

## Compounding the Universe

Every episode adds to a permanent library. Characters compound. Themes compound. The brand authority compounds.

- Year 1: Season 1 plus a few one-off specials. Substack at 100-1,000 paid subs.
- Year 2: Three more seasons. Recurring characters appear in multiple seasons. Substack at 1,000-3,000 paid subs. First festival prize.
- Year 3: A "universe map" emerges. The Tomlinsons are now the show's anchor family. Linda has moved to her downsized condo and reappears as a sage minor character in another family's story. Discord community 5,000+ members.
- Year 5: Earnest. is the prestige brand-first serialized drama in real estate. Tribeca / SXSW / Apple TV+ Shorts conversation in motion. Ryan Realty inherits compounding authority by being the show's quiet producer of record.

The discipline is patience. We do not chase virality on any single episode. We build a body of work that, in aggregate, makes the brand undeniable.
