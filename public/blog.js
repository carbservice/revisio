/* Lightbox voor blogfoto's: een klik op een foto opent 'm groot IN BEELD,
   niet in een nieuw tabblad. Werkt voor galerij-links, de hero-foto en de
   carousel. De target="_blank"-links blijven als fallback als JS uitstaat. */
(function () {
  var lb = document.createElement('div');
  lb.className = 'blb';
  lb.innerHTML = '<span class="blb-x" aria-label="Sluiten">&times;</span><img alt="">';
  document.body.appendChild(lb);
  var lbImg = lb.querySelector('img');

  function toon(src, alt) {
    if (!src) return;
    lbImg.src = src; lbImg.alt = alt || '';
    lb.classList.add('on'); document.body.style.overflow = 'hidden';
  }
  function sluit() {
    lb.classList.remove('on'); document.body.style.overflow = ''; lbImg.src = '';
  }
  lb.addEventListener('click', function (e) {
    if (e.target === lb || e.target.classList.contains('blb-x')) sluit();
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') sluit(); });

  document.addEventListener('click', function (e) {
    var a = e.target.closest('a');
    if (a && /\.(jpe?g|png|webp|gif)$/i.test(a.getAttribute('href') || '')) {
      e.preventDefault();
      var img = a.querySelector('img');
      toon(a.getAttribute('href'), img ? img.alt : '');
      return;
    }
    var im = e.target.closest('img.hero-img, .bcarousel img');
    if (im) { e.preventDefault(); toon(im.getAttribute('src'), im.alt); }
  });
})();
