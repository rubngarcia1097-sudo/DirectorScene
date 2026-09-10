"use client";

import { useEffect, useMemo, useState } from "react";

import { AccountPanel } from "@/components/AccountPanel";
import { CameraStage } from "@/components/CameraStage";
import { ControlBar } from "@/components/ControlBar";
import { DeviceQualityPanel } from "@/components/DeviceQualityPanel";
import { HelpGuide } from "@/components/HelpGuide";
import { PresetsPanel } from "@/components/PresetsPanel";
import { QuickPresets } from "@/components/QuickPresets";
import { RecordControls } from "@/components/RecordControls";
import { ShotGuide } from "@/components/ShotGuide";
import { SnapshotButton } from "@/components/SnapshotButton";
import { ShotScore, SuggestionPanel } from "@/components/SuggestionPanel";
import { buildDeviceProfile } from "@/lib/ai/device";
import { useCamera } from "@/lib/hooks/useCamera";
import { useFrameAnalysis } from "@/lib/hooks/useFrameAnalysis";
import { useRecorder } from "@/lib/hooks/useRecorder";
import { useSettings } from "@/lib/hooks/useSettings";
import { useSnapshot } from "@/lib/hooks/useSnapshot";
import { useSupabaseSession } from "@/lib/hooks/useSupabaseSession";
import { useVoiceCoach } from "@/lib/hooks/useVoiceCoach";

