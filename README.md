# DirectorScene

Director de vídeo con IA: guía al usuario **mientras graba** (encuadre, ángulo,
distancia, iluminación) para mejorar tomas destinadas a TikTok, Instagram Reels,
YouTube Shorts y YouTube.

El análisis de visión corre 100 % en el navegador con MediaPipe (WebAssembly/
WebGL). **El vídeo nunca sale del dispositivo**: al backend solo viajan
preferencias y presets.

## Stack

| Pieza | Tecnología |
| --- | --- |
| Frontend | Next.js 16 (App Router) + TypeScript + Tailwind 4 |
| IA on-device | `@mediapipe/tasks-vision` (pose + face landmarks) |
| Iluminación | Canvas API, histograma de luminancia del frame en vivo |
| Datos / Auth | Supabase (opcional; sin él todo se guarda en localStorage) |
| Despliegue | Vercel |

## Arranque

```bash
npm install          # copia también los binarios WASM a public/mediapipe/wasm
npm run dev          # http://localhost:3000
```

`getUserMedia` exige contexto seguro: funciona en `localhost` y en HTTPS. Para
probar desde el móvil en la red local, usa un túnel HTTPS (`vercel dev --listen`
tras un `ngrok`/`cloudflared`, o el propio deploy de preview).

Comandos útiles:

```bash
npm test             # tests del motor de reglas (Vitest)
npm run lint         # ESLint (config de Next)
npm run typecheck    # tsc --noEmit
npm run build        # build de producción
npm run fetch:models # descarga los modelos .task a public/mediapipe/models
npm run test:e2e     # suite de humo con Playwright (ver más abajo)
```

Cada push y pull request corre dos jobs en CI (`.github/workflows/ci.yml`):
`npm test`, `lint`, `typecheck` y `build` — el mismo checklist que conviene
pasar en local antes de dar por buena una sesión — y por separado la suite
E2E de Playwright.

## Pruebas de extremo a extremo

`e2e/` cubre con un navegador real lo que antes solo se verificaba a mano en
cada sesión: encender la cámara, grabar y descargar un clip, la cuenta atrás
y sus atajos de teclado, capturar una foto sin interrumpir una grabación, el
panel de calidad de dispositivo y el manifest de PWA. Corre contra un build
de producción (`next build && next start`), con la cámara y el micrófono
simulados por Chromium (`--use-fake-ui/device-for-media-stream`).

```bash
npx playwright install --with-deps chromium   # una vez, si no está instalado
npm run fetch:models                          # modelos reales en local (ver abajo)
npm run test:e2e
```

Un par de decisiones no evidentes, por si hace falta tocar esto:

- Las rutas de modelo en `playwright.config.ts` apuntan a
  `public/mediapipe/models/`, no al bucket de Google: un intento de carga que
  nunca resuelve (por ejemplo, un 404 local a propósito) compite por el hilo
  principal con los `setInterval` de la cuenta atrás y la ralentiza de forma
  real — se detectó exactamente así durante el desarrollo de esta suite.
- En CI, `workers: 1` y `retries: 2`: cada test carga su propio motor de
  MediaPipe en un navegador sin GPU (WebGL por software); varios a la vez, o
  varios en sucesión dentro del mismo proceso de navegador, acumulan trabajo
  de fondo y generan una latencia variable — de menos de un segundo a bastante
  más — antes de resolverse bien. Nunca se vio realmente bloqueado, solo
  lento; los reintentos absorben esa variabilidad sin ocultar un fallo real.

## Accesibilidad

`e2e/a11y.spec.ts` pasa [axe-core](https://github.com/dequelabs/axe-core) (vía
`@axe-core/playwright`) sobre los mismos estados reales que cubre el resto de
la suite E2E: landing, estudio con la cámara apagada/encendida, paneles
desplegados (calidad de dispositivo, módulo de laptop, cuenta y presets),
grabando, clip listo con el reproductor de vídeo, y foto capturada. Muchas
violaciones solo existen en esos estados interactivos, no en el marcado
estático inicial.

La auditoría encontró y corrigió dos problemas reales:

- **Contraste de texto insuficiente** (WCAG 2.1 AA, ratio mínimo 4.5:1 en
  texto normal): varios textos secundarios usaban opacidades de blanco
  demasiado bajas (`text-white/30` a `text-white/40`, algunos por debajo de
  2.6:1) sobre los fondos oscuros de la app (`#0a0a0a`, `#161616`) — el aviso
  de atajos de teclado en `RecordControls`, las etiquetas `dt` de las
  métricas de depuración, los datos de `DeviceQualityPanel`, etc. Se subieron
  a `text-white/60` o más (ratio ≥ 5:1 en ambos fondos).
