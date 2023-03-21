const LOCALIZATION_PRESETS = {
  'ru': './localization/ru.json',
  'en': './localization/en.json',
  'es': './localization/es.json',
}

const LANG_SORT_ORDER = {
  'ru': 1, 'en': 2, 'es': 3
}

const JSON_TYPE = 'application/json'

const SAVE_DELAY = 1000

let l10n = []
let l10nMap = {}
let saveTimer
let isTranslationTooltipShown = false

const translator = new Translator()

const dragAndDropNotice = document.querySelector('.drag-n-drop-notice')

const selectFileInput = document.createElement('input')
selectFileInput.type = 'file'
selectFileInput.accept = JSON_TYPE
selectFileInput.toggleAttribute('multiple', true)
selectFileInput.addEventListener('change', handleFiles)

const selectFilesLink = document.querySelector('.select-files')
selectFilesLink.addEventListener('click', (e) => {
  selectFileInput.click()
})

const popup = document.querySelector('.module-popup')
popup.addEventListener('wheel', preventDefault)
popup.addEventListener('click', clickPopupHandler)

const translationTooltip = document.querySelector('.translation-tooltip')
translationTooltip.addEventListener('click', copyBtnClickHandler)

const list = document.querySelector('.localization-entries')
list.addEventListener('click', previewClickHandler)
list.addEventListener('click', translateClickHandler)
list.addEventListener('click', moduleFoldingHandler)
list.addEventListener('input', entryChangeHandler)

const filterInput = document.querySelector('.filter-input')
filterInput.addEventListener('change', (e) => {
  document.documentElement.style.setProperty('--filter-display', filterInput.checked ? 'none' : 'contents')
  document.documentElement.classList.toggle('scrollbar', hasScrollbar())
})

const filterBtn = document.querySelector('.filter-btn')

document.documentElement.addEventListener('drop', handleFiles, true)
document.documentElement.addEventListener('dragover', (e) => {
  e.preventDefault()
  e.dataTransfer.dropEffect = 'move'
}, true)

document.addEventListener('keydown', (e) => {
  if (e.ctrlKey && e.code === 'KeyS') {
    e.preventDefault()

    if (l10n.length > 0) {
      const zip = new JSZip()

      l10n.map((l) => {
        const filename = `${l.lang}.json`
        const data = JSON.stringify(l.data, null, 4)
        const file = new File(
          [data], filename, { type: JSON_TYPE }
        )
        zip.file(file.name, file)
      })

      zip.generateAsync({ type: 'blob' })
        .then((content) => {
          saveAs(content, 'gpmod-localization.zip')
        })
    }
  }
  else if (e.code === 'Escape' && !popup.classList.contains('hidden')) {
    e.preventDefault()
    popup.classList.add('hidden')
  }
  else if (
    (e.code === 'Enter' || e.code === 'NumpadEnter')
    && !e.shiftKey
  ) {
    e.preventDefault()
    document.execCommand('insertLineBreak')
  }
})

document.addEventListener('pointerdown', (e) => {
  if (isTranslationTooltipShown) {
    if (!e.target.closest('.translation-tooltip')) {
      translationTooltip.classList.add('hidden')
      isTranslationTooltipShown = false
    }
  }
})

// loadLocalizationFiles()
//   .then((data) => {
//     l10n = data
//     sortLocalizations(l10n)
//     genLocalizationMap(l10n)
//     render(l10n)
//   })

Object.entries(localStorage).forEach(([lang, value]) => {
  if (LOCALIZATION_PRESETS[lang]) {
    const data = JSON.parse(value)
    const i = l10n.findIndex((l) => l.lang === lang)
    if (~i) {
      l10n[i] = { lang, data }
    } else {
      l10n.push({ lang, data })
    }
  }

  if (l10n.length > 0) {
    sortLocalizations(l10n)
    genLocalizationMap(l10n)
    render(l10n)
  }
})

