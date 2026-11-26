// Resolve the theme before first paint so the deep navy default never flashes light.
;(function () {
  var root = document.documentElement
  try {
    var stored = localStorage.getItem('marcoflow.theme')
    var resolved = stored
    if (!resolved) resolved = 'dark'
    else if (resolved === 'system') {
      resolved =
        window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
          ? 'dark'
          : 'light'
    }
    if (resolved !== 'light' && resolved !== 'dark') resolved = 'dark'
    root.dataset.theme = resolved
    root.style.colorScheme = resolved
  } catch (error) {
    root.dataset.theme = 'dark'
  }
})()
