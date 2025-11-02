"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  GestureRecognizer,
  FilesetResolver,
  DrawingUtils
} from "@mediapipe/tasks-vision";

export default function GestureCall() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [gestureRecognizer, setGestureRecognizer] = useState<GestureRecognizer | null>(null);
  const [status, setStatus] = useState("Loading model...");
  const [callStatus, setCallStatus] = useState("");
  const [callInProgress, setCallInProgress] = useState(false);
  const [lastAction, setLastAction] = useState<string | null>(null);

  // ✅ Load Model
  useEffect(() => {
    (async () => {
      try {
        const filesetResolver = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
        );

        const recognizer = await GestureRecognizer.createFromOptions(
          filesetResolver,
          {
            baseOptions: {
              modelAssetPath:
                "https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task"
            },
            runningMode: "VIDEO"
          }
        );

        setGestureRecognizer(recognizer);
        setStatus("✅ Model loaded! Click Start Call");

      } catch (err) {
        setStatus("❌ Model load error");
        console.error(err);
      }
    })();
  }, []);

  // ✅ Start webcam
  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ video: true }).then(stream => {
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    });
  }, []);

  // ✅ Gesture loop
  useEffect(() => {
    let animationId: number;

    async function detect() {
      if (!gestureRecognizer || !videoRef.current || !canvasRef.current) {
        animationId = requestAnimationFrame(detect);
        return;
      }

      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d")!;
      const now = performance.now();

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      if (callInProgress) {
        const result = await gestureRecognizer.recognizeForVideo(video, now);

        if (result.landmarks) {
          const utils = new DrawingUtils(ctx);
          for (const hand of result.landmarks) {
            utils.drawConnectors(hand, GestureRecognizer.HAND_CONNECTIONS, { lineWidth: 2 });
            utils.drawLandmarks(hand, { radius: 4 });
          }
        }

        const gesture = result.gestures?.[0]?.[0]?.categoryName;
        if (!lastAction && gesture) {
          if (gesture === "Thumb_Up") {
            setCallStatus("✅ Call Accepted!");
            setLastAction("accept");
            setCallInProgress(false);
          } else if (gesture === "Closed_Fist") {
            setCallStatus("❌ Call Declined!");
            setLastAction("decline");
            setCallInProgress(false);
          }
        }
      }

      animationId = requestAnimationFrame(detect);
    }

    detect();
    return () => cancelAnimationFrame(animationId);
  }, [gestureRecognizer, callInProgress, lastAction]);

  const startCall = () => {
    setCallInProgress(true);
    setLastAction(null);
    setCallStatus("📞 Incoming call — show 👍 to accept or ✊ to decline");
  };

  return (
    <div style={{ maxWidth: 500, margin: "auto", textAlign: "center" }}>
      <h2>Hand Gesture Call Control</h2>

      <video
        ref={videoRef}
        autoPlay
        playsInline
        width={320}
        height={240}
        style={{ border: "2px solid black", borderRadius: 6 }}
      ></video>

      <canvas
        ref={canvasRef}
        width={320}
        height={240}
        style={{ border: "2px solid black", borderRadius: 6, marginTop: 10 }}
      ></canvas>

      <p>Status: {status}</p>
      <button onClick={startCall} disabled={!gestureRecognizer}>
        📞 Simulate Call
      </button>
      <p>{callStatus}</p>
    </div>
  );
}
