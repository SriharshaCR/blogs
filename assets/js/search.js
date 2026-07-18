(function () {
  var input = document.getElementById('search-input');
  var results = document.getElementById('search-results');
  if (!input || !results) return;

  var idx = null;
  var docs = [];

  // Base URL injected by Jekyll into the page
  var baseUrl = document.documentElement.dataset.baseurl || '';

  fetch(baseUrl + '/search.json')
    .then(function (r) { return r.json(); })
    .then(function (data) {
      docs = data;
      idx = lunr(function () {
        this.ref('id');
        this.field('title', { boost: 10 });
        this.field('description', { boost: 5 });
        this.field('content');
        data.forEach(function (doc) { this.add(doc); }, this);
      });
    })
    .catch(function () {
      results.innerHTML = '<p class="search-no-results">Search index unavailable.</p>';
    });

  function render(matches) {
    if (!matches.length) {
      results.innerHTML = '<p class="search-no-results">No results found.</p>';
      return;
    }
    results.innerHTML = matches.map(function (m) {
      var doc = docs.find(function (d) { return d.id === m.ref; });
      if (!doc) return '';
      return '<a href="' + doc.url + '" class="search-result-item">' +
        '<span class="search-result-title">' + doc.title + '</span>' +
        (doc.description ? '<span class="search-result-desc">' + doc.description + '</span>' : '') +
        '</a>';
    }).join('');
  }

  var timer;
  input.addEventListener('input', function () {
    clearTimeout(timer);
    var q = input.value.trim();
    if (!q) { results.innerHTML = ''; return; }
    timer = setTimeout(function () {
      if (!idx) return;
      try {
        render(idx.search(q + '~1'));
      } catch (e) {
        try { render(idx.search(q)); } catch (_) { results.innerHTML = ''; }
      }
    }, 180);
  });

  // Auto-focus and pre-fill from URL query param
  var params = new URLSearchParams(window.location.search);
  var q = params.get('q');
  if (q) { input.value = q; input.dispatchEvent(new Event('input')); }
  input.focus();
})();
