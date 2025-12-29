"use client";

import { useEffect, useRef, useState } from "react";

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

export default function Page() {
  const videoRef = useRef<HTMLVideoElement>(null);

  const [cameraReady, setCameraReady] = useState(false);
  const [phase, setPhase] = useState<"idle" | "countdown" | "result">("idle");

  const [count, setCount] = useState<number | null>(null);
  const [stripUrl, setStripUrl] = useState<string | null>(null);

  // Ask for camera permission on load
  useEffect(() => {
    navigator.mediaDevices
      .getUserMedia({ video: true })
      .then((stream) => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          setCameraReady(true);
        }
      })
      .catch(() => {
        alert("Camera permission is required.");
      });
  }, []);

  async function startSequence() {
    setStripUrl(null);

    const shots: string[] = [];

    for (let shot = 0; shot < 4; shot++) {
      setPhase("countdown");

      for (let i = 8; i > 0; i--) {
        setCount(i);
        await wait(1000);
      }

      setCount(null);
      shots.push(capture());
      await wait(600);
    }

    const strip = await buildStrip(shots);
    setStripUrl(strip);
    setPhase("result");
  }

  function capture(): string {
    const video = videoRef.current!;
    const canvas = document.createElement("canvas");

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext("2d")!;
    ctx.filter = "grayscale(100%) contrast(1.15)";
    ctx.drawImage(video, 0, 0);

    return canvas.toDataURL("image/jpeg", 0.95);
  }

  async function buildStrip(images: string[]): Promise<string> {
    const canvas = document.createElement("canvas");

    // --- Layout constants (photobooth-correct) ---
    const width = 400;
    const margin = 24;
    const imgWidth = width - margin * 2;
    const imgHeight = Math.round(imgWidth * 1.25); // classic vertical ratio

    // --- Calculate total height dynamically ---
    const height =
      margin + // top border
      images.length * imgHeight +
      (images.length - 1) * margin +
      margin; // bottom border

    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, width, height);

    // --- Draw each photo ---
    for (let i = 0; i < images.length; i++) {
      const img = new Image();
      img.src = images[i];

      await new Promise<void>((resolve) => {
        img.onload = () => {
          const y = margin + i * (imgHeight + margin);

          drawImageCover(ctx, img, margin, y, imgWidth, imgHeight);

          resolve();
        };
      });
    }

    return canvas.toDataURL("image/jpeg", 0.95);
  }

  function drawImageCover(
    ctx: CanvasRenderingContext2D,
    img: HTMLImageElement,
    x: number,
    y: number,
    w: number,
    h: number
  ) {
    const imgRatio = img.width / img.height;
    const targetRatio = w / h;

    let sx = 0,
      sy = 0,
      sw = img.width,
      sh = img.height;

    if (imgRatio > targetRatio) {
      // image is wider → crop sides
      sw = img.height * targetRatio;
      sx = (img.width - sw) / 2;
    } else {
      // image is taller → crop top/bottom
      sh = img.width / targetRatio;
      sy = (img.height - sh) / 2;
    }

    ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
  }

  function reset() {
    setStripUrl(null);
    setCount(null);
    setPhase("idle");
  }

  function printStrip() {
    window.print();
  }

  return (
    <div className="booth">
      {/* VIDEO IS ALWAYS MOUNTED */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="camera"
        style={{ display: phase === "countdown" ? "block" : "none" }}
      />

      {/* FRAME ONLY WHEN COUNTDOWN */}
      {phase === "countdown" && (
        <>
          <div className="frame" />
          {count !== null && <div className="counter">{count}</div>}
          {count == null && <div className="counterfiller">0</div>}
        </>
      )}

      {/* IDLE */}
      {phase === "idle" && cameraReady && (
        <button onClick={startSequence}>START</button>
      )}

      {/* RESULT */}
      {phase === "result" && stripUrl && (
        <div className="result">
          {/* PRINT TARGET */}
          <div className="print-area">
            <img src={stripUrl} alt="photostrip" />
          </div>

          {/* CONTROLS (NOT PRINTED) */}
          <div style={{ display: "flex", gap: 16 }}>
            <a href={stripUrl} download="photostrip.jpg">
              <button>DOWNLOAD</button>
            </a>

            <button onClick={printStrip}>PRINT</button>
            <button onClick={reset}>RESTART</button>
          </div>
        </div>
      )}
    </div>
  );
}