- **Falta de `<h1>`** en `/director`: la cabecera renderizaba "DirectorScene"
  como un `<Link>` suelto, sin encabezado. Ahora el enlace vive dentro de un
  `<h1>`, igual que en la landing.

## Configuración

Copia `.env.example` a `.env.local`. Todo es opcional:

- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`: activan cuenta y
  presets en la nube. Sin ellas, la app funciona en modo local.
- `NEXT_PUBLIC_POSE_MODEL_URL` / `NEXT_PUBLIC_FACE_MODEL_URL`: sirven los
  modelos `.task` desde tu propio origen en vez del bucket público de Google.
  Ejecuta antes `npm run fetch:models` y apunta las variables a
  `/mediapipe/models/…`.

Los binarios WASM de MediaPipe se copian a `public/mediapipe/wasm` en el
`postinstall` (y antes de `dev`/`build`), así que se sirven desde el propio
origen y no se versionan en el repo.

El SQL de la tabla `presets` (con RLS por usuario) está en
[`supabase/schema.sql`](supabase/schema.sql).

### Cuenta y presets

El acceso es por **enlace mágico**: el usuario escribe su correo y Supabase le
envía un enlace que vuelve a `/auth/callback`. En el panel de Supabase hay que
añadir esa ruta a *Authentication → URL Configuration → Redirect URLs*
(`http://localhost:3000/auth/callback` y la del despliegue).

Con sesión iniciada los presets se guardan en la tabla `presets`; sin ella —o
sin Supabase configurado— se guardan en `localStorage` y la app lo indica en el
propio panel. Los presets locales no se migran solos a la cuenta al iniciar
sesión.

## Estructura

```
app/                  rutas (App Router): landing, /director y /auth/callback
  icon.tsx            favicon generado por código (next/og), sin binarios
  apple-icon.tsx      ícono de pantalla de inicio en iOS/iPadOS
  icons/[size]/       icono en 192/512 para el manifest de PWA (solo esos)
  manifest.ts         "Añadir a pantalla de inicio" en Android/Chrome
  director/error.tsx  red de seguridad del estudio si algo revienta al render
  global-error.tsx    red de seguridad si falla el propio layout raíz
components/           UI: cámara, HUD en vivo, overlay de guías, controles,
                      grabación, foto, calidad de dispositivo, sugerencias,
                      cuenta y presets
lib/ai/               motor de dirección — es la capa reutilizable en móvil
  mediapipe.ts        carga de los landmarkers (pose + rostro)
  subject.ts          landmarks → métricas de encuadre
  framing.ts          reglas de composición (tercios, distancia, aire, ángulo)
  lighting.ts         histograma → métricas y reglas de luz
  crop.ts             recorte de entrega según la plataforma
  engine.ts           combina reglas + estabiliza sugerencias
  voice.ts            qué instrucción dictar y cuándo callar
  recording.ts        resolución de salida al grabar el clip
  device.ts           calidad de cámara y consejos según el dispositivo
  presets.ts          plataformas, composiciones y ajustes
lib/hooks/            useCamera, useFrameAnalysis, useSettings,
                      useSupabaseSession, useVoiceCoach, useRecorder,
                      useSnapshot
lib/dom.ts            utilidades de teclado/foco compartidas por los atajos
lib/icon-design.tsx   diseño del icono, compartido por favicon/apple/manifest
lib/supabase/         cliente, tipos y queries de presets
scripts/              copia de binarios WASM a public/
supabase/             esquema SQL
e2e/                  suite de humo con Playwright (ver más abajo)
playwright.config.ts  su configuración
```

`lib/ai/` no depende de React ni del DOM salvo por los tipos de MediaPipe: es la
capa que se reutilizará tal cual en la app React Native/Expo.

## Cómo funciona el análisis

En cada frame (unos 15 por segundo, no todos):

1. `PoseLandmarker` y `FaceLandmarker` devuelven landmarks normalizados.
2. Los puntos se espejan (cámara frontal) y se mapean al **recorte de entrega**:
   la franja del frame que realmente se publica según la relación de aspecto de
   la plataforma. Así "centrado" significa lo mismo aquí y en TikTok.
3. `subject.ts` deriva caja, línea de ojos, aire sobre la cabeza, ocupación,
   inclinación de hombros y giro del cuerpo.
