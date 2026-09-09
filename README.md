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
```

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
components/           UI: cámara, HUD en vivo, overlay de guías, controles,
                      grabación, sugerencias, cuenta y presets
lib/ai/               motor de dirección — es la capa reutilizable en móvil
  mediapipe.ts        carga de los landmarkers (pose + rostro)
  subject.ts          landmarks → métricas de encuadre
  framing.ts          reglas de composición (tercios, distancia, aire, ángulo)
  lighting.ts         histograma → métricas y reglas de luz
  crop.ts             recorte de entrega según la plataforma
  engine.ts           combina reglas + estabiliza sugerencias
  voice.ts            qué instrucción dictar y cuándo callar
  recording.ts        resolución de salida al grabar el clip
  presets.ts          plataformas, composiciones y ajustes
lib/hooks/            useCamera, useFrameAnalysis, useSettings,
                      useSupabaseSession, useVoiceCoach, useRecorder
lib/supabase/         cliente, tipos y queries de presets
scripts/              copia de binarios WASM a public/
supabase/             esquema SQL
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
- La plataforma queda fijada mientras se grava — cambiarla a mitad de toma
  descoordinaría el recorte con lo que ya se grabó.
- El clip vive en memoria (`Blob` + `URL.createObjectURL`) hasta que se
  descarga o se descarta; nunca se sube a ningún sitio.

## Estado

- [x] Captura de cámara + MediaPipe (pose y rostro)
- [x] Motor de reglas: tercios, distancia, centrado, aire, ángulo de cámara
- [x] Histograma → sugerencias de iluminación (contraluz, quemados, lateral)
- [x] Overlay en vivo con guías y panel de sugerencias
- [x] Auth de Supabase (enlace mágico) + presets guardados y sincronizados
- [x] Instrucción principal sobre el vídeo (HUD) y modo voz (Web Speech API)
- [x] Grabar y descargar el clip ya recortado a la plataforma elegida
