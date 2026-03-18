import qs from 'querystring'

let id = 0
const SYNC_STORAGE_LIMIT_SIZE = 5 * 1024
const SDK_PROMPT_PREFIX = '____sdk____'

function readJSONStorage(key, fallback = {}) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch (e) {
    return fallback
  }
}

function toSyncResult(payload, msg) {
  return JSON.stringify({
    command: 'GET_ASSDK_RES',
    ext: payload,
    msg
  })
}

function sdkSuccess(payload, extra = {}) {
  return toSyncResult(payload, {
    errMsg: `${payload.sdkName}:ok`,
    ...extra
  })
}

function sdkFail(payload, reason = '') {
  return toSyncResult(payload, {
    errMsg: `${payload.sdkName}:fail${reason ? ` ${reason}` : ''}`
  })
}

function getSystemInfo() {
  return {
    model: /iPhone/.test(navigator.userAgent) ? 'iPhone6' : 'Android',
    pixelRatio: window.devicePixelRatio || 1,
    windowWidth: window.innerWidth || 0,
    windowHeight: window.innerHeight || 0,
    language: window.navigator.userLanguage || window.navigator.language,
    platform: 'wept',
    version: '6.3.9'
  }
}

function processSyncSdk(payload) {
  const sdkName = payload.sdkName
  const args = payload.args || {}
  const directory = (window.__wxConfig__ && window.__wxConfig__.directory) || '__wept__'
  const dataKey = directory
  const typeKey = `${directory}_type`
  const values = readJSONStorage(dataKey)
  const types = readJSONStorage(typeKey)

  if (sdkName === 'setStorageSync') {
    if (args.key == null || args.data == null) return sdkFail(payload)
    values[args.key] = args.data
    types[args.key] = args.dataType
    localStorage.setItem(dataKey, JSON.stringify(values))
    localStorage.setItem(typeKey, JSON.stringify(types))
    return sdkSuccess(payload)
  }

  if (sdkName === 'getStorageSync') {
    if (args.key == null || args.key === '') return sdkFail(payload)
    return sdkSuccess(payload, { data: values[args.key], dataType: types[args.key] })
  }

  if (sdkName === 'removeStorageSync') {
    if (args.key == null || args.key === '') return sdkFail(payload)
    delete values[args.key]
    delete types[args.key]
    localStorage.setItem(dataKey, JSON.stringify(values))
    localStorage.setItem(typeKey, JSON.stringify(types))
    return sdkSuccess(payload)
  }

  if (sdkName === 'clearStorageSync') {
    localStorage.removeItem(dataKey)
    localStorage.removeItem(typeKey)
    return sdkSuccess(payload)
  }

  if (sdkName === 'getStorageInfoSync') {
    let currentSize = 0
    Object.keys(localStorage).forEach(key => {
      const value = localStorage.getItem(key) || ''
      currentSize += (value.length * 2) / 1024
    })
    return sdkSuccess(payload, {
      keys: Object.keys(values),
      limitSize: SYNC_STORAGE_LIMIT_SIZE,
      currentSize: Math.ceil(currentSize)
    })
  }

  if (sdkName === 'getSystemInfoSync' || sdkName === 'getSystemInfo') {
    return sdkSuccess(payload, getSystemInfo())
  }

  return sdkFail(payload, 'not supported')
}

function installSyncPromptBridge(iframeEl) {
  try {
    Object.defineProperty(iframeEl.contentWindow, 'prompt', {
      configurable: true,
      get: function () {
        return function (request) {
          if (typeof request !== 'string' || request.indexOf(SDK_PROMPT_PREFIX) !== 0) {
            return toSyncResult({ callbackID: -1, sdkName: 'prompt' }, { errMsg: 'prompt:fail invalid request' })
          }
          let payload
          try {
            payload = JSON.parse(request.replace(/^____sdk____/, ''))
          } catch (e) {
            return toSyncResult({ callbackID: -1, sdkName: 'prompt' }, { errMsg: 'prompt:fail invalid json' })
          }
          return processSyncSdk(payload)
        }
      }
    })
  } catch (e) {
    console.warn(`Failed to install prompt bridge for ${iframeEl.id}: ${e.message}`)
  }
}

export function uid () {
  return id++
}

export function createFrame(id, src, hidden, parent = document.body) {
  let el = document.createElement('iframe')
  el.setAttribute('src', src)
  el.setAttribute('id', id)
  el.setAttribute('name', id)
  el.setAttribute('seamless', "seamless")
  el.setAttribute('sandbox', "allow-scripts allow-same-origin allow-forms allow-modals")
  el.setAttribute('frameborder', "0")
  el.setAttribute('width', hidden ? "0": "100%")
  el.setAttribute('height', hidden ? "0": "100%")
  if (hidden) {
    el.setAttribute('style', 'width:0;height:0;border:0; display:none;')
  }
  parent.appendChild(el)
  installSyncPromptBridge(el)
  return el
}

export function parsePath(path) {
  let parts = path.split(/\?/)
  return {
    path: parts[0],
    query: qs.parse(parts[1])
  }
}

export function validPath(p) {
  let pages = window.__wxConfig__.pages
  let {path} = parsePath(p)
  return pages.indexOf(path) !== -1
}

export function isTabbar(url) {
  let list = window.__wxConfig__.tabBar && window.__wxConfig__.tabBar.list
  if (!list) return
  let pages = list.map(o => o.pagePath)
  return pages.indexOf(url) !== -1
}

export function reload() {
  location.reload()
}

export function navigateHome() {
  let home = `${location.protocol}//${location.host}`
  if (typeof location.replace == 'function') {
    location.replace(home)
  } else if (typeof history.replaceState == 'function') {
    window.history.replaceState({}, '' , home)
    location.reload()
  } else {
    location.hash = '#'
    location.reload()
  }
}

export function redirectTo(url) {
  let home = `${location.protocol}//${location.host}`
  if (typeof history.replaceState == 'function') {
    history.replaceState({}, '', `${home}#!${url}`)
  }
}

export function getRedirectData(url, webviewID) {
  return {
    to: 'backgroundjs',
    msg: {
      eventName: 'publish_INVOKE_METHOD',
      data: {
        data: {
          name: 'navigateTo',
          args: {
            url: url
          }
        },
        options: {
          timestamp: Date.now()
        }
      }
    },
    comefrom: 'webframe',
    webviewID: webviewID
  }
}

export function dataURItoBlob(dataURI) {
  // convert base64 to raw binary data held in a string
  // doesn't handle URLEncoded DataURIs - see SO answer #6850276 for code that does this
  var byteString = atob(dataURI.split(',')[1])

  // separate out the mime component
  var mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0]

  // write the bytes of the string to an ArrayBuffer
  var ab = new ArrayBuffer(byteString.length)
  var ia = new Uint8Array(ab)
  for (var i = 0; i < byteString.length; i++) {
  ia[i] = byteString.charCodeAt(i)
  }

  // write the ArrayBuffer to a blob, and you're done
  var bb = new Blob([ab], {type: mimeString})
  return URL.createObjectURL(bb)
}

export function range(n, start = 0, suffix = '') {
  const arr = []
  for (let i = start; i <= n; i++) {
    arr.push(i < 10 ? `0${i}${suffix}` : `${i}${suffix}`)
  }
  return arr
}

export function toNumber(arr) {
  if (Array.isArray(arr)) return arr.map(n => Number(n))
  if (typeof arr === 'string') return Number(arr)
  return arr
}

export function warn(msg) {
  if (process.env.NODE_ENV != 'production') {
    console.warn(msg)
  }
}

export function isAbs(url) {
  return /^http/.test(url)
}
