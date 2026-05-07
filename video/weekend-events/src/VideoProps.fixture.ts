// Studio fixture — placeholder data only.
// NO real verified event data. NO real photo credits.
// Real data lives in out/weekend-events-2026-05/script.json (provided separately).

import type { VideoProps } from './VideoProps'

export const fixtureProps: VideoProps = {
  aspect: '9x16',
  dateline: 'MAY 8-10, 2026',
  outroCta: 'MORE AT VISITBEND.COM/EVENTS',
  voPath: '',
  captionWords: [],
  beatDurations: [3.0, 5.0, 5.0, 5.0, 5.0, 5.0, 2.5],
  events: [
    {
      slug: 'event-beat-1',
      title: 'EVENT TITLE BEAT 1',
      date_time: 'Friday–Saturday · 5 PM',
      venue: 'Placeholder Venue',
      description: 'Placeholder description for beat 1.',
      photo_credit: 'Photo: Test Credit',
    },
    {
      slug: 'event-beat-2',
      title: 'EVENT TITLE BEAT 2',
      date_time: 'Friday · 7:30 PM',
      venue: 'Placeholder Venue',
      description: 'Placeholder description for beat 2.',
      photo_credit: 'Photo: Test Credit',
    },
    {
      slug: 'event-beat-3',
      title: 'EVENT TITLE BEAT 3',
      date_time: 'Saturday · 7:30 PM',
      venue: 'Placeholder Venue',
      description: 'Placeholder description for beat 3.',
      photo_credit: 'Photo: Test Credit',
    },
    {
      slug: 'event-beat-4',
      title: 'EVENT TITLE BEAT 4',
      date_time: 'Sunday · 10 AM',
      venue: 'Placeholder Venue',
      description: 'Placeholder description for beat 4.',
      photo_credit: 'Photo: Test Credit',
    },
    {
      slug: 'event-beat-5',
      title: 'EVENT TITLE BEAT 5',
      date_time: 'Sunday · 9 AM',
      venue: 'Placeholder Venue',
      description: 'Placeholder description for beat 5.',
      photo_credit: 'Photo: Test Credit',
    },
  ],
}
