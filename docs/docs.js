(function () {
  var toggle = document.getElementById('toc-toggle');
  var sidebar = document.getElementById('toc-sidebar');
  if (toggle && sidebar) {
    toggle.addEventListener('click', function () {
      sidebar.classList.toggle('open');
      toggle.classList.toggle('open');
    });
  }

  // Active TOC link on scroll
  var headings = document.querySelectorAll('.docs-main h2[id], .docs-main .tool-category[id]');
  var tocLinks = document.querySelectorAll('.docs-sidebar a');

  function updateActiveToc() {
    var scrollPos = window.scrollY + 120;
    var current = '';
    headings.forEach(function (h) {
      if (h.offsetTop <= scrollPos) {
        current = h.getAttribute('id');
      }
    });
    tocLinks.forEach(function (a) {
      a.classList.remove('active');
      if (a.getAttribute('href') === '#' + current) {
        a.classList.add('active');
      }
    });
  }

  window.addEventListener('scroll', updateActiveToc, { passive: true });
  updateActiveToc();
})();

  (function(){
var PIPELINE = [
  {num:'01',name:'Harden',color:'var(--accent)',desc:'Sanitizes the input before anything else runs. Malformed or adversarial strings are caught here: the rest of the pipeline only ever sees clean input.',output:'A sanitized prompt string, safe for analysis.'},
  {num:'02',name:'Freemium Gate',color:'var(--orange)',desc:'Checks your lifetime quota, monthly quota, and per-minute rate limit. If you\'re over any limit, the request is rejected immediately with a clear message: it never reaches analysis.',output:'Allowed to proceed, or rejected with your current quota, remaining uses, and a link to upgrade.'},
  {num:'03',name:'Policy Gate',color:'var(--blue)',desc:'Enterprise only. Evaluates the prompt against your configured policy rules before analysis begins. In enforce mode, any blocking violation stops the request here with a full explanation.',output:'A pass: or a list of policy violations explaining exactly why the prompt was rejected.'},
  {num:'04',name:'Analyze',color:'var(--accent)',desc:'The core of the engine. Determines what the prompt is asking for, who it\'s for, how complex it is, what ambiguities exist, and what questions need answering before it can be compiled.',output:'A complete picture of the prompt: task type, goal, target audience, detected ambiguities, risk score, and any blocking questions.'},
  {num:'05',name:'Score',color:'var(--green)',desc:'Scores the prompt across 5 independent dimensions: Clarity, Specificity, Completeness, Constraints, and Efficiency: up to 20 points each. Every deduction has a traceable reason.',output:'A quality score from 0 to 100, plus a 9-item structural checklist showing exactly what\'s present and what\'s missing.'},
  {num:'06',name:'Compile',color:'var(--accent)',desc:'Produces the final structured prompt in your chosen output format: Claude XML, OpenAI system/user, or plain Markdown. Adds context the original prompt was missing: role, goal, constraints, workflow.',output:'The compiled prompt in your target format, ready to use, along with a list of changes made.'},
  {num:'07',name:'Estimate',color:'var(--orange)',desc:'Calculates token count and estimated cost across all supported providers. Then runs a two-step routing analysis to recommend which model best fits your task, risk level, budget, and latency needs.',output:'Cost breakdown across providers, a recommended model, estimated savings against a baseline, and the reasoning behind the recommendation.'},
  {num:'08',name:'Build &amp; Return',color:'var(--red)',desc:'Packages everything into the final result, saves the session, records usage, and writes to the audit trail (if enabled). Usage is only counted after a successful result: failed requests are never metered.',output:'The complete result: quality score, compiled prompt, cost estimate, detected issues, and a session ID you can use to refine or export later.'}
];

var flow = document.getElementById('pipeline-flow');
if(!flow) return;

PIPELINE.forEach(function(p, i){
  var node = document.createElement('div');
  node.className = 'pipe-node';
  var box = document.createElement('div');
  box.className = 'pipe-box';
  box.style.setProperty('--c', p.color);
  var num = document.createElement('div');
  num.className = 'pipe-num';
  num.textContent = p.num;
  var name = document.createElement('div');
  name.className = 'pipe-name';
  name.style.color = p.color;
  name.textContent = p.name;
  box.append(num, name);
  node.appendChild(box);
  node.addEventListener('click', function(){
    document.querySelectorAll('.pipe-node').forEach(function(n){n.classList.remove('active');});
    node.classList.add('active');
    showDetail(p);
  });
  flow.appendChild(node);
  if(i < PIPELINE.length - 1){
    var arrow = document.createElement('div');
    arrow.className = 'pipe-arrow';
    arrow.textContent = '\u2192';
    flow.appendChild(arrow);
  }
});

function showDetail(p){
  var detail = document.getElementById('pipe-detail');
  var content = document.getElementById('pipe-detail-content');
  content.replaceChildren();
  var h = document.createElement('h4');
  h.style.color = p.color;
  h.textContent = 'Phase ' + p.num + ': ' + p.name;
  var desc = document.createElement('p');
  desc.style.margin = '10px 0 16px';
  desc.textContent = p.desc;
  var wrap = document.createElement('div');
  var label = document.createElement('div');
  label.style.fontSize = '0.7rem';
  label.style.textTransform = 'uppercase';
  label.style.letterSpacing = '0.08em';
  label.style.color = 'var(--text-muted)';
  label.style.marginBottom = '8px';
  label.textContent = 'What you get back';
  var output = document.createElement('p');
  output.style.fontSize = '14px';
  output.style.color = 'var(--green)';
  output.style.background = 'var(--code-bg)';
  output.style.padding = '10px 14px';
  output.style.borderRadius = '8px';
  output.style.margin = '0';
  output.style.lineHeight = '1.5';
  output.textContent = p.output;
  wrap.append(label, output);
  content.append(h, desc, wrap);
  detail.style.display = 'block';
}

// Auto-show first phase
if(PIPELINE.length > 0){
  var firstNode = flow.querySelector('.pipe-node');
  if(firstNode){ firstNode.classList.add('active'); showDetail(PIPELINE[0]); }
}
  })();
