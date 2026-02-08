export function captureEvent(event: string, properties: Record<string, unknown>) {
  const posthogKey = process.env.POSTHOG_KEY;
  const posthogHost = process.env.POSTHOG_HOST || "https://us.i.posthog.com";
  if (!posthogKey) return;

  fetch(`${posthogHost}/capture/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: posthogKey,
      event,
      properties
    })
  }).catch(() => {
    // Intentionally swallow analytics failures.
  });
}
