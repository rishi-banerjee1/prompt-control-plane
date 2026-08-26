  (function(){
var obs = new IntersectionObserver(function(entries){
  entries.forEach(function(e){
    if(e.isIntersecting){
      e.target.querySelectorAll('.risk-fill').forEach(function(bar){
        bar.style.width = bar.getAttribute('data-target') + '%';
      });
      obs.unobserve(e.target);
    }
  });
},{threshold:0.3});
var meter = document.querySelector('.risk-meter-wrap');
if(meter) obs.observe(meter);
  })();
