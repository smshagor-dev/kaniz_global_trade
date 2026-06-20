const GOOGLE_TRANSLATE_API_URL = 'https://translate.googleapis.com/translate_a/single'

function flattenGoogleTranslatePayload(payload: unknown): string {
  if (!Array.isArray(payload) || !Array.isArray(payload[0])) return ''
  return (payload[0] as Array<unknown>)
    .map((segment) => (Array.isArray(segment) ? String(segment[0] || '') : ''))
    .join('')
    .trim()
}

export async function translateText(text: string, targetLanguage: string, sourceLanguage = 'auto') {
  const url = new URL(GOOGLE_TRANSLATE_API_URL)
  url.searchParams.set('client', 'gtx')
  url.searchParams.set('sl', sourceLanguage)
  url.searchParams.set('tl', targetLanguage)
  url.searchParams.set('dt', 't')
  url.searchParams.set('q', text)

  try {
    const response = await fetch(url.toString(), {
      method: 'GET',
      cache: 'no-store',
      headers: {
        Accept: 'application/json,text/plain,*/*',
      },
    })

    if (!response.ok) {
      throw new Error(`Google Translate request failed with status ${response.status}`)
    }

    const payload = await response.json()
    const translatedText = flattenGoogleTranslatePayload(payload)

    if (!translatedText) {
      throw new Error('Google Translate returned an empty payload')
    }

    return {
      translatedText,
      provider: 'google-translate',
      targetLanguage,
      sourceLanguage,
    }
  } catch {
    return {
      translatedText: text,
      provider: 'fallback-original',
      targetLanguage,
      sourceLanguage,
    }
  }
}
