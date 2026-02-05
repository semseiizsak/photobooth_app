"use client";

import { useEffect, useRef, useState } from "react";

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

type Scene = "outside" | "inside" | "arriving" | "result";

const OUTSIDE_FRAMES = ["/scenes/outside1.png", "/scenes/outside2.png", "/scenes/outside3.png"];
const INSIDE_FRAMES = ["/scenes/inside1.png", "/scenes/inside2.png", "/scenes/inside3.png"];
const FRAME_INTERVAL = 150;

export default function Page() {
  const videoRef = useRef<HTMLVideoElement>(null);

  const [scene, setScene] = useState<Scene>("outside");
  const [frameIndex, setFrameIndex] = useState(0);

  const [phase, setPhase] = useState<"idle" | "countdown" | "flash">("idle");
  const [count, setCount] = useState<number | null>(null);
  const [photoNumber, setPhotoNumber] = useState<number>(0);
  const [stripUrl, setStripUrl] = useState<string | null>(null);
  const [showReview, setShowReview] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);

  const [printCountdown, setPrintCountdown] = useState<number>(5);

  /* -------------------------------------------------- */
  /* Animated background frames                         */
  /* -------------------------------------------------- */
  useEffect(() => {
    if (scene !== "outside" && scene !== "inside") return;

    const interval = setInterval(() => {
      setFrameIndex((prev) => (prev + 1) % 3);
    }, FRAME_INTERVAL);

    return () => clearInterval(interval);
  }, [scene]);

  /* -------------------------------------------------- */
  /* Camera permission                                  */
  /* -------------------------------------------------- */
  async function requestCamera(): Promise<boolean> {
    try {
      console.log("Requesting camera...");
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" }
      });
      console.log("Camera stream obtained:", stream);

      const video = videoRef.current;
      if (video) {
        video.srcObject = stream;
        await video.play();
        console.log("Video playing");
        return true;
      }
      console.error("No video ref");
      return false;
    } catch (err) {
      console.error("Camera error:", err);
      return false;
    }
  }

  /* -------------------------------------------------- */
  /* Enter booth (outside -> inside)                    */
  /* -------------------------------------------------- */
  function enterBooth() {
    setScene("inside");
    setPhase("idle");
  }

  /* -------------------------------------------------- */
  /* Start capture (green button click)                 */
  /* -------------------------------------------------- */
  async function startCapture() {
    console.log("Green button clicked");

    // Start camera first
    const cameraOk = await requestCamera();
    if (!cameraOk) {
      console.error("Failed to start camera");
      return;
    }

    setCameraActive(true);

    // Wait for video to be ready
    const video = videoRef.current!;
    console.log("Video dimensions:", video.videoWidth, video.videoHeight);

    // Wait until video has dimensions
    let attempts = 0;
    while ((video.videoWidth === 0 || video.videoHeight === 0) && attempts < 50) {
      await wait(100);
      attempts++;
      console.log("Waiting for video...", attempts);
    }

    if (video.videoWidth === 0) {
      console.error("Video never got dimensions");
      return;
    }

    console.log("Video ready, starting sequence");
    await startSequence();
  }

  /* -------------------------------------------------- */
  /* Capture sequence                                   */
  /* -------------------------------------------------- */
  async function startSequence() {
    setPhase("countdown");

    const video = videoRef.current!;
    const shots: string[] = [];

    for (let shot = 0; shot < 4; shot++) {
      setPhotoNumber(shot + 1);
      console.log("Starting photo", shot + 1);

      // Countdown from 3
      for (let i = 3; i > 0; i--) {
        setCount(i);
        await wait(1000);
      }

      // Flash effect
      setCount(null);
      setPhase("flash");
      const photo = capture();
      shots.push(photo);
      console.log("Photo captured", shot + 1);
      await wait(300);
      setPhase("countdown");
      await wait(400);
    }

    console.log("All photos captured, stopping camera");

    // Stop camera
    setCameraActive(false);
    if (video.srcObject) {
      const tracks = (video.srcObject as MediaStream).getTracks();
      tracks.forEach(track => track.stop());
      video.srcObject = null;
    }

    // Transition to arriving scene
    setScene("arriving");
    setPhase("countdown");
    setPrintCountdown(5);
    setPhotoNumber(0);

    // 5 second "printing" delay
    for (let i = 5; i > 0; i--) {
      setPrintCountdown(i);
      await wait(1000);
    }

    console.log("Building strip...");
    const strip = await buildStrip(shots);

    // Reveal result
    setStripUrl(strip);
    setScene("result");
    setPhase("idle");
    console.log("Done!");
  }

  /* -------------------------------------------------- */
  /* Capture frame (true grayscale)                     */
  /* -------------------------------------------------- */
  function capture(): string {
    const video = videoRef.current!;
    console.log("Capturing frame", video.videoWidth, video.videoHeight);

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(video, 0, 0);

    const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const d = img.data;

    for (let i = 0; i < d.length; i += 4) {
      const g = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
      d[i] = d[i + 1] = d[i + 2] = g;
    }

    ctx.putImageData(img, 0, 0);
    return canvas.toDataURL("image/jpeg", 0.95);
  }

  /* -------------------------------------------------- */
  /* Overlay textures for vintage effect                */
  /* -------------------------------------------------- */
  const OVERLAYS = [
    "/scenes/overlay-grunge.jpg",
    "/scenes/overlay-slighttexture.jpg",
    "/scenes/overlay-supergraini.jpg"
  ];

  async function loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  }

  function applyOverlay(
    ctx: CanvasRenderingContext2D,
    overlay: HTMLImageElement,
    x: number,
    y: number,
    w: number,
    h: number
  ) {
    // Random rotation between -5 and 5 degrees
    const rotation = (Math.random() - 0.5) * 10 * (Math.PI / 180);
    // Random offset for position (up to 10% shift)
    const offsetX = (Math.random() - 0.5) * w * 0.2;
    const offsetY = (Math.random() - 0.5) * h * 0.2;
    // Random scale between 1.0 and 1.3
    const scale = 1 + Math.random() * 0.3;

    ctx.save();

    // Clip to photo area only - keeps black frame clean
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();

    ctx.globalAlpha = 0.6; // Visible but subtle
    ctx.globalCompositeOperation = "screen"; // Ignores black, shows light parts

    // Move to center of the photo area
    ctx.translate(x + w / 2 + offsetX, y + h / 2 + offsetY);
    ctx.rotate(rotation);
    ctx.scale(scale, scale);

    // Draw centered
    const drawW = w * 1.2;
    const drawH = h * 1.2;
    ctx.drawImage(overlay, -drawW / 2, -drawH / 2, drawW, drawH);

    ctx.restore();
  }

  /* -------------------------------------------------- */
  /* Build photostrip                                   */
  /* -------------------------------------------------- */
  async function buildStrip(images: string[]): Promise<string> {
    const canvas = document.createElement("canvas");

    const width = 400;
    const margin = 24;
    const imgW = width - margin * 2;
    const imgH = Math.round(imgW * 1.25);

    const height =
      margin + images.length * imgH + (images.length - 1) * margin + margin;

    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, width, height);

    // Load a random overlay
    const overlayIndex = Math.floor(Math.random() * OVERLAYS.length);
    let overlay: HTMLImageElement | null = null;
    try {
      overlay = await loadImage(OVERLAYS[overlayIndex]);
    } catch (e) {
      console.warn("Failed to load overlay", e);
    }

    for (let i = 0; i < images.length; i++) {
      const img = await loadImage(images[i]);
      const photoX = margin;
      const photoY = margin + i * (imgH + margin);

      // Draw the photo
      drawImageCover(ctx, img, photoX, photoY, imgW, imgH);

      // Apply random overlay to each photo
      if (overlay) {
        applyOverlay(ctx, overlay, photoX, photoY, imgW, imgH);
      }
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

  function reset() {
    setStripUrl(null);
    setCount(null);
    setPhase("idle");
    setScene("outside");
    setPhotoNumber(0);
    setCameraActive(false);
  }

  function printStrip() {
    window.print();
  }

  // Determine if video should be visible
  const showVideo = scene === "inside" && cameraActive;

  /* -------------------------------------------------- */
  /* Render                                            */
  /* -------------------------------------------------- */
  return (
    <div className="booth">
      {/* FLASH OVERLAY */}
      {phase === "flash" && <div className="flash-overlay" />}

      {/* OUTSIDE SCENE */}
      {scene === "outside" && (
        <div className="scene-wrapper">
          <img className="scene-bg" src={OUTSIDE_FRAMES[frameIndex]} alt="" />
          <div className="enter-area" onClick={enterBooth}>
            <span className="enter-text">ENTER</span>
          </div>
        </div>
      )}

      {/* INSIDE SCENE */}
      {scene === "inside" && (
        <div className="scene-wrapper">
          {/* Video layer - behind the scene image */}
          <div className={`mirror-area ${showVideo ? "visible" : "hidden"}`}>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="mirror-video"
            />
          </div>

          {/* Scene image - on top with transparent frame */}
          <img className="scene-bg" src={INSIDE_FRAMES[frameIndex]} alt="" />

          {/* Photo counter */}
          {showVideo && phase === "countdown" && photoNumber > 0 && (
            <div className="photo-counter">{photoNumber}/4</div>
          )}

          {/* Countdown number */}
          {phase === "countdown" && count !== null && (
            <div className="countdown-overlay">{count}</div>
          )}

          {/* Green button area */}
          {phase === "idle" && !cameraActive && (
            <div className="green-button-area" onClick={startCapture} />
          )}
        </div>
      )}

      {/* ARRIVING SCENE */}
      {scene === "arriving" && (
        <div className="scene-wrapper">
          <img className="scene-bg" src="/scenes/arriving-photo.png" alt="" />
          <div className="arriving-countdown">{printCountdown}</div>
        </div>
      )}

      {/* RESULT SCENE */}
      {scene === "result" && stripUrl && (
        <div className="result-scene">
          <div className="print-area strip-drop">
            <img src={stripUrl} alt="Your photo strip" />
          </div>

          <div className="controls">
            <a
              href={stripUrl}
              download="photostrip.jpg"
              onClick={() => setShowReview(true)}
            >
              <button>DOWNLOAD</button>
            </a>

            <button
              onClick={() => {
                printStrip();
                setShowReview(true);
              }}
            >
              PRINT
            </button>

            <button onClick={reset}>RESTART</button>
          </div>
        </div>
      )}

      {/* REVIEW POPUP */}
      {showReview && (
        <div className="review-overlay">
          <div className="review-modal">
            <div className="review-stars">★★★★★</div>
            <p>Please leave us a 5-star review</p>
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
