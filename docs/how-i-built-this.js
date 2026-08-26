function copyUrl() {
  var input = document.getElementById('share-url');
  input.select();
  input.setSelectionRange(0, 99999);
  navigator.clipboard.writeText(input.value).then(function() {
    var btn = document.getElementById('copy-btn');
    btn.textContent = 'Copied!';
    btn.classList.add('copied');
    setTimeout(function() {
      btn.textContent = 'Copy URL';
      btn.classList.remove('copied');
    }, 2000);
  });
}

document.getElementById('copy-btn').addEventListener('click', copyUrl);

// Mobile TOC toggle
(function() {
  var toggle = document.getElementById('toc-toggle');
  var toc = document.getElementById('article-toc');
  if (toggle && toc) {
    toggle.addEventListener('click', function() {
      toc.classList.toggle('open');
      toggle.classList.toggle('open');
    });
  }
})();

// Scroll-spy: highlight active TOC link
(function() {
  var links = document.querySelectorAll('.article-sidebar a');
  var sections = [];
  links.forEach(function(link) {
    var id = link.getAttribute('href').replace('#', '');
    var el = document.getElementById(id);
    if (el) sections.push({ id: id, el: el, link: link });
  });

  function onScroll() {
    var scrollPos = window.scrollY + 120;
    var active = null;
    for (var i = sections.length - 1; i >= 0; i--) {
      if (sections[i].el.offsetTop <= scrollPos) {
        active = sections[i];
        break;
      }
    }
    links.forEach(function(l) { l.classList.remove('active'); });
    if (active) active.link.classList.add('active');
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
})();