/** Pantalla principal: cámara + análisis + sugerencias en vivo. */
export function DirectorStudio() {
  const { settings, setSettings, update } = useSettings();
  const camera = useCamera();
  const auth = useSupabaseSession();
  const [showDebug, setShowDebug] = useState(false);
  const [showLibrary, setShowLibrary] = useState(false);
  const [showQuality, setShowQuality] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  // El label de la cámara no siempre delata que es la integrada de una
  // laptop (a veces es tan genérico como "Camera"); el usuario lo confirma.
  const [forceLaptopCamera, setForceLaptopCamera] = useState(false);

  const { analysis, status, error, fps, poseLandmarks } = useFrameAnalysis({
    videoRef: camera.videoRef,
    enabled: camera.status === "ready",
    mirrored: camera.mirrored,
    settings,
  });

  useVoiceCoach({ analysis, enabled: settings.voice });

  const deviceProfile = useMemo(() => {
    if (!camera.trackInfo) return null;
    return buildDeviceProfile({
      deviceKind: camera.trackInfo.deviceKind,
      label: camera.trackInfo.label,
      facingMode: camera.facingMode,
      capabilities: camera.trackInfo.capabilities,
      forceLaptopCamera,
    });
  }, [camera.facingMode, camera.trackInfo, forceLaptopCamera]);

  const recorder = useRecorder({
    videoRef: camera.videoRef,
    active: camera.status === "ready",
    mirrored: camera.mirrored,
    platform: settings.platform,
    filter: settings.filter,
    lightBoost: settings.lightBoost,
    targetFrameRate: deviceProfile?.recommendedFrameRate,
  });

  const snapshot = useSnapshot({
    videoRef: camera.videoRef,
    mirrored: camera.mirrored,
    platform: settings.platform,
    filter: settings.filter,
    lightBoost: settings.lightBoost,
  });

  // Al salir de la pantalla cortamos el stream: la cámara no queda encendida.
  useEffect(() => camera.stop, [camera.stop]);

  return (
    <div className="grid flex-1 gap-6 md:grid-cols-[minmax(0,1fr)_360px]">
      <section className="flex flex-col gap-4">
        <CameraStage
          videoRef={camera.videoRef}
          cameraStatus={camera.status}
          cameraError={camera.error}
          engineStatus={status}
          engineError={error}
          mirrored={camera.mirrored}
          settings={settings}
          subject={analysis?.subject ?? null}
          poseLandmarks={poseLandmarks}
          analysis={analysis}
          countdownSeconds={recorder.countdownSeconds}
          onStart={() => void camera.start()}
          onSelectFilter={(id) => update("filter", id)}
          onLightBoostChange={(value) => update("lightBoost", value)}
        />

        <div className="flex flex-wrap items-start justify-between gap-3">
          <RecordControls recorder={recorder} disabled={camera.status !== "ready"} />
          <SnapshotButton snapshot={snapshot} disabled={camera.status !== "ready"} />
        </div>

        <HelpGuide expanded={showHelp} onToggle={() => setShowHelp((current) => !current)} />

        <DeviceQualityPanel
          profile={deviceProfile}
          expanded={showQuality}
          onToggle={() => setShowQuality((current) => !current)}
          forceLaptopCamera={forceLaptopCamera}
          onToggleForceLaptop={() => setForceLaptopCamera((current) => !current)}
          onUseHorizontal={() => update("platform", "youtube")}
          platformIsHorizontal={settings.platform === "youtube"}
        />

        <QuickPresets onApply={setSettings} disabled={recorder.status === "recording"} />

        <ControlBar
          settings={settings}
          onChange={update}
          devices={camera.devices}
          deviceId={camera.deviceId}
          onSelectDevice={camera.selectDevice}
          onFlip={camera.flip}
          torchSupported={camera.torchSupported}
          torchOn={camera.torchOn}
          onToggleTorch={() => void camera.setTorch(!camera.torchOn)}
          cameraReady={camera.status === "ready"}
          platformLocked={recorder.status === "recording"}
        />

        <section className="rounded-xl border border-white/10 bg-white/5">
          <button
            type="button"
            onClick={() => setShowLibrary((current) => !current)}
            aria-expanded={showLibrary}
            className="flex w-full items-center justify-between px-4 py-3 text-left"
          >
            <span className="text-[11px] uppercase tracking-wider text-white/50">
              Cuenta y presets
            </span>
            <span aria-hidden className="text-xs text-white/60">
              {showLibrary ? "−" : "+"}
            </span>
          </button>

          {showLibrary ? (
            <div className="flex flex-col gap-4 border-t border-white/10 p-4">
              <AccountPanel auth={auth} />
              <PresetsPanel
                settings={settings}
                onApply={setSettings}
                sessionKey={auth.session?.user.id ?? "local"}
                remote={Boolean(auth.session)}
              />
            </div>
          ) : null}
        </section>
      </section>

      <aside className="flex flex-col gap-4">
        <ShotScore analysis={analysis} />

        <SuggestionPanel
          analysis={analysis}
          placeholder={
            camera.status === "ready"
              ? "Analizando la toma…"
              : "Enciende la cámara para recibir indicaciones."
          }
        />

        <ShotGuide shotStyle={settings.shotStyle} />

        <button
          type="button"
          onClick={() => setShowDebug((current) => !current)}
          className="self-start text-[11px] uppercase tracking-wider text-white/60 hover:text-white/70"
        >
          {showDebug ? "Ocultar métricas" : "Ver métricas"}
        </button>

        {showDebug && analysis ? (
          <dl className="grid grid-cols-2 gap-x-4 gap-y-1 rounded-lg border border-white/10 bg-white/5 p-3 text-xs text-white/70">
            <Metric label="Análisis/s" value={fps.toFixed(0)} />
            <Metric label="Latencia" value={`${analysis.latencyMs.toFixed(1)} ms`} />
            <Metric label="Brillo" value={pct(analysis.lighting.brightness)} />
            <Metric label="Contraste" value={pct(analysis.lighting.contrast)} />
            <Metric
              label="Sujeto/fondo"
              value={`${pct(analysis.lighting.subjectBrightness ?? 0)} / ${pct(
                analysis.lighting.backgroundBrightness,
              )}`}
            />
            <Metric label="Ocupación" value={pct(analysis.subject.fill)} />
            <Metric
              label="Confianza"
              value={pct(analysis.subject.confidence)}
            />
            <Metric
              label="Inclinación"
              value={
                analysis.subject.shoulderTiltDeg === null
                  ? "—"
                  : `${analysis.subject.shoulderTiltDeg.toFixed(0)}°`
              }
            />
          </dl>
        ) : null}

        <p className="mt-auto text-[11px] leading-relaxed text-white/60">
          El análisis corre íntegramente en tu dispositivo con MediaPipe. Ningún
          frame se envía a un servidor ni se almacena.
        </p>
      </aside>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <>
      <dt className="text-white/60">{label}</dt>
      <dd className="text-right tabular-nums">{value}</dd>
    </>
  );
}

function pct(value: number): string {
  return `${Math.round(value * 100)}%`;
}
