import type { CSSProperties } from "react";

/**
 * Diseño del icono de DirectorScene: cuatro esquinas de encuadre con un
 * punto de grabación en el centro — la propia identidad visual de lo que la
 * app hace. Compartido por `app/icon.tsx`, `app/apple-icon.tsx` y las rutas
 * de iconos del manifest (`app/icons/[size]`), todas generadas por código
 * con `next/og` en vez de un binario a mano.
 *
 * Las medidas son proporciones del tamaño pedido, no píxeles fijos, para que
 * el mismo diseño sirva igual de bien en el favicon (32px) que en un icono
 * de instalación de 512px.
 */
export function buildIconElement(size: number, { rounded = false } = {}) {
  const inset = size * 0.125;
  const cornerSize = size * 0.28;
  const borderWidth = size * 0.078;
  const dotSize = size * 0.25;

  const corner: CSSProperties = {
    position: "absolute",
    width: cornerSize,
    height: cornerSize,
    borderColor: "#f5f5f5",
    borderStyle: "solid",
    borderWidth: 0,
  };

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        background: "#0a0a0a",
        borderRadius: rounded ? size * 0.22 : 0,
        position: "relative",
      }}
    >
      <div
        style={{
          ...corner,
          top: inset,
          left: inset,
          borderTopWidth: borderWidth,
          borderLeftWidth: borderWidth,
        }}
      />
      <div
        style={{
          ...corner,
          top: inset,
          right: inset,
          borderTopWidth: borderWidth,
          borderRightWidth: borderWidth,
        }}
      />
      <div
        style={{
          ...corner,
          bottom: inset,
          left: inset,
          borderBottomWidth: borderWidth,
          borderLeftWidth: borderWidth,
        }}
      />
      <div
        style={{
          ...corner,
          bottom: inset,
          right: inset,
          borderBottomWidth: borderWidth,
          borderRightWidth: borderWidth,
        }}
      />
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          width: dotSize,
          height: dotSize,
          borderRadius: "50%",
          background: "#fb2c36",
          transform: "translate(-50%, -50%)",
        }}
      />
    </div>
  );
}
