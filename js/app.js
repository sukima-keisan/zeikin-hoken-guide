// ふりがな・ベトナム語の切りかえ と 給料の計算機
(function () {
  const root = document.documentElement;
  const KEY = { furigana: 'zg-furigana', vi: 'zg-vi' };
  function apply(name, on) {
    root.classList.toggle(name === 'furigana' ? 'no-furigana' : 'show-vi', name === 'furigana' ? !on : on);
    document.querySelectorAll(`[data-toggle="${name}"]`).forEach(b => b.setAttribute('aria-pressed', String(on)));
  }
  const saved = { furigana: localStorage.getItem(KEY.furigana) !== '0', vi: localStorage.getItem(KEY.vi) === '1' };
  apply('furigana', saved.furigana);
  if (document.querySelector('[data-toggle="vi"]')) apply('vi', saved.vi);
  document.querySelectorAll('[data-toggle]').forEach(b => b.addEventListener('click', () => {
    const name = b.dataset.toggle, on = b.getAttribute('aria-pressed') !== 'true';
    apply(name, on);
    localStorage.setItem(KEY[name], on ? '1' : '0');
  }));

  // 広い画面では メニューを いつも 開いておく（せまい 画面では とじる）
  const navBox = document.querySelector('details.nav');
  if (navBox && window.matchMedia) {
    const wide = window.matchMedia('(min-width:720px)');
    const syncNav = () => { navBox.open = wide.matches; };
    syncNav();
    wide.addEventListener('change', syncNav);
  }

  // 計算機（給料明細のページだけ）
  const form = document.getElementById('calc-form');
  if (!form || !window.ZeiCalc) return;
  const yen = n => n.toLocaleString('ja-JP');
  const $ = id => document.getElementById(id);
  function run() {
    const salary = Math.floor(Number($('c-salary').value) || 0);
    const r = ZeiCalc.meisai({
      salary,
      kenpoRate: Number($('c-pref').value),
      over40: form.querySelector('[name="c-age"]:checked').value === '1',
      fuyo: Number($('c-fuyo').value),
      juminzei: form.querySelector('[name="c-jumin"]:checked').value === '1',
    });
    const ng = salary < 80000 || salary > 800000 || r.shotoku === null;
    $('c-error').hidden = !ng;
    $('c-result').hidden = ng;
    if (ng) return;
    r.zei = r.shotoku + r.jumin;
    document.querySelectorAll('[data-o]').forEach(el => { el.textContent = yen(r[el.dataset.o]); });
    const seg = { tedori: r.tedori, shaho: r.shaho, zei: r.zei };
    document.querySelectorAll('#c-stack [data-seg]').forEach(el => {
      const v = seg[el.dataset.seg];
      el.style.flex = String(v);
      el.querySelector('b').textContent = yen(v);
    });
  }
  form.addEventListener('input', run);
  form.addEventListener('change', run);
  run();
})();
