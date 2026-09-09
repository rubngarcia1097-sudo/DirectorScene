import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/**
 * Mismo diseño que `icon.tsx`, escalado para el ícono de pantalla de inicio
 * de iOS/iPadOS. iOS aplica su propia máscara de esquinas redondeadas, así
 * que el fondo va sin recortar.
 */
export default function AppleIcon() {
  const corner: React.CSSProperties = {
    position: "absolute",
    width: 50,
    height: 50,
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
          position: "relative",
        }}
      >
        <div style={{ ...corner, top: 24, left: 24, borderTopWidth: 14, borderLeftWidth: 14 }} />
        <div
          style={{ ...corner, top: 24, right: 24, borderTopWidth: 14, borderRightWidth: 14 }}
        />
        <div
          style={{
            ...corner,
            bottom: 24,
            left: 24,
            borderBottomWidth: 14,
            borderLeftWidth: 14,
          }}
        />
        <div
          style={{
            ...corner,
            bottom: 24,
            right: 24,
            borderBottomWidth: 14,
            borderRightWidth: 14,
          }}
        />
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            width: 44,
            height: 44,
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
