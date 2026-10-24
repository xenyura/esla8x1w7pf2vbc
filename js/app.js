const tabs = document.querySelectorAll('#nav button');
const pages = document.querySelectorAll('.page');
const body = document.getElementById('scroll');

function goTo(id){
  tabs.forEach(t => t.classList.toggle('active', t.dataset.page === id));
  pages.forEach(p => p.classList.toggle('active', p.id === id));
  body.scrollTop = 0;
  try { localStorage.setItem('halaman', id); } catch(e){}
}
tabs.forEach(t => t.addEventListener('click', () => goTo(t.dataset.page)));

try {
  const last = localStorage.getItem('halaman');
  if (last && document.getElementById(last)) goTo(last);
} catch(e){}
const $ = id => document.getElementById(id);
/* ===== alasan link gagal dimuat (foto/video dari link eksternal, termasuk Cloudflare R2) ===== */
function alasanLink(u, jenis) {
  let h = '';
  try { const x = new URL(u); if (!/^https?:$/.test(x.protocol)) return 'Link tidak bisa dimuat.'; h = x.hostname.toLowerCase(); } catch (e) { return 'Link tidak valid.'; }
  if (/\.r2\.cloudflarestorage\.com$/.test(h)) return 'Ini link pribadi R2 (alamat API), tidak bisa dibuka tanpa kunci. Pakai link publik: https://pub-xxxx.r2.dev/nama-file atau domain sendiri.';
  if (h === 'dash.cloudflare.com') return 'Ini link halaman dashboard Cloudflare, bukan link file. Pakai link publik file (r2.dev atau domain sendiri).';
  if (/\.r2\.dev$/.test(h)) return 'Link r2.dev tidak bisa dimuat. Cek di Cloudflare: bucket > Settings > Public Development URL harus Enabled, dan nama file di link harus sama persis (huruf besar/kecil).';
  return (jenis === 'video' ? 'Video' : 'Gambar') + ' tidak bisa dimuat. Coba buka link itu di browser HP: kalau tidak tampil, link-nya yang bermasalah (bukan aplikasi).' + (jenis === 'video' ? ' Kalau link terbuka tapi video tidak jalan, ubah videonya ke format H.264 (.mp4 umum).' : '');
}
const AVATAR0 = 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" fill="#161926"/><circle cx="32" cy="25" r="11" fill="#4a5070"/><path d="M10 64c2-16 14-22 22-22s20 6 22 22z" fill="#4a5070"/></svg>');
/* teks per-karakter (untuk animasi huruf bergantian). grad=true: tiap huruf membawa potongan gradasi kata penuh */
function setChars(el, text, grad) {
  if (el.dataset.txt === text) return;
  el.dataset.txt = text; el.setAttribute('aria-label', text); el.textContent = '';
  let i = 0;
  text.split(' ').forEach((w, wi, arr) => {
    const word = document.createElement('span'); word.className = 'kw'; word.setAttribute('aria-hidden', 'true');
    [...w].forEach(ch => { const s = document.createElement('span'); s.className = 'kc'; s.textContent = ch; s.style.setProperty('--i', i++); word.appendChild(s); });
    el.appendChild(word);
    if (wi < arr.length - 1) { el.appendChild(document.createTextNode(' ')); i++; }
  });
  if (grad) { el.classList.add('fx'); fitGrad(el); }
}
function fitGrad(el) {
  requestAnimationFrame(() => {
    el.style.setProperty('--tw', el.scrollWidth + 'px'); el.style.setProperty('--th', el.offsetHeight + 'px');
    el.querySelectorAll('.kc').forEach(s => s.style.setProperty('--ox', s.offsetLeft + 'px'));
  });
}
const save = (k,v) => { try { localStorage.setItem(k,v); } catch(e){} };
const load = k => { try { return localStorage.getItem(k); } catch(e){ return null; } };

function sapaan(){
  const h = new Date().getHours();
  if (h>=4 && h<11)  return ['Selamat Pagi','☀️'];
  if (h>=11 && h<15) return ['Selamat Siang','🌤️'];
  if (h>=15 && h<18) return ['Selamat Sore','🌇'];
  return ['Selamat Malam','🌙'];
}
function renderBanner(){
  const [t,e] = sapaan();
  setChars($('greet'), t);
  /* emoji dibungkus <span> agar bisa dianimasikan sesuai waktu (data-w), tanpa menggerakkan lingkarannya */
  const em = $('emo'); let es = em.firstElementChild;
  if (!es || es.tagName !== 'SPAN') { em.textContent = ''; es = document.createElement('span'); em.appendChild(es); }
  if (es.textContent !== e) es.textContent = e;
  em.dataset.w = t.split(' ')[1].toLowerCase();
  setChars($('uname'), load('nama') || 'Tuan edi');
  const av = $('avatar'), fs = load('foto') || AVATAR0;
  if (av.dataset.s !== fs) { av.dataset.s = fs; av.src = fs; } /* hanya ganti bila berubah (tidak memuat ulang tiap menit) */
}
$('avatar').addEventListener('error', () => { $('avatar').src = AVATAR0; }); /* link foto rusak/offline = foto bawaan */
$('fotoInput').addEventListener('change', e => {
  const f = e.target.files[0]; if (!f) return;
  const url = URL.createObjectURL(f), img = new Image();
  img.onload = () => {
    const s = Math.min(img.width, img.height), c = document.createElement('canvas');
    c.width = c.height = 192;
    c.getContext('2d').drawImage(img,(img.width-s)/2,(img.height-s)/2,s,s,0,0,192,192);
    save('foto', c.toDataURL('image/jpeg',.85));
    URL.revokeObjectURL(url); renderBanner();
  };
  img.src = url;
});

/* ===== MODE EDIT PROFIL: ketuk 3x foto profil = edit nama & foto (galeri / link IMGBB dll.), ketuk 1x di luar kotak = kunci ===== */
const pedit = $('pedit'), pName = $('pName'), pUrl = $('pUrl'), pMsg = $('pMsg'), HINT = 'Ketuk di luar kotak untuk mengunci';
let pEditing = false, ptaps = 0, ptapT = null, urlT = null;
function pesan(t, err) { pMsg.textContent = t; pMsg.classList.toggle('err', !!err); }
function cobaUrl(v, done) {
  if (!/^https?:\/\/\S+$/i.test(v)) { done(false, 'Link harus diawali https:// dan berupa link langsung ke gambar.'); return; }
  const im = new Image(); im.referrerPolicy = 'no-referrer';
  im.onload = () => done(true);
  im.onerror = () => done(false, alasanLink(v, 'foto'));
  im.src = v;
}
function terapkanUrl() {
  clearTimeout(urlT);
  const v = pUrl.value.trim();
  if (!v || v === load('foto')) return;
  pesan('Memuat foto…');
  cobaUrl(v, (ok, m) => {
    if (ok) { save('foto', v); renderBanner(); pesan('Foto tersimpan ✓'); if (!pEditing) toast('Foto profil diperbarui ✓'); }
    else { pesan(m, true); if (!pEditing) toast('Link foto tidak valid, foto tidak diubah.'); }
  });
}
function mulaiProfil() {
  pEditing = true; pedit.hidden = false; $('avaBtn').classList.add('editing');
  pName.value = load('nama') || ''; const f = load('foto') || ''; pUrl.value = /^https?:/i.test(f) ? f : '';
  pesan(HINT); pName.focus();
}
function kunciProfil() {
  if (!pEditing) return;
  const v = pUrl.value.trim(), perlu = v && v !== load('foto');
  pEditing = false; pedit.hidden = true; $('avaBtn').classList.remove('editing');
  if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
  if (perlu) terapkanUrl();
}
/* ketuk 3x cepat di foto profil = mode edit */
$('avaBtn').addEventListener('click', () => {
  if (pEditing) return;
  ptaps++; clearTimeout(ptapT);
  if (ptaps >= 3) { ptaps = 0; mulaiProfil(); }
  else ptapT = setTimeout(() => { ptaps = 0; }, 500);
});
/* ketuk 1x di luar kotak = kunci */
document.addEventListener('click', e => {
  if (pEditing && e.target !== $('fotoInput') && !pedit.contains(e.target) && !$('avaBtn').contains(e.target)) kunciProfil();
});
pName.addEventListener('input', () => { const v = pName.value.trim(); save('nama', v); renderBanner(); });
pUrl.addEventListener('input', () => { clearTimeout(urlT); if (!pUrl.value.trim()) { pesan(HINT); return; } urlT = setTimeout(terapkanUrl, 700); });
[pName, pUrl].forEach(i => i.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); kunciProfil(); } }));
$('pGal').addEventListener('click', () => $('fotoInput').click());
$('pDef').addEventListener('click', () => { clearTimeout(urlT); save('foto', ''); pUrl.value = ''; renderBanner(); pesan('Kembali ke foto bawaan ✓'); });
$('fotoInput').addEventListener('change', () => { if (pEditing) { pUrl.value = ''; pesan('Foto dari galeri tersimpan ✓'); } });
renderBanner();
setInterval(renderBanner, 60000);

const tk = $('ticks');
for (let i = 0; i < 60; i++) {
  const a = i * 6 * Math.PI / 180, big = i % 5 === 0, r1 = big ? 50 : 53, r2 = 56;
  const l = document.createElementNS('http://www.w3.org/2000/svg', 'line');
  l.setAttribute('x1', 60 + r1 * Math.sin(a)); l.setAttribute('y1', 60 - r1 * Math.cos(a));
  l.setAttribute('x2', 60 + r2 * Math.sin(a)); l.setAttribute('y2', 60 - r2 * Math.cos(a));
  l.setAttribute('class', 'tick' + (big ? ' big' : ''));
  tk.appendChild(l);
}
const nm = $('nums');
for (let n = 1; n <= 12; n++) {
  const a = n * 30 * Math.PI / 180;
  const t = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  t.setAttribute('x', 60 + 39 * Math.sin(a)); t.setAttribute('y', 60 - 39 * Math.cos(a));
  t.setAttribute('class', 'num' + (n === 12 ? ' n12' : ''));
  t.textContent = n; nm.appendChild(t);
}
/* sisa waktu: besok (00.00), minggu depan, bulan depan, tahun depan */
const BLN = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
/* Minggu berikutnya (patokan hari Minggu): 00.00 hari Minggu terdekat setelah sekarang */
function mingguDepan(d) {
  const sel = (7 - d.getDay()) % 7 || 7; /* hari sampai Minggu berikutnya */
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + sel);
}
function sisaWaktu(d) {
  const tot = ms => Math.ceil(ms / 60000);
  const jm = t => Math.floor(t / 60) + 'j ' + (t % 60) + 'm';
  const besok = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
  $('sH').textContent = jm(tot(besok - d)) + ' lagi';
  const tm = tot(mingguDepan(d) - d);
  $('sM').textContent = Math.floor(tm / 1440) + 'h ' + jm(tm % 1440) + ' lagi';
  const bd = new Date(d.getFullYear(), d.getMonth() + 1, 1), tb = tot(bd - d), hb = Math.floor(tb / 1440);
  $('sBl').textContent = BLN[bd.getMonth()];
  $('sB').textContent = (hb >= 1 ? hb + 'h' : jm(tb)) + ' lagi';
  $('sTl').textContent = d.getFullYear() + 1;
  $('sT').textContent = (11 - d.getMonth()) + 'b ' + (hb >= 1 ? hb + 'h' : jm(tb)) + ' lagi';
}
function jam() {
  const d = new Date(), s = d.getSeconds(), m = d.getMinutes() + s / 60, h = (d.getHours() % 12) + m / 60;
  $('hh').setAttribute('transform', 'rotate(' + h * 30 + ' 60 60)');
  $('mm').setAttribute('transform', 'rotate(' + m * 6 + ' 60 60)');
  $('ss').setAttribute('transform', 'rotate(' + s * 6 + ' 60 60)');
  $('dg').textContent = d.toLocaleTimeString('id-ID', {hour: '2-digit', minute: '2-digit'}).replace('.', ':');
  $('dtx').textContent = d.toLocaleDateString('id-ID', {weekday: 'long', day: 'numeric', month: 'long'});
  $('dtn').textContent = d.getDate();
  sisaWaktu(d);
  const th = String(d.getFullYear()), ey = $('welYear'), siap = ey.dataset.s === '1';
  if (ey.textContent !== th) {
    setChars(ey, th, true);
    if (siap) { ey.classList.remove('ganti'); void ey.offsetWidth; ey.classList.add('ganti'); }
  }
  ey.dataset.s = '1';
}
jam();
setInterval(jam, 1000);

const BULAN = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
let tahun = new Date().getFullYear();
let selTgl = null, selBln = new Date().getMonth();

function renderYear() {
  $('yTitle').textContent = tahun;
  const now = new Date(), g = $('yGrid'), st = g.scrollTop;
  g.innerHTML = '';
  for (let m = 0; m < 12; m++) {
    const box = document.createElement('div');
    box.className = 'mon';
    box.innerHTML = '<h4 data-b="' + m + '"' + (m === selBln ? ' class="sel"' : '') + '>' + BULAN[m] + '</h4>';
    const mg = document.createElement('div');
    mg.className = 'mg';
    ['Mi','Se','Se','Ra','Ka','Ju','Sa'].forEach(x => {
      const e = document.createElement('div'); e.className = 'dw'; e.textContent = x; mg.appendChild(e);
    });
    const first = new Date(tahun, m, 1).getDay(), days = new Date(tahun, m + 1, 0).getDate();
    for (let i = 0; i < first; i++) mg.appendChild(document.createElement('div'));
    for (let d = 1; d <= days; d++) {
      const key = kunci(tahun, m, d), e = document.createElement('div');
      const today = tahun === now.getFullYear() && m === now.getMonth() && d === now.getDate();
      e.className = 'd' + (adaCat(key) ? ' mark' : '') + (today ? ' today' : '') + (key === selTgl ? ' sel' : '');
      e.textContent = d; e.dataset.k = key;
      mg.appendChild(e);
    }
    box.appendChild(mg); g.appendChild(box);
  }
  g.appendChild(petaCatatan());
  g.appendChild(daftarCatatan());
  jagaGulir(g, st);
}
$('yGrid').addEventListener('click', e => {
  const hb = e.target.closest && e.target.closest('h4[data-b]');
  if (hb) { selBln = +hb.dataset.b; segarDaftar(); return; }
  const k = e.target.dataset && e.target.dataset.k;
  if (!k) return;
  selTgl = k; selBln = +k.split('-')[1] - 1;
  $('yGrid').querySelectorAll('.d.sel').forEach(x => x.classList.remove('sel'));
  e.target.classList.add('sel');
  segarDaftar();
});
$('dt').addEventListener('click', () => {
  tahun = new Date().getFullYear(); selBln = new Date().getMonth(); selTgl = null; renderYear();
  $('cal').hidden = false; $('yGrid').scrollTop = 0;
});
$('yPrev').addEventListener('click', () => { tahun--; renderYear(); });
$('yNext').addEventListener('click', () => { tahun++; renderYear(); });
$('calClose').addEventListener('click', () => { $('cal').hidden = true; });

/* ===== QUOTES ===== */
const qbox = $('qbox'), qwrap = $('qwrap');
const Q0 = '"Waktu tidak bisa diulang, tapi dgn uang kamu bisa menciptakan momen serupa dgn orang yang berbeda"';
let editing = false, taps = 0, tapT;
{ const s = load('quote'); qbox.value = (s === null) ? Q0 : s; }
/* quotes selalu muat 2 baris: tetap 11px, dan hanya bila teks lebih panjang, ukuran turun bertahap (min 8.5px) sampai muat */
function fitQuote() {
  let fs = 11; qbox.style.fontSize = fs + 'px';
  while (qbox.scrollHeight > qbox.clientHeight + 1 && fs > 8.5) { fs -= .5; qbox.style.fontSize = fs + 'px'; }
}
fitQuote();
if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitQuote);
window.addEventListener('resize', fitQuote);

function setAlign(a) {
  qbox.style.textAlign = a;
  qwrap.querySelectorAll('.qal button').forEach(b => b.classList.toggle('on', b.dataset.al === a));
}
setAlign(load('quote_al') || 'left');

function startEdit() {
  editing = true;
  qwrap.classList.add('editing');
  qbox.readOnly = false;
  qbox.focus();
  const n = qbox.value.length;
  qbox.setSelectionRange(n, n);
}
function lockQuote() {
  editing = false;
  qwrap.classList.remove('editing');
  qbox.readOnly = true;
  qbox.blur();
  qbox.scrollTop = 0;
  save('quote', qbox.value);
}

/* ketuk 3x di kotak = mode edit */
qbox.parentElement.addEventListener('click', () => {
  if (editing) return;
  taps++;
  clearTimeout(tapT);
  if (taps >= 3) { taps = 0; startEdit(); }
  else tapT = setTimeout(() => { taps = 0; }, 500);
});
qbox.addEventListener('input', () => { save('quote', qbox.value); fitQuote(); });
qwrap.querySelectorAll('.qal button').forEach(b => b.addEventListener('click', () => {
  setAlign(b.dataset.al);
  save('quote_al', b.dataset.al);
  qbox.focus();
}));
/* ketuk di luar kotak 1x = kunci */
document.addEventListener('click', e => {
  if (editing && !qwrap.contains(e.target)) lockQuote();
});

/* ===== ALARM ===== */
const HARI = ['Min','Sen','Sel','Rab','Kam','Jum','Sab'];
const URUT = [1,2,3,4,5,6,0];
const pad = n => String(n).padStart(2, '0');
let alarms = [], snoozes = [], almCur = null, selDays = [], ringing = null, ringTimer = null, actx = null, master = null, ringTO = null, toastT = null, bus = null;
try { alarms = JSON.parse(load('alarms') || '[]'); } catch(e){}
const saveAlarms = () => { save('alarms', JSON.stringify(alarms)); nativeSync(); };

/* nada dibuat dengan Web Audio, tanpa file */
function audio() {
  if (!actx) { try { actx = new (window.AudioContext || window.webkitAudioContext)(); master = actx.createGain(); master.connect(actx.destination); terapkanVol(); } catch(e){} }
  if (actx && actx.state === 'suspended') actx.resume();
  return actx;
}
document.addEventListener('pointerdown', audio);
function bip(f, d, t, type, v) {
  const o = actx.createOscillator(), g = actx.createGain();
  o.type = type; o.frequency.value = f;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(v, t + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t + d);
  o.connect(g); g.connect(bus || master);
  o.start(t); o.stop(t + d + 0.05);
}
const TONES = {
  klasik:  {n:'Klasik',  len:1.4, p: t => [0,.2,.4,.6].forEach(k => bip(1000, .12, t+k, 'square', .2))},
  lembut:  {n:'Lembut',  len:2.2, p: t => [523,659,784,1047].forEach((f,i) => bip(f, .8, t+i*.25, 'sine', .35))},
  digital: {n:'Digital', len:1.8, p: t => { for (let i = 0; i < 8; i++) bip(i % 2 ? 660 : 880, .09, t+i*.12, 'triangle', .3); }},
  sirine:  {n:'Sirine',  len:2.2, p: t => {
    const o = actx.createOscillator(), g = actx.createGain();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(600, t);
    o.frequency.linearRampToValueAtTime(1100, t+1);
    o.frequency.linearRampToValueAtTime(600, t+2);
    g.gain.value = .12;
    o.connect(g); g.connect(bus || master);
    o.start(t); o.stop(t+2);
  }},
  melodi:  {n:'Melodi',  len:2.4, p: t => [523,659,784,659,523,784,1047].forEach((f,i) => bip(f, .3, t+i*.22, 'sine', .35))}
};
$('aeTone').innerHTML = Object.keys(TONES).map(k => '<option value="' + k + '">' + TONES[k].n + '</option>').join('');
function playTone(k) { const c = audio(); if (c) (TONES[k] || TONES.klasik).p(c.currentTime + .05); }
function startLoop(k) { stopLoop(); playTone(k); ringTimer = setInterval(() => playTone(k), (TONES[k] || TONES.klasik).len * 1000); }
function stopLoop() { clearInterval(ringTimer); ringTimer = null; }

/* daftar alarm */
function rep(a) {
  if (!a.days.length) return 'Sekali';
  if (a.days.length === 7) return 'Setiap hari';
  return URUT.filter(d => a.days.includes(d)).map(d => HARI[d]).join(', ');
}
function infoAlarm() {
  const now = new Date(); let best = Infinity;
  alarms.forEach(a => {
    if (!a.on) return;
    const [h, m] = a.time.split(':').map(Number);
    for (let o = 0; o < 8; o++) {
      const t = new Date(now.getFullYear(), now.getMonth(), now.getDate() + o, h, m, 0, 0);
      if (t <= now) continue;
      if (a.days.length && !a.days.includes(t.getDay())) continue;
      best = Math.min(best, t - now); break;
    }
  });
  snoozes.forEach(s => { best = Math.min(best, Math.max(0, s.at - Date.now())); });
  const el = $('almInfo');
  if (best === Infinity) { el.textContent = 'tidak ada alarm aktif'; return; }
  const mnt = Math.ceil(best / 60000);
  el.textContent = 'berdering dalam ' + Math.floor(mnt / 60) + ' jam ' + pad(mnt % 60) + ' menit';
}
function renderAlarms() {
  infoAlarm();
  emojiJam();
  const L = $('almList'); L.innerHTML = '';
  if (!alarms.length) { L.innerHTML = '<div class="empty">Belum ada alarm.<br>Ketuk + untuk menambah.</div>'; return; }
  alarms.slice().sort((a, b) => a.time.localeCompare(b.time)).forEach(a => {
    const el = document.createElement('div');
    el.className = 'alm' + (a.on ? '' : ' off');
    el.innerHTML = `<div class='em2'></div><div class='i'><div class='t'>${fmt12(a.time)}</div><div class='l'></div><small></small></div><div class='switch${a.on ? ' on' : ''}'></div>`;
    el.querySelector('.l').textContent = a.label || 'Alarm';
    el.querySelector('.em2').textContent = a.emoji || '⏰';
    el.querySelector('small').textContent = rep(a) + ' · ' + (TONES[a.tone] || TONES.klasik).n;
    el.querySelector('.switch').onclick = ev => { ev.stopPropagation(); a.on = !a.on; saveAlarms(); renderAlarms(); };
    el.onclick = () => openEdit(a);
    L.appendChild(el);
  });
}

/* form alarm */
/* waktu disimpan 24 jam (HH:MM), ditampilkan 12 jam AM/PM, dipilih lewat jam analog */
let selPM = false, tH = 12, tM = 0, tMode = 'h';
const NS = 'http://www.w3.org/2000/svg';
function fmt12(t) { const [h, m] = t.split(':').map(Number); return (h % 12 || 12) + ':' + pad(m) + ' ' + (h >= 12 ? 'PM' : 'AM'); }
function setAmPm(pm) { selPM = pm; $('aeAM').classList.toggle('on', !pm); $('aePM').classList.toggle('on', pm); }
$('aeAM').onclick = () => setAmPm(false);
$('aePM').onclick = () => setAmPm(true);
function pos(deg, r) { const a = deg * Math.PI / 180; return [120 + r * Math.sin(a), 120 - r * Math.cos(a)]; }
function drawDial() {
  $('tdH').textContent = tH; $('tdM').textContent = pad(tM);
  const g = $('dG'); g.innerHTML = '';
  const hour = tMode === 'h', deg = hour ? (tH % 12) * 30 : tM * 6, [kx, ky] = pos(deg, 88);
  const mk = (tag, at) => { const e = document.createElementNS(NS, tag); for (const k in at) e.setAttribute(k, at[k]); g.appendChild(e); return e; };
  mk('line', {class: 'hand', x1: 120, y1: 120, x2: kx, y2: ky});
  mk('circle', {class: 'knob', cx: kx, cy: ky, r: 21});
  mk('circle', {class: 'knob', cx: 120, cy: 120, r: 4});
  if (!hour && tM % 5) mk('circle', {class: 'kdot', cx: kx, cy: ky, r: 3});
  for (let i = 0; i < 12; i++) {
    const v = hour ? (i || 12) : i * 5, d = hour ? (v % 12) * 30 : v * 6, [x, y] = pos(d, 88);
    const t = mk('text', {class: 'num' + ((hour ? v === tH : v === tM) ? ' sel' : ''), x, y});
    t.textContent = hour ? v : pad(v);
  }
}
function setMode(m) { tMode = m; $('tdH').classList.toggle('on', m === 'h'); $('tdM').classList.toggle('on', m === 'm'); drawDial(); }
$('tdH').onclick = () => setMode('h');
$('tdM').onclick = () => setMode('m');
const dial = $('dial');
function dialPick(ev) {
  const r = dial.getBoundingClientRect();
  const dx = ev.clientX - (r.left + r.width / 2), dy = ev.clientY - (r.top + r.height / 2);
  const deg = (Math.atan2(dx, -dy) * 180 / Math.PI + 360) % 360;
  if (tMode === 'h') tH = Math.round(deg / 30) % 12 || 12; else tM = Math.round(deg / 6) % 60;
  drawDial();
}
dial.addEventListener('pointerdown', e => { dial.setPointerCapture(e.pointerId); dialPick(e); });
dial.addEventListener('pointermove', e => { if (dial.hasPointerCapture(e.pointerId)) dialPick(e); });
dial.addEventListener('pointerup', () => { if (tMode === 'h') setMode('m'); });
function setTimeUI(t) { const [h, m] = t.split(':').map(Number); tH = h % 12 || 12; tM = m; setAmPm(h >= 12); setMode('h'); }
function getTime() { let h = tH % 12; if (selPM) h += 12; return pad(h) + ':' + pad(tM); }
function renderDays() {
  const box = $('aeDays'); box.innerHTML = '';
  const all = document.createElement('button');
  all.textContent = 'Setiap hari'; all.className = selDays.length === 7 ? 'on' : '';
  all.onclick = () => { selDays = selDays.length === 7 ? [] : [0,1,2,3,4,5,6]; renderDays(); };
  box.appendChild(all);
  URUT.forEach(i => {
    const b = document.createElement('button');
    b.textContent = HARI[i]; b.className = selDays.includes(i) ? 'on' : '';
    b.onclick = () => { selDays = selDays.includes(i) ? selDays.filter(x => x !== i) : selDays.concat(i); renderDays(); };
    box.appendChild(b);
  });
}
function openEdit(a) {
  almCur = a || null;
  const d = new Date();
  $('aeTitle').textContent = a ? 'Ubah alarm' : 'Alarm baru';
  setTimeUI(a ? a.time : pad(d.getHours()) + ':' + pad(d.getMinutes()));
  $('aeLabel').value = a ? a.label : '';
  selEmoji = a ? (a.emoji || '⏰') : '⏰';
  $('aeEmojiIn').value = '';
  renderEmoji();
  $('aeTone').value = a ? a.tone : 'klasik';
  selDays = a ? a.days.slice() : [];
  renderDays();
  $('aeDel').hidden = !a;
  $('almEdit').hidden = false;
  fitLabel();
}
const EMO = ['⏰','🌅','☀️','💼','🍳','🏃','📚','💊','😴','🌙','🕌','🍽️','🚌','📞','🎯','🎮'];
let selEmoji = '⏰';
const firstEmoji = s => {
  s = s.trim(); if (!s) return '';
  if (window.Intl && Intl.Segmenter) return [...new Intl.Segmenter(undefined, {granularity: 'grapheme'}).segment(s)][0].segment;
  return Array.from(s)[0];
};
function renderEmoji() {
  const box = $('aeEmoji'); box.innerHTML = '';
  EMO.forEach(e => {
    const b = document.createElement('button');
    b.textContent = e; b.className = e === selEmoji ? 'on' : '';
    b.onclick = () => { selEmoji = e; $('aeEmojiIn').value = ''; renderEmoji(); };
    box.appendChild(b);
  });
}
$('aeEmojiIn').addEventListener('input', e => { const f = firstEmoji(e.target.value); if (f) { selEmoji = f; renderEmoji(); } });

/* emoji alarm di tepi jam analog, sesuai posisi waktunya */
function emojiJam() {
  const g = $('ems'); g.innerHTML = '';
  const list = alarms.filter(a => a.on).map(a => {
    const [h, m] = a.time.split(':').map(Number);
    return { d: ((h % 12) + m / 60) * 30, e: a.emoji || '⏰' };
  }).sort((x, y) => x.d - y.d);
  let start = -99, level = 0;
  list.forEach(it => {
    if (it.d - start < 9) level++; else { start = it.d; level = 0; }
    const r = it.d * Math.PI / 180, rad = 65 + level * 11;
    const t = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    t.setAttribute('x', 60 + rad * Math.sin(r)); t.setAttribute('y', 60 - rad * Math.cos(r));
    t.setAttribute('class', 'em'); t.textContent = it.e;
    g.appendChild(t);
  });
}

function fitLabel() { const e = $('aeLabel'); e.style.height = 'auto'; e.style.height = e.scrollHeight + 'px'; }
$('aeLabel').addEventListener('input', fitLabel);
function closeEdit() { $('almEdit').hidden = true; stopLoop(); stopPrev(); }
$('aeSave').onclick = () => {
  const time = getTime();
  const data = { time, label: $('aeLabel').value.trim(), tone: $('aeTone').value, days: selDays.slice().sort(), emoji: selEmoji || '⏰', on: true, fired: '', made: Date.now() };
  mintaIzinNotif();
  if (almCur) Object.assign(almCur, data); else alarms.push(Object.assign({ id: Date.now() }, data));
  saveAlarms(); renderAlarms(); closeEdit();
};
/* konfirmasi: aturan default, aksi penting (hapus dll.) harus dikonfirmasi dulu */
let cfmDone = null;
function konfirmasi(judul, pesan, ok, batal, gaya) {
  return new Promise(res => {
    $('cfmT').textContent = judul;
    $('cfmM').textContent = pesan;
    $('cfmYes').textContent = ok || 'Hapus';
    $('cfmYes').className = 'btn ' + (gaya === 'pri' ? 'pri' : 'danger');
    $('cfmNo').textContent = batal || 'Batal';
    $('cfm').hidden = false;
    cfmDone = res;
  });
}
function tutupCfm(v) { $('cfm').hidden = true; if (cfmDone) { cfmDone(v); cfmDone = null; } }
$('cfmYes').onclick = () => tutupCfm(true);
$('cfmNo').onclick = () => tutupCfm(false);
$('cfm').addEventListener('click', e => { if (e.target === $('cfm')) tutupCfm(null); });

$('aeDel').onclick = async () => {
  const a = almCur;
  if (!a) return;
  const ok = await konfirmasi('Hapus alarm?', (a.label || 'Alarm') + ' · ' + fmt12(a.time), 'Hapus');
  if (!ok) return;
  alarms = alarms.filter(x => x !== a); saveAlarms(); renderAlarms(); closeEdit();
};
$('aeCancel').onclick = closeEdit;
let prevH = null, prevT = null;
function previewTone(k) {
  const c = audio(); if (!c) return null;
  const T = TONES[k] || TONES.klasik, b = c.createGain();
  b.connect(master); bus = b;
  T.p(c.currentTime + .05);
  bus = null;
  return { len: T.len, stop: () => { b.gain.value = 0; try { b.disconnect(); } catch (e) {} } };
}
function stopPrev() {
  if (prevH) prevH.stop();
  prevH = null; clearTimeout(prevT);
  $('aePrev').classList.remove('playing'); $('aePrev').setAttribute('aria-label', 'Coba nada');
}
$('aePrev').onclick = () => {
  if (prevH) { stopPrev(); return; }
  prevH = previewTone($('aeTone').value);
  if (!prevH) return;
  $('aePrev').classList.add('playing'); $('aePrev').setAttribute('aria-label', 'Hentikan nada');
  prevT = setTimeout(stopPrev, prevH.len * 1000 + 100);
};
$('aeTone').addEventListener('change', stopPrev);
document.querySelector('.clock').addEventListener('click', () => { renderAlarms(); $('alm').hidden = false; });
$('almClose').onclick = () => { $('alm').hidden = true; };
$('almAdd').onclick = () => openEdit(null);

/* berbunyi */
/* notifikasi lewat service worker (satu-satunya cara yang jalan di Android Chrome) */
function mintaIzinNotif() { try { if ('Notification' in window && Notification.permission === 'default') Notification.requestPermission(); } catch (e) {} }
async function notif(judul, isi, tag) {
  try {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    const opt = { body: isi, tag: tag || 'mylife', icon: 'assets/icon-192.png', badge: 'assets/icon-192.png', vibrate: [300, 150, 300], renotify: true };
    if ('serviceWorker' in navigator) { const reg = await navigator.serviceWorker.getRegistration(); if (reg) return reg.showNotification(judul, opt); }
    new Notification(judul, opt);
  } catch (e) {}
}
function ring(a) {
  ringing = a;
  if (document.visibilityState !== 'visible') notif('⏰ ' + fmt12(a.time), (a.label || 'Alarm') + ' — ketuk untuk mematikan', 'alarm-' + a.id);
  $('rGreet').textContent = sapaan()[0];
  $('rTime').textContent = fmt12(a.time);
  $('rLabel').textContent = (a.emoji || '⏰') + ' ' + (a.label || 'Alarm');
  resetMoon();
  $('ring').hidden = false;
  startLoop(a.tone);
  clearTimeout(ringTO);
  if (setA.dur) ringTO = setTimeout(() => { if (ringing === a) { stopRing(); toast('\u23f0 ' + (a.label || 'Alarm') + ' berhenti otomatis setelah ' + setA.dur + ' menit'); } }, setA.dur * 60000);
  if (navigator.vibrate) navigator.vibrate([400, 200, 400, 200, 400]);
  if (!a.days.length) a.on = false;
  nativeOnRing();
  saveAlarms(); renderAlarms();
}
function stopRing() { clearTimeout(ringTO); stopLoop(); $('ring').hidden = true; if (navigator.vibrate) navigator.vibrate(0); ringing = null; }
$('rStop').onclick = stopRing;
$('rSnooze').onclick = () => { const a = ringing; stopRing(); snoozes.push({ at: Date.now() + 5 * 60000, a }); };

/* layar alarm: geser bulan ke atas = bangun, ke bawah = tunda */
const moon = $('moon');
(function () {
  const st = $('stars');
  for (let i = 0; i < 70; i++) {
    const d = document.createElement('i'), z = Math.random() * 2.4 + .8;
    d.className = 'star';
    d.style.cssText = 'left:' + Math.random() * 100 + '%;top:' + Math.random() * 100 + '%;width:' + z + 'px;height:' + z + 'px;animation-delay:' + (Math.random() * 3).toFixed(2) + 's';
    st.appendChild(d);
  }
})();
let mY0 = 0, mDy = 0, mDrag = false;
function resetMoon() { moon.style.transition = 'none'; moon.style.transform = ''; moon.className = 'moonwrap'; mDy = 0; mDrag = false; }
function moveMoon(dy) { moon.style.transform = 'translateY(' + dy + 'px)'; moon.classList.toggle('up', dy < -50); moon.classList.toggle('down', dy > 50); }
moon.addEventListener('pointerdown', e => { mDrag = true; mY0 = e.clientY; moon.setPointerCapture(e.pointerId); moon.style.transition = 'none'; moon.classList.add('drag'); });
moon.addEventListener('pointermove', e => {
  if (!mDrag) return;
  const lim = innerHeight * .45;
  mDy = Math.max(-lim, Math.min(lim, e.clientY - mY0));
  moveMoon(mDy);
});
function lepasBulan() {
  if (!mDrag) return;
  mDrag = false; moon.classList.remove('drag'); moon.style.transition = 'transform .35s ease';
  if (mDy < -110) { moon.style.transform = 'translateY(-110vh)'; setTimeout(() => $('rStop').onclick(), 300); }
  else if (mDy > 110) { moon.style.transform = 'translateY(110vh)'; setTimeout(() => $('rSnooze').onclick(), 300); }
  else moveMoon(0);
}
moon.addEventListener('pointerup', lepasBulan);
moon.addEventListener('pointercancel', lepasBulan);

function cekAlarm() {
  if (setA.pre) praNotif();
  if (ringing) return;
  const i = snoozes.findIndex(s => s.at <= Date.now());
  if (i > -1) { ring(snoozes.splice(i, 1)[0].a); return; }
  const d = new Date(), hm = pad(d.getHours()) + ':' + pad(d.getMinutes()), cap = d.toDateString() + ' ' + hm;
  /* cek juga alarm yang terlewat (HP/tab sempat dibekukan) sampai 10 menit ke belakang, selama dibuat sebelum waktunya */
  for (const a of alarms) {
    if (!a.on) continue;
    const [h, m] = String(a.time).split(':').map(Number);
    for (let back = 0; back <= 10; back++) {
      const t = new Date(d.getTime() - back * 60000);
      if (t.getHours() !== h || t.getMinutes() !== m) continue;
      const c2 = t.toDateString() + ' ' + pad(h) + ':' + pad(m);
      if (a.fired === c2) break;
      if (a.days.length && !a.days.includes(t.getDay())) break;
      if (back > 0 && (a.made || 0) > t.getTime()) break;
      a.fired = c2; ring(a); return;
    }
  }
}

/* ===== PENGATURAN ALARM ===== */
let setA = { dur: 5, vol: 70, pre: 0 };
try { Object.assign(setA, JSON.parse(load('alm_set') || '{}')); } catch(e){}
const saveSet = () => save('alm_set', JSON.stringify(setA));
const DURS = [1, 3, 5, 10, 15, 20, 25, 0], PRES = [15, 30, 60, 0];
$('sDur').innerHTML = DURS.map(v => `<option value='${v}'>${v ? v + ' menit' : 'Tidak pernah'}</option>`).join('');
$('sPre').innerHTML = PRES.map(v => `<option value='${v}'>${v ? v + ' menit sebelumnya' : 'Mati'}</option>`).join('');
function ringkasSet() {
  $('setSum').textContent = 'Dering ' + (setA.dur ? setA.dur + ' menit' : 'tanpa batas') + ' \u00b7 Volume ' + setA.vol + '% \u00b7 Notifikasi ' + (setA.pre ? setA.pre + ' menit sebelumnya' : 'mati');
}
function terapkanVol() { if (master) master.gain.value = ((!$('almSet').hidden && draft) ? draft : setA).vol / 100 * 2; }
let draft = null;
const durL = v => v ? v + ' menit' : 'Tidak pernah';
const preL = v => v ? v + ' menit sebelumnya' : 'Mati';
$('setOpen').onclick = () => {
  draft = Object.assign({}, setA);
  $('sDur').value = draft.dur; $('sVol').value = draft.vol; $('sVolV').textContent = draft.vol + '%'; $('sPre').value = draft.pre;
  $('almSet').hidden = false;
};
$('sDur').onchange = () => { draft.dur = +$('sDur').value; };
$('sVol').oninput = () => { draft.vol = +$('sVol').value; $('sVolV').textContent = draft.vol + '%'; terapkanVol(); };
$('sVol').onchange = () => playTone('lembut');
$('sPre').onchange = () => { draft.pre = +$('sPre').value; };
/* keluar dari pengaturan: kalau ada perubahan, tanya dulu mau disimpan atau dibuang */
async function tutupSet() {
  const baris = [];
  if (draft.dur !== setA.dur) baris.push('Durasi dering: ' + durL(setA.dur) + ' \u2192 ' + durL(draft.dur));
  if (draft.vol !== setA.vol) baris.push('Volume: ' + setA.vol + '% \u2192 ' + draft.vol + '%');
  if (draft.pre !== setA.pre) baris.push('Notifikasi: ' + preL(setA.pre) + ' \u2192 ' + preL(draft.pre));
  if (baris.length) {
    const ok = await konfirmasi('Simpan perubahan?', baris.join('\n'), 'Simpan', 'Buang', 'pri');
    if (ok === null) return;
    if (ok) {
      setA = Object.assign({}, draft); saveSet(); ringkasSet(); nativeSync();
      if (setA.pre && 'Notification' in window && Notification.permission === 'default') { try { Notification.requestPermission(); } catch (e) {} }
    }
  }
  $('almSet').hidden = true;
  terapkanVol();
}
$('sClose').onclick = tutupSet;
$('almSet').addEventListener('click', e => { if (e.target === $('almSet')) tutupSet(); });
ringkasSet();

function toast(t) {
  const el = $('toast'); el.textContent = t; el.classList.add('show');
  clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove('show'), 9000);
}
$('toast').onclick = () => $('toast').classList.remove('show');
let katToastT;
function katToast(t) {
  const el = $('katToast'); if (!el) return;
  el.textContent = t; el.classList.add('show');
  clearTimeout(katToastT); katToastT = setTimeout(() => el.classList.remove('show'), 1800);
}
function praNotif() {
  const f = new Date(Date.now() + setA.pre * 60000);
  const hm = pad(f.getHours()) + ':' + pad(f.getMinutes()), cap = f.toDateString() + ' ' + hm;
  alarms.forEach(a => {
    if (!a.on || a.time !== hm || a.pre === cap) return;
    if (a.days.length && !a.days.includes(f.getDay())) return;
    a.pre = cap; saveAlarms();
    toast((a.emoji || '\u23f0') + ' ' + fmt12(a.time) + (a.label ? ' \u00b7 ' + a.label : '') + '\nberdering ' + setA.pre + ' menit lagi');
    notif('Alarm ' + fmt12(a.time), (a.label || 'Alarm') + ' berdering ' + setA.pre + ' menit lagi', 'pra-' + a.id);
    if (navigator.vibrate) navigator.vibrate(200);
  });
}

/* ===== ALARM ASLI HP (hanya aktif saat dijalankan sebagai aplikasi APK; di browser blok ini tidak melakukan apa-apa) =====
   Jembatan: tools/native-bridge.js membuat window.NativeAlarm (dipasang otomatis oleh build APK).
   Tiap alarm aktif dijadwalkan ke AlarmManager Android lewat notifikasi lokal, jadi tetap berbunyi walau aplikasi ditutup. */
var NA_LN = (window.NativeAlarm && window.NativeAlarm.isNative) ? window.NativeAlarm.LocalNotifications : null;
var naTimer = null, naSig = '', naIzin = '', naKanal = false, naBilang1 = false, naBilang2 = false;
function nativeSync() { if (!NA_LN) return; clearTimeout(naTimer); naTimer = setTimeout(nativeRun, 400); }
/* nomor unik kecil per alarm (id notifikasi Android harus bilangan 32-bit; id alarm = Date.now() terlalu besar) */
function naNomor() {
  const dipakai = new Set(alarms.map(a => a.n).filter(Boolean));
  let ubah = false;
  alarms.forEach(a => { if (!a.n) { let n = 1; while (dipakai.has(n)) n++; a.n = n; dipakai.add(n); ubah = true; } });
  return ubah;
}
function naBerikut(h, m) { const d = new Date(); d.setHours(h, m, 0, 0); if (d.getTime() <= Date.now()) d.setDate(d.getDate() + 1); return d; }
function naItems() {
  const out = [], pre = setA.pre;
  alarms.forEach(a => {
    if (!a.on || !/^\d\d:\d\d$/.test(a.time || '')) return;
    const [h, m] = a.time.split(':').map(Number);
    const tone = TONES[a.tone] ? a.tone : 'klasik', isi = a.label || 'Alarm';
    const dasar = { title: (a.emoji || '\u23f0') + ' ' + fmt12(a.time), body: isi, channelId: 'alm_' + tone, sound: 'alm_' + tone + '.wav', extra: { aid: a.id }, autoCancel: true };
    const praDasar = { title: 'Alarm ' + fmt12(a.time), body: isi + ' berdering ' + pre + ' menit lagi', channelId: 'alm_pra', extra: { aid: a.id, pra: 1 }, autoCancel: true };
    if (!a.days.length) {
      const at = naBerikut(h, m); a.at = at.getTime();
      out.push(Object.assign({ id: a.n * 20 }, dasar, { schedule: { at, allowWhileIdle: true } }));
      if (pre) { const p = new Date(at.getTime() - pre * 60000); if (p.getTime() > Date.now()) out.push(Object.assign({ id: a.n * 20 + 10 }, praDasar, { schedule: { at: p, allowWhileIdle: true } })); }
    } else {
      delete a.at;
      a.days.forEach(d => {
        out.push(Object.assign({ id: a.n * 20 + 1 + d }, dasar, { schedule: { on: { weekday: d + 1, hour: h, minute: m, second: 0 }, allowWhileIdle: true } }));
        if (pre) {
          let t = h * 60 + m - pre, wd = d;
          if (t < 0) { t += 1440; wd = (d + 6) % 7; }
          out.push(Object.assign({ id: a.n * 20 + 11 + d }, praDasar, { schedule: { on: { weekday: wd + 1, hour: Math.floor(t / 60), minute: t % 60, second: 0 }, allowWhileIdle: true } }));
        }
      });
    }
  });
  return out;
}
async function naKanalBuat() {
  if (naKanal) return;
  for (const k of Object.keys(TONES)) await NA_LN.createChannel({ id: 'alm_' + k, name: 'Alarm \u00b7 ' + TONES[k].n, description: 'Alarm dengan nada ' + TONES[k].n, importance: 5, visibility: 1, sound: 'alm_' + k + '.wav', vibration: true, lights: true });
  await NA_LN.createChannel({ id: 'alm_pra', name: 'Pengingat sebelum alarm', description: 'Pemberitahuan sebelum alarm berdering', importance: 4, visibility: 1, vibration: true });
  naKanal = true;
}
async function nativeRun() {
  try {
    if (naNomor()) save('alarms', JSON.stringify(alarms));
    const aktif = alarms.some(a => a.on);
    if (naIzin !== 'granted') {
      let r = await NA_LN.checkPermissions(); naIzin = r.display;
      if (aktif && naIzin !== 'granted' && naIzin !== 'denied') { r = await NA_LN.requestPermissions(); naIzin = r.display; }
    }
    if (naIzin !== 'granted') {
      if (aktif && !naBilang1) { naBilang1 = true; toast('\u26a0\ufe0f Izin notifikasi belum diberikan, alarm tidak akan berbunyi saat aplikasi ditutup.\nAktifkan di Pengaturan HP > Aplikasi > My Life > Notifikasi'); }
      return;
    }
    try {
      const e = await NA_LN.checkExactNotificationSetting();
      if (aktif && e && e.exact_alarm === 'denied' && !naBilang2) { naBilang2 = true; toast('\u26a0\ufe0f Izinkan "Alarm & pengingat" agar alarm tepat waktu'); await NA_LN.changeExactNotificationSetting(); }
    } catch (e) {}
    await naKanalBuat();
    const items = naItems();
    const sig = JSON.stringify(items);
    if (sig === naSig) return;
    const p = await NA_LN.getPending();
    if (p && p.notifications && p.notifications.length) await NA_LN.cancel({ notifications: p.notifications.map(n => ({ id: n.id })) });
    if (items.length) await NA_LN.schedule({ notifications: items });
    naSig = sig;
    save('alarms', JSON.stringify(alarms));
  } catch (e) { try { console.warn('alarm native gagal:', e); } catch (_) {} }
}
/* alarm sekali yang sudah berbunyi saat aplikasi tertutup -> matikan di daftar */
function naRapikan() {
  let ubah = false; const now = Date.now();
  alarms.forEach(a => { if (a.on && !a.days.length && a.at && a.at < now - 20000) { a.on = false; ubah = true; } });
  if (ubah) { save('alarms', JSON.stringify(alarms)); renderAlarms(); }
}
/* ketuk notifikasi alarm -> buka layar dering (hanya bila masih dalam rentang dering) */
function naKetuk(ex) {
  if (!ex || ex.pra || ringing) return;
  const a = alarms.find(x => x.id === ex.aid); if (!a) return;
  const [h, m] = a.time.split(':').map(Number), now = new Date();
  const occ = new Date(now); occ.setHours(h, m, 0, 0); if (occ > now) occ.setDate(occ.getDate() - 1);
  if (now - occ > (setA.dur || 10) * 60000) return;
  a.fired = occ.toDateString() + ' ' + pad(h) + ':' + pad(m);
  ring(a);
}
/* saat layar dering aplikasi sudah tampil, hapus notifikasi HP supaya tidak berbunyi dobel */
function nativeOnRing() {
  if (!NA_LN || document.hidden) return;
  const hapus = () => { try { const r = NA_LN.removeAllDeliveredNotifications(); if (r && r.catch) r.catch(() => {}); } catch (e) {} };
  setTimeout(hapus, 1500); setTimeout(hapus, 5000);
}
(function naMulai() {
  if (!NA_LN) return;
  naRapikan();
  nativeSync();
  try { NA_LN.addListener('localNotificationActionPerformed', ev => { try { naKetuk(ev && ev.notification && ev.notification.extra); } catch (e) {} }); } catch (e) {}
  document.addEventListener('visibilitychange', () => { if (!document.hidden) { naRapikan(); nativeSync(); } });
})();

/* ===== CATATAN KALENDER ===== */
const HARI_PANJANG = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];
const BLN3 = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
let notes = [], catCur = null, catFullId = null;
try { notes = JSON.parse(load('catatan') || '[]'); } catch(e){}
const saveNotes = () => save('catatan', JSON.stringify(notes));
function kunci(y, m, d) { return y + '-' + pad(m + 1) + '-' + pad(d); }
function hariIniKunci() { const n = new Date(); return kunci(n.getFullYear(), n.getMonth(), n.getDate()); }
function tglPendek(k) { const [y, m, d] = k.split('-').map(Number); return d + ' ' + BLN3[m - 1] + (y !== new Date().getFullYear() ? ' ' + y : ''); }
function tglPanjang(k) { const [y, m, d] = k.split('-').map(Number); return HARI_PANJANG[new Date(y, m - 1, d).getDay()] + ', ' + d + ' ' + BLN[m - 1] + ' ' + y; }
const adaCat = k => notes.some(n => n.date === k);
const urutCat = list => list.slice().sort((a, b) => a.date.localeCompare(b.date) || a.id - b.id);

/* blok di banner (antara jam dan quotes): maksimal 3 catatan yang disematkan, tinggi kotak tetap untuk 3 baris;
   hanya catatannya sendiri yang bisa diketuk, bukan seluruh blok */
function renderCatBanner() {
  const box = $('catBox'); box.innerHTML = '';
  const sem = urutCat(notes.filter(n => n.pin)).slice(0, 3);
  if (!sem.length) {
    ['Belum ada catatan yang disematkan', 'Sematkan maksimal 3 catatan lewat kalender'].forEach(t => { const k = document.createElement('div'); k.className = 'catkosong'; k.textContent = t; box.appendChild(k); });
    return;
  }
  const ini = hariIniKunci();
  sem.forEach(n => {
    const r = document.createElement('div'); r.className = 'catrow' + (n.date < ini ? ' lalu' : '');
    const bt = document.createElement('button'); bt.type = 'button'; bt.className = 'catn';
    const a = document.createElement('b'); a.textContent = tglPendek(n.date);
    const t = document.createElement('span'); t.textContent = n.text;
    bt.append(a, t);
    bt.onclick = () => bukaCatatan(n.id);
    r.appendChild(bt); box.appendChild(r);
  });
}

/* daftar di bawah kalender: hanya catatan bulan yang dipilih (nama bulan diketuk) */
const PIN_SVG = '<svg viewBox="0 0 24 24"><path d="M12 17v5"/><path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z"/></svg>';
function daftarCatatan() {
  const w = document.createElement('div'); w.className = 'catlist';
  const hd = document.createElement('div'); hd.className = 'cathd';
  const h = document.createElement('h4'); h.textContent = 'Catatan ' + BULAN[selBln] + ' ' + tahun;
  const c = document.createElement('span'); c.className = 'catpin'; c.textContent = 'Disematkan ' + notes.filter(n => n.pin).length + '/3';
  hd.append(h, c); w.appendChild(hd);
  const list = urutCat(notes.filter(n => n.date.startsWith(tahun + '-' + pad(selBln + 1) + '-')));
  if (!list.length) { const k = document.createElement('div'); k.className = 'catkosong'; k.textContent = 'Belum ada catatan di ' + BULAN[selBln] + ' ' + tahun + '. Ketuk tanggal lalu tombol + untuk menambah, atau ketuk nama bulan lain.'; w.appendChild(k); return w; }
  list.forEach(n => {
    const r = document.createElement('div'); r.className = 'catitem';
    const a = document.createElement('b'); a.textContent = tglPendek(n.date);
    const t = document.createElement('span'); t.textContent = n.text;
    const pb = document.createElement('button'); pb.type = 'button'; pb.className = 'pinbtn' + (n.pin ? ' on' : '');
    pb.innerHTML = PIN_SVG; pb.setAttribute('aria-label', n.pin ? 'Lepas pin' : 'Sematkan catatan');
    pb.onclick = ev => { ev.stopPropagation(); gantiPin(n); };
    r.append(a, t, pb);
    r.onclick = () => bukaForm(n);
    w.appendChild(r);
  });
  return w;
}
/* pin catatan: maksimal 3, yang disematkan tampil di blok banner */
function gantiPin(n) {
  if (!n.pin && notes.filter(x => x.pin).length >= 3) { toast('Maksimal 3 catatan yang bisa disematkan.\nLepas pin catatan lain dulu.'); return; }
  n.pin = !n.pin;
  saveNotes(); renderCatBanner(); segarDaftar();
}
/* menjaga posisi gulir: kalau halaman menyusut (daftar lebih pendek), tambahkan ruang kosong secukupnya
   supaya kalender tidak ikut bergeser */
function jagaGulir(g, st) {
  g.style.paddingBottom = '';
  const maks = g.scrollHeight - g.clientHeight;
  if (st > maks) g.style.paddingBottom = (parseFloat(getComputedStyle(g).paddingBottom) + (st - maks)) + 'px';
  g.scrollTop = st;
}
/* penanda ringkas: tahun & bulan mana saja yang punya catatan (titik hijau). Tinggi kotak tetap 3 baris tahun,
   sisanya digulir. Kolom cari: tiap kata harus cocok dengan tahun, nama bulan, atau isi catatan (mis. "2008 rapat") */
let cariQ = '', cmScroll = 0;
const CM_H = 26, CM_GAP = 3;
function cocokCari(n, toks) {
  const [y, m] = n.date.split('-').map(Number), isi = n.text.toLowerCase(), bn = BULAN[m - 1].toLowerCase(), ys = String(y);
  return toks.every(t => ys.includes(t) || isi.includes(t) || (t.length >= 3 && bn.startsWith(t)));
}
function isiPeta(list) {
  const toks = cariQ.toLowerCase().split(/\s+/).filter(Boolean);
  const peta = {};
  notes.filter(n => !toks.length || cocokCari(n, toks)).forEach(n => { const [y, m] = n.date.split('-').map(Number); (peta[y] = peta[y] || new Set()).add(m - 1); });
  const thn = Object.keys(peta).map(Number).sort((a, b) => a - b);
  list.textContent = '';
  if (!thn.length) { const k = document.createElement('div'); k.className = 'cmkosong'; k.textContent = 'Tidak ada tahun atau catatan yang cocok.'; list.appendChild(k); return -1; }
  thn.forEach(y => {
    const row = document.createElement('div'); row.className = 'cmrow';
    const yb = document.createElement('button'); yb.type = 'button'; yb.className = 'cmy' + (y === tahun ? ' cur' : ''); yb.textContent = y;
    yb.onclick = () => { tahun = y; selBln = Math.min(...peta[y]); selTgl = null; renderYear(); };
    row.appendChild(yb);
    BLN3.forEach((nm, b) => {
      const mb = document.createElement('button'); mb.type = 'button';
      mb.className = 'cmb' + (peta[y].has(b) ? ' on' : '') + (y === tahun && b === selBln ? ' cur' : '');
      mb.textContent = nm; mb.setAttribute('aria-label', BULAN[b] + ' ' + y + (peta[y].has(b) ? ', ada catatan' : ', tidak ada catatan'));
      mb.onclick = () => { if (y === tahun) { selBln = b; segarDaftar(); } else { tahun = y; selBln = b; selTgl = null; renderYear(); } };
      row.appendChild(mb);
    });
    list.appendChild(row);
  });
  return thn.indexOf(tahun);
}
function petaCatatan() {
  const box = document.createElement('div'); box.className = 'catmap';
  if (!notes.length) { box.hidden = true; return box; }
  const hd = document.createElement('div'); hd.className = 'cmh';
  const t = document.createElement('span'); t.className = 'cmt'; t.textContent = 'Ada catatan';
  const q = document.createElement('input'); q.className = 'cmq'; q.type = 'search'; q.value = cariQ; q.placeholder = 'Cari tahun / isi catatan';
  q.setAttribute('enterkeyhint', 'search'); q.setAttribute('autocomplete', 'off'); q.setAttribute('autocapitalize', 'off'); q.spellcheck = false; q.setAttribute('aria-label', 'Cari tahun atau isi catatan');
  hd.append(t, q);
  const list = document.createElement('div'); list.className = 'cmlist';
  const idx = isiPeta(list);
  q.addEventListener('input', () => { cariQ = q.value; cmScroll = 0; isiPeta(list); list.scrollTop = 0; });
  list.addEventListener('scroll', () => { cmScroll = list.scrollTop; });
  box.append(hd, list);
  requestAnimationFrame(() => {   /* pertahankan posisi gulir; pastikan baris tahun yang sedang dibuka terlihat */
    let st = cmScroll, vis = 3 * CM_H + 2 * CM_GAP;
    if (idx >= 0) { const top = idx * (CM_H + CM_GAP); if (top < st) st = top; else if (top + CM_H > st + vis) st = top + CM_H - vis; }
    list.scrollTop = st; cmScroll = list.scrollTop;
  });
  return box;
}

function segarDaftar() {
  const g = $('yGrid'), st = g.scrollTop;
  g.querySelectorAll('h4[data-b]').forEach(h => h.classList.toggle('sel', +h.dataset.b === selBln));
  const lama = g.querySelector('.catlist'), baru = daftarCatatan();
  if (lama) lama.replaceWith(baru); else g.appendChild(baru);
  const lm = g.querySelector('.catmap'), bm = petaCatatan();
  if (lm) lm.replaceWith(bm); else g.insertBefore(bm, baru);
  jagaGulir(g, st);
}

function segarCat() {
  renderCatBanner();
  if (!$('cal').hidden) renderYear();
  if (!$('catFull').hidden) isiFull();
}

/* halaman catatan penuh (dari blok banner) */
function isiFull() {
  const n = notes.find(x => x.id === catFullId);
  if (!n) { $('catFull').hidden = true; catFullId = null; return; }
  $('cfDate').textContent = tglPanjang(n.date);
  $('cfText').textContent = n.text;
}
function bukaCatatan(id) { catFullId = id; isiFull(); if (catFullId !== null) $('catFull').hidden = false; }
$('cfClose').onclick = () => { $('catFull').hidden = true; catFullId = null; };
$('cfEdit').onclick = () => { const n = notes.find(x => x.id === catFullId); if (n) bukaForm(n); };
$('cfDel').onclick = () => { const n = notes.find(x => x.id === catFullId); if (n) hapusCat(n); };

/* form tambah / ubah */
function fitCe() { const e = $('ceText'); e.style.height = 'auto'; e.style.height = e.scrollHeight + 'px'; }
$('ceText').addEventListener('input', fitCe);
function bukaForm(n) {
  catCur = n || null;
  $('ceTitle').textContent = n ? 'Ubah catatan' : 'Catatan baru';
  $('ceDate').value = n ? n.date : (selTgl || hariIniKunci());
  $('ceText').value = n ? n.text : '';
  $('ceDel').hidden = !n;
  $('catEdit').hidden = false;
  fitCe();
}
function tutupForm() { $('catEdit').hidden = true; catCur = null; }
$('catAdd').onclick = () => bukaForm(null);
$('ceCancel').onclick = tutupForm;
$('ceSave').onclick = () => {
  const d = $('ceDate').value, t = $('ceText').value.trim();
  if (!d) { $('ceDate').focus(); return; }
  if (!t) { $('ceText').focus(); return; }
  if (catCur) { catCur.date = d; catCur.text = t; } else notes.push({ id: Date.now(), date: d, text: t });
  const [yy, mm] = d.split('-').map(Number); tahun = yy; selBln = mm - 1;
  saveNotes(); tutupForm(); segarCat();
};
$('ceDel').onclick = () => { if (catCur) hapusCat(catCur); };
async function hapusCat(n) {
  const datar = n.text.replace(/\s+/g, ' '), ringkas = datar.length > 90 ? datar.slice(0, 90) + '...' : datar;
  const ok = await konfirmasi('Hapus catatan?', tglPendek(n.date) + ' \u00b7 ' + ringkas, 'Hapus');
  if (!ok) return;
  notes = notes.filter(x => x !== n);
  saveNotes();
  if (catFullId === n.id) { $('catFull').hidden = true; catFullId = null; }
  tutupForm(); segarCat();
}

renderCatBanner();
let hariCat = new Date().getDate();
setInterval(() => { const h = new Date().getDate(); if (h !== hariCat) { hariCat = h; renderCatBanner(); } }, 1000);

setInterval(cekAlarm, 1000);
setInterval(() => { if (!$('alm').hidden) infoAlarm(); }, 1000);
emojiJam();

/* ===== LANGIT realistis (jam & zona waktu perangkat) ===== */
/* [jam, zenit r,g,b, horizon r,g,b, daratan r,g,b, brightness, saturate, bintang, lampu]
   Pagi = biru dingin & redup (bukan kuning), siang = netral terang, sore = keemasan, senja = oranye-magenta, malam = biru tua */
const LG = [
  [0,    12,18,52,    22,30,70,     20,26,56,    .85,.75, 1,   1],    /* larut malam */
  [4,    14,22,62,    30,40,86,     24,32,68,    .85,.75, 1,   1],    /* dini hari */
  [5,    24,36,88,    62,72,132,    36,46,86,    .88,.8,  .8,  .95],  /* subuh (biru gelap) */
  [5.5,  44,64,125,   150,110,150,  70,78,118,   .92,.85, .35, .7],   /* fajar: semburat ungu-mawar di ufuk */
  [6,    80,110,175,  245,165,120,  120,120,150, .9, .9,  .05, .4],   /* matahari terbit */
  [6.5,  120,160,220, 255,205,165,  160,170,195, .88,.95, 0,   .1],   /* pagi awal */
  [7.5,  150,190,240, 215,225,240,  185,198,220, .92,.95, 0,   0],    /* pagi: biru dingin */
  [9,    190,215,250, 230,238,250,  220,228,242, .97,1,   0,   0],    /* pagi terang */
  [12,   255,255,255, 255,255,255,  255,255,255, 1.03,1.08,0, 0],    /* siang */
  [14.5, 255,255,250, 255,250,235,  255,250,240, 1,  1.05,0,  0],    /* siang akhir */
  [16,   255,245,225, 255,225,170,  255,232,195, 1,  1.1, 0,  0],    /* sore */
  [17,   250,215,175, 255,170,95,   250,195,140, 1,  1.15,0,  .1],   /* golden hour */
  [17.75,200,150,150, 255,120,60,   190,130,120, .97,1.1, 0,  .3],   /* menjelang senja */
  [18.25,110,85,150,  240,105,95,   120,90,125,  .93,1,   .15,.55],  /* senja */
  [18.75,55,55,120,   150,85,130,   70,70,115,   .9, .9,  .5, .85],  /* petang */
  [19.5, 26,36,92,    56,60,115,    40,48,92,    .87,.8,  .9, 1],    /* malam */
  [20.5, 14,22,60,    26,34,76,     22,28,60,    .85,.75, 1,  1],    /* malam */
  [24,   12,18,52,    22,30,70,     20,26,56,    .85,.75, 1,  1]
];
/* bulan: fase nyata hari ini (sabit/separuh/purnama) digambar dengan bayangan bagian gelapnya */
function bulan(c) {
  const R = 25, age = (((Date.now() / 86400000 + 2440587.5 - 2451550.1) / 29.530588853) % 1 + 1) % 1;
  const f = (1 - Math.cos(2 * Math.PI * age)) / 2, wax = age < .5, dir = wax ? -1 : 1;
  const LIT = '#fffbea', DARK = '#262f58', glow = '0 0 14px 3px rgba(225,232,255,' + (.2 + .4 * f).toFixed(2) + ')';
  const maria = 'radial-gradient(circle at 38% 36%,rgba(115,115,110,.45) 0,transparent 15%),radial-gradient(circle at 63% 30%,rgba(125,125,120,.38) 0,transparent 11%),radial-gradient(circle at 55% 64%,rgba(120,120,115,.4) 0,transparent 17%),radial-gradient(circle at 30% 66%,rgba(130,130,125,.32) 0,transparent 10%),' + LIT;
  let bg, sh;
  if (f <= .5) { const dx = dir * 2 * R * f; bg = DARK; sh = 'inset ' + dx.toFixed(1) + 'px ' + (-dx * .18).toFixed(1) + 'px 0 0 ' + LIT + ', ' + glow; }
  else { const dx = -dir * 2 * R * (1 - f); bg = maria; sh = 'inset ' + dx.toFixed(1) + 'px ' + (-dx * .18).toFixed(1) + 'px 0 0 ' + DARK + ', ' + glow; }
  c.style.background = bg; c.style.boxShadow = sh;
  c.style.setProperty('--aa', (.12 + .22 * f).toFixed(2)); c.style.setProperty('--ba', (.55 + .45 * f).toFixed(2));
}
function langit() {
  const d = new Date(), t = d.getHours() + d.getMinutes() / 60 + d.getSeconds() / 3600;
  let i = 0;
  while (i < LG.length - 2 && t >= LG[i + 1][0]) i++;
  const a = LG[i], b = LG[i + 1], f = (t - a[0]) / (b[0] - a[0]), v = a.map((x, k) => x + (b[k] - x) * f);
  const rgb = k => 'rgb(' + [v[k], v[k + 1], v[k + 2]].map(Math.round) + ')', s = $('sky').style;
  s.setProperty('--g1', rgb(1)); s.setProperty('--g2', rgb(4)); s.setProperty('--g3', rgb(7));
  s.setProperty('--br', v[10].toFixed(3)); s.setProperty('--sa', v[11].toFixed(3));
  s.setProperty('--st', v[12].toFixed(3)); s.setProperty('--lt', v[13].toFixed(3));
  /* matahari 06:00-18:00, bulan 18:00-06:00, kiri ke kanan */
  const siang = t >= 6 && t < 18, p = siang ? (t - 6) / 12 : (t >= 18 ? t - 18 : t + 6) / 12;
  const ev = Math.sin(Math.PI * p), c = $('cel'), x = (6 + p * 88).toFixed(2) + '%', y = (46 - 38 * ev).toFixed(2) + '%';
  c.className = 'cel ' + (siang ? 'sun' : 'moon');
  c.style.left = x; c.style.top = y; c.style.opacity = Math.min(1, .55 + ev * 5).toFixed(2); /* tidak lagi memudar: terbit/terbenam ditutupi siluet kota */
  const hz = Math.pow(1 - ev, 1.6), col = [255, Math.round(244 - 134 * hz), Math.round(176 - 136 * hz)].join(',');
  c.style.setProperty('--sc', 'rgb(' + col + ')'); c.style.setProperty('--sg', 'rgba(' + col + ',.5)');
  c.style.setProperty('--rc', siang ? col : '205,218,255'); /* warna sinar */
  if (siang) { c.style.background = ''; c.style.boxShadow = ''; c.style.removeProperty('--aa'); c.style.removeProperty('--ba'); } else bulan(c);
  /* cahaya atmosfer: di sekitar matahari/bulan, plus semburat fajar (kiri) & senja (kanan) di ufuk */
  let gx = x, gy = y, gc;
  if (siang) gc = 'rgba(' + col + ',' + (.3 + .5 * hz).toFixed(2) + ')';
  else if (t >= 4.8 && t < 6) { const k = (t - 4.8) / 1.2; gx = '8%'; gy = '45%'; gc = 'rgba(' + [150 + 105 * k, 110 + 50 * k, 190 - 90 * k].map(Math.round) + ',' + (.1 + .45 * k).toFixed(2) + ')'; }
  else if (t >= 18 && t < 19.4) { const k = 1 - (t - 18) / 1.4; gx = '92%'; gy = '45%'; gc = 'rgba(' + [150 + 105 * k, 110 + 50 * k, 190 - 90 * k].map(Math.round) + ',' + (.1 + .45 * k).toFixed(2) + ')'; }
  else gc = 'rgba(150,170,255,.34)'; /* cahaya bulan menerangi alam */
  s.setProperty('--gx', gx); s.setProperty('--gy', gy); s.setProperty('--gc', gc);
}
/* bintang malam: dibuat acak (tetap sama tiap dibuka), tiap bintang berkedip dengan ritme sendiri */
(function () {
  const w = document.querySelector('#sky .sk-stars'); if (!w) return;
  let r = 20260; const rnd = () => (r = (r * 16807) % 2147483647) / 2147483647;
  const tint = ['#fff', '#fff', '#fff', '#dfe8ff', '#cfdcff', '#fff4d6'];
  for (let i = 0; i < 90; i++) {
    const e = document.createElement('i'), big = rnd() < .14, sz = big ? 2 + rnd() * 1.2 : .9 + rnd() * 1.2;
    e.style.cssText = 'left:' + (rnd() * 100).toFixed(1) + '%;top:' + (Math.pow(rnd(), 1.25) * 44).toFixed(1) + '%;width:' + sz.toFixed(1) + 'px;height:' + sz.toFixed(1) + 'px;background:' + tint[Math.floor(rnd() * tint.length)] + ';--d:' + (1.8 + rnd() * 3.6).toFixed(1) + 's;--l:-' + (rnd() * 6).toFixed(1) + 's';
    e.className = (big ? 'b ' : '') + (rnd() < .4 ? 'k2' : '');
    w.appendChild(e);
  }
  /* awan tipis yang melintas pelan di depan matahari/bulan (warnanya mengikuti warna langit) */
  /* benda langit dibungkus lapisan bertopeng cakrawala: tertutup siluet kota & laut saat terbit/terbenam */
  const ce = $('cel'); if (ce) { const cw = document.createElement('div'); cw.className = 'cel-wrap'; ce.parentNode.insertBefore(cw, ce); cw.appendChild(ce); }
  ['', 'v2'].forEach(k => { const v = document.createElement('div'); v.className = 'sk-veil ' + k; $('sky').appendChild(v); });
})();
langit();
setInterval(langit, 30000);
document.addEventListener('visibilitychange', () => { if (!document.hidden) langit(); });
/* animasi huruf: "Selamat Malam" naik-turun bergantian, tahun flip bergantian */
(function () {
  const ye = $('welYear'); setChars(ye, ye.textContent, true);
  const refit = () => fitGrad(ye);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(refit);
  window.addEventListener('load', refit); window.addEventListener('resize', refit);
})();

/* ===== KARTU GAMBAR (dipakai KARTU SEMANGAT dan KARTU PETA): pajang gambar 16:9 tanpa teks, geser ke samping untuk gambar lain =====
   ketuk 3x di kartu = mode edit (tambah dari galeri / link, hapus gambar), ketuk 1x di luar = kunci.
   Rasio lain: gambar tampil utuh (ukuran asli, tidak terpotong) di atas latar buram dari gambar itu sendiri. */
function buatKartuGambar(o) {
  const kartu = $(o.kartu), track = $(o.track), dots = $(o.dots), panel = $(o.panel);
  const kUrl = $(o.url), kMsg = $(o.msg), kThumbs = $(o.thumbs), kFile = $(o.file);
  const HINT = 'Ketuk di luar kotak untuk mengunci';
  let daftar = [], idx = 0, edit = false, taps = 0, tapT = null, msgT = null;

  try { const s = JSON.parse(load(o.key) || '[]'); if (Array.isArray(s)) daftar = s.filter(u => typeof u === 'string' && u); } catch (e) { daftar = []; }

  function simpan() {
    try { localStorage.setItem(o.key, JSON.stringify(daftar)); return true; } catch (e) { return false; }
  }
  function pesan(t, err) {
    clearTimeout(msgT); kMsg.textContent = t; kMsg.className = err ? 'err' : '';
    if (t !== HINT) msgT = setTimeout(() => { kMsg.textContent = HINT; kMsg.className = ''; }, 3500);
  }
  const cssUrl = u => 'url(' + JSON.stringify(u) + ')';

  function gambar(u) {
    const s = document.createElement('div'); s.className = 'ks-slide';
    const bg = document.createElement('div'); bg.className = 'ks-bg'; bg.style.backgroundImage = cssUrl(u);
    const im = document.createElement('img'); im.alt = ''; im.draggable = false; im.referrerPolicy = 'no-referrer';
    im.addEventListener('error', () => s.classList.add('rusak'));
    im.src = u;
    s.append(bg, im); return s;
  }
  function kosong() {
    const d = document.createElement('div'); d.className = 'ks-kosong';
    d.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="9" cy="10" r="1.6"/><path d="M4 18l5.5-5.5 4 4 2.5-2.5L20 18"/></svg>';
    return d;
  }
  function lebar() { return track.clientWidth; }
  function keSlide(i, halus) {
    idx = Math.max(0, Math.min(daftar.length - 1, i));
    track.scrollTo({ left: idx * lebar(), behavior: halus ? 'smooth' : 'auto' });
    tandaiDots(idx);
  }
  function tandaiDots(i) {
    dots.querySelectorAll('i').forEach((d, n) => d.classList.toggle('on', n === i));
    kThumbs.querySelectorAll('.kt').forEach((t, n) => t.classList.toggle('on', n === i));
  }
  function render() {
    track.textContent = ''; dots.textContent = '';
    if (!daftar.length) track.appendChild(kosong());
    else daftar.forEach(u => track.appendChild(gambar(u)));
    if (daftar.length > 1) daftar.forEach(() => dots.appendChild(document.createElement('i')));
    renderThumbs();
    idx = Math.min(idx, Math.max(0, daftar.length - 1));
    requestAnimationFrame(() => keSlide(idx));
  }
  function renderThumbs() {
    kThumbs.textContent = '';
    daftar.forEach((u, n) => {
      const t = document.createElement('div'); t.className = 'kt';
      const im = document.createElement('img'); im.alt = ''; im.referrerPolicy = 'no-referrer'; im.src = u;
      const x = document.createElement('button'); x.type = 'button'; x.className = 'kx'; x.textContent = '×'; x.setAttribute('aria-label', 'Hapus gambar');
      x.addEventListener('click', ev => { ev.stopPropagation(); hapus(n); });
      t.addEventListener('click', () => keSlide(n, true));
      t.append(im, x); kThumbs.appendChild(t);
    });
    tandaiDots(idx);
  }

  /* geser ke samping: titik penanda mengikuti */
  let raf = 0;
  track.addEventListener('scroll', () => {
    if (raf) return;
    raf = requestAnimationFrame(() => {
      raf = 0; const w = lebar(); if (!w) return;
      const i = Math.round(track.scrollLeft / w);
      if (i !== idx && i >= 0 && i < daftar.length) { idx = i; tandaiDots(i); }
    });
  }, { passive: true });
  /* halaman Beranda disembunyikan lalu dibuka lagi / layar diputar: pertahankan posisi gambar */
  if (window.ResizeObserver) new ResizeObserver(() => { if (lebar()) track.scrollLeft = idx * lebar(); }).observe(track);

  /* tambah */
  function tambah(u) {
    daftar.push(u);
    if (!simpan()) { daftar.pop(); pesan('Penyimpanan penuh, hapus beberapa gambar dulu', true); return false; }
    idx = daftar.length - 1; render(); return true;
  }
  function perkecil(file) {
    return new Promise((ok, gagal) => {
      const url = URL.createObjectURL(file), im = new Image();
      im.onload = () => {
        const M = 1280, k = Math.min(1, M / Math.max(im.naturalWidth, im.naturalHeight));
        const c = document.createElement('canvas'); c.width = Math.round(im.naturalWidth * k); c.height = Math.round(im.naturalHeight * k);
        const g = c.getContext('2d'); g.fillStyle = '#0b0d1a'; g.fillRect(0, 0, c.width, c.height); g.drawImage(im, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url); ok(c.toDataURL('image/jpeg', .82));
      };
      im.onerror = () => { URL.revokeObjectURL(url); gagal(); };
      im.src = url;
    });
  }
  $(o.gal).addEventListener('click', () => kFile.click());
  kFile.addEventListener('change', async () => {
    const fs = Array.from(kFile.files || []); kFile.value = '';
    let ok = 0, gagal = 0;
    for (const f of fs) {
      try { if (tambah(await perkecil(f))) ok++; else break; } catch (e) { gagal++; }
    }
    if (ok) pesan(ok + ' gambar ditambahkan ✓' + (gagal ? ' (' + gagal + ' gagal dibaca)' : ''));
    else if (gagal) pesan('Gambar tidak bisa dibaca', true);
  });
  function tambahLink() {
    const v = kUrl.value.trim();
    if (!/^https?:\/\/\S+$/i.test(v)) { pesan('Link harus diawali http:// atau https://', true); return; }
    if (daftar.includes(v)) { pesan('Link itu sudah ada', true); return; }
    pesan('Memeriksa gambar…');
    const t = new Image(); t.referrerPolicy = 'no-referrer';
    t.onload = () => { if (tambah(v)) { kUrl.value = ''; pesan('Gambar ditambahkan ✓'); } };
    t.onerror = () => pesan(alasanLink(v, 'foto'), true);
    t.src = v;
  }
  $(o.urlBtn).addEventListener('click', tambahLink);
  kUrl.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); tambahLink(); } });

  /* hapus (dengan konfirmasi) */
  async function hapus(n) {
    const ok = await konfirmasi('Hapus gambar?', 'Gambar ke-' + (n + 1) + ' dari ' + daftar.length + ' akan dihapus dari ' + o.nama + '.', 'Hapus');
    if (!ok) return;
    daftar.splice(n, 1); simpan();
    if (idx >= daftar.length) idx = daftar.length - 1;
    render(); pesan('Gambar dihapus ✓');
  }

  /* ketuk 3x = mode edit, ketuk 1x di luar = kunci */
  function mulai() { edit = true; kartu.classList.add('editing'); panel.hidden = false; pesan(HINT); }
  function kunci() {
    if (!edit) return; edit = false; kartu.classList.remove('editing'); panel.hidden = true;
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
  }
  kartu.addEventListener('click', () => {
    if (edit) return;
    taps++; clearTimeout(tapT);
    if (taps >= 3) { taps = 0; mulai(); } else tapT = setTimeout(() => { taps = 0; }, 500);
  });
  document.addEventListener('click', e => {
    if (!edit) return;
    const p = e.composedPath ? e.composedPath() : [];
    if (p.includes(kartu) || p.includes(panel) || p.includes($('cfm')) || e.target === kFile) return;
    kunci();
  });

  render();
}
buatKartuGambar({ kartu: 'kartuSemangat', track: 'ksTrack', dots: 'ksDots', panel: 'kPanel', url: 'kUrl', msg: 'kMsg', thumbs: 'kThumbs', file: 'kFile', gal: 'kGal', urlBtn: 'kUrlBtn', key: 'semangat', nama: 'kartu semangat' });
/* ===== KARTU PETA: 6 kotak terpisah (3x2). Tiap kotak punya gambar sendiri (geser ke samping = gambar lain di kotak itu).
   Ketuk 1x kotak = gambar besar (geser = gambar lain, tutup lewat panah kiri atas). Ketuk 3x kotak = mode edit kotak itu (tambah dari galeri / link, hapus gambar);
   saat mode edit, ketuk kotak lain = pindah edit ke kotak itu, ketuk 1x di luar = kunci. Data lama (kunci 'kartu2') otomatis jadi isi kotak 1. ===== */
function buatKartuPeta(o) {
  const grid = $(o.grid), panel = $(o.panel), judul = $(o.judul);
  const kUrl = $(o.url), kMsg = $(o.msg), kThumbs = $(o.thumbs), kFile = $(o.file);
  const pv = $('pv'), pvTrack = $('pvTrack'), pvCnt = $('pvCnt');
  const N = 6, HINT = 'Ketuk di luar kotak untuk mengunci';
  const kotak = [];
  let aktif = -1, taps = 0, tapT = null, tapN = -1, msgT = null, vi = 0;
  const ikon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="9" cy="10" r="1.6"/><path d="M4 18l5.5-5.5 4 4 2.5-2.5L20 18"/></svg>';

  function muat(n) {
    let raw = load(o.key + (n + 1));
    if (raw === null && n === 0) raw = load(o.lama);
    try { const s = JSON.parse(raw || '[]'); if (Array.isArray(s)) return s.filter(u => typeof u === 'string' && u); } catch (e) {}
    return [];
  }
  function simpan(n) { try { localStorage.setItem(o.key + (n + 1), JSON.stringify(kotak[n].daftar)); return true; } catch (e) { return false; } }
  function pesan(t, err) {
    clearTimeout(msgT); kMsg.textContent = t; kMsg.className = err ? 'err' : '';
    if (t !== HINT) msgT = setTimeout(() => { kMsg.textContent = HINT; kMsg.className = ''; }, 3500);
  }

  function tandai(n) {
    const b = kotak[n];
    b.dots.querySelectorAll('i').forEach((d, i) => d.classList.toggle('on', i === b.idx));
    if (n === aktif) kThumbs.querySelectorAll('.kt').forEach((t, i) => t.classList.toggle('on', i === b.idx));
  }
  function keSlide(n, i, halus) {
    const b = kotak[n]; b.idx = Math.max(0, Math.min(b.daftar.length - 1, i));
    b.track.scrollTo({ left: b.idx * b.track.clientWidth, behavior: halus ? 'smooth' : 'auto' });
    tandai(n);
  }
  function renderKotak(n) {
    const b = kotak[n];
    b.track.textContent = ''; b.dots.textContent = '';
    if (!b.daftar.length) { const d = document.createElement('div'); d.className = 'pk-kosong'; d.innerHTML = ikon; b.track.appendChild(d); }
    else b.daftar.forEach(u => {
      const s = document.createElement('div'); s.className = 'pk-slide';
      const im = document.createElement('img'); im.alt = ''; im.draggable = false; im.referrerPolicy = 'no-referrer';
      im.addEventListener('error', () => s.classList.add('rusak'));
      im.src = u; s.appendChild(im); b.track.appendChild(s);
    });
    if (b.daftar.length > 1) b.daftar.forEach(() => b.dots.appendChild(document.createElement('i')));
    b.idx = Math.min(b.idx, Math.max(0, b.daftar.length - 1));
    requestAnimationFrame(() => keSlide(n, b.idx));
  }
  function renderThumbs() {
    kThumbs.textContent = '';
    if (aktif < 0) return;
    const b = kotak[aktif];
    b.daftar.forEach((u, i) => {
      const t = document.createElement('div'); t.className = 'kt';
      const im = document.createElement('img'); im.alt = ''; im.referrerPolicy = 'no-referrer'; im.src = u;
      const x = document.createElement('button'); x.type = 'button'; x.className = 'kx'; x.textContent = '×'; x.setAttribute('aria-label', 'Hapus gambar');
      x.addEventListener('click', ev => { ev.stopPropagation(); hapus(i); });
      t.addEventListener('click', () => keSlide(aktif, i, true));
      t.append(im, x); kThumbs.appendChild(t);
    });
    tandai(aktif);
  }

  /* bangun 6 kotak */
  for (let n = 0; n < N; n++) {
    const el = document.createElement('div'); el.className = 'pk-box'; el.dataset.n = n;
    const track = document.createElement('div'); track.className = 'pk-track';
    const dots = document.createElement('div'); dots.className = 'pk-dots';
    el.append(track, dots); grid.appendChild(el);
    const b = { el, track, dots, daftar: muat(n), idx: 0 }; kotak.push(b);
    let raf = 0;
    track.addEventListener('scroll', () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0; const w = track.clientWidth; if (!w) return;
        const i = Math.round(track.scrollLeft / w);
        if (i !== b.idx && i >= 0 && i < b.daftar.length) { b.idx = i; tandai(n); }
      });
    }, { passive: true });
    if (window.ResizeObserver) new ResizeObserver(() => { if (track.clientWidth) track.scrollLeft = b.idx * track.clientWidth; }).observe(track);
    renderKotak(n);
  }

  /* ---- penampil gambar besar ---- */
  function buka(n) {
    const b = kotak[n]; if (!b.daftar.length) return;
    pvTrack.textContent = '';
    b.daftar.forEach(u => {
      const s = document.createElement('div'); s.className = 'pv-slide';
      const im = document.createElement('img'); im.alt = ''; im.draggable = false; im.referrerPolicy = 'no-referrer';
      im.addEventListener('error', () => s.classList.add('rusak'));
      /* gambar kartu peta selalu tampil utuh (contain), tidak pernah dipotong */
      im.style.objectFit = 'contain';
      im.src = u; s.appendChild(im); pvTrack.appendChild(s);
    });
    vi = Math.max(0, Math.min(b.daftar.length - 1, b.idx));
    pv.hidden = false; infoPv(b.daftar.length);
    requestAnimationFrame(() => { pvTrack.scrollLeft = vi * pvTrack.clientWidth; });
  }
  function infoPv(n) { pvCnt.textContent = n > 1 ? (vi + 1) + ' / ' + n : ''; }
  function tutupPv() { pv.hidden = true; pvTrack.textContent = ''; }
  let rafV = 0;
  pvTrack.addEventListener('scroll', () => {
    if (rafV) return;
    rafV = requestAnimationFrame(() => {
      rafV = 0; const w = pvTrack.clientWidth; if (!w) return;
      const i = Math.round(pvTrack.scrollLeft / w), n = pvTrack.children.length;
      if (i !== vi && i >= 0 && i < n) { vi = i; infoPv(n); }
    });
  }, { passive: true });
  /* gambar besar tidak lagi menutup saat disentuh; tutup hanya lewat panah kiri atas (atau tombol Escape) */
  $('pvX').addEventListener('click', e => { e.stopPropagation(); tutupPv(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !pv.hidden) tutupPv(); });

  /* ---- tambah / hapus (untuk kotak yang sedang diedit) ---- */
  function tambah(n, u) {
    const b = kotak[n];
    b.daftar.push(u);
    if (!simpan(n)) { b.daftar.pop(); pesan('Penyimpanan penuh, hapus beberapa gambar dulu', true); return false; }
    b.idx = b.daftar.length - 1; renderKotak(n); if (n === aktif) renderThumbs(); return true;
  }
  function perkecil(file) {
    return new Promise((ok, gagal) => {
      const url = URL.createObjectURL(file), im = new Image();
      im.onload = () => {
        const M = 1280, k = Math.min(1, M / Math.max(im.naturalWidth, im.naturalHeight));
        const c = document.createElement('canvas'); c.width = Math.round(im.naturalWidth * k); c.height = Math.round(im.naturalHeight * k);
        const g = c.getContext('2d'); g.fillStyle = '#0b0d1a'; g.fillRect(0, 0, c.width, c.height); g.drawImage(im, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url); ok(c.toDataURL('image/jpeg', .82));
      };
      im.onerror = () => { URL.revokeObjectURL(url); gagal(); };
      im.src = url;
    });
  }
  $(o.gal).addEventListener('click', () => { if (aktif >= 0) kFile.click(); });
  kFile.addEventListener('change', async () => {
    const fs = Array.from(kFile.files || []); kFile.value = '';
    const n = aktif; if (n < 0) return;
    let ok = 0, gagal = 0;
    for (const f of fs) {
      try { if (tambah(n, await perkecil(f))) ok++; else break; } catch (e) { gagal++; }
    }
    if (ok) pesan(ok + ' gambar ditambahkan ✓' + (gagal ? ' (' + gagal + ' gagal dibaca)' : ''));
    else if (gagal) pesan('Gambar tidak bisa dibaca', true);
  });
  function tambahLink() {
    const n = aktif; if (n < 0) return;
    const v = kUrl.value.trim();
    if (!/^https?:\/\/\S+$/i.test(v)) { pesan('Link harus diawali http:// atau https://', true); return; }
    if (kotak[n].daftar.includes(v)) { pesan('Link itu sudah ada di kotak ini', true); return; }
    pesan('Memeriksa gambar…');
    const t = new Image(); t.referrerPolicy = 'no-referrer';
    t.onload = () => { if (tambah(n, v)) { kUrl.value = ''; pesan('Gambar ditambahkan ✓'); } };
    t.onerror = () => pesan(alasanLink(v, 'foto'), true);
    t.src = v;
  }
  $(o.urlBtn).addEventListener('click', tambahLink);
  kUrl.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); tambahLink(); } });
  async function hapus(i) {
    const n = aktif, b = kotak[n];
    const ok = await konfirmasi('Hapus gambar?', 'Gambar ke-' + (i + 1) + ' dari ' + b.daftar.length + ' akan dihapus dari kotak ' + (n + 1) + '.', 'Hapus');
    if (!ok) return;
    b.daftar.splice(i, 1); simpan(n);
    if (b.idx >= b.daftar.length) b.idx = Math.max(0, b.daftar.length - 1);
    renderKotak(n); if (n === aktif) renderThumbs(); pesan('Gambar dihapus ✓');
  }

  /* ---- ketuk 1x = gambar besar, ketuk 3x = mode edit kotak itu, ketuk 1x di luar = kunci ---- */
  function mulai(n) {
    aktif = n; panel.hidden = false; judul.textContent = 'Kotak ' + (n + 1);
    kotak.forEach((b, i) => b.el.classList.toggle('editing', i === n));
    renderThumbs(); pesan(HINT);
  }
  function kunci() {
    if (aktif < 0) return; aktif = -1; panel.hidden = true; kThumbs.textContent = '';
    kotak.forEach(b => b.el.classList.remove('editing'));
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
  }
  grid.addEventListener('click', e => {
    const el = e.target.closest ? e.target.closest('.pk-box') : null; if (!el) return;
    const n = +el.dataset.n;
    if (aktif >= 0) { if (n !== aktif) mulai(n); return; }
    if (tapN !== n) taps = 0;
    tapN = n; taps++; clearTimeout(tapT);
    if (taps >= 3) { taps = 0; mulai(n); return; }
    tapT = setTimeout(() => { if (taps === 1) buka(n); taps = 0; }, 380);
  });
  document.addEventListener('click', e => {
    if (aktif < 0) return;
    const p = e.composedPath ? e.composedPath() : [];
    if (p.includes(grid) || p.includes(panel) || p.includes($('cfm')) || e.target === kFile) return;
    kunci();
  });
}
buatKartuPeta({ grid: 'kartuPeta', panel: 'petaPanel', judul: 'petaJudul', url: 'petaUrl', msg: 'petaMsg', thumbs: 'petaThumbs', file: 'petaFile', gal: 'petaGal', urlBtn: 'petaUrlBtn', key: 'peta_', lama: 'kartu2' });

/* ===== KARTU VIDEO: 4 kotak (2x2). Tiap kotak menyimpan banyak video (geser ke samping = video lain).
   Video dari galeri disimpan di IndexedDB (muat besar), video dari link disimpan sebagai alamatnya (harus link langsung .mp4/.webm).
   Ketuk 1x kotak = putar layar penuh, ketuk 3x = mode edit kotak itu, ketuk 1x di luar = kunci. ===== */
function buatKartuVideo(o) {
  const grid = $(o.grid), panel = $(o.panel), judul = $(o.judul);
  const kUrl = $(o.url), kMsg = $(o.msg), kThumbs = $(o.thumbs), kFile = $(o.file);
  const vv = $('vv'), vvTrack = $('vvTrack'), vvCnt = $('vvCnt');
  const N = 4, HINT = 'Ketuk di luar kotak untuk mengunci';
  const kotak = [];
  let aktif = -1, taps = 0, tapT = null, tapN = -1, msgT = null, vi = 0;
  const ikon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="3"/><path d="M10 9.5v5l4.5-2.5z"/></svg>';
  const play = '<svg viewBox="0 0 24 24"><path d="M7 4.5v15l13-7.5z"/></svg>';

  /* penyimpanan video galeri (IndexedDB) */
  let dbP = null;
  const db = () => dbP || (dbP = new Promise((ok, no) => {
    try { const r = indexedDB.open('mylife_video', 1); r.onupgradeneeded = () => r.result.createObjectStore('v'); r.onsuccess = () => ok(r.result); r.onerror = () => no(r.error); } catch (e) { no(e); }
  }));
  const tx = (mode, fn) => db().then(d => new Promise((ok, no) => {
    const t = d.transaction('v', mode), r = fn(t.objectStore('v'));
    t.oncomplete = () => ok(r && r.result); t.onerror = () => no(t.error); t.onabort = () => no(t.error);
  }));
  const idbPut = (id, b) => tx('readwrite', s => s.put(b, id));
  const idbGet = id => tx('readonly', s => s.get(id));
  const idbDel = id => tx('readwrite', s => s.delete(id));
  const urls = new Map();
  async function src(it) {
    if (!it.startsWith('idb:')) return it;
    if (urls.has(it)) return urls.get(it);
    try { const b = await idbGet(it.slice(4)); if (!b) return null; const u = URL.createObjectURL(b); urls.set(it, u); return u; } catch (e) { return null; }
  }

  function muat(n) {
    try { const s = JSON.parse(load(o.key + (n + 1)) || '[]'); if (Array.isArray(s)) return s.filter(u => typeof u === 'string' && u); } catch (e) {}
    return [];
  }
  function simpan(n) { try { localStorage.setItem(o.key + (n + 1), JSON.stringify(kotak[n].daftar)); return true; } catch (e) { return false; } }
  function pesan(t, err) {
    clearTimeout(msgT); kMsg.textContent = t; kMsg.className = err ? 'err' : '';
    if (t !== HINT) msgT = setTimeout(() => { kMsg.textContent = HINT; kMsg.className = ''; }, 3500);
  }
  function tandai(n) {
    const b = kotak[n];
    b.dots.querySelectorAll('i').forEach((d, i) => d.classList.toggle('on', i === b.idx));
    if (n === aktif) kThumbs.querySelectorAll('.kt').forEach((t, i) => t.classList.toggle('on', i === b.idx));
  }
  function keSlide(n, i, halus) {
    const b = kotak[n]; b.idx = Math.max(0, Math.min(b.daftar.length - 1, i));
    b.track.scrollTo({ left: b.idx * b.track.clientWidth, behavior: halus ? 'smooth' : 'auto' });
    tandai(n);
  }
  function buatVideo(u, kecil) {
    const v = document.createElement('video'); v.muted = true; v.playsInline = true; v.preload = 'metadata'; v.setAttribute('playsinline', '');
    v.src = u + '#t=0.1'; return v;
  }
  async function renderKotak(n) {
    const b = kotak[n], tok = ++b.tok;
    const arr = await Promise.all(b.daftar.map(src));
    if (tok !== b.tok) return;
    b.track.textContent = ''; b.dots.textContent = '';
    if (!b.daftar.length) { const d = document.createElement('div'); d.className = 'pk-kosong'; d.innerHTML = ikon; b.track.appendChild(d); }
    else arr.forEach(u => {
      const s = document.createElement('div'); s.className = 'pk-slide';
      if (!u) s.classList.add('rusak');
      else {
        const v = buatVideo(u); v.addEventListener('error', () => s.classList.add('rusak')); s.appendChild(v);
        const p = document.createElement('div'); p.className = 'vk-play'; p.innerHTML = play; s.appendChild(p);
      }
      b.track.appendChild(s);
    });
    if (b.daftar.length > 1) b.daftar.forEach(() => b.dots.appendChild(document.createElement('i')));
    b.idx = Math.min(b.idx, Math.max(0, b.daftar.length - 1));
    requestAnimationFrame(() => keSlide(n, b.idx));
  }
  async function renderThumbs() {
    kThumbs.textContent = '';
    if (aktif < 0) return;
    const n = aktif, b = kotak[n], arr = await Promise.all(b.daftar.map(src));
    if (n !== aktif) return;
    kThumbs.textContent = '';
    b.daftar.forEach((it, i) => {
      const t = document.createElement('div'); t.className = 'kt';
      if (arr[i]) t.appendChild(buatVideo(arr[i]));
      const x = document.createElement('button'); x.type = 'button'; x.className = 'kx'; x.textContent = '×'; x.setAttribute('aria-label', 'Hapus video');
      x.addEventListener('click', ev => { ev.stopPropagation(); hapus(i); });
      t.addEventListener('click', () => keSlide(aktif, i, true));
      t.appendChild(x); kThumbs.appendChild(t);
    });
    tandai(n);
  }

  /* bangun 4 kotak */
  for (let n = 0; n < N; n++) {
    const el = document.createElement('div'); el.className = 'pk-box vk-box'; el.dataset.n = n;
    const track = document.createElement('div'); track.className = 'pk-track';
    const dots = document.createElement('div'); dots.className = 'pk-dots';
    el.append(track, dots); grid.appendChild(el);
    const b = { el, track, dots, daftar: muat(n), idx: 0, tok: 0 }; kotak.push(b);
    let raf = 0;
    track.addEventListener('scroll', () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0; const w = track.clientWidth; if (!w) return;
        const i = Math.round(track.scrollLeft / w);
        if (i !== b.idx && i >= 0 && i < b.daftar.length) { b.idx = i; tandai(n); }
      });
    }, { passive: true });
    if (window.ResizeObserver) new ResizeObserver(() => { if (track.clientWidth) track.scrollLeft = b.idx * track.clientWidth; }).observe(track);
    renderKotak(n);
  }

  /* ---- pemutar layar penuh: kontrol buatan sendiri di bawah (play/pause, mundur/maju 10 dtk, waktu, bar durasi).
         Ketuk area kosong = sembunyikan/tampilkan kontrol ---- */
  const vSeek = $('vvSeek'), vCur = $('vvCur'), vDur = $('vvDur');
  let seeking = false;
  const cur = () => vvTrack.querySelectorAll('video')[vi] || null;
  const wkt = s => { s = Math.max(0, Math.floor(s || 0)); const j = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), d = s % 60; return (j ? j + ':' + String(m).padStart(2, '0') : m) + ':' + String(d).padStart(2, '0'); };
  function segarkan() {
    const v = cur(); if (!v) return;
    const dur = isFinite(v.duration) ? v.duration : 0;
    if (!seeking) vSeek.value = dur ? Math.round(v.currentTime / dur * 1000) : 0;
    vSeek.style.setProperty('--p', (vSeek.value / 10) + '%');
    vCur.textContent = wkt(seeking ? vSeek.value / 1000 * dur : v.currentTime); vDur.textContent = wkt(dur);
    vv.classList.toggle('main', !v.paused && !v.ended);
  }
  function jedaSemua(kecuali) { vvTrack.querySelectorAll('video').forEach((v, i) => { if (i !== kecuali) v.pause(); }); }
  function mainkan(i) { const v = vvTrack.querySelectorAll('video')[i]; if (v) { const p = v.play(); if (p && p.catch) p.catch(() => {}); } }
  function infoVv(n) { vvCnt.textContent = n > 1 ? (vi + 1) + ' / ' + n : ''; }
  async function buka(n) {
    const b = kotak[n]; if (!b.daftar.length) return;
    const arr = await Promise.all(b.daftar.map(src));
    vvTrack.textContent = '';
    arr.forEach(u => {
      const s = document.createElement('div'); s.className = 'pv-slide';
      if (!u) s.classList.add('rusak');
      else {
        const v = document.createElement('video'); v.controls = false; v.playsInline = true; v.setAttribute('playsinline', ''); v.preload = 'metadata'; v.src = u;
        v.addEventListener('error', () => s.classList.add('rusak'));
        /* video tegak = penuhi layar (cover), video lebar = lebar penuh tanpa border kiri-kanan (contain) */
        v.addEventListener('loadedmetadata', () => { v.style.objectFit = v.videoWidth < v.videoHeight ? 'cover' : 'contain'; });
        ['timeupdate', 'durationchange', 'loadedmetadata', 'play', 'pause', 'ended', 'seeked'].forEach(ev => v.addEventListener(ev, () => { if (cur() === v) segarkan(); }));
        s.appendChild(v);
      }
      vvTrack.appendChild(s);
    });
    vi = Math.max(0, Math.min(b.daftar.length - 1, b.idx));
    vv.classList.remove('sembunyi', 'main'); seeking = false;
    vv.hidden = false; infoVv(b.daftar.length); segarkan();
    requestAnimationFrame(() => { vvTrack.scrollLeft = vi * vvTrack.clientWidth; mainkan(vi); segarkan(); });
  }
  function tutupVv() { jedaSemua(-1); vv.hidden = true; vvTrack.textContent = ''; vv.classList.remove('sembunyi', 'main'); }
  let rafV = 0;
  vvTrack.addEventListener('scroll', () => {
    if (rafV) return;
    rafV = requestAnimationFrame(() => {
      rafV = 0; const w = vvTrack.clientWidth; if (!w) return;
      const i = Math.round(vvTrack.scrollLeft / w), n = vvTrack.children.length;
      if (i !== vi && i >= 0 && i < n) { vi = i; infoVv(n); jedaSemua(i); mainkan(i); segarkan(); }
    });
  }, { passive: true });
  $('vvX').addEventListener('click', e => { e.stopPropagation(); tutupVv(); });
  $('vvPlay').addEventListener('click', () => {
    const v = cur(); if (!v) return;
    if (v.paused || v.ended) { if (v.ended) v.currentTime = 0; mainkan(vi); } else v.pause();
  });
  $('vvBack').addEventListener('click', () => { const v = cur(); if (v) { v.currentTime = Math.max(0, v.currentTime - 10); segarkan(); } });
  $('vvFwd').addEventListener('click', () => { const v = cur(); if (v) { v.currentTime = Math.min(isFinite(v.duration) ? v.duration : v.currentTime + 10, v.currentTime + 10); segarkan(); } });
  vSeek.addEventListener('input', () => { seeking = true; const v = cur(); if (v && isFinite(v.duration)) v.currentTime = vSeek.value / 1000 * v.duration; segarkan(); });
  vSeek.addEventListener('change', () => { seeking = false; segarkan(); });
  vv.addEventListener('click', e => { if (e.target.closest && e.target.closest('button,input')) return; vv.classList.toggle('sembunyi'); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !vv.hidden) tutupVv(); });

  /* ---- tambah / hapus ---- */
  function tambah(n, it) {
    const b = kotak[n]; b.daftar.push(it);
    if (!simpan(n)) { b.daftar.pop(); pesan('Penyimpanan penuh, hapus beberapa video dulu', true); return false; }
    b.idx = b.daftar.length - 1; renderKotak(n); if (n === aktif) renderThumbs(); return true;
  }
  $(o.gal).addEventListener('click', () => { if (aktif >= 0) kFile.click(); });
  kFile.addEventListener('change', async () => {
    const fs = Array.from(kFile.files || []); kFile.value = '';
    const n = aktif; if (n < 0) return;
    let ok = 0, gagal = 0;
    for (const f of fs) {
      if (!/^video\//.test(f.type)) { gagal++; continue; }
      const id = 'v' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
      try { await idbPut(id, f); } catch (e) { gagal++; pesan('Penyimpanan video penuh / tidak didukung', true); continue; }
      if (tambah(n, 'idb:' + id)) ok++; else { idbDel(id).catch(() => {}); break; }
    }
    if (ok) pesan(ok + ' video ditambahkan ✓' + (gagal ? ' (' + gagal + ' gagal)' : ''));
    else if (gagal && kMsg.className !== 'err') pesan('Video tidak bisa dibaca', true);
  });
  function tambahLink() {
    const n = aktif; if (n < 0) return;
    const v = kUrl.value.trim();
    if (!/^https?:\/\/\S+$/i.test(v)) { pesan('Link harus diawali http:// atau https://', true); return; }
    if (kotak[n].daftar.includes(v)) { pesan('Link itu sudah ada di kotak ini', true); return; }
    pesan('Memeriksa video…');
    const t = document.createElement('video'); let selesai = false;
    const akhir = (ok) => { if (selesai) return; selesai = true; clearTimeout(to); t.removeAttribute('src'); t.load();
      if (ok) { if (tambah(n, v)) { kUrl.value = ''; pesan('Video ditambahkan ✓'); } } else pesan(alasanLink(v, 'video'), true); };
    const to = setTimeout(() => akhir(false), 30000);
    t.preload = 'metadata'; t.muted = true;
    t.addEventListener('loadedmetadata', () => akhir(true)); t.addEventListener('error', () => akhir(false));
    t.src = v;
  }
  $(o.urlBtn).addEventListener('click', tambahLink);
  kUrl.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); tambahLink(); } });
  async function hapus(i) {
    const n = aktif, b = kotak[n];
    const ok = await konfirmasi('Hapus video?', 'Video ke-' + (i + 1) + ' dari ' + b.daftar.length + ' akan dihapus dari kotak ' + (n + 1) + '.', 'Hapus');
    if (!ok) return;
    const it = b.daftar.splice(i, 1)[0]; simpan(n);
    if (it.startsWith('idb:')) { idbDel(it.slice(4)).catch(() => {}); if (urls.has(it)) { URL.revokeObjectURL(urls.get(it)); urls.delete(it); } }
    if (b.idx >= b.daftar.length) b.idx = Math.max(0, b.daftar.length - 1);
    renderKotak(n); if (n === aktif) renderThumbs(); pesan('Video dihapus ✓');
  }

  /* ---- ketuk 1x = putar, ketuk 3x = edit kotak itu, ketuk 1x di luar = kunci ---- */
  function mulai(n) {
    aktif = n; panel.hidden = false; judul.textContent = 'Kotak ' + (n + 1);
    kotak.forEach((b, i) => b.el.classList.toggle('editing', i === n));
    renderThumbs(); pesan(HINT);
  }
  function kunci() {
    if (aktif < 0) return; aktif = -1; panel.hidden = true; kThumbs.textContent = '';
    kotak.forEach(b => b.el.classList.remove('editing'));
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
  }
  grid.addEventListener('click', e => {
    const el = e.target.closest ? e.target.closest('.pk-box') : null; if (!el) return;
    const n = +el.dataset.n;
    if (aktif >= 0) { if (n !== aktif) mulai(n); return; }
    if (tapN !== n) taps = 0;
    tapN = n; taps++; clearTimeout(tapT);
    if (taps >= 3) { taps = 0; mulai(n); return; }
    tapT = setTimeout(() => { if (taps === 1) buka(n); taps = 0; }, 380);
  });
  document.addEventListener('click', e => {
    if (aktif < 0) return;
    const p = e.composedPath ? e.composedPath() : [];
    if (p.includes(grid) || p.includes(panel) || p.includes($('cfm')) || e.target === kFile) return;
    kunci();
  });
}
buatKartuVideo({ grid: 'kartuVideo', panel: 'videoPanel', judul: 'videoJudul', url: 'videoUrl', msg: 'videoMsg', thumbs: 'videoThumbs', file: 'videoFile', gal: 'videoGal', urlBtn: 'videoUrlBtn', key: 'video_' });


/* ===== AREA IMPIAN: tulis impian; ketuk 3x = edit, ketuk 1x di luar = kunci; rata kiri/tengah/kanan + pilihan font ===== */
(function () {
  const wrap = $('impWrap'), box = $('impBox'), sel = $('impFont');
  /* s = skala ukuran supaya font tulisan tangan tidak terlihat kecil */
  const FONTS = [
    { n: 'Poppins',          f: "'Poppins',system-ui,sans-serif",  s: 1 },
    { n: 'Dosis',            f: "'Dosis',system-ui,sans-serif",    s: 1.1 },
    { n: 'Merriweather',     f: "'Merriweather',Georgia,serif",    s: .95 },
    { n: 'Playfair Display', f: "'Playfair Display',Georgia,serif", s: 1.05 },
    { n: 'Dancing Script',   f: "'Dancing Script','Brush Script MT',cursive", s: 1.2 },
    { n: 'Caveat',           f: "'Caveat','Comic Sans MS',cursive", s: 1.3 },
    { n: 'Pacifico',         f: "'Pacifico','Brush Script MT',cursive", s: .95 },
    { n: 'Lobster',          f: "'Lobster','Brush Script MT',cursive", s: 1.05 },
    { n: 'Satisfy',          f: "'Satisfy','Brush Script MT',cursive", s: 1.2 },
    { n: 'Amatic SC',        f: "'Amatic SC','Comic Sans MS',cursive", s: 1.45 }
  ];
  let edit = false, taps = 0, tapT = null;
  FONTS.forEach((o, i) => { const e = document.createElement('option'); e.value = i; e.textContent = o.n; sel.appendChild(e); });

  function setFont(i) {
    i = (i >= 0 && i < FONTS.length) ? i : 0;
    const o = FONTS[i];
    box.style.fontFamily = o.f; box.style.setProperty('--fs', (15 * o.s).toFixed(1) + 'px');
    sel.value = i; sel.style.fontFamily = o.f;
  }
  function setAl(a) {
    box.style.textAlign = a;
    wrap.querySelectorAll('.impal button').forEach(b => b.classList.toggle('on', b.dataset.al === a));
  }
  box.value = load('impian') || '';
  setFont(parseInt(load('impian_font'), 10) || 0);
  setAl(['left', 'center', 'right'].includes(load('impian_al')) ? load('impian_al') : 'left');

  function mulai() {
    edit = true; wrap.classList.add('editing'); box.readOnly = false; box.focus();
    const n = box.value.length; box.setSelectionRange(n, n);
  }
  function kunci() {
    if (!edit) return; edit = false; wrap.classList.remove('editing'); box.readOnly = true;
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
    box.scrollTop = 0; save('impian', box.value);
  }
  /* ketuk 3x di kotak = mode edit */
  wrap.querySelector('.impcard').addEventListener('click', () => {
    if (edit) return;
    taps++; clearTimeout(tapT);
    if (taps >= 3) { taps = 0; mulai(); } else tapT = setTimeout(() => { taps = 0; }, 500);
  });
  box.addEventListener('input', () => save('impian', box.value));
  wrap.querySelectorAll('.impal button').forEach(b => b.addEventListener('click', () => {
    setAl(b.dataset.al); save('impian_al', b.dataset.al); box.focus();
  }));
  sel.addEventListener('change', () => { setFont(parseInt(sel.value, 10)); save('impian_font', sel.value); });
  /* ketuk 1x di luar kotak = kunci */
  document.addEventListener('click', e => {
    if (!edit) return;
    const p = e.composedPath ? e.composedPath() : [];
    if (!p.includes(wrap)) kunci();
  });
})();

/* ===== DUA KOTAK: 2 kotak (emoji + teks badge) + judul + info perantauan; ketuk 3x di kotak = edit, ketuk 1x di luar = kunci ===== */
(function () {
  const wrap = $('dkWrap'), line = $('dkRantau'), rEmo = $('dkREmo'), rDate = $('dkRDate'), msg = $('dkMsg');
  const boxes = wrap.querySelectorAll('.dk-box'), emo = wrap.querySelectorAll('.dk-emo'),
        bdg = wrap.querySelectorAll('.dk-badge'), ttl = wrap.querySelectorAll('.dk-title');
  const fields = [].concat([].slice.call(emo), [].slice.call(bdg), [].slice.call(ttl));
  const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  const pad = n => (n < 10 ? '0' : '') + n;
  let edit = false, taps = 0, tapT = null;
  let data = { k: [{ e: '', b: '', t: '' }, { e: '', b: '', t: '' }], r: { e: '', d: '' } };

  const str = (v, n) => (typeof v === 'string' ? v : '');
  try {
    const s = JSON.parse(load('kotak2') || 'null');
    if (s && Array.isArray(s.k)) {
      for (let i = 0; i < 2; i++) {
        const o = s.k[i] || {};
        data.k[i] = { e: str(o.e, 12), b: str(o.b, 16), t: str(o.t, 120) };
      }
    }
    if (s && s.r) data.r = { e: str(s.r.e, 12), d: /^\d{4}-\d{2}-\d{2}$/.test(s.r.d || '') ? s.r.d : '' };
  } catch (e) { /* data rusak: pakai kosong */ }
  const simpan = () => save('kotak2', JSON.stringify(data));

  /* ambil 1 emoji terakhir yang diketik; huruf/angka biasa ditolak */
  function grafemTerakhir(s) {
    s = String(s || ''); if (!s) return '';
    try {
      if (window.Intl && Intl.Segmenter) {
        const a = Array.from(new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(s), x => x.segment);
        return a[a.length - 1];
      }
    } catch (e) { /* lanjut ke cara biasa */ }
    return Array.from(s).slice(-1)[0];
  }
  function emojiOk(g) {
    try { return /\p{Extended_Pictographic}|\p{Regional_Indicator}/u.test(g); } catch (e) { return true; }
  }
  function bacaEmoji(el, lama) {
    const g = grafemTerakhir(el.value);
    const v = (!g || emojiOk(g)) ? g : lama;
    el.value = v; return v;
  }
  function fit(el) { el.style.width = Math.min(Math.max((el.value || el.placeholder).length + 3, 7), 24) + 'ch'; }

  function tanggalValid(v) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v || ''); if (!m) return null;
    const y = +m[1], mo = +m[2], d = +m[3], t = new Date(y, mo - 1, d);
    if (y < 1900 || t.getFullYear() !== y || t.getMonth() !== mo - 1 || t.getDate() !== d) return null;
    return { y: y, m: mo, d: d };
  }
  function hariIni() { const n = new Date(); return n.getFullYear() + '-' + pad(n.getMonth() + 1) + '-' + pad(n.getDate()); }
  function lama(t, sekarang) {
    let y = sekarang.getFullYear() - t.y, m = sekarang.getMonth() + 1 - t.m;
    if (sekarang.getDate() < t.d) m--;
    if (m < 0) { y--; m += 12; }
    return { y: Math.max(y, 0), m: Math.max(m, 0) };
  }

  function tampilRantau() {
    line.textContent = ''; line.classList.remove('kosong');
    const t = tanggalValid(data.r.d);
    if (data.r.e) { const e = document.createElement('span'); e.className = 'dk-re'; e.textContent = data.r.e; line.appendChild(e); }
    const s = document.createElement('span');
    if (!t) { line.classList.add('kosong'); s.textContent = 'Sudah merantau … (ketuk 3x kotak untuk mengisi tanggal)'; line.appendChild(s); return; }
    const l = lama(t, new Date());
    s.appendChild(document.createTextNode('Sudah merantau '));
    const b = document.createElement('b'); b.textContent = l.y + ' tahun ' + l.m + ' bulan'; s.appendChild(b);
    s.appendChild(document.createTextNode(' (sejak ' + pad(t.d) + ' ' + BULAN[t.m - 1] + ' ' + t.y + ')'));
    line.appendChild(s);
  }

  /* isi awal */
  for (let i = 0; i < 2; i++) { emo[i].value = data.k[i].e; bdg[i].value = data.k[i].b; ttl[i].value = data.k[i].t; fit(bdg[i]); }
  rEmo.value = data.r.e; rDate.value = tanggalValid(data.r.d) ? data.r.d : '';
  tampilRantau();

  function mulai(i) {
    edit = true; wrap.classList.add('editing');
    fields.forEach(f => { f.readOnly = false; f.tabIndex = 0; });
    rDate.max = hariIni(); msg.textContent = 'Ketuk di luar kotak untuk mengunci'; msg.classList.remove('err');
    emo[i].focus(); try { emo[i].select(); } catch (e) { /* abaikan */ }
  }
  function kunci() {
    if (!edit) return; edit = false; wrap.classList.remove('editing');
    fields.forEach(f => { f.readOnly = true; f.tabIndex = -1; });
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
    simpan(); tampilRantau();
  }

  /* ketuk 3x di salah satu kotak = mode edit */
  boxes.forEach((bx, i) => bx.addEventListener('click', () => {
    if (edit) return;
    taps++; clearTimeout(tapT);
    if (taps >= 3) { taps = 0; mulai(i); } else tapT = setTimeout(() => { taps = 0; }, 500);
  }));

  emo.forEach((el, i) => {
    el.addEventListener('focus', () => { if (edit) { try { el.select(); } catch (e) { /* abaikan */ } } });
    el.addEventListener('input', () => { data.k[i].e = bacaEmoji(el, data.k[i].e); simpan(); });
  });
  bdg.forEach((el, i) => el.addEventListener('input', () => { data.k[i].b = el.value; fit(el); simpan(); }));
  ttl.forEach((el, i) => el.addEventListener('input', () => { data.k[i].t = el.value; simpan(); }));
  rEmo.addEventListener('focus', () => { try { rEmo.select(); } catch (e) { /* abaikan */ } });
  rEmo.addEventListener('input', () => { data.r.e = bacaEmoji(rEmo, data.r.e); simpan(); tampilRantau(); });
  rDate.addEventListener('change', () => {
    const v = rDate.value;
    if (!v) { data.r.d = ''; simpan(); tampilRantau(); msg.textContent = 'Tanggal dikosongkan'; msg.classList.remove('err'); return; }
    if (!tanggalValid(v) || v > hariIni()) {
      rDate.value = tanggalValid(data.r.d) ? data.r.d : '';
      msg.textContent = 'Tanggal tidak valid atau di masa depan'; msg.classList.add('err'); return;
    }
    data.r.d = v; simpan(); tampilRantau(); msg.textContent = 'Tersimpan'; msg.classList.remove('err');
  });

  /* ketuk 1x di luar = kunci */
  document.addEventListener('click', e => {
    if (!edit) return;
    const p = e.composedPath ? e.composedPath() : [];
    if (!p.includes(wrap)) kunci();
  });
  /* hitungan tahun/bulan ikut berubah saat aplikasi dibuka lagi */
  document.addEventListener('visibilitychange', () => { if (!document.hidden && !edit) tampilRantau(); });
})();

/* ===== SEDANG DITEMANI: pil judul + 5 pil pilihan (sendiri/keluarga/pasangan/teman/sahabat).
   ketuk 3x pil judul = mode edit (judul bisa ditulis; pilihan hanya dipilih dengan ketuk 2x), ketuk 1x di luar = kunci.
   Aturan pilihan: "Sendiri" hanya boleh sendirian; selain "Sendiri" boleh dipilih lebih dari satu ===== */
(function () {
  const wrap = $('tmWrap'), judul = $('tmTitle'), kotak = $('tmTitleBox');
  const opts = [].slice.call(wrap.querySelectorAll('.tm-opt'));
  const KUNCI = opts.map(o => o.dataset.k);
  let edit = false, taps = 0, tapT = null;
  const dTap = { k: '', t: null };
  let data = { t: 'Sedang ditemani', p: [] };   /* p = daftar pilihan (array) */

  try {
    const s = JSON.parse(load('ditemani') || 'null');
    if (s && typeof s === 'object') {
      if (typeof s.t === 'string') data.t = s.t;
      /* data lama berupa satu teks (mis. 'teman'), data baru berupa daftar */
      const lama = Array.isArray(s.p) ? s.p : (s.p ? [s.p] : []);
      data.p = lama.filter((k, i) => KUNCI.indexOf(k) > -1 && lama.indexOf(k) === i);
      if (data.p.indexOf('sendiri') > -1 && data.p.length > 1) data.p = ['sendiri'];
    }
  } catch (e) { /* data rusak: pakai bawaan */ }
  const simpan = () => save('ditemani', JSON.stringify(data));

  function tampil() {
    judul.value = data.t;
    opts.forEach(o => {
      const on = data.p.indexOf(o.dataset.k) > -1;
      o.classList.toggle('on', on); o.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
  }
  tampil();

  function mulai() {
    edit = true; wrap.classList.add('editing');
    judul.readOnly = false; judul.tabIndex = 0;
    opts.forEach(o => { o.tabIndex = 0; });
    judul.focus(); try { judul.select(); } catch (e) { /* abaikan */ }
  }
  function kunci() {
    if (!edit) return; edit = false; wrap.classList.remove('editing');
    judul.readOnly = true; judul.tabIndex = -1;
    opts.forEach(o => { o.tabIndex = -1; });
    clearTimeout(dTap.t); dTap.k = '';
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
    data.t = judul.value.trim(); simpan(); tampil();
  }

  /* ketuk 3x di pil judul = mode edit */
  kotak.addEventListener('click', () => {
    if (edit) return;
    taps++; clearTimeout(tapT);
    if (taps >= 3) { taps = 0; mulai(); } else tapT = setTimeout(() => { taps = 0; }, 500);
  });

  judul.addEventListener('input', () => { data.t = judul.value; simpan(); });

  /* pil pilihan: hanya bisa dipilih saat mode edit, dengan ketuk 2x. Ketuk 2x pil yang sedang menyala = matikan */
  opts.forEach(o => {
    o.addEventListener('mousedown', e => e.preventDefault()); /* jaga fokus judul supaya tata letak tidak bergeser */
    o.addEventListener('click', () => {
      if (!edit) return;
      const k = o.dataset.k;
      if (dTap.k === k) {
        clearTimeout(dTap.t); dTap.k = '';
        const i = data.p.indexOf(k);
        if (i > -1) data.p.splice(i, 1);                                 /* ketuk 2x pil yang menyala = matikan */
        else if (k === 'sendiri') data.p = ['sendiri'];                  /* Sendiri: matikan semua yang lain */
        else { data.p = data.p.filter(x => x !== 'sendiri'); data.p.push(k); } /* lainnya: tambah, Sendiri otomatis mati */
        simpan(); tampil();
        return;
      }
      dTap.k = k; clearTimeout(dTap.t); dTap.t = setTimeout(() => { dTap.k = ''; }, 400);
    });
  });

  /* ketuk 1x di luar = kunci */
  document.addEventListener('click', e => {
    if (!edit) return;
    const p = e.composedPath ? e.composedPath() : [];
    if (!p.includes(wrap)) kunci();
  });
})();

/* ===== HALAMAN ENERGY: pil Keuangan | Grafik (pilihan terakhir diingat) ===== */
(function () {
  const pill = $('ePill'), btns = pill.querySelectorAll('button'), pan = { keu: $('eKeu'), grafik: $('eGrafik') };
  function pilih(k) {
    btns.forEach(b => { const on = b.dataset.e === k; b.classList.toggle('on', on); b.setAttribute('aria-selected', on); });
    pill.dataset.sel = k === 'grafik' ? 1 : 0;
    Object.keys(pan).forEach(x => pan[x].classList.toggle('on', x === k));
    save('energi_tab', k);
  }
  btns.forEach(b => b.addEventListener('click', () => pilih(b.dataset.e)));
  pilih(load('energi_tab') === 'grafik' ? 'grafik' : 'keu');
})();

/* ===== KARTU SALDO: setSaldo(saldo, pemasukan, pengeluaran) dipanggil oleh fitur keuangan nanti. Ikon mata = sembunyikan angka ===== */
(function () {
  const card = $('saldoCard'), fmt = n => new Intl.NumberFormat('id-ID').format(Math.round(n || 0));
  let v = { s: 0, m: 0, k: 0 }, tutup = load('saldo_tutup') === '1';
  function tampil() {
    card.classList.toggle('tutup', tutup);
    $('sdVal').textContent = tutup ? '••••••' : (v.s < 0 ? '-' : '') + fmt(Math.abs(v.s));
    $('sdIn').textContent = tutup ? 'Rp ••••' : 'Rp ' + fmt(v.m);
    $('sdOut').textContent = tutup ? 'Rp ••••' : 'Rp ' + fmt(v.k);
  }
  window.setSaldo = (s, m, k) => { v = { s: +s || 0, m: +m || 0, k: +k || 0 }; tampil(); };
  $('sdEye').addEventListener('click', () => { tutup = !tutup; save('saldo_tutup', tutup ? '1' : '0'); tampil(); });
  tampil();
})();

/* ===== JAM HITUNG MUNDUR PRODUKTIF (buku dongeng): sisa waktu setelah selesai kerja sampai jam tidur.
   Sebelum selesai kerja = tampil jatah waktu (diam), sesudahnya = hitung mundur sampai jam tidur, lewat jam tidur = istirahat.
   Jam tidur boleh lewat tengah malam. Ketuk 3x = ubah (jam selesai kerja & jam tidur), ketuk di luar / Esc = kunci.
   Data: pk_jam_kerja, pk_jam_tidur (format HH:MM) ===== */
(function () {
  const box = $('pkJam'); if (!box) return;
  const RX = /^([01]\d|2[0-3]):[0-5]\d$/, cek = (v, d) => RX.test(v || '') ? v : d;
  let kerja = cek(load('pk_jam_kerja'), '17:00'), tidur = cek(load('pk_jam_tidur'), '22:00'), edit = false;
  const inK = $('pkKerjaIn'), inT = $('pkTidurIn'), p2 = n => String(Math.max(0, n)).padStart(2, '0');
  const at = (base, hm, d) => { const x = new Date(base), a = hm.split(':'); x.setDate(x.getDate() + d); x.setHours(+a[0], +a[1], 0, 0); return x; };
  const durasi = ms => { const m = Math.ceil(ms / 60000), j = Math.floor(m / 60); return (j ? j + ' jam ' : '') + (m % 60) + ' menit'; };
  function siklus(now) { /* pasangan (selesai kerja, tidur) yang sedang berlaku; tidur setelah tengah malam ikut hari kerja sebelumnya */
    for (const d of [-1, 0]) { const w = at(now, kerja, d), b = at(now, tidur, d); if (b <= w) b.setDate(b.getDate() + 1); if (now < b || d === 0) return { w, b }; }
  }
  function tampil() {
    const now = new Date(), c = siklus(now), total = c.b - c.w; let mode, sisa;
    if (now >= c.b) { mode = 'tidur'; sisa = 0; } else if (now < c.w) { mode = 'kerja'; sisa = total; } else { mode = 'jalan'; sisa = c.b - now; }
    const dt = Math.ceil(sisa / 1000), j = Math.floor(dt / 3600), m = Math.floor(dt % 3600 / 60), s = dt % 60;
    $('pkJ').textContent = p2(j); $('pkM').textContent = p2(m); $('pkDtk').textContent = mode === 'jalan' ? p2(s) : '00';
    $('pkKerjaT').textContent = kerja; $('pkTidurT').textContent = tidur;
    box.classList.toggle('kerja', mode === 'kerja'); box.classList.toggle('jalan', mode === 'jalan'); box.classList.toggle('tidur', mode === 'tidur');
    $('pkStatus').textContent = mode === 'jalan' ? 'Sisa waktu produktifmu ⏳ jangan sampai terbuang'
      : mode === 'kerja' ? 'Kerja selesai ' + durasi(c.w - now) + ' lagi · jatah waktumu nanti ' + durasi(total)
      : 'Waktunya istirahat 🌙 Selamat tidur';
    $('pkBar').style.width = (mode === 'tidur' ? 100 : mode === 'kerja' || total <= 0 ? 0 : Math.min(100, (now - c.w) / total * 100)) + '%';
    box.setAttribute('aria-label', mode === 'tidur' ? 'Waktunya tidur' : 'Sisa waktu produktif ' + j + ' jam ' + m + ' menit');
  }
  function setEdit(on) {
    edit = on; box.classList.toggle('editing', on);
    if (on) { inK.value = kerja; inT.value = tidur; }
    $('pkHint').textContent = on ? 'Ketuk di luar untuk mengunci' : 'Ketuk 3x untuk ubah jam';
    tampil();
  }
  function terapkan(inp, nama, key) { const v = inp.value; if (!RX.test(v)) { inp.value = nama === 'k' ? kerja : tidur; return; } if (nama === 'k') kerja = v; else tidur = v; save(key, v); tampil(); }
  inK.addEventListener('change', () => terapkan(inK, 'k', 'pk_jam_kerja'));
  inT.addEventListener('change', () => terapkan(inT, 't', 'pk_jam_tidur'));
  let n = 0, tm = null;
  box.addEventListener('click', e => {
    if (edit) return;
    n++; clearTimeout(tm);
    if (n >= 3) { n = 0; setEdit(true); } else tm = setTimeout(() => { n = 0; }, 500);
  });
  const kunci = () => { if (!edit) return; terapkan(inK, 'k', 'pk_jam_kerja'); terapkan(inT, 't', 'pk_jam_tidur'); setEdit(false); };
  document.addEventListener('pointerdown', e => { if (edit && !box.contains(e.target)) kunci(); }, true);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') kunci(); });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) tampil(); });
  setInterval(tampil, 1000); tampil();
})();

/* ===== BARISAN KALENDER MINGGUAN (Produktif): 7 bulatan Minggu-Sabtu untuk minggu berjalan. Hari ini menyala, hari lalu meredup.
   Dicek tiap detik: saat hari berganti (tengah malam) bulatan otomatis pindah, dan minggu baru dimulai tiap hari Minggu ===== */
(function () {
  const el = $('pkMinggu'); if (!el) return;
  const SING = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'], FULL = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const BLN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  let kunci = '';
  function gambar() {
    const n = new Date(), key = n.getFullYear() + '-' + n.getMonth() + '-' + n.getDate();
    if (key === kunci) return; kunci = key; el.textContent = '';
    for (let i = 0; i < 7; i++) {
      const d = new Date(n.getFullYear(), n.getMonth(), n.getDate() - n.getDay() + i), ini = i === n.getDay();
      const x = document.createElement('div'); x.className = 'pk-hr' + (i === 0 ? ' mgg' : '') + (ini ? ' ini' : i < n.getDay() ? ' lalu' : '');
      x.setAttribute('role', 'listitem'); x.setAttribute('aria-label', FULL[i] + ', ' + d.getDate() + ' ' + BLN[d.getMonth()] + (ini ? ' (hari ini)' : ''));
      if (ini) x.setAttribute('aria-current', 'date');
      const s = document.createElement('small'); s.textContent = SING[i];
      const b = document.createElement('b'); b.textContent = d.getDate();
      x.append(s, b); el.append(x);
    }
  }
  gambar(); setInterval(gambar, 1000); document.addEventListener('visibilitychange', () => { if (!document.hidden) gambar(); });
})();

/* ===== TIKET PRODUKTIF: kartu tiket + bar tiket. Jatah 1000 tiket per bulan, reset ke 1000 setiap tanggal 1 (habis atau tidak).
   Bar = tiket terpakai (1000 - sisa): makin sedikit sisa, makin penuh; 90% ke atas berdenyut merah.
   Hook untuk sistem tiket nanti: setTiket(sisa, pemakaian) mengisi langsung, pakaiTiket(n) mengurangi sisa n dan menambah pemakaian n.
   Data: pk_tiket = {b: "tahun-bulan", s: sisa, p: pemakaian bulan ini} ===== */
(function () {
  const TOTAL = 1000, KEY = 'pk_tiket';
  const fmt = n => new Intl.NumberFormat('id-ID').format(Math.round(n || 0));
  const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  const bulanKey = () => { const n = new Date(); return n.getFullYear() + '-' + (n.getMonth() + 1); };
  const baru = () => ({ b: bulanKey(), s: TOTAL, p: 0 });
  let st = null;
  try { st = JSON.parse(load(KEY)); } catch (e) { st = null; }
  if (!st || typeof st.s !== 'number' || typeof st.p !== 'number' || st.b !== bulanKey()) { st = baru(); save(KEY, JSON.stringify(st)); }
  const simpan = () => save(KEY, JSON.stringify(st));
  function gambar() {
    const s = st.s, pct = Math.max(0, Math.min(1, (TOTAL - s) / TOTAL)), n = new Date();
    $('tkVal').textContent = (s < 0 ? '-' : '') + fmt(Math.abs(s));
    $('tkOut').textContent = fmt(st.p) + ' tiket';
    const bl = $('tkBln'); if (bl) bl.textContent = 'Bulan ini · ' + BULAN[n.getMonth()];
    const fill = $('pkTFill'), bar = $('pkTBar'), p100 = Math.round(pct * 100);
    fill.style.width = (pct * 100) + '%'; fill.classList.toggle('kosong', pct <= 0);
    bar.classList.toggle('kritis', pct >= 0.9);
    bar.setAttribute('aria-valuenow', String(Math.round(pct * TOTAL)));
    $('pkTPct').textContent = p100 + '%';
    $('pkTSisa').textContent = 'Sisa ' + fmt(Math.max(0, s)) + ' tiket';
    const hari = Math.round((new Date(n.getFullYear(), n.getMonth() + 1, 1) - new Date(n.getFullYear(), n.getMonth(), n.getDate())) / 86400000);
    $('pkTReset').textContent = 'Reset tgl 1 · ' + (hari <= 1 ? 'besok' : hari + ' hari lagi');
  }
  window.setTiket = (s, pakai) => { st = { b: bulanKey(), s: +s || 0, p: +pakai || 0 }; simpan(); gambar(); };
  window.pakaiTiket = n => { n = +n || 0; window.setTiket(st.s - n, st.p + n); };
  window.sisaTiket = () => st.s; window.tiketBulan = bulanKey; /* dipakai fitur Bidang */
  function cek() { if (st.b !== bulanKey()) { st = baru(); simpan(); } gambar(); } /* ganti bulan (tanggal 1) = reset 1000 */
  gambar(); setInterval(cek, 1000); document.addEventListener('visibilitychange', () => { if (!document.hidden) cek(); });
})();

/* ===== BIDANG (Produktif, di bawah kartu tiket): 5 kotak siap tulis + kotak + (tambah kotak).
   Ketuk 1x = halaman tugas, 3x = ubah ikon & judul, 5x = mode geser (seret kotak untuk pindah posisi), ketuk 1x di luar = kunci.
   Halaman tugas: gelembung angka urutan | garis | pil tugas. Ketuk 1x pil = halaman checklist, 3x = ubah / hapus. Tombol + = tambah tugas.
   Halaman checklist: daftar centang (tulis sendiri) + tombol "Pakai 1 tiket" (kurangi kartu tiket, simpan snapshot checklist ke riwayat bidang).
   Hapus kotak bidang = riwayat tiketnya ikut terhapus, tiket bulan ini dikembalikan ke kartu tiket.
   ATURAN TERKUNCI: setelah 1 tiket dipakai di sebuah tugas, tugas itu tidak bisa memakai tiket lagi, checklist-nya tidak bisa di-uncheck / diedit / ditambah / dihapus,
   dan namanya tidak bisa diubah. Kunci dihitung dari riwayat (b.r): hanya terbuka lagi bila riwayat pemakaiannya dihapus (tiket kembali ke kartu).
   Satu-satunya jalan mengubah checklist setelah tiket dipakai = tombol "Edit checklist" di halaman Pemakaian tiket (mengubah catatan riwayat).
   Data: 'bidang' = [{id, n, e, t:[{id, n, c:[{id, x, k}]}], r:[{id, ts, b:"tahun-bulan", tid, tn, c:[{x, k}]}]}]  (r = riwayat pemakaian tiket, dipakai fitur riwayat nanti) ===== */
(function () {
  const KEY = 'bidang', grid = $('bdGrid'), panel = $('bdPanel'), nama = $('bdNama'), emIn = $('bdEmoIn'), emBox = $('bdEmo'), hint = $('bdHint');
  const pg = $('bd'), pgT = $('bdT'), frm = $('bdTF'), fN = $('bdTFN'), cks = $('bdCks');
  const EMO = ['📌', '💼', '📚', '💻', '🎨', '🏋️', '🍳', '🧹', '🎵', '🛠️', '📈', '✍️', '🧠', '🌱', '🏠', '🚗', '🎯', '🧘', '📷', '🎮', '🗣️', '💡', '🧾', '✨'];
  const uid = p => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
  const baru = () => ({ id: uid('d'), n: '', e: '📌', t: [], r: [] });
  const bulanIni = () => window.tiketBulan ? window.tiketBulan() : '';
  let list = [], aktif = -1, geser = false, taps = 0, tapT = null, tapN = -1, curB = null, curT = null, tfId = null, tTaps = 0, tTapT = null, tTapId = null;
  const raw = load(KEY);
  try {
    const a = JSON.parse(raw || 'null');
    if (Array.isArray(a)) list = a.filter(b => b && b.id && typeof b.n === 'string').map(b => ({
      id: b.id, n: b.n, e: b.e || '📌',
      t: Array.isArray(b.t) ? b.t.filter(x => x && x.id).map(x => ({ id: x.id, n: String(x.n || ''), c: Array.isArray(x.c) ? x.c.filter(Boolean).map(c => ({ id: c.id || uid('c'), x: String(c.x || ''), k: !!c.k })) : [] })) : [],
      r: Array.isArray(b.r) ? b.r.filter(x => x && x.id) : []
    }));
  } catch (e) {}
  const simpan = () => { save(KEY, JSON.stringify(list)); document.dispatchEvent(new Event('bidang-berubah')); }; /* leaderboard ikut diperbarui */
  if (raw === null) { for (let i = 0; i < 5; i++) list.push(baru()); simpan(); }
  const curBd = () => list.find(x => x.id === curB);
  const curTg = () => { const b = curBd(); return b && b.t.find(x => x.id === curT); };
  const angka = n => new Intl.NumberFormat('id-ID').format(n);
  let editC = false, cTaps = 0, cTapT = null; /* mode edit checklist: ketuk 3x = edit/hapus, ketuk 1x di luar = kunci */
  const dipakai = (b, t) => !!(b && t) && b.r.some(x => x.tid === t.id); /* tugas terkunci = sudah ada riwayat pemakaian tiket untuk tugas ini */
  const KUNCI_MSG = 'Tiket sudah dipakai di tugas ini · tugas terkunci';

  /* ---- kotak bidang ---- */
  function render() {
    grid.textContent = '';
    list.forEach((b, i) => {
      const el = document.createElement('div'); el.className = 'pk-box ang-box bd-box' + (i === aktif ? ' editing' : '') + (geser ? ' bd-drag' : '');
      el.dataset.n = i; el.dataset.id = b.id; el.setAttribute('role', 'button'); el.tabIndex = 0;
      const ic = document.createElement('i'); ic.textContent = b.e;
      const t = document.createElement('span'); t.textContent = b.n.trim() || 'Tulis bidang'; if (!b.n.trim()) t.className = 'kosong';
      const br = document.createElement('em'); br.className = 'bd-bar'; br.appendChild(document.createElement('b'));
      const sd = document.createElement('small'); sd.className = 'ang-sd';
      const low = document.createElement('div'); low.className = 'bd-low'; low.append(t, br, sd); /* bagian bawah "kupon": nama, bar tiket terpakai, jumlah */
      el.append(ic, low); ketBox(el, b); grid.appendChild(el);
    });
    const p = document.createElement('div'); p.className = 'pk-box ang-box bd-box ang-add'; p.dataset.add = '1'; p.setAttribute('role', 'button'); p.tabIndex = 0; p.setAttribute('aria-label', 'Tambah kotak bidang');
    p.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg><span>Tambah</span>'; grid.appendChild(p);
  }
  function tampil(i) { /* perbarui satu kotak tanpa membangun ulang (supaya papan ketik tidak tertutup) */
    const el = grid.children[i], b = list[i]; if (!el || !b || el.dataset.add) return;
    el.querySelector('i').textContent = b.e;
    const t = el.querySelector('span'); t.textContent = b.n.trim() || 'Tulis bidang'; t.className = b.n.trim() ? '' : 'kosong';
    ketBox(el, b);
  }
  /* bar kecil di tiap kotak = berapa tugas di bidang itu yang sudah memakai tiketnya (tiap tugas maksimal 1 tiket). Teks: "🎫 2/4 tugas" */
  const pakaiB = b => { const s = new Set(b.r.map(x => x.tid)); return b.t.filter(x => s.has(x.id)).length; };
  function ketBox(el, b) {
    const ada = !!b.n.trim() && b.t.length > 0, u = ada ? pakaiB(b) : 0, br = el.querySelector('.bd-bar');
    const sp = el.querySelector('.bd-low span'), L = sp.textContent.trim().length; /* judul tampil penuh: makin panjang makin kecil hurufnya */
    sp.style.fontSize = (L <= 10 ? .72 : L <= 18 ? .64 : L <= 28 ? .56 : L <= 44 ? .5 : .44) + 'rem';
    const lo = el.querySelector('.bd-low');
    if (window.ResizeObserver && !lo._ro) { lo._ro = new ResizeObserver(() => { if (lo.offsetHeight) el.style.setProperty('--lo', lo.offsetHeight + 'px'); }); lo._ro.observe(lo); }
    el.querySelector('.ang-sd').textContent = ada ? '🎫 ' + u + '/' + b.t.length + ' tugas' : '';
    br.hidden = !ada; br.firstChild.style.width = ada ? Math.round(u / b.t.length * 100) + '%' : '0%';
    br.classList.toggle('kosong', !u); br.classList.toggle('penuh', ada && u === b.t.length);
  }
  function setEmo(e) { const b = list[aktif]; if (!b) return; b.e = e; simpan(); tampil(aktif); emBox.querySelectorAll('button').forEach(x => x.classList.toggle('on', x.dataset.e === e)); }
  EMO.forEach(e => { const b = document.createElement('button'); b.type = 'button'; b.textContent = e; b.dataset.e = e; emBox.appendChild(b); });
  emBox.addEventListener('click', ev => { const b = ev.target.closest('button'); if (b) { setEmo(b.dataset.e); emIn.value = ''; } });
  emIn.addEventListener('input', () => {
    const v = emIn.value.trim(); if (!v) return;
    const seg = window.Intl && Intl.Segmenter ? [...new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(v)].map(x => x.segment) : [...v];
    setEmo(seg[0]);
  });
  nama.addEventListener('input', () => { const b = list[aktif]; if (!b) return; b.n = nama.value; simpan(); tampil(aktif); });
  nama.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); kunci(); } });

  /* ---- edit (ketuk 3x) ---- */
  function mulai(n) {
    if (geser) kunciGeser();
    aktif = n; const b = list[n];
    $('bdPJudul').textContent = 'Ubah kotak ' + (n + 1); nama.value = b.n; emIn.value = '';
    emBox.querySelectorAll('button').forEach(x => x.classList.toggle('on', x.dataset.e === b.e));
    panel.hidden = false; grid.querySelectorAll('.bd-box').forEach((el, i) => el.classList.toggle('editing', i === n));
  }
  function kunci() {
    if (aktif < 0) return;
    const b = list[aktif]; if (b) { b.n = b.n.trim(); simpan(); }
    aktif = -1; panel.hidden = true; render();
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
  }
  /* ---- mode geser (ketuk 5x) ---- */
  function modeGeser() { if (aktif >= 0) kunci(); geser = true; hint.hidden = false; render(); }
  function kunciGeser() { if (!geser) return; geser = false; hint.hidden = true; render(); }

  grid.addEventListener('click', e => {
    const el = e.target.closest ? e.target.closest('.bd-box') : null; if (!el || geser) return;
    if (el.dataset.add) { list.push(baru()); simpan(); render(); toast('Kotak bidang ditambahkan ✓'); return; }
    const n = +el.dataset.n;
    if (aktif >= 0) { if (n !== aktif) mulai(n); return; }
    if (tapN !== n) taps = 0;
    tapN = n; taps++; clearTimeout(tapT);
    if (taps >= 5) { taps = 0; modeGeser(); return; }
    tapT = setTimeout(() => { const t = taps; taps = 0; if (t === 1) buka(n); else if (t >= 3) mulai(n); }, 380);
  });
  document.addEventListener('click', e => {
    const p = e.composedPath ? e.composedPath() : [];
    if (geser && !p.includes(grid)) kunciGeser();
    if (aktif >= 0 && !p.includes(grid) && !p.includes(panel) && !p.includes($('cfm'))) kunci();
  });

  /* seret kotak (hanya saat mode geser) */
  let dg = null;
  grid.addEventListener('pointerdown', e => {
    if (!geser) return; const el = e.target.closest ? e.target.closest('.bd-box:not(.ang-add)') : null; if (!el) return;
    const r = el.getBoundingClientRect();
    dg = { el, id: e.pointerId, gx: e.clientX - r.left, gy: e.clientY - r.top, sx: e.clientX, sy: e.clientY, on: false };
    try { el.setPointerCapture(e.pointerId); } catch (x) {}
  });
  grid.addEventListener('pointermove', e => {
    if (!dg || e.pointerId !== dg.id) return;
    if (!dg.on) { if (Math.hypot(e.clientX - dg.sx, e.clientY - dg.sy) < 6) return; dg.on = true; dg.el.classList.add('bd-lift'); }
    e.preventDefault();
    dg.el.style.transform = '';
    const px = e.clientX, py = e.clientY, semua = [...grid.children];
    for (const o of semua) {
      if (o === dg.el || o.dataset.add) continue;
      const q = o.getBoundingClientRect();
      if (px > q.left && px < q.right && py > q.top && py < q.bottom) { if (semua.indexOf(dg.el) < semua.indexOf(o)) grid.insertBefore(dg.el, o.nextSibling); else grid.insertBefore(dg.el, o); break; }
    }
    const nat = dg.el.getBoundingClientRect();
    dg.el.style.transform = 'translate(' + (px - dg.gx - nat.left) + 'px,' + (py - dg.gy - nat.top) + 'px) scale(1.07)';
  });
  const akhiriSeret = e => {
    if (!dg || e.pointerId !== dg.id) return;
    const el = dg.el, jalan = dg.on; dg = null;
    if (!jalan) return;
    el.style.transform = ''; el.classList.remove('bd-lift');
    const ids = [...grid.querySelectorAll('.bd-box:not(.ang-add)')].map(x => x.dataset.id);
    list.sort((a, b) => ids.indexOf(a.id) - ids.indexOf(b.id)); simpan(); render();
  };
  grid.addEventListener('pointerup', akhiriSeret); grid.addEventListener('pointercancel', akhiriSeret);
  grid.addEventListener('contextmenu', e => { if (geser) e.preventDefault(); });

  /* ---- hapus bidang: riwayat tiket ikut hilang, tiket bulan ini kembali ke kartu ---- */
  $('bdDel').addEventListener('click', async () => {
    const b = list[aktif]; if (!b) return;
    const kembali = b.r.filter(x => x.b === bulanIni()).length;
    const ok = await konfirmasi('Hapus bidang?', 'Kotak "' + (b.n.trim() || 'tanpa nama') + '" beserta ' + b.t.length + ' tugas dan riwayat tiketnya akan dihapus.' + (kembali > 0 ? ' ' + kembali + ' tiket bulan ini dikembalikan ke kartu tiket.' : ''), 'Hapus');
    if (ok !== true) return;
    if (kembali > 0 && window.pakaiTiket) window.pakaiTiket(-kembali);
    list.splice(aktif, 1); simpan(); aktif = -1; panel.hidden = true; render(); toast('Kotak bidang dihapus ✓');
  });

  /* ---- halaman tugas ---- */
  function buka(n) {
    const b = list[n]; if (!b) return;
    if (!b.n.trim()) { toast('Beri nama dulu: ketuk 3x kotak untuk menulis bidang'); return; }
    curB = b.id; pg.hidden = false; $('bdBody').scrollTop = 0; isiB();
  }
  function isiB() {
    const b = curBd(); if (!b) { pg.hidden = true; return; }
    $('bdIc').textContent = b.e; $('bdNm').textContent = b.n.trim();
    $('bdSub').textContent = b.t.length + ' tugas · ' + b.r.length + ' tiket dipakai';
    const L = $('bdList'); L.textContent = '';
    $('bdTH').hidden = !b.t.length;
    if (!b.t.length) { const k = document.createElement('div'); k.className = 'bd-empty'; k.innerHTML = '<i>🗒️</i><b>Belum ada tugas</b><small>Ketuk tombol + di kanan bawah untuk menambah tugas pertama.</small>'; L.appendChild(k); return; }
    b.t.forEach((t, i) => {
      const row = document.createElement('div'); row.className = 'bd-row'; row.dataset.id = t.id;
      const no = document.createElement('div'); no.className = 'bd-no'; const nb = document.createElement('span'); nb.textContent = i + 1; no.appendChild(nb);
      const ln = document.createElement('i'); ln.className = 'bd-ln'; ln.setAttribute('aria-hidden', 'true');
      const lock = dipakai(b, t), pil = document.createElement('div'); pil.className = 'bd-pill' + (lock ? ' terpakai' : ''); pil.setAttribute('role', 'button'); pil.tabIndex = 0;
      const tn = document.createElement('span'); tn.className = 'bd-tn'; tn.textContent = t.n;
      const done = t.c.filter(c => c.k).length, pr = document.createElement('em'); pr.className = 'bd-pr' + (t.c.length && done === t.c.length ? ' ok' : ''); pr.textContent = (lock ? '🔒 ' : '') + (t.c.length ? done + '/' + t.c.length : '—');
      pil.append(tn, pr); row.append(no, ln, pil); L.appendChild(row);
    });
  }
  function tutupB() { frm.hidden = true; pg.hidden = true; curB = null; }
  $('bdClose').addEventListener('click', tutupB);
  $('bdList').addEventListener('click', e => {
    const row = e.target.closest ? e.target.closest('.bd-row') : null; if (!row) return;
    const id = row.dataset.id;
    if (tTapId !== id) tTaps = 0;
    tTapId = id; tTaps++; clearTimeout(tTapT);
    tTapT = setTimeout(() => { const t = tTaps; tTaps = 0; if (t === 1) bukaT(id); else if (t >= 3) formT(id); }, 380);
  });
  $('bdList').addEventListener('keydown', e => { const row = e.target.closest ? e.target.closest('.bd-row') : null; if (row && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); bukaT(row.dataset.id); } });

  /* ---- form tugas (tambah / ubah / hapus) ---- */
  function formT(id) {
    const b = curBd(); if (!b) return; tfId = id || null; const t = id ? b.t.find(x => x.id === id) : null;
    const kunciT = dipakai(b, t); /* tiket sudah dipakai: nama tugas tidak bisa diubah (hapus tetap boleh) */
    $('bdTFT').textContent = t ? (kunciT ? 'Tugas terkunci' : 'Ubah tugas') : 'Tambah tugas'; fN.value = t ? t.n : ''; fN.readOnly = kunciT; $('bdTFSave').hidden = kunciT;
    $('bdTFM').textContent = kunciT ? 'Tiket sudah dipakai · nama tugas tidak bisa diubah' : ''; $('bdTFDel').hidden = !t;
    frm.hidden = false; if (!kunciT) setTimeout(() => fN.focus(), 80);
  }
  $('bdAdd').addEventListener('click', () => formT(null));
  $('bdTFCancel').addEventListener('click', () => { frm.hidden = true; });
  frm.addEventListener('click', e => { if (e.target === frm) frm.hidden = true; });
  fN.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); $('bdTFSave').click(); } });
  $('bdTFSave').addEventListener('click', () => {
    const b = curBd(); if (!b) return; const v = fN.value.trim();
    if (tfId && dipakai(b, b.t.find(x => x.id === tfId))) { frm.hidden = true; toast(KUNCI_MSG); return; }
    if (!v) { $('bdTFM').textContent = 'Nama tugas wajib diisi'; fN.focus(); return; }
    if (tfId) { const t = b.t.find(x => x.id === tfId); if (t) t.n = v; } else b.t.push({ id: uid('t'), n: v, c: [] });
    simpan(); frm.hidden = true; isiB(); render(); if (!pgT.hidden) isiT();
  });
  $('bdTFDel').addEventListener('click', async () => {
    const b = curBd(); if (!b || !tfId) return; const t = b.t.find(x => x.id === tfId); if (!t) return;
    const ok = await konfirmasi('Hapus tugas?', 'Tugas "' + t.n + '" dan checklist-nya akan dihapus. Riwayat tiket yang sudah tercatat tetap tersimpan.', 'Hapus');
    if (ok !== true) return;
    b.t = b.t.filter(x => x.id !== tfId); simpan(); frm.hidden = true; isiB(); render(); toast('Tugas dihapus ✓');
  });

  /* ---- halaman checklist ---- */
  function bukaT(id) { editC = false; curT = id; pgT.hidden = false; $('bdTBody').scrollTop = 0; isiT(); }
  const ukur = el => { el.style.height = 'auto'; el.style.height = Math.max(el.scrollHeight, 24) + 'px'; };
  function infoT() {
    const t = curTg(), b = curBd(); if (!t || !b) return;
    const done = t.c.filter(c => c.k).length, tot = t.c.length;
    $('bdTBar').style.width = (tot ? done / tot * 100 : 0) + '%'; $('bdTBar').classList.toggle('penuh', tot > 0 && done === tot);
    $('bdTPt').textContent = tot ? done + ' dari ' + tot + ' selesai' : 'Belum ada checklist';
    const s = window.sisaTiket ? window.sisaTiket() : 0, pakai = b.r.filter(x => x.tid === t.id).length;
    const lengkap = tot > 0 && done === tot, lock = pakai > 0;
    $('bdPSisa').textContent = lock ? 'Tiket sudah dipakai · tidak bisa dipakai lagi' : !tot ? 'Tambah checklist dulu' : !lengkap ? 'Centang semua checklist dulu (' + done + '/' + tot + ')' : 'Sisa ' + angka(Math.max(0, s)) + ' tiket';
    $('bdPakai').classList.toggle('habis', !lock && s <= 0); $('bdPakai').classList.toggle('kunci', lock || !lengkap);
    $('bdPInfo').textContent = lock ? '🔒 Tugas ini sudah memakai ' + pakai + ' tiket · terkunci (tidak bisa dipakai lagi, di-uncheck, atau diedit)' : 'Tiket dipakai akan tercatat di riwayat bidang ini';
  }
  function isiT(fokus) {
    const t = curTg(), b = curBd(); if (!t || !b) { pgT.hidden = true; return; }
    const lock = dipakai(b, t); if (lock) editC = false;
    $('bdTBd').textContent = b.e + ' ' + b.n.trim(); $('bdTNm').textContent = t.n;
    cks.textContent = ''; cks.classList.toggle('edit', editC); cks.classList.toggle('terkunci', lock); $('bdCAdd').hidden = lock;
    t.c.forEach(c => {
      const r = document.createElement('div'); r.className = 'bd-ck' + (c.k ? ' on' : ''); r.dataset.id = c.id;
      const cb = document.createElement('button'); cb.type = 'button'; cb.className = 'bd-cb'; cb.setAttribute('aria-label', 'Centang'); cb.setAttribute('aria-pressed', c.k ? 'true' : 'false'); if (lock) cb.setAttribute('aria-disabled', 'true');
      cb.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
      const tx = document.createElement('textarea'); tx.className = 'bd-ct'; tx.rows = 1; tx.value = c.x; tx.placeholder = 'Tulis checklist…'; tx.spellcheck = false; tx.readOnly = !editC; tx.tabIndex = editC ? 0 : -1; tx.setAttribute('aria-label', 'Isi checklist');
      const x = document.createElement('button'); x.type = 'button'; x.className = 'bd-cx'; x.setAttribute('aria-label', 'Hapus checklist'); x.textContent = '✕';
      r.append(cb, tx, x); cks.appendChild(r);
    });
    requestAnimationFrame(() => { cks.querySelectorAll('.bd-ct').forEach(ukur); if (fokus) { const a = cks.querySelector('[data-id="' + fokus + '"] .bd-ct'); if (a) a.focus(); } });
    ketC(); infoT();
  }
  function ketC() { const t = curTg(), lock = dipakai(curBd(), t); $('bdCH').textContent = lock ? '🔒 Tiket sudah dipakai · checklist terkunci (tidak bisa di-uncheck atau diedit)' : editC ? 'Ketuk di luar area checklist untuk mengunci' : (t && t.c.length ? 'Ketuk 3x checklist untuk edit atau hapus' : ''); $('bdCH').classList.toggle('on', editC && !lock); }
  function kunciC() { if (!editC) return; editC = false; cks.classList.remove('edit'); cks.querySelectorAll('.bd-ct').forEach(x => { x.readOnly = true; x.tabIndex = -1; x.blur(); }); ketC(); }
  function editMode() { if (dipakai(curBd(), curTg())) return; editC = true; cks.classList.add('edit'); cks.querySelectorAll('.bd-ct').forEach(x => { x.readOnly = false; x.tabIndex = 0; }); ketC(); }
  function tambahC(setelah) {
    const t = curTg(); if (!t) return;
    if (dipakai(curBd(), t)) { toast(KUNCI_MSG); return; }
    editC = true;
    const c = { id: uid('c'), x: '', k: false };
    const i = setelah ? t.c.findIndex(x => x.id === setelah) : -1;
    if (i >= 0) t.c.splice(i + 1, 0, c); else t.c.push(c);
    simpan(); isiT(c.id);
  }
  $('bdCAdd').addEventListener('click', () => tambahC(null));
  cks.addEventListener('click', async e => {
    const r = e.target.closest ? e.target.closest('.bd-ck') : null; if (!r) return; const t = curTg(); if (!t) return;
    const c = t.c.find(x => x.id === r.dataset.id); if (!c) return;
    if (dipakai(curBd(), t)) { /* terkunci: tidak bisa centang / un-centang / edit */
      if (e.target.closest('.bd-cb')) toast(KUNCI_MSG);
      else { cTaps++; clearTimeout(cTapT); if (cTaps >= 3) { cTaps = 0; toast(KUNCI_MSG); } else cTapT = setTimeout(() => { cTaps = 0; }, 500); }
      return;
    }
    if (e.target.closest('.bd-cb')) { c.k = !c.k; simpan(); r.classList.toggle('on', c.k); r.querySelector('.bd-cb').setAttribute('aria-pressed', c.k ? 'true' : 'false'); infoT(); isiB(); return; }
    if (!editC) { cTaps++; clearTimeout(cTapT); if (cTaps >= 3) { cTaps = 0; editMode(); } else cTapT = setTimeout(() => { cTaps = 0; }, 500); return; }
    if (e.target.closest('.bd-cx')) {
      if (c.x.trim()) { const ok = await konfirmasi('Hapus checklist?', '"' + c.x.trim() + '"', 'Hapus'); if (ok !== true) return; }
      t.c = t.c.filter(x => x.id !== c.id); simpan(); isiT(); isiB();
    }
  });
  cks.addEventListener('input', e => {
    if (!e.target.classList.contains('bd-ct')) return;
    const r = e.target.closest('.bd-ck'), t = curTg(); if (!r || !t) return;
    const c = t.c.find(x => x.id === r.dataset.id); if (!c) return; c.x = e.target.value; simpan(); ukur(e.target);
  });
  cks.addEventListener('keydown', e => {
    if (!e.target.classList.contains('bd-ct')) return;
    const r = e.target.closest('.bd-ck'), t = curTg(); if (!r || !t || !editC || dipakai(curBd(), t)) return;
    if (e.key === 'Enter') { e.preventDefault(); if (e.target.value.trim()) tambahC(r.dataset.id); }
    else if (e.key === 'Backspace' && !e.target.value) { e.preventDefault(); const i = t.c.findIndex(x => x.id === r.dataset.id), prev = t.c[i - 1]; t.c.splice(i, 1); simpan(); isiT(prev ? prev.id : null); isiB(); }
  });
  document.addEventListener('click', e => {
    if (!editC) return; const p = e.composedPath ? e.composedPath() : [];
    if (!p.includes(cks) && !p.includes($('bdCAdd')) && !p.includes($('cfm'))) kunciC();
  });
  function tutupT() { kunciC(); pgT.hidden = true; curT = null; isiB(); render(); }
  $('bdTClose').addEventListener('click', tutupT);

  /* ---- Pakai 1 tiket ---- */
  $('bdPakai').addEventListener('click', () => {
    const t = curTg(), b = curBd(); if (!t || !b) return;
    if (dipakai(b, t)) { toast('Tiket sudah dipakai di tugas ini · tidak bisa dipakai lagi'); return; }
    const s = window.sisaTiket ? window.sisaTiket() : 0;
    const tot = t.c.length, done = t.c.filter(c => c.k).length;
    if (!tot) { toast('Tambah checklist dulu'); return; }
    if (done < tot) { toast('Centang semua checklist dulu (' + done + '/' + tot + ')'); return; }
    if (s <= 0) { toast('Tiket habis · jatah reset tiap tanggal 1'); return; }
    b.r.push({ id: uid('r'), ts: Date.now(), b: bulanIni(), tid: t.id, tn: t.n, c: t.c.map(c => ({ x: c.x, k: c.k })) });
    simpan(); window.pakaiTiket(1);
    const btn = $('bdPakai'); btn.classList.remove('pop'); void btn.offsetWidth; btn.classList.add('pop');
    kunciC(); isiT(); isiB(); toast('1 tiket dipakai ✓ · tugas ini sekarang terkunci');
  });

  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    if (!frm.hidden) frm.hidden = true;
    else if (!pgT.hidden && $('cfm').hidden) tutupT();
    else if (!pg.hidden && $('cfm').hidden) tutupB();
  });
  window.bidangRiwayat = () => list.map(b => ({ id: b.id, n: b.n, e: b.e, r: b.r, t: b.t.map(t => ({ id: t.id, n: t.n })) })); /* hook untuk fitur riwayat tiket nanti */
  /* hapus SATU riwayat pemakaian (dipanggil halaman "Lihat semuanya"): riwayat hilang = tidak ada transaksi.
     Bila tiketnya dari bulan ini, 1 tiket kembali ke kartu & pemakaian berkurang 1. Tiket bulan lalu sudah direset (jatah baru 1000), jadi tidak ditambahkan.
     Mengembalikan { kembali: 1|0 } atau null bila riwayat tidak ditemukan. */
  window.hapusRiwayatBidang = (bid, rid) => {
    const b = list.find(x => x.id === bid); if (!b) return null;
    const i = b.r.findIndex(x => x.id === rid); if (i < 0) return null;
    const r = b.r[i], d = new Date(r.ts), bk = r.b || (d.getFullYear() + '-' + (d.getMonth() + 1));
    const kembali = bk === bulanIni() ? 1 : 0;
    b.r.splice(i, 1); simpan(); render();
    if (kembali && window.pakaiTiket) window.pakaiTiket(-1);
    return { kembali };
  };
  /* ubah checklist SATU riwayat pemakaian (dipanggil halaman Pemakaian tiket > Edit checklist). items = [{x, k}].
     Satu-satunya jalan mengubah checklist setelah tiket dipakai. Jumlah tiket tidak berubah. Bila ini riwayat terbaru tugasnya dan tugas masih ada,
     checklist tugas ikut disamakan supaya isinya tidak beda dengan riwayat. Mengembalikan { sinkron } atau null bila riwayat tidak ditemukan. */
  window.editRiwayatBidang = (bid, rid, items) => {
    const b = list.find(x => x.id === bid); if (!b) return null;
    const r = b.r.find(x => x.id === rid); if (!r) return null;
    r.c = (items || []).map(c => ({ x: String(c.x || ''), k: !!c.k }));
    const t = b.t.find(x => x.id === r.tid);
    const sinkron = !!t && !b.r.some(o => o.tid === r.tid && o.ts > r.ts);
    if (sinkron) { const lama = t.c; t.c = r.c.map((c, i) => ({ id: (lama[i] && lama[i].id) || uid('c'), x: c.x, k: c.k })); }
    simpan();
    if (!pgT.hidden) isiT();
    return { sinkron };
  };
  render();
})();

/* ===== LEADERBOARD PRODUKTIF: tiket keluar dari riwayat bidang (window.bidangRiwayat).
   Atas = pilihan waktu (Hari ini | Minggu | Bulan | Tahun), kiri = pilihan bidang, isi = "Terbaru 1, 2, 3" + daftar terbaru lainnya.
   Ketuk kartu = buka checklist yang dulu dicentang. Pilihan terakhir diingat: 'lb_per', 'lb_bid'. Diperbarui otomatis lewat event 'bidang-berubah' ===== */
(function () {
  const rail = $('lbRail'), pod = $('lbPod'), lst = $('lbList'), sts = $('lbStats'), cap = $('lbCap'), seg = $('lbSeg'), more = $('lbMore');
  if (!rail || !seg) return;
  const P = ['hari', 'minggu', 'bulan', 'tahun'], NAMA = { hari: 'hari ini', minggu: 'minggu ini', bulan: 'bulan ini', tahun: 'tahun ini' };
  const BATAS = 10;
  let per = load('lb_per'); if (P.indexOf(per) < 0) per = 'hari';
  let bid = load('lb_bid') || 'all', limit = BATAS, anim = true;
  const buka = new Set();
  const angka = n => new Intl.NumberFormat('id-ID').format(n);
  const el = (t, c, x) => { const e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; };
  const tgl = (d, o) => d.toLocaleDateString('id-ID', o);
  const jam = d => String(d.getHours()).padStart(2, '0') + '.' + String(d.getMinutes()).padStart(2, '0');

  function rentang(p) {
    const n = new Date(); let a, b;
    if (p === 'hari') { a = new Date(n.getFullYear(), n.getMonth(), n.getDate()); b = new Date(a.getFullYear(), a.getMonth(), a.getDate() + 1); }
    else if (p === 'minggu') { a = new Date(n.getFullYear(), n.getMonth(), n.getDate() - n.getDay()); b = new Date(a.getFullYear(), a.getMonth(), a.getDate() + 7); }
    else if (p === 'bulan') { a = new Date(n.getFullYear(), n.getMonth(), 1); b = new Date(n.getFullYear(), n.getMonth() + 1, 1); }
    else { a = new Date(n.getFullYear(), 0, 1); b = new Date(n.getFullYear() + 1, 0, 1); }
    return [a, b];
  }
  function teksRentang(p, a, b) {
    if (p === 'hari') return tgl(a, { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' });
    if (p === 'minggu') { const e = new Date(b.getTime() - 864e5); return tgl(a, { day: 'numeric', month: 'short' }) + ' – ' + tgl(e, { day: 'numeric', month: 'short', year: 'numeric' }); }
    if (p === 'bulan') return tgl(a, { month: 'long', year: 'numeric' });
    return 'Tahun ' + a.getFullYear();
  }
  function lalu(ts) {
    const s = Math.max(0, (Date.now() - ts) / 1000), m = Math.floor(s / 60), j = Math.floor(m / 60);
    if (m < 1) return 'Baru saja'; if (m < 60) return m + ' menit lalu'; if (j < 24) return j + ' jam lalu';
    const a = new Date(ts), n = new Date(), h = Math.round((new Date(n.getFullYear(), n.getMonth(), n.getDate()) - new Date(a.getFullYear(), a.getMonth(), a.getDate())) / 864e5);
    if (h === 1) return 'Kemarin'; if (h < 31) return h + ' hari lalu'; const bl = Math.floor(h / 30); return bl < 12 ? bl + ' bulan lalu' : Math.floor(h / 365) + ' tahun lalu';
  }
  function semua() {
    const out = [], src = window.bidangRiwayat ? window.bidangRiwayat() : [];
    src.forEach(b => {
      const cnt = {}, nm = (b.n || '').trim() || 'Tanpa nama';
      (b.r || []).slice().sort((x, y) => x.ts - y.ts).forEach(r => {
        cnt.b = (cnt.b || 0) + 1; /* nomor tiket = urutan keluar di bidang itu (1, 2, 3, ...) */
        out.push({ id: r.id, ts: r.ts, tn: (r.tn || '').trim() || 'Tanpa nama', ke: cnt.b, c: Array.isArray(r.c) ? r.c : [], bid: b.id, bn: nm, be: b.e || '📌' });
      });
    });
    return { out, src };
  }

  function kartu(it, rank, i) {
    const d = new Date(it.ts), done = it.c.filter(c => c.k).length, tot = it.c.length, pct = tot ? Math.round(done / tot * 100) : 0;
    const a = el('article', 'lb-it' + (rank <= 3 ? ' r' + rank : ' rx') + (buka.has(it.id) ? ' open' : ''));
    a.style.setProperty('--i', i); a.dataset.id = it.id; a.tabIndex = 0; a.setAttribute('role', 'button'); a.setAttribute('aria-expanded', buka.has(it.id) ? 'true' : 'false');
    const rk = el('div', 'lb-rk');
    if (rank === 1) rk.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 8l4.5 4L12 5l4.5 7L21 8l-2 10H5z"/><path d="M5 21h14"/></svg>';
    if (rank <= 3) rk.appendChild(el('b', '', 'Terbaru ' + rank)); else rk.appendChild(el('b', 'no', rank));
    const hd = el('div', 'lb-hd'); hd.append(rk, el('span', 'lb-t', lalu(it.ts)));
    const nm = el('h4', 'lb-tn', it.tn);
    const mt = el('div', 'lb-meta'); mt.append(el('span', 'lb-chip', it.be + ' ' + it.bn), el('span', 'lb-chip ke', '🎫 Tiket ke-' + it.ke));
    const wk = el('small', 'lb-abs', tgl(d, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }) + ' · ' + jam(d));
    const pr = el('div', 'lb-prog'); const bar = el('span'); const fl = el('i'); fl.style.width = pct + '%'; bar.appendChild(fl);
    pr.append(bar, el('em', '', tot ? done + '/' + tot + ' checklist' : 'tanpa checklist'));
    const dt = el('div', 'lb-det'), inner = el('div'), ul = el('ul');
    if (!tot) ul.appendChild(el('li', 'kos', 'Tidak ada checklist saat tiket dipakai'));
    it.c.forEach(c => { const li = el('li', c.k ? 'ok' : 'no'); li.append(el('i', '', c.k ? '✓' : '·'), el('span', '', (c.x || '').trim() || '(kosong)')); ul.appendChild(li); });
    inner.append(el('small', 'lb-dh', 'Checklist saat tiket dipakai'), ul); dt.appendChild(inner);
    const ar = el('i', 'lb-ar'); ar.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>';
    a.append(hd, nm, mt, wk, pr, dt, ar);
    return a;
  }

  function hitung(el0, to) {
    const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!anim || reduce || to < 1) { el0.textContent = angka(to); return; }
    const t0 = performance.now(), dur = 700;
    (function f(t) { const k = Math.min(1, Math.max(0, (t - t0) / dur)), e = 1 - Math.pow(1 - k, 3); el0.textContent = angka(Math.round(to * e)); if (k < 1) requestAnimationFrame(f); })(t0);
  }

  function render() {
    const [a, b] = rentang(per), { out, src } = semua();
    seg.dataset.sel = P.indexOf(per);
    seg.querySelectorAll('button').forEach(x => { const on = x.dataset.p === per; x.classList.toggle('on', on); x.setAttribute('aria-selected', on ? 'true' : 'false'); });
    cap.textContent = teksRentang(per, a, b);
    const dlm = out.filter(x => x.ts >= a.getTime() && x.ts < b.getTime());
    const ada = {}; dlm.forEach(x => { ada[x.bid] = (ada[x.bid] || 0) + 1; });
    if (bid !== 'all' && !src.some(x => x.id === bid)) bid = 'all';

    /* rel kiri: pilihan bidang */
    rail.textContent = '';
    const pil = (id, em, nm, n) => {
      const bt = el('button', 'lb-rb' + (bid === id ? ' on' : '')); bt.type = 'button'; bt.dataset.b = id; bt.setAttribute('aria-pressed', bid === id ? 'true' : 'false'); bt.setAttribute('aria-label', nm + ', ' + n + ' tiket');
      bt.append(el('span', 'lb-re', em), el('span', 'lb-rn', nm), el('em', 'lb-rc' + (n ? '' : ' nol'), n));
      return bt;
    };
    rail.appendChild(pil('all', '🏆', 'Semua', dlm.length));
    src.filter(x => (x.n || '').trim() || (x.r || []).length).forEach(x => rail.appendChild(pil(x.id, x.e || '📌', (x.n || '').trim() || 'Tanpa nama', ada[x.id] || 0)));

    /* data terpilih, terbaru di atas */
    const dat = dlm.filter(x => bid === 'all' || x.bid === bid).sort((x, y) => y.ts - x.ts);
    const tug = new Set(dat.map(x => x.bid + '|' + x.tn)).size, ck = dat.reduce((s, x) => s + x.c.filter(c => c.k).length, 0);
    sts.textContent = '';
    [['🎫', dat.length, 'Tiket keluar'], ['🗂️', tug, 'Tugas'], ['✅', ck, 'Checklist']].forEach(s => {
      const c = el('div', 'lb-st'); const n = el('b', '', '0'); c.append(el('i', '', s[0]), n, el('small', '', s[2])); sts.appendChild(c); hitung(n, s[1]);
    });

    pod.textContent = ''; lst.textContent = ''; more.hidden = true;
    $('lb').classList.toggle('noanim', !anim);
    if (!dat.length) {
      const k = el('div', 'lb-empty'); k.append(el('i', '', '🎟️'), el('b', '', 'Belum ada tiket keluar ' + NAMA[per]));
      k.append(el('small', '', src.length ? 'Selesaikan checklist sebuah tugas lalu ketuk "Pakai 1 tiket" — tugas terbaru muncul di sini.' : 'Buat bidang & tugas dulu di atas, lalu pakai tiketnya.'));
      const nx = P[P.indexOf(per) + 1];
      if (nx) { const bt = el('button', 'lb-go', 'Lihat ' + NAMA[nx] + ' →'); bt.type = 'button'; bt.dataset.go = nx; k.appendChild(bt); }
      pod.appendChild(k); return;
    }
    dat.slice(0, 3).forEach((x, i) => pod.appendChild(kartu(x, i + 1, i)));
    dat.slice(3, limit).forEach((x, i) => lst.appendChild(kartu(x, i + 4, i + 3)));
    if (dat.length > limit) { more.hidden = false; more.textContent = 'Tampilkan lebih banyak (' + (dat.length - limit) + ' lagi)'; }
  }

  function ganti() { anim = true; limit = BATAS; render(); }
  seg.addEventListener('click', e => { const b = e.target.closest && e.target.closest('button[data-p]'); if (!b || b.dataset.p === per) return; per = b.dataset.p; save('lb_per', per); ganti(); });
  rail.addEventListener('click', e => { const b = e.target.closest && e.target.closest('.lb-rb'); if (!b || b.dataset.b === bid) return; bid = b.dataset.b; save('lb_bid', bid); ganti(); });
  more.addEventListener('click', () => { limit += BATAS; anim = false; render(); });
  function toggle(a) { const id = a.dataset.id, on = !a.classList.contains('open'); a.classList.toggle('open', on); a.setAttribute('aria-expanded', on ? 'true' : 'false'); if (on) buka.add(id); else buka.delete(id); }
  $('lb').addEventListener('click', e => {
    const g = e.target.closest && e.target.closest('.lb-go'); if (g) { per = g.dataset.go; save('lb_per', per); ganti(); return; }
    const a = e.target.closest && e.target.closest('.lb-it'); if (a) toggle(a);
  });
  $('lb').addEventListener('keydown', e => { const a = e.target.classList && e.target.classList.contains('lb-it') ? e.target : null; if (a && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); toggle(a); } });
  let t = null;
  document.addEventListener('bidang-berubah', () => { clearTimeout(t); t = setTimeout(() => { anim = false; render(); }, 120); });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) { anim = false; render(); } });
  setInterval(() => { if (!document.hidden) { anim = false; render(); } }, 60000); /* "x menit lalu" & pergantian hari */
  render();
})();

/* ===== RIWAYAT TIKET LENGKAP (Produktif > Leaderboard > tombol "Lihat semuanya"): halaman semua pemakaian tiket.
   Atas = pencarian (nama tugas, bidang, isi checklist, "tiket ke-N", tanggal dalam beberapa format, jam, hari/bulan, "hari ini"/"kemarin"),
   kanan atas = filter bidang. Terbaru di atas, dikelompokkan per hari. Ketuk 1x kartu = lihat checklist saat tiket dipakai.
   Ketuk 3x kartu = mode edit (tombol "Edit checklist" + "Hapus"), ketuk 1x di luar kartu = kunci. Hapus => dialog konfirmasi => riwayat hilang => tiket kembali ke kartu
   (lewat window.hapusRiwayatBidang di modul Bidang). Edit checklist => jendela ubah teks / centang / tambah / hapus baris => window.editRiwayatBidang.
   Menghapus & mengedit riwayat HANYA bisa dari halaman ini. Pencarian mencakup semua lapisan: bidang (nama, ikon, nomor), tugas (nama, nomor urut),
   isi checklist (+ status selesai/belum, "3/3"), tiket ke-N, tanggal, jam, hari/bulan/tahun, hari ini / kemarin / minggu ini / bulan ini. ===== */
(function () {
  const btn = $('lbAll'), pg = $('lbPage');
  if (!btn || !pg) return;
  const body = $('lbpBody'), lst = $('lbpList'), q = $('lbpQ'), clr = $('lbpClr'), head = $('lbpHead'), sum = $('lbpSum'), dot = $('lbpDot'), chip = $('lbpChip'), fov = $('lbFilter'), fList = $('lbfList');
  const BLN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  const BLS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  const HRI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const WARNA = ['255,122,26', '225,29,46', '255,184,77', '255,92,138', '255,140,66', '240,171,60']; /* warna aksen tiap bidang (urut sesuai kotak bidang) */
  const STEP = 60;
  const angka = n => new Intl.NumberFormat('id-ID').format(n);
  const p2 = n => String(n).padStart(2, '0');
  const el = (t, c, x) => { const e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; };
  const hk = ts => { const d = new Date(ts); return d.getFullYear() + '-' + d.getMonth() + '-' + d.getDate(); };
  const selisihHari = ts => { const d = new Date(ts), n = new Date(); return Math.round((new Date(n.getFullYear(), n.getMonth(), n.getDate()) - new Date(d.getFullYear(), d.getMonth(), d.getDate())) / 864e5); };
  const labelRel = ts => { const s = selisihHari(ts); return s === 0 ? 'hari ini' : s === 1 ? 'kemarin' : ''; };
  const judulHari = ts => {
    const d = new Date(ts), t = HRI[d.getDay()] + ', ' + d.getDate() + ' ' + BLS[d.getMonth()] + ' ' + d.getFullYear(), s = selisihHari(ts);
    return s === 0 ? 'Hari ini · ' + t : s === 1 ? 'Kemarin · ' + t : t;
  };
  let fBid = null, limit = STEP, editId = null, tapId = null, tapN = 0, tapT = null, tapOpen = false, tt = null;
  const buka = new Set();

  function ambil() { /* semua pemakaian dari semua bidang, terbaru di atas; ke = urutan tiket keluar di bidang itu */
    const src = window.bidangRiwayat ? window.bidangRiwayat() : [], out = [];
    src.forEach((b, bi) => {
      const cnt = {}, nm = (b.n || '').trim() || 'Tanpa nama';
      (b.r || []).slice().sort((x, y) => x.ts - y.ts).forEach(r => {
        cnt.b = (cnt.b || 0) + 1; /* nomor tiket = urutan keluar di bidang itu (1, 2, 3, ...) */
        const ti = (b.t || []).findIndex(z => z.id === r.tid);
        out.push({ id: r.id, bid: b.id, bn: nm, be: b.e || '📌', tid: r.tid, tl: ti >= 0 ? String(b.t[ti].n || '').trim() : '', no: ti + 1, bno: bi + 1, w: WARNA[bi % WARNA.length], ts: r.ts, tn: (r.tn || '').trim() || 'Tanpa nama', ke: cnt.b, c: Array.isArray(r.c) ? r.c : [] });
      });
    });
    out.sort((a, b) => b.ts - a.ts);
    return { out, src };
  }
  function tumpukan(x) { /* semua teks yang bisa dicari, semua lapisan: bidang > tugas > checklist > tiket > waktu */
    const d = new Date(x.ts), dd = d.getDate(), mm = d.getMonth(), yy = d.getFullYear(), j = p2(d.getHours()) + ':' + p2(d.getMinutes());
    const done = x.c.filter(c => c.k).length, tot = x.c.length, n = new Date(), aw = new Date(n.getFullYear(), n.getMonth(), n.getDate() - n.getDay()).getTime();
    const rel = [labelRel(x.ts)];
    if (x.ts >= aw && x.ts < aw + 6048e5) rel.push('minggu ini');
    if (yy === n.getFullYear() && mm === n.getMonth()) rel.push('bulan ini');
    if (yy === n.getFullYear()) rel.push('tahun ini');
    const st = !tot ? ['tanpa checklist'] : done === tot ? ['selesai', 'lengkap', 'semua tercentang'] : ['belum selesai', 'sebagian'];
    return [x.be, x.bn, 'bidang', x.bno ? 'bidang ' + x.bno : '', x.tn, x.tl, 'tugas', x.no ? 'tugas nomor ' + x.no : '', x.no ? 'tugas ' + x.no : '',
      'tiket', 'tiket ke-' + x.ke, 'ke-' + x.ke, 'checklist', done + '/' + tot, done + ' dari ' + tot].concat(st, x.c.map(c => (c.x || '') + ' ' + (c.k ? 'selesai' : 'belum')), [
      p2(dd) + '/' + p2(mm + 1) + '/' + yy, dd + '/' + (mm + 1) + '/' + yy, p2(dd) + '-' + p2(mm + 1) + '-' + yy, yy + '-' + p2(mm + 1) + '-' + p2(dd),
      dd + ' ' + BLN[mm] + ' ' + yy, dd + ' ' + BLS[mm] + ' ' + yy, HRI[d.getDay()], BLN[mm], BLS[mm], String(yy), j, j.replace(':', '.'), 'pukul ' + j.replace(':', '.')
    ], rel).join(' | ').toLowerCase();
  }

  function kartu(x, i) {
    const d = new Date(x.ts), done = x.c.filter(c => c.k).length, tot = x.c.length, pct = tot ? Math.round(done / tot * 100) : 0, open = buka.has(x.id);
    const a = el('article', 'lp-it' + (open ? ' open' : ''));
    a.style.setProperty('--lc', x.w); a.style.setProperty('--i', i); a.dataset.id = x.id; a.dataset.bid = x.bid;
    a.tabIndex = 0; a.setAttribute('role', 'button'); a.setAttribute('aria-expanded', open ? 'true' : 'false');
    const tx = el('div', 'lp-tx'); tx.append(el('h4', 'lp-tn', x.tn), el('small', 'lp-sub', x.bn));
    const hd = el('div', 'lp-hd'); hd.append(el('i', 'lp-av', x.be), tx, el('span', 'lp-jam', p2(d.getHours()) + '.' + p2(d.getMinutes())));
    const mt = el('div', 'lp-meta'); mt.append(el('span', 'lp-chip ke', '🎫 Tiket ke-' + x.ke));
    const pr = el('div', 'lp-prog'), bar = el('span'), fl = el('i'); fl.style.width = pct + '%'; bar.appendChild(fl);
    pr.append(bar, el('em', '', tot ? done + '/' + tot + ' checklist' : 'tanpa checklist'));
    const dt = el('div', 'lp-det'), inner = el('div'), ul = el('ul');
    if (!tot) ul.appendChild(el('li', 'kos', 'Tidak ada checklist saat tiket dipakai'));
    x.c.forEach(c => { const li = el('li', c.k ? 'ok' : 'no'); li.append(el('i', '', c.k ? '✓' : '·'), el('span', '', (c.x || '').trim() || '(kosong)')); ul.appendChild(li); });
    inner.append(el('small', 'lp-dh', 'Checklist saat tiket dipakai'), ul); dt.appendChild(inner);
    const ar = el('i', 'lp-ar'); ar.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>';
    a.append(hd, mt, pr, dt, ar);
    return a;
  }

  function perbarui() { /* teks kecil di tombol "Lihat semuanya" */
    const n = ambil().out.length, s = $('lbaN');
    if (s) s.textContent = n ? angka(n) + ' pemakaian tiket · cari & filter bidang' : 'Belum ada tiket yang dipakai';
  }

  function render() {
    if (pg.hidden) return;
    editId = null;
    const { out } = ambil();
    if (fBid && !out.some(x => x.bid === fBid)) fBid = null;
    const tok = q.value.trim().toLowerCase().split(/\s+/).filter(Boolean);
    let arr = out;
    if (fBid) arr = arr.filter(x => x.bid === fBid);
    if (tok.length) arr = arr.filter(x => { const t = tumpukan(x); return tok.every(k => t.includes(k)); });
    clr.hidden = !tok.length; dot.hidden = !fBid; chip.hidden = !fBid;
    const ref = fBid ? out.find(x => x.bid === fBid) : null;
    if (ref) $('lbpChipT').textContent = ref.be + ' ' + ref.bn;

    sum.textContent = '';
    const tug = new Set(arr.map(x => x.bid + '|' + x.tn)).size, ck = arr.reduce((s, x) => s + x.c.filter(c => c.k).length, 0);
    [['🎫', arr.length, 'Tiket keluar'], ['🗂️', tug, 'Tugas'], ['✅', ck, 'Checklist']].forEach(s => {
      const c = el('div', 'lbp-st'); c.append(el('i', '', s[0]), el('b', '', angka(s[1])), el('small', '', s[2])); sum.appendChild(c);
    });
    head.textContent = (tok.length ? 'Hasil pencarian' : ref ? 'Bidang ' + ref.bn : 'Semua pemakaian') + ' · ' + arr.length + ' tiket';

    lst.textContent = '';
    if (!arr.length) {
      const k = el('div', 'lbp-empty'); k.append(el('i', '', out.length ? '🔍' : '🎟️'), el('b', '', out.length ? 'Tidak ada pemakaian yang cocok' : 'Belum ada tiket yang dipakai'));
      k.append(el('small', '', out.length ? 'Coba kata kunci lain (bidang, tugas, isi checklist, nomor tiket, tanggal, atau jam) atau ganti filter bidang.' : 'Selesaikan checklist sebuah tugas lalu ketuk "Pakai 1 tiket" — riwayatnya muncul di sini.'));
      lst.appendChild(k); return;
    }
    const perHari = {}; arr.forEach(x => { const k = hk(x.ts); perHari[k] = (perHari[k] || 0) + 1; });
    const f = document.createDocumentFragment(); let kh = null, shown = 0;
    for (const x of arr) {
      if (shown >= limit) break;
      const k = hk(x.ts);
      if (k !== kh) { kh = k; const h = el('div', 'lbp-day'); h.append(el('span', '', judulHari(x.ts)), el('em', '', perHari[k] + ' tiket')); f.appendChild(h); }
      f.appendChild(kartu(x, shown)); shown++;
    }
    if (arr.length > shown) { const m = el('button', 'lbp-more', 'Tampilkan lebih banyak (' + (arr.length - shown) + ' lagi)'); m.type = 'button'; f.appendChild(m); }
    lst.appendChild(f);
  }

  /* ---- buka / tutup halaman ---- */
  btn.addEventListener('click', () => { q.value = ''; fBid = null; limit = STEP; editId = null; pg.hidden = false; body.scrollTop = 0; render(); });
  function tutup() { kunci(); fov.hidden = true; pg.hidden = true; }
  $('lbpBack').addEventListener('click', tutup);
  q.addEventListener('input', () => { limit = STEP; render(); });
  q.addEventListener('keydown', e => { if (e.key === 'Enter') q.blur(); });
  clr.addEventListener('click', () => { q.value = ''; limit = STEP; render(); q.focus(); });
  $('lbpChipX').addEventListener('click', () => { fBid = null; limit = STEP; render(); });

  /* ---- filter bidang ---- */
  $('lbpFilter').addEventListener('click', () => {
    const { out, src } = ambil(); fList.textContent = '';
    const item = (id, e, n, c) => {
      const b = el('button', 'rwf-item' + ((id === null ? fBid === null : fBid === id) ? ' on' : '')); b.type = 'button'; b.dataset.id = id === null ? '' : id;
      b.append(el('i', '', e), el('span', '', n), el('small', '', c), el('em', '', '✓')); fList.appendChild(b);
    };
    item(null, '🗂️', 'Semua bidang', out.length);
    src.filter(b => (b.n || '').trim() || (b.r || []).length).forEach(b => item(b.id, b.e || '📌', (b.n || '').trim() || 'Tanpa nama', out.filter(x => x.bid === b.id).length));
    fov.hidden = false;
  });
  fList.addEventListener('click', e => { const b = e.target.closest('.rwf-item'); if (!b) return; fBid = b.dataset.id || null; limit = STEP; fov.hidden = true; render(); });
  fov.addEventListener('click', e => { if (e.target === fov) fov.hidden = true; });

  /* ---- edit checklist riwayat (jendela): ubah teks (tanpa batas karakter), centang, tambah / hapus baris ---- */
  const pe = $('lpEd'), peList = $('lpEdList'), peMsg = $('lpEdMsg');
  let peId = null, peBid = null;
  const ukurE = t => { t.style.height = 'auto'; t.style.height = Math.max(t.scrollHeight, 24) + 'px'; };
  function barisE(c) {
    const r = el('div', 'bd-ck' + (c.k ? ' on' : '')), cb = el('button', 'bd-cb'), tx = el('textarea', 'bd-ct'), xb = el('button', 'bd-cx', '✕');
    cb.type = 'button'; cb.setAttribute('aria-label', 'Centang'); cb.setAttribute('aria-pressed', c.k ? 'true' : 'false');
    cb.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
    tx.rows = 1; tx.value = c.x || ''; tx.placeholder = 'Tulis checklist…'; tx.spellcheck = false; tx.setAttribute('aria-label', 'Isi checklist');
    xb.type = 'button'; xb.setAttribute('aria-label', 'Hapus checklist');
    r.append(cb, tx, xb); return r;
  }
  function bukaEdit(a) {
    const x = ambil().out.find(o => o.id === a.dataset.id);
    if (!x) { kunci(); render(); return; }
    peId = x.id; peBid = x.bid; peList.textContent = ''; peMsg.textContent = '';
    $('lpEdInfo').textContent = '"' + x.tn + '" · ' + x.bn + ' · Tiket ke-' + x.ke;
    x.c.forEach(c => peList.appendChild(barisE(c)));
    pe.hidden = false;
    requestAnimationFrame(() => peList.querySelectorAll('.bd-ct').forEach(ukurE));
  }
  function tutupEd() { pe.hidden = true; peId = null; peBid = null; }
  function tambahE(setelah) {
    const r = barisE({ x: '', k: false });
    if (setelah && setelah.nextSibling) peList.insertBefore(r, setelah.nextSibling); else peList.appendChild(r);
    const t = r.querySelector('.bd-ct'); ukurE(t); t.focus();
    if (r.scrollIntoView) r.scrollIntoView({ block: 'nearest' });
  }
  peList.addEventListener('click', e => {
    const r = e.target.closest('.bd-ck'); if (!r) return;
    if (e.target.closest('.bd-cb')) { const on = !r.classList.contains('on'); r.classList.toggle('on', on); r.querySelector('.bd-cb').setAttribute('aria-pressed', on ? 'true' : 'false'); }
    else if (e.target.closest('.bd-cx')) r.remove();
  });
  peList.addEventListener('input', e => { if (e.target.classList.contains('bd-ct')) ukurE(e.target); });
  peList.addEventListener('keydown', e => {
    if (!e.target.classList.contains('bd-ct')) return;
    const r = e.target.closest('.bd-ck'); if (!r) return;
    if (e.key === 'Enter') { e.preventDefault(); if (e.target.value.trim()) tambahE(r); }
    else if (e.key === 'Backspace' && !e.target.value) { e.preventDefault(); const pv = r.previousElementSibling; r.remove(); if (pv) { const t = pv.querySelector('.bd-ct'); if (t) t.focus(); } }
  });
  $('lpEdAdd').addEventListener('click', () => tambahE(null));
  $('lpEdCancel').addEventListener('click', tutupEd);
  pe.addEventListener('click', e => { if (e.target === pe) tutupEd(); });
  $('lpEdSave').addEventListener('click', () => {
    if (!peId) return;
    const items = [...peList.querySelectorAll('.bd-ck')].map(r => ({ x: r.querySelector('.bd-ct').value.trim(), k: r.classList.contains('on') })).filter(c => c.x);
    const id = peId, r = window.editRiwayatBidang ? window.editRiwayatBidang(peBid, id, items) : null;
    tutupEd(); kunci();
    if (r) buka.add(id); else buka.delete(id);
    render(); perbarui();
    toast(r ? 'Checklist riwayat diperbarui ✓' : 'Riwayat tidak ditemukan');
  });

  /* ---- ketuk kartu: 1x = buka/tutup checklist, 3x = mode edit (edit checklist / hapus), 1x di luar = kunci ---- */
  function setOpen(a, on) { a.classList.toggle('open', on); a.setAttribute('aria-expanded', on ? 'true' : 'false'); if (on) buka.add(a.dataset.id); else buka.delete(a.dataset.id); }
  function masukEdit(a) {
    editId = a.dataset.id; a.classList.add('editing');
    const ed = el('div', 'lp-ed'), eb = el('button', 'lp-edit', '✏️ Edit checklist'), bt = el('button', 'lp-del', '🗑️ Hapus riwayat ini'); eb.type = 'button'; bt.type = 'button';
    ed.append(eb, bt, el('small', 'lp-edh', 'Hapus = tiket kembali ke kartu · ketuk di luar kartu untuk mengunci'));
    a.appendChild(ed);
    try { if (navigator.vibrate) navigator.vibrate(15); } catch (e) {}
  }
  function kunci() {
    if (!editId) return;
    const a = lst.querySelector('.lp-it.editing');
    if (a) { a.classList.remove('editing'); const ed = a.querySelector('.lp-ed'); if (ed) ed.remove(); }
    editId = null;
  }
  async function hapus(a) {
    const id = a.dataset.id, bid = a.dataset.bid, x = ambil().out.find(o => o.id === id);
    if (!x) { kunci(); render(); return; }
    const d = new Date(x.ts), bk = d.getFullYear() + '-' + (d.getMonth() + 1), kembali = !!window.tiketBulan && bk === window.tiketBulan(), sisa = window.sisaTiket ? window.sisaTiket() : 0;
    const terbuka = ambil().out.filter(o => o.bid === x.bid && o.tid === x.tid).length <= 1; /* riwayat terakhir tugas ini => kunci tugas terbuka lagi */
    const pesan = '"' + x.tn + '" · ' + x.bn + '\n' + HRI[d.getDay()] + ', ' + d.getDate() + ' ' + BLS[d.getMonth()] + ' ' + d.getFullYear() + ' · ' + p2(d.getHours()) + '.' + p2(d.getMinutes()) + '\n\n' +
      (kembali ? 'Riwayat ini dihapus dan 1 tiket dikembalikan ke kartu (sisa ' + angka(sisa) + ' → ' + angka(sisa + 1) + '). Pemakaian bulan ini berkurang 1.' : 'Ini pemakaian bulan lalu. Jatah bulan itu sudah direset, jadi tidak ada tiket yang ditambahkan ke kartu.') +
      (terbuka ? '\n\nTugasnya terbuka lagi: checklist bisa diubah dan tiket bisa dipakai lagi.' : '');
    const ok = await konfirmasi('Hapus riwayat pemakaian?', pesan, 'Hapus');
    if (ok !== true) return;
    const r = window.hapusRiwayatBidang ? window.hapusRiwayatBidang(bid, id) : null;
    kunci(); buka.delete(id); render(); perbarui();
    toast(!r ? 'Riwayat tidak ditemukan' : r.kembali ? 'Riwayat dihapus · 1 tiket kembali ke kartu ✓' : 'Riwayat dihapus ✓');
  }
  lst.addEventListener('click', e => {
    const m = e.target.closest('.lbp-more'); if (m) { limit += STEP; render(); return; }
    const a = e.target.closest('.lp-it'); if (!a) return;
    if (e.target.closest('.lp-edit')) { bukaEdit(a); return; }
    if (e.target.closest('.lp-del')) { hapus(a); return; }
    if (editId === a.dataset.id) return; /* sedang mode hapus: ketukan di dalam kartu tidak melakukan apa-apa */
    if (editId) kunci();
    if (a.dataset.id !== tapId) { tapId = a.dataset.id; tapN = 0; tapOpen = a.classList.contains('open'); }
    tapN++; clearTimeout(tapT);
    if (tapN >= 3) { tapN = 0; tapId = null; setOpen(a, tapOpen); masukEdit(a); }
    else { setOpen(a, !a.classList.contains('open')); tapT = setTimeout(() => { tapN = 0; tapId = null; }, 500); }
  });
  lst.addEventListener('keydown', e => {
    const a = e.target.classList && e.target.classList.contains('lp-it') ? e.target : null;
    if (a && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); if (!editId) setOpen(a, !a.classList.contains('open')); }
  });
  document.addEventListener('click', e => { /* ketuk 1x di luar kartu yang sedang mode hapus = kunci */
    if (!editId) return;
    const a = lst.querySelector('.lp-it.editing'), p = e.composedPath ? e.composedPath() : [];
    if (a && !p.includes(a) && !p.includes($('cfm')) && !p.includes(pe)) kunci();
  });
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    if (!pe.hidden) tutupEd();
    else if (!fov.hidden) fov.hidden = true;
    else if (!pg.hidden && $('cfm').hidden) { if (editId) kunci(); else tutup(); }
  });

  /* ---- ikut berubah bila data bidang berubah (mis. sinkron Drive) ---- */
  document.addEventListener('bidang-berubah', () => { clearTimeout(tt); tt = setTimeout(() => { perbarui(); if (!pg.hidden && !editId) render(); }, 150); });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) perbarui(); });
  setInterval(() => { if (!document.hidden) { perbarui(); if (!pg.hidden && !editId) render(); } }, 60000); /* "Hari ini/Kemarin" & pergantian hari */
  perbarui();
})();

/* ===== KATEGORI KEUANGAN: tombol + di bawah kartu saldo membuka halaman kategori (pil Pengeluaran | Pemasukan).
   Tombol "+" bulat = tambah kategori. Tahan (500 ms) sebuah kategori = edit / hapus. Data: kat_keluar, kat_masuk ===== */
(function () {
  const ov = $('kat'), pill = $('kPill'), tabs = pill.querySelectorAll('button');
  const grids = { keluar: $('kGKeluar'), masuk: $('kGMasuk') }, pans = { keluar: $('kPKeluar'), masuk: $('kPMasuk') };
  const KEY = { keluar: 'kat_keluar', masuk: 'kat_masuk' };
  const DEF = {
    keluar: [['Makan', '🍜'], ['Transport', '🚌'], ['Belanja', '🛍️'], ['Tagihan', '🧾'], ['Hiburan', '🎮'], ['Kesehatan', '💊'], ['Pendidikan', '📚'], ['Lainnya', '🧩']],
    masuk: [['Gaji', '💼'], ['Bonus', '🎁'], ['Usaha', '🏪'], ['Investasi', '📈'], ['Hadiah', '🎉'], ['Lainnya', '💰']]
  };
  const EMO = ['🍜', '🍔', '☕', '🛒', '🛍️', '🚌', '🚗', '⛽', '🏠', '🧾', '💡', '📱', '🎮', '🎬', '✈️', '💊', '🏥', '📚', '🎓', '👶', '🐾', '🎁', '💼', '💰', '📈', '🏪', '💳', '🎉', '🧩', '✨'];
  const uid = () => 'k' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
  const data = {};
  Object.keys(KEY).forEach(k => {
    let a = null; try { a = JSON.parse(load(KEY[k]) || 'null'); } catch (e) {}
    if (!Array.isArray(a)) { a = DEF[k].map(d => ({ id: uid(), n: d[0], e: d[1] })); save(KEY[k], JSON.stringify(a)); }
    data[k] = a.filter(c => c && c.id && typeof c.n === 'string');
  });
  const simpan = k => save(KEY[k], JSON.stringify(data[k]));
  let tab = 'keluar';
  const ADDSVG = '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>';

  function render(k) {
    const g = grids[k]; g.textContent = '';
    data[k].forEach(c => {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'kat-c'; b.dataset.id = c.id;
      const i = document.createElement('i'); i.textContent = c.e; const s = document.createElement('span'); s.textContent = c.n;
      b.append(i, s); g.appendChild(b);
    });
    const p = document.createElement('button'); p.type = 'button'; p.className = 'kat-c kat-add'; p.dataset.add = '1';
    p.setAttribute('aria-label', 'Tambah kategori'); p.innerHTML = '<i>' + ADDSVG + '</i><span>Tambah</span>'; g.appendChild(p);
  }
  function pilih(k) {
    tab = k;
    tabs.forEach(b => { const on = b.dataset.k === k; b.classList.toggle('on', on); b.setAttribute('aria-selected', on); });
    pill.dataset.sel = k === 'masuk' ? 1 : 0;
    Object.keys(pans).forEach(x => pans[x].classList.toggle('on', x === k));
  }
  tabs.forEach(b => b.addEventListener('click', () => pilih(b.dataset.k)));
  render('keluar'); render('masuk');
  $('eAdd').addEventListener('click', () => { const kosong = !!(window.saldoKini && window.saldoKini() <= 0); grids.keluar.classList.toggle('kunci', kosong); ov.hidden = false; $('kat').querySelector('.katbody').scrollTop = 0; });
  $('katClose').addEventListener('click', () => { ov.hidden = true; });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('katEdit').hidden) $('katEdit').hidden = true; else if (e.key === 'Escape' && !ov.hidden && $('trx').hidden) ov.hidden = true; });

  /* ---- tambah / edit / hapus ---- */
  const ed = $('katEdit'), nama = $('keNama'), emIn = $('keEmojiIn'), prev = $('kePrev'), box = $('keEmoji');
  let eK = 'keluar', eId = null, eEmo = '✨';
  EMO.forEach(e => { const b = document.createElement('button'); b.type = 'button'; b.textContent = e; b.dataset.e = e; box.appendChild(b); });
  function setEmo(e) { eEmo = e; prev.textContent = e; box.querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.e === e)); }
  box.addEventListener('click', ev => { const b = ev.target.closest('button'); if (b) { setEmo(b.dataset.e); emIn.value = ''; } });
  emIn.addEventListener('input', () => {
    const v = emIn.value.trim(); if (!v) return;
    const seg = window.Intl && Intl.Segmenter ? [...new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(v)].map(x => x.segment) : [...v];
    setEmo(seg[0]);
  });
  function bukaEdit(k, id) {
    eK = k; eId = id; const c = id ? data[k].find(x => x.id === id) : null;
    $('keTitle').textContent = c ? 'Edit kategori' : 'Tambah kategori';
    nama.value = c ? c.n : ''; emIn.value = ''; setEmo(c ? c.e : '✨');
    $('keDel').style.display = c ? '' : 'none'; ed.hidden = false;
    if (!c) setTimeout(() => nama.focus(), 50);
  }
  $('keCancel').addEventListener('click', () => { ed.hidden = true; });
  ed.addEventListener('click', e => { if (e.target === ed) ed.hidden = true; });
  $('keSave').addEventListener('click', () => {
    const n = nama.value.trim(); if (!n) { toast('Nama kategori belum diisi'); nama.focus(); return; }
    if (eId) { const c = data[eK].find(x => x.id === eId); if (c) { c.n = n; c.e = eEmo; } }
    else data[eK].push({ id: uid(), n, e: eEmo });
    simpan(eK); render(eK); ed.hidden = true; toast(eId ? 'Kategori diperbarui ✓' : 'Kategori ditambahkan ✓');
  });
  nama.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); $('keSave').click(); } });
  $('keDel').addEventListener('click', async () => {
    const c = data[eK].find(x => x.id === eId); if (!c) return;
    const ok = await konfirmasi('Hapus kategori?', 'Kategori "' + c.n + '" akan dihapus.', 'Hapus'); if (!ok) return;
    data[eK] = data[eK].filter(x => x.id !== eId); simpan(eK); render(eK); ed.hidden = true; toast('Kategori dihapus ✓');
  });

  /* ---- ketuk "+" = tambah, tahan kategori = edit/hapus ---- */
  Object.keys(grids).forEach(k => {
    const g = grids[k]; let t = null, sx = 0, sy = 0, lp = false;
    const batal = () => { clearTimeout(t); t = null; };
    g.addEventListener('contextmenu', e => e.preventDefault());
    g.addEventListener('click', e => {
      if (lp) { lp = false; return; } /* klik setelah tahan lama = abaikan */
      if (e.target.closest('.kat-add')) { bukaEdit(k, null); return; }
      const b = e.target.closest('.kat-c'); if (!b) return;
      if (k === 'keluar' && window.saldoKini && window.saldoKini() <= 0) { katToast('Saldo Rp 0 · catat pemasukan dulu'); return; }
      const c = data[k].find(x => x.id === b.dataset.id); if (c && window.bukaTrx) window.bukaTrx(k, c);
    });
    g.addEventListener('pointerdown', e => {
      lp = false;
      const b = e.target.closest('.kat-c'); if (!b || b.dataset.add) return;
      sx = e.clientX; sy = e.clientY; batal();
      t = setTimeout(() => { t = null; lp = true; if (navigator.vibrate) try { navigator.vibrate(15); } catch (x) {} bukaEdit(k, b.dataset.id); }, 500);
    });
    g.addEventListener('pointermove', e => { if (t && Math.hypot(e.clientX - sx, e.clientY - sy) > 10) batal(); });
    ['pointerup', 'pointercancel', 'pointerleave'].forEach(ev => g.addEventListener(ev, batal));
  });
})();

/* ===== CATAT TRANSAKSI: ketuk kategori -> isi jumlah, tanggal, catatan (wajib semua) -> tersimpan di 'transaksi', kartu saldo ikut berubah ===== */
(function () {
  const ov = $('trx'), jml = $('trxJml'), tgl = $('trxTgl'), ct = $('trxCt');
  let tipe = 'keluar', kat = null, edit = null;
  const baca = () => { try { const a = JSON.parse(load('transaksi') || '[]'); return Array.isArray(a) ? a : []; } catch (e) { return []; } };
  const hari = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  function hitung() {
    let m = 0, k = 0; const arr = baca();
    arr.forEach(x => { if (x.t === 'masuk') m += x.a; else if (x.t === 'keluar' || x.t === 'abel') k += x.a; });
    if (window.setSaldo) window.setSaldo(saldoDari(arr), m, k);
    renderRw(); renderPg();
    document.dispatchEvent(new Event('keu-berubah'));
  }
  window.saldoKini = () => saldoDari(baca());
  window.bukaTrx = function (t, c) {
    tipe = t; kat = c; edit = null; ov.className = t === 'masuk' ? 'masuk' : 'keluar'; $('trxDel').hidden = true; ct.style.height = '';
    $('trxTitle').textContent = t === 'masuk' ? 'Pemasukan' : (t === 'abel' ? 'Pengeluaran anggaran' : 'Pengeluaran');
    $('trxEmo').textContent = c.e; $('trxCat').textContent = c.n;
    $('trxSave').textContent = 'Simpan ' + (t === 'masuk' ? 'pemasukan' : 'pengeluaran');
    jml.value = ''; tgl.value = hari(); ct.value = '';
    ['fJml', 'fTgl', 'fCat'].forEach(i => $(i).classList.remove('err'));
    $('trxBody').scrollTop = 0; ov.hidden = false; setTimeout(() => jml.focus(), 80);
  };
  $('trxClose').addEventListener('click', () => { ov.hidden = true; });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !ov.hidden) ov.hidden = true; });
  jml.addEventListener('input', () => {
    const d = jml.value.replace(/\D/g, '').slice(0, 13).replace(/^0+(?=\d)/, '');
    jml.value = d ? new Intl.NumberFormat('id-ID').format(+d) : ''; $('fJml').classList.remove('err');
  });
  tgl.addEventListener('input', () => $('fTgl').classList.remove('err'));
  ct.addEventListener('input', () => $('fCat').classList.remove('err'));
  $('trxSave').addEventListener('click', () => {
    const a = parseInt(jml.value.replace(/\D/g, ''), 10) || 0, d = tgl.value, n = ct.value.trim();
    const bad = { fJml: !(a > 0), fTgl: !d, fCat: !n };
    Object.keys(bad).forEach(i => $(i).classList.toggle('err', bad[i]));
    if (bad.fJml || bad.fTgl || bad.fCat) { toast('Jumlah, tanggal, dan catatan wajib diisi'); (bad.fJml ? jml : bad.fTgl ? tgl : ct).focus(); return; }
    if (edit) { /* mode ubah: jumlah, tanggal, catatan diperbarui; kategori & waktu catat tetap */
      const arr = baca(), x = arr.find(y => y.id === edit);
      if (!x) { ov.hidden = true; edit = null; toast('Transaksi tidak ditemukan'); return; }
      const baru = Object.assign({}, x, { a, d, n });
      if (!saldoAman(arr, x, baru)) return;
      if (!tulis(arr.map(y => y === x ? baru : y))) return;
      hitung(); ov.hidden = true; edit = null; toast('Perubahan tersimpan ✓'); return;
    }
    if (tipe === 'keluar' && window.saldoKini() <= 0) { toast('Saldo Rp 0, pengeluaran tidak bisa dicatat'); return; }
    if (tipe === 'abel' && window.angSisa && a > window.angSisa(kat.b)) { toast('Saldo anggaran tidak cukup (' + rp(window.angSisa(kat.b)) + ')'); return; }
    const arr = baca(), tr = { id: 't' + Date.now().toString(36), t: tipe, c: kat.id, cn: kat.n, ce: kat.e, a, d, n, ts: Date.now() };
    if (kat.b) tr.b = kat.b; /* transaksi dari anggaran: kategori otomatis = nama anggaran */
    arr.push(tr);
    try { localStorage.setItem('transaksi', JSON.stringify(arr)); } catch (e) { toast('Penyimpanan penuh, transaksi tidak tersimpan'); return; }
    hitung(); ov.hidden = true; $('kat').hidden = true;
    toast((tipe === 'masuk' ? 'Pemasukan' : 'Pengeluaran') + ' tersimpan ✓');
  });

  /* ---- ubah / hapus transaksi (dibuka dari riwayat) ---- */
  const rp = n => (n < 0 ? '-' : '') + 'Rp ' + new Intl.NumberFormat('id-ID').format(Math.abs(n));
  const saldoDari = arr => arr.reduce((s, x) => s + (x.t === 'masuk' ? x.a : (x.t === 'keluar' || x.t === 'alok') ? -x.a : 0), 0); /* alok = uang dipindah ke anggaran */
  const sisaB = (arr, id) => arr.reduce((s, x) => x.b !== id ? s : x.t === 'alok' ? s + x.a : x.t === 'abel' ? s - x.a : s, 0);
  const LBL = { keluar: 'Pengeluaran', masuk: 'Pemasukan', abel: 'Pengeluaran anggaran', alok: 'Tambah anggaran' };
  function saldoAman(arr, lama, baru) { /* baru = null berarti dihapus; tolak bila saldo jadi minus karena perubahan ini */
    const sebelum = saldoDari(arr), sesudah = saldoDari(arr.filter(x => x !== lama).concat(baru ? [baru] : []));
    if (sesudah < 0 && sesudah < sebelum) { toast('Saldo akan jadi minus (' + rp(sesudah) + ').\nPerubahan ditolak.'); return false; }
    const arr2 = arr.filter(x => x !== lama).concat(baru ? [baru] : []), ids = window.angIds ? window.angIds() : [];
    for (const g of ids) { const s1 = sisaB(arr, g.id), s2 = sisaB(arr2, g.id); if (s2 < 0 && s2 < s1) { toast('Saldo anggaran \"' + (g.n || 'Anggaran') + '\" akan jadi minus (' + rp(s2) + ').\nPerubahan ditolak.'); return false; } }
    return true;
  }
  function tulis(arr) { try { localStorage.setItem('transaksi', JSON.stringify(arr)); return true; } catch (e) { toast('Penyimpanan penuh, perubahan tidak tersimpan'); return false; } }
  function sesuaikanCt() { ct.style.height = 'auto'; ct.style.height = Math.min(ct.scrollHeight + 2, Math.round(innerHeight * .4)) + 'px'; }
  ct.addEventListener('input', () => { if (edit) sesuaikanCt(); });
  window.editTrx = function (id) {
    const x = baca().find(y => y.id === id); if (!x) return;
    if (x.t === 'alok' && x.a < 0) { toast('Pengembalian sisa anggaran otomatis tidak bisa diubah'); return; }
    tipe = x.t; kat = { id: x.c, n: x.cn, e: x.ce, b: x.b }; edit = x.id; ov.className = x.t === 'masuk' ? 'masuk' : 'keluar';
    $('trxTitle').textContent = 'Ubah ' + (LBL[x.t] || 'transaksi').toLowerCase();
    $('trxEmo').textContent = x.ce; $('trxCat').textContent = x.cn;
    $('trxSave').textContent = 'Simpan perubahan'; $('trxDel').hidden = false;
    jml.value = new Intl.NumberFormat('id-ID').format(x.a); tgl.value = x.d; ct.value = x.n;
    ['fJml', 'fTgl', 'fCat'].forEach(i => $(i).classList.remove('err'));
    $('trxBody').scrollTop = 0; ov.hidden = false; sesuaikanCt();
  };
  $('trxDel').addEventListener('click', async () => {
    if (!edit) return;
    const arr = baca(), x = arr.find(y => y.id === edit); if (!x) return;
    const ok = await konfirmasi('Hapus transaksi?', (LBL[x.t] || 'Transaksi') + ' ' + rp(x.a) + ' · ' + x.cn + ' · ' + tglPendek(x.d) + ' akan dihapus permanen.', 'Hapus');
    if (ok !== true) return;
    if (!saldoAman(arr, x, null)) return;
    if (!tulis(arr.filter(y => y !== x))) return;
    hitung(); ov.hidden = true; edit = null; toast('Transaksi dihapus ✓');
  });

  /* ---- RIWAYAT TRANSAKSI: bulan ini (atau hasil pencarian di semua bulan), catatan tampil penuh ---- */
  const BLN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  const BLS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  const HRI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const p2 = n => String(n).padStart(2, '0');
  const parseD = d => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(d || ''); return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null; };
  function tglPendek(d) { const o = parseD(d); return o ? o.getDate() + ' ' + BLS[o.getMonth()] + ' ' + o.getFullYear() : (d || '-'); }
  function tglPanjang(d) { const o = parseD(d); return o ? HRI[o.getDay()] + ', ' + o.getDate() + ' ' + BLS[o.getMonth()] + ' ' + o.getFullYear() : (d || '-'); }
  const jam = ts => { if (!ts) return '--:--'; const o = new Date(ts); return p2(o.getHours()) + ':' + p2(o.getMinutes()); };
  function tumpukan(x) { /* semua teks yang bisa dicari: catatan, kategori, tanggal (beberapa format), jam */
    const s = [x.n || '', x.cn || ''], o = parseD(x.d);
    if (o) {
      const dd = o.getDate(), mm = o.getMonth(), yy = o.getFullYear();
      s.push(x.d, p2(dd) + '/' + p2(mm + 1) + '/' + yy, dd + '/' + (mm + 1) + '/' + yy, p2(dd) + '-' + p2(mm + 1) + '-' + yy,
        dd + ' ' + BLN[mm] + ' ' + yy, dd + ' ' + BLS[mm] + ' ' + yy, HRI[o.getDay()], BLN[mm], BLS[mm]);
    }
    const j = jam(x.ts); s.push(j, j.replace(':', '.')); if (x.b) s.push('anggaran');
    return s.join(' | ').toLowerCase();
  }
  const rwList = $('rwList'), rwQ = $('rwQ'), rwHead = $('rwHead'), rwClr = $('rwClr'), rwMore = $('rwMore'), RW_MAX = 5; /* di luar tampil 5 transaksi; sisanya lewat "Lihat transaksi lainnya" */
  function buatBaris(x) {
    const plus = x.t === 'masuk' || (x.t === 'alok' && x.a < 0);
    const r = document.createElement('div'); r.className = 'rw ' + (plus ? 'masuk' : 'keluar'); r.dataset.id = x.id;
    r.setAttribute('role', 'button'); r.tabIndex = 0;
    const e = document.createElement('i'); e.className = 'rw-e'; e.textContent = x.ce || '✨';
    const m = document.createElement('div'); m.className = 'rw-m';
    const h = document.createElement('div'); h.className = 'rw-h';
    const c = document.createElement('b'); c.className = 'rw-c'; c.textContent = (x.t === 'alok' ? (x.a < 0 ? 'Kembali dari ' : 'Ke anggaran · ') : '') + (x.cn || 'Tanpa kategori');
    const a = document.createElement('b'); a.className = 'rw-a'; a.textContent = (plus ? '+' : '-') + rp(Math.abs(x.a));
    h.append(c, a);
    const t = document.createElement('div'); t.className = 'rw-t'; t.textContent = tglPanjang(x.d) + ' · ' + jam(x.ts);
    const n = document.createElement('p'); n.className = 'rw-n'; n.textContent = x.n || '';
    m.append(h, t, n); r.append(e, m); return r;
  }
  function renderRw() {
    if (!rwList) return;
    const q = rwQ.value.trim().toLowerCase(), now = new Date(), ym = now.getFullYear() + '-' + p2(now.getMonth() + 1);
    let arr = baca().sort((a, b) => (b.d || '').localeCompare(a.d || '') || (b.ts || 0) - (a.ts || 0)), judul;
    if (q) { const tok = q.split(/\s+/); arr = arr.filter(x => { const t = tumpukan(x); return tok.every(k => t.includes(k)); }); judul = 'Hasil pencarian'; }
    else { arr = arr.filter(x => (x.d || '').slice(0, 7) === ym); judul = 'Bulan ini · ' + BLN[now.getMonth()] + ' ' + now.getFullYear(); }
    rwHead.textContent = judul + ' · ' + arr.length + ' transaksi';
    rwClr.hidden = !q; rwList.textContent = '';
    rwMore.hidden = baca().length <= Math.min(arr.length, RW_MAX);
    if (!arr.length) {
      const k = document.createElement('div'); k.className = 'rw-empty';
      k.textContent = q ? 'Tidak ada transaksi yang cocok.' : 'Belum ada transaksi bulan ini.'; rwList.append(k); return;
    }
    const f = document.createDocumentFragment(); arr.slice(0, RW_MAX).forEach(x => f.append(buatBaris(x)));
    rwList.append(f);
  }
  let rwId = null, rwN = 0, rwT = null;
  rwList.addEventListener('click', e => {
    const r = e.target.closest('.rw'); if (!r) return;
    if (r.dataset.id !== rwId) { rwId = r.dataset.id; rwN = 0; }
    rwN++; clearTimeout(rwT);
    if (rwN >= 3) { rwN = 0; rwId = null; window.editTrx(r.dataset.id); }
    else rwT = setTimeout(() => { rwN = 0; rwId = null; }, 500);
  });
  rwList.addEventListener('keydown', e => { const r = e.target.closest('.rw'); if (r && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); window.editTrx(r.dataset.id); } });
  rwQ.addEventListener('input', renderRw);
  rwQ.addEventListener('keydown', e => { if (e.key === 'Enter') rwQ.blur(); });
  rwClr.addEventListener('click', () => { rwQ.value = ''; renderRw(); rwQ.focus(); });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) renderRw(); });
  /* ---- halaman riwayat transaksi lengkap: panah kembali (kiri), filter kategori (kanan), pencarian di kepala halaman ---- */
  const pg = $('rwPage'), pList = $('rwpList'), pQ = $('rwpQ'), pClr = $('rwpClr'), pHead = $('rwpHead'), pDot = $('rwpDot'), pChip = $('rwpChip'), fov = $('rwFilter'), fList = $('rwfList');
  let fKat = null, ksCache = []; /* fKat: null = semua kategori */
  const katKey = x => x.cn || 'Tanpa kategori';
  function semuaKat(arr) {
    const m = new Map();
    arr.forEach(x => { const k = katKey(x), o = m.get(k) || { n: k, e: x.ce || '🏷️', c: 0 }; o.c++; m.set(k, o); });
    return [...m.values()].sort((a, b) => b.c - a.c || a.n.localeCompare(b.n));
  }
  function renderPg() {
    if (pg.hidden) return;
    const q = pQ.value.trim().toLowerCase();
    let arr = baca().sort((a, b) => (b.d || '').localeCompare(a.d || '') || (b.ts || 0) - (a.ts || 0));
    if (fKat !== null && !arr.some(x => katKey(x) === fKat)) fKat = null;
    if (fKat !== null) arr = arr.filter(x => katKey(x) === fKat);
    if (q) { const tok = q.split(/\s+/); arr = arr.filter(x => { const t = tumpukan(x); return tok.every(k => t.includes(k)); }); }
    pClr.hidden = !q; pDot.hidden = fKat === null; pChip.hidden = fKat === null;
    if (fKat !== null) { const k = ksCache.find(o => o.n === fKat) || semuaKat(baca()).find(o => o.n === fKat); $('rwpChipT').textContent = (k ? k.e + ' ' : '') + fKat; }
    pHead.textContent = (q ? 'Hasil pencarian' : fKat !== null ? 'Kategori ' + fKat : 'Semua transaksi') + ' · ' + arr.length + ' transaksi';
    pList.textContent = '';
    if (!arr.length) { const k = document.createElement('div'); k.className = 'rw-empty'; k.textContent = (q || fKat !== null) ? 'Tidak ada transaksi yang cocok.' : 'Belum ada transaksi.'; pList.append(k); return; }
    const f = document.createDocumentFragment(); let bulan = null;
    arr.forEach(x => {
      const ym = (x.d || '').slice(0, 7);
      if (ym !== bulan) { bulan = ym; const h = document.createElement('div'); h.className = 'rw-head'; const mm = +ym.slice(5, 7); h.textContent = mm >= 1 && mm <= 12 ? BLN[mm - 1] + ' ' + ym.slice(0, 4) : 'Tanpa tanggal'; f.append(h); }
      f.append(buatBaris(x));
    });
    pList.append(f);
  }
  function bukaRiwayat() { pQ.value = rwQ.value; fKat = null; pg.hidden = false; $('rwpBody').scrollTop = 0; renderPg(); }
  function tutupRiwayat() { fov.hidden = true; pg.hidden = true; }
  rwMore.addEventListener('click', bukaRiwayat);
  $('rwpBack').addEventListener('click', tutupRiwayat);
  pQ.addEventListener('input', renderPg);
  pQ.addEventListener('keydown', e => { if (e.key === 'Enter') pQ.blur(); });
  pClr.addEventListener('click', () => { pQ.value = ''; renderPg(); pQ.focus(); });
  $('rwpChipX').addEventListener('click', () => { fKat = null; renderPg(); });
  $('rwpFilter').addEventListener('click', () => {
    const arr = baca(); ksCache = semuaKat(arr); fList.textContent = '';
    const item = (i, e, n, c) => {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'rwf-item' + ((i < 0 ? fKat === null : fKat === n) ? ' on' : ''); b.dataset.i = i;
      const a = document.createElement('i'); a.textContent = e; const t = document.createElement('span'); t.textContent = n; const k = document.createElement('small'); k.textContent = c; const ck = document.createElement('em'); ck.textContent = '✓';
      b.append(a, t, k, ck); fList.append(b);
    };
    item(-1, '🗂️', 'Semua kategori', arr.length); ksCache.forEach((o, i) => item(i, o.e, o.n, o.c));
    fov.hidden = false;
  });
  fList.addEventListener('click', e => { const b = e.target.closest('.rwf-item'); if (!b) return; const i = +b.dataset.i; fKat = i < 0 ? null : ksCache[i].n; fov.hidden = true; renderPg(); });
  fov.addEventListener('click', e => { if (e.target === fov) fov.hidden = true; });
  let pId = null, pN = 0, pT = null;
  pList.addEventListener('click', e => {
    const r = e.target.closest('.rw'); if (!r) return;
    if (r.dataset.id !== pId) { pId = r.dataset.id; pN = 0; }
    pN++; clearTimeout(pT);
    if (pN >= 3) { pN = 0; pId = null; window.editTrx(r.dataset.id); }
    else pT = setTimeout(() => { pN = 0; pId = null; }, 500);
  });
  pList.addEventListener('keydown', e => { const r = e.target.closest('.rw'); if (r && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); window.editTrx(r.dataset.id); } });
  document.addEventListener('keydown', e => { if (e.key !== 'Escape') return; if (!fov.hidden) fov.hidden = true; else if (!pg.hidden && $('trx').hidden) tutupRiwayat(); });
  window.hitungKeu = hitung;
  hitung();
})();


/* ===== ANGGARAN (halaman Energy, di bawah tombol +): 5 kotak siap tulis + kotak ke-6 untuk menambah kotak baru.
   Ketuk 1x kotak = halaman anggaran. Ketuk 3x = ubah ikon & judul, ketuk 1x di luar = kunci.
   Halaman anggaran: ikon, judul, deskripsi (ketuk 3x = edit), kartu sisa anggaran, tombol Tambah anggaran (diambil dari saldo utama)
   dan Pakai anggaran (mencatat pengeluaran; di riwayat tampil dengan kategori = nama anggaran). Data: 'anggaran'; transaksi bertipe 'alok' & 'abel' di 'transaksi' ===== */
(function () {
  const KEY = 'anggaran', grid = $('angGrid'), panel = $('angPanel'), page = $('ang'), nama = $('angNama'), emIn = $('angEmoIn'), emBox = $('angEmo');
  const dw = $('angDw'), desc = $('angDesc'), amt = $('angAmt'), jml = $('angJml'), cat = $('angCt');
  const EMO = ['💰', '🍜', '🛒', '🏠', '🚌', '⛽', '📱', '💡', '🎮', '🎬', '✈️', '💊', '📚', '👶', '🐾', '🎁', '👕', '💇', '🔧', '🎉', '💳', '🏦', '📈', '✨'];
  const uid = () => 'a' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
  const fmt = n => new Intl.NumberFormat('id-ID').format(Math.round(n || 0));
  const rp = n => (n < 0 ? '-' : '') + 'Rp ' + fmt(Math.abs(n));
  const baru = () => ({ id: uid(), n: '', e: '💰', d: '' });
  const hari = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  const bacaT = () => { try { const a = JSON.parse(load('transaksi') || '[]'); return Array.isArray(a) ? a : []; } catch (e) { return []; } };
  const tulisT = a => { try { localStorage.setItem('transaksi', JSON.stringify(a)); return true; } catch (e) { toast('Penyimpanan penuh, perubahan tidak tersimpan'); return false; } };
  const sisaB = id => bacaT().reduce((s, x) => x.b !== id ? s : x.t === 'alok' ? s + x.a : x.t === 'abel' ? s - x.a : s, 0);
  const sisaDari = (arr, id) => arr.reduce((s, x) => x.b !== id ? s : x.t === 'alok' ? s + x.a : x.t === 'abel' ? s - x.a : s, 0);
  const teksSaldo = (b, arr) => !b.n.trim() ? '' : (load('saldo_tutup') === '1' ? 'Rp ••••' : rp(sisaDari(arr, b.id)));
  function perbaruiSaldo() { const arr = bacaT(); grid.querySelectorAll('.ang-box:not(.ang-add)').forEach(el => { const b = list[+el.dataset.n], s = el.querySelector('.ang-sd'); if (b && s) s.textContent = teksSaldo(b, arr); }); }
  let list = [], aktif = -1, cur = null, taps = 0, tapT = null, tapN = -1, dEdit = false, dTaps = 0, dT = null;
  const raw = load(KEY);
  try { const a = JSON.parse(raw || 'null'); if (Array.isArray(a)) list = a.filter(b => b && b.id && typeof b.n === 'string').map(b => ({ id: b.id, n: b.n, e: b.e || '💰', d: b.d || '' })); } catch (e) {}
  const simpan = () => save(KEY, JSON.stringify(list));
  if (raw === null) { for (let i = 0; i < 5; i++) list.push(baru()); simpan(); }
  window.angSisa = sisaB; window.angIds = () => list.map(b => ({ id: b.id, n: b.n }));

  /* ---- kotak ---- */
  function render() {
    grid.textContent = ''; const arr = bacaT();
    list.forEach((b, i) => {
      const el = document.createElement('div'); el.className = 'pk-box ang-box' + (i === aktif ? ' editing' : ''); el.dataset.n = i; el.setAttribute('role', 'button'); el.tabIndex = 0;
      const ic = document.createElement('i'); ic.textContent = b.e;
      const t = document.createElement('span'); t.textContent = b.n.trim() || 'Tulis anggaran'; if (!b.n.trim()) t.className = 'kosong';
      const sd = document.createElement('small'); sd.className = 'ang-sd'; sd.textContent = teksSaldo(b, arr);
      el.append(ic, t, sd); grid.appendChild(el);
    });
    const p = document.createElement('div'); p.className = 'pk-box ang-box ang-add'; p.dataset.add = '1'; p.setAttribute('role', 'button'); p.tabIndex = 0; p.setAttribute('aria-label', 'Tambah kotak anggaran');
    p.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg><span>Tambah</span>'; grid.appendChild(p);
  }
  function tampil(i) { /* perbarui satu kotak tanpa membangun ulang (supaya papan ketik tidak tertutup) */
    const el = grid.children[i], b = list[i]; if (!el || !b) return;
    el.querySelector('i').textContent = b.e;
    const t = el.querySelector('span'); t.textContent = b.n.trim() || 'Tulis anggaran'; t.className = b.n.trim() ? '' : 'kosong';
    el.querySelector('.ang-sd').textContent = teksSaldo(b, bacaT());
  }
  function sinkron(b) { /* nama/ikon anggaran berubah -> kategori di riwayat ikut berubah */
    const a = bacaT(), nm = b.n.trim() || 'Anggaran'; let ch = false;
    a.forEach(x => { if (x.b === b.id && (x.cn !== nm || x.ce !== b.e)) { x.cn = nm; x.ce = b.e; ch = true; } });
    if (ch && tulisT(a) && window.hitungKeu) window.hitungKeu();
  }
  function setEmo(e) { const b = list[aktif]; if (!b) return; b.e = e; simpan(); tampil(aktif); emBox.querySelectorAll('button').forEach(x => x.classList.toggle('on', x.dataset.e === e)); }
  EMO.forEach(e => { const b = document.createElement('button'); b.type = 'button'; b.textContent = e; b.dataset.e = e; emBox.appendChild(b); });
  emBox.addEventListener('click', ev => { const b = ev.target.closest('button'); if (b) { setEmo(b.dataset.e); emIn.value = ''; } });
  emIn.addEventListener('input', () => {
    const v = emIn.value.trim(); if (!v) return;
    const seg = window.Intl && Intl.Segmenter ? [...new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(v)].map(x => x.segment) : [...v];
    setEmo(seg[0]);
  });
  nama.addEventListener('input', () => { const b = list[aktif]; if (!b) return; b.n = nama.value; simpan(); tampil(aktif); });
  nama.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); kunci(); } });

  function mulai(n) {
    if (aktif >= 0 && aktif !== n) sinkron(list[aktif]);
    aktif = n; const b = list[n];
    $('angPJudul').textContent = 'Ubah kotak ' + (n + 1); nama.value = b.n; emIn.value = '';
    emBox.querySelectorAll('button').forEach(x => x.classList.toggle('on', x.dataset.e === b.e));
    panel.hidden = false; grid.querySelectorAll('.ang-box').forEach((el, i) => el.classList.toggle('editing', i === n));
  }
  function kunci() {
    if (aktif < 0) return;
    const b = list[aktif]; if (b) { b.n = b.n.trim(); simpan(); sinkron(b); }
    aktif = -1; panel.hidden = true; render();
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
  }
  grid.addEventListener('click', e => {
    const el = e.target.closest ? e.target.closest('.ang-box') : null; if (!el) return;
    if (el.dataset.add) { list.push(baru()); simpan(); render(); toast('Kotak anggaran ditambahkan ✓'); return; }
    const n = +el.dataset.n;
    if (aktif >= 0) { if (n !== aktif) mulai(n); return; }
    if (tapN !== n) taps = 0;
    tapN = n; taps++; clearTimeout(tapT);
    if (taps >= 3) { taps = 0; mulai(n); return; }
    tapT = setTimeout(() => { if (taps === 1) buka(n); taps = 0; }, 380);
  });
  document.addEventListener('click', e => {
    const p = e.composedPath ? e.composedPath() : [];
    if (aktif >= 0 && !p.includes(grid) && !p.includes(panel) && !p.includes($('cfm'))) kunci();
    if (dEdit && !p.includes(dw)) descKunci();
  });
  $('angDel').addEventListener('click', async () => {
    const b = list[aktif]; if (!b) return; const sisa = sisaB(b.id);
    const ok = await konfirmasi('Hapus anggaran?', 'Kotak "' + (b.n.trim() || 'tanpa nama') + '" akan dihapus.' + (sisa > 0 ? ' Sisa saldo ' + rp(sisa) + ' dikembalikan ke saldo utama.' : ''), 'Hapus');
    if (ok !== true) return;
    if (sisa > 0) { const a = bacaT(); a.push({ id: 't' + Date.now().toString(36), t: 'alok', c: 'b_' + b.id, b: b.id, cn: b.n.trim() || 'Anggaran', ce: b.e, a: -sisa, d: hari(), n: 'Sisa anggaran dikembalikan ke saldo utama', ts: Date.now() }); if (!tulisT(a)) return; }
    list.splice(aktif, 1); simpan(); aktif = -1; panel.hidden = true; render();
    if (window.hitungKeu) window.hitungKeu(); toast('Kotak anggaran dihapus ✓');
  });

  /* ---- halaman anggaran ---- */
  function isi() {
    const b = list.find(x => x.id === cur); if (!b) { page.hidden = true; return; }
    $('angIc').textContent = b.e; $('angNm').textContent = b.n.trim();
    if (!dEdit) { desc.value = b.d || ''; descUkur(); }
    let tam = 0, pak = 0; bacaT().forEach(x => { if (x.b !== b.id) return; if (x.t === 'alok') tam += x.a; else if (x.t === 'abel') pak += x.a; });
    $('angVal').textContent = fmt(tam - pak); $('angIn').textContent = rp(tam); $('angOut').textContent = rp(pak);
  }
  function buka(n) {
    const b = list[n]; if (!b.n.trim()) { toast('Beri nama dulu: ketuk 3x kotak untuk menulis anggaran'); return; }
    cur = b.id; page.hidden = false; $('angBody').scrollTop = 0; isi();
  }
  function tutup() { descKunci(); amt.hidden = true; page.hidden = true; cur = null; }
  $('angClose').addEventListener('click', tutup);
  document.addEventListener('keydown', e => { if (e.key !== 'Escape') return; if (!amt.hidden) amt.hidden = true; else if (!page.hidden && $('trx').hidden) tutup(); });
  document.addEventListener('keu-berubah', () => { perbaruiSaldo(); if (!page.hidden) isi(); });
  $('sdEye').addEventListener('click', () => setTimeout(perbaruiSaldo, 0));

  /* deskripsi: ketuk 3x = edit, ketuk 1x di luar = kunci */
  function descUkur() { desc.style.height = 'auto'; desc.style.height = Math.max(desc.scrollHeight, 22) + 'px'; }
  desc.addEventListener('input', descUkur);
  dw.addEventListener('click', () => {
    if (dEdit) return; dTaps++; clearTimeout(dT);
    if (dTaps >= 3) { dTaps = 0; dEdit = true; $('angHero').classList.add('editing'); desc.readOnly = false; desc.focus(); }
    else dT = setTimeout(() => { dTaps = 0; }, 500);
  });
  function descKunci() {
    if (!dEdit) return; dEdit = false; $('angHero').classList.remove('editing'); desc.readOnly = true; desc.blur();
    const b = list.find(x => x.id === cur); if (b) { b.d = desc.value.trim(); simpan(); }
    isi();
  }

  /* tambah anggaran: diambil dari saldo utama */
  $('angAdd').addEventListener('click', () => {
    const s = window.saldoKini ? window.saldoKini() : 0;
    if (s <= 0) { toast('Saldo utama Rp 0 · catat pemasukan dulu'); return; }
    $('angAmtInfo').textContent = 'Saldo utama: ' + rp(s); jml.value = ''; cat.value = ''; amt.hidden = false; setTimeout(() => jml.focus(), 80);
  });
  jml.addEventListener('input', () => { const d = jml.value.replace(/\D/g, '').slice(0, 13).replace(/^0+(?=\d)/, ''); jml.value = d ? fmt(+d) : ''; });
  jml.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); $('angAmtSave').click(); } });
  $('angAmtCancel').addEventListener('click', () => { amt.hidden = true; });
  amt.addEventListener('click', e => { if (e.target === amt) amt.hidden = true; });
  $('angAmtSave').addEventListener('click', () => {
    const b = list.find(x => x.id === cur); if (!b) return;
    const a = parseInt(jml.value.replace(/\D/g, ''), 10) || 0, s = window.saldoKini();
    if (!(a > 0)) { toast('Jumlah wajib diisi'); jml.focus(); return; }
    if (a > s) { toast('Saldo utama tidak cukup (' + rp(s) + ')'); jml.focus(); return; }
    const arr = bacaT(); arr.push({ id: 't' + Date.now().toString(36), t: 'alok', c: 'b_' + b.id, b: b.id, cn: b.n.trim() || 'Anggaran', ce: b.e, a, d: hari(), n: cat.value.trim() || 'Tambah anggaran dari saldo utama', ts: Date.now() });
    if (!tulisT(arr)) return;
    amt.hidden = true; if (window.hitungKeu) window.hitungKeu(); toast('Anggaran ditambahkan ✓');
  });

  /* pakai anggaran: catat pengeluaran dari saldo anggaran (kategori riwayat = nama anggaran) */
  $('angUse').addEventListener('click', () => {
    const b = list.find(x => x.id === cur); if (!b) return;
    if (sisaB(b.id) <= 0) { toast('Saldo anggaran Rp 0 · tambah anggaran dulu'); return; }
    window.bukaTrx('abel', { id: 'b_' + b.id, n: b.n.trim() || 'Anggaran', e: b.e, b: b.id });
  });

  render();
})();

/* ===== GRAFIK ARUS KEUANGAN (Energy > Grafik): periode harian/mingguan/bulanan/tahunan (tahunan bisa pilih bulan),
   donat per kategori + legenda titik warna, bar kategori. Warna nilai di ujung bar bergeser hijau -> merah sesuai porsinya.
   Pengeluaran = transaksi 'keluar' + 'abel' (pakai anggaran). 'alok' (pindah saldo ke anggaran) tidak dihitung. ===== */
(function () {
  const root = $('eGrafik'); if (!root) return;
  const HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const BLNP = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  const BLNS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  const PAL = ['#4fd1c5', '#8b97ff', '#ff9a62', '#f7d154', '#ff6b81', '#6fb4f0', '#b58cff', '#7ddc8a', '#ff8fc8', '#5ad1e8', '#c4a574', '#9aa8ff'];
  const fmt = n => new Intl.NumberFormat('id-ID').format(Math.round(n || 0));
  const rp = n => (n < 0 ? '-' : '') + 'Rp ' + fmt(Math.abs(n));
  const p2 = n => String(n).padStart(2, '0');
  const ymd = d => d.getFullYear() + '-' + p2(d.getMonth() + 1) + '-' + p2(d.getDate());
  const bacaT = () => { try { const a = JSON.parse(load('transaksi') || '[]'); return Array.isArray(a) ? a : []; } catch (e) { return []; } };
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const sev = t => 'hsl(' + Math.round(135 * (1 - clamp(t, 0, 1))) + ' 85% 60%)'; /* 0 = hijau ... 1 = merah, melewati kuning & oranye */
  let mode = 'bulan', tipe = 'keluar', ref = new Date(), bulan = new Set([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
  ref.setHours(12, 0, 0, 0);
  const mBox = $('gfMonths'), svg = $('gfSvg');

  function rentang() {
    const y = ref.getFullYear(), m = ref.getMonth(), d = ref.getDate();
    if (mode === 'hari') { const k = ymd(ref); return { a: k, b: k, lbl: HARI[ref.getDay()] + ', ' + d + ' ' + BLNS[m] + ' ' + y }; }
    if (mode === 'minggu') {
      const dow = (ref.getDay() + 6) % 7, s = new Date(y, m, d - dow, 12), e = new Date(y, m, d - dow + 6, 12);
      const l = s.getMonth() === e.getMonth() ? s.getDate() + ' – ' + e.getDate() + ' ' + BLNS[e.getMonth()] + ' ' + e.getFullYear()
        : s.getDate() + ' ' + BLNS[s.getMonth()] + (s.getFullYear() !== e.getFullYear() ? ' ' + s.getFullYear() : '') + ' – ' + e.getDate() + ' ' + BLNS[e.getMonth()] + ' ' + e.getFullYear();
      return { a: ymd(s), b: ymd(e), lbl: l };
    }
    if (mode === 'bulan') return { a: y + '-' + p2(m + 1) + '-01', b: y + '-' + p2(m + 1) + '-31', lbl: BLNP[m] + ' ' + y };
    return { a: y + '-01-01', b: y + '-12-31', lbl: String(y) };
  }
  function geser(dir) {
    const y = ref.getFullYear(), m = ref.getMonth(), d = ref.getDate();
    if (mode === 'hari') ref = new Date(y, m, d + dir, 12);
    else if (mode === 'minggu') ref = new Date(y, m, d + 7 * dir, 12);
    else if (mode === 'bulan') ref = new Date(y, m + dir, 1, 12);
    else ref = new Date(y + dir, m, 1, 12);
    render();
  }
  function seg(el, i, tot, c, len, off) {
    const C = 2 * Math.PI * 80, l = Math.max(0, len * C - (tot > 1 ? 2 : 0));
    const k = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    k.setAttribute('cx', 100); k.setAttribute('cy', 100); k.setAttribute('r', 80); k.setAttribute('fill', 'none'); k.setAttribute('stroke', c); k.setAttribute('stroke-width', 26);
    k.setAttribute('stroke-dasharray', l + ' ' + (C - l)); k.setAttribute('stroke-dashoffset', -off * C); k.setAttribute('transform', 'rotate(-90 100 100)');
    el.appendChild(k);
  }
  function render() {
    const r = rentang(), now = ymd(new Date());
    renderBatang(r);
    $('gfMode').querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.m === mode));
    $('gfType').querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.t === tipe));
    $('gfType').dataset.t = tipe; $('gfLblT').textContent = r.lbl; $('gfNext').disabled = false;
    /* chip bulan (tahunan) */
    mBox.hidden = mode !== 'tahun';
    if (mode === 'tahun') {
      mBox.textContent = '';
      const mk = (t, on, fn) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'gf-chip' + (on ? ' on' : ''); b.textContent = t; b.addEventListener('click', fn); mBox.appendChild(b); };
      mk('Semua', bulan.size === 12, () => { bulan = new Set([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]); render(); });
      BLNS.forEach((n, i) => mk(n, bulan.has(i), () => { if (bulan.has(i)) { if (bulan.size > 1) bulan.delete(i); } else bulan.add(i); render(); }));
    }
    /* data */
    let masuk = 0, keluar = 0; const kat = new Map();
    bacaT().forEach(x => {
      if (!x.d || x.d < r.a || x.d > r.b) return;
      if (mode === 'tahun' && !bulan.has(+x.d.slice(5, 7) - 1)) return;
      const isM = x.t === 'masuk', isK = x.t === 'keluar' || x.t === 'abel';
      if (isM) masuk += x.a; else if (isK) keluar += x.a; else return;
      if ((tipe === 'masuk') !== isM) return;
      const n = x.cn || 'Tanpa kategori', o = kat.get(n) || { n, e: x.ce || '🏷️', v: 0 }; o.v += x.a; kat.set(n, o);
    });
    $('gfIn').textContent = rp(masuk); $('gfOut').textContent = rp(keluar);
    const net = masuk - keluar, nEl = $('gfNet'); nEl.textContent = (net > 0 ? '+' : '') + rp(net); nEl.style.color = net > 0 ? '#4fe3a0' : net < 0 ? '#ff6b81' : '';
    const total = tipe === 'masuk' ? masuk : keluar, cats = [...kat.values()].sort((a, b) => b.v - a.v);
    cats.forEach((c, i) => { c.c = PAL[i % PAL.length]; c.s = total ? c.v / total : 0; });
    /* donat */
    svg.textContent = '';
    const track = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    track.setAttribute('cx', 100); track.setAttribute('cy', 100); track.setAttribute('r', 80); track.setAttribute('fill', 'none'); track.setAttribute('stroke', 'rgba(255,255,255,.07)'); track.setAttribute('stroke-width', 26); svg.appendChild(track);
    let off = 0; cats.forEach((c, i) => { seg(svg, i, cats.length, c.c, c.s, off); off += c.s; });
    $('gfCLbl').textContent = tipe === 'masuk' ? 'Pemasukan' : 'Pengeluaran';
    const cv = $('gfCVal'), tx = rp(total); cv.textContent = tx; cv.style.fontSize = tx.length <= 9 ? '1.45rem' : tx.length <= 12 ? '1.15rem' : '.95rem';
    /* legenda + bar */
    const lg = $('gfLegend'), br = $('gfBars'); lg.textContent = ''; br.textContent = '';
    if (!cats.length) { const e = document.createElement('div'); e.className = 'gf-empty'; e.textContent = 'Belum ada ' + (tipe === 'masuk' ? 'pemasukan' : 'pengeluaran') + ' di periode ini.'; br.appendChild(e); return; }
    const max = cats[0].v;
    cats.forEach(c => {
      const d = document.createElement('span'); d.className = 'gf-dot'; const i = document.createElement('i'); i.style.background = c.c; d.append(i, document.createTextNode(c.n)); lg.appendChild(d);
      const row = document.createElement('div'); row.className = 'gf-row';
      const top = document.createElement('div'); top.className = 'gf-rt';
      const nm = document.createElement('span'); nm.textContent = c.e + '  ' + c.n; const pc = document.createElement('small'); pc.textContent = (c.s * 100 < 1 ? '<1' : Math.round(c.s * 100)) + '%'; top.append(nm, pc);
      const line = document.createElement('div'); line.className = 'gf-rb';
      const fill = document.createElement('div'); fill.className = 'gf-fill'; fill.style.width = Math.max(3, c.v / max * 68) + '%'; fill.style.background = 'linear-gradient(90deg,' + c.c + '99,' + c.c + ')';
      const val = document.createElement('b'); val.textContent = rp(c.v);
      const t = clamp(c.s / 0.5, 0, 1); val.style.color = sev(tipe === 'masuk' ? 1 - t : t); /* pengeluaran: sedikit hijau, banyak merah · pemasukan: kebalikannya */
      line.append(fill, val); row.append(top, line); br.appendChild(row);
    });
  }
  /* ---- GRAFIK BATANG: tiap kelompok = 1 hari (atau 1 bulan pada Tahunan), batang hijau = pemasukan, merah = pengeluaran.
     Harian = 7 hari sampai tanggal terpilih · Mingguan = 7 hari dalam minggu terpilih · Bulanan = tiap tanggal · Tahunan = 12 bulan.
     Tinggi batang dibaca lewat sumbu nilai di kiri, nilai persisnya muncul di kartu atas saat batang diketuk ---- */
  const HARIP = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'], HARIS = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
  let gbSel = null, gbGs = [], gbPusat = true;
  const singkat = n => { const f = (v, s) => (Math.round(v * 10) / 10).toString().replace('.', ',') + s; return n >= 1e9 ? f(n / 1e9, ' M') : n >= 1e6 ? f(n / 1e6, ' jt') : n >= 1e3 ? f(n / 1e3, ' rb') : String(Math.round(n)); };
  const langkah = x => { const p = Math.pow(10, Math.floor(Math.log10(x))), f = x / p; return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * p; };
  function gbBuat() {
    const y = ref.getFullYear(), mo = ref.getMonth(), d = ref.getDate(), g = [];
    const hr = (dt, tgl) => ({ k: ymd(dt), a: tgl ? '' : HARIS[dt.getDay()], b: String(dt.getDate()), full: HARIP[dt.getDay()] + ', ' + dt.getDate() + ' ' + BLNS[dt.getMonth()] + ' ' + dt.getFullYear() });
    if (mode === 'hari') for (let i = 6; i >= 0; i--) g.push(hr(new Date(y, mo, d - i, 12)));
    else if (mode === 'minggu') { const dow = (ref.getDay() + 6) % 7; for (let i = 0; i < 7; i++) g.push(hr(new Date(y, mo, d - dow + i, 12))); }
    else if (mode === 'bulan') { const n = new Date(y, mo + 1, 0).getDate(); for (let i = 1; i <= n; i++) g.push(hr(new Date(y, mo, i, 12), true)); }
    else for (let i = 0; i < 12; i++) g.push({ k: y + '-' + p2(i + 1), a: '', b: BLNS[i], full: BLNP[i] + ' ' + y, mi: i });
    return g;
  }
  function gbBaca() {
    const g = gbGs.find(x => x.k === gbSel), net = g ? g.m - g.o : 0;
    $('gbWhen').textContent = g ? g.full : '';
    $('gbIn').textContent = rp(g ? g.m : 0); $('gbOut').textContent = rp(g ? g.o : 0);
    const n = $('gbNet'); n.textContent = g ? 'Selisih ' + (net > 0 ? '+' : '') + rp(net) : ''; n.style.color = net > 0 ? '#4fe3a0' : net < 0 ? '#ff8a9a' : 'var(--muted)';
    const box = $('gbChart'); if (!box.firstChild) return;
    box.querySelectorAll('.gb-g').forEach(b => b.classList.toggle('sel', b.dataset.k === gbSel));
    box.querySelectorAll('.gb-xl').forEach(b => b.classList.toggle('sel', b.dataset.k === gbSel));
    box.querySelector('.gb-cols').classList.toggle('pilih', !!g);
  }
  function gbTengah() {
    const sc = $('gbChart').querySelector('.gb-scroll'), s = sc && sc.querySelector('.gb-g.sel');
    if (!sc || !s || !sc.clientWidth) return;
    sc.scrollLeft = s.offsetLeft - (sc.clientWidth - s.offsetWidth) / 2; gbPusat = false;
  }
  function renderBatang(r) {
    const box = $('gbChart'); if (!box) return;
    const gs = gbBuat(), len = mode === 'tahun' ? 7 : 10, mp = new Map(), mk = (t, c, at) => { const e = document.createElement(t); if (c) e.className = c; if (at) for (const k in at) e.setAttribute(k, at[k]); return e; };
    bacaT().forEach(x => {
      const isM = x.t === 'masuk', isK = x.t === 'keluar' || x.t === 'abel'; if (!x.d || !(isM || isK)) return;
      const k = x.d.slice(0, len), o = mp.get(k) || { m: 0, k: 0 }; if (isM) o.m += x.a; else o.k += x.a; mp.set(k, o);
    });
    gs.forEach(g => { const o = mp.get(g.k) || { m: 0, k: 0 }; g.m = o.m; g.o = o.k; });
    const per = (mode === 'hari' ? '7 hari sampai ' : '') + r.lbl;
    gbNav();
    $('gbHint').textContent = per + ' · ketuk batang untuk membaca nilainya'; $('gbEmpty').textContent = 'Belum ada transaksi di ' + per + '.';
    const maks = gs.reduce((a, g) => Math.max(a, g.m, g.o), 0), kosong = maks <= 0;
    $('gbRead').hidden = kosong; box.hidden = kosong; $('gbHint').hidden = kosong; $('gbEmpty').hidden = !kosong;
    box.textContent = ''; gbGs = gs;
    if (kosong) { gbSel = null; return; }
    const ini = mode === 'tahun' ? ymd(new Date()).slice(0, 7) : ymd(new Date());
    if (!gs.some(g => g.k === gbSel)) { const h = gs.find(g => g.k === ini) || gs.reduce((a, g) => (g.m + g.o > a.m + a.o ? g : a), gs[0]); gbSel = h.k; gbPusat = true; }
    const st = langkah(maks / 4), atas = Math.ceil(maks / st) * st, bulanan = mode === 'bulan';
    const y = mk('div', 'gb-y'), sc = mk('div', 'gb-scroll'), inn = mk('div', 'gb-inner'), grid = mk('div', 'gb-grid'), cols = mk('div', 'gb-cols'), xs = mk('div', 'gb-x');
    inn.style.setProperty('--n', gs.length); if (bulanan) inn.style.setProperty('--gw', '30px');
    for (let v = 0; v <= atas + 1e-9; v += st) {
      const top = (1 - v / atas) * 100 + '%', t = mk('span'); t.style.top = top; t.textContent = v === 0 ? '0' : singkat(v); y.appendChild(t);
      const l = mk('i', v === 0 ? 'nol' : ''); l.style.top = top; grid.appendChild(l);
    }
    gs.forEach((g, i) => {
      const b = mk('button', 'gb-g' + (mode === 'tahun' && !bulan.has(g.mi) ? ' off' : ''), { type: 'button', 'data-k': g.k, 'aria-label': g.full + ': pemasukan ' + rp(g.m) + ', pengeluaran ' + rp(g.o) });
      [['in', g.m], ['out', g.o]].forEach(p => { const e = mk('i', 'gb-b ' + p[0]); e.style.height = (p[1] / atas * 100) + '%'; e.style.minHeight = p[1] > 0 ? '3px' : '0'; e.style.setProperty('--i', i); b.appendChild(e); });
      cols.appendChild(b);
      const l = mk('div', 'gb-xl' + (g.k === ini ? ' ini' : ''), { 'data-k': g.k }); l.textContent = g.a;
      const n = mk('b'); n.textContent = g.b; l.appendChild(n); xs.appendChild(l);
    });
    inn.append(grid, cols, xs); sc.appendChild(inn); box.append(y, sc);
    gbBaca(); if (gbPusat) requestAnimationFrame(gbTengah);
  }
  /* pemilih bulan & tahun di kepala grafik batang: panah loncat ke bulan (Tahunan: tahun) terdekat yang ada transaksi, label membuka pilihan tahun & bulan.
     Saat pindah bulan, tanggal acuan = hari terakhir bulan itu yang ada transaksinya, supaya Harian/Mingguan langsung menampilkan isinya */
  function hariTerakhir(y, m) {
    const pre = y + '-' + p2(m + 1) + '-'; let h = 0;
    bacaT().forEach(x => { if ((x.t === 'masuk' || x.t === 'keluar' || x.t === 'abel') && (x.d || '').startsWith(pre)) h = Math.max(h, +x.d.slice(8, 10) || 0); });
    return h || Math.min(ref.getDate(), new Date(y, m + 1, 0).getDate());
  }
  function gbTetangga(dir) {
    const y = ref.getFullYear();
    if (mode === 'tahun') { const thn = [...petaData().keys()].sort((a, b) => a - b); return dir < 0 ? thn.filter(v => v < y).pop() : thn.find(v => v > y); }
    const a = []; petaData().forEach((s, yy) => s.forEach(mm => a.push(yy * 12 + mm))); a.sort((p, q) => p - q);
    const cur = y * 12 + ref.getMonth(); return dir < 0 ? a.filter(v => v < cur).pop() : a.find(v => v > cur);
  }
  function gbNav() {
    const y = ref.getFullYear(), m = ref.getMonth(), n = new Date();
    $('gbLblT').textContent = mode === 'tahun' ? String(y) : BLNS[m] + ' ' + y;
    $('gbLbl').classList.toggle('lalu', mode === 'tahun' ? y !== n.getFullYear() : (y !== n.getFullYear() || m !== n.getMonth()));
    $('gbPrev').disabled = gbTetangga(-1) === undefined; $('gbNext').disabled = gbTetangga(1) === undefined;
  }
  function gbLompat(dir) {
    const t = gbTetangga(dir); if (t === undefined) return;
    if (mode === 'tahun') setRef(t, ref.getMonth(), 1); else { const y = Math.floor(t / 12), m = t % 12; setRef(y, m, hariTerakhir(y, m)); }
  }
  $('gbPrev').addEventListener('click', () => gbLompat(-1));
  $('gbNext').addEventListener('click', () => gbLompat(1));
  $('gbLbl').addEventListener('click', () => bukaPick());
  (function () {
    const box = $('gbChart'); if (!box) return;
    const pilih = k => { if (k && k !== gbSel) { gbSel = k; gbBaca(); } };
    box.addEventListener('click', e => { const b = e.target.closest('.gb-g'); if (b) pilih(b.dataset.k); });
    box.addEventListener('pointerover', e => { if (e.pointerType !== 'mouse') return; const b = e.target.closest('.gb-g'); if (b) pilih(b.dataset.k); });
    if (window.ResizeObserver) new ResizeObserver(() => { if (gbPusat) gbTengah(); }).observe(box);
  })();
  $('gfMode').addEventListener('click', e => { const b = e.target.closest('button'); if (b) { mode = b.dataset.m; render(); } });
  $('gfType').addEventListener('click', e => { const b = e.target.closest('button'); if (b) { tipe = b.dataset.t; render(); } });
  $('gfPrev').addEventListener('click', () => geser(-1));
  $('gfNext').addEventListener('click', () => geser(1));
  /* ---- ketuk label periode (mis. "Oktober 2026") = pilih tahun & bulan. Tanpa batas: hanya tahun/bulan yang berisi transaksi yang bisa dipilih ---- */
  const pk = $('gfPick'), pkGrid = $('gfpGrid'), pkYears = $('gfpYears');
  let pkY = ref.getFullYear();
  function petaData() { /* { tahun: Set(bulan 0-11) } dari transaksi yang masuk hitungan grafik */
    const m = new Map();
    bacaT().forEach(x => {
      if (!(x.t === 'masuk' || x.t === 'keluar' || x.t === 'abel')) return;
      const y = +(x.d || '').slice(0, 4), mo = +(x.d || '').slice(5, 7) - 1; if (!(y > 0) || mo < 0 || mo > 11) return;
      if (!m.has(y)) m.set(y, new Set()); m.get(y).add(mo);
    });
    return m;
  }
  function setRef(y, m, d) { ref = new Date(y, m, Math.min(d, new Date(y, m + 1, 0).getDate()), 12); pk.hidden = true; render(); }
  function renderPick() {
    const data = petaData(), thn = [...data.keys()].sort((a, b) => a - b);
    pkYears.textContent = ''; pkGrid.textContent = '';
    if (!thn.length) { $('gfpTitle').textContent = 'Belum ada transaksi'; $('gfpYear').textContent = '–'; $('gfpPrev').disabled = $('gfpNext').disabled = true; pkGrid.hidden = true; return; }
    if (!data.has(pkY)) pkY = thn.reduce((a, b) => Math.abs(b - pkY) < Math.abs(a - pkY) ? b : a);
    const ix = thn.indexOf(pkY);
    $('gfpYear').textContent = pkY; $('gfpPrev').disabled = ix <= 0; $('gfpNext').disabled = ix >= thn.length - 1;
    $('gfpTitle').textContent = mode === 'tahun' ? 'Pilih tahun' : 'Pilih tahun & bulan';
    thn.forEach(y => { const b = document.createElement('button'); b.type = 'button'; b.className = 'gf-chip' + (y === pkY ? ' on' : ''); b.textContent = y; b.dataset.y = y; pkYears.appendChild(b); });
    const on = pkYears.querySelector('.on'); if (on && on.scrollIntoView) on.scrollIntoView({ inline: 'center', block: 'nearest' });
    pkGrid.hidden = mode === 'tahun';
    const ada = data.get(pkY);
    BLNS.forEach((n, i) => {
      const b = document.createElement('button'); b.type = 'button'; b.dataset.m = i; b.textContent = BLNP[i];
      b.className = 'gfp-m' + (pkY === ref.getFullYear() && i === ref.getMonth() ? ' on' : ''); b.disabled = !ada.has(i); pkGrid.appendChild(b);
    });
  }
  function bukaPick() { pkY = ref.getFullYear(); renderPick(); pk.hidden = false; }
  $('gfLbl').addEventListener('click', bukaPick);
  const lompat = d => { const thn = [...petaData().keys()].sort((a, b) => a - b), ix = thn.indexOf(pkY) + d; if (ix >= 0 && ix < thn.length) { pkY = thn[ix]; renderPick(); } };
  $('gfpPrev').addEventListener('click', () => lompat(-1));
  $('gfpNext').addEventListener('click', () => lompat(1));
  pkYears.addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; pkY = +b.dataset.y; if (mode === 'tahun') setRef(pkY, ref.getMonth(), 1); else renderPick(); });
  pkGrid.addEventListener('click', e => { const b = e.target.closest('button'); if (b && !b.disabled) setRef(pkY, +b.dataset.m, hariTerakhir(pkY, +b.dataset.m)); });
  pk.addEventListener('click', e => { if (e.target === pk) pk.hidden = true; });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !pk.hidden) pk.hidden = true; });
  document.addEventListener('keu-berubah', render);
  render();
})();

/* ===== GALERY: 8 kotak (3 per baris). Tiap kotak = cover (background) + judul + deskripsi kecil.
   Ketuk 1x kotak = halaman dalam (banner 16:9 dengan gradasi hitam di setengah bawah, judul mengikuti judul kotak, deskripsinya sendiri: ketuk 3x = edit, ketuk 1x di luar = kunci).
   Ketuk 3x kotak = mode edit kotak itu (cover dari galeri / link, judul, deskripsi kecil); saat mode edit ketuk kotak lain = pindah edit, ketuk 1x di luar = kunci.
   Data: 'galeri' (judul, deskripsi, cover, deskripsi halaman dalam). Cover dari galeri HP disimpan di IndexedDB 'mylife_galeri' (muat besar), cover dari link disimpan sebagai alamatnya. ===== */
(function () {
  const grid = $('galGrid'), panel = $('galPanel'), pJudul = $('galPJudul'), iT = $('galT'), iD = $('galD'), iUrl = $('galUrl'), msg = $('galMsg'), file = $('galFile'), delCv = $('galDelCv');
  const page = $('gal'), body = $('galBody'), ban = $('galBan'), bImg = $('galImg'), nm = $('galNm'), dw = $('galDw'), desc = $('galDesc');
  const N = 8, HINT = 'Ketuk di luar kotak untuk mengunci', KEY = 'galeri', els = [];
  const ikon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="9" cy="10" r="1.6"/><path d="M4 18l5.5-5.5 4 4 2.5-2.5L20 18"/></svg>';
  let data = [], aktif = -1, cur = -1, taps = 0, tapT = null, tapN = -1, msgT = null, dEdit = false, dTaps = 0, dT = null;

  const str = (v, n) => typeof v === 'string' ? v : '';
  let raw = []; try { const a = JSON.parse(load(KEY) || '[]'); if (Array.isArray(a)) raw = a; } catch (e) { /* data rusak: mulai kosong */ }
  for (let i = 0; i < N; i++) { const o = raw[i] || {}; data.push({ t: str(o.t, 24), d: str(o.d, 60), c: typeof o.c === 'string' ? o.c : '', i: str(o.i, 240) }); }
  const simpan = () => { try { localStorage.setItem(KEY, JSON.stringify(data)); return true; } catch (e) { return false; } };
  function pesan(t, err) {
    clearTimeout(msgT); msg.textContent = t; msg.className = err ? 'err' : '';
    if (t !== HINT) msgT = setTimeout(() => { msg.textContent = HINT; msg.className = ''; }, 3500);
  }

  /* penyimpanan cover dari galeri HP (IndexedDB) */
  let dbP = null;
  const db = () => dbP || (dbP = new Promise((ok, no) => {
    try { const r = indexedDB.open('mylife_galeri', 1); r.onupgradeneeded = () => r.result.createObjectStore('c'); r.onsuccess = () => ok(r.result); r.onerror = () => no(r.error); } catch (e) { no(e); }
  }));
  const tx = (mode, fn) => db().then(d => new Promise((ok, no) => {
    const t = d.transaction('c', mode), r = fn(t.objectStore('c'));
    t.oncomplete = () => ok(r && r.result); t.onerror = () => no(t.error); t.onabort = () => no(t.error);
  }));
  const idbPut = (id, b) => tx('readwrite', s => s.put(b, id)), idbGet = id => tx('readonly', s => s.get(id)), idbDel = id => tx('readwrite', s => s.delete(id));
  const urls = new Map();
  async function src(c) {
    if (!c) return ''; if (!c.startsWith('idb:')) return c; if (urls.has(c)) return urls.get(c);
    try { const b = await idbGet(c.slice(4)); if (!b) return ''; const u = URL.createObjectURL(b); urls.set(c, u); return u; } catch (e) { return ''; }
  }
  function lepas(c) { if (c && c.startsWith('idb:')) { idbDel(c.slice(4)).catch(() => {}); if (urls.has(c)) { URL.revokeObjectURL(urls.get(c)); urls.delete(c); } } }
  async function pasang(img, c, host) { /* pasang cover ke <img>; host diberi kelas 'kosong' (belum ada cover) atau 'rusak' (gambar gagal dimuat) */
    img.dataset.c = c; host.classList.remove('rusak'); host.classList.toggle('kosong', !c);
    if (!c) { img.removeAttribute('src'); return; }
    const u = await src(c); if (img.dataset.c !== c) return;
    if (!u) { host.classList.add('rusak'); img.removeAttribute('src'); return; }
    img.src = u;
  }
  function perkecil(f) {
    return new Promise((ok, gagal) => {
      const url = URL.createObjectURL(f), im = new Image();
      im.onload = () => {
        const M = 1280, k = Math.min(1, M / Math.max(im.naturalWidth, im.naturalHeight));
        const c = document.createElement('canvas'); c.width = Math.round(im.naturalWidth * k); c.height = Math.round(im.naturalHeight * k);
        const g = c.getContext('2d'); g.fillStyle = '#0b0d1a'; g.fillRect(0, 0, c.width, c.height); g.drawImage(im, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url); c.toBlob(b => b ? ok(b) : gagal(), 'image/jpeg', .85);
      };
      im.onerror = () => { URL.revokeObjectURL(url); gagal(); };
      im.src = url;
    });
  }
  const blobKeUrl = b => new Promise((ok, no) => { const r = new FileReader(); r.onload = () => ok(r.result); r.onerror = () => no(r.error); r.readAsDataURL(b); });

  /* ---- kotak ---- */
  function tampil(n) {
    const e = els[n], d = data[n];
    e.t.textContent = d.t; e.d.textContent = d.d; e.tx.hidden = !(d.t || d.d) && aktif !== n;
  }
  for (let n = 0; n < N; n++) {
    const el = document.createElement('div'); el.className = 'gl-box kosong'; el.dataset.n = n; el.setAttribute('role', 'button'); el.tabIndex = 0; el.setAttribute('aria-label', 'Kotak galery ' + (n + 1));
    const im = document.createElement('img'); im.className = 'gl-cv'; im.alt = ''; im.draggable = false; im.referrerPolicy = 'no-referrer';
    im.addEventListener('error', () => { if (im.getAttribute('src')) el.classList.add('rusak'); });
    const ph = document.createElement('div'); ph.className = 'gl-ph'; ph.innerHTML = ikon;
    const tx = document.createElement('div'); tx.className = 'gl-tx';
    const t = document.createElement('b'); t.className = 'gl-t'; t.dataset.ph = 'Judul';
    const d = document.createElement('small'); d.className = 'gl-d'; d.dataset.ph = 'Deskripsi';
    tx.append(t, d); el.append(im, ph, tx); grid.appendChild(el);
    els.push({ el, im, t, d, tx }); tampil(n); pasang(im, data[n].c, el);
  }

  /* ---- mode edit kotak ---- */
  function mulai(n) {
    const lama = aktif; aktif = n; panel.hidden = false; pJudul.textContent = 'Kotak ' + (n + 1);
    els.forEach((e, i) => e.el.classList.toggle('editing', i === n));
    if (lama >= 0) tampil(lama); tampil(n);
    iT.value = data[n].t; iD.value = data[n].d; iUrl.value = ''; delCv.hidden = !data[n].c; pesan(HINT);
    try { panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); } catch (e) { /* abaikan */ }
  }
  function kunci() {
    if (aktif < 0) return; const n = aktif; aktif = -1; panel.hidden = true;
    els.forEach(e => e.el.classList.remove('editing')); tampil(n);
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
  }
  iT.addEventListener('input', () => { if (aktif < 0) return; data[aktif].t = iT.value; tampil(aktif); simpan(); });
  iD.addEventListener('input', () => { if (aktif < 0) return; data[aktif].d = iD.value; tampil(aktif); simpan(); });
  [iT, iD].forEach(i => i.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); kunci(); } }));

  function setCover(n, c) {
    const lama = data[n].c; data[n].c = c;
    if (!simpan()) { data[n].c = lama; lepas(c); pesan('Penyimpanan penuh, cover tidak tersimpan', true); return false; }
    if (lama && lama !== c) lepas(lama);
    pasang(els[n].im, c, els[n].el); if (n === aktif) delCv.hidden = !c; return true;
  }
  function pakaiUrl() {
    const n = aktif; if (n < 0) return; const v = iUrl.value.trim();
    if (!/^https?:\/\/\S+$/i.test(v)) { pesan('Link harus diawali http:// atau https://', true); return; }
    pesan('Memeriksa gambar…');
    const t = new Image(); t.referrerPolicy = 'no-referrer';
    t.onload = () => { if (aktif !== n) return; if (setCover(n, v)) { iUrl.value = ''; pesan('Cover dipasang ✓'); } };
    t.onerror = () => pesan(alasanLink(v, 'foto'), true);
    t.src = v;
  }
  $('galUrlBtn').addEventListener('click', pakaiUrl);
  iUrl.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); pakaiUrl(); } });
  $('galGal').addEventListener('click', () => { if (aktif >= 0) file.click(); });
  file.addEventListener('change', async () => {
    const f = file.files && file.files[0]; file.value = ''; const n = aktif; if (!f || n < 0) return;
    pesan('Memproses gambar…');
    try {
      const b = await perkecil(f); let c;
      try { const id = 'g' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); await idbPut(id, b); c = 'idb:' + id; }
      catch (e) { c = await blobKeUrl(b); } /* IndexedDB tidak tersedia: simpan sebagai data gambar */
      if (setCover(n, c)) pesan('Cover dipasang ✓');
    } catch (e) { pesan('Gambar tidak bisa dibaca', true); }
  });
  delCv.addEventListener('click', async () => {
    const n = aktif; if (n < 0 || !data[n].c) return;
    const ok = await konfirmasi('Hapus cover?', 'Cover kotak ' + (n + 1) + ' akan dihapus.', 'Hapus'); if (ok !== true) return;
    if (setCover(n, '')) pesan('Cover dihapus ✓');
  });

  /* ---- ketuk 1x = halaman dalam, ketuk 3x = edit, ketuk 1x di luar = kunci ---- */
  grid.addEventListener('click', e => {
    const el = e.target.closest ? e.target.closest('.gl-box') : null; if (!el) return;
    const n = +el.dataset.n;
    if (aktif >= 0) { if (n !== aktif) mulai(n); return; }
    if (tapN !== n) taps = 0;
    tapN = n; taps++; clearTimeout(tapT);
    if (taps >= 3) { taps = 0; mulai(n); return; }
    tapT = setTimeout(() => { if (taps === 1) buka(n); taps = 0; }, 380);
  });
  grid.addEventListener('keydown', e => { const el = e.target.closest && e.target.closest('.gl-box'); if (el && aktif < 0 && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); buka(+el.dataset.n); } });

  /* ---- halaman dalam ---- */
  function ukur() { desc.style.height = 'auto'; desc.style.height = Math.max(desc.scrollHeight, 22) + 'px'; }
  function isi() {
    const d = data[cur]; nm.textContent = d.t || 'Tanpa judul'; nm.classList.toggle('kosong', !d.t);
    if (!dEdit) { desc.value = d.i; ukur(); }
    pasang(bImg, d.c, ban);
  }
  function buka(n) { cur = n; page.hidden = false; body.scrollTop = 0; isi(); if (window.plTampil) window.plTampil(n); if (window.fmTampil) window.fmTampil(n); if (window.bkTampil) window.bkTampil(n); if (window.tpTampil) window.tpTampil(n); if (window.cnTampil) window.cnTampil(n); if (window.tkTampil) window.tkTampil(n); if (window.lkTampil) window.lkTampil(n); if (window.kqTampil) window.kqTampil(n); }
  function tutup() { descKunci(); page.hidden = true; cur = -1; if (window.plTampil) window.plTampil(-1); if (window.fmTampil) window.fmTampil(-1); if (window.bkTampil) window.bkTampil(-1); if (window.tpTampil) window.tpTampil(-1); if (window.cnTampil) window.cnTampil(-1); if (window.tkTampil) window.tkTampil(-1); if (window.lkTampil) window.lkTampil(-1); if (window.kqTampil) window.kqTampil(-1); }
  $('galClose').addEventListener('click', tutup);
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !page.hidden && $('cfm').hidden) tutup(); });
  desc.addEventListener('input', () => { ukur(); if (cur >= 0) { data[cur].i = desc.value; simpan(); } });
  dw.addEventListener('click', () => {
    if (dEdit) return; dTaps++; clearTimeout(dT);
    if (dTaps >= 3) { dTaps = 0; dEdit = true; ban.classList.add('editing'); body.classList.add('editing'); desc.readOnly = false; desc.focus(); const n = desc.value.length; try { desc.setSelectionRange(n, n); } catch (e) { /* abaikan */ } }
    else dT = setTimeout(() => { dTaps = 0; }, 500);
  });
  function descKunci() {
    if (!dEdit) return; dEdit = false; ban.classList.remove('editing'); body.classList.remove('editing'); desc.readOnly = true; desc.blur();
    if (cur >= 0) { data[cur].i = desc.value.trim(); desc.value = data[cur].i; if (!simpan()) toast('Penyimpanan penuh, deskripsi tidak tersimpan'); }
    ukur();
  }
  document.addEventListener('click', e => {
    const p = e.composedPath ? e.composedPath() : [];
    if (aktif >= 0 && !p.includes(grid) && !p.includes(panel) && !p.includes($('cfm')) && e.target !== file) kunci();
    if (dEdit && !p.includes(dw)) descKunci();
  });
})();


/* ===== PLAYLIST LAGU (Galery kotak 1): tambah lagu (cover, judul, artis, link), urutkan, hapus lewat titik tiga. Data: 'playlist' ===== */
(function () {
  const wrap = $('plWrap'), list = $('plList'), form = $('plForm'), KEY = 'playlist';
  const sortO = document.createElement('div'); sortO.id = 'plSortM'; sortO.hidden = true; document.body.appendChild(sortO);
  const ic = d => '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="' + d + '"/></svg>';
  const UP = 'M12 19V5M5 12l7-7 7 7', DOWN = 'M12 5v14M19 12l-7 7-7-7', CHECK = 'M5 12l5 5L20 7';
  /* kriteria: [nama, ikon, arah bawaan]. asc = naik (A→Z / terlama dulu), desc = turun (Z→A / terbaru dulu) */
  const CRIT = { baru: ['Terbaru', 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 7v5l3 2', 'desc'], judul: ['Judul', 'M4 7V5h16v2M12 5v14M9 19h6', 'asc'], artis: ['Artis', 'M12 4a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM20 21a8 8 0 0 0-16 0', 'asc'] };
  const NOTE = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 18V5l11-2v13"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="17.5" cy="16" r="2.5"/></svg>';
  let data = [], srt = { k: 'baru', d: 'desc' }, cover = '', cvBad = false;
  try {
    const s = JSON.parse(load('playlist_sort2') || 'null');
    if (s && CRIT[s.k] && (s.d === 'asc' || s.d === 'desc')) srt = { k: s.k, d: s.d };
    else { const o = { baru: ['baru', 'desc'], lama: ['baru', 'asc'], ja: ['judul', 'asc'], jz: ['judul', 'desc'], aa: ['artis', 'asc'], az: ['artis', 'desc'] }[load('playlist_sort')]; if (o) srt = { k: o[0], d: o[1] }; }
  } catch (e) {}
  try { const a = JSON.parse(load(KEY) || '[]'); if (Array.isArray(a)) data = a.filter(x => x && x.id && typeof x.t === 'string'); } catch (e) {}
  const simpan = () => { try { localStorage.setItem(KEY, JSON.stringify(data)); return true; } catch (e) { return false; } };
  const cmp = (a, b, k) => String(a[k] || '').localeCompare(String(b[k] || ''), 'id', { sensitivity: 'base' });
  const urut = () => { const m = srt.d === 'asc' ? 1 : -1; return data.slice().sort((a, b) => m * (srt.k === 'baru' ? a.ts - b.ts : srt.k === 'judul' ? cmp(a, b, 't') : (cmp(a, b, 'a') || cmp(a, b, 't')))); };
  const hasil = () => srt.k === 'baru' ? (srt.d === 'desc' ? 'Terbaru dulu' : 'Terlama dulu') : (srt.d === 'asc' ? 'A–Z' : 'Z–A');
  function sortUI() {
    $('plSortI').innerHTML = ic(CRIT[srt.k][1]); $('plSortT').textContent = CRIT[srt.k][0];
    const d = $('plSortD'); d.innerHTML = ic(srt.d === 'asc' ? UP : DOWN); d.title = hasil(); d.setAttribute('aria-label', 'Arah urutan: ' + hasil() + '. Ketuk untuk membalik');
    $('plCnt').textContent = data.length + ' lagu · ' + hasil();
  }
  const host = u => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch (e) { return ''; } };
  const okUrl = v => /^https?:\/\/\S+$/i.test(v);

  function render() {
    sortUI();
    list.textContent = '';
    if (!data.length) { const e = document.createElement('div'); e.className = 'pl-empty'; e.textContent = 'Belum ada lagu. Ketuk tombol + untuk menambah.'; list.appendChild(e); return; }
    const f = document.createDocumentFragment();
    urut().forEach(x => {
      const r = document.createElement('div'); r.className = 'pl-it'; r.dataset.id = x.id; if (x.u) { r.setAttribute('role', 'link'); r.tabIndex = 0; } else r.style.cursor = 'default';
      const cv = document.createElement('div'); cv.className = 'pl-cv'; cv.innerHTML = NOTE;
      if (x.c) { const im = document.createElement('img'); im.alt = ''; im.referrerPolicy = 'no-referrer'; im.draggable = false; im.addEventListener('error', () => im.remove()); im.src = x.c; cv.appendChild(im); }
      const m = document.createElement('div'); m.className = 'pl-m';
      const t = document.createElement('b'); t.textContent = x.t;
      const a = document.createElement('span'); a.textContent = x.a || 'Artis tidak diketahui';
      const h = document.createElement('small'); h.textContent = host(x.u);
      m.append(t, a, h);
      const d = document.createElement('button'); d.type = 'button'; d.className = 'pl-dot'; d.setAttribute('aria-label', 'Hapus lagu');
      d.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg>';
      r.append(cv, m, d); f.appendChild(r);
    });
    list.appendChild(f);
  }
  window.plTampil = n => { if (typeof tutupMenu === 'function') tutupMenu(); wrap.hidden = n !== 0; if (n === 0) render(); else { form.hidden = true; sortO.hidden = true; } };

  /* buka link lagu / hapus lewat titik tiga */
  const buka = r => { const x = data.find(y => y.id === r.dataset.id); if (x && x.u) window.open(x.u, '_blank', 'noopener'); };
  /* titik tiga = menu kecil dulu; dialog konfirmasi baru muncul setelah "Hapus lagu" dipilih */
  const menu = document.createElement('div'); menu.id = 'plMenu'; menu.hidden = true;
  menu.innerHTML = '<button type="button" data-a="edit"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>Edit lagu</button><button type="button" data-a="hapus"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-12M9 7V4h6v3"/></svg>Hapus lagu</button>';
  document.body.appendChild(menu);
  let menuId = null;
  const tutupMenu = () => { menu.hidden = true; menuId = null; };
  list.addEventListener('click', e => {
    const r = e.target.closest('.pl-it'); if (!r) return;
    const dot = e.target.closest('.pl-dot');
    if (!dot) { buka(r); return; }
    e.stopPropagation();
    if (!menu.hidden && menuId === r.dataset.id) { tutupMenu(); return; }
    menuId = r.dataset.id; menu.hidden = false;
    const b = dot.getBoundingClientRect(), mw = menu.offsetWidth, mh = menu.offsetHeight;
    menu.style.left = Math.max(8, Math.min(innerWidth - mw - 8, b.right - mw)) + 'px';
    menu.style.top = (b.bottom + mh + 12 > innerHeight ? b.top - mh - 4 : b.bottom + 4) + 'px';
  });
  menu.addEventListener('click', async e => {
    const bt = e.target.closest('button'); if (!bt) return;
    const x = data.find(y => y.id === menuId); tutupMenu(); if (!x) return;
    if (bt.dataset.a === 'edit') { bukaForm(x); return; }
    const ok = await konfirmasi('Hapus lagu?', x.t + (x.a ? ' · ' + x.a : '') + '\nakan dihapus dari playlist.', 'Hapus');
    if (ok !== true) return;
    data = data.filter(y => y !== x); simpan(); render(); toast('Lagu dihapus ✓');
  });
  document.addEventListener('click', e => { if (!menu.hidden && !menu.contains(e.target)) tutupMenu(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !menu.hidden) tutupMenu(); });
  $('galBody').addEventListener('scroll', tutupMenu, { passive: true });
  list.addEventListener('keydown', e => { const r = e.target.closest('.pl-it'); if (r && e.target === r && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); buka(r); } });

  /* urutkan: 2 pilihan. (1) kriteria lewat menu kecil: Terbaru / Judul / Artis, (2) arah lewat tombol panah naik/turun */
  const simpanSort = () => save('playlist_sort2', JSON.stringify(srt));
  $('plSortC').addEventListener('click', e => {
    e.stopPropagation();
    if (!sortO.hidden) { sortO.hidden = true; return; }
    sortO.textContent = '';
    Object.keys(CRIT).forEach(k => {
      const b = document.createElement('button'); b.type = 'button'; b.dataset.k = k; b.className = k === srt.k ? 'on' : '';
      b.innerHTML = ic(CRIT[k][1]) + '<span></span>' + '<svg class="ck" viewBox="0 0 24 24" aria-hidden="true"><path d="' + CHECK + '"/></svg>';
      b.querySelector('span').textContent = CRIT[k][0]; sortO.appendChild(b);
    });
    sortO.hidden = false;
    const r = $('plSortC').parentNode.getBoundingClientRect(), mw = sortO.offsetWidth;
    sortO.style.left = Math.max(8, Math.min(innerWidth - mw - 8, r.right - mw)) + 'px'; sortO.style.top = (r.bottom + 6) + 'px';
  });
  sortO.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.k !== srt.k) srt = { k: b.dataset.k, d: CRIT[b.dataset.k][2] };
    simpanSort(); sortO.hidden = true; render();
  });
  $('plSortD').addEventListener('click', () => { srt.d = srt.d === 'asc' ? 'desc' : 'asc'; simpanSort(); render(); });
  document.addEventListener('click', e => { if (!sortO.hidden && !sortO.contains(e.target)) sortO.hidden = true; });
  $('galBody').addEventListener('scroll', () => { sortO.hidden = true; }, { passive: true });

  /* form tambah lagu */
  const iT = $('plT'), iA = $('plA'), iU = $('plU'), iCv = $('plCvUrl'), img = $('plCvImg'), ph = $('plCvPh'), msg = $('plMsg');
  function pesan(t, err) { msg.textContent = t || ''; msg.className = 'pl-msg' + (err ? ' err' : ''); }
  function pratinjau(src) {
    cvBad = false; img.hidden = !src; ph.hidden = !!src; $('plCvClr').hidden = !src;
    if (src) img.src = src; else img.removeAttribute('src');
  }
  img.addEventListener('error', () => { if (img.getAttribute('src')) { cvBad = true; img.hidden = true; ph.hidden = false; pesan('Cover: ' + alasanLink(img.getAttribute('src'), 'foto'), true); } });
  img.addEventListener('load', () => { cvBad = false; if (msg.classList.contains('err') && /Cover/.test(msg.textContent)) pesan(''); });
  let editId = null;
  function bukaForm(x) {
    editId = x ? x.id : null; $('plFormT').textContent = x ? 'Edit lagu' : 'Tambah lagu';
    cover = x ? (x.c || '') : ''; cvBad = false;
    iT.value = x ? x.t : ''; iA.value = x ? (x.a || '') : ''; iU.value = x ? (x.u || '') : '';
    iCv.value = /^https?:/i.test(cover) ? cover : ''; pratinjau(cover); pesan('');
    form.hidden = false; setTimeout(() => iT.focus(), 80);
  }
  $('plAdd').addEventListener('click', () => bukaForm(null));
  $('plCvClr').addEventListener('click', () => { cover = ''; iCv.value = ''; pratinjau(''); pesan(''); });
  $('plCancel').addEventListener('click', () => { form.hidden = true; });
  form.addEventListener('click', e => { if (e.target === form) form.hidden = true; });
  document.addEventListener('keydown', e => { if (e.key !== 'Escape') return; if (!sortO.hidden) sortO.hidden = true; else if (!form.hidden && $('cfm').hidden) form.hidden = true; });
  $('plCvBtn').addEventListener('click', () => $('plFile').click());
  $('plFile').addEventListener('change', () => {
    const f = $('plFile').files[0]; $('plFile').value = ''; if (!f) return;
    const url = URL.createObjectURL(f), im = new Image();
    im.onload = () => {
      const s = Math.min(im.naturalWidth, im.naturalHeight), c = document.createElement('canvas'); c.width = c.height = 320;
      c.getContext('2d').drawImage(im, (im.naturalWidth - s) / 2, (im.naturalHeight - s) / 2, s, s, 0, 0, 320, 320);
      URL.revokeObjectURL(url); cover = c.toDataURL('image/jpeg', .8); iCv.value = ''; pratinjau(cover); pesan('');
    };
    im.onerror = () => { URL.revokeObjectURL(url); pesan('Gambar tidak bisa dibaca', true); };
    im.src = url;
  });
  iCv.addEventListener('input', () => { const v = iCv.value.trim(); cover = okUrl(v) ? v : ''; pratinjau(cover); });
  $('plSave').addEventListener('click', () => {
    const t = iT.value.trim(), a = iA.value.trim(), u = iU.value.trim();
    if (!t) { pesan('Judul lagu wajib diisi', true); iT.focus(); return; }
    if (u && !okUrl(u)) { pesan('Link lagu harus diawali http:// atau https://', true); iU.focus(); return; }
    if (iCv.value.trim() && !okUrl(iCv.value.trim())) { pesan('Link cover harus diawali http:// atau https://', true); iCv.focus(); return; }
    if (cvBad) { pesan('Cover tidak bisa dimuat, ganti atau kosongkan', true); return; }
    if (u && data.some(x => x.u === u && x.id !== editId)) { pesan('Link lagu itu sudah ada di playlist', true); iU.focus(); return; }
    if (editId) {
      const x = data.find(y => y.id === editId); if (!x) { form.hidden = true; return; }
      const lama = Object.assign({}, x); Object.assign(x, { t, a, u, c: cover });
      if (!simpan()) { Object.assign(x, lama); pesan('Penyimpanan penuh, perubahan tidak tersimpan', true); return; }
      form.hidden = true; render(); toast('Perubahan tersimpan ✓'); return;
    }
    data.push({ id: 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), t, a, u, c: cover, ts: Date.now() });
    if (!simpan()) { data.pop(); pesan('Penyimpanan penuh, lagu tidak tersimpan', true); return; }
    form.hidden = true; render(); toast('Lagu ditambahkan ✓');
  });
  [iT, iA, iU, iCv].forEach(i => i.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); $('plSave').click(); } }));
})();

/* ===== PLAYLIST FILM (Galery kotak 2): tambah film (cover, judul, tahun), urutkan, edit/hapus lewat titik tiga di pojok kartu.
   Ketuk film = halaman detail (cover besar, judul & tahun, deskripsi: ketuk 3x = edit, ketuk 1x di luar = kunci). Data: 'film' ===== */
(function () {
  const wrap = $('fmWrap'), grid = $('fmGrid'), form = $('fmForm'), page = $('fmPage'), KEY = 'film';
  const pop = id => { const d = document.createElement('div'); d.id = id; d.hidden = true; document.body.appendChild(d); return d; };
  const sortO = pop('fmSortM'), menu = pop('fmMenu');
  const ic = d => '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="' + d + '"/></svg>';
  const UP = 'M12 19V5M5 12l7-7 7 7', DOWN = 'M12 5v14M19 12l-7 7-7-7', CHECK = 'M5 12l5 5L20 7';
  const FILM = 'M4 4h16a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1zM7 4v16M17 4v16M3 9h4M3 15h4M17 9h4M17 15h4';
  const CRIT = { baru: ['Terbaru', 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 7v5l3 2', 'desc'], judul: ['Judul', 'M4 7V5h16v2M12 5v14M9 19h6', 'asc'], tahun: ['Tahun', 'M5 6h14a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2zM3 10h18M8 3v4M16 3v4', 'desc'] };
  let data = [], srt = { k: 'baru', d: 'desc' }, cover = '', cvBad = false, editId = null, cur = null, menuId = null;
  try { const a = JSON.parse(load(KEY) || '[]'); if (Array.isArray(a)) data = a.filter(x => x && x.id && typeof x.t === 'string'); } catch (e) {}
  try { const s = JSON.parse(load('film_sort2') || 'null'); if (s && CRIT[s.k] && (s.d === 'asc' || s.d === 'desc')) srt = { k: s.k, d: s.d }; } catch (e) {}
  const simpan = () => { try { localStorage.setItem(KEY, JSON.stringify(data)); return true; } catch (e) { return false; } };
  const cmp = (a, b, k) => String(a[k] || '').localeCompare(String(b[k] || ''), 'id', { sensitivity: 'base' });
  const thn = v => { const m = /\d{4}/.exec(v || ''); return m ? +m[0] : 0; }; /* urutan tahun memakai angka 4 digit pertama; teks lain tetap boleh */
  const urut = () => {
    const m = srt.d === 'asc' ? 1 : -1;
    return data.slice().sort((a, b) => {
      if (srt.k === 'baru') return m * (a.ts - b.ts);
      if (srt.k === 'judul') return m * cmp(a, b, 't');
      const ya = thn(a.y), yb = thn(b.y); if (!ya !== !yb) return ya ? -1 : 1; /* tanpa tahun selalu di akhir */
      return m * (ya - yb) || cmp(a, b, 't');
    });
  };
  const hasil = () => srt.k === 'judul' ? (srt.d === 'asc' ? 'A–Z' : 'Z–A') : (srt.k === 'tahun' ? 'Tahun ' : '') + (srt.d === 'desc' ? 'terbaru dulu' : 'terlama dulu');
  function sortUI() {
    $('fmSortI').innerHTML = ic(CRIT[srt.k][1]); $('fmSortT').textContent = CRIT[srt.k][0];
    const d = $('fmSortD'); d.innerHTML = ic(srt.d === 'asc' ? UP : DOWN); d.title = hasil(); d.setAttribute('aria-label', 'Arah urutan: ' + hasil() + '. Ketuk untuk membalik');
    $('fmCnt').textContent = data.length + ' film · ' + hasil();
  }
  function render() {
    sortUI(); grid.textContent = '';
    if (!data.length) { const e = document.createElement('div'); e.className = 'pl-empty'; e.textContent = 'Belum ada film. Ketuk tombol + untuk menambah.'; grid.appendChild(e); return; }
    const f = document.createDocumentFragment();
    urut().forEach(x => {
      const r = document.createElement('div'); r.className = 'fm-it'; r.dataset.id = x.id; r.tabIndex = 0; r.setAttribute('role', 'button');
      const cv = document.createElement('div'); cv.className = 'fm-cv'; cv.innerHTML = ic(FILM);
      if (x.c) { const im = document.createElement('img'); im.alt = ''; im.referrerPolicy = 'no-referrer'; im.draggable = false; im.addEventListener('error', () => im.remove()); im.src = x.c; cv.appendChild(im); }
      const tx = document.createElement('div'); tx.className = 'fm-tx';
      const t = document.createElement('b'); t.textContent = x.t; const y = document.createElement('small'); y.textContent = x.y || '';
      tx.append(t, y);
      const d = document.createElement('button'); d.type = 'button'; d.className = 'fm-dot'; d.setAttribute('aria-label', 'Menu film');
      d.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg>';
      r.append(cv, tx, d); f.appendChild(r);
    });
    grid.appendChild(f);
  }
  const tutupPop = () => { menu.hidden = true; sortO.hidden = true; menuId = null; };
  window.fmTampil = n => { tutupPop(); wrap.hidden = n !== 1; if (n === 1) render(); else { form.hidden = true; tutupDetail(); } };

  /* ---- menu titik tiga: Edit film / Hapus film (hapus tetap lewat dialog konfirmasi) ---- */
  menu.innerHTML = '<button type="button" data-a="edit">' + ic('M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z') + 'Edit film</button><button type="button" data-a="hapus">' + ic('M4 7h16M10 11v6M14 11v6M6 7l1 12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-12M9 7V4h6v3') + 'Hapus film</button>';
  grid.addEventListener('click', e => {
    const r = e.target.closest('.fm-it'); if (!r) return;
    const dot = e.target.closest('.fm-dot');
    if (!dot) { bukaDetail(r.dataset.id); return; }
    e.stopPropagation();
    if (!menu.hidden && menuId === r.dataset.id) { tutupPop(); return; }
    sortO.hidden = true; menuId = r.dataset.id; menu.hidden = false;
    const b = dot.getBoundingClientRect(), mw = menu.offsetWidth, mh = menu.offsetHeight;
    menu.style.left = Math.max(8, Math.min(innerWidth - mw - 8, b.right - mw)) + 'px';
    menu.style.top = (b.bottom + mh + 12 > innerHeight ? b.top - mh - 4 : b.bottom + 4) + 'px';
  });
  grid.addEventListener('keydown', e => { const r = e.target.closest('.fm-it'); if (r && e.target === r && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); bukaDetail(r.dataset.id); } });
  menu.addEventListener('click', async e => {
    const bt = e.target.closest('button'); if (!bt) return;
    const x = data.find(y => y.id === menuId); tutupPop(); if (!x) return;
    if (bt.dataset.a === 'edit') { bukaForm(x); return; }
    const ok = await konfirmasi('Hapus film?', x.t + (x.y ? ' (' + x.y + ')' : '') + '\nakan dihapus dari playlist.', 'Hapus');
    if (ok !== true) return;
    data = data.filter(y => y !== x); simpan(); render(); toast('Film dihapus ✓');
  });

  /* ---- urutkan: kriteria (Terbaru / Judul / Tahun) + arah (panah naik / turun) ---- */
  const simpanSort = () => save('film_sort2', JSON.stringify(srt));
  $('fmSortC').addEventListener('click', e => {
    e.stopPropagation();
    if (!sortO.hidden) { sortO.hidden = true; return; }
    menu.hidden = true; sortO.textContent = '';
    Object.keys(CRIT).forEach(k => {
      const b = document.createElement('button'); b.type = 'button'; b.dataset.k = k; b.className = k === srt.k ? 'on' : '';
      b.innerHTML = ic(CRIT[k][1]) + '<span></span><svg class="ck" viewBox="0 0 24 24" aria-hidden="true"><path d="' + CHECK + '"/></svg>';
      b.querySelector('span').textContent = CRIT[k][0]; sortO.appendChild(b);
    });
    sortO.hidden = false;
    const r = $('fmSortC').parentNode.getBoundingClientRect(), mw = sortO.offsetWidth;
    sortO.style.left = Math.max(8, Math.min(innerWidth - mw - 8, r.right - mw)) + 'px'; sortO.style.top = (r.bottom + 6) + 'px';
  });
  sortO.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.k !== srt.k) srt = { k: b.dataset.k, d: CRIT[b.dataset.k][2] };
    simpanSort(); sortO.hidden = true; render();
  });
  $('fmSortD').addEventListener('click', () => { srt.d = srt.d === 'asc' ? 'desc' : 'asc'; simpanSort(); render(); });
  document.addEventListener('click', e => { if ((!menu.hidden && !menu.contains(e.target)) || (!sortO.hidden && !sortO.contains(e.target))) tutupPop(); });
  $('galBody').addEventListener('scroll', tutupPop, { passive: true });

  /* ---- form tambah / edit film ---- */
  const iT = $('fmT'), iY = $('fmY'), iCv = $('fmCvUrl'), img = $('fmCvImg'), ph = $('fmCvPh'), msg = $('fmMsg');
  const okUrl = v => /^https?:\/\/\S+$/i.test(v);
  function pesan(t, err) { msg.textContent = t || ''; msg.className = 'pl-msg' + (err ? ' err' : ''); }
  function pratinjau(src) { cvBad = false; img.hidden = !src; ph.hidden = !!src; $('fmCvClr').hidden = !src; if (src) img.src = src; else img.removeAttribute('src'); }
  img.addEventListener('error', () => { if (img.getAttribute('src')) { cvBad = true; img.hidden = true; ph.hidden = false; pesan('Cover: ' + alasanLink(img.getAttribute('src'), 'foto'), true); } });
  img.addEventListener('load', () => { cvBad = false; if (msg.classList.contains('err') && /Cover/.test(msg.textContent)) pesan(''); });
  function bukaForm(x) {
    editId = x ? x.id : null; $('fmFormT').textContent = x ? 'Edit film' : 'Tambah film';
    cover = x ? (x.c || '') : ''; cvBad = false;
    iT.value = x ? x.t : ''; iY.value = x ? (x.y || '') : ''; iCv.value = /^https?:/i.test(cover) ? cover : ''; pratinjau(cover); pesan('');
    form.hidden = false; setTimeout(() => iT.focus(), 80);
  }
  $('fmAdd').addEventListener('click', () => bukaForm(null));
  $('fmCancel').addEventListener('click', () => { form.hidden = true; });
  form.addEventListener('click', e => { if (e.target === form) form.hidden = true; });
  $('fmCvClr').addEventListener('click', () => { cover = ''; iCv.value = ''; pratinjau(''); pesan(''); });
  $('fmCvBtn').addEventListener('click', () => $('fmFile').click());
  $('fmFile').addEventListener('change', () => {
    const f = $('fmFile').files[0]; $('fmFile').value = ''; if (!f) return;
    const url = URL.createObjectURL(f), im = new Image();
    im.onload = () => {
      const k = Math.min(1, 640 / Math.max(im.naturalWidth, im.naturalHeight)), c = document.createElement('canvas');
      c.width = Math.round(im.naturalWidth * k); c.height = Math.round(im.naturalHeight * k);
      const g = c.getContext('2d'); g.fillStyle = '#0b0d1a'; g.fillRect(0, 0, c.width, c.height); g.drawImage(im, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url); cover = c.toDataURL('image/jpeg', .82); iCv.value = ''; pratinjau(cover); pesan('');
    };
    im.onerror = () => { URL.revokeObjectURL(url); pesan('Gambar tidak bisa dibaca', true); };
    im.src = url;
  });
  iCv.addEventListener('input', () => { const v = iCv.value.trim(); cover = okUrl(v) ? v : ''; pratinjau(cover); });
  $('fmSave').addEventListener('click', () => {
    const t = iT.value.trim(), y = iY.value.trim();
    if (!t) { pesan('Judul film wajib diisi', true); iT.focus(); return; }
    if (iCv.value.trim() && !okUrl(iCv.value.trim())) { pesan('Link cover harus diawali http:// atau https://', true); iCv.focus(); return; }
    if (cvBad) { pesan('Cover tidak bisa dimuat, ganti atau kosongkan', true); return; }
    if (editId) {
      const x = data.find(z => z.id === editId); if (!x) { form.hidden = true; return; }
      const lama = Object.assign({}, x); Object.assign(x, { t, y, c: cover });
      if (!simpan()) { Object.assign(x, lama); pesan('Penyimpanan penuh, perubahan tidak tersimpan', true); return; }
      form.hidden = true; render(); if (cur === x.id) isi(); toast('Perubahan tersimpan ✓'); return;
    }
    data.push({ id: 'f' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), t, y, c: cover, d: '', ts: Date.now() });
    if (!simpan()) { data.pop(); pesan('Penyimpanan penuh, film tidak tersimpan', true); return; }
    form.hidden = true; render(); toast('Film ditambahkan ✓');
  });
  [iT, iY, iCv].forEach(i => i.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); $('fmSave').click(); } }));

  /* ---- halaman detail: cover besar, judul & tahun (dari kartu kecil), deskripsi (ketuk 3x edit, ketuk 1x di luar kunci) ---- */
  const nm = $('fmNm'), yr = $('fmYr'), desc = $('fmDesc'), dw = $('fmDw'), hero = $('fmHero'), himg = $('fmHimg'), hbg = $('fmHbg');
  let dEdit = false, dTaps = 0, dT = null;
  const ukur = () => { desc.style.height = 'auto'; desc.style.height = Math.max(desc.scrollHeight, 44) + 'px'; };
  himg.addEventListener('error', () => { if (himg.getAttribute('src')) hero.classList.add('kosong'); });
  function isi() {
    const x = data.find(z => z.id === cur); if (!x) { tutupDetail(); return; }
    nm.textContent = x.t; yr.textContent = x.y || ''; yr.hidden = !x.y;
    if (!dEdit) { desc.value = x.d || ''; ukur(); }
    hero.classList.toggle('kosong', !x.c);
    if (x.c) { if (himg.dataset.c !== x.c) { himg.dataset.c = x.c; himg.src = x.c; hbg.style.backgroundImage = 'url(' + JSON.stringify(x.c) + ')'; } }
    else { himg.removeAttribute('src'); delete himg.dataset.c; hbg.style.backgroundImage = ''; }
  }
  function bukaDetail(id) { cur = id; page.hidden = false; $('fmBody').scrollTop = 0; isi(); requestAnimationFrame(ukur); }
  function kunciDesc() {
    if (!dEdit) return; dEdit = false; page.classList.remove('editing'); desc.readOnly = true; desc.tabIndex = -1; desc.blur();
    const x = data.find(z => z.id === cur); if (x) { x.d = desc.value.trim(); desc.value = x.d; if (!simpan()) toast('Penyimpanan penuh, deskripsi tidak tersimpan'); }
    ukur();
  }
  function tutupDetail() { kunciDesc(); page.hidden = true; cur = null; }
  $('fmBack').addEventListener('click', tutupDetail);
  desc.addEventListener('input', () => { ukur(); const x = data.find(z => z.id === cur); if (x) { x.d = desc.value; simpan(); } });
  dw.addEventListener('click', () => {
    if (dEdit) return; dTaps++; clearTimeout(dT);
    if (dTaps >= 3) { dTaps = 0; dEdit = true; page.classList.add('editing'); desc.readOnly = false; desc.tabIndex = 0; desc.focus(); const n = desc.value.length; try { desc.setSelectionRange(n, n); } catch (e) { /* abaikan */ } }
    else dT = setTimeout(() => { dTaps = 0; }, 500);
  });
  document.addEventListener('click', e => { if (!dEdit) return; const p = e.composedPath ? e.composedPath() : []; if (!p.includes(dw)) kunciDesc(); });
  window.addEventListener('resize', () => { if (!page.hidden) ukur(); });
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    if (!menu.hidden || !sortO.hidden) tutupPop();
    else if (!form.hidden && $('cfm').hidden) form.hidden = true;
    else if (!page.hidden && $('cfm').hidden) tutupDetail();
  });
})();


/* ===== KENALI AKU (halaman Galery): foto profil, nama, badge keahlian, deskripsi, catatan per badge =====
   Ketuk 3x foto/nama = edit (foto, nama), ketuk 1x di luar = kunci. Deskripsi: ketuk 3x = edit, ketuk 1x di luar = kunci.
   Badge: + = tambah, ketuk 1x = halaman catatan, ketuk 3x = ubah / hapus badge, ketuk 5x = mode geser (seret untuk pindah posisi), ketuk 1x di luar badge = kunci.
   Data: 'kenali' (n, f, d), 'kenali_badge' (daftar badge), 'kn_cat_<id>' (isi catatan, HTML) */
(function () {
  const card = $('knCard'), prof = $('knProf'), ava = $('knAva'), img = $('knImg'), nameIn = $('knName'), desc = $('knDesc'), dw = $('knDw');
  const panel = $('knPanel'), iUrl = $('knUrl'), msg = $('knMsg'), file = $('knFile'), delFoto = $('knDelFoto'), bWrap = $('knBadges');
  const HINT = 'Ketuk di luar kotak untuk mengunci', K = 'kenali', KB = 'kenali_badge', KC = 'kn_cat_';
  const PAL = [[148,190,160,'Hijau sage'],[138,180,222,'Biru langit'],[176,160,214,'Ungu lavender'],[236,172,142,'Jingga persik'],[226,202,128,'Kuning mentega'],[228,154,172,'Merah muda'],[118,200,188,'Hijau toska'],[206,156,128,'Cokelat tanah liat'],[176,194,124,'Hijau lumut'],[160,176,196,'Abu kebiruan'],[214,130,118,'Merah bata'],[232,180,92,'Kuning kunyit'],[96,152,196,'Biru laut'],[150,156,96,'Hijau zaitun'],[166,124,160,'Ungu anggur'],[222,204,168,'Krem pasir'],[104,160,120,'Hijau daun'],[124,134,196,'Biru indigo'],[196,110,128,'Merah marun'],[170,172,168,'Abu batu']];
  const rgb = i => (PAL[i] || PAL[0]).slice(0, 3).join(',');
  const ic = d => '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="' + d + '"/></svg>';
  const str = (v, n) => typeof v === 'string' ? v : '';
  const okUrl = v => /^https?:\/\/\S+$/i.test(v);

  /* ---- data ---- */
  let P = { n: '', f: '', d: '' }, badges = [];
  try { const o = JSON.parse(load(K) || '{}'); if (o && typeof o === 'object') P = { n: str(o.n, 120), f: typeof o.f === 'string' ? o.f : '', d: str(o.d, 400) }; } catch (e) { /* data rusak: mulai kosong */ }
  try { const a = JSON.parse(load(KB) || '[]'); if (Array.isArray(a)) badges = a.filter(x => x && x.id && typeof x.t === 'string').map(x => ({ id: String(x.id), t: x.t, c: (x.c | 0) >= 0 && (x.c | 0) < PAL.length ? (x.c | 0) : 0, ts: +x.ts || 0 })); } catch (e) { /* abaikan */ }
  const simpanP = () => { try { localStorage.setItem(K, JSON.stringify(P)); return true; } catch (e) { return false; } };
  const simpanB = () => { try { localStorage.setItem(KB, JSON.stringify(badges)); return true; } catch (e) { return false; } };

  /* ---- tampil profil ---- */
  function pasangFoto() {
    ava.classList.toggle('kosong', !P.f); delFoto.hidden = !P.f;
    if (P.f) img.src = P.f; else img.removeAttribute('src');
  }
  img.addEventListener('error', () => { if (img.getAttribute('src')) ava.classList.add('kosong'); });
  img.addEventListener('load', () => ava.classList.remove('kosong'));
  nameIn.value = P.n; desc.value = P.d; pasangFoto();
  const ukur = () => { desc.style.height = 'auto'; desc.style.height = Math.max(desc.scrollHeight, 28) + 'px'; };
  requestAnimationFrame(ukur);
  /* nama panjang: kotak nama otomatis membesar ke bawah, jadi seluruh nama tetap terlihat */
  const ukurNama = () => {
    nameIn.style.height = 'auto';
    if (!nameIn.scrollHeight) return;
    nameIn.style.height = (nameIn.scrollHeight + (nameIn.offsetHeight - nameIn.clientHeight)) + 'px';
  };
  requestAnimationFrame(ukurNama);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(ukurNama);
  window.addEventListener('resize', ukurNama);
  if (window.ResizeObserver) new ResizeObserver(ukurNama).observe(card);
  function pesan(t, err) { clearTimeout(pesan.t); msg.textContent = t; msg.className = err ? 'err' : ''; if (t !== HINT) pesan.t = setTimeout(() => { msg.textContent = HINT; msg.className = ''; }, 3500); }

  /* ---- badge ---- */
  function renderB() {
    bWrap.textContent = '';
    badges.forEach(b => {
      const e = document.createElement('button'); e.type = 'button'; e.className = 'kn-b'; e.dataset.id = b.id; e.style.setProperty('--bc', rgb(b.c)); e.textContent = b.t;
      e.setAttribute('aria-label', 'Badge ' + b.t + '. Ketuk untuk membuka catatan, ketuk 3x untuk mengubah, ketuk 5x untuk menggeser posisi');
      bWrap.appendChild(e);
    });
    const p = document.createElement('span'); p.className = 'kn-addp';
    p.innerHTML = '<button type="button" class="kn-plus" aria-label="Tambah badge">' + ic('M12 5v14M5 12h14') + '</button>';
    bWrap.appendChild(p);
  }
  renderB();

  /* ---- mode edit profil (foto + nama): ketuk 3x foto/nama ---- */
  let pEdit = false, pTaps = 0, pT = null, dEdit = false, dTaps = 0, dT = null;
  function mulaiProfil() {
    kunciDesc(); pEdit = true; pTaps = 0; card.classList.add('editing'); panel.hidden = false;
    nameIn.readOnly = false; nameIn.tabIndex = 0; pesan(HINT);
    try { panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); } catch (e) { /* abaikan */ }
  }
  function kunciProfil() {
    if (!pEdit) return; pEdit = false; card.classList.remove('editing'); panel.hidden = true;
    nameIn.readOnly = true; nameIn.tabIndex = -1; nameIn.blur();
    P.n = nameIn.value.trim(); nameIn.value = P.n; ukurNama(); if (!simpanP()) toast('Penyimpanan penuh, perubahan tidak tersimpan');
  }
  prof.addEventListener('click', () => {
    if (pEdit) return; pTaps++; clearTimeout(pT);
    if (pTaps >= 3) { mulaiProfil(); return; }
    pT = setTimeout(() => { pTaps = 0; }, 500);
  });
  nameIn.addEventListener('input', () => { if (/[\r\n]/.test(nameIn.value)) nameIn.value = nameIn.value.replace(/[\r\n]+/g, ' '); P.n = nameIn.value; simpanP(); ukurNama(); });
  nameIn.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); kunciProfil(); } });

  /* foto: link atau galeri HP */
  function setFoto(f) {
    const lama = P.f; P.f = f;
    if (!simpanP()) { P.f = lama; pesan('Penyimpanan penuh, foto tidak tersimpan', true); return false; }
    pasangFoto(); return true;
  }
  function pakaiUrl() {
    const v = iUrl.value.trim();
    if (!okUrl(v)) { pesan('Link harus diawali http:// atau https://', true); return; }
    pesan('Memeriksa gambar…');
    const t = new Image(); t.referrerPolicy = 'no-referrer';
    t.onload = () => { if (!pEdit) return; if (setFoto(v)) { iUrl.value = ''; pesan('Foto dipasang ✓'); } };
    t.onerror = () => pesan(alasanLink(v, 'foto'), true);
    t.src = v;
  }
  $('knUrlBtn').addEventListener('click', pakaiUrl);
  iUrl.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); pakaiUrl(); } });
  $('knGal').addEventListener('click', () => { if (pEdit) file.click(); });
  file.addEventListener('change', () => {
    const f = file.files && file.files[0]; file.value = ''; if (!f) return;
    pesan('Memproses gambar…');
    const url = URL.createObjectURL(f), im = new Image();
    im.onload = () => {
      const k = Math.min(1, 512 / Math.max(im.naturalWidth, im.naturalHeight)), c = document.createElement('canvas');
      c.width = Math.round(im.naturalWidth * k); c.height = Math.round(im.naturalHeight * k);
      const g = c.getContext('2d'); g.fillStyle = '#0b0d1a'; g.fillRect(0, 0, c.width, c.height); g.drawImage(im, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      if (setFoto(c.toDataURL('image/jpeg', .85))) pesan('Foto dipasang ✓');
    };
    im.onerror = () => { URL.revokeObjectURL(url); pesan('Gambar tidak bisa dibaca', true); };
    im.src = url;
  });
  delFoto.addEventListener('click', async () => {
    if (!P.f) return;
    const ok = await konfirmasi('Hapus foto profil?', 'Foto profil akan dihapus.', 'Hapus'); if (ok !== true) return;
    if (setFoto('')) pesan('Foto dihapus ✓');
  });

  /* ---- deskripsi: ketuk 3x = edit, ketuk 1x di luar = kunci ---- */
  desc.addEventListener('input', () => { ukur(); P.d = desc.value; simpanP(); });
  dw.addEventListener('click', () => {
    if (dEdit || pEdit) return; dTaps++; clearTimeout(dT);
    if (dTaps >= 3) {
      dTaps = 0; dEdit = true; dw.classList.add('editing'); card.classList.add('dediting'); desc.readOnly = false; desc.tabIndex = 0; desc.focus();
      const n = desc.value.length; try { desc.setSelectionRange(n, n); } catch (e) { /* abaikan */ }
    } else dT = setTimeout(() => { dTaps = 0; }, 500);
  });
  function kunciDesc() {
    if (!dEdit) return; dEdit = false; dw.classList.remove('editing'); card.classList.remove('dediting'); desc.readOnly = true; desc.tabIndex = -1; desc.blur();
    P.d = desc.value.trim(); desc.value = P.d; if (!simpanP()) toast('Penyimpanan penuh, deskripsi tidak tersimpan'); ukur();
  }
  document.addEventListener('click', e => {
    const p = e.composedPath ? e.composedPath() : [];
    if (pEdit && !p.includes(prof) && !p.includes(panel) && !p.includes($('cfm')) && e.target !== file) kunciProfil();
    if (dEdit && !p.includes(dw)) kunciDesc();
  });
  window.addEventListener('resize', () => { if ($('galery').classList.contains('active')) ukur(); });
  document.querySelectorAll('#nav button').forEach(b => b.addEventListener('click', () => { if (b.dataset.page === 'galery') requestAnimationFrame(ukur); }));

  /* ---- form badge: teks + warna ---- */
  const form = $('knBForm'), bIn = $('knBIn'), bPrev = $('knBPrev'), sw = $('knSw'), bMsg = $('knBMsg'), bDel = $('knBDel');
  let editId = null, warna = 0;
  PAL.forEach((c, i) => {
    const b = document.createElement('button'); b.type = 'button'; b.dataset.i = i; b.style.setProperty('--bc', c.slice(0, 3).join(',')); b.setAttribute('aria-label', c[3]); sw.appendChild(b);
  });
  function prev() {
    bPrev.textContent = bIn.value.trim() || 'Badge'; bPrev.style.setProperty('--bc', rgb(warna));
    [...sw.children].forEach((b, i) => b.classList.toggle('on', i === warna));
  }
  function bukaBForm(id) {
    const b = id ? badges.find(x => x.id === id) : null; if (id && !b) return;
    editId = b ? b.id : null; $('knBT').textContent = b ? 'Ubah badge' : 'Tambah badge';
    bIn.value = b ? b.t : ''; warna = b ? b.c : badges.length % PAL.length; bDel.hidden = !b; bMsg.textContent = ''; bMsg.className = 'pl-msg';
    prev(); form.hidden = false; setTimeout(() => bIn.focus(), 80);
  }
  bIn.addEventListener('input', prev);
  sw.addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; warna = +b.dataset.i; prev(); });
  $('knBCancel').addEventListener('click', () => { form.hidden = true; });
  form.addEventListener('click', e => { if (e.target === form) form.hidden = true; });
  bIn.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); $('knBSave').click(); } });
  $('knBSave').addEventListener('click', () => {
    const t = bIn.value.trim();
    if (!t) { bMsg.textContent = 'Teks badge wajib diisi'; bMsg.className = 'pl-msg err'; bIn.focus(); return; }
    if (editId) {
      const b = badges.find(x => x.id === editId); if (!b) { form.hidden = true; return; }
      const lama = { t: b.t, c: b.c }; b.t = t; b.c = warna;
      if (!simpanB()) { b.t = lama.t; b.c = lama.c; bMsg.textContent = 'Penyimpanan penuh, perubahan tidak tersimpan'; bMsg.className = 'pl-msg err'; return; }
      form.hidden = true; renderB(); toast('Badge diperbarui ✓'); return;
    }
    badges.push({ id: 'b' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), t, c: warna, ts: Date.now() });
    if (!simpanB()) { badges.pop(); bMsg.textContent = 'Penyimpanan penuh, badge tidak tersimpan'; bMsg.className = 'pl-msg err'; return; }
    form.hidden = true; renderB(); toast('Badge ditambahkan ✓');
  });
  bDel.addEventListener('click', async () => {
    const b = badges.find(x => x.id === editId); if (!b) return;
    const ok = await konfirmasi('Hapus badge?', 'Badge "' + b.t + '" beserta catatannya akan dihapus.', 'Hapus'); if (ok !== true) return;
    badges = badges.filter(x => x !== b); simpanB(); try { localStorage.removeItem(KC + b.id); } catch (e) { /* abaikan */ }
    form.hidden = true; renderB(); toast('Badge dihapus ✓');
  });

  /* ---- ketuk badge: 1x = catatan, 3x = ubah / hapus, 5x = mode geser; tombol + = tambah ---- */
  let bTaps = 0, bT = null, bId = null;
  let mvEl = null, mvOff = null; /* mode geser: badge yang sedang digeser + pelepas listener */
  function kunciGeser() {
    if (!mvEl) return;
    const el = mvEl; mvEl = null; if (mvOff) { mvOff(); mvOff = null; }
    el.classList.remove('moving'); el.style.transform = ''; el.style.touchAction = ''; bWrap.classList.remove('geser');
    const urut = Array.prototype.map.call(bWrap.querySelectorAll('.kn-b'), n => n.dataset.id);
    const baru = urut.map(id => badges.find(x => x.id === id)).filter(Boolean);
    if (baru.length === badges.length) {
      const lama = badges.slice(); badges = baru;
      if (!simpanB()) { badges = lama; toast('Penyimpanan penuh, urutan tidak tersimpan'); }
      else toast('Posisi badge dikunci ✓');
    }
    renderB();
  }
  function mulaiGeser(id) {
    kunciGeser();
    const el = bWrap.querySelector('.kn-b[data-id="' + id + '"]'); if (!el) return;
    mvEl = el; el.classList.add('moving'); el.style.touchAction = 'none'; bWrap.classList.add('geser');
    toast('Mode geser aktif: seret badge, ketuk di luar untuk mengunci');
    let gx = 0, gy = 0, drag = false, lastSwap = 0;
    const down = e => { if (e.target !== el || (e.button != null && e.button > 0)) return; drag = true; gx = e.clientX; gy = e.clientY; try { el.setPointerCapture(e.pointerId); } catch (x) { /* abaikan */ } e.preventDefault(); };
    const move = e => {
      if (!drag) return;
      el.style.transform = 'translate(' + (e.clientX - gx) + 'px,' + (e.clientY - gy) + 'px) scale(1.08)';
      if (Date.now() - lastSwap < 140) return;
      el.style.pointerEvents = 'none';
      const t = document.elementFromPoint(e.clientX, e.clientY);
      el.style.pointerEvents = '';
      const tg = t && t.closest ? t.closest('.kn-b') : null;
      if (!tg || tg === el || tg.parentNode !== bWrap) return;
      const vis = el.getBoundingClientRect();
      const sesudah = !!(el.compareDocumentPosition(tg) & Node.DOCUMENT_POSITION_FOLLOWING);
      bWrap.insertBefore(el, sesudah ? tg.nextSibling : tg);
      el.style.transform = 'none';
      const nat = el.getBoundingClientRect();
      const dx = vis.left - nat.left, dy = vis.top - nat.top;
      gx = e.clientX - dx; gy = e.clientY - dy;
      el.style.transform = 'translate(' + dx + 'px,' + dy + 'px) scale(1.08)';
      lastSwap = Date.now();
    };
    const up = () => { if (!drag) return; drag = false; el.style.transform = ''; };
    const luar = e => { /* ketuk 1x di luar badge yang digeser = kunci */
      if (e.target === el) { e.stopPropagation(); e.preventDefault(); return; }
      e.stopPropagation(); e.preventDefault(); kunciGeser();
    };
    const noMenu = e => e.preventDefault();
    el.addEventListener('pointerdown', down); el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up); el.addEventListener('contextmenu', noMenu);
    setTimeout(() => { if (mvEl === el) document.addEventListener('click', luar, true); }, 0);
    mvOff = () => {
      el.removeEventListener('pointerdown', down); el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerup', up); el.removeEventListener('pointercancel', up); el.removeEventListener('contextmenu', noMenu);
      document.removeEventListener('click', luar, true);
    };
  }
  bWrap.addEventListener('click', e => {
    if (mvEl) return;
    if (e.target.closest('.kn-plus')) { bukaBForm(null); return; }
    const b = e.target.closest('.kn-b'); if (!b) return;
    const id = b.dataset.id; if (bId !== id) bTaps = 0;
    bId = id; bTaps++; clearTimeout(bT);
    if (bTaps >= 5) { bTaps = 0; mulaiGeser(id); return; }
    bT = setTimeout(() => { if (bTaps === 1) bukaCatatan(id); else if (bTaps === 3) bukaBForm(id); bTaps = 0; }, 380);
  });

  /* ---- halaman catatan badge ---- */
  const note = $('knNote'), ed = $('knEd'), tb = $('knTb'), fontBtn = $('knFont'), fontT = $('knFontT');
  const FONTS = [['Poppins', "'Poppins',system-ui,sans-serif"], ['Dosis', "'Dosis',system-ui,sans-serif"], ['Merriweather', "'Merriweather',Georgia,serif"], ['Playfair Display', "'Playfair Display',Georgia,serif"], ['Dancing Script', "'Dancing Script','Brush Script MT',cursive"], ['Caveat', "'Caveat','Comic Sans MS',cursive"], ['Pacifico', "'Pacifico','Brush Script MT',cursive"], ['Lobster', "'Lobster','Brush Script MT',cursive"], ['Satisfy', "'Satisfy','Brush Script MT',cursive"], ['Amatic SC', "'Amatic SC','Comic Sans MS',cursive"]];
  const fontM = document.createElement('div'); fontM.id = 'knFontM'; fontM.hidden = true; document.body.appendChild(fontM);
  let curId = null, saveT = null, saved = null;

  const pen = $('knPen');
  function setMode(on) { /* false = mode lihat (tidak bisa diketik), true = mode edit (bar alat tampil) */
    tutupFont(); if (!on) simpanC();
    note.classList.toggle('editing', on); tb.hidden = !on; pen.classList.toggle('on', on); pen.setAttribute('aria-label', on ? 'Selesai mengedit' : 'Edit catatan');
    ed.contentEditable = on ? 'true' : 'false';
    ed.dataset.ph = on ? 'Tulis skill spesifik untuk badge ini…' : 'Belum ada catatan. Ketuk ikon pensil untuk menulis.';
    if (on) { ed.focus(); const r = document.createRange(); r.selectNodeContents(ed); r.collapse(false); const s = getSelection(); s.removeAllRanges(); s.addRange(r); saved = r.cloneRange(); updTb(); }
    else { if (document.activeElement === ed) ed.blur(); saved = null; getSelection().removeAllRanges(); }
  }
  pen.addEventListener('click', () => setMode(!note.classList.contains('editing')));
  const simpanC = () => { clearTimeout(saveT); if (!curId) return; try { localStorage.setItem(KC + curId, ed.innerHTML); } catch (e) { toast('Penyimpanan penuh, catatan tidak tersimpan'); } };
  function bukaCatatan(id) {
    const b = badges.find(x => x.id === id); if (!b) return;
    curId = id; const pill = $('knNPill'); pill.textContent = b.t; pill.style.setProperty('--bc', rgb(b.c));
    ed.innerHTML = load(KC + id) || ''; setMode(false); note.hidden = false; ed.scrollTop = 0; saved = null; fontT.textContent = 'Poppins'; tutupFont(); updTb();
  }
  function tutupCatatan() { if (note.hidden) return; simpanC(); tutupFont(); note.hidden = true; curId = null; if (document.activeElement && document.activeElement.blur) document.activeElement.blur(); }
  $('knNBack').addEventListener('click', tutupCatatan);
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    if (!fontM.hidden) tutupFont(); else if (!note.hidden && $('cfm').hidden) tutupCatatan(); else if (!form.hidden && $('cfm').hidden) form.hidden = true;
  });

  /* simpan & pulihkan seleksi supaya tombol toolbar tidak menghilangkan pilihan teks */
  document.addEventListener('selectionchange', () => {
    if (note.hidden) return;
    const s = getSelection(); if (s.rangeCount && ed.contains(s.anchorNode)) { saved = s.getRangeAt(0).cloneRange(); updTb(); }
  });
  function pulih() {
    ed.focus({ preventScroll: true });
    const s = getSelection();
    if (saved && (!s.rangeCount || !ed.contains(s.anchorNode))) { s.removeAllRanges(); s.addRange(saved); }
  }
  const cmd = (c, v) => { try { document.execCommand('styleWithCSS', false, true); } catch (e) { /* abaikan */ } document.execCommand(c, false, v); };
  const inLi = () => { const s = getSelection(); if (!s.rangeCount) return null; let n = s.anchorNode; if (n && n.nodeType === 3) n = n.parentNode; const li = n && n.closest ? n.closest('li') : null; return li && ed.contains(li) ? li : null; };
  const listNow = () => { const li = inLi(); return li ? li.parentNode : null; };
  function bersih() {
    ed.querySelectorAll('ol.cl').forEach(o => o.classList.remove('cl'));
    ed.querySelectorAll('li.done').forEach(li => { if (!li.parentNode.classList.contains('cl')) li.classList.remove('done'); });
    ed.querySelectorAll('ul.cl').forEach(u => { if (u.getAttribute('class') === 'cl' || true) u.removeAttribute('style'); });
  }
  function jadikanCentang() {
    const s = getSelection(); if (!s.rangeCount) return;
    ed.querySelectorAll('ul').forEach(u => { let hit = false; try { hit = s.containsNode(u, true); } catch (e) { hit = false; } if (hit) u.classList.add('cl'); });
    const l = listNow(); if (l && l.tagName === 'UL') l.classList.add('cl');
  }
  function aksi(c) {
    pulih();
    if (c === 'ul') { const l = listNow(); if (l && l.tagName === 'UL' && l.classList.contains('cl')) { l.classList.remove('cl'); l.querySelectorAll('li.done').forEach(x => x.classList.remove('done')); } else cmd('insertUnorderedList'); }
    else if (c === 'ol') { cmd('insertOrderedList'); bersih(); }
    else if (c === 'cl') { const l = listNow(); if (l && l.tagName === 'UL' && l.classList.contains('cl')) { cmd('insertUnorderedList'); } else { if (!l || l.tagName !== 'UL') cmd('insertUnorderedList'); jadikanCentang(); } bersih(); }
    else cmd(c);
    ed.dispatchEvent(new Event('input', { bubbles: true })); updTb();
  }
  /* pointerdown dicegah supaya fokus & seleksi di editor tidak hilang */
  tb.addEventListener('pointerdown', e => { if (e.target.closest('button')) e.preventDefault(); });
  tb.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.id === 'knFont') { bukaFont(); return; }
    if (b.dataset.s) { pulih(); cmd('fontSize', b.dataset.s); ed.dispatchEvent(new Event('input', { bubbles: true })); updTb(); return; }
    if (b.dataset.c) aksi(b.dataset.c);
  });

  /* pilihan font (10 font) */
  FONTS.forEach(f => {
    const b = document.createElement('button'); b.type = 'button'; b.dataset.f = f[0]; b.style.fontFamily = f[1];
    b.innerHTML = '<span></span><svg class="ck" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12l5 5L20 7"/></svg>'; b.firstChild.textContent = f[0]; fontM.appendChild(b);
  });
  fontM.addEventListener('pointerdown', e => { if (e.target.closest('button')) e.preventDefault(); });
  fontM.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    pulih(); cmd('fontName', b.dataset.f); fontT.textContent = b.dataset.f; tutupFont(); ed.dispatchEvent(new Event('input', { bubbles: true })); updTb();
  });
  function tutupFont() { fontM.hidden = true; }
  function bukaFont() {
    if (!fontM.hidden) { tutupFont(); return; }
    [...fontM.children].forEach(b => b.classList.toggle('on', b.dataset.f === fontT.textContent));
    fontM.hidden = false;
    const r = fontBtn.getBoundingClientRect(), mw = fontM.offsetWidth;
    fontM.style.left = Math.max(8, Math.min(innerWidth - mw - 8, r.left)) + 'px'; fontM.style.top = (r.bottom + 6) + 'px';
  }
  document.addEventListener('click', e => { if (!fontM.hidden && !fontM.contains(e.target) && !fontBtn.contains(e.target)) tutupFont(); });
  ed.addEventListener('scroll', tutupFont, { passive: true });

  /* tanda tombol aktif sesuai posisi kursor / teks terpilih */
  function updTb() {
    if (note.hidden) return;
    const on = (sel, v) => { const b = tb.querySelector(sel); if (b) b.classList.toggle('on', !!v); };
    const q = c => { try { return document.queryCommandState(c); } catch (e) { return false; } };
    const inEd = (() => { const s = getSelection(); return s.rangeCount && ed.contains(s.anchorNode); })();
    on('[data-c="bold"]', inEd && q('bold')); on('[data-c="italic"]', inEd && q('italic')); on('[data-c="underline"]', inEd && q('underline'));
    on('[data-c="justifyLeft"]', inEd && q('justifyLeft')); on('[data-c="justifyCenter"]', inEd && q('justifyCenter')); on('[data-c="justifyRight"]', inEd && q('justifyRight'));
    const l = inEd ? listNow() : null, isCl = !!(l && l.tagName === 'UL' && l.classList.contains('cl'));
    on('[data-c="ul"]', l && l.tagName === 'UL' && !isCl); on('[data-c="ol"]', l && l.tagName === 'OL'); on('[data-c="cl"]', isCl);
    if (inEd) {
      let sz = '3'; try { sz = String(document.queryCommandValue('fontSize') || '3'); } catch (e) { /* abaikan */ }
      tb.querySelectorAll('#knSize button').forEach(b => b.classList.toggle('on', b.dataset.s === sz || (!/^[235]$/.test(sz) && b.dataset.s === '3')));
      try { const fn = String(document.queryCommandValue('fontName') || '').replace(/["']/g, '').split(',')[0].trim(); const f = FONTS.find(x => x[0].toLowerCase() === fn.toLowerCase()); fontT.textContent = f ? f[0] : 'Poppins'; } catch (e) { /* abaikan */ }
    }
  }

  /* centang: ketuk kotak di kiri item untuk mencentang; Enter di item selesai membuat item baru belum tercentang */
  ed.addEventListener('click', e => {
    const li = e.target.closest ? e.target.closest('li') : null;
    if (!li || !ed.contains(li) || !li.parentNode.classList.contains('cl')) return;
    if (e.clientX - li.getBoundingClientRect().left < 30) { e.preventDefault(); li.classList.toggle('done'); simpanC(); }
  });
  ed.addEventListener('input', e => {
    if (e.inputType === 'insertParagraph' || e.inputType === 'insertLineBreak') { const li = inLi(); if (li && li.classList.contains('done') && li.textContent === '') li.classList.remove('done'); }
    if (!ed.textContent && !ed.querySelector('li,img')) ed.innerHTML = '';
    clearTimeout(saveT); saveT = setTimeout(simpanC, 350);
  });
  ed.addEventListener('blur', simpanC);
  ed.addEventListener('paste', e => { e.preventDefault(); const t = (e.clipboardData || window.clipboardData).getData('text/plain'); if (t) document.execCommand('insertText', false, t); });
  window.addEventListener('pagehide', simpanC);
})();

/* ===== HUTANG (Energy > Keuangan): pil "Hutang orang" | "Hutang aku". Kotak pertama = tombol + (tambah).
   Ketuk 3x sebuah kotak = ubah / hapus. Isi kotak: nama, Rp, tanggal, catatan (tanpa batas karakter).
   Data: 'hutang' = { orang: [...], aku: [...] }, tiap item { id, n (nama), a (Rp), d (tanggal YYYY-MM-DD), c (catatan) }; 'hutang_tab' = pilihan pil */
(function () {
  const wrap = $('htWrap'), pill = $('htPill'), tabs = pill.querySelectorAll('button'), grid = $('htGrid');
  const form = $('htForm'), fT = $('htFT'), fNL = $('htFNL'), fN = $('htFN'), fA = $('htFA'), fD = $('htFD'), fC = $('htFC'), fM = $('htFM');
  const bDel = $('htFDel'), bSave = $('htFSave'), bCancel = $('htFCancel');
  const KEY = 'hutang', LBL = { orang: 'Hutang orang', aku: 'Hutang aku' };
  const BLN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  const fmt = n => new Intl.NumberFormat('id-ID').format(Math.round(n || 0));
  const uid = () => 'h' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
  const hari = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  const tglTxt = k => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(k || ''); return m ? (+m[3]) + ' ' + BLN[+m[2] - 1] + ' ' + m[1] : ''; };
  const tutup = () => load('saldo_tutup') === '1';
  const rpTxt = n => tutup() ? 'Rp ••••' : 'Rp ' + fmt(n);
  const el = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };

  let D = { orang: [], aku: [] }, tab = load('hutang_tab') === 'aku' ? 'aku' : 'orang', editId = null;
  try {
    const o = JSON.parse(load(KEY) || '{}');
    ['orang', 'aku'].forEach(k => {
      if (o && Array.isArray(o[k])) D[k] = o[k].filter(x => x && x.id).map(x => ({ id: String(x.id), n: typeof x.n === 'string' ? x.n : '', a: +x.a || 0, d: typeof x.d === 'string' ? x.d : '', c: typeof x.c === 'string' ? x.c : '' }));
    });
  } catch (e) { /* data rusak: mulai kosong */ }
  const simpan = () => { try { localStorage.setItem(KEY, JSON.stringify(D)); return true; } catch (e) { return false; } };

  function render() {
    wrap.dataset.t = tab; pill.dataset.sel = tab === 'aku' ? 1 : 0;
    tabs.forEach(b => { const on = b.dataset.h === tab; b.classList.toggle('on', on); b.setAttribute('aria-selected', on); });
    const arr = D[tab];
    $('htTL').textContent = 'Total ' + LBL[tab].toLowerCase() + ' · ' + arr.length + ' catatan';
    $('htTV').textContent = rpTxt(arr.reduce((s, x) => s + x.a, 0));
    grid.textContent = '';
    const add = el('button', 'ht-box ht-add'); add.type = 'button'; add.dataset.add = '1'; add.setAttribute('aria-label', 'Tambah ' + LBL[tab].toLowerCase());
    add.innerHTML = '<span class="ht-plus"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg></span>';
    add.appendChild(el('em', '', 'Tambah'));
    grid.appendChild(add);
    arr.forEach(x => {
      const b = el('div', 'ht-box'); b.dataset.id = x.id; b.setAttribute('role', 'button'); b.tabIndex = 0;
      b.setAttribute('aria-label', (x.n || 'Tanpa nama') + '. Ketuk 3x untuk ubah atau hapus');
      b.appendChild(el('b', 'ht-n', x.n || 'Tanpa nama'));
      b.appendChild(el('div', 'ht-a', rpTxt(x.a)));
      const t = tglTxt(x.d);
      if (t) { const d = el('div', 'ht-d'); d.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3v3M17 3v3M4 9h16"/><rect x="4" y="5" width="16" height="15" rx="2"/></svg>'; d.appendChild(el('span', '', t)); b.appendChild(d); }
      if (x.c) b.appendChild(el('p', 'ht-c', x.c));
      grid.appendChild(b);
    });
  }

  /* pil pilihan */
  tabs.forEach(b => b.addEventListener('click', () => { tab = b.dataset.h === 'aku' ? 'aku' : 'orang'; save('hutang_tab', tab); render(); }));

  /* kotak: + = tambah, ketuk 3x = ubah / hapus */
  let tapId = null, taps = 0, tapT = null;
  grid.addEventListener('click', e => {
    const b = e.target.closest('.ht-box'); if (!b) return;
    if (b.dataset.add) { buka(null); return; }
    const id = b.dataset.id;
    if (tapId !== id) { tapId = id; taps = 0; }
    taps++; clearTimeout(tapT);
    if (taps >= 3) { taps = 0; tapId = null; buka(id); return; }
    tapT = setTimeout(() => { taps = 0; tapId = null; }, 500);
  });
  grid.addEventListener('keydown', e => {
    if (e.key !== 'Enter') return;
    const b = e.target.closest('.ht-box'); if (b && !b.dataset.add) { e.preventDefault(); buka(b.dataset.id); }
  });

  /* form */
  const ukurC = () => { fC.style.height = 'auto'; fC.style.height = Math.max(fC.scrollHeight, 76) + 'px'; };
  const salah = t => { fM.textContent = t; fM.className = 'pl-msg err'; };
  function buka(id) {
    const x = id ? D[tab].find(v => v.id === id) : null; if (id && !x) return;
    editId = id; form.dataset.t = tab;
    fT.textContent = (x ? 'Ubah ' : 'Tambah ') + LBL[tab].toLowerCase();
    fNL.textContent = tab === 'orang' ? 'Nama orang yang berhutang padaku' : 'Hutang kepada siapa';
    fN.placeholder = tab === 'orang' ? 'Contoh: Budi' : 'Contoh: Bank / Teman';
    fN.value = x ? x.n : ''; fA.value = x && x.a ? fmt(x.a) : ''; fD.value = x ? x.d : hari(); fC.value = x ? x.c : '';
    bDel.hidden = !x; bDel.textContent = 'Hapus'; bDel.classList.remove('arm'); fM.textContent = ''; fM.className = 'pl-msg';
    form.hidden = false; ukurC(); setTimeout(() => fN.focus(), 80);
  }
  const tutupForm = () => { form.hidden = true; editId = null; };
  fA.addEventListener('input', () => { const d = fA.value.replace(/\D/g, '').replace(/^0+(?=\d)/, '').slice(0, 15); fA.value = d ? fmt(+d) : ''; });
  fC.addEventListener('input', ukurC);
  bCancel.addEventListener('click', tutupForm);
  form.addEventListener('click', e => { if (e.target === form) tutupForm(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !form.hidden) tutupForm(); });
  bSave.addEventListener('click', () => {
    const n = fN.value.trim(), a = parseInt(fA.value.replace(/\D/g, ''), 10) || 0;
    if (!n) { salah('Nama wajib diisi'); fN.focus(); return; }
    if (!a) { salah('Jumlah Rp wajib diisi'); fA.focus(); return; }
    const rec = { n, a, d: fD.value || '', c: fC.value.trim() };
    if (editId) {
      const x = D[tab].find(v => v.id === editId); if (!x) { tutupForm(); return; }
      const lama = Object.assign({}, x); Object.assign(x, rec);
      if (!simpan()) { Object.assign(x, lama); salah('Penyimpanan penuh, perubahan tidak tersimpan'); return; }
      toast('Hutang diperbarui ✓');
    } else {
      D[tab].unshift(Object.assign({ id: uid() }, rec));
      if (!simpan()) { D[tab].shift(); salah('Penyimpanan penuh, hutang tidak tersimpan'); return; }
      toast('Hutang ditambahkan ✓');
    }
    tutupForm(); render();
  });
  /* hapus: ketuk 1x = minta konfirmasi, ketuk lagi = hapus */
  bDel.addEventListener('click', () => {
    if (!editId) return;
    if (!bDel.classList.contains('arm')) { bDel.classList.add('arm'); bDel.textContent = 'Yakin hapus?'; return; }
    const i = D[tab].findIndex(v => v.id === editId); if (i < 0) { tutupForm(); return; }
    const x = D[tab].splice(i, 1)[0];
    if (!simpan()) { D[tab].splice(i, 0, x); salah('Penyimpanan penuh, tidak bisa menghapus'); return; }
    tutupForm(); render(); toast('Hutang dihapus');
  });

  /* ikon mata di kartu saldo juga menyembunyikan angka hutang */
  const eye = $('sdEye'); if (eye) eye.addEventListener('click', () => setTimeout(render, 0));
  render();
})();

/* ===== READLIST BUKU (Galery kotak 3): tambah buku (cover, judul, penulis, status baca), urutkan, edit/hapus lewat titik tiga di pojok kartu.
   Ketuk buku = halaman detail (cover besar, judul, penulis & status, sinopsis/catatan: ketuk 3x = edit, ketuk 1x di luar = kunci).
   Data: 'buku' = [{ id, t (judul), p (penulis), s (status 0/1/2), c (cover), d (sinopsis/catatan), ts }]; urutan: 'buku_sort'.
   Sekali jalan: isi lama 'koleksi3' (kotak 3 versi Koleksi) disalin ke sini kalau 'buku' belum ada. ===== */
(function () {
  const wrap = $('bkWrap'), grid = $('bkGrid'), form = $('bkForm'), page = $('bkPage'), KEY = 'buku';
  const pop = id => { const d = document.createElement('div'); d.id = id; d.hidden = true; document.body.appendChild(d); return d; };
  const sortO = pop('bkSortM'), menu = pop('bkMenu');
  const ic = d => '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="' + d + '"/></svg>';
  const UP = 'M12 19V5M5 12l7-7 7 7', DOWN = 'M12 5v14M19 12l-7 7-7-7', CHECK = 'M5 12l5 5L20 7';
  const BOOK = 'M4 19.5A2.5 2.5 0 0 1 6.5 17H20M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z';
  const ST = ['Belum dibaca', 'Sedang dibaca', 'Sudah selesai'];
  const CRIT = {
    baru: ['Terbaru', 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 7v5l3 2', 'desc'],
    judul: ['Judul', 'M4 7V5h16v2M12 5v14M9 19h6', 'asc'],
    penulis: ['Penulis', 'M4 21v-2a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z', 'asc'],
    status: ['Status baca', 'M5 12l5 5L20 7', 'asc']
  };
  let data = [], srt = { k: 'baru', d: 'desc' }, cover = '', cvBad = false, editId = null, cur = null, menuId = null, stSel = 0;
  const valid = x => x && x.id && typeof x.t === 'string';
  const rapi = x => ({ id: String(x.id), t: x.t, p: typeof x.p === 'string' ? x.p : '', s: (x.s | 0) >= 0 && (x.s | 0) < 3 ? (x.s | 0) : 0, c: typeof x.c === 'string' ? x.c : '', d: typeof x.d === 'string' ? x.d : '', ts: +x.ts || 0 });
  const simpan = () => { try { localStorage.setItem(KEY, JSON.stringify(data)); return true; } catch (e) { return false; } };
  try {
    const raw = load(KEY);
    if (raw !== null) { const a = JSON.parse(raw); if (Array.isArray(a)) data = a.filter(valid).map(rapi); }
    else {
      const o = JSON.parse(load('koleksi3') || '[]');
      if (Array.isArray(o) && o.length) { data = o.filter(valid).map(x => rapi({ id: x.id, t: x.t, c: x.c, d: x.k, ts: x.ts })); simpan(); }
    }
  } catch (e) { /* data rusak: mulai kosong */ }
  try { const s = JSON.parse(load('buku_sort') || 'null'); if (s && CRIT[s.k] && (s.d === 'asc' || s.d === 'desc')) srt = { k: s.k, d: s.d }; } catch (e) {}
  const cmp = (a, b, k) => String(a[k] || '').localeCompare(String(b[k] || ''), 'id', { sensitivity: 'base' });
  const urut = () => {
    const m = srt.d === 'asc' ? 1 : -1;
    return data.slice().sort((a, b) => {
      if (srt.k === 'baru') return m * (a.ts - b.ts);
      if (srt.k === 'judul') return m * cmp(a, b, 't');
      if (srt.k === 'status') return m * (a.s - b.s) || cmp(a, b, 't');
      if (!a.p !== !b.p) return a.p ? -1 : 1; /* tanpa penulis selalu di akhir */
      return m * cmp(a, b, 'p') || cmp(a, b, 't');
    });
  };
  const hasil = () => srt.k === 'baru' ? (srt.d === 'desc' ? 'terbaru dulu' : 'terlama dulu')
    : srt.k === 'status' ? (srt.d === 'asc' ? 'belum dibaca dulu' : 'selesai dulu')
    : (srt.d === 'asc' ? 'A–Z' : 'Z–A');
  function sortUI() {
    $('bkSortI').innerHTML = ic(CRIT[srt.k][1]); $('bkSortT').textContent = CRIT[srt.k][0];
    const d = $('bkSortD'); d.innerHTML = ic(srt.d === 'asc' ? UP : DOWN); d.title = hasil(); d.setAttribute('aria-label', 'Arah urutan: ' + hasil() + '. Ketuk untuk membalik');
    $('bkCnt').textContent = data.length + ' buku · ' + hasil();
  }
  function render() {
    sortUI(); grid.textContent = '';
    if (!data.length) { const e = document.createElement('div'); e.className = 'pl-empty'; e.textContent = 'Belum ada buku. Ketuk tombol + untuk menambah.'; grid.appendChild(e); return; }
    const f = document.createDocumentFragment();
    urut().forEach(x => {
      const r = document.createElement('div'); r.className = 'fm-it bk-it'; r.dataset.id = x.id; r.tabIndex = 0; r.setAttribute('role', 'button');
      const cv = document.createElement('div'); cv.className = 'fm-cv'; cv.innerHTML = ic(BOOK);
      if (x.c) { const im = document.createElement('img'); im.alt = ''; im.referrerPolicy = 'no-referrer'; im.draggable = false; im.addEventListener('error', () => im.remove()); im.src = x.c; cv.appendChild(im); }
      const st = document.createElement('span'); st.className = 'bk-st s' + x.s; st.textContent = ST[x.s]; cv.appendChild(st);
      const tx = document.createElement('div'); tx.className = 'fm-tx';
      const t = document.createElement('b'); t.textContent = x.t; const p = document.createElement('small'); p.textContent = x.p || '';
      tx.append(t, p);
      const d = document.createElement('button'); d.type = 'button'; d.className = 'fm-dot'; d.setAttribute('aria-label', 'Menu buku');
      d.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg>';
      r.append(cv, tx, d); f.appendChild(r);
    });
    grid.appendChild(f);
  }
  const tutupPop = () => { menu.hidden = true; sortO.hidden = true; menuId = null; };
  window.bkTampil = n => { tutupPop(); wrap.hidden = n !== 2; if (n === 2) render(); else { form.hidden = true; tutupDetail(); } };

  /* ---- menu titik tiga: Edit buku / Hapus buku (hapus tetap lewat dialog konfirmasi) ---- */
  menu.innerHTML = '<button type="button" data-a="edit">' + ic('M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z') + 'Edit buku</button><button type="button" data-a="hapus">' + ic('M4 7h16M10 11v6M14 11v6M6 7l1 12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-12M9 7V4h6v3') + 'Hapus buku</button>';
  grid.addEventListener('click', e => {
    const r = e.target.closest('.fm-it'); if (!r) return;
    const dot = e.target.closest('.fm-dot');
    if (!dot) { bukaDetail(r.dataset.id); return; }
    e.stopPropagation();
    if (!menu.hidden && menuId === r.dataset.id) { tutupPop(); return; }
    sortO.hidden = true; menuId = r.dataset.id; menu.hidden = false;
    const b = dot.getBoundingClientRect(), mw = menu.offsetWidth, mh = menu.offsetHeight;
    menu.style.left = Math.max(8, Math.min(innerWidth - mw - 8, b.right - mw)) + 'px';
    menu.style.top = (b.bottom + mh + 12 > innerHeight ? b.top - mh - 4 : b.bottom + 4) + 'px';
  });
  grid.addEventListener('keydown', e => { const r = e.target.closest('.fm-it'); if (r && e.target === r && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); bukaDetail(r.dataset.id); } });
  menu.addEventListener('click', async e => {
    const bt = e.target.closest('button'); if (!bt) return;
    const x = data.find(y => y.id === menuId); tutupPop(); if (!x) return;
    if (bt.dataset.a === 'edit') { bukaForm(x); return; }
    const ok = await konfirmasi('Hapus buku?', x.t + (x.p ? ' — ' + x.p : '') + '\nakan dihapus dari readlist.', 'Hapus');
    if (ok !== true) return;
    data = data.filter(y => y !== x); simpan(); render(); toast('Buku dihapus ✓');
  });

  /* ---- urutkan: kriteria (Terbaru / Judul / Penulis / Status baca) + arah ---- */
  const simpanSort = () => save('buku_sort', JSON.stringify(srt));
  $('bkSortC').addEventListener('click', e => {
    e.stopPropagation();
    if (!sortO.hidden) { sortO.hidden = true; return; }
    menu.hidden = true; sortO.textContent = '';
    Object.keys(CRIT).forEach(k => {
      const b = document.createElement('button'); b.type = 'button'; b.dataset.k = k; b.className = k === srt.k ? 'on' : '';
      b.innerHTML = ic(CRIT[k][1]) + '<span></span><svg class="ck" viewBox="0 0 24 24" aria-hidden="true"><path d="' + CHECK + '"/></svg>';
      b.querySelector('span').textContent = CRIT[k][0]; sortO.appendChild(b);
    });
    sortO.hidden = false;
    const r = $('bkSortC').parentNode.getBoundingClientRect(), mw = sortO.offsetWidth;
    sortO.style.left = Math.max(8, Math.min(innerWidth - mw - 8, r.right - mw)) + 'px'; sortO.style.top = (r.bottom + 6) + 'px';
  });
  sortO.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.k !== srt.k) srt = { k: b.dataset.k, d: CRIT[b.dataset.k][2] };
    simpanSort(); sortO.hidden = true; render();
  });
  $('bkSortD').addEventListener('click', () => { srt.d = srt.d === 'asc' ? 'desc' : 'asc'; simpanSort(); render(); });
  document.addEventListener('click', e => { if ((!menu.hidden && !menu.contains(e.target)) || (!sortO.hidden && !sortO.contains(e.target))) tutupPop(); });
  $('galBody').addEventListener('scroll', tutupPop, { passive: true });

  /* ---- form tambah / edit buku ---- */
  const iT = $('bkT'), iP = $('bkP'), iCv = $('bkCvUrl'), img = $('bkCvImg'), ph = $('bkCvPh'), msg = $('bkMsg'), seg = $('bkSeg');
  const okUrl = v => /^https?:\/\/\S+$/i.test(v);
  function pesan(t, err) { msg.textContent = t || ''; msg.className = 'pl-msg' + (err ? ' err' : ''); }
  function pasangSt(s) { stSel = s; seg.querySelectorAll('button').forEach(b => b.classList.toggle('on', +b.dataset.s === s)); }
  seg.addEventListener('click', e => { const b = e.target.closest('button'); if (b) pasangSt(+b.dataset.s); });
  function pratinjau(src) { cvBad = false; img.hidden = !src; ph.hidden = !!src; $('bkCvClr').hidden = !src; if (src) img.src = src; else img.removeAttribute('src'); }
  img.addEventListener('error', () => { if (img.getAttribute('src')) { cvBad = true; img.hidden = true; ph.hidden = false; pesan('Cover: ' + alasanLink(img.getAttribute('src'), 'foto'), true); } });
  img.addEventListener('load', () => { cvBad = false; if (msg.classList.contains('err') && /Cover/.test(msg.textContent)) pesan(''); });
  function bukaForm(x) {
    editId = x ? x.id : null; $('bkFormT').textContent = x ? 'Edit buku' : 'Tambah buku';
    cover = x ? (x.c || '') : ''; cvBad = false;
    iT.value = x ? x.t : ''; iP.value = x ? (x.p || '') : ''; pasangSt(x ? x.s : 0);
    iCv.value = /^https?:/i.test(cover) ? cover : ''; pratinjau(cover); pesan('');
    form.hidden = false; setTimeout(() => iT.focus(), 80);
  }
  $('bkAdd').addEventListener('click', () => bukaForm(null));
  $('bkCancel').addEventListener('click', () => { form.hidden = true; });
  form.addEventListener('click', e => { if (e.target === form) form.hidden = true; });
  $('bkCvClr').addEventListener('click', () => { cover = ''; iCv.value = ''; pratinjau(''); pesan(''); });
  $('bkCvBtn').addEventListener('click', () => $('bkFile').click());
  $('bkFile').addEventListener('change', () => {
    const f = $('bkFile').files[0]; $('bkFile').value = ''; if (!f) return;
    const url = URL.createObjectURL(f), im = new Image();
    im.onload = () => {
      const k = Math.min(1, 640 / Math.max(im.naturalWidth, im.naturalHeight)), c = document.createElement('canvas');
      c.width = Math.round(im.naturalWidth * k); c.height = Math.round(im.naturalHeight * k);
      const g = c.getContext('2d'); g.fillStyle = '#0b0d1a'; g.fillRect(0, 0, c.width, c.height); g.drawImage(im, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url); cover = c.toDataURL('image/jpeg', .82); iCv.value = ''; pratinjau(cover); pesan('');
    };
    im.onerror = () => { URL.revokeObjectURL(url); pesan('Gambar tidak bisa dibaca', true); };
    im.src = url;
  });
  iCv.addEventListener('input', () => { const v = iCv.value.trim(); cover = okUrl(v) ? v : ''; pratinjau(cover); });
  $('bkSave').addEventListener('click', () => {
    const t = iT.value.trim(), p = iP.value.trim();
    if (!t) { pesan('Judul buku wajib diisi', true); iT.focus(); return; }
    if (iCv.value.trim() && !okUrl(iCv.value.trim())) { pesan('Link cover harus diawali http:// atau https://', true); iCv.focus(); return; }
    if (cvBad) { pesan('Cover tidak bisa dimuat, ganti atau kosongkan', true); return; }
    if (editId) {
      const x = data.find(z => z.id === editId); if (!x) { form.hidden = true; return; }
      const lama = Object.assign({}, x); Object.assign(x, { t, p, s: stSel, c: cover });
      if (!simpan()) { Object.assign(x, lama); pesan('Penyimpanan penuh, perubahan tidak tersimpan', true); return; }
      form.hidden = true; render(); if (cur === x.id) isi(); toast('Perubahan tersimpan ✓'); return;
    }
    data.push({ id: 'b' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), t, p, s: stSel, c: cover, d: '', ts: Date.now() });
    if (!simpan()) { data.pop(); pesan('Penyimpanan penuh, buku tidak tersimpan', true); return; }
    form.hidden = true; render(); toast('Buku ditambahkan ✓');
  });
  [iT, iP, iCv].forEach(i => i.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); $('bkSave').click(); } }));

  /* ---- halaman detail: cover besar, judul, penulis & status, sinopsis/catatan (ketuk 3x edit, ketuk 1x di luar kunci) ---- */
  const nm = $('bkNm'), pn = $('bkPn'), sp = $('bkSt'), desc = $('bkDesc'), dw = $('bkDw'), hero = $('bkHero'), himg = $('bkHimg'), hbg = $('bkHbg');
  let dEdit = false, dTaps = 0, dT = null;
  const ukur = () => { desc.style.height = 'auto'; desc.style.height = Math.max(desc.scrollHeight, 44) + 'px'; };
  himg.addEventListener('error', () => { if (himg.getAttribute('src')) hero.classList.add('kosong'); });
  function isi() {
    const x = data.find(z => z.id === cur); if (!x) { tutupDetail(); return; }
    nm.textContent = x.t; pn.textContent = x.p || ''; pn.hidden = !x.p;
    sp.textContent = ST[x.s]; sp.className = 'fm-yr bk-sp s' + x.s;
    if (!dEdit) { desc.value = x.d || ''; ukur(); }
    hero.classList.toggle('kosong', !x.c);
    if (x.c) { if (himg.dataset.c !== x.c) { himg.dataset.c = x.c; himg.src = x.c; hbg.style.backgroundImage = 'url(' + JSON.stringify(x.c) + ')'; } }
    else { himg.removeAttribute('src'); delete himg.dataset.c; hbg.style.backgroundImage = ''; }
  }
  function bukaDetail(id) { cur = id; page.hidden = false; $('bkBody').scrollTop = 0; isi(); requestAnimationFrame(ukur); }
  function kunciDesc() {
    if (!dEdit) return; dEdit = false; page.classList.remove('editing'); desc.readOnly = true; desc.tabIndex = -1; desc.blur();
    const x = data.find(z => z.id === cur); if (x) { x.d = desc.value.trim(); desc.value = x.d; if (!simpan()) toast('Penyimpanan penuh, catatan tidak tersimpan'); }
    ukur();
  }
  function tutupDetail() { kunciDesc(); page.hidden = true; cur = null; }
  $('bkBack').addEventListener('click', tutupDetail);
  desc.addEventListener('input', () => { ukur(); const x = data.find(z => z.id === cur); if (x) { x.d = desc.value; simpan(); } });
  dw.addEventListener('click', () => {
    if (dEdit) return; dTaps++; clearTimeout(dT);
    if (dTaps >= 3) { dTaps = 0; dEdit = true; page.classList.add('editing'); desc.readOnly = false; desc.tabIndex = 0; desc.focus(); const n = desc.value.length; try { desc.setSelectionRange(n, n); } catch (e) { /* abaikan */ } }
    else dT = setTimeout(() => { dTaps = 0; }, 500);
  });
  document.addEventListener('click', e => { if (!dEdit) return; const p = e.composedPath ? e.composedPath() : []; if (!p.includes(dw)) kunciDesc(); });
  window.addEventListener('resize', () => { if (!page.hidden) ukur(); });
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    if (!menu.hidden || !sortO.hidden) tutupPop();
    else if (!form.hidden && $('cfm').hidden) form.hidden = true;
    else if (!page.hidden && $('cfm').hidden) tutupDetail();
  });
})();

/* ===== TEMPAT FAVORIT (Galery kotak 4): tambah tempat (cover, nama tempat, wilayah → kota → daerah), urutkan, edit/hapus lewat titik tiga.
   Ketuk tempat = halaman detail (cover besar, nama tempat, rantai wilayah dari luas sampai spesifik, deskripsi: ketuk 3x = edit, ketuk 1x di luar = kunci).
   Data: 'tempat' = [{ id, t (nama tempat), w (provinsi/wilayah), k (kota/kabupaten), a (daerah/kecamatan), c (cover), d (deskripsi), ts }]; urutan: 'tempat_sort'.
   Sekali jalan: isi lama 'koleksi4' (kotak 4 versi Koleksi) disalin ke sini kalau 'tempat' belum ada. ===== */
(function () {
  const wrap = $('tpWrap'), grid = $('tpGrid'), form = $('tpForm'), page = $('tpPage'), KEY = 'tempat';
  const pop = id => { const d = document.createElement('div'); d.id = id; d.hidden = true; document.body.appendChild(d); return d; };
  const sortO = pop('tpSortM'), menu = pop('tpMenu');
  const ic = d => '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="' + d + '"/></svg>';
  const UP = 'M12 19V5M5 12l7-7 7 7', DOWN = 'M12 5v14M19 12l-7 7-7-7', CHECK = 'M5 12l5 5L20 7';
  const PIN = 'M12 22s7-6.2 7-12a7 7 0 1 0-14 0c0 5.8 7 12 7 12zM12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z';
  const CRIT = {
    baru: ['Terbaru', 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 7v5l3 2', 'desc'],
    nama: ['Nama tempat', 'M4 7V5h16v2M12 5v14M9 19h6', 'asc'],
    wilayah: ['Wilayah', 'M3 6l6-3 6 3 6-3v15l-6 3-6-3-6 3zM9 3v15M15 6v15', 'asc'],
    kota: ['Kota', 'M3 21h18M5 21V8l7-4 7 4v13M9 21v-6h6v6', 'asc']
  };
  let data = [], srt = { k: 'baru', d: 'desc' }, cover = '', cvBad = false, editId = null, cur = null, menuId = null;
  const valid = x => x && x.id && typeof x.t === 'string';
  const s = v => typeof v === 'string' ? v : '';
  const rapi = x => ({ id: String(x.id), t: x.t, w: s(x.w), k: s(x.k), a: s(x.a), c: s(x.c), d: s(x.d), ts: +x.ts || 0 });
  const simpan = () => { try { localStorage.setItem(KEY, JSON.stringify(data)); return true; } catch (e) { return false; } };
  try {
    const raw = load(KEY);
    if (raw !== null) { const a = JSON.parse(raw); if (Array.isArray(a)) data = a.filter(valid).map(rapi); }
    else {
      const o = JSON.parse(load('koleksi4') || '[]');
      if (Array.isArray(o) && o.length) { data = o.filter(valid).map(x => rapi({ id: x.id, t: x.t, c: x.c, d: x.k, ts: x.ts })); simpan(); }
    }
  } catch (e) { /* data rusak: mulai kosong */ }
  try { const z = JSON.parse(load('tempat_sort') || 'null'); if (z && CRIT[z.k] && (z.d === 'asc' || z.d === 'desc')) srt = { k: z.k, d: z.d }; } catch (e) {}
  const cmp = (a, b, k) => String(a[k] || '').localeCompare(String(b[k] || ''), 'id', { sensitivity: 'base' });
  const rantai = x => [x.w, x.k, x.a].filter(Boolean); /* dari wilayah luas ke yang spesifik */
  const urut = () => {
    const m = srt.d === 'asc' ? 1 : -1;
    return data.slice().sort((a, b) => {
      if (srt.k === 'baru') return m * (a.ts - b.ts);
      if (srt.k === 'nama') return m * cmp(a, b, 't');
      const kk = srt.k === 'wilayah' ? 'w' : 'k';
      if (!a[kk] !== !b[kk]) return a[kk] ? -1 : 1; /* tanpa wilayah / kota selalu di akhir */
      if (kk === 'w') return m * cmp(a, b, 'w') || cmp(a, b, 'k') || cmp(a, b, 'a') || cmp(a, b, 't');
      return m * cmp(a, b, 'k') || cmp(a, b, 'a') || cmp(a, b, 't');
    });
  };
  const hasil = () => srt.k === 'baru' ? (srt.d === 'desc' ? 'terbaru dulu' : 'terlama dulu') : (srt.d === 'asc' ? 'A–Z' : 'Z–A');
  function sortUI() {
    $('tpSortI').innerHTML = ic(CRIT[srt.k][1]); $('tpSortT').textContent = CRIT[srt.k][0];
    const d = $('tpSortD'); d.innerHTML = ic(srt.d === 'asc' ? UP : DOWN); d.title = hasil(); d.setAttribute('aria-label', 'Arah urutan: ' + hasil() + '. Ketuk untuk membalik');
    $('tpCnt').textContent = data.length + ' tempat · ' + hasil();
  }
  function render() {
    sortUI(); grid.textContent = '';
    if (!data.length) { const e = document.createElement('div'); e.className = 'pl-empty'; e.textContent = 'Belum ada tempat favorit. Ketuk tombol + untuk menambah.'; grid.appendChild(e); return; }
    const f = document.createDocumentFragment();
    urut().forEach(x => {
      const r = document.createElement('div'); r.className = 'fm-it tp-it'; r.dataset.id = x.id; r.tabIndex = 0; r.setAttribute('role', 'button');
      const cv = document.createElement('div'); cv.className = 'fm-cv'; cv.innerHTML = ic(PIN);
      if (x.c) { const im = document.createElement('img'); im.alt = ''; im.referrerPolicy = 'no-referrer'; im.draggable = false; im.addEventListener('error', () => im.remove()); im.src = x.c; cv.appendChild(im); }
      const tx = document.createElement('div'); tx.className = 'fm-tx';
      const t = document.createElement('b'); t.textContent = x.t;
      const w = document.createElement('small'); w.className = 'tp-w'; w.textContent = rantai(x).join(' › ');
      tx.append(t, w);
      const d = document.createElement('button'); d.type = 'button'; d.className = 'fm-dot'; d.setAttribute('aria-label', 'Menu tempat');
      d.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg>';
      r.append(cv, tx, d); f.appendChild(r);
    });
    grid.appendChild(f);
  }
  const tutupPop = () => { menu.hidden = true; sortO.hidden = true; menuId = null; };
  window.tpTampil = n => { tutupPop(); wrap.hidden = n !== 3; if (n === 3) render(); else { form.hidden = true; tutupDetail(); } };

  /* ---- menu titik tiga: Edit tempat / Hapus tempat (hapus tetap lewat dialog konfirmasi) ---- */
  menu.innerHTML = '<button type="button" data-a="edit">' + ic('M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z') + 'Edit tempat</button><button type="button" data-a="hapus">' + ic('M4 7h16M10 11v6M14 11v6M6 7l1 12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-12M9 7V4h6v3') + 'Hapus tempat</button>';
  grid.addEventListener('click', e => {
    const r = e.target.closest('.fm-it'); if (!r) return;
    const dot = e.target.closest('.fm-dot');
    if (!dot) { bukaDetail(r.dataset.id); return; }
    e.stopPropagation();
    if (!menu.hidden && menuId === r.dataset.id) { tutupPop(); return; }
    sortO.hidden = true; menuId = r.dataset.id; menu.hidden = false;
    const b = dot.getBoundingClientRect(), mw = menu.offsetWidth, mh = menu.offsetHeight;
    menu.style.left = Math.max(8, Math.min(innerWidth - mw - 8, b.right - mw)) + 'px';
    menu.style.top = (b.bottom + mh + 12 > innerHeight ? b.top - mh - 4 : b.bottom + 4) + 'px';
  });
  grid.addEventListener('keydown', e => { const r = e.target.closest('.fm-it'); if (r && e.target === r && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); bukaDetail(r.dataset.id); } });
  menu.addEventListener('click', async e => {
    const bt = e.target.closest('button'); if (!bt) return;
    const x = data.find(y => y.id === menuId); tutupPop(); if (!x) return;
    if (bt.dataset.a === 'edit') { bukaForm(x); return; }
    const ok = await konfirmasi('Hapus tempat?', x.t + (rantai(x).length ? ' (' + rantai(x).join(' › ') + ')' : '') + '\nakan dihapus dari tempat favorit.', 'Hapus');
    if (ok !== true) return;
    data = data.filter(y => y !== x); simpan(); render(); toast('Tempat dihapus ✓');
  });

  /* ---- urutkan: kriteria (Terbaru / Nama tempat / Wilayah / Kota) + arah ---- */
  const simpanSort = () => save('tempat_sort', JSON.stringify(srt));
  $('tpSortC').addEventListener('click', e => {
    e.stopPropagation();
    if (!sortO.hidden) { sortO.hidden = true; return; }
    menu.hidden = true; sortO.textContent = '';
    Object.keys(CRIT).forEach(k => {
      const b = document.createElement('button'); b.type = 'button'; b.dataset.k = k; b.className = k === srt.k ? 'on' : '';
      b.innerHTML = ic(CRIT[k][1]) + '<span></span><svg class="ck" viewBox="0 0 24 24" aria-hidden="true"><path d="' + CHECK + '"/></svg>';
      b.querySelector('span').textContent = CRIT[k][0]; sortO.appendChild(b);
    });
    sortO.hidden = false;
    const r = $('tpSortC').parentNode.getBoundingClientRect(), mw = sortO.offsetWidth;
    sortO.style.left = Math.max(8, Math.min(innerWidth - mw - 8, r.right - mw)) + 'px'; sortO.style.top = (r.bottom + 6) + 'px';
  });
  sortO.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.k !== srt.k) srt = { k: b.dataset.k, d: CRIT[b.dataset.k][2] };
    simpanSort(); sortO.hidden = true; render();
  });
  $('tpSortD').addEventListener('click', () => { srt.d = srt.d === 'asc' ? 'desc' : 'asc'; simpanSort(); render(); });
  document.addEventListener('click', e => { if ((!menu.hidden && !menu.contains(e.target)) || (!sortO.hidden && !sortO.contains(e.target))) tutupPop(); });
  $('galBody').addEventListener('scroll', tutupPop, { passive: true });

  /* ---- form tambah / edit tempat ---- */
  const iT = $('tpT'), iW = $('tpW'), iK = $('tpK'), iA = $('tpA'), iCv = $('tpCvUrl'), img = $('tpCvImg'), ph = $('tpCvPh'), msg = $('tpMsg');
  const okUrl = v => /^https?:\/\/\S+$/i.test(v);
  function pesan(t, err) { msg.textContent = t || ''; msg.className = 'pl-msg' + (err ? ' err' : ''); }
  function pratinjau(src) { cvBad = false; img.hidden = !src; ph.hidden = !!src; $('tpCvClr').hidden = !src; if (src) img.src = src; else img.removeAttribute('src'); }
  img.addEventListener('error', () => { if (img.getAttribute('src')) { cvBad = true; img.hidden = true; ph.hidden = false; pesan('Cover: ' + alasanLink(img.getAttribute('src'), 'foto'), true); } });
  img.addEventListener('load', () => { cvBad = false; if (msg.classList.contains('err') && /Cover/.test(msg.textContent)) pesan(''); });
  /* saran isian dari wilayah / kota / daerah yang pernah ditulis, supaya penulisannya konsisten */
  function saran() {
    [['tpDlW', 'w'], ['tpDlK', 'k'], ['tpDlA', 'a']].forEach(p => {
      const dl = $(p[0]); dl.textContent = '';
      Array.from(new Set(data.map(x => x[p[1]]).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'id', { sensitivity: 'base' })).forEach(v => { const o = document.createElement('option'); o.value = v; dl.appendChild(o); });
    });
  }
  function bukaForm(x) {
    editId = x ? x.id : null; $('tpFormT').textContent = x ? 'Edit tempat' : 'Tambah tempat';
    cover = x ? (x.c || '') : ''; cvBad = false; saran();
    iT.value = x ? x.t : ''; iW.value = x ? x.w : ''; iK.value = x ? x.k : ''; iA.value = x ? x.a : '';
    iCv.value = /^https?:/i.test(cover) ? cover : ''; pratinjau(cover); pesan('');
    form.hidden = false; setTimeout(() => iT.focus(), 80);
  }
  $('tpAdd').addEventListener('click', () => bukaForm(null));
  $('tpCancel').addEventListener('click', () => { form.hidden = true; });
  form.addEventListener('click', e => { if (e.target === form) form.hidden = true; });
  $('tpCvClr').addEventListener('click', () => { cover = ''; iCv.value = ''; pratinjau(''); pesan(''); });
  $('tpCvBtn').addEventListener('click', () => $('tpFile').click());
  $('tpFile').addEventListener('change', () => {
    const f = $('tpFile').files[0]; $('tpFile').value = ''; if (!f) return;
    const url = URL.createObjectURL(f), im = new Image();
    im.onload = () => {
      const k = Math.min(1, 800 / Math.max(im.naturalWidth, im.naturalHeight)), c = document.createElement('canvas');
      c.width = Math.round(im.naturalWidth * k); c.height = Math.round(im.naturalHeight * k);
      const g = c.getContext('2d'); g.fillStyle = '#0b0d1a'; g.fillRect(0, 0, c.width, c.height); g.drawImage(im, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url); cover = c.toDataURL('image/jpeg', .82); iCv.value = ''; pratinjau(cover); pesan('');
    };
    im.onerror = () => { URL.revokeObjectURL(url); pesan('Gambar tidak bisa dibaca', true); };
    im.src = url;
  });
  iCv.addEventListener('input', () => { const v = iCv.value.trim(); cover = okUrl(v) ? v : ''; pratinjau(cover); });
  $('tpSave').addEventListener('click', () => {
    const t = iT.value.trim(), w = iW.value.trim(), k = iK.value.trim(), a = iA.value.trim();
    if (!t) { pesan('Nama tempat wajib diisi', true); iT.focus(); return; }
    if (iCv.value.trim() && !okUrl(iCv.value.trim())) { pesan('Link cover harus diawali http:// atau https://', true); iCv.focus(); return; }
    if (cvBad) { pesan('Cover tidak bisa dimuat, ganti atau kosongkan', true); return; }
    if (editId) {
      const x = data.find(z => z.id === editId); if (!x) { form.hidden = true; return; }
      const lama = Object.assign({}, x); Object.assign(x, { t, w, k, a, c: cover });
      if (!simpan()) { Object.assign(x, lama); pesan('Penyimpanan penuh, perubahan tidak tersimpan', true); return; }
      form.hidden = true; render(); if (cur === x.id) isi(); toast('Perubahan tersimpan ✓'); return;
    }
    data.push({ id: 't' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), t, w, k, a, c: cover, d: '', ts: Date.now() });
    if (!simpan()) { data.pop(); pesan('Penyimpanan penuh, tempat tidak tersimpan', true); return; }
    form.hidden = true; render(); toast('Tempat ditambahkan ✓');
  });
  [iT, iW, iK, iA, iCv].forEach(i => i.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); $('tpSave').click(); } }));

  /* ---- halaman detail: cover besar, nama tempat, rantai wilayah (luas → spesifik), deskripsi (ketuk 3x edit, ketuk 1x di luar kunci) ---- */
  const nm = $('tpNm'), ch = $('tpCh'), desc = $('tpDesc'), dw = $('tpDw'), hero = $('tpHero'), himg = $('tpHimg'), hbg = $('tpHbg');
  let dEdit = false, dTaps = 0, dT = null;
  const ukur = () => { desc.style.height = 'auto'; desc.style.height = Math.max(desc.scrollHeight, 44) + 'px'; };
  himg.addEventListener('error', () => { if (himg.getAttribute('src')) hero.classList.add('kosong'); });
  function isi() {
    const x = data.find(z => z.id === cur); if (!x) { tutupDetail(); return; }
    nm.textContent = x.t;
    ch.textContent = ''; const r = rantai(x); ch.hidden = !r.length;
    r.forEach((v, i) => {
      if (i) { const a = document.createElement('i'); a.className = 'tp-ar'; a.textContent = '›'; ch.appendChild(a); }
      const p = document.createElement('span'); p.className = 'fm-yr tp-lv' + i; p.textContent = v; ch.appendChild(p);
    });
    if (!dEdit) { desc.value = x.d || ''; ukur(); }
    hero.classList.toggle('kosong', !x.c);
    if (x.c) { if (himg.dataset.c !== x.c) { himg.dataset.c = x.c; himg.src = x.c; hbg.style.backgroundImage = 'url(' + JSON.stringify(x.c) + ')'; } }
    else { himg.removeAttribute('src'); delete himg.dataset.c; hbg.style.backgroundImage = ''; }
  }
  function bukaDetail(id) { cur = id; page.hidden = false; $('tpBody').scrollTop = 0; isi(); requestAnimationFrame(ukur); }
  function kunciDesc() {
    if (!dEdit) return; dEdit = false; page.classList.remove('editing'); desc.readOnly = true; desc.tabIndex = -1; desc.blur();
    const x = data.find(z => z.id === cur); if (x) { x.d = desc.value.trim(); desc.value = x.d; if (!simpan()) toast('Penyimpanan penuh, deskripsi tidak tersimpan'); }
    ukur();
  }
  function tutupDetail() { kunciDesc(); page.hidden = true; cur = null; }
  $('tpBack').addEventListener('click', tutupDetail);
  desc.addEventListener('input', () => { ukur(); const x = data.find(z => z.id === cur); if (x) { x.d = desc.value; simpan(); } });
  dw.addEventListener('click', () => {
    if (dEdit) return; dTaps++; clearTimeout(dT);
    if (dTaps >= 3) { dTaps = 0; dEdit = true; page.classList.add('editing'); desc.readOnly = false; desc.tabIndex = 0; desc.focus(); const n = desc.value.length; try { desc.setSelectionRange(n, n); } catch (e) { /* abaikan */ } }
    else dT = setTimeout(() => { dTaps = 0; }, 500);
  });
  document.addEventListener('click', e => { if (!dEdit) return; const p = e.composedPath ? e.composedPath() : []; if (!p.includes(dw)) kunciDesc(); });
  window.addEventListener('resize', () => { if (!page.hidden) ukur(); });
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    if (!menu.hidden || !sortO.hidden) tutupPop();
    else if (!form.hidden && $('cfm').hidden) form.hidden = true;
    else if (!page.hidden && $('cfm').hidden) tutupDetail();
  });
})();

/* ===== CHANNEL FAVORIT (Galery kotak 5): daftar channel berbentuk baris (cover bulat, nama, platform, deskripsi), urutkan, edit/hapus lewat titik tiga.
   Platform bisa dipilih, ditambah dan dikelola (hapus) sendiri lewat form. Ketuk channel = halaman detail (cover, nama, platform, deskripsi: ketuk 3x = edit, ketuk 1x di luar = kunci).
   Data: 'channel' = [{ id, t (nama channel), p (platform), d (deskripsi), c (cover), ts }]; daftar platform: 'channel_plat'; urutan: 'channel_sort'. ===== */
(function () {
  const wrap = $('cnWrap'), list = $('cnList'), form = $('cnForm'), page = $('cnPage'), KEY = 'channel';
  const pop = id => { const d = document.createElement('div'); d.id = id; d.hidden = true; document.body.appendChild(d); return d; };
  const sortO = pop('cnSortM'), menu = pop('cnMenu');
  const ic = d => '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="' + d + '"/></svg>';
  const UP = 'M12 19V5M5 12l7-7 7 7', DOWN = 'M12 5v14M19 12l-7 7-7-7', CHECK = 'M5 12l5 5L20 7';
  const ORG = 'M4 8h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1zM8 3l4 5 4-5';
  /* tiap platform otomatis dapat warna tetap (dari namanya), jadi "YouTube" selalu satu warna */
  const PAL = ['79,209,197', '127,140,255', '255,167,38', '255,105,180', '56,205,110', '255,82,82', '165,110,255', '64,170,255', '230,200,90'];
  const warna = p => { const k = String(p || '').trim().toLowerCase(); let h = 0; for (let i = 0; i < k.length; i++) h = (h * 31 + k.charCodeAt(i)) >>> 0; return PAL[h % PAL.length]; };
  const PLAT0 = ['YouTube', 'TikTok', 'Instagram', 'Telegram', 'WhatsApp', 'Podcast'];
  const CRIT = {
    baru: ['Terbaru', 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 7v5l3 2', 'desc'],
    nama: ['Nama channel', 'M4 7V5h16v2M12 5v14M9 19h6', 'asc'],
    platform: ['Platform', 'M4 6h16M4 12h16M4 18h10', 'asc']
  };
  let data = [], plat = PLAT0.slice(), pilih = '', mg = false;
  let srt = { k: 'baru', d: 'desc' }, cover = '', cvBad = false, editId = null, cur = null, menuId = null;
  const valid = x => x && x.id && typeof x.t === 'string';
  const s = v => typeof v === 'string' ? v : '';
  const rapi = x => ({ id: String(x.id), t: x.t, p: s(x.p), d: s(x.d), c: s(x.c), ts: +x.ts || 0 });
  const simpan = () => { try { localStorage.setItem(KEY, JSON.stringify(data)); return true; } catch (e) { return false; } };
  const simpanPlat = () => save('channel_plat', JSON.stringify(plat));
  try { const raw = load(KEY); if (raw !== null) { const a = JSON.parse(raw); if (Array.isArray(a)) data = a.filter(valid).map(rapi); } } catch (e) { /* data rusak: mulai kosong */ }
  try { const a = JSON.parse(load('channel_plat') || 'null'); if (Array.isArray(a)) plat = a.filter(v => typeof v === 'string' && v.trim()).map(v => v.trim()); } catch (e) {}
  try { const z = JSON.parse(load('channel_sort') || 'null'); if (z && CRIT[z.k] && (z.d === 'asc' || z.d === 'desc')) srt = { k: z.k, d: z.d }; } catch (e) {}
  const cmp = (a, b, k) => String(a[k] || '').localeCompare(String(b[k] || ''), 'id', { sensitivity: 'base' });
  const urut = () => {
    const m = srt.d === 'asc' ? 1 : -1;
    return data.slice().sort((a, b) => {
      if (srt.k === 'baru') return m * (a.ts - b.ts);
      if (srt.k === 'nama') return m * cmp(a, b, 't');
      if (!a.p !== !b.p) return a.p ? -1 : 1; /* tanpa platform selalu di akhir */
      return m * cmp(a, b, 'p') || cmp(a, b, 't');
    });
  };
  const hasil = () => srt.k === 'baru' ? (srt.d === 'desc' ? 'terbaru dulu' : 'terlama dulu') : (srt.d === 'asc' ? 'A–Z' : 'Z–A');
  function sortUI() {
    $('cnSortI').innerHTML = ic(CRIT[srt.k][1]); $('cnSortT').textContent = CRIT[srt.k][0];
    const d = $('cnSortD'); d.innerHTML = ic(srt.d === 'asc' ? UP : DOWN); d.title = hasil(); d.setAttribute('aria-label', 'Arah urutan: ' + hasil() + '. Ketuk untuk membalik');
    $('cnCnt').textContent = data.length + ' channel · ' + hasil();
  }
  function render() {
    sortUI(); list.textContent = '';
    if (!data.length) { const e = document.createElement('div'); e.className = 'pl-empty'; e.textContent = 'Belum ada channel favorit. Ketuk tombol + untuk menambah.'; list.appendChild(e); return; }
    const f = document.createDocumentFragment();
    urut().forEach(x => {
      const r = document.createElement('div'); r.className = 'fm-it cn-it'; r.dataset.id = x.id; r.tabIndex = 0; r.setAttribute('role', 'button');
      const av = document.createElement('div'); av.className = 'cn-av'; av.innerHTML = ic(ORG);
      if (x.c) { const im = document.createElement('img'); im.alt = ''; im.referrerPolicy = 'no-referrer'; im.draggable = false; im.addEventListener('error', () => im.remove()); im.src = x.c; av.appendChild(im); }
      const tx = document.createElement('div'); tx.className = 'cn-tx';
      const t = document.createElement('b'); t.textContent = x.t; tx.appendChild(t);
      if (x.p) { const k = document.createElement('small'); k.textContent = x.p; k.style.color = 'rgb(' + warna(x.p) + ')'; k.style.fontWeight = '600'; tx.appendChild(k); }
      const d = document.createElement('small'); d.textContent = x.d || ''; d.hidden = !x.d; tx.appendChild(d);
      const dot = document.createElement('button'); dot.type = 'button'; dot.className = 'fm-dot'; dot.setAttribute('aria-label', 'Menu channel');
      dot.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg>';
      r.append(av, tx, dot); f.appendChild(r);
    });
    list.appendChild(f);
  }
  const tutupPop = () => { menu.hidden = true; sortO.hidden = true; menuId = null; };
  window.cnTampil = n => { tutupPop(); wrap.hidden = n !== 4; if (n === 4) render(); else { form.hidden = true; tutupDetail(); } };

  /* ---- menu titik tiga: Edit channel / Hapus channel (hapus tetap lewat dialog konfirmasi) ---- */
  menu.innerHTML = '<button type="button" data-a="edit">' + ic('M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z') + 'Edit channel</button><button type="button" data-a="hapus">' + ic('M4 7h16M10 11v6M14 11v6M6 7l1 12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-12M9 7V4h6v3') + 'Hapus channel</button>';
  list.addEventListener('click', e => {
    const r = e.target.closest('.fm-it'); if (!r) return;
    const dot = e.target.closest('.fm-dot');
    if (!dot) { bukaDetail(r.dataset.id); return; }
    e.stopPropagation();
    if (!menu.hidden && menuId === r.dataset.id) { tutupPop(); return; }
    sortO.hidden = true; menuId = r.dataset.id; menu.hidden = false;
    const b = dot.getBoundingClientRect(), mw = menu.offsetWidth, mh = menu.offsetHeight;
    menu.style.left = Math.max(8, Math.min(innerWidth - mw - 8, b.right - mw)) + 'px';
    menu.style.top = (b.bottom + mh + 12 > innerHeight ? b.top - mh - 4 : b.bottom + 4) + 'px';
  });
  list.addEventListener('keydown', e => { const r = e.target.closest('.fm-it'); if (r && e.target === r && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); bukaDetail(r.dataset.id); } });
  menu.addEventListener('click', async e => {
    const bt = e.target.closest('button'); if (!bt) return;
    const x = data.find(y => y.id === menuId); tutupPop(); if (!x) return;
    if (bt.dataset.a === 'edit') { bukaForm(x); return; }
    const ok = await konfirmasi('Hapus channel?', x.t + (x.p ? ' (' + x.p + ')' : '') + '\nakan dihapus dari channel favorit.', 'Hapus');
    if (ok !== true) return;
    data = data.filter(y => y !== x); simpan(); render(); toast('Channel dihapus ✓');
  });

  /* ---- urutkan: kriteria (Terbaru / Nama channel / Platform) + arah ---- */
  const simpanSort = () => save('channel_sort', JSON.stringify(srt));
  $('cnSortC').addEventListener('click', e => {
    e.stopPropagation();
    if (!sortO.hidden) { sortO.hidden = true; return; }
    menu.hidden = true; sortO.textContent = '';
    Object.keys(CRIT).forEach(k => {
      const b = document.createElement('button'); b.type = 'button'; b.dataset.k = k; b.className = k === srt.k ? 'on' : '';
      b.innerHTML = ic(CRIT[k][1]) + '<span></span><svg class="ck" viewBox="0 0 24 24" aria-hidden="true"><path d="' + CHECK + '"/></svg>';
      b.querySelector('span').textContent = CRIT[k][0]; sortO.appendChild(b);
    });
    sortO.hidden = false;
    const r = $('cnSortC').parentNode.getBoundingClientRect(), mw = sortO.offsetWidth;
    sortO.style.left = Math.max(8, Math.min(innerWidth - mw - 8, r.right - mw)) + 'px'; sortO.style.top = (r.bottom + 6) + 'px';
  });
  sortO.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.k !== srt.k) srt = { k: b.dataset.k, d: CRIT[b.dataset.k][2] };
    simpanSort(); sortO.hidden = true; render();
  });
  $('cnSortD').addEventListener('click', () => { srt.d = srt.d === 'asc' ? 'desc' : 'asc'; simpanSort(); render(); });
  document.addEventListener('click', e => { if ((!menu.hidden && !menu.contains(e.target)) || (!sortO.hidden && !sortO.contains(e.target))) tutupPop(); });
  $('galBody').addEventListener('scroll', tutupPop, { passive: true });

  /* ---- form tambah / edit channel (cover, nama, platform, deskripsi) ---- */
  const iT = $('cnT'), iD = $('cnD'), iCv = $('cnCvUrl'), img = $('cnCvImg'), ph = $('cnCvPh'), msg = $('cnMsg');
  const chips = $('cnPChips'), padd = $('cnPAdd'), pnew = $('cnPNew'), phint = $('cnPHint');
  const okUrl = v => /^https?:\/\/\S+$/i.test(v);
  function pesan(t, err) { msg.textContent = t || ''; msg.className = 'pl-msg' + (err ? ' err' : ''); }
  function pratinjau(src) { cvBad = false; img.hidden = !src; ph.hidden = !!src; $('cnCvClr').hidden = !src; if (src) img.src = src; else img.removeAttribute('src'); }
  img.addEventListener('error', () => { if (img.getAttribute('src')) { cvBad = true; img.hidden = true; ph.hidden = false; pesan('Cover: ' + alasanLink(img.getAttribute('src'), 'foto'), true); } });
  img.addEventListener('load', () => { cvBad = false; if (msg.classList.contains('err') && /Cover/.test(msg.textContent)) pesan(''); });
  const tinggiD = () => { iD.style.height = 'auto'; iD.style.height = Math.min(Math.max(iD.scrollHeight, 76), 220) + 'px'; };
  iD.addEventListener('input', tinggiD);

  /* chip platform: ketuk = pilih / batal pilih; "+ Platform" = tambah; "Kelola" = ketuk platform untuk menghapusnya dari daftar */
  function chipPlat() {
    chips.textContent = ''; chips.classList.toggle('mg', mg); phint.hidden = !mg; $('cnPMg').textContent = mg ? 'Selesai' : 'Kelola';
    const semua = plat.slice(); if (pilih && !semua.some(v => v.toLowerCase() === pilih.toLowerCase())) semua.push(pilih);
    semua.forEach(v => {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'cn-pc' + (!mg && v === pilih ? ' on' : ''); b.dataset.v = v; b.textContent = v;
      b.style.setProperty('--cr', warna(v)); chips.appendChild(b);
    });
    if (!mg) { const n = document.createElement('button'); n.type = 'button'; n.className = 'cn-pc cn-pn'; n.dataset.n = '1'; n.textContent = '＋ Platform'; chips.appendChild(n); }
    else padd.hidden = true;
  }
  chips.addEventListener('click', async e => {
    const b = e.target.closest('.cn-pc'); if (!b) return;
    if (b.dataset.n) { padd.hidden = !padd.hidden; if (!padd.hidden) setTimeout(() => pnew.focus(), 50); return; }
    const v = b.dataset.v;
    if (mg) {
      const ok = await konfirmasi('Hapus platform?', v + '\nakan dihapus dari daftar platform.', 'Hapus');
      if (ok !== true) return;
      plat = plat.filter(z => z !== v); if (pilih === v) pilih = ''; simpanPlat(); chipPlat(); toast('Platform dihapus ✓'); return;
    }
    pilih = pilih === v ? '' : v; chipPlat();
  });
  $('cnPMg').addEventListener('click', () => { mg = !mg; chipPlat(); });
  function platBaru() {
    const v = pnew.value.trim().replace(/\s+/g, ' '); if (!v) { pnew.focus(); return; }
    const ada = plat.find(z => z.toLowerCase() === v.toLowerCase());
    if (!ada) { plat.push(v); simpanPlat(); }
    pilih = ada || v; pnew.value = ''; padd.hidden = true; chipPlat();
  }
  $('cnPNewBtn').addEventListener('click', platBaru);
  pnew.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); platBaru(); } });

  function bukaForm(x) {
    editId = x ? x.id : null; $('cnFormT').textContent = x ? 'Edit channel' : 'Tambah channel';
    cover = x ? (x.c || '') : ''; cvBad = false; pilih = x ? x.p : ''; mg = false; padd.hidden = true; pnew.value = '';
    iT.value = x ? x.t : ''; iD.value = x ? x.d : '';
    iCv.value = /^https?:/i.test(cover) ? cover : ''; pratinjau(cover); pesan(''); chipPlat();
    form.hidden = false; tinggiD(); setTimeout(() => iT.focus(), 80);
  }
  $('cnAdd').addEventListener('click', () => bukaForm(null));
  $('cnCancel').addEventListener('click', () => { form.hidden = true; });
  form.addEventListener('click', e => { if (e.target === form) form.hidden = true; });
  $('cnCvClr').addEventListener('click', () => { cover = ''; iCv.value = ''; pratinjau(''); pesan(''); });
  $('cnCvBtn').addEventListener('click', () => $('cnFile').click());
  $('cnFile').addEventListener('change', () => {
    const f = $('cnFile').files[0]; $('cnFile').value = ''; if (!f) return;
    const url = URL.createObjectURL(f), im = new Image();
    im.onload = () => {
      const k = Math.min(1, 800 / Math.max(im.naturalWidth, im.naturalHeight)), c = document.createElement('canvas');
      c.width = Math.round(im.naturalWidth * k); c.height = Math.round(im.naturalHeight * k);
      const g = c.getContext('2d'); g.fillStyle = '#0b0d1a'; g.fillRect(0, 0, c.width, c.height); g.drawImage(im, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url); cover = c.toDataURL('image/jpeg', .82); iCv.value = ''; pratinjau(cover); pesan('');
    };
    im.onerror = () => { URL.revokeObjectURL(url); pesan('Gambar tidak bisa dibaca', true); };
    im.src = url;
  });
  iCv.addEventListener('input', () => { const v = iCv.value.trim(); cover = okUrl(v) ? v : ''; pratinjau(cover); });
  $('cnSave').addEventListener('click', () => {
    const t = iT.value.trim(), p = pilih, d = iD.value.trim();
    if (!t) { pesan('Nama channel wajib diisi', true); iT.focus(); return; }
    if (iCv.value.trim() && !okUrl(iCv.value.trim())) { pesan('Link cover harus diawali http:// atau https://', true); iCv.focus(); return; }
    if (cvBad) { pesan('Cover tidak bisa dimuat, ganti atau kosongkan', true); return; }
    if (editId) {
      const x = data.find(z => z.id === editId); if (!x) { form.hidden = true; return; }
      const lama = Object.assign({}, x); Object.assign(x, { t, p, d, c: cover });
      if (!simpan()) { Object.assign(x, lama); pesan('Penyimpanan penuh, perubahan tidak tersimpan', true); return; }
      form.hidden = true; render(); if (cur === x.id) isi(); toast('Perubahan tersimpan ✓'); return;
    }
    data.push({ id: 'n' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), t, p, d, c: cover, ts: Date.now() });
    if (!simpan()) { data.pop(); pesan('Penyimpanan penuh, channel tidak tersimpan', true); return; }
    form.hidden = true; render(); toast('Channel ditambahkan ✓');
  });
  iT.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); $('cnSave').click(); } });
  iCv.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); $('cnSave').click(); } });

  /* ---- halaman detail: cover, nama channel, platform, deskripsi (ketuk 3x edit, ketuk 1x di luar kunci) ---- */
  const nm = $('cnNm'), pl = $('cnPl'), desc = $('cnDesc'), dw = $('cnDw'), hero = $('cnHero'), himg = $('cnHimg'), hbg = $('cnHbg');
  let dEdit = false, dTaps = 0, dT = null;
  const ukur = () => { desc.style.height = 'auto'; desc.style.height = Math.max(desc.scrollHeight, 44) + 'px'; };
  himg.addEventListener('error', () => { if (himg.getAttribute('src')) hero.classList.add('kosong'); });
  function isi() {
    const x = data.find(z => z.id === cur); if (!x) { tutupDetail(); return; }
    nm.textContent = x.t; pl.textContent = x.p || ''; pl.hidden = !x.p;
    if (x.p) { const w = warna(x.p); pl.style.color = 'rgb(' + w + ')'; pl.style.borderColor = 'rgba(' + w + ',.5)'; pl.style.background = 'rgba(' + w + ',.12)'; }
    if (!dEdit) { desc.value = x.d || ''; ukur(); }
    hero.classList.toggle('kosong', !x.c);
    if (x.c) { if (himg.dataset.c !== x.c) { himg.dataset.c = x.c; hero.classList.remove('kosong'); himg.src = x.c; hbg.style.backgroundImage = 'url(' + JSON.stringify(x.c) + ')'; } }
    else { himg.removeAttribute('src'); delete himg.dataset.c; hbg.style.backgroundImage = ''; }
  }
  function bukaDetail(id) { cur = id; page.hidden = false; $('cnBody').scrollTop = 0; isi(); requestAnimationFrame(ukur); }
  function kunciDesc() {
    if (!dEdit) return; dEdit = false; page.classList.remove('editing'); desc.readOnly = true; desc.tabIndex = -1; desc.blur();
    const x = data.find(z => z.id === cur); if (x) { x.d = desc.value.trim(); desc.value = x.d; if (!simpan()) toast('Penyimpanan penuh, deskripsi tidak tersimpan'); render(); }
    ukur();
  }
  function tutupDetail() { kunciDesc(); page.hidden = true; cur = null; }
  $('cnBack').addEventListener('click', tutupDetail);
  desc.addEventListener('input', () => { ukur(); const x = data.find(z => z.id === cur); if (x) { x.d = desc.value; simpan(); } });
  dw.addEventListener('click', () => {
    if (dEdit) return; dTaps++; clearTimeout(dT);
    if (dTaps >= 3) { dTaps = 0; dEdit = true; page.classList.add('editing'); desc.readOnly = false; desc.tabIndex = 0; desc.focus(); const n = desc.value.length; try { desc.setSelectionRange(n, n); } catch (e) { /* abaikan */ } }
    else dT = setTimeout(() => { dTaps = 0; }, 500);
  });
  document.addEventListener('click', e => { if (!dEdit) return; const p = e.composedPath ? e.composedPath() : []; if (!p.includes(dw)) kunciDesc(); });
  window.addEventListener('resize', () => { if (!page.hidden) ukur(); });
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    if (!menu.hidden || !sortO.hidden) tutupPop();
    else if (!form.hidden && $('cfm').hidden) form.hidden = true;
    else if (!page.hidden && $('cfm').hidden) tutupDetail();
  });
})();

/* ===== TOKOH FAVORIT (Galery kotak 6): daftar tokoh berbentuk kartu potret (foto, nama, bidang / peran, deskripsi), urutkan, edit/hapus lewat titik tiga.
   Ketuk tokoh = halaman detail (foto, nama, bidang, deskripsi: ketuk 3x = edit, ketuk 1x di luar = kunci).
   Data: 'tokoh' = [{ id, t (nama tokoh), p (bidang / peran), d (deskripsi), c (foto), ts }]; urutan: 'tokoh_sort'.
   Sekali jalan: isi lama 'koleksi6' (kotak 6 versi Koleksi) disalin ke sini kalau 'tokoh' belum ada. ===== */
(function () {
  const wrap = $('tkWrap'), list = $('tkList'), form = $('tkForm'), page = $('tkPage'), KEY = 'tokoh';
  const pop = id => { const d = document.createElement('div'); d.id = id; d.hidden = true; document.body.appendChild(d); return d; };
  const sortO = pop('tkSortM'), menu = pop('tkMenu');
  const ic = d => '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="' + d + '"/></svg>';
  const UP = 'M12 19V5M5 12l7-7 7 7', DOWN = 'M12 5v14M19 12l-7 7-7-7', CHECK = 'M5 12l5 5L20 7';
  const ORG = 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0';
  /* tiap bidang otomatis dapat warna tetap (dari namanya), jadi "Ilmuwan" selalu satu warna */
  const PAL = ['79,209,197', '127,140,255', '255,167,38', '255,105,180', '56,205,110', '255,82,82', '165,110,255', '64,170,255', '230,200,90'];
  const warna = p => { const k = String(p || '').trim().toLowerCase(); let h = 0; for (let i = 0; i < k.length; i++) h = (h * 31 + k.charCodeAt(i)) >>> 0; return PAL[h % PAL.length]; };
  const CRIT = {
    baru: ['Terbaru', 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 7v5l3 2', 'desc'],
    nama: ['Nama tokoh', 'M4 7V5h16v2M12 5v14M9 19h6', 'asc'],
    bidang: ['Bidang', 'M4 6h16M4 12h16M4 18h10', 'asc']
  };
  let data = [], srt = { k: 'baru', d: 'desc' }, cover = '', cvBad = false, editId = null, cur = null, menuId = null;
  const valid = x => x && x.id && typeof x.t === 'string';
  const s = v => typeof v === 'string' ? v : '';
  const rapi = x => ({ id: String(x.id), t: x.t, p: s(x.p), d: s(x.d), c: s(x.c), ts: +x.ts || 0 });
  const simpan = () => { try { localStorage.setItem(KEY, JSON.stringify(data)); return true; } catch (e) { return false; } };
  try {
    const raw = load(KEY);
    if (raw !== null) { const a = JSON.parse(raw); if (Array.isArray(a)) data = a.filter(valid).map(rapi); }
    else {
      const o = JSON.parse(load('koleksi6') || '[]');
      if (Array.isArray(o) && o.length) { data = o.filter(valid).map(x => rapi({ id: x.id, t: x.t, c: x.c, d: x.k, ts: x.ts })); simpan(); }
    }
  } catch (e) { /* data rusak: mulai kosong */ }
  try { const z = JSON.parse(load('tokoh_sort') || 'null'); if (z && CRIT[z.k] && (z.d === 'asc' || z.d === 'desc')) srt = { k: z.k, d: z.d }; } catch (e) {}
  const cmp = (a, b, k) => String(a[k] || '').localeCompare(String(b[k] || ''), 'id', { sensitivity: 'base' });
  const urut = () => {
    const m = srt.d === 'asc' ? 1 : -1;
    return data.slice().sort((a, b) => {
      if (srt.k === 'baru') return m * (a.ts - b.ts);
      if (srt.k === 'nama') return m * cmp(a, b, 't');
      if (!a.p !== !b.p) return a.p ? -1 : 1; /* tanpa bidang selalu di akhir */
      return m * cmp(a, b, 'p') || cmp(a, b, 't');
    });
  };
  const hasil = () => srt.k === 'baru' ? (srt.d === 'desc' ? 'terbaru dulu' : 'terlama dulu') : (srt.d === 'asc' ? 'A–Z' : 'Z–A');
  function sortUI() {
    $('tkSortI').innerHTML = ic(CRIT[srt.k][1]); $('tkSortT').textContent = CRIT[srt.k][0];
    const d = $('tkSortD'); d.innerHTML = ic(srt.d === 'asc' ? UP : DOWN); d.title = hasil(); d.setAttribute('aria-label', 'Arah urutan: ' + hasil() + '. Ketuk untuk membalik');
    $('tkCnt').textContent = data.length + ' tokoh · ' + hasil();
  }
  function render() {
    sortUI(); list.textContent = '';
    if (!data.length) { const e = document.createElement('div'); e.className = 'pl-empty'; e.textContent = 'Belum ada tokoh favorit. Ketuk tombol + untuk menambah.'; list.appendChild(e); return; }
    const f = document.createDocumentFragment();
    urut().forEach(x => {
      const r = document.createElement('div'); r.className = 'fm-it'; r.dataset.id = x.id; r.tabIndex = 0; r.setAttribute('role', 'button');
      const cv = document.createElement('div'); cv.className = 'fm-cv'; cv.innerHTML = ic(ORG);
      if (x.c) { const im = document.createElement('img'); im.alt = ''; im.referrerPolicy = 'no-referrer'; im.draggable = false; im.addEventListener('error', () => im.remove()); im.src = x.c; cv.appendChild(im); }
      const tx = document.createElement('div'); tx.className = 'fm-tx';
      const t = document.createElement('b'); t.textContent = x.t;
      const k = document.createElement('small'); k.textContent = x.p || ''; if (x.p) k.style.color = 'rgb(' + warna(x.p) + ')';
      tx.append(t, k);
      const dot = document.createElement('button'); dot.type = 'button'; dot.className = 'fm-dot'; dot.setAttribute('aria-label', 'Menu tokoh');
      dot.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg>';
      r.append(cv, tx, dot); f.appendChild(r);
    });
    list.appendChild(f);
  }
  const tutupPop = () => { menu.hidden = true; sortO.hidden = true; menuId = null; };
  window.tkTampil = n => { tutupPop(); wrap.hidden = n !== 5; if (n === 5) render(); else { form.hidden = true; tutupDetail(); } };

  /* ---- menu titik tiga: Edit tokoh / Hapus tokoh (hapus tetap lewat dialog konfirmasi) ---- */
  menu.innerHTML = '<button type="button" data-a="edit">' + ic('M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z') + 'Edit tokoh</button><button type="button" data-a="hapus">' + ic('M4 7h16M10 11v6M14 11v6M6 7l1 12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-12M9 7V4h6v3') + 'Hapus tokoh</button>';
  list.addEventListener('click', e => {
    const r = e.target.closest('.fm-it'); if (!r) return;
    const dot = e.target.closest('.fm-dot');
    if (!dot) { bukaDetail(r.dataset.id); return; }
    e.stopPropagation();
    if (!menu.hidden && menuId === r.dataset.id) { tutupPop(); return; }
    sortO.hidden = true; menuId = r.dataset.id; menu.hidden = false;
    const b = dot.getBoundingClientRect(), mw = menu.offsetWidth, mh = menu.offsetHeight;
    menu.style.left = Math.max(8, Math.min(innerWidth - mw - 8, b.right - mw)) + 'px';
    menu.style.top = (b.bottom + mh + 12 > innerHeight ? b.top - mh - 4 : b.bottom + 4) + 'px';
  });
  list.addEventListener('keydown', e => { const r = e.target.closest('.fm-it'); if (r && e.target === r && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); bukaDetail(r.dataset.id); } });
  menu.addEventListener('click', async e => {
    const bt = e.target.closest('button'); if (!bt) return;
    const x = data.find(y => y.id === menuId); tutupPop(); if (!x) return;
    if (bt.dataset.a === 'edit') { bukaForm(x); return; }
    const ok = await konfirmasi('Hapus tokoh?', x.t + (x.p ? ' (' + x.p + ')' : '') + '\nakan dihapus dari tokoh favorit.', 'Hapus');
    if (ok !== true) return;
    data = data.filter(y => y !== x); simpan(); render(); toast('Tokoh dihapus ✓');
  });

  /* ---- urutkan: kriteria (Terbaru / Nama tokoh / Bidang) + arah ---- */
  const simpanSort = () => save('tokoh_sort', JSON.stringify(srt));
  $('tkSortC').addEventListener('click', e => {
    e.stopPropagation();
    if (!sortO.hidden) { sortO.hidden = true; return; }
    menu.hidden = true; sortO.textContent = '';
    Object.keys(CRIT).forEach(k => {
      const b = document.createElement('button'); b.type = 'button'; b.dataset.k = k; b.className = k === srt.k ? 'on' : '';
      b.innerHTML = ic(CRIT[k][1]) + '<span></span><svg class="ck" viewBox="0 0 24 24" aria-hidden="true"><path d="' + CHECK + '"/></svg>';
      b.querySelector('span').textContent = CRIT[k][0]; sortO.appendChild(b);
    });
    sortO.hidden = false;
    const r = $('tkSortC').parentNode.getBoundingClientRect(), mw = sortO.offsetWidth;
    sortO.style.left = Math.max(8, Math.min(innerWidth - mw - 8, r.right - mw)) + 'px'; sortO.style.top = (r.bottom + 6) + 'px';
  });
  sortO.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.k !== srt.k) srt = { k: b.dataset.k, d: CRIT[b.dataset.k][2] };
    simpanSort(); sortO.hidden = true; render();
  });
  $('tkSortD').addEventListener('click', () => { srt.d = srt.d === 'asc' ? 'desc' : 'asc'; simpanSort(); render(); });
  document.addEventListener('click', e => { if ((!menu.hidden && !menu.contains(e.target)) || (!sortO.hidden && !sortO.contains(e.target))) tutupPop(); });
  $('galBody').addEventListener('scroll', tutupPop, { passive: true });

  /* ---- form tambah / edit tokoh (cover, nama, bidang, deskripsi) ---- */
  const iT = $('tkT'), iP = $('tkP'), iD = $('tkD'), iCv = $('tkCvUrl'), img = $('tkCvImg'), ph = $('tkCvPh'), msg = $('tkMsg');
  const okUrl = v => /^https?:\/\/\S+$/i.test(v);
  function pesan(t, err) { msg.textContent = t || ''; msg.className = 'pl-msg' + (err ? ' err' : ''); }
  function pratinjau(src) { cvBad = false; img.hidden = !src; ph.hidden = !!src; $('tkCvClr').hidden = !src; if (src) img.src = src; else img.removeAttribute('src'); }
  img.addEventListener('error', () => { if (img.getAttribute('src')) { cvBad = true; img.hidden = true; ph.hidden = false; pesan('Cover: ' + alasanLink(img.getAttribute('src'), 'foto'), true); } });
  img.addEventListener('load', () => { cvBad = false; if (msg.classList.contains('err') && /Cover/.test(msg.textContent)) pesan(''); });
  const tinggiD = () => { iD.style.height = 'auto'; iD.style.height = Math.min(Math.max(iD.scrollHeight, 76), 220) + 'px'; };
  iD.addEventListener('input', tinggiD);
  function bukaForm(x) {
    editId = x ? x.id : null; $('tkFormT').textContent = x ? 'Edit tokoh' : 'Tambah tokoh';
    cover = x ? (x.c || '') : ''; cvBad = false;
    iT.value = x ? x.t : ''; iP.value = x ? x.p : ''; iD.value = x ? x.d : '';
    iCv.value = /^https?:/i.test(cover) ? cover : ''; pratinjau(cover); pesan('');
    form.hidden = false; tinggiD(); setTimeout(() => iT.focus(), 80);
  }
  $('tkAdd').addEventListener('click', () => bukaForm(null));
  $('tkCancel').addEventListener('click', () => { form.hidden = true; });
  form.addEventListener('click', e => { if (e.target === form) form.hidden = true; });
  $('tkCvClr').addEventListener('click', () => { cover = ''; iCv.value = ''; pratinjau(''); pesan(''); });
  $('tkCvBtn').addEventListener('click', () => $('tkFile').click());
  $('tkFile').addEventListener('change', () => {
    const f = $('tkFile').files[0]; $('tkFile').value = ''; if (!f) return;
    const url = URL.createObjectURL(f), im = new Image();
    im.onload = () => {
      const k = Math.min(1, 800 / Math.max(im.naturalWidth, im.naturalHeight)), c = document.createElement('canvas');
      c.width = Math.round(im.naturalWidth * k); c.height = Math.round(im.naturalHeight * k);
      const g = c.getContext('2d'); g.fillStyle = '#0b0d1a'; g.fillRect(0, 0, c.width, c.height); g.drawImage(im, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url); cover = c.toDataURL('image/jpeg', .82); iCv.value = ''; pratinjau(cover); pesan('');
    };
    im.onerror = () => { URL.revokeObjectURL(url); pesan('Gambar tidak bisa dibaca', true); };
    im.src = url;
  });
  iCv.addEventListener('input', () => { const v = iCv.value.trim(); cover = okUrl(v) ? v : ''; pratinjau(cover); });
  $('tkSave').addEventListener('click', () => {
    const t = iT.value.trim(), p = iP.value.trim().replace(/\s+/g, ' '), d = iD.value.trim();
    if (!t) { pesan('Nama tokoh wajib diisi', true); iT.focus(); return; }
    if (iCv.value.trim() && !okUrl(iCv.value.trim())) { pesan('Link cover harus diawali http:// atau https://', true); iCv.focus(); return; }
    if (cvBad) { pesan('Cover tidak bisa dimuat, ganti atau kosongkan', true); return; }
    if (editId) {
      const x = data.find(z => z.id === editId); if (!x) { form.hidden = true; return; }
      const lama = Object.assign({}, x); Object.assign(x, { t, p, d, c: cover });
      if (!simpan()) { Object.assign(x, lama); pesan('Penyimpanan penuh, perubahan tidak tersimpan', true); return; }
      form.hidden = true; render(); if (cur === x.id) isi(); toast('Perubahan tersimpan ✓'); return;
    }
    data.push({ id: 'n' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), t, p, d, c: cover, ts: Date.now() });
    if (!simpan()) { data.pop(); pesan('Penyimpanan penuh, tokoh tidak tersimpan', true); return; }
    form.hidden = true; render(); toast('Tokoh ditambahkan ✓');
  });
  [iT, iP, iCv].forEach(i => i.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); $('tkSave').click(); } }));

  /* ---- halaman detail: cover, nama tokoh, bidang, deskripsi (ketuk 3x edit, ketuk 1x di luar kunci) ---- */
  const nm = $('tkNm'), pl = $('tkPl'), desc = $('tkDesc'), dw = $('tkDw'), hero = $('tkHero'), himg = $('tkHimg'), hbg = $('tkHbg');
  let dEdit = false, dTaps = 0, dT = null;
  const ukur = () => { desc.style.height = 'auto'; desc.style.height = Math.max(desc.scrollHeight, 44) + 'px'; };
  himg.addEventListener('error', () => { if (himg.getAttribute('src')) hero.classList.add('kosong'); });
  function isi() {
    const x = data.find(z => z.id === cur); if (!x) { tutupDetail(); return; }
    nm.textContent = x.t; pl.textContent = x.p || ''; pl.hidden = !x.p;
    if (x.p) { const w = warna(x.p); pl.style.color = 'rgb(' + w + ')'; pl.style.borderColor = 'rgba(' + w + ',.5)'; pl.style.background = 'rgba(' + w + ',.12)'; }
    if (!dEdit) { desc.value = x.d || ''; ukur(); }
    hero.classList.toggle('kosong', !x.c);
    if (x.c) { if (himg.dataset.c !== x.c) { himg.dataset.c = x.c; himg.src = x.c; hbg.style.backgroundImage = 'url(' + JSON.stringify(x.c) + ')'; } }
    else { himg.removeAttribute('src'); delete himg.dataset.c; hbg.style.backgroundImage = ''; }
  }
  function bukaDetail(id) { cur = id; page.hidden = false; $('tkBody').scrollTop = 0; isi(); requestAnimationFrame(ukur); }
  function kunciDesc() {
    if (!dEdit) return; dEdit = false; page.classList.remove('editing'); desc.readOnly = true; desc.tabIndex = -1; desc.blur();
    const x = data.find(z => z.id === cur); if (x) { x.d = desc.value.trim(); desc.value = x.d; if (!simpan()) toast('Penyimpanan penuh, deskripsi tidak tersimpan'); render(); }
    ukur();
  }
  function tutupDetail() { kunciDesc(); page.hidden = true; cur = null; }
  $('tkBack').addEventListener('click', tutupDetail);
  desc.addEventListener('input', () => { ukur(); const x = data.find(z => z.id === cur); if (x) { x.d = desc.value; simpan(); } });
  dw.addEventListener('click', () => {
    if (dEdit) return; dTaps++; clearTimeout(dT);
    if (dTaps >= 3) { dTaps = 0; dEdit = true; page.classList.add('editing'); desc.readOnly = false; desc.tabIndex = 0; desc.focus(); const n = desc.value.length; try { desc.setSelectionRange(n, n); } catch (e) { /* abaikan */ } }
    else dT = setTimeout(() => { dTaps = 0; }, 500);
  });
  document.addEventListener('click', e => { if (!dEdit) return; const p = e.composedPath ? e.composedPath() : []; if (!p.includes(dw)) kunciDesc(); });
  window.addEventListener('resize', () => { if (!page.hidden) ukur(); });
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    if (!menu.hidden || !sortO.hidden) tutupPop();
    else if (!form.hidden && $('cfm').hidden) form.hidden = true;
    else if (!page.hidden && $('cfm').hidden) tutupDetail();
  });
})();

/* ===== KOLEKSI LINK (Galery kotak 7): daftar link tersimpan (ikon situs, judul, situs, kategori, catatan). Ketuk baris = buka link,
   titik tiga = Buka / Salin / Edit / Hapus. Filter per kategori + urutkan (Terbaru / Judul / Situs / Kategori).
   Data: 'link' = [{ id, t (judul), u (alamat link), p (kategori), d (catatan), ts }]; urutan: 'link_sort'.
   Sekali jalan: isi lama 'koleksi7' (kotak 7 versi Koleksi) disalin ke sini kalau 'link' belum ada. ===== */
(function () {
  const wrap = $('lkWrap'), list = $('lkList'), fil = $('lkFilter'), form = $('lkForm'), KEY = 'link';
  const pop = id => { const d = document.createElement('div'); d.id = id; d.hidden = true; document.body.appendChild(d); return d; };
  const sortO = pop('lkSortM'), menu = pop('lkMenu');
  const ic = d => '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="' + d + '"/></svg>';
  const UP = 'M12 19V5M5 12l7-7 7 7', DOWN = 'M12 5v14M19 12l-7 7-7-7', CHECK = 'M5 12l5 5L20 7';
  const OPEN = 'M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5';
  const PAL = ['79,209,197', '127,140,255', '255,167,38', '255,105,180', '56,205,110', '255,82,82', '165,110,255', '64,170,255', '230,200,90'];
  const hue = k => { k = String(k || '').toLowerCase(); let h = 0; for (let i = 0; i < k.length; i++) h = (h * 31 + k.charCodeAt(i)) >>> 0; return PAL[h % PAL.length]; };
  const CRIT = {
    baru: ['Terbaru', 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 7v5l3 2', 'desc'],
    judul: ['Judul', 'M4 7V5h16v2M12 5v14M9 19h6', 'asc'],
    situs: ['Situs', 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM3 12h18M12 3c2.5 2.7 3.8 5.7 3.8 9s-1.3 6.3-3.8 9c-2.5-2.7-3.8-5.7-3.8-9S9.5 5.7 12 3z', 'asc'],
    kategori: ['Kategori', 'M4 6h16M4 12h16M4 18h10', 'asc']
  };
  let data = [], srt = { k: 'baru', d: 'desc' }, filt = '', editId = null, menuId = null;
  const s = v => typeof v === 'string' ? v : '';
  const valid = x => x && x.id && typeof x.u === 'string' && x.u;
  const rapi = x => ({ id: String(x.id), t: s(x.t), u: x.u, p: s(x.p), d: s(x.d), ts: +x.ts || 0 });
  const simpan = () => { try { localStorage.setItem(KEY, JSON.stringify(data)); return true; } catch (e) { return false; } };
  const norm = v => { v = String(v || '').trim(); if (!v) return ''; if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(v)) v = 'https://' + v; try { const u = new URL(v); return /^https?:$/.test(u.protocol) && u.hostname.indexOf('.') > 0 ? u.href : ''; } catch (e) { return ''; } };
  const dom = u => { try { return new URL(u).hostname.replace(/^www\./i, ''); } catch (e) { return u; } };
  const judul = x => x.t || dom(x.u);
  try {
    const raw = load(KEY);
    if (raw !== null) { const a = JSON.parse(raw); if (Array.isArray(a)) data = a.filter(valid).map(rapi); }
    else {
      const o = JSON.parse(load('koleksi7') || '[]');
      if (Array.isArray(o) && o.length) { data = o.filter(x => x && x.id && typeof x.t === 'string').map(x => { const u = norm(x.k) || norm(x.t); return rapi({ id: x.id, t: u && norm(x.t) === u ? '' : x.t, u: u || 'https://', p: '', d: u ? '' : s(x.k), ts: x.ts }); }).filter(x => x.u !== 'https://'); if (data.length) simpan(); }
    }
  } catch (e) { /* data rusak: mulai kosong */ }
  try { const z = JSON.parse(load('link_sort') || 'null'); if (z && CRIT[z.k] && (z.d === 'asc' || z.d === 'desc')) srt = { k: z.k, d: z.d }; } catch (e) {}
  const cmp = (a, b) => String(a || '').localeCompare(String(b || ''), 'id', { sensitivity: 'base' });
  const urut = () => {
    const m = srt.d === 'asc' ? 1 : -1;
    return data.filter(x => !filt || x.p.toLowerCase() === filt.toLowerCase()).sort((a, b) => {
      if (srt.k === 'baru') return m * (a.ts - b.ts);
      if (srt.k === 'judul') return m * cmp(judul(a), judul(b));
      if (srt.k === 'situs') return m * cmp(dom(a.u), dom(b.u)) || cmp(judul(a), judul(b));
      if (!a.p !== !b.p) return a.p ? -1 : 1; /* tanpa kategori selalu di akhir */
      return m * cmp(a.p, b.p) || cmp(judul(a), judul(b));
    });
  };
  const hasil = () => srt.k === 'baru' ? (srt.d === 'desc' ? 'terbaru dulu' : 'terlama dulu') : (srt.d === 'asc' ? 'A–Z' : 'Z–A');
  const kats = () => { const m = {}; data.forEach(x => { if (x.p) { const k = x.p.toLowerCase(); (m[k] = m[k] || { n: x.p, c: 0 }).c++; } }); return Object.keys(m).sort().map(k => m[k]); };
  function sortUI() {
    $('lkSortI').innerHTML = ic(CRIT[srt.k][1]); $('lkSortT').textContent = CRIT[srt.k][0];
    const d = $('lkSortD'); d.innerHTML = ic(srt.d === 'asc' ? UP : DOWN); d.title = hasil(); d.setAttribute('aria-label', 'Arah urutan: ' + hasil() + '. Ketuk untuk membalik');
    $('lkCnt').textContent = data.length + ' link · ' + hasil();
  }
  function filterUI() {
    fil.textContent = ''; const ks = kats();
    if (filt && !ks.some(k => k.n.toLowerCase() === filt.toLowerCase())) filt = '';
    fil.hidden = !ks.length; if (!ks.length) return;
    const mk = (n, label, c, on) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'lk-fc' + (on ? ' on' : ''); b.dataset.k = n; b.setAttribute('aria-pressed', on ? 'true' : 'false'); if (n) b.style.setProperty('--cr', hue(n)); b.textContent = label + ' · ' + c; fil.appendChild(b); };
    mk('', 'Semua', data.length, !filt); ks.forEach(k => mk(k.n, k.n, k.c, filt.toLowerCase() === k.n.toLowerCase()));
  }
  function render() {
    sortUI(); filterUI(); list.textContent = '';
    if (!data.length) { const e = document.createElement('div'); e.className = 'pl-empty'; e.textContent = 'Belum ada link tersimpan. Ketuk tombol + untuk menambah.'; list.appendChild(e); return; }
    const f = document.createDocumentFragment();
    urut().forEach(x => {
      const dm = dom(x.u), r = document.createElement('div'); r.className = 'fm-it lk-it'; r.dataset.id = x.id; r.tabIndex = 0; r.setAttribute('role', 'link'); r.style.setProperty('--cr', hue(dm));
      const av = document.createElement('div'); av.className = 'lk-av'; av.textContent = (dm.charAt(0) || '?').toUpperCase();
      const tx = document.createElement('div'); tx.className = 'lk-tx';
      const t = document.createElement('b'); t.textContent = judul(x);
      const u = document.createElement('span'); u.className = 'lk-dm'; u.innerHTML = ic(OPEN); u.appendChild(document.createTextNode(dm));
      tx.append(t, u);
      if (x.p) { const c = document.createElement('i'); c.className = 'lk-cat'; c.textContent = x.p; c.style.setProperty('--cr', hue(x.p)); tx.appendChild(c); }
      if (x.d) { const n = document.createElement('small'); n.textContent = x.d; tx.appendChild(n); }
      const dot = document.createElement('button'); dot.type = 'button'; dot.className = 'fm-dot'; dot.setAttribute('aria-label', 'Menu link');
      dot.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg>';
      r.append(av, tx, dot); f.appendChild(r);
    });
    if (!f.childNodes.length) { const e = document.createElement('div'); e.className = 'pl-empty'; e.textContent = 'Tidak ada link di kategori ini.'; list.appendChild(e); return; }
    list.appendChild(f);
  }
  const tutupPop = () => { menu.hidden = true; sortO.hidden = true; menuId = null; };
  window.lkTampil = n => { tutupPop(); wrap.hidden = n !== 6; if (n === 6) render(); else form.hidden = true; };

  const buka = x => { try { window.open(x.u, '_blank', 'noopener,noreferrer'); } catch (e) { location.href = x.u; } };
  const salin = async u => {
    try { await navigator.clipboard.writeText(u); toast('Link disalin ✓'); return; } catch (e) { /* coba cara lama */ }
    try { const t = document.createElement('textarea'); t.value = u; t.style.cssText = 'position:fixed;opacity:0'; document.body.appendChild(t); t.select(); const ok = document.execCommand('copy'); t.remove(); toast(ok ? 'Link disalin ✓' : 'Gagal menyalin'); } catch (e) { toast('Gagal menyalin'); }
  };
  /* ---- menu titik tiga ---- */
  menu.innerHTML = '<button type="button" data-a="buka">' + ic(OPEN) + 'Buka link</button><button type="button" data-a="salin">' + ic('M9 9h10a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1V10a1 1 0 0 1 1-1zM5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1') + 'Salin link</button><button type="button" data-a="edit">' + ic('M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z') + 'Edit link</button><button type="button" data-a="hapus">' + ic('M4 7h16M10 11v6M14 11v6M6 7l1 12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-12M9 7V4h6v3') + 'Hapus link</button>';
  list.addEventListener('click', e => {
    const r = e.target.closest('.fm-it'); if (!r) return;
    const dot = e.target.closest('.fm-dot');
    if (!dot) { const x = data.find(y => y.id === r.dataset.id); if (x) buka(x); return; }
    e.stopPropagation();
    if (!menu.hidden && menuId === r.dataset.id) { tutupPop(); return; }
    sortO.hidden = true; menuId = r.dataset.id; menu.hidden = false;
    const b = dot.getBoundingClientRect(), mw = menu.offsetWidth, mh = menu.offsetHeight;
    menu.style.left = Math.max(8, Math.min(innerWidth - mw - 8, b.right - mw)) + 'px';
    menu.style.top = (b.bottom + mh + 12 > innerHeight ? b.top - mh - 4 : b.bottom + 4) + 'px';
  });
  list.addEventListener('keydown', e => { const r = e.target.closest('.fm-it'); if (r && e.target === r && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); const x = data.find(y => y.id === r.dataset.id); if (x) buka(x); } });
  menu.addEventListener('click', async e => {
    const bt = e.target.closest('button'); if (!bt) return;
    const x = data.find(y => y.id === menuId); tutupPop(); if (!x) return;
    if (bt.dataset.a === 'buka') { buka(x); return; }
    if (bt.dataset.a === 'salin') { salin(x.u); return; }
    if (bt.dataset.a === 'edit') { bukaForm(x); return; }
    const ok = await konfirmasi('Hapus link?', judul(x) + '\nakan dihapus dari koleksi link.', 'Hapus');
    if (ok !== true) return;
    data = data.filter(y => y !== x); simpan(); render(); toast('Link dihapus ✓');
  });
  fil.addEventListener('click', e => { const b = e.target.closest('.lk-fc'); if (!b) return; filt = b.dataset.k; render(); });

  /* ---- urutkan ---- */
  const simpanSort = () => save('link_sort', JSON.stringify(srt));
  $('lkSortC').addEventListener('click', e => {
    e.stopPropagation();
    if (!sortO.hidden) { sortO.hidden = true; return; }
    menu.hidden = true; sortO.textContent = '';
    Object.keys(CRIT).forEach(k => {
      const b = document.createElement('button'); b.type = 'button'; b.dataset.k = k; b.className = k === srt.k ? 'on' : '';
      b.innerHTML = ic(CRIT[k][1]) + '<span></span><svg class="ck" viewBox="0 0 24 24" aria-hidden="true"><path d="' + CHECK + '"/></svg>';
      b.querySelector('span').textContent = CRIT[k][0]; sortO.appendChild(b);
    });
    sortO.hidden = false;
    const r = $('lkSortC').parentNode.getBoundingClientRect(), mw = sortO.offsetWidth;
    sortO.style.left = Math.max(8, Math.min(innerWidth - mw - 8, r.right - mw)) + 'px'; sortO.style.top = (r.bottom + 6) + 'px';
  });
  sortO.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.k !== srt.k) srt = { k: b.dataset.k, d: CRIT[b.dataset.k][2] };
    simpanSort(); sortO.hidden = true; render();
  });
  $('lkSortD').addEventListener('click', () => { srt.d = srt.d === 'asc' ? 'desc' : 'asc'; simpanSort(); render(); });
  document.addEventListener('click', e => { if ((!menu.hidden && !menu.contains(e.target)) || (!sortO.hidden && !sortO.contains(e.target))) tutupPop(); });
  $('galBody').addEventListener('scroll', tutupPop, { passive: true });

  /* ---- form tambah / edit link ---- */
  const iU = $('lkU'), iT = $('lkT'), iP = $('lkP'), iD = $('lkD'), msg = $('lkMsg');
  function pesan(t, err) { msg.textContent = t || ''; msg.className = 'pl-msg' + (err ? ' err' : ''); }
  const tinggiD = () => { iD.style.height = 'auto'; iD.style.height = Math.min(Math.max(iD.scrollHeight, 76), 220) + 'px'; };
  iD.addEventListener('input', tinggiD);
  function bukaForm(x) {
    editId = x ? x.id : null; $('lkFormT').textContent = x ? 'Edit link' : 'Tambah link';
    iU.value = x ? x.u : ''; iT.value = x ? x.t : ''; iP.value = x ? x.p : (filt || ''); iD.value = x ? x.d : '';
    $('lkCats').innerHTML = ''; kats().forEach(k => { const o = document.createElement('option'); o.value = k.n; $('lkCats').appendChild(o); });
    pesan(''); form.hidden = false; tinggiD(); setTimeout(() => iU.focus(), 80);
  }
  $('lkAdd').addEventListener('click', () => bukaForm(null));
  $('lkCancel').addEventListener('click', () => { form.hidden = true; });
  form.addEventListener('click', e => { if (e.target === form) form.hidden = true; });
  $('lkPaste').addEventListener('click', async () => { try { const t = await navigator.clipboard.readText(); if (t) { iU.value = t.trim(); pesan(''); } } catch (e) { pesan('Tidak bisa membaca clipboard, tempel manual', true); } });
  $('lkSave').addEventListener('click', () => {
    const u = norm(iU.value), t = iT.value.trim(), p = iP.value.trim().replace(/\s+/g, ' '), d = iD.value.trim();
    if (!iU.value.trim()) { pesan('Link wajib diisi', true); iU.focus(); return; }
    if (!u) { pesan('Link tidak valid, contoh: youtube.com/watch?v=…', true); iU.focus(); return; }
    if (editId) {
      const x = data.find(z => z.id === editId); if (!x) { form.hidden = true; return; }
      const lama = Object.assign({}, x); Object.assign(x, { t, u, p, d });
      if (!simpan()) { Object.assign(x, lama); pesan('Penyimpanan penuh, perubahan tidak tersimpan', true); return; }
      form.hidden = true; render(); toast('Perubahan tersimpan ✓'); return;
    }
    data.push({ id: 'n' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), t, u, p, d, ts: Date.now() });
    if (!simpan()) { data.pop(); pesan('Penyimpanan penuh, link tidak tersimpan', true); return; }
    form.hidden = true; render(); toast('Link ditambahkan ✓');
  });
  [iU, iT, iP].forEach(i => i.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); $('lkSave').click(); } }));
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    if (!menu.hidden || !sortO.hidden) tutupPop();
    else if (!form.hidden && $('cfm').hidden) form.hidden = true;
  });
})();

/* ===== KUTIPAN (Galery kotak 8): kartu flashcard besar bertumpuk (kartu belakang mengintip di kanan, makin belakang makin pudar).
   Geser kartu ke kiri / kanan = ganti kutipan (kartu terbang keluar, kartu berikutnya maju). Tombol ‹ › sama fungsinya.
   Tombol bawah: Salin, Edit, Hapus. Tombol + = tambah kutipan. Kanan atas = urutkan (Terbaru / Penulis / Isi / Panjang).
   Data: 'kutipan' = [{ id, q (isi kutipan), a (penulis / sumber), ts }] ; urutan kartu mengikuti pilihan sortir (disimpan di 'kutipan_sort').
   Sekali jalan: isi lama 'koleksi8' (kotak 8 versi Koleksi) disalin ke sini kalau 'kutipan' belum ada. ===== */
(function () {
  const wrap = $('kqWrap'), deck = $('kqDeck'), form = $('kqForm'), KEY = 'kutipan';
  const ic = d => '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="' + d + '"/></svg>';
  const pop = id => { const d = document.createElement('div'); d.id = id; d.hidden = true; document.body.appendChild(d); return d; };
  const sortO = pop('kqSortM'), fontO = pop('kqFontM');
  const UP = 'M12 19V5M5 12l7-7 7 7', DOWN = 'M12 5v14M19 12l-7 7-7-7', CHECK = 'M5 12l5 5L20 7';
  const CRIT = {
    baru: ['Terbaru', 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 7v5l3 2', 'desc'],
    penulis: ['Penulis', 'M20 21a8 8 0 0 0-16 0M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z', 'asc'],
    isi: ['Isi kutipan', 'M4 7V5h16v2M12 5v14M9 19h6', 'asc'],
    panjang: ['Panjang', 'M4 6h16M4 12h11M4 18h6', 'asc']
  };
  let data = [], ord = [], srt = { k: 'baru', d: 'desc' }, cur = 0, editId = null, busy = false;
  const els = {};
  const s = v => typeof v === 'string' ? v : '';
  const valid = x => x && x.id && typeof x.q === 'string' && x.q.trim();
  const rapi = x => ({ id: String(x.id), q: x.q, a: s(x.a), ts: +x.ts || 0 });
  const simpan = () => { try { localStorage.setItem(KEY, JSON.stringify(data)); return true; } catch (e) { return false; } };
  try {
    const raw = load(KEY);
    if (raw !== null) { const a = JSON.parse(raw); if (Array.isArray(a)) data = a.filter(valid).map(rapi); }
    else {
      const o = JSON.parse(load('koleksi8') || '[]');
      if (Array.isArray(o) && o.length) { data = o.filter(x => x && x.id && typeof x.t === 'string' && x.t.trim()).map(x => rapi({ id: x.id, q: x.t, a: x.k, ts: x.ts })); if (data.length) simpan(); }
    }
  } catch (e) { /* data rusak: mulai kosong */ }

  try { const z = JSON.parse(load('kutipan_sort') || 'null'); if (z && CRIT[z.k] && (z.d === 'asc' || z.d === 'desc')) srt = { k: z.k, d: z.d }; } catch (e) {}
  const cmp = (a, b) => String(a || '').localeCompare(String(b || ''), 'id', { sensitivity: 'base' });
  const urut = () => {
    const m = srt.d === 'asc' ? 1 : -1;
    ord = data.slice().sort((a, b) => {
      if (srt.k === 'baru') return m * (a.ts - b.ts);
      if (srt.k === 'penulis') { if (!a.a !== !b.a) return a.a ? -1 : 1; /* tanpa penulis selalu di akhir */ return m * cmp(a.a, b.a) || cmp(a.q, b.q); }
      if (srt.k === 'isi') return m * cmp(a.q, b.q);
      return m * (a.q.length - b.q.length) || cmp(a.q, b.q);
    });
  };
  const hasil = () => srt.k === 'baru' ? (srt.d === 'desc' ? 'terbaru dulu' : 'terlama dulu') : srt.k === 'panjang' ? (srt.d === 'asc' ? 'pendek dulu' : 'panjang dulu') : (srt.d === 'asc' ? 'A–Z' : 'Z–A');
  function sortUI() {
    $('kqSortI').innerHTML = ic(CRIT[srt.k][1]); $('kqSortT').textContent = CRIT[srt.k][0];
    const d = $('kqSortD'); d.innerHTML = ic(srt.d === 'asc' ? UP : DOWN); d.title = hasil(); d.setAttribute('aria-label', 'Arah urutan: ' + hasil() + '. Ketuk untuk membalik');
  }
  const idKini = () => ord[cur] && ord[cur].id;

  /* posisi kartu: k = 0 paling depan, makin besar makin ke belakang (bergeser ke kanan, mengecil, memudar) */
  const MAXK = 3;
  const pos = k => k > MAXK ? { x: MAXK * 24, s: 1 - MAXK * .055, o: 0, b: 1 - MAXK * .28 } : { x: k * 24, s: 1 - k * .055, o: 1, b: 1 - k * .28 };
  const put = (el, p, z) => { el.style.transform = 'translateX(' + p.x + 'px) scale(' + p.s + ')'; el.style.opacity = p.o; el.style.filter = 'brightness(' + p.b + ')'; el.style.zIndex = z; };
  const ukuran = t => { const n = t.length; return n < 70 ? '1.55rem' : n < 140 ? '1.3rem' : n < 260 ? '1.12rem' : '.98rem'; };
  function bikin(x) {
    const c = document.createElement('div'); c.className = 'kq-card'; c.dataset.id = x.id;
    const q = document.createElement('div'); q.className = 'kq-q'; const qi = document.createElement('p'); q.appendChild(qi);
    const a = document.createElement('div'); a.className = 'kq-a';
    c.append(q, a); return c;
  }
  function isiKartu(c, x) {
    const p = c.querySelector('.kq-q p'); p.textContent = x.q; p.style.fontSize = ukuran(x.q);
    const a = c.querySelector('.kq-a'); a.textContent = x.a || ''; a.hidden = !x.a;
  }
  function sync() {
    Object.keys(els).forEach(id => { if (!data.some(x => x.id === id)) { els[id].remove(); delete els[id]; } });
    data.forEach(x => { if (!els[x.id]) { els[x.id] = bikin(x); deck.appendChild(els[x.id]); } isiKartu(els[x.id], x); });
    const kosong = deck.querySelector('.kq-empty');
    if (!data.length && !kosong) { const e = document.createElement('div'); e.className = 'kq-empty'; e.textContent = 'Belum ada kutipan. Ketuk tombol + untuk menambah.'; deck.appendChild(e); }
    if (data.length && kosong) kosong.remove();
    deck.classList.toggle('kosong', !data.length);
  }
  function layout() {
    const n = ord.length; if (cur >= n) cur = Math.max(0, n - 1);
    ord.forEach((x, i) => { const k = (i - cur + n) % n, el = els[x.id]; put(el, pos(k), 10 - k); el.classList.toggle('top', k === 0); el.style.pointerEvents = k === 0 ? 'auto' : 'none'; el.setAttribute('aria-hidden', k === 0 ? 'false' : 'true'); });
    $('kqCnt').textContent = n + ' kutipan · ' + hasil(); $('kqPos').textContent = n ? (cur + 1) + ' / ' + n : '0 / 0';
    ['kqPrev', 'kqNext'].forEach(i => { $(i).disabled = n < 2; });
    $('kqSortC').disabled = $('kqSortD').disabled = n < 2;
    ['kqCopy', 'kqEdit', 'kqFont', 'kqDel'].forEach(i => { $(i).disabled = !n; });
  }
  const segar = id => { urut(); sortUI(); if (id) { const i = ord.findIndex(z => z.id === id); if (i >= 0) cur = i; } sync(); layout(); };
  window.kqTampil = n => { wrap.hidden = n !== 7; if (n === 7) { cur = Math.min(cur, Math.max(0, data.length - 1)); segar(); } else { form.hidden = true; sortO.hidden = true; fontO.hidden = true; } };

  /* ---- ganti kartu ---- */
  function lock(ms) { busy = true; setTimeout(() => { busy = false; }, ms); }
  function next(side) {
    const n = ord.length; if (busy) return; if (n < 2) { goyang(); return; }
    side = side || -1; lock(520);
    const top = els[ord[cur].id];
    top.style.transition = ''; top.style.transform = 'translateX(' + side * 125 + '%) rotate(' + side * 9 + 'deg)'; top.style.opacity = 0; top.style.filter = 'brightness(1)';
    layoutSelain(top, 1);
    setTimeout(() => {
      cur = (cur + 1) % n;
      const k = n - 1; top.style.transition = 'none'; put(top, pos(k), 10 - k); top.style.opacity = 0; void top.offsetWidth; top.style.transition = '';
      layout();
    }, 300);
  }
  function prev() {
    const n = ord.length; if (busy) return; if (n < 2) { goyang(); return; } lock(520);
    const el = els[ord[(cur - 1 + n) % n].id];
    el.style.transition = 'none'; el.style.transform = 'translateX(-125%) rotate(-9deg)'; el.style.opacity = 0; el.style.zIndex = 11; void el.offsetWidth; el.style.transition = '';
    cur = (cur - 1 + n) % n; layout();
  }
  /* kartu belakang maju satu tingkat ketika kartu depan terbang keluar */
  function layoutSelain(top, geser) {
    const n = ord.length;
    ord.forEach((x, i) => { const el = els[x.id]; if (el === top) return; const k = ((i - cur + n) % n) - geser; put(el, pos(Math.max(0, k)), 10 - Math.max(0, k)); });
  }
  function goyang() { const t = els[idKini()]; if (!t) return; t.style.transition = 'transform .12s'; t.style.transform = 'translateX(10px) scale(1)'; setTimeout(() => { t.style.transition = ''; layout(); }, 130); }
  $('kqNext').addEventListener('click', () => next(-1));
  $('kqPrev').addEventListener('click', prev);

  /* ---- geser dengan jari ---- */
  let dr = null;
  const lerp = (a, b, t) => a + (b - a) * t;
  deck.addEventListener('pointerdown', e => {
    if (busy || ord.length < 2 || e.button > 0) return;
    const top = els[ord[cur].id]; if (!top || !top.contains(e.target)) return;
    dr = { id: e.pointerId, x: e.clientX, y: e.clientY, t: Date.now(), on: false, dx: 0, top };
  });
  deck.addEventListener('pointermove', e => {
    if (!dr || e.pointerId !== dr.id) return;
    const dx = e.clientX - dr.x, dy = e.clientY - dr.y;
    if (!dr.on) {
      if (Math.abs(dy) > 12 && Math.abs(dy) > Math.abs(dx)) { dr = null; return; }
      if (Math.abs(dx) < 8) return;
      dr.on = true; try { deck.setPointerCapture(e.pointerId); } catch (x) {}
      ord.forEach(x => { els[x.id].style.transition = 'none'; });
    }
    dr.dx = dx; const n = ord.length, p = Math.min(1, Math.abs(dx) / 200);
    dr.top.style.transform = 'translateX(' + dx + 'px) rotate(' + (dx * .045) + 'deg)';
    ord.forEach((x, i) => { const k = (i - cur + n) % n; if (k < 1 || k > MAXK + 1) return; const a = pos(k), b = pos(k - 1); put(els[x.id], { x: lerp(a.x, b.x, p), s: lerp(a.s, b.s, p), o: lerp(a.o, b.o, p), b: lerp(a.b, b.b, p) }, 10 - k); });
  });
  function lepas(e) {
    if (!dr || (e && e.pointerId !== dr.id)) return;
    const d = dr; dr = null; if (!d.on) return;
    ord.forEach(x => { els[x.id].style.transition = ''; });
    const v = Math.abs(d.dx) / Math.max(1, Date.now() - d.t);
    if (Math.abs(d.dx) > 90 || (v > .5 && Math.abs(d.dx) > 30)) next(d.dx > 0 ? 1 : -1); else layout();
  }
  deck.addEventListener('pointerup', lepas); deck.addEventListener('pointercancel', lepas);
  document.addEventListener('keydown', e => {
    if (wrap.hidden || !form.hidden || !$('cfm').hidden || /INPUT|TEXTAREA/.test((document.activeElement || {}).tagName || '')) return;
    if (e.key === 'ArrowRight') next(-1); else if (e.key === 'ArrowLeft') prev();
  });

  /* ---- tombol bawah: salin, edit, hapus ---- */
  const kini = () => ord[cur];
  $('kqCopy').addEventListener('click', async () => {
    const x = kini(); if (!x) return; const t = '“' + x.q + '”' + (x.a ? '\n— ' + x.a : '');
    try { await navigator.clipboard.writeText(t); toast('Kutipan disalin ✓'); return; } catch (e) { /* cara lama */ }
    try { const a = document.createElement('textarea'); a.value = t; a.style.cssText = 'position:fixed;opacity:0'; document.body.appendChild(a); a.select(); const ok = document.execCommand('copy'); a.remove(); toast(ok ? 'Kutipan disalin ✓' : 'Gagal menyalin'); } catch (e) { toast('Gagal menyalin'); }
  });
  $('kqEdit').addEventListener('click', () => { if (kini()) bukaForm(kini()); });
  $('kqDel').addEventListener('click', async () => {
    const x = kini(); if (!x) return;
    const ok = await konfirmasi('Hapus kutipan?', (x.q.length > 90 ? x.q.slice(0, 90) + '…' : x.q) + '\nakan dihapus dari kutipan.', 'Hapus');
    if (ok !== true) return;
    data = data.filter(y => y !== x); simpan(); segar(); toast('Kutipan dihapus ✓');
  });

  /* ---- urutkan ---- */
  const simpanSort = () => save('kutipan_sort', JSON.stringify(srt));
  const ulang = () => { const id = idKini(); simpanSort(); sortO.hidden = true; segar(id); };
  $('kqSortC').addEventListener('click', e => {
    e.stopPropagation();
    if (!sortO.hidden) { sortO.hidden = true; return; }
    sortO.textContent = '';
    Object.keys(CRIT).forEach(kk => {
      const b = document.createElement('button'); b.type = 'button'; b.dataset.k = kk; b.className = kk === srt.k ? 'on' : '';
      b.innerHTML = ic(CRIT[kk][1]) + '<span></span><svg class="ck" viewBox="0 0 24 24" aria-hidden="true"><path d="' + CHECK + '"/></svg>';
      b.querySelector('span').textContent = CRIT[kk][0]; sortO.appendChild(b);
    });
    sortO.hidden = false;
    const r = $('kqSortC').parentNode.getBoundingClientRect(), mw = sortO.offsetWidth;
    sortO.style.left = Math.max(8, Math.min(innerWidth - mw - 8, r.right - mw)) + 'px'; sortO.style.top = (r.bottom + 6) + 'px';
  });
  sortO.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.k !== srt.k) srt = { k: b.dataset.k, d: CRIT[b.dataset.k][2] };
    cur = 0; ulang();
  });
  $('kqSortD').addEventListener('click', () => { srt.d = srt.d === 'asc' ? 'desc' : 'asc'; cur = 0; ulang(); });
  document.addEventListener('click', e => { if (!sortO.hidden && !sortO.contains(e.target)) sortO.hidden = true; });
  $('galBody').addEventListener('scroll', () => { sortO.hidden = true; }, { passive: true });

  /* ---- ganti font kutipan: 10 font tanpa ekor. Berlaku langsung ke semua kartu dan kartu berikutnya (disimpan di 'kutipan_font') ---- */
  const FONTS = [['Poppins', 500], ['Montserrat', 500], ['Nunito', 600], ['Quicksand', 600], ['Raleway', 500], ['Lato', 400], ['Open Sans', 500], ['Inter', 500], ['Josefin Sans', 500], ['Dosis', 600]];
  const stack = n => "'" + n + "',system-ui,-apple-system,'Segoe UI',Roboto,sans-serif";
  let fontNow = load('kutipan_font');
  function terapFont() {
    const f = FONTS.find(z => z[0] === fontNow);
    if (f) { wrap.style.setProperty('--kqf', stack(f[0])); wrap.style.setProperty('--kqs', 'normal'); wrap.style.setProperty('--kqw', f[1]); }
    else { ['--kqf', '--kqs', '--kqw'].forEach(p => wrap.style.removeProperty(p)); }
  }
  terapFont();
  $('kqFont').addEventListener('click', e => {
    e.stopPropagation();
    if (!fontO.hidden) { fontO.hidden = true; return; }
    sortO.hidden = true; fontO.textContent = '';
    FONTS.forEach(f => {
      const b = document.createElement('button'); b.type = 'button'; b.dataset.f = f[0]; b.className = f[0] === fontNow ? 'on' : '';
      const sp = document.createElement('span'); sp.textContent = f[0]; sp.style.fontFamily = stack(f[0]); sp.style.fontWeight = f[1];
      b.appendChild(sp); b.insertAdjacentHTML('beforeend', '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="' + CHECK + '"/></svg>'); fontO.appendChild(b);
    });
    fontO.hidden = false;
    const r = $('kqFont').getBoundingClientRect(), mw = fontO.offsetWidth, mh = fontO.offsetHeight;
    fontO.style.left = Math.max(8, Math.min(innerWidth - mw - 8, r.left + r.width / 2 - mw / 2)) + 'px';
    fontO.style.top = (r.top - mh - 6 >= 8 ? r.top - mh - 6 : Math.max(8, Math.min(innerHeight - mh - 8, r.bottom + 6))) + 'px';
    const on = fontO.querySelector('.on'); if (on) on.scrollIntoView({ block: 'nearest' });
  });
  fontO.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    fontNow = b.dataset.f; save('kutipan_font', fontNow); terapFont(); fontO.hidden = true; toast('Font ' + fontNow + ' dipakai ✓');
  });
  document.addEventListener('click', e => { if (!fontO.hidden && !fontO.contains(e.target)) fontO.hidden = true; });
  $('galBody').addEventListener('scroll', () => { fontO.hidden = true; }, { passive: true });
  $('kqSortC').addEventListener('click', () => { fontO.hidden = true; });

  /* ---- form tambah / edit ---- */
  const iQ = $('kqQ'), iA = $('kqA'), msg = $('kqMsg');
  function pesan(t, err) { msg.textContent = t || ''; msg.className = 'pl-msg' + (err ? ' err' : ''); }
  const tinggiQ = () => { iQ.style.height = 'auto'; iQ.style.height = Math.min(Math.max(iQ.scrollHeight, 110), 260) + 'px'; };
  iQ.addEventListener('input', tinggiQ);
  function bukaForm(x) {
    editId = x ? x.id : null; $('kqFormT').textContent = x ? 'Edit kutipan' : 'Tambah kutipan';
    iQ.value = x ? x.q : ''; iA.value = x ? x.a : ''; pesan(''); form.hidden = false; tinggiQ(); setTimeout(() => iQ.focus(), 80);
  }
  $('kqAdd').addEventListener('click', () => bukaForm(null));
  $('kqCancel').addEventListener('click', () => { form.hidden = true; });
  form.addEventListener('click', e => { if (e.target === form) form.hidden = true; });
  iA.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); $('kqSave').click(); } });
  $('kqSave').addEventListener('click', () => {
    const q = iQ.value.trim(), a = iA.value.trim();
    if (!q) { pesan('Isi kutipan wajib diisi', true); iQ.focus(); return; }
    if (editId) {
      const x = data.find(z => z.id === editId); if (!x) { form.hidden = true; return; }
      const lama = Object.assign({}, x); Object.assign(x, { q, a });
      if (!simpan()) { Object.assign(x, lama); pesan('Penyimpanan penuh, perubahan tidak tersimpan', true); return; }
      form.hidden = true; segar(x.id); toast('Perubahan tersimpan ✓'); return;
    }
    const baru = { id: 'n' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), q, a, ts: Date.now() };
    data.unshift(baru);
    if (!simpan()) { data.shift(); pesan('Penyimpanan penuh, kutipan tidak tersimpan', true); return; }
    form.hidden = true; segar(baru.id); toast('Kutipan ditambahkan ✓');
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !form.hidden && $('cfm').hidden) form.hidden = true; });
})();

/* ===== LOGIN GOOGLE + CADANGAN GOOGLE DRIVE =====
   Data (localStorage + cover galery) disimpan ke folder tersembunyi "appDataFolder" di Drive pengguna (scope drive.appdata).
   Isi CLIENT_ID (Google Cloud Console > Credentials > OAuth client "Web application"). Wajib diisi agar login berfungsi. */
(() => {
  /* Tempel Client ID di sini (cara tetap), ATAU biarkan kosong: aplikasi akan memintanya saat pertama kali menekan Masuk. */
  const CLIENT_ID_TETAP = '386636791754-1kt3ong3k6adu8fskemqp0s2muj22bd8.apps.googleusercontent.com';
  const cid = () => (CLIENT_ID_TETAP || load('gd_cid') || '').trim();
  const SCOPE = 'https://www.googleapis.com/auth/drive.appdata openid email profile';
  const NAMA = 'mylife-backup.json', ST = 'c';
  const g = id => document.getElementById(id), ls = localStorage;
  const setRaw = Storage.prototype.setItem, delRaw = Storage.prototype.removeItem;
  let tok = null, exp = 0, fid = null, timer = null, aktif = false, sibuk = false, nextAt = 0;
  const profil = () => { try { return JSON.parse(load('gd_profil')); } catch (e) { return null; } };
  const lokal = () => Object.keys(ls).filter(k => !/^gd_/.test(k));
  const lalu = t => { const m = Math.round((Date.now() - t) / 60000); return m < 1 ? 'baru saja' : m < 60 ? m + ' menit lalu' : m < 1440 ? Math.round(m / 60) + ' jam lalu' : new Date(t).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }); };
  function status(s, t) { g('gdSt').dataset.s = s; g('gdStT').textContent = t; }
  const wkt = t => { const d = new Date(t), n = new Date(), jam = d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }).replace(':', '.'); return d.toDateString() === n.toDateString() ? 'Hari ini, ' + jam : d.toDateString() === new Date(Date.now() - 864e5).toDateString() ? 'Kemarin, ' + jam : d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) + ', ' + jam; };
  /* info sinkron: terakhir tersinkron, sinkron berikutnya (hitung mundur), status data, koneksi Google */
  function info() {
    if (g('gdIn').hidden) return;
    const t = +load('gd_last'), kotor = !!ls.getItem('gd_dirty'), now = Date.now();
    g('gdI1').textContent = t ? wkt(t) + ' · ' + lalu(t) : 'Belum pernah';
    g('gdI2').textContent = sibuk ? 'Sedang menyimpan…' : nextAt > now ? 'Dalam ' + Math.ceil((nextAt - now) / 1000) + ' detik' : kotor ? (navigator.onLine ? 'Menunggu · ketuk Sinkronkan' : 'Menunggu internet') : 'Otomatis, 5 detik setelah ada perubahan';
    const e3 = g('gdI3'); e3.dataset.k = kotor ? 'w' : t ? 'ok' : '';
    e3.textContent = kotor ? 'Ada perubahan belum tersimpan' : t ? 'Semua data aman di Drive' : 'Belum ada cadangan';
    const sisa = tok ? Math.floor((exp - now) / 60000) : -1;
    g('gdI4').textContent = sisa > 1 ? 'Tersambung · sisa ' + sisa + ' menit' : 'Sambung ulang saat sinkron';
  }
  function tampil() {
    const p = profil(); g('gdOut').hidden = !!p; g('gdIn').hidden = !p; if (!p) return;
    g('gdNm').textContent = p.nama || 'Pengguna'; g('gdEm').textContent = p.email || '';
    g('gdAvL').textContent = (p.nama || p.email || '?')[0].toUpperCase();
    const im = g('gdAv'); if (p.foto) { im.src = p.foto; im.hidden = false; } else im.hidden = true;
    if (!sibuk) { const t = +load('gd_last'); status(t ? 'ok' : 'idle', t ? 'Tersinkron · ' + lalu(t) : 'Belum dicadangkan'); }
    info();
  }
  function muatGIS() { return new Promise((ok, no) => { if (window.google && google.accounts && google.accounts.oauth2) return ok(); const s = document.createElement('script'); s.src = 'https://accounts.google.com/gsi/client'; s.onload = ok; s.onerror = () => no(new Error('Layanan Google tidak bisa dimuat. Cek koneksi.')); document.head.appendChild(s); }); }
  async function token(interaktif) {
    if (tok && Date.now() < exp - 60000) return tok;
    await muatGIS();
    return new Promise((ok, no) => {
      const tc = google.accounts.oauth2.initTokenClient({ client_id: cid(), scope: SCOPE, hint: (profil() || {}).email,
        callback: r => { if (r.error) return no(new Error(r.error)); tok = r.access_token; exp = Date.now() + r.expires_in * 1000; ok(tok); },
        error_callback: e => no(new Error(e.type === 'popup_failed_to_open' ? 'Ketuk Sinkronkan untuk menyambung ulang ke Google' : (e.type || 'batal'))) });
      tc.requestAccessToken({ prompt: interaktif ? 'select_account' : '' });
    });
  }
  async function api(url, o = {}, ulang) {
    const r = await fetch(url, { ...o, headers: { Authorization: 'Bearer ' + tok, ...(o.headers || {}) } });
    if (r.status === 401 && !ulang) { tok = null; exp = 0; await token(false); return api(url, o, true); }
    if (!r.ok) throw new Error(r.status === 403 ? 'Akses Drive ditolak (cek izin & Client ID)' : 'Drive error ' + r.status);
    return r;
  }
  async function cari() { const r = await (await api('https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&fields=files(id)&q=' + encodeURIComponent("name='" + NAMA + "'"))).json(); fid = r.files && r.files[0] ? r.files[0].id : null; return fid ? { id: fid } : null; }
  async function ambil() { const f = await cari(); return f ? (await api('https://www.googleapis.com/drive/v3/files/' + f.id + '?alt=media')).json() : null; }
  /* cover galery (IndexedDB) ikut dicadangkan; video tidak (terlalu besar) */
  const buka = () => new Promise((ok, no) => { const r = indexedDB.open('mylife_galeri', 1); r.onupgradeneeded = () => r.result.createObjectStore(ST); r.onsuccess = () => ok(r.result); r.onerror = () => no(r.error); });
  const durl = b => new Promise(ok => { if (!(b instanceof Blob)) return ok(b); const f = new FileReader(); f.onload = () => ok({ __b: f.result }); f.readAsDataURL(b); });
  async function idbBaca() {
    const d = await buka(), out = {};
    await new Promise(ok => { const rq = d.transaction(ST).objectStore(ST).openCursor(); rq.onsuccess = () => { const c = rq.result; if (!c) return ok(); out[c.key] = c.value; c.continue(); }; rq.onerror = ok; });
    for (const k in out) out[k] = await durl(out[k]); return out;
  }
  async function idbTulis(o) {
    const d = await buka(), ready = {};
    for (const k in o) { const v = o[k]; ready[k] = v && v.__b ? await (await fetch(v.__b)).blob() : v; }
    const s = d.transaction(ST, 'readwrite').objectStore(ST); s.clear(); for (const k in ready) s.put(ready[k], k);
  }
  async function snapshot() { const d = { v: 1, t: Date.now(), ls: {}, c: {} }; lokal().forEach(k => d.ls[k] = ls.getItem(k)); try { d.c = await idbBaca(); } catch (e) {} return d; }
  async function push(interaktif) {
    if (!aktif) return; if (sibuk) return tandai();
    sibuk = true; nextAt = 0; status('sync', 'Menyimpan ke Drive…'); info();
    try {
      {
        await token(!!interaktif); if (!fid) await cari();
        const b = '----gd' + Date.now(), meta = fid ? {} : { name: NAMA, parents: ['appDataFolder'] };
        const body = '--' + b + '\r\nContent-Type: application/json\r\n\r\n' + JSON.stringify(meta) + '\r\n--' + b + '\r\nContent-Type: application/json\r\n\r\n' + JSON.stringify(await snapshot()) + '\r\n--' + b + '--';
        const r = await api('https://www.googleapis.com/upload/drive/v3/files' + (fid ? '/' + fid : '') + '?uploadType=multipart&fields=id', { method: fid ? 'PATCH' : 'POST', headers: { 'Content-Type': 'multipart/related; boundary=' + b }, body });
        fid = (await r.json()).id;
      }
      setRaw.call(ls, 'gd_last', String(Date.now())); delRaw.call(ls, 'gd_dirty'); sibuk = false; tampil(); if (interaktif) toast('Tersimpan ke Drive ✓');
    } catch (e) { sibuk = false; setRaw.call(ls, 'gd_dirty', '1'); status('err', 'Belum tersimpan · ketuk Sinkronkan'); info(); if (interaktif) toast('Gagal: ' + e.message); }
  }
  function tandai() { if (!aktif) return; setRaw.call(ls, 'gd_dirty', '1'); clearTimeout(timer); nextAt = Date.now() + 5000; timer = setTimeout(() => push(false), 5000); info(); }
  Storage.prototype.setItem = function (k, v) { setRaw.call(this, k, v); if (this === ls && !/^gd_/.test(k)) tandai(); };
  Storage.prototype.removeItem = function (k) { delRaw.call(this, k); if (this === ls && !/^gd_/.test(k)) tandai(); };
  async function pulihkan(d) {
    lokal().forEach(k => delRaw.call(ls, k)); for (const k in d.ls) setRaw.call(ls, k, d.ls[k]);
    try { await idbTulis(d.c || {}); } catch (e) {}
    setRaw.call(ls, 'gd_last', String(Date.now())); location.reload();
  }
  function tanya(d, judul) {
    return new Promise(ok => {
      g('gdAskT').textContent = judul || 'Data ditemukan di Drive';
      g('gdAskM').textContent = 'Cadangan terakhir: ' + new Date(d.t).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });
      g('gdAsk').hidden = false;
      g('gdAskA').onclick = () => { g('gdAsk').hidden = true; ok('drive'); };
      g('gdAskB').onclick = () => { g('gdAsk').hidden = true; ok('lokal'); };
    });
  }
  async function masuk() {
    if (!cid()) {
      const v = (window.prompt('Tempel Google OAuth Client ID (berakhiran .apps.googleusercontent.com).\nDibuat sekali di Google Cloud Console > Credentials.') || '').trim();
      if (!v) return;
      if (!/\.apps\.googleusercontent\.com$/.test(v)) { toast('Client ID tidak valid'); return; }
      setRaw.call(ls, 'gd_cid', v);
    }
    const b = g('gdBtn'); if (b.classList.contains('load')) return; b.classList.add('load');
    try {
      let p;
      { await token(true); const u = await (await api('https://www.googleapis.com/oauth2/v3/userinfo')).json(); p = { nama: u.name, email: u.email, foto: u.picture }; }
      save('gd_profil', JSON.stringify(p)); aktif = true; tampil();
      const d = await ambil();
      if (d && d.ls) {
        if (!lokal().length) { toast('Data lama ditemukan, memulihkan…'); return pulihkan(d); }
        if (await tanya(d) === 'drive') return pulihkan(d);
      }
      await push(false); toast('Berhasil masuk ✓');
    } catch (e) { toast(/popup|closed|batal|access_denied/i.test(e.message) ? 'Masuk dibatalkan' : e.message); }
    b.classList.remove('load');
  }
  g('gdBtn').onclick = masuk;
  g('gdSync').onclick = () => push(true);
  g('gdRest').onclick = async () => {
    try { await token(true); const d = await ambil(); if (!d || !d.ls) return toast('Belum ada cadangan di Drive'); if (await tanya(d, 'Pulihkan dari Drive?') === 'drive') pulihkan(d); } catch (e) { toast('Gagal: ' + e.message); }
  };
  /* KELUAR: dua kali konfirmasi (pengguna harus setuju 2x) */
  g('gdOutBtn').onclick = async () => {
    const p = profil(), kotor = !!ls.getItem('gd_dirty');
    const a = await konfirmasi('Keluar dari akun?', 'Akun ' + ((p && p.email) || 'Google') + ' akan diputus dari aplikasi.' + (kotor ? ' Ada perubahan yang belum tersimpan ke Drive.' : ''), 'Lanjut', 'Batal', 'danger');
    if (a !== true) return;
    const q = konfirmasi('Yakin ingin keluar?', 'Pencadangan otomatis ke Drive akan berhenti. Data di perangkat ini tetap ada, dan kamu bisa masuk lagi kapan saja.', 'Ya, keluar', 'Batal', 'danger');
    const y = g('cfmYes'); y.disabled = true; setTimeout(() => { y.disabled = false; }, 900); /* cegah ketukan ganda langsung lolos */
    if ((await q) !== true) return;
    clearTimeout(timer); nextAt = 0; tok = null; fid = null; aktif = false; ['gd_profil', 'gd_last'].forEach(k => delRaw.call(ls, k)); tampil(); toast('Sudah keluar. Data di perangkat tetap ada.');
  };
  g('gdAv').onerror = e => { e.target.hidden = true; };
  aktif = !!profil(); tampil();
  /* segarkan info tiap detik hanya saat kartu tampil & layar aktif */
  setInterval(() => { if (document.visibilityState !== 'visible' || g('gdIn').hidden) return; info(); if (g('gdSt').dataset.s === 'ok') { const t = +load('gd_last'); if (t) g('gdStT').textContent = 'Tersinkron · ' + lalu(t); } }, 1000);
  /* cadangan tertunda (mis. token habis/offline): kirim lagi saat online / saat pengguna mengetuk layar (izin popup butuh gestur) */
  const susul = () => { if (aktif && !sibuk && ls.getItem('gd_dirty')) push(false); };
  window.addEventListener('online', susul);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && tok) susul(); });
  document.addEventListener('click', () => { if (!tok) susul(); }, { once: true, capture: true });
  /* dipakai dialog keluar aplikasi: status cadangan + sinkron paksa (menunggu sinkron otomatis yang sedang jalan) */
  window.gdStatusSinkron = () => ({ masuk: aktif, kotor: !!ls.getItem('gd_dirty'), sibuk });
  window.gdSinkronSekarang = async () => {
    const jeda = () => new Promise(r => setTimeout(r, 250));
    for (let i = 0; i < 80 && sibuk; i++) await jeda();
    await push(true);
    for (let i = 0; i < 80 && sibuk; i++) await jeda();
  };
})();

/* ===== PWA: service worker (cache offline + notifikasi alarm) ===== */
if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && typeof cekAlarm === 'function') cekAlarm(); });
document.addEventListener('click', () => { if (typeof mintaIzinNotif === 'function') mintaIzinNotif(); }, { once: true });

/* ===== GESER TEPI = KEMBALI =====
   Geser dari tepi kiri atau kanan layar ke tengah = sama dengan menekan tombol kembali / batal
   di lapisan paling atas (halaman dalam, form, dialog). Halaman ikut bergeser mengikuti jari.
   Tombol back sistem HP (gestur tepi bawaan Android) juga menutup lapisan paling atas lewat riwayat browser.
   window.kembaliHalaman() bisa dipanggil dari luar (mis. pembungkus APK) dan mengembalikan true bila ada yang ditutup. */
(() => {
  const el = id => document.getElementById(id);
  /* id lapisan -> id tombol penutupnya (null = ketuk lapisan itu sendiri, seperti ketuk di luar kotak) */
  const TUTUP = {
    cal: 'calClose', catFull: 'cfClose', catEdit: 'ceCancel',
    alm: 'almClose', almEdit: 'aeCancel', almSet: 'sClose',
    kat: 'katClose', trx: 'trxClose', katEdit: 'keCancel',
    ang: 'angClose', angAmt: 'angAmtCancel', htForm: 'htFCancel',
    rwPage: 'rwpBack', rwFilter: null, gfPick: null, lbPage: 'lbpBack', lbFilter: null,
    pv: 'pvX', vv: 'vvX',
    gal: 'galClose', plForm: 'plCancel', fmForm: 'fmCancel', fmPage: 'fmBack',
    bkForm: 'bkCancel', bkPage: 'bkBack',
    tpForm: 'tpCancel', tpPage: 'tpBack', cnForm: 'cnCancel', cnPage: 'cnBack',
    tkForm: 'tkCancel', tkPage: 'tkBack', lkForm: 'lkCancel', kqForm: 'kqCancel',
    knBForm: 'knBCancel', knNote: 'knNBack',
    bd: 'bdClose', bdT: 'bdTClose', bdTF: 'bdTFCancel', lpEd: 'lpEdCancel', /* Produktif: halaman Bidang, Checklist tugas, form tugas, edit checklist riwayat */
    cfm: 'cfmNo'
  };
  const TAHAN = ['ring', 'gdAsk'];            /* alarm berdering & pilihan pemulihan Drive: tidak boleh ditutup dengan geser */
  const POPUP = ['plMenu', 'plSortM', 'knFontM']; /* menu kecil: ditutup lebih dulu (lewat ketuk di luar) */
  const tampil = e => !!e && !e.hidden && getComputedStyle(e).display !== 'none';

  function teratas() {
    if (TAHAN.some(i => tampil(el(i)))) return null;
    let best = null, bz = -1;
    for (const id in TUTUP) {
      const e = el(id); if (!tampil(e)) continue;
      const z = parseInt(getComputedStyle(e).zIndex, 10) || 0;
      if (!best || z > bz || (z === bz && (best.compareDocumentPosition(e) & Node.DOCUMENT_POSITION_FOLLOWING))) { best = e; bz = z; }
    }
    return best;
  }
  const popupTerbuka = () => POPUP.some(i => tampil(el(i)));

  function kembali() {
    if (TAHAN.some(i => tampil(el(i)))) return false;
    if (popupTerbuka()) { document.body.click(); return true; }
    const o = teratas(); if (!o) return false;
    const t = TUTUP[o.id]; (t ? el(t) : o).click();
    return true;
  }
  window.kembaliHalaman = kembali;

  /* ---- geser tepi layar ---- */
  const EDGE = 28;            /* lebar zona awal sentuhan di tepi (px) */
  let g = null, sibuk = false;
  const bersih = e => { if (!e) return; e.style.transition = ''; e.style.transform = ''; e.style.boxShadow = ''; };
  const geser = (e, x, tr, sisi) => { if (!e) return; e.style.transition = tr; e.style.transform = 'translateX(' + x + 'px)'; e.style.boxShadow = (-sisi * 10) + 'px 0 28px rgba(0,0,0,.5)'; };

  document.addEventListener('touchstart', ev => {
    if (sibuk) return;
    if (ev.touches.length !== 1) { g = null; return; }
    const t = ev.touches[0], W = innerWidth;
    const sisi = t.clientX <= EDGE ? 1 : (t.clientX >= W - EDGE ? -1 : 0);
    if (!sisi) { g = null; return; }
    const o = teratas(), pop = !!o && popupTerbuka() || (!o && !TAHAN.some(i => tampil(el(i))) && popupTerbuka());
    if (!o && !pop) { g = null; return; }
    g = { sisi, x0: t.clientX, y0: t.clientY, t0: performance.now(), dx: 0, mode: 0, el: pop ? null : o };
  }, { passive: true, capture: true });

  document.addEventListener('touchmove', ev => {
    if (!g) return;
    if (ev.touches.length !== 1) { bersih(g.el); g = null; return; }
    const t = ev.touches[0], dx = (t.clientX - g.x0) * g.sisi, dy = t.clientY - g.y0;
    if (g.mode === 0) {
      if (Math.abs(dy) > 12 && Math.abs(dy) > Math.abs(dx)) { g = null; return; } /* gerak vertikal: bukan gestur kembali */
      if (dx > 10 && dx > Math.abs(dy) * 1.2) g.mode = 1; else return;
    }
    if (ev.cancelable) ev.preventDefault();
    g.dx = Math.max(0, dx);
    geser(g.el, g.dx * g.sisi, 'none', g.sisi);
  }, { passive: false, capture: true });

  const akhir = ev => {
    if (!g) return;
    const s = g; g = null;
    if (s.mode !== 1) return;
    const W = innerWidth, v = s.dx / Math.max(1, performance.now() - s.t0);
    const lolos = ev.type === 'touchend' && (s.dx >= Math.max(70, W * 0.22) || (v > 0.45 && s.dx > 40));
    if (!lolos) { if (s.el) { geser(s.el, 0, 'transform .2s ease', s.sisi); setTimeout(() => bersih(s.el), 220); } return; }
    sibuk = true;
    const selesai = () => {
      kembali();
      if (s.el && tampil(s.el)) {           /* tidak tertutup (mis. dialog konfirmasi): kembalikan halaman ke posisi semula */
        void s.el.offsetWidth; geser(s.el, 0, 'transform .2s ease', s.sisi); setTimeout(() => bersih(s.el), 220);
      } else bersih(s.el);
      setTimeout(() => { sibuk = false; }, 120);
    };
    if (s.el) { geser(s.el, s.sisi * W, 'transform .18s ease', s.sisi); setTimeout(selesai, 190); } else selesai();
  };
  document.addEventListener('touchend', akhir, { passive: true, capture: true });
  document.addEventListener('touchcancel', akhir, { passive: true, capture: true });

  /* ---- tombol back sistem / gestur tepi Android = tutup lapisan teratas (lewat riwayat browser) ---- */
  let dorong = 0, tunggu = false, antri = false, mati = false;
  const jumlah = () => { let n = 0; for (const id in TUTUP) if (tampil(el(id))) n++; return n; };
  const lepas = () => { if (!tunggu) return; tunggu = false; if (antri) { antri = false; sinkron(); } };
  function sinkron() {
    if (mati) return;
    if (tunggu) { antri = true; return; }
    const n = jumlah();
    if (n > dorong) {
      try { while (dorong < n) history.pushState({ lapisan: ++dorong }, ''); } catch (e) { mati = true; }
    } else if (n < dorong) {
      const k = dorong - n; dorong = n; tunggu = true;
      try { history.go(-k); } catch (e) { tunggu = false; mati = true; }
      setTimeout(lepas, 700);
    }
  }
  /* ---- KELUAR APLIKASI: tombol back di halaman utama = dialog konfirmasi; wajib sinkron ke Drive dulu bila ada perubahan belum tersimpan ----
     Satu entri riwayat "dasar" dipasang di bawah semua lapisan (setelah sentuhan pertama, syarat Chrome). Back di halaman utama jatuh ke entri
     sebelumnya -> kita pasang lagi entri dasar dan tampilkan dialog. Hanya bisa menahan tombol/gestur kembali; tombol Home, geser dari daftar
     aplikasi terakhir, atau sistem yang mematikan aplikasi tidak bisa ditahan oleh halaman web. */
  let dasar = false, bolehKeluar = false, tanyaAktif = false;
  const dasarPasang = () => { if (dorong > 0 || tunggu) return; try { history.pushState({ dasar: 1 }, ''); dasar = true; } catch (e) {} };
  document.addEventListener('pointerdown', () => { if (!dasar) dasarPasang(); }, { capture: true, passive: true });

  async function tanyaKeluar() {
    if (tanyaAktif) return false;
    tanyaAktif = true;
    try {
      let gagal = false;
      for (let r = 0; r < 20; r++) {
        const st = window.gdStatusSinkron ? window.gdStatusSinkron() : { masuk: false, kotor: false };
        if (st.masuk && st.kotor) {
          const ya = await konfirmasi('Sinkronkan dulu sebelum keluar',
            (gagal ? 'Sinkron belum berhasil, data masih belum tersimpan. Pastikan internet aktif lalu coba lagi.\n\n' : '') +
            'Ada perubahan yang BELUM tersimpan ke Google Drive.\n\nKalau diabaikan: perubahan itu hanya ada di HP ini. Jika data aplikasi terhapus (hapus data/cache, copot aplikasi, atau ganti HP), perubahan itu hilang dan tidak bisa dipulihkan.\n\nAplikasi tidak bisa ditutup sebelum data tersinkron.',
            'Sinkronkan sekarang', 'Batal', 'pri');
          if (ya !== true) return false;
          await window.gdSinkronSekarang();
          gagal = !!window.gdStatusSinkron().kotor;
          continue;
        }
        const ya = await konfirmasi('Keluar dari aplikasi?',
          st.masuk ? 'Semua data sudah tersimpan di Google Drive.'
                   : 'Kamu belum masuk dengan Google, jadi data hanya tersimpan di HP ini dan tidak ada cadangan. Kalau data aplikasi terhapus, data hilang. Masuk dulu di Pengaturan untuk mencadangkan.',
          'Keluar', 'Batal', 'danger');
        return ya === true;
      }
      return false;
    } finally { tanyaAktif = false; }
  }
  window.tanyaKeluarAplikasi = tanyaKeluar;   /* untuk pembungkus APK: panggil sebelum menutup aplikasi, true = boleh keluar */

  async function mundurKeluar() {
    for (let i = 0; i < 30 && (tunggu || dorong > 0 || jumlah() > 0); i++) await new Promise(r => setTimeout(r, 100));
    bolehKeluar = true;
    try { history.go(-1); } catch (e) { bolehKeluar = false; }
  }

  window.addEventListener('popstate', () => {
    if (tunggu) { lepas(); return; }
    if (dorong > 0) { dorong--; kembali(); setTimeout(sinkron, 60); return; }
    if (!dasar) return;
    if (bolehKeluar) {                      /* sudah dikonfirmasi: mundur sekali lagi = keluar; bila tidak ada halaman sebelumnya, tekan kembali sekali lagi */
      dasar = false;
      try { history.back(); } catch (e) {}
      setTimeout(() => { if (!document.hidden) toast('Tekan kembali sekali lagi untuk keluar'); }, 500);
      setTimeout(() => { bolehKeluar = false; dasarPasang(); }, 3500);
      return;
    }
    dasarPasang();                          /* tetap di dalam aplikasi, lalu tanya */
    tanyaKeluar().then(ok => { if (ok) mundurKeluar(); });
  });
  const mo = new MutationObserver(() => sinkron());
  for (const id in TUTUP) { const e = el(id); if (e) mo.observe(e, { attributes: true, attributeFilter: ['hidden', 'class'] }); }
})();