4. `framing.ts` y `lighting.ts` convierten esas métricas en instrucciones.
5. `SuggestionStabilizer` exige varios frames seguidos antes de mostrar u ocultar
   una sugerencia, para que la lista no parpadee.

El frame reducido que se usa para el histograma (160 px de ancho) se descarta
inmediatamente: no se guarda ni se transmite.

## Instrucción principal y voz

Mientras se graba no se puede leer el panel lateral: `LiveHud` muestra la
sugerencia más grave como una píldora sobre el propio vídeo, y el chip **Voz**
la dicta con `SpeechSynthesisUtterance` (Web Speech API, también on-device).

`lib/ai/voice.ts` decide qué decir y, sobre todo, cuándo callar: no repite la
misma instrucción antes de `REPEAT_MS`, deja un silencio mínimo (`MIN_GAP_MS`)
al cambiar de instrucción, no interrumpe una frase en curso y confirma "Así
está bien" una sola vez al corregir el encuadre, no en cada frame.

## Grabar el clip

El botón **Grabar clip** no captura el stream crudo de la cámara: redibuja
cada frame del `<video>` en vivo sobre un `<canvas>` recortado y espejado
exactamente como lo ve el usuario, y grava ese canvas con `MediaRecorder`
(`canvas.captureStream()`). El resultado sale ya en el aspecto de la
plataforma elegida (9:16 o 16:9), sin las guías del overlay.

- El audio es opcional (checkbox "Con audio"): pide el micrófono solo al
  pulsar grabar, nunca antes. Si el permiso falla, se sigue grabando sin
  audio con un aviso, en vez de bloquear la toma.
- Cuenta atrás de 3 s antes de grabar de verdad (desactivable con su
  checkbox), con un número grande sobre el vídeo y otro en los controles —
  tiempo para colocarse en cuadro, como en la cámara de TikTok o Instagram.
  Cancelable mientras cuenta.
- Atajos de teclado: barra espaciadora graba/detiene, Esc cancela la cuenta
  atrás o descarta el clip que se está revisando. Se ignoran mientras el
  foco está en un campo de texto (el nombre de un preset, el correo de la
  cuenta), para no interferir con la escritura normal.
- La plataforma queda fijada mientras se grava — cambiarla a mitad de toma
  descoordinaría el recorte con lo que ya se grabó.
- El clip vive en memoria (`Blob` + `URL.createObjectURL`) hasta que se
  descarga o se descarta; nunca se sube a ningún sitio.
- Cada plataforma tiene un tope de duración (`Platform.maxDurationSec` en
  `lib/ai/presets.ts`): 10 min en TikTok, 3 en Reels y Shorts, sin tope en
  YouTube. Al llegar al límite la grabación se corta sola — igual que la
  cámara nativa de esas apps — y los últimos 10 segundos se avisan en ámbar
  con la cuenta atrás ("quedan 0:08").
- **Compartir directamente** (`lib/share.ts`): en móvil (Chrome/Safari con
  Web Share API de nivel 2), el botón **Compartir** abre la hoja nativa del
  sistema con el clip o la foto ya adjuntos — a TikTok, Instagram, WhatsApp,
  donde sea — sin pasar por descargar y volver a subir a mano. Se detecta con
  `navigator.canShare({ files })`: en el resto de navegadores (la mayoría de
  escritorio) el botón no aparece y **Descargar** sigue siendo la única vía,
  como antes.
- Si la cámara trasera del móvil tiene flash controlable (`torch` en
  `MediaTrackCapabilities`, una extensión no estándar de Media Capture),
  aparece un chip **Linterna** en los controles de cámara para usarla como
  luz de relleno — cierra el círculo con la sugerencia "falta luz" del motor
  de iluminación, en vez de dejarla en un simple aviso.

### Capturar una foto

El botón **📷 Foto** (`useSnapshot`) hace una cosa más simple que grabar: saca
un único fotograma con el mismo recorte y espejado que el vídeo, sin las
guías del overlay, como PNG. Útil para elegir una miniatura sin grabar un
clip entero. No comparte canvas con `useRecorder` ni interfiere con una
grabación en curso — se puede capturar una foto mientras se está grabando.

## Calidad según el dispositivo

No hay forma fiable de leer el "modelo" de un móvil desde el navegador (y los
user agents cada vez exponen menos por privacidad), así que en vez de adivinar
"gama alta" o "gama media" por marketing, `lib/ai/device.ts` clasifica la
cámara por lo que **realmente** negoció (`getCapabilities()` /
`getSettings()` de la pista de vídeo): resolución máxima y fps entregados. Eso
es, al final, lo único que determina la calidad del clip.