function render(l10n) {
  dragAndDropNotice.classList.add('hidden')
  filterBtn.classList.remove('hidden')
  document.documentElement.style.setProperty('--filter-display', 'contents')

  list.innerHTML = ''

  const map = new Map()
  l10n.forEach(({ data }) => {
    Object.entries(data).forEach(([moduleName, entries]) => {
      let module = map.get(moduleName)
      if (!module) {
        module = new Set()
        map.set(moduleName, module)
      }
      Object.keys(entries).forEach((entryName) => module.add(entryName))
    })
  })

  const frag = document.createDocumentFragment()
  map.forEach((entries, moduleName) => {
    const moduleElem = document.createElement('div')
    moduleElem.className = 'module'
    moduleElem.dataset.name = moduleName

    const moduleTitle = document.createElement('div')
    moduleTitle.className = 'module-title'
    moduleTitle.textContent = formatModuleName(moduleName)
    moduleElem.appendChild(moduleTitle)

    const entriesElem = document.createElement('div')
    entriesElem.className = 'entries'
    moduleElem.appendChild(entriesElem)

    let isIncompleteModule = false

    entries.forEach((entryName) => {
      const isTitle = entryName.toLowerCase().endsWith('_ttl')

      const entryElem = document.createElement('div')
      entryElem.className = 'entry'
      entryElem.classList.toggle('title', isTitle)
      entryElem.dataset.name = entryName

      const name = document.createElement('div')
      name.className = 'entry-name'
      name.textContent = entryName
      entryElem.appendChild(name)

      const translationElem = document.createElement('div')
      translationElem.className = 'translations'
      entryElem.appendChild(translationElem)

      let isIncompleteEntry = false

      l10n.forEach(({ lang, data }) => {
        const t = data[moduleName]?.[entryName] ?? ''

        const translationEntry = document.createElement('div')
        translationEntry.className = 'translation-entry'
        translationEntry.dataset.lang = lang

        const langTitle = document.createElement('div')
        langTitle.className = 'language'
        langTitle.textContent = lang
        translationEntry.appendChild(langTitle)

        const translation = document.createElement('div')
        translation.className = 'translation'
        translation.innerText = t
        translation.setAttribute('contenteditable', 'true')
        translationEntry.appendChild(translation)

        const translate = document.createElement('div')
        translate.className = 'translate'
        translationEntry.appendChild(translate)

        l10n.forEach(({ lang: targetLang }) => {
          if (lang !== targetLang) {
            const btn = document.createElement('div')
            btn.className = 'translate-btn'
            btn.dataset.sourceLang = lang
            btn.dataset.targetLang = targetLang
            btn.dataset.module = moduleName
            btn.dataset.entry = entryName
            btn.textContent = targetLang
            translate.appendChild(btn)
          }
        })

        translationElem.appendChild(translationEntry)

        if (!t) {
          isIncompleteEntry = true
          isIncompleteModule = true
        }
      })

      if (isIncompleteEntry) {
        entryElem.classList.add('incomplete')
      }

      const preview = document.createElement('div')
      preview.className = 'preview-btn'
      preview.dataset.moduleName = moduleName
      preview.dataset.entryName = entryName
      preview.textContent = 'Show Preview'
      entryElem.appendChild(preview)

      entriesElem.appendChild(entryElem)
    })

    if (isIncompleteModule) {
      moduleElem.classList.add('incomplete')
    }

    const moduleFooter = document.createElement('div')
    moduleFooter.className = 'module-footer'
    moduleElem.appendChild(moduleFooter)

    list.appendChild(moduleElem)
  })

  list.appendChild(frag)

  document.documentElement.classList.toggle('scrollbar', hasScrollbar())
}

function formatModuleName(moduleName) {
  return moduleName
    .replace(/^GP/, '')
    .replace(/_$/, '')
    .split(/(?<![A-Z])(?=[A-Z])|(?=[A-Z]\B)/).join(' ')
}

function entryChangeHandler(e) {
  clearTimeout(saveTimer)

  const lang = e.target.parentElement.dataset.lang
  const moduleName = e.target.parentElement.parentElement.parentElement.parentElement.parentElement.dataset.name
  const entryName = e.target.parentElement.parentElement.parentElement.dataset.name
  // console.log(lang, moduleName, entryName)

  if (!l10nMap[lang][moduleName]) {
    l10nMap[lang][moduleName] = {}
  }

  l10nMap[lang][moduleName][entryName] = e.target.innerText

  saveTimer = setTimeout(() => {
    localStorage.setItem(lang, JSON.stringify(l10nMap[lang]))
  }, SAVE_DELAY)
}

function moduleFoldingHandler(e) {
  if (e.target.className !== 'module-title') return

  // const entriesElem = e.target.nextElementSibling
  // entriesElem.classList.toggle('hidden')

  const moduleElem = e.target.parentElement
  moduleElem.classList.toggle('folded')
}

