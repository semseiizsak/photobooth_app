"use client";

import { useEffect, useRef, useState } from "react";

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

export default function Page() {
  const videoRef = useRef<HTMLVideoElement>(null);

  const [cameraReady, setCameraReady] = useState(false);
  const [phase, setPhase] = useState<"idle" | "countdown" | "result">("idle");
  const [count, setCount] = useState<number | null>(null);
  const [stripUrl, setStripUrl] = useState<string | null>(null);
  const [showReview, setShowReview] = useState(false);

  function triggerReview() {
    setShowReview(true);
  }

  /* -------------------------------------------------- */
  /* Camera permission                                 */
  /* -------------------------------------------------- */
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

  /* -------------------------------------------------- */
  /* Main sequence                                     */
  /* -------------------------------------------------- */
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

  /* -------------------------------------------------- */
  /* Capture frame (true grayscale pixels)              */
  /* -------------------------------------------------- */
  function capture(): string {
    const video = videoRef.current!;
    const canvas = document.createElement("canvas");

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(video, 0, 0);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const d = imageData.data;

    for (let i = 0; i < d.length; i += 4) {
      const gray = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
      d[i] = d[i + 1] = d[i + 2] = gray;
    }

    ctx.putImageData(imageData, 0, 0);

    return canvas.toDataURL("image/jpeg", 0.95);
  }

  /* -------------------------------------------------- */
  /* Build photostrip                                  */
  /* -------------------------------------------------- */
  async function buildStrip(images: string[]): Promise<string> {
    const canvas = document.createElement("canvas");

    const width = 400;
    const margin = 24;
    const imgWidth = width - margin * 2;
    const imgHeight = Math.round(imgWidth * 1.25);

    const height =
      margin +
      images.length * imgHeight +
      (images.length - 1) * margin +
      margin;

    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, width, height);

    for (let i = 0; i < images.length; i++) {
      const img = new Image();
      img.src = images[i];

      await new Promise<void>((resolve) => {
        img.onload = () => {
          drawImageCover(
            ctx,
            img,
            margin,
            margin + i * (imgHeight + margin),
            imgWidth,
            imgHeight
          );
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
    const ir = img.width / img.height;
    const tr = w / h;

    let sx = 0,
      sy = 0,
      sw = img.width,
      sh = img.height;

    if (ir > tr) {
      sw = img.height * tr;
      sx = (img.width - sw) / 2;
    } else {
      sh = img.width / tr;
      sy = (img.height - sh) / 2;
    }

    ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
  }

  /* -------------------------------------------------- */
  /* Actions                                           */
  /* -------------------------------------------------- */
  function reset() {
    setStripUrl(null);
    setCount(null);
    setPhase("idle");
  }

  function printStrip() {
    window.print();
  }

  /* -------------------------------------------------- */
  /* Render                                            */
  /* -------------------------------------------------- */
  return (
    <div className="booth">
      {/* Camera always mounted */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="camera"
        style={{ display: phase === "countdown" ? "block" : "none" }}
      />

      {phase === "countdown" && (
        <>
          {count !== null && <div className="counter">{count}</div>}
          {count === null && <div className="counterfiller">0</div>}
        </>
      )}

      {phase === "idle" && cameraReady && (
        <button onClick={startSequence}>START</button>
      )}

      {phase === "result" && stripUrl && (
        <div className="result">
          <div className="print-area">
            <img src={stripUrl} alt="photostrip" />
          </div>

          <div className="controls">
            <a
              href={stripUrl}
              download="photostrip.jpg"
              onClick={triggerReview}
            >
              <button>DOWNLOAD</button>
            </a>

            <button
              onClick={() => {
                printStrip();
                triggerReview();
              }}
            >
              PRINT
            </button>

            <button
              onClick={() => {
                reset();
                triggerReview();
              }}
            >
              RESTART
            </button>
          </div>
        </div>
      )}

      {showReview && (
        <div className="review-overlay">
          <div className="review-modal">
            <div className="review-stars">★★★★★</div>

            <p>Please leave us a 5-star review 💛</p>

            <a
              href="https://maps.app.goo.gl/ETVCstEqkgRUwtiN9"
              target="_blank"
              rel="noopener noreferrer"
            >
              <button>LEAVE REVIEW</button>
            </a>

            <button className="secondary" onClick={() => setShowReview(false)}>
              CLOSE
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
