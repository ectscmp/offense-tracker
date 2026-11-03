"use client";

import type { IScannerControls } from "@zxing/browser";
import { Camera, CameraOff, Flashlight, LoaderCircle, ScanLine } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { resolveScanAction } from "@/app/actions";

type ScanStatus = "idle" | "starting" | "live" | "resolving" | "error";

export function ScanCamera() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const handlingRef = useRef(false);
  const lastCodeRef = useRef("");
  const lastCodeAtRef = useRef(0);
  const [status, setStatus] = useState<ScanStatus>("idle");
  const [message, setMessage] = useState("");
  const [manual, setManual] = useState("");
  const [torchOn, setTorchOn] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);

  useEffect(() => {
    return () => {
      controlsRef.current?.stop();
      controlsRef.current = null;
    };
  }, []);

  function stopCamera(nextStatus: ScanStatus = "idle") {
    controlsRef.current?.stop();
    controlsRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setTorchOn(false);
    setTorchSupported(false);
    setStatus(nextStatus);
  }

  async function resolveCode(code: string) {
    const cleaned = code.trim();
    if (!cleaned || handlingRef.current) return;
    handlingRef.current = true;
    setStatus("resolving");
    setMessage("");

    try {
      const result = await resolveScanAction(cleaned);
      if (!result.ok) {
        stopCamera("error");
        setMessage(result.message);
        return;
      }
      stopCamera("idle");
      router.push(result.href);
    } catch {
      stopCamera("error");
      setMessage("Could not resolve that code. Try the roster search.");
    } finally {
      handlingRef.current = false;
    }
  }

  async function startCamera() {
    if (controlsRef.current) return;
    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus("error");
      setMessage("Camera access needs HTTPS or localhost. Use the code box or roster search.");
      return;
    }

    setStatus("starting");
    setMessage("");
    try {
      const { BrowserMultiFormatReader } = await import("@zxing/browser");
      const reader = new BrowserMultiFormatReader(undefined, {
        delayBetweenScanAttempts: 250,
        delayBetweenScanSuccess: 1500,
      });
      if (!videoRef.current) throw new Error("No video element.");
      const controls = await reader.decodeFromConstraints(
        { video: { facingMode: { ideal: "environment" } } },
        videoRef.current,
        (result) => {
          if (!result) return;
          const code = result.getText();
          const now = Date.now();
          if (code === lastCodeRef.current && now - lastCodeAtRef.current < 3000) return;
          lastCodeRef.current = code;
          lastCodeAtRef.current = now;
          void resolveCode(code);
        },
      );
      controlsRef.current = controls;
      setTorchSupported(Boolean(controls.switchTorch));
      setStatus("live");
    } catch (error) {
      controlsRef.current?.stop();
      controlsRef.current = null;
      setStatus("error");
      setMessage(
        error instanceof DOMException && error.name === "NotAllowedError"
          ? "Camera permission was denied. Use the code box or roster search."
          : "Camera could not start. Use the code box or roster search.",
      );
    }
  }

  async function toggleTorch() {
    const controls = controlsRef.current;
    if (!controls?.switchTorch) return;
    try {
      await controls.switchTorch(!torchOn);
      setTorchOn((current) => !current);
    } catch {
      setTorchSupported(false);
      setMessage("This camera does not support the torch control.");
    }
  }

  async function submitManual(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await resolveCode(manual);
  }

  const live = status === "live";
  const busy = status === "starting" || status === "resolving";

  return (
    <section className="overflow-hidden rounded-3xl border border-line bg-[#070b12] text-white shadow-xl">
      <div className="flex items-center justify-between px-4 pt-4">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/10">
            <ScanLine size={17} />
          </span>
          <div>
            <p className="text-xs font-bold">Camera scanner</p>
            <p className="text-[10px] text-white/50">
              {live ? "Point at an ID or class QR" : "Student ID or classroom QR"}
            </p>
          </div>
        </div>
        <span
          className={`h-2 w-2 rounded-full ${live ? "bg-emerald-400" : status === "error" ? "bg-rose-400" : "bg-white/25"}`}
          aria-label={live ? "Camera live" : "Camera idle"}
        />
      </div>

      <div className="relative mx-4 mt-3 h-[260px] overflow-hidden rounded-2xl bg-black lg:h-[320px]">
        <video
          ref={videoRef}
          muted
          playsInline
          className={`h-full w-full object-cover ${live || status === "starting" ? "opacity-100" : "opacity-0"}`}
        />

        {!live && status !== "starting" ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#070b12] px-6 text-center">
            <Camera size={30} className="text-white/35" />
            <p className="mt-3 max-w-[220px] text-[11px] leading-5 text-white/55">
              Camera capture stays on this device. If permission is blocked, enter the code below.
            </p>
          </div>
        ) : null}

        {status === "starting" ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70">
            <LoaderCircle size={25} className="animate-spin text-white/70" />
            <p className="mt-2 text-[11px] text-white/60">Starting camera…</p>
          </div>
        ) : null}

        {live ? (
          <div className="pointer-events-none absolute inset-0">
            <span className="absolute left-5 top-5 h-7 w-7 rounded-tl-lg border-l-2 border-t-2 border-white/80" />
            <span className="absolute right-5 top-5 h-7 w-7 rounded-tr-lg border-r-2 border-t-2 border-white/80" />
            <span className="absolute bottom-5 left-5 h-7 w-7 rounded-bl-lg border-b-2 border-l-2 border-white/80" />
            <span className="absolute bottom-5 right-5 h-7 w-7 rounded-br-lg border-b-2 border-r-2 border-white/80" />
            <span className="absolute left-1/2 top-1/2 h-0.5 w-32 -translate-x-1/2 bg-brand shadow-[0_0_12px_2px_rgba(129,140,248,0.8)]" />
          </div>
        ) : null}

        {status === "resolving" ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80">
            <LoaderCircle size={24} className="animate-spin" />
            <p className="mt-2 text-[11px]">Finding student…</p>
          </div>
        ) : null}

        {!live && status !== "starting" ? (
          <button
            type="button"
            onClick={startCamera}
            className="absolute bottom-3 left-1/2 flex h-10 -translate-x-1/2 items-center gap-2 rounded-full bg-white px-5 text-xs font-bold text-[#070b12]"
          >
            <Camera size={16} />
            {status === "error" ? "Try camera again" : "Start camera"}
          </button>
        ) : null}
      </div>

      {live ? (
        <div className="flex gap-2 px-4 pt-3">
          {torchSupported ? (
            <button
              type="button"
              onClick={toggleTorch}
              className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-xl bg-white/10 text-[11px] font-bold text-white"
            >
              <Flashlight size={14} />
              {torchOn ? "Torch on" : "Torch"}
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => stopCamera("idle")}
            className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-xl bg-white/10 text-[11px] font-bold text-white"
          >
            <CameraOff size={14} />
            Stop
          </button>
        </div>
      ) : null}

      {message ? (
        <p aria-live="polite" className="mx-4 mt-3 rounded-xl bg-rose-500/15 px-3 py-2 text-[11px] leading-5 text-rose-200">
          {message}
        </p>
      ) : null}

      <form onSubmit={submitManual} className="px-4 pb-4 pt-3">
        <label htmlFor="manual-code" className="text-[10px] font-bold uppercase tracking-[0.1em] text-white/45">
          Or enter a code
        </label>
        <div className="mt-1.5 flex gap-2">
          <input
            id="manual-code"
            value={manual}
            onChange={(event) => setManual(event.target.value)}
            placeholder="Student ID or QR code"
            autoComplete="off"
            className="h-10 min-w-0 flex-1 rounded-xl border border-white/15 bg-white/5 px-3 text-base text-white outline-none placeholder:text-white/30 focus:border-white/40"
          />
          <button
            type="submit"
            disabled={busy || !manual.trim()}
            className="flex h-10 items-center justify-center rounded-xl bg-white px-4 text-xs font-bold text-[#070b12] disabled:opacity-40"
          >
            Open
          </button>
        </div>
      </form>
    </section>
  );
}