function showPopup(img) {
  popup.innerHTML = ''
  popup.appendChild(img)
  popup.classList.remove('hidden')
}

async function loadPreview(moduleName, entryName) {
  const path = `./assets/preview/${moduleName}/${entryName}`
  try {
    const res = await fetch(`${path}.png`, { method: 'HEAD' })
    if (res.ok) {
      const img = new Image()
      img.className = 'preview-img'
      img.src = `${path}.png`
      img.onload = () => {
        img.style.aspectRatio = img.naturalWidth / img.naturalHeight
      }
      showPopup(img)
    } else {
      throw new Error(`Preview for "${entryName}" entry not found`)
    }
  } catch (err) {
    console.warn(err)
    // showPopup('video', `${path}.mp4`)
  }
}

function previewClickHandler(e) {
  if (e.target.className !== 'preview-btn') return
  const { moduleName, entryName } = e.target.dataset
  loadPreview(moduleName, entryName)
}

function translateClickHandler(e) {
  if (e.target.className !== 'translate-btn') return

  const { sourceLang, targetLang, module, entry } = e.target.dataset
  const query = l10nMap[sourceLang]?.[module]?.[entry]?.trim()
  if (!query) return

  translator.translate(query, targetLang, sourceLang)
    .then((data) => {
      showTranslationTooltip(data, e.target)
    })
}

function showTranslationTooltip(text, btn) {
  const { x: bx, y: by, width: bw } = btn.parentElement.getBoundingClientRect()
  translationTooltip.classList.remove('hidden')
  setTranslationTooltipText(text)

  const { width: tw, height: th } = translationTooltip.getBoundingClientRect()

  const tyPadding = 10

  const x = (bx + window.pageXOffset) + bw / 2 - tw / 2
  const y = (by + window.pageYOffset) - th - tyPadding

  translationTooltip.style.left = `${x}px`
  translationTooltip.style.top = `${y}px`

  isTranslationTooltipShown = true
}

function setTranslationTooltipText(text) {
  translationTooltip.firstElementChild.innerText = text
}

function copyBtnClickHandler(e) {
  if (e.target.className !== 'copy-btn') return
  const text = e.target.previousElementSibling.innerText.trim()
  if (text) {
    navigator.clipboard.writeText(text)
  }
}

// function loadLocalizationFiles() {
//   return Promise.all(
//     Object.entries(LOCALIZATION_PRESETS).map(
//       ([lang, url]) => fetch(url)
//         .then((res) => res.json())
//         .then((data) => ({ lang, data }))
//     )
//   )
// }

function handleFiles(e) {
  e.preventDefault()

  let files = e.target.files || e.dataTransfer.files
  if (!files?.length) return

  files = Array.from(files).filter((f) => (
    f.type === JSON_TYPE &&
    LOCALIZATION_PRESETS[f.name.slice(0, -5)]
  ))

  if (files.length) {
    Promise.all(
      files.map((file) => (
        new Promise((resolve) => {
          const lang = file.name.slice(0, -5)

          const reader = new FileReader()
          reader.addEventListener('loadend', (e) => {
            try {
              resolve({ lang, data: JSON.parse(reader.result) })
            } catch (err) {
              console.error('JSON load error')
            }
          })
          reader.readAsText(file)
        })
      ))
    ).then(loadLocalization)
  }
}

function loadLocalization(loc) {
  loc.forEach(({ lang, data }) => {
    const i = l10n.findIndex((l) => l.lang === lang)
    if (~i) {
      l10n[i] = { lang, data }
    } else {
      l10n.push({ lang, data })
    }
    localStorage.setItem(lang, JSON.stringify(data))
  })

  sortLocalizations(l10n)
  genLocalizationMap(l10n)
  render(l10n)
}

function sortLocalizations(l10n) {
  l10n.sort((a, b) => LANG_SORT_ORDER[a.lang] - LANG_SORT_ORDER[b.lang])
}

function genLocalizationMap(l10n) {
  const map = {}
  l10n.forEach((l) => {
    map[l.lang] = l.data
  })
  l10nMap = map
}

function preventDefault(e) {
  e.preventDefault()
}

function clickPopupHandler(e) {
  e.currentTarget.classList.add('hidden')
}

function hasScrollbar() {
  return document.documentElement.scrollHeight > document.documentElement.clientHeight
}
