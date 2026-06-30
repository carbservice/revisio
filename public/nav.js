/* Uniforme navigatiebalk op ELKE marketingpagina (één bron).
   Verbergt de losse per-pagina topbars (home, dienstpagina's, blog/faq) en
   plaatst overal exact dezelfde transparante witte nav, zoals op de homepage.
   Valt zacht terug: laadt dit script niet, dan blijft de oude nav gewoon staan. */
(function () {
  var V = 'https://revisio-umber.vercel.app';
  var LINKS = [
    ['Diensten', 'diensten.html'],
    ['Blog', 'blog.html'],
    ['FAQ', 'faq.html'],
    ['Volg je revisie', V + '/volg'],
    ['Shop', V + '/shop']
  ];

  var st = document.createElement('style');
  st.textContent = [
    'header.topbar{display:none!important}header.kop .topbar{display:none!important}',
    '.hero{padding-top:64px}',

    '#cbnav{position:absolute;top:0;left:0;right:0;z-index:60;font-family:Inter,system-ui,sans-serif;background:linear-gradient(180deg,rgba(0,0,0,.32),rgba(0,0,0,0))}',
    '#cbnav .in{max-width:1180px;margin:0 auto;padding:24px 22px;display:flex;align-items:center;justify-content:space-between;gap:14px}',
    '#cbnav a{text-decoration:none}',
    '#cbnav .logo img{height:34px;display:block}',
    '#cbnav .nav{display:flex;align-items:center;gap:22px;font-size:14.5px;font-weight:600}',
    '#cbnav .nav a.lk{color:rgba(255,255,255,.92)}#cbnav .nav a.lk:hover{color:#fff}',
    '#cbnav .ph{color:#fff;font-weight:700;white-space:nowrap}',
    '#cbnav .off{background:linear-gradient(135deg,#b8962e,#a07d1f);color:#fff;font-weight:700;padding:11px 20px;border-radius:999px;font-size:14px}',
    '#cbnav .hamb{display:none;background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.32);color:#fff;font-size:20px;width:44px;height:42px;border-radius:10px;cursor:pointer;line-height:1}',
    '#cbnav .mob{display:none;position:absolute;top:74px;left:16px;right:16px;background:rgba(16,42,31,.97);backdrop-filter:blur(8px);border:1px solid rgba(255,255,255,.16);border-radius:16px;padding:10px;box-shadow:0 22px 50px rgba(0,0,0,.42)}',
    '#cbnav .mob.open{display:flex;flex-direction:column}',
    '#cbnav .mob a{color:#fff;font-weight:700;font-size:16px;padding:13px 15px;border-radius:10px}',
    '@media(max-width:860px){#cbnav .nav a.lk,#cbnav .ph{display:none}#cbnav .hamb{display:inline-flex;align-items:center;justify-content:center}}'
  ].join('');
  document.head.appendChild(st);

  function aTag(t, h, cls) {
    var ext = h.indexOf('http') === 0 ? ' target="_blank" rel="noopener"' : '';
    return '<a class="' + cls + '" href="' + h + '"' + ext + '>' + t + '</a>';
  }
  var lijst = LINKS.map(function (l) { return aTag(l[0], l[1], 'lk'); }).join('');
  var tel = '<a class="ph" href="tel:+31653864208">📞 06 53864208</a>';
  var off = '<a class="off" href="home.html#aanvraag">Offerte</a>';

  var h = document.createElement('header');
  h.id = 'cbnav';
  h.innerHTML =
    '<div class="in">' +
      '<a class="logo" href="home.html"><img src="logo-wit.png" alt="Carburateur Service Nederland" onerror="this.outerHTML=&apos;CARBSERVICE&apos;"></a>' +
      '<nav class="nav">' + lijst + tel + off +
        '<button class="hamb" type="button" aria-label="Menu">☰</button>' +
      '</nav>' +
      '<div class="mob" id="cbmob">' + lijst +
        '<a href="tel:+31653864208">📞 06 53864208</a>' +
        '<a href="home.html#aanvraag">Offerte aanvragen</a>' +
      '</div>' +
    '</div>';
  document.body.insertBefore(h, document.body.firstChild);

  var hamb = h.querySelector('.hamb'), mob = h.querySelector('#cbmob');
  if (hamb) hamb.addEventListener('click', function () { mob.classList.toggle('open'); });
})();
