import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

/**
 * Icono generado por código en vez de un binario a mano: cuatro esquinas de
 * encuadre (el propio corazón visual de la app) con un punto de grabación.
 * `next/og` lo renderiza a PNG en build time — sin depender de una CDN ni de
 * herramientas de imagen externas.
 */
export default function Icon() {
  const corner: React.CSSProperties = {
    position: "absolute",
    width: 9,
    height: 9,
    borderColor: "#f5f5f5",
    borderStyle: "solid",
    borderWidth: 0,
  };

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: "#0a0a0a",
          borderRadius: 7,
          position: "relative",
        }}
      >
        <div style={{ ...corner, top: 4, left: 4, borderTopWidth: 2.5, borderLeftWidth: 2.5 }} />
        <div
          style={{ ...corner, top: 4, right: 4, borderTopWidth: 2.5, borderRightWidth: 2.5 }}
        />
        <div
          style={{
            ...corner,
            bottom: 4,
            left: 4,
            borderBottomWidth: 2.5,
            borderLeftWidth: 2.5,
          }}
        />
        <div
          style={{
            ...corner,
            bottom: 4,
            right: 4,
            borderBottomWidth: 2.5,
            borderRightWidth: 2.5,
          }}
        />
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: "#fb2c36",
            transform: "translate(-50%, -50%)",
          }}
        />
      </div>
    ),
    size,
  );
}
