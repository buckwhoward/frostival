// Frostival 2026 — site behaviour
(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---- Season calendar (single source of truth for open nights) ----
  const SEASON = { year: 2026, open: [['11-28', '11-29'], ['12-03', '12-06'], ['12-10', '12-27']] };
  const d = (md) => new Date(`${SEASON.year}-${md}T12:00:00`);
  const ranges = SEASON.open.map(([a, b]) => [d(a), d(b)]);
  const first = ranges[0][0], last = ranges.at(-1)[1];
  const isOpen = (dt) => ranges.some(([a, b]) => dt >= a && dt <= b);

  function renderMonth(el, month) {
    if (!el) return;
    const name = new Date(SEASON.year, month, 1).toLocaleString('en-US', { month: 'long' });
    const startDow = new Date(SEASON.year, month, 1).getDay();
    const days = new Date(SEASON.year, month + 1, 0).getDate();
    let openCount = 0, cells = '';
    ['S', 'M', 'T', 'W', 'T', 'F', 'S'].forEach(x => cells += `<div class="dow" aria-hidden="true">${x}</div>`);
    for (let i = 0; i < startDow; i++) cells += '<div></div>';
    for (let n = 1; n <= days; n++) {
      const dt = new Date(SEASON.year, month, n, 12);
      const inSeason = dt >= first && dt <= last;
      const open = isOpen(dt);
      if (open) openCount++;
      const wk = dt.getDay() === 0 || dt.getDay() === 6;
      const cls = open ? `open${wk ? ' wknd' : ''}${+dt === +first ? ' first' : ''}` : inSeason ? 'closed' : '';
      const label = `${name} ${n}${open ? ', open' : inSeason ? ', closed' : ''}`;
      cells += `<div class="d ${cls}" aria-label="${label}">${n}</div>`;
    }
    el.innerHTML = `<h3>${name} <small>${openCount} nights open</small></h3><div class="cal" role="grid" aria-label="${name} ${SEASON.year}">${cells}</div>`;
  }
  renderMonth(document.getElementById('cal-nov'), 10);
  renderMonth(document.getElementById('cal-dec'), 11);

  // ---- Nav ----
  const nav = document.getElementById('nav');
  const mcta = document.getElementById('mcta');
  const onScroll = () => {
    const y = scrollY;
    nav.classList.toggle('scrolled', y > 40);
    mcta && mcta.classList.toggle('show', y > innerHeight * 0.8);
  };
  addEventListener('scroll', onScroll, { passive: true }); onScroll();

  const btn = document.querySelector('.menu-btn'), menu = document.getElementById('menu');
  btn?.addEventListener('click', () => {
    const open = menu.classList.toggle('open');
    btn.setAttribute('aria-expanded', open);
    document.body.style.overflow = open ? 'hidden' : '';
  });
  menu?.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
    menu.classList.remove('open'); btn.setAttribute('aria-expanded', false); document.body.style.overflow = '';
  }));

  // ---- Hero video: respect reduced motion ----
  const vid = document.getElementById('heroVideo');
  if (vid && reduce) { vid.removeAttribute('autoplay'); vid.pause(); vid.style.display = 'none'; }

  // ---- Reveal on scroll ----
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
  }), { rootMargin: '0px 0px -8% 0px' });
  document.querySelectorAll('.reveal').forEach(el => io.observe(el));

  // ---- Gallery arrows ----
  const gal = document.getElementById('gal');
  document.querySelectorAll('.gal-ctl button').forEach(b => b.addEventListener('click', () => {
    gal.scrollBy({ left: +b.dataset.dir * gal.clientWidth * 0.8, behavior: reduce ? 'auto' : 'smooth' });
  }));

  // ---- Snow ----
  const c = document.getElementById('snow');
  if (c && !reduce) {
    const ctx = c.getContext('2d');
    let w, h, flakes = [], dpr = Math.min(devicePixelRatio || 1, 2), running = true;
    const size = () => {
      w = c.clientWidth; h = c.clientHeight; c.width = w * dpr; c.height = h * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const n = Math.round(Math.min(140, w / 9));
      flakes = Array.from({ length: n }, () => ({ x: Math.random() * w, y: Math.random() * h, r: Math.random() * 2.2 + .6, s: Math.random() * .6 + .25, o: Math.random() * Math.PI * 2 }));
    };
    size(); addEventListener('resize', size);
    new IntersectionObserver(([e]) => { running = e.isIntersecting; if (running) requestAnimationFrame(tick); }).observe(c);
    function tick() {
      if (!running) return;
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = 'rgba(255,255,255,.85)';
      for (const f of flakes) {
        f.y += f.s; f.o += .01; f.x += Math.sin(f.o) * .35;
        if (f.y > h + 4) { f.y = -4; f.x = Math.random() * w; }
        ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2); ctx.fill();
      }
      requestAnimationFrame(tick);
    }
  }
})();

