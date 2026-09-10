"use client";

import { COMPOSITION_LIST, PLATFORM_LIST, SHOT_STYLES, SHOT_STYLE_LIST } from "@/lib/ai/presets";
import type { DirectorSettings } from "@/lib/ai/presets";

interface ControlBarProps {
  settings: DirectorSettings;
  onChange: <K extends keyof DirectorSettings>(
    key: K,
    value: DirectorSettings[K],
  ) => void;
  devices: MediaDeviceInfo[];
  deviceId: string | null;
  onSelectDevice: (deviceId: string) => void;
  onFlip: () => void;
  cameraReady: boolean;
  /** true mientras se graba: el recorte de plataforma queda fijado a esa toma. */
  platformLocked?: boolean;
  /** Solo la trasera de algunos móviles la tiene; la mayoría de webcams no. */
  torchSupported: boolean;
  torchOn: boolean;
  onToggleTorch: () => void;
}

/** Controles de plataforma, composición y guías visuales. */
export function ControlBar({
  settings,
  onChange,
  devices,
  deviceId,
  onSelectDevice,
  onFlip,
  cameraReady,
  platformLocked = false,
  torchSupported,
  torchOn,
  onToggleTorch,
}: ControlBarProps) {
  return (
    <div className="flex flex-col gap-4">
      <Field label="Plataforma">
        <div className="flex flex-wrap gap-2">
          {PLATFORM_LIST.map((platform) => (
            <Chip
              key={platform.id}
              active={settings.platform === platform.id}
              disabled={platformLocked}
              onClick={() => onChange("platform", platform.id)}
            >
              {platform.label}{" "}
              <span className="text-[10px] opacity-90">{platform.aspectLabel}</span>
            </Chip>
          ))}
        </div>
        {platformLocked ? (
          <p className="text-[10px] text-white/60">
            Fijada mientras grabas.
          </p>
        ) : null}
      </Field>

      <Field label="Composición">
        <div className="flex flex-wrap gap-2">
          {COMPOSITION_LIST.map((composition) => (
            <Chip
              key={composition.id}
              active={settings.composition === composition.id}
              onClick={() => onChange("composition", composition.id)}
            >
              {composition.label}
            </Chip>
          ))}
        </div>
      </Field>

      <Field label="Estilo de plano">
        <div className="flex flex-wrap gap-2">
          {SHOT_STYLE_LIST.map((style) => (
            <Chip
              key={style.id}
              active={settings.shotStyle === style.id}
              onClick={() => onChange("shotStyle", style.id)}
            >
              {style.label}
            </Chip>
          ))}
        </div>
        <p className="text-[10px] text-white/60">
          {SHOT_STYLES[settings.shotStyle].description}
        </p>
      </Field>

      <Field label="Guías">
        <div className="flex flex-wrap gap-2">
          <Chip
            active={settings.showGrid}
            onClick={() => onChange("showGrid", !settings.showGrid)}
          >
            Tercios
          </Chip>
          <Chip
            active={settings.showSafeArea}
            onClick={() => onChange("showSafeArea", !settings.showSafeArea)}
          >
            Zona segura
          </Chip>
          <Chip
            active={settings.showSkeleton}
            onClick={() => onChange("showSkeleton", !settings.showSkeleton)}
          >
            Esqueleto
          </Chip>
          <Chip
            active={settings.voice}
            onClick={() => onChange("voice", !settings.voice)}
          >
            Voz
          </Chip>
          <Chip
            active={settings.minSeverity === "warn"}
            onClick={() =>
              onChange("minSeverity", settings.minSeverity === "warn" ? "info" : "warn")
            }
          >
            Solo avisos
          </Chip>
        </div>
      </Field>

      <Field label="Cámara">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onFlip}
            disabled={!cameraReady || platformLocked}
            className="rounded-full border border-white/15 px-3 py-1.5 text-xs font-medium text-white/80 transition hover:border-white/40 hover:text-white disabled:opacity-40"
          >
            Cambiar frontal/trasera
          </button>
          {torchSupported ? (
            <Chip active={torchOn} onClick={onToggleTorch}>
              🔦 Linterna
            </Chip>
          ) : null}
          {devices.length > 1 ? (
            <select
              value={deviceId ?? ""}
              onChange={(event) => onSelectDevice(event.target.value)}
              className="rounded-full border border-white/15 bg-transparent px-3 py-1.5 text-xs text-white/80 outline-none"
            >
              <option value="" className="bg-neutral-900">
                Automática
              </option>
              {devices.map((device, index) => (
                <option
                  key={device.deviceId}
                  value={device.deviceId}
                  className="bg-neutral-900"
                >
                  {device.label || `Cámara ${index + 1}`}
                </option>
              ))}
            </select>
          ) : null}
        </div>
      </Field>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-[11px] uppercase tracking-wider text-white/60">
        {label}
      </span>
      {children}
    </div>
  );
}

function Chip({
  active,
  onClick,
  disabled = false,
  children,
}: {
  active: boolean;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      className={`rounded-full border px-3 py-1.5 text-xs font-medium transition disabled:opacity-40 ${
        active
          ? "border-sky-400/60 bg-sky-400/15 text-sky-100"
          : "border-white/15 text-white/70 hover:border-white/40 hover:text-white"
      }`}
    >
      {children}
    </button>
  );
}
