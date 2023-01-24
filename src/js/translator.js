class Translator {
  static API = 'https://translate.googleapis.com/translate_a/single'

  translate(
    query,
    targetLang = 'ru',
    sourceLang = 'auto'
  ) {
    const params = {
      client: 'gtx',
      sl: sourceLang,
      tl: targetLang,
      hl: 'en-US',
      dt: ['t', 'bd'],
      dj: '1',
      source: 'bubble',
      tk: this.genToken(query),
      q: encodeURIComponent(query),
    }

    return this.request(params).then(this.parseResponse)
  }

  parseResponse(data) {
    return data.sentences.map(sentence => sentence.trans).join('')
  }

  genToken(query) {
    const Hc = function (a, b) {
      for (let c = 0; c < b.length - 2; c += 3) {
        let d = b.charAt(c + 2)
        d = 'a' <= d ? d.charCodeAt(0) - 87 : Number(d)
        d = '+' == b.charAt(c + 1) ? a >>> d : a << d
        a = '+' == b.charAt(c) ? (a + d) & 4294967295 : a ^ d
      }
      return a
    }

    let a = query
    let b = 0
    let d = ['']
    let e = []

    for (let f = 0, g = 0; g < a.length; g++) {
      let l = a.charCodeAt(g)
      128 > l
        ? (e[f++] = l)
        : (2048 > l
          ? (e[f++] = (l >> 6) | 192)
          : (55296 == (l & 64512) &&
            g + 1 < a.length &&
            56320 == (a.charCodeAt(g + 1) & 64512)
            ? ((l = 65536 + ((l & 1023) << 10) + (a.charCodeAt(++g) & 1023)),
              (e[f++] = (l >> 18) | 240),
              (e[f++] = ((l >> 12) & 63) | 128))
            : (e[f++] = (l >> 12) | 224),
            (e[f++] = ((l >> 6) & 63) | 128)),
          (e[f++] = (l & 63) | 128))
    }

    a = b
    for (let f = 0; f < e.length; f++) (a += e[f])
    a = Hc(a, '+-a^+6')
    a = Hc(a, '+-3^+b+-f')
    a ^= Number(d[1]) || 0
    0 > a && (a = (a & 2147483647) + 2147483648)
    a %= 1e6

    return a.toString() + '.' + (a ^ b)
  }

  request(params) {
    const endpoint = `${Translator.API}?${this.parseParams(params)}`
    return fetch(endpoint)
      .then((res) => res.json())
      .catch(console.error)
  }

  parseParams(params) {
    const result = []
    for (let param in params) {
      if (Array.isArray(params[param])) {
        params[param].forEach((p) => {
          result.push(`${param}=${p}`)
        })
      } else {
        result.push(`${param}=${params[param]}`)
      }
    }
    return result.join('&')
  }
}
