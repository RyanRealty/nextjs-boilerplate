type InngestEventPayload = {
  name: string
  data: Record<string, unknown>
}

async function sendEvent(event: InngestEventPayload): Promise<void> {
  const key = process.env.INNGEST_EVENT_KEY?.trim()
  if (!key) return
  await fetch('https://api.inngest.com/e/app/events', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({ events: [event] }),
  })
}

export const inngest = {
  send: sendEvent,
}
