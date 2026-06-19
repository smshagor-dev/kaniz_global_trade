const DEMO_TRANSLATIONS: Record<string, Record<string, string>> = {
  ar: {
    hello: 'مرحبا',
    price: 'السعر',
    shipment: 'الشحنة',
    sample: 'عينة',
  },
  es: {
    hello: 'Hola',
    price: 'Precio',
    shipment: 'Envío',
    sample: 'Muestra',
  },
  pt: {
    hello: 'Olá',
    price: 'Preço',
    shipment: 'Remessa',
    sample: 'Amostra',
  },
  zh: {
    hello: '你好',
    price: '价格',
    shipment: '货运',
    sample: '样品',
  },
  nl: {
    hello: 'Hallo',
    price: 'Prijs',
    shipment: 'Zending',
    sample: 'Monster',
  },
}

export async function translateText(text: string, targetLanguage: string) {
  const dictionary = DEMO_TRANSLATIONS[targetLanguage] || {}
  let translated = text

  Object.entries(dictionary).forEach(([from, to]) => {
    translated = translated.replace(new RegExp(from, 'gi'), to)
  })

  return {
    translatedText: translated,
    provider: 'local-dictionary',
    targetLanguage,
  }
}
