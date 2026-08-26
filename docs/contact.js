var form = document.getElementById('contactForm');
var submitBtn = document.getElementById('submitBtn');
var errorBanner = document.getElementById('errorBanner');

form.addEventListener('submit', async function (e) {
  e.preventDefault();
  errorBanner.style.display = 'none';
  submitBtn.disabled = true;
  submitBtn.textContent = 'Sending...';

  try {
    var response = await fetch(form.action, {
      method: 'POST',
      body: new FormData(form),
      headers: { 'Accept': 'application/json' },
    });

    if (response.ok) {
      window.location.href = 'thank-you.html';
    } else {
      throw new Error('Submit failed');
    }
  } catch (err) {
    errorBanner.style.display = 'block';
    submitBtn.disabled = false;
    submitBtn.textContent = 'Get in touch';
  }
});
