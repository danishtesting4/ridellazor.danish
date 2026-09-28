// ── window controls (shared by every page under pages/) ─────────
(function () {
  const term = document.getElementById('term');
  const desktop = document.getElementById('desktop');
  if (!term || !desktop) return;

  const btnMin = document.getElementById('btnMin');
  const btnMax = document.getElementById('btnMax');
  const btnClose = document.getElementById('btnClose');
  const restoreBtn = document.getElementById('restoreBtn');

  function openDesktop() {
    term.classList.add('closing');
    setTimeout(() => {
      term.classList.add('hidden');
      term.classList.remove('closing');
      desktop.classList.add('active');
    }, 220);
  }

  function restoreTerm() {
    desktop.classList.remove('active');
    term.classList.remove('hidden');
  }

  btnMin.addEventListener('click', openDesktop);
  btnClose.addEventListener('click', openDesktop);
  btnMax.addEventListener('click', () => term.classList.toggle('maximized'));
  restoreBtn.addEventListener('click', restoreTerm);

  window.restoreTerm = restoreTerm;
})();
