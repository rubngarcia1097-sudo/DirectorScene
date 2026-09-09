"use client";

interface HelpGuideProps {
  expanded: boolean;
  onToggle: () => void;
}

/**
 * Manual de uso dentro de la propia app: qué hace DirectorScene, cómo
 * arrancar, qué significa cada color y término técnico. Pensado para quien
 * abre la herramienta por primera vez y no va a leer el README del repo.
 */
export function HelpGuide({ expanded, onToggle }: HelpGuideProps) {
  return (
    <section className="rounded-xl border border-white/10 bg-white/5">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <span className="text-[11px] uppercase tracking-wider text-white/50">
          Guía de uso
        </span>
        <span aria-hidden className="text-xs text-white/60">
          {expanded ? "−" : "+"}
        </span>
      </button>

      {expanded ? (
        <div className="flex flex-col gap-4 border-t border-white/10 p-4 text-xs leading-relaxed text-white/70">
          <GuideSection title="Cómo funciona">
            <p>
              DirectorScene analiza tu cámara en tu propio navegador (nada se
              sube a ningún servidor) y te avisa en vivo de tres cosas:
              encuadre, ángulo de cámara e iluminación. No corrige nada por
              ti — te dice qué ajustar para que lo hagas tú.
            </p>
          </GuideSection>

          <GuideSection title="Para empezar">
            <ol className="flex flex-col gap-1 pl-4">
              <li className="list-decimal">
                Elige una <strong className="text-white/90">plantilla rápida</strong>{" "}
                si vas a grabar algo típico (hablar a cámara, mostrar un
                producto), o configura plataforma, composición y estilo de
                plano a mano.
              </li>
              <li className="list-decimal">Enciende la cámara.</li>
              <li className="list-decimal">
                Colócate siguiendo la <strong className="text-white/90">guía técnica</strong>{" "}
                del estilo elegido (aparece bajo las sugerencias) y ajusta la
                luz de tu espacio antes de grabar, no durante.
              </li>
              <li className="list-decimal">
                Cuando el panel de sugerencias diga &ldquo;Encuadre y luz
                correctos&rdquo;, pulsa Grabar clip.
              </li>
            </ol>
          </GuideSection>

          <GuideSection title="Qué significan los colores">
            <ul className="flex flex-col gap-1 pl-4">
              <li className="list-disc">
                <span className="text-emerald-300">Verde</span>: todo
                correcto, se puede grabar así.
              </li>
              <li className="list-disc">
                <span className="text-sky-300">Azul</span>: detalle menor,
                mejora la toma pero no es grave.
              </li>
              <li className="list-disc">
                <span className="text-amber-300">Ámbar</span>: aviso
                importante — vale la pena corregirlo antes de grabar.
              </li>
            </ul>
          </GuideSection>

          <GuideSection title="Plantillas: cuál usar">
            <ul className="flex flex-col gap-1 pl-4">
              <li className="list-disc">
                <strong className="text-white/90">Hablas a cámara</strong>:
                storytime, opinión, reseña — estás cerca de cámara y eres tú
                el centro del plano.
              </li>
              <li className="list-disc">
                <strong className="text-white/90">Producto en mano</strong>:
                unboxing o demo — necesitas más aire para que quepan tus
                manos y lo que enseñas, así que el plano es más abierto.
              </li>
            </ul>
            <p className="mt-2">
              El motor analiza tu cuerpo y la luz de la escena, no el
              producto en sí: no detecta si el objeto está bien encuadrado o
              iluminado, solo a quien lo sostiene.
            </p>
          </GuideSection>

          <GuideSection title="Glosario">
            <dl className="flex flex-col gap-2">
              <div>
                <dt className="font-medium text-white/90">Encuadre</dt>
                <dd>Qué parte de la escena entra en el cuadro final.</dd>
              </div>
              <div>
                <dt className="font-medium text-white/90">Contraluz</dt>
                <dd>
                  El fondo tiene más luz que tú (p. ej. una ventana detrás):
                  sales oscuro y a contraluz.
                </dd>
              </div>
              <div>
                <dt className="font-medium text-white/90">Aire sobre la cabeza</dt>
                <dd>
                  Espacio libre entre la parte alta de la cabeza y el borde
                  superior del cuadro.
                </dd>
              </div>
              <div>
                <dt className="font-medium text-white/90">Zona segura</dt>
                <dd>
                  Franjas del cuadro que la propia app de destino (TikTok,
                  Reels...) tapa con su interfaz (descripción, botones).
                </dd>
              </div>
              <div>
                <dt className="font-medium text-white/90">Plano medio corto</dt>
                <dd>Encuadre que muestra desde el pecho hacia arriba.</dd>
              </div>
            </dl>
          </GuideSection>

          <GuideSection title="Atajos de teclado">
            <p>
              Barra espaciadora: grabar o detener. Esc: cancelar la cuenta
              atrás o descartar el clip que estás revisando.
            </p>
          </GuideSection>

          <GuideSection title="Privacidad">
            <p>
              El vídeo nunca sale de tu navegador. El análisis corre en tu
              propio dispositivo; al backend solo viajan preferencias y
              presets si inicias sesión.
            </p>
          </GuideSection>
        </div>
      ) : null}
    </section>
  );
}

function GuideSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wider text-white/50">
        {title}
      </p>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}
