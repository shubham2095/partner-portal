// Apply the saved theme before first paint (no flash). First-time
// visitors always start in light mode; they can switch and it sticks.
;(function () {
  try {
    if (localStorage.getItem('partner-portal-theme') === 'dark') {
      document.documentElement.classList.add('dark')
    }
  } catch (e) {}
})()