Con la cámara encendida, el panel plegable **Calidad de grabación** muestra:

- Fuente detectada — trasera o frontal en móvil; en escritorio, webcam externa
  (por marca: Logitech, Elgato, Razer…), integrada (FaceTime, "Integrated
  Camera"…) o sin identificar si el label es demasiado genérico.
- Resolución (SD/HD/Full HD/4K) y los **fps con los que se grabará el
  clip** — nunca más de lo que la cámara entrega de verdad (`useRecorder`
  ajusta `canvas.captureStream()` a ese valor).
- Consejos concretos: acercarse con cámaras de baja resolución, usar la
  trasera del móvil en vez de la frontal, etc.

`getUserMedia` pide 1920×1080 como resolución *ideal* (antes limitaba a
720p): al ser un hint y no una exigencia, el navegador la negocia hacia abajo
en cámaras más modestas sin romper nada, pero deja que las buenas entreguen lo
que realmente tienen.

### Módulo de cámara de laptop

Cuando el label de la cámara delata una webcam integrada (o el usuario marca
la casilla **"Uso la cámara integrada de mi laptop"** — el label a veces es
tan genérico como "Camera" y no hay heurística que lo salve), aparece un
bloque de consejos específico: subir la laptop a la altura de los ojos (las
webcams integradas miran desde abajo), alejarse un brazo (su gran angular
deforma la cara de cerca), pensar en horizontal (la laptop no gira, así que
un botón cambia la plataforma a YouTube 16:9 con un clic), cuidado con el
micrófono integrado (capta teclado y ventilador) y con la ventana a la
espalda (contraluz, el error más común grabando desde el escritorio).

## Instalar como app

`app/manifest.ts` genera el manifest de PWA: en Android/Chrome aparece la
opción "Añadir a pantalla de inicio", que abre el estudio (`start_url:
"/director"`, no la landing) en modo `standalone`, sin la barra del
navegador — como una app de cámara real. En iOS/iPadOS, Safari usa
`apple-icon.tsx` y las etiquetas del layout para lo mismo; no hace falta un
manifest ahí. Los iconos en 192/512 que pide el manifest (`app/icons/[size]`)
comparten diseño con el favicon (`lib/icon-design.tsx`) y se generan también
por código, prerenderizados en build con `generateStaticParams`.

## Si algo falla

`app/director/error.tsx` es el *error boundary* de Next.js para el estudio:
si un bug de verdad revienta durante el render (no un fallo de cámara o de
red — esos ya tienen su propio estado de error dentro de cada hook), en vez
de una pantalla en blanco se muestra un mensaje con dos salidas: **Reintentar**
(`reset()`, vuelve a montar el árbol sin recargar) y **Volver a empezar**
(recarga completa del documento — necesaria porque Next.js mantiene el
boundary activo hasta que se llama a `reset()`, así que una navegación de
cliente a la misma ruta no lo habría limpiado). `app/global-error.tsx` es la
misma red pero para un fallo en el propio layout raíz, fuera del alcance del
anterior.

## Estado

- [x] Captura de cámara + MediaPipe (pose y rostro)
- [x] Motor de reglas: tercios, distancia, centrado, aire, ángulo de cámara
- [x] Histograma → sugerencias de iluminación (contraluz, quemados, lateral)
- [x] Overlay en vivo con guías y panel de sugerencias
- [x] Auth de Supabase (enlace mágico) + presets guardados y sincronizados
- [x] Instrucción principal sobre el vídeo (HUD) y modo voz (Web Speech API)
- [x] Grabar y descargar el clip ya recortado a la plataforma elegida
- [x] Recomendaciones de calidad según la cámara detectada + módulo de laptop
- [x] Tope de duración por plataforma con corte automático + control de linterna
- [x] Cuenta atrás antes de grabar + atajos de teclado (espacio, Esc)
- [x] Captura de foto (miniatura) sin interrumpir la grabación de vídeo
- [x] Favicon propio + error boundaries (estudio y layout raíz)
- [x] Manifest de PWA: instalable en Android/Chrome, abre directo al estudio
- [x] Suite E2E con Playwright (cámara, grabación, foto, PWA) corriendo en CI
- [x] Auditoría de accesibilidad con axe-core (contraste WCAG AA, encabezados)
- [x] Compartir clip/foto directamente en móvil (Web Share API con archivos)
