# Director de Video IA — Documento maestro

## 1. Qué es
Web app que actúa como director de video en tiempo real: guía al usuario mientras graba (encuadre, ángulo, enfoque, iluminación) para mejorar tomas destinadas a TikTok, Instagram y YouTube. La IA corre en el navegador (no en servidor) para dar sugerencias sin latencia.

## 2. Stack
- **Frontend:** Next.js + TypeScript, desplegado en Vercel
- **IA on-device:** MediaPipe (pose/face landmarks) vía WebAssembly/WebGL, corre 100% en el cliente
- **Iluminación:** Canvas API leyendo histograma de brillo del frame en vivo
- **Backend:** funciones serverless de Vercel (solo auth y ajustes de usuario, sin video)
- **Datos/Auth:** Supabase (Postgres + Auth + Storage)
- **Futuro móvil:** React Native/Expo reutilizando la misma lógica de reglas y MediaPipe nativo

## 3. Arquitectura
```
Navegador (cliente)
├── Cámara (getUserMedia) → Motor de IA (MediaPipe: pose/encuadre)
└── Overlay en pantalla (sugerencias en vivo)
        │ guarda preferencias
        ▼
Backend serverless (Vercel)
   Auth + ajustes de usuario
        │
        ▼
Supabase (Postgres, Auth, Storage)
   Presets y perfiles
```
Principio clave: el video **nunca sale del navegador**. Solo viajan al backend datos ligeros (preferencias, presets), nunca frames de video.

## 4. Estructura de carpetas propuesta
```
/app                 # rutas Next.js (App Router)
/components          # UI (overlay, controles, cámara)
/lib/ai              # wrappers de MediaPipe, motor de reglas de encuadre/luz
/lib/supabase        # cliente y queries
/lib/hooks           # useCamera, useFrameAnalysis, etc.
/public
```

## 5. Roadmap MVP
1. Captura de cámara + integración MediaPipe (pose/rostro)
2. Motor de reglas: regla de tercios, distancia, centrado
3. Análisis de histograma → sugerencias de iluminación
4. Overlay visual con sugerencias en tiempo real
5. Auth básica (Supabase) + guardar presets favoritos

## 6. Instrucciones para arrancar con Claude Code
Al abrir este proyecto en Claude Code por primera vez, pedir:
1. `npx create-next-app@latest` (TypeScript, App Router, Tailwind)
2. Instalar `@mediapipe/tasks-vision` y `@supabase/supabase-js`
3. Crear la estructura de carpetas de la sección 4
4. Implementar en orden el roadmap de la sección 5 (un punto por sesión/PR)
5. Si el repo corre en Windows y aparecen avisos de CRLF/LF en cada commit: crear `.gitattributes` con `* text=auto eol=lf` (binarios como `binary`) y ejecutar `git config core.autocrlf false`; verificar con un commit de prueba

## 7. Reglas de trabajo (pegar en CLAUDE.md del repo)
```
- Optimizar contexto: agrupar comandos independientes en una llamada,
  acotar salidas (head/tail/--maxdepth), usar Glob/Grep en vez de
  find/ls -R/cat, no releer archivos recién escritos.
- Cierres de sesión: resumen de 1-2 frases, sin recapitular.
- Windows + avisos CRLF: .gitattributes (* text=auto eol=lf,
  binarios como binary) + git config core.autocrlf false.
- El video nunca sale del navegador: toda IA de visión corre on-device
  (MediaPipe). El backend solo maneja auth y preferencias.
```
