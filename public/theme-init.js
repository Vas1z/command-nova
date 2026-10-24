/*
 * Applies the saved theme before React paints to avoid a flash.
 * This is a same-origin classic script, allowed by the extension CSP.
 */
(function () {
  try {
    var raw = localStorage.getItem('commandnova.settings.v1')
    var saved = raw ? JSON.parse(raw) : {}
    if (!saved || typeof saved !== 'object') saved = {}
    var mode = saved.theme
    var dark =
      mode === 'dark' ||
      (mode !== 'light' && window.matchMedia('(prefers-color-scheme: dark)').matches)
    document.documentElement.dataset.theme = dark ? 'dark' : 'light'
    document.documentElement.style.colorScheme = dark ? 'dark' : 'light'
  } catch (error) {
    document.documentElement.dataset.theme = 'light'
  }
})()
