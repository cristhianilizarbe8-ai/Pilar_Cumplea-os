/* =========================================================
   MÚSICA
   1) Si existe musica/cancion.mp3 se usa ese archivo.
   2) Si no existe, suena "Cumpleaños feliz" generado con Web Audio.
   ========================================================= */
const Musica = (() => {
  let ctx, master, timer, sonando = false, usaArchivo = false, audioEl = null;

  // [nota MIDI, duración en tiempos]  — Cumpleaños feliz (compás 3/4)
  const G = 67, A = 69, B = 71, C = 72, D = 74, E = 76, F = 77, G2 = 79, Bb = 70;
  const melodia = [
    [G,.75],[G,.25],[A,1],[G,1],[C+0,1],[B,2],
    [G,.75],[G,.25],[A,1],[G,1],[D,1],[C,2],
    [G,.75],[G,.25],[G2,1],[E,1],[C,1],[B,1],[A,1],
    [F,.75],[F,.25],[E,1],[C,1],[D,1],[C,3]
  ];
  const tempo = 0.55; // segundos por tiempo

  const freq = m => 440 * Math.pow(2, (m - 69) / 12);

  function nota(midi, inicio, dur) {
    const osc = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = "triangle"; osc2.type = "sine";
    osc.frequency.value = freq(midi);
    osc2.frequency.value = freq(midi) * 2;
    g.gain.setValueAtTime(0.0001, inicio);
    g.gain.exponentialRampToValueAtTime(0.35, inicio + 0.03);
    g.gain.exponentialRampToValueAtTime(0.0001, inicio + dur * 0.95);
    osc.connect(g); osc2.connect(g); g.connect(master);
    osc.start(inicio); osc2.start(inicio);
    osc.stop(inicio + dur); osc2.stop(inicio + dur);
  }

  function programarVuelta() {
    let t = ctx.currentTime + 0.1;
    melodia.forEach(([m, d]) => {
      nota(m, t, d * tempo);
      nota(m - 12, t, d * tempo); // octava grave para dar cuerpo
      t += d * tempo;
    });
    const duracion = (t - ctx.currentTime) * 1000 + 1500;
    timer = setTimeout(() => { if (sonando) programarVuelta(); }, duracion);
  }

  async function iniciar() {
    // Intentar archivo mp3 primero (sin fetch, funciona también abriendo el archivo directo)
    try {
      audioEl = new Audio("musica/cancion.mp3");
      audioEl.loop = true; audioEl.volume = 0.6;
      await audioEl.play();
      usaArchivo = true; sonando = true;
      return;
    } catch (e) { audioEl = null; /* sin archivo: usar melodía generada */ }

    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain();
    master.gain.value = 0.35;
    master.connect(ctx.destination);
    sonando = true;
    programarVuelta();
  }

  function alternar() {
    if (usaArchivo && audioEl) {
      sonando ? audioEl.pause() : audioEl.play();
      sonando = !sonando;
    } else if (ctx) {
      if (sonando) { ctx.suspend(); sonando = false; }
      else { ctx.resume(); sonando = true; if (!timer) programarVuelta(); }
    }
    return sonando;
  }

  return { iniciar, alternar };
})();

/* =========================================================
   LAYOUT RESPONSIVO — videos siempre centrados y dentro de pantalla
   ========================================================= */
const RATIO = 3 / 4; // ancho / alto de cada video

function calcularLayout(n, W, H) {
  const gap = Math.max(8, Math.min(W, H) * 0.02);
  const margen = Math.max(10, Math.min(W, H) * 0.03);
  const usableW = W - margen * 2;
  const usableH = H - margen * 2;
  let mejor = null;

  for (let cols = 1; cols <= n; cols++) {
    const filas = Math.ceil(n / cols);
    const wMax = (usableW - gap * (cols - 1)) / cols;
    const hMax = (usableH - gap * (filas - 1)) / filas;
    const w = Math.min(wMax, hMax * RATIO);
    if (!mejor || w > mejor.w) mejor = { cols, filas, w, h: w / RATIO };
  }

  const { cols, filas, w, h } = mejor;
  const totalH = filas * h + (filas - 1) * gap;
  const y0 = (H - totalH) / 2;
  const posiciones = [];

  for (let f = 0; f < filas; f++) {
    const enFila = f === filas - 1 ? n - cols * (filas - 1) : cols;
    const totalW = enFila * w + (enFila - 1) * gap;
    const x0 = (W - totalW) / 2; // cada fila centrada
    for (let c = 0; c < enFila; c++) {
      posiciones.push({ x: x0 + c * (w + gap), y: y0 + f * (h + gap) });
    }
  }
  return { posiciones, w, h };
}