// ---- Join the list (Klaviyo client subscriptions API) ----
(() => {
  // Fill these in from the Frostival Klaviyo account: Settings > API keys (public key / site ID) and the new list's ID.
  const KLAVIYO = { companyId: 'WzC9FA', listId: 'YfdyXr', smsTermsUrl: 'sms-terms/' }; // set smsTermsUrl once Mobile Terms of Service exist // Frostival account · "Frostival 2026 - Website List"
  const dlg = document.getElementById('join');
  if (!dlg) return;
  const form = document.getElementById('joinForm'), err = document.getElementById('joinErr'), btn = document.getElementById('joinBtn');
  const s1 = document.getElementById('joinStep1'), s2 = document.getElementById('joinStep2');
  let source = 'website';
  const open = (src) => {
    source = src || 'website'; s1.hidden = false; s2.hidden = true; err.hidden = true;
    dlg.showModal ? dlg.showModal() : dlg.setAttribute('open', '');
    setTimeout(() => form.querySelector('#jf-email').focus(), 50);
  };
  const close = () => dlg.close ? dlg.close() : dlg.removeAttribute('open');
  document.querySelectorAll('[data-join]').forEach(a => a.addEventListener('click', e => { e.preventDefault(); open(a.dataset.src || 'button'); }));
  dlg.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', close));
  dlg.addEventListener('click', e => { if (e.target === dlg) close(); });
  if (location.hash === '#join') open('link');
  if (KLAVIYO.smsTermsUrl) { document.getElementById('jfTerms').href = KLAVIYO.smsTermsUrl; document.getElementById('jfTermsWrap').hidden = false; }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = form.email.value.trim(), first = form.first_name.value.trim(), phoneRaw = form.phone.value.trim();
    // US numbers to E.164 (+1XXXXXXXXXX), which Klaviyo requires
    const digits = phoneRaw.replace(/\D/g, '');
    const phone = digits.length === 10 ? '+1' + digits : (digits.length === 11 && digits[0] === '1') ? '+' + digits : null;
    const badPhone = phoneRaw !== '' && !phone;
    form.phone.setAttribute('aria-invalid', badPhone);
    const bad = !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
    form.email.setAttribute('aria-invalid', bad);
    if (bad) { err.textContent = 'Please enter a valid email address.'; err.hidden = false; return; }
    if (badPhone) { err.textContent = 'Please enter a 10-digit US mobile number, or leave it blank.'; err.hidden = false; return; }
    const sms = form.sms_consent.checked;
    if (sms && !phone) { form.phone.setAttribute('aria-invalid', true); err.textContent = 'Add your mobile number to get texts, or uncheck the text box.'; err.hidden = false; return; }
    if (!KLAVIYO.companyId || !KLAVIYO.listId) { err.textContent = "Sign-ups aren't connected yet. Please check back soon."; err.hidden = false; return; }
    btn.disabled = true; btn.textContent = 'Joining…'; err.hidden = true;
    const attrs = { email, subscriptions: { email: { marketing: { consent: 'SUBSCRIBED' } } }, properties: { frostival_signup_source: source } };
    if (first) attrs.first_name = first;
    if (phone) attrs.phone_number = phone;
    if (sms) attrs.subscriptions.sms = { marketing: { consent: 'SUBSCRIBED' } }; // only when the unchecked-by-default box is ticked
    try {
      const r = await fetch(`https://a.klaviyo.com/client/subscriptions/?company_id=${KLAVIYO.companyId}`, {
        method: 'POST', headers: { 'content-type': 'application/vnd.api+json', revision: '2024-10-15' },
        body: JSON.stringify({ data: { type: 'subscription', attributes: { custom_source: 'Frostival website', profile: { data: { type: 'profile', attributes: attrs } } }, relationships: { list: { data: { type: 'list', id: KLAVIYO.listId } } } } })
      });
      if (!r.ok) throw new Error(r.status);
      s1.hidden = true; s2.hidden = false; form.reset();
    } catch (_) {
      err.textContent = "Something went wrong on our end. Please try again in a minute."; err.hidden = false;
    } finally { btn.disabled = false; btn.textContent = 'Join the list'; }
  });
})();

// ---- Snowball & Flurry trailer: load YouTube only after a click ----
(() => {
  const btn = document.querySelector('.show-play');
  if (!btn) return;
  btn.addEventListener('click', () => {
    const id = btn.dataset.yt;
    const f = document.createElement('iframe');
    f.src = `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&playsinline=1`;
    f.title = 'Snowball & Flurry trailer';
    f.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
    f.allowFullscreen = true;
    btn.replaceWith(f);
  });
})();
