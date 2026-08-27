  (function(){
const DEMOS = [
  {
    input: 'make the code better',
    delay: 55,
    result: [
      { cls:'bad', text:'\u26D4 Blocking question:' },
      { cls:'bad', text:'   "Which file or function should change?"' },
      { cls:'bad', text:'   "What specific improvement is needed?"' },
      { cls:'', text:'' },
      { cls:'warn', text:'Score:  48/100 \u2192 ANALYZING' },
      { cls:'warn', text:'Risk:   medium (vague objective detected)' },
      { cls:'info', text:'Task:   other' }
    ]
  },
  {
    input: 'Refactor src/auth/middleware.ts to reduce P99\nlatency below 100ms. Do not touch the DB layer.\nPreserve all existing tests.',
    delay: 35,
    result: [
      { cls:'good', text:'\u2713 State:   COMPILED' },
      { cls:'good', text:'\u2713 Score:   90/100  (+29)' },
      { cls:'info', text:'  Task:    refactor' },
      { cls:'info', text:'  Risk:    high (auth domain)' },
      { cls:'info', text:'  Model:   claude-opus-5 (recommended)' },
      { cls:'good', text:'  Files:   src/auth/middleware.ts' }
    ]
  }
];
var demoIdx = 0, demoTimer = null;
function runDemo(demo) {
  var inp = document.getElementById('demo-input');
  var out = document.getElementById('demo-output');
  if (!inp || !out) return;
  inp.textContent = '';
  out.replaceChildren();
  inp.classList.add('cursor-blink');
  var i = 0;
  clearInterval(demoTimer);
  demoTimer = setInterval(function() {
    if (i < demo.input.length) {
      inp.textContent += demo.input[i++];
    } else {
      clearInterval(demoTimer);
      inp.classList.remove('cursor-blink');
      setTimeout(function() {
        demo.result.forEach(function(line, li) {
          setTimeout(function() {
            var d = document.createElement('div');
            d.className = line.cls;
            d.textContent = line.text;
            out.appendChild(d);
          }, li * 90);
        });
        setTimeout(function() {
          demoIdx = (demoIdx + 1) % DEMOS.length;
          setTimeout(function() { runDemo(DEMOS[demoIdx]); }, 3500);
        }, demo.result.length * 90 + 2200);
      }, 350);
    }
  }, demo.delay);
}
setTimeout(function() { runDemo(DEMOS[0]); }, 600);
  })();