const rotaciones = [-4, 3, -3, 4, -2, 3, -4, 2, -3, 4];
let videos = [];
let colocados = false;

function colocarVideos(animando = false) {
  const W = window.innerWidth, H = window.innerHeight;
  const { posiciones, w, h } = calcularLayout(videos.length, W, H);
  videos.forEach((v, i) => {
    if (v.dataset.estado === "intro") return; // aún en el centro grande
    v.style.width = w + "px";
    v.style.height = h + "px";
    v.style.transform = `translate(${posiciones[i].x}px, ${posiciones[i].y}px) rotate(${rotaciones[i % rotaciones.length]}deg)`;
    v.style.zIndex = 5 + (i % 3);
    v.style.opacity = v.dataset.estado === "listo" ? 1 : v.style.opacity;
  });
}

function mostrarEnCentro(video) {
  const W = window.innerWidth, H = window.innerHeight;
  const h = Math.min(H * 0.7, (W * 0.85) / RATIO);
  const w = h * RATIO;
  video.dataset.estado = "intro";
  video.style.opacity = 1;
  video.style.zIndex = 999;
  video.style.width = w + "px";
  video.style.height = h + "px";
  video.style.transform = `translate(${(W - w) / 2}px, ${(H - h) / 2}px) rotate(0deg)`;
}

/* =========================================================
   CONFETI
   ========================================================= */
function generarConfetiColorido() {
  const cont = document.getElementById("confeti-container");
  const colores = ["#f1c40f", "#e74c3c", "#9b59b6", "#1abc9c", "#3498db", "#e67e22", "#ffffff", "#2ecc71"];
  const c = document.createElement("div");
  c.className = "confeti";
  const size = Math.random() * 3 + 6;
  c.style.left = Math.random() * 100 + "vw";
  c.style.width = c.style.height = size + "px";
  c.style.backgroundColor = colores[Math.floor(Math.random() * colores.length)];
  c.style.animationDuration = 6 + Math.random() * 4 + "s";
  cont.appendChild(c);
  setTimeout(() => c.remove(), 10000);
}

/* =========================================================
   SECUENCIA PRINCIPAL
   ========================================================= */
function iniciarSecuencia() {
  const mensajeFinal = document.getElementById("mensajeFinal");
  const mensajeCumple = document.getElementById("mensajeCumple");
  const paso = 700; // ms entre cada video

  videos.forEach((video, i) => {
    video.play().catch(() => {});
    setTimeout(() => {
      mostrarEnCentro(video);

      setTimeout(() => {
        video.dataset.estado = "listo";
        colocarVideos();

        if (i === videos.length - 1) {
          setTimeout(() => {
            mensajeFinal.classList.add("activo");
            generarConfetiColorido();
            setInterval(generarConfetiColorido, 120);

            let yaPaso = false;
            const irAlFinal = () => {
              if (yaPaso) return;
              yaPaso = true;
              clearTimeout(temporizador);
              mensajeFinal.classList.remove("activo");
              setTimeout(() => mensajeCumple.classList.add("activo"), 1500);
            };
            const temporizador = setTimeout(irAlFinal, 25000);
            document.getElementById("btnContinuar").addEventListener("click", irAlFinal);
          }, 1500);
        }
      }, 1800);
    }, paso * i);
  });
}

document.addEventListener("DOMContentLoaded", () => {
  videos = Array.from(document.querySelectorAll(".collage video"));
  videos.forEach(v => v.dataset.estado = "espera");
  colocarVideos();

  let t;
  window.addEventListener("resize", () => { clearTimeout(t); t = setTimeout(colocarVideos, 120); });
  window.addEventListener("orientationchange", () => setTimeout(colocarVideos, 250));

  const btnMusica = document.getElementById("btnMusica");
  document.getElementById("btnComenzar").addEventListener("click", async () => {
    document.getElementById("inicio").classList.add("oculto");
    await Musica.iniciar();
    iniciarSecuencia();
  });

  btnMusica.addEventListener("click", () => {
    btnMusica.textContent = Musica.alternar() ? "🔊" : "🔇";
  });
});
