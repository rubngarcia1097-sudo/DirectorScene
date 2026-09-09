import type { NextConfig } from "next";

/**
 * Cabeceras de seguridad básicas, aplicadas a todo el sitio. Sin CSP a
 * propósito: la URL de Supabase es distinta en cada despliegue (variable de
 * entorno del usuario) y una política mal ajustada rompería el login sin
 * avisar; el resto de cabeceras no dependen de esa configuración y no tienen
 * ese riesgo.
 */
const securityHeaders = [
  // Solo esta app puede pedir cámara/micrófono, y solo para sí misma —
  // ni un iframe de terceros ni un origen que la incruste heredan el permiso.
  { key: "Permissions-Policy", value: "camera=(self), microphone=(self), geolocation=()" },
  // Nadie debería enmarcar el estudio en un iframe ajeno (clickjacking sobre
  // los controles de grabación).
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
