@AGENTS.md

# DirectorScene

Web app que dirige al usuario mientras graba (encuadre, ángulo, luz) para
TikTok, Reels, Shorts y YouTube. Ver `docs/ARQUITECTURA.md` y `README.md`.

## Reglas del proyecto

- **El vídeo nunca sale del navegador.** Toda la visión corre on-device con
  MediaPipe. El backend solo maneja auth y preferencias; ningún frame, métrica
  de sujeto ni audio se envía a un servidor.
- `lib/ai/` no debe importar React ni tocar el DOM (salvo tipos de MediaPipe):
  es la capa que se reutilizará en React Native/Expo.
- Las reglas de dirección son funciones puras sobre métricas normalizadas
  (0..1). Nada de píxeles absolutos en la lógica.
- El análisis trabaja en el **recorte de entrega** (`lib/ai/crop.ts`), no sobre
  el frame completo de cámara.
- Windows + avisos CRLF: ya existe `.gitattributes` (`* text=auto eol=lf`);
  ejecutar además `git config core.autocrlf false`.

## Trabajo con Claude Code

- Optimizar contexto: agrupar comandos independientes en una llamada, acotar
  salidas (`head`/`tail`/`--maxdepth`), usar Glob/Grep en vez de `find`/`ls -R`/
  `cat`, no releer archivos recién escritos.
- Cierres de sesión: resumen de 1-2 frases, sin recapitular.
- Un punto del roadmap por sesión/PR.

## Comandos

```bash
npm run dev        # servidor de desarrollo
npm test           # Vitest (motor de reglas)
npm run lint       # ESLint
npm run typecheck  # tsc --noEmit
npm run build      # build de producción
npm run test:e2e   # Playwright (ver README: "Pruebas de extremo a extremo")
```

Antes de dar por buena una sesión: `npm test && npm run lint && npm run build`.
Si se toca cámara, grabación o navegación, correr también `npm run test:e2e`
(necesita `npx playwright install --with-deps chromium` una vez).
