/* Gedeelde aanvraagformulier-logica voor alle marketingpaginas
   (home + automotive + motorfiets + marine). Het formulier-HTML blijft
   PER PAGINA staan (snelste laadtijd, geen layout-sprong); dit bestand is
   het GEDRAG, op één plek. De globale namen hieronder (BACKEND, getTracking,
   gekozenFotos, kiesFotos, norm, checkKenteken) worden gebruikt door de
   inline verstuur()-functie van elke pagina. */

var BACKEND = "https://revisio-umber.vercel.app/api/aanvraag";

// Bron onthouden: bij binnenkomst gclid/utm/fbclid opslaan, zodat de bron
// bewaard blijft ook als iemand eerst rondklikt voor 'ie het formulier invult.
(function () {
  try {
    var p = new URLSearchParams(window.location.search);
    var keys = ['gclid', 'gad_source', 'fbclid', 'utm_source', 'utm_medium', 'utm_campaign'];
    if (keys.some(function (k) { return p.get(k); })) {
      var t = {}; keys.forEach(function (k) { if (p.get(k)) t[k] = p.get(k); });
      t.referrer = document.referrer || '';
      localStorage.setItem('cb_tracking', JSON.stringify(t));
    }
  } catch (e) {}
})();
function getTracking() { try { return JSON.parse(localStorage.getItem('cb_tracking') || '{}'); } catch (e) { return {}; } }

// Foto's in de browser verkleinen en als data-URL klaarzetten.
var gekozenFotos = [];
function compress(file, maxDim, quality) {
  return new Promise(function (resolve) {
    var img = new Image();
    img.onload = function () {
      var w = img.width, h = img.height;
      if (w >= h && w > maxDim) { h = Math.round(h * maxDim / w); w = maxDim; }
      else if (h > w && h > maxDim) { w = Math.round(w * maxDim / h); h = maxDim; }
      var c = document.createElement('canvas'); c.width = w; c.height = h;
      c.getContext('2d').drawImage(img, 0, 0, w, h);
      try { resolve(c.toDataURL('image/jpeg', quality)); } catch (err) { resolve(null); }
      URL.revokeObjectURL(img.src);
    };
    img.onerror = function () { resolve(null); };
    img.src = URL.createObjectURL(file);
  });
}
async function kiesFotos(e) {
  var files = Array.from(e.target.files || []);
  var teveel = files.length > 10;
  files = files.slice(0, 10);
  gekozenFotos = [];
  var prev = document.getElementById('fotoPreview'); if (prev) prev.innerHTML = '';
  for (var i = 0; i < files.length; i++) {
    if (!/^image\//.test(files[i].type)) continue;
    var data = await compress(files[i], 1280, 0.7);
    if (!data) continue;
    gekozenFotos.push(data);
    var im = document.createElement('img');
    im.src = data; im.alt = 'foto';
    im.style.cssText = 'width:62px;height:62px;object-fit:cover;border-radius:8px;border:1px solid #e2ded2';
    if (prev) prev.appendChild(im);
  }
  if (teveel) alert("Je kunt maximaal 10 foto's meesturen. De eerste 10 zijn gekozen.");
}

// Live kenteken-check bij de RDW (alleen op paginas met een kentekenveld).
function norm(s) { return (s || '').toUpperCase().replace(/[^A-Z0-9]/g, ''); }
async function checkKenteken() {
  var el = document.getElementById('f_kenteken'); if (!el) return;
  var k = norm(el.value);
  var box = document.getElementById('voertuiginfo'); if (box) box.style.display = 'none';
  if (k.length < 4) return;
  try {
    var r = await fetch('https://opendata.rdw.nl/resource/m9d7-ebf2.json?kenteken=' + k);
    var d = await r.json(); var x = d && d[0];
    if (x && box) {
      var bj = (x.datum_eerste_toelating || '').slice(0, 4);
      box.textContent = '✓ Dan is dit het voertuig: ' + [[x.merk, x.handelsbenaming].filter(Boolean).join(' '), bj, x.cilinderinhoud ? x.cilinderinhoud + ' cc' : ''].filter(Boolean).join(' · ');
      box.style.display = 'block';
    }
  } catch (e) {}
}
