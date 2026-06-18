import { useState, useRef, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence, useAnimationFrame } from "framer-motion";
import { ArrowRight, VolumeX, Volume2, Mic, MicOff, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";

// ── Types ─────────────────────────────────────────────────────────────────
type VoiceState = "idle" | "listening" | "thinking" | "speaking";

interface Message {
  id: string;
  role: "user" | "bot";
  content: string;
  timestamp: Date;
}

declare global {
  interface Window {
    webkitSpeechRecognition: any;
    SpeechRecognition: any;
    webkitAudioContext: typeof AudioContext;
  }
}

// ── State colors ───────────────────────────────────────────────────────────
const STATE_THEME = {
  idle:      { primary: "#64748b", secondary: "#475569", accent: "#94a3b8", glow: "rgba(100,116,139,0.3)" },
  listening: { primary: "#3b82f6", secondary: "#06b6d4", accent: "#7dd3fc", glow: "rgba(59,130,246,0.45)" },
  thinking:  { primary: "#8b5cf6", secondary: "#a855f7", accent: "#c084fc", glow: "rgba(139,92,246,0.45)" },
  speaking:  { primary: "#10b981", secondary: "#06d6a0", accent: "#6ee7b7", glow: "rgba(16,185,129,0.45)" },
};

// ── Particles ─────────────────────────────────────────────────────────────
function Particles({ state }: { state: VoiceState }) {
  const theme = STATE_THEME[state];
  const count = state === "idle" ? 10 : 18;
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden>
      {Array.from({ length: count }).map((_, i) => {
        const size = 2 + (i % 4);
        const x = (i * 31 + 7) % 100;
        const delay = (i * 0.7) % 5;
        const dur = 7 + (i % 6);
        const op = 0.15 + (i % 4) * 0.07;
        return (
          <motion.span
            key={`${state}-${i}`}
            className="absolute rounded-full"
            style={{ width: size, height: size, left: `${x}%`, background: i % 2 === 0 ? theme.primary : theme.accent, opacity: op }}
            initial={{ y: "105vh", opacity: 0 }}
            animate={{ y: "-5vh", opacity: [0, op, op, 0] }}
            transition={{ duration: dur, delay, repeat: Infinity, ease: "linear" }}
          />
        );
      })}
    </div>
  );
}

// ── Canvas Visualizer Bars ────────────────────────────────────────────────
function AudioBars({
  analyserRef,
  synthAnalyserRef,
  state,
}: {
  analyserRef: React.MutableRefObject<AnalyserNode | null>;
  synthAnalyserRef: React.MutableRefObject<AnalyserNode | null>;
  state: VoiceState;
}) {
  const theme = STATE_THEME[state];
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const micData = useRef<Uint8Array>(new Uint8Array(64));
  const synthData = useRef<Uint8Array>(new Uint8Array(64));

  useAnimationFrame((time) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const W = canvas.width;
    const H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    const BAR_COUNT = 32;
    const barW = Math.floor(W / BAR_COUNT) - 2;

    // Pick the active analyser based on state
    if (state === "listening" && analyserRef.current) {
      analyserRef.current.getByteFrequencyData(micData.current);
    }
    if (state === "speaking" && synthAnalyserRef.current) {
      synthAnalyserRef.current.getByteFrequencyData(synthData.current);
    }

    for (let i = 0; i < BAR_COUNT; i++) {
      let amplitude: number;

      if (state === "listening" && analyserRef.current) {
        amplitude = micData.current[i * 2] / 255;
      } else if (state === "speaking" && synthAnalyserRef.current) {
        // Real analyser data from playing audio element
        amplitude = synthData.current[i * 2] / 255;
      } else if (state === "speaking") {
        // Synthetic wave when analyser isn't available (fallback)
        const baseAmp = 0.35;
        const wave = Math.sin(time / 220 + i * 0.55) * 0.22;
        const wave2 = Math.sin(time / 130 + i * 1.1) * 0.1;
        amplitude = Math.max(0.07, baseAmp + wave + wave2);
      } else if (state === "thinking") {
        amplitude = 0.05 + Math.sin(time / 350 + i * 0.6) * 0.04;
      } else {
        amplitude = 0.03 + Math.sin(time / 900 + i * 0.4) * 0.02;
      }

      const barH = Math.max(3, amplitude * H * 0.88);
      const x = i * (barW + 2);
      const y = (H - barH) / 2;

      const grad = ctx.createLinearGradient(x, y, x, y + barH);
      grad.addColorStop(0, theme.accent + "ff");
      grad.addColorStop(0.5, theme.primary + "cc");
      grad.addColorStop(1, theme.secondary + "66");
      ctx.fillStyle = grad;
      ctx.beginPath();
      if (typeof ctx.roundRect === "function") {
        ctx.roundRect(x, y, barW, barH, barW / 2);
      } else {
        ctx.rect(x, y, barW, barH);
      }
      ctx.fill();
    }
  });

  return (
    <canvas ref={canvasRef} width={320} height={88} className="w-full max-w-xs mx-auto" />
  );
}

// ── Orb ───────────────────────────────────────────────────────────────────
function VoiceOrb({ state, audioLevel }: { state: VoiceState; audioLevel: number }) {
  const theme = STATE_THEME[state];
  return (
    <div className="relative flex items-center justify-center" style={{ width: 240, height: 240 }}>
      {/* Glow */}
      <motion.div
        className="absolute rounded-full"
        style={{ width: 180, height: 180, background: theme.glow, filter: "blur(32px)" }}
        animate={{ opacity: [0.6, 1, 0.6], scale: [0.95, 1.05, 0.95] }}
        transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
      />
      {/* Ring 1 */}
      <motion.div
        className="absolute rounded-full border"
        style={{ width: 200, height: 200, borderColor: theme.primary + "40" }}
        animate={{ scale: [1, 1.1 + audioLevel * 0.14, 1], opacity: [0.5, 0.9, 0.5] }}
        transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
      />
      {/* Ring 2 */}
      <motion.div
        className="absolute rounded-full border"
        style={{ width: 224, height: 224, borderColor: theme.secondary + "22" }}
        animate={{ scale: [1.04, 1, 1.04], opacity: [0.3, 0.6, 0.3] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: 0.7 }}
      />
      {/* Main orb body */}
      <motion.div
        className="absolute rounded-full overflow-hidden"
        style={{
          width: 160, height: 160,
          background: `radial-gradient(circle at 35% 30%, ${theme.accent}, ${theme.primary} 52%, ${theme.secondary})`,
          boxShadow: `0 0 40px ${theme.glow}, inset 0 0 30px rgba(255,255,255,0.07)`,
        }}
        animate={{ scale: state === "thinking" ? [1, 1.04, 0.97, 1] : [1, 1 + audioLevel * 0.15, 1] }}
        transition={{ duration: state === "thinking" ? 1.8 : state === "idle" ? 3 : 0.7, repeat: Infinity, ease: "easeInOut" }}
      >
        {/* Rotating aurora shimmer */}
        <motion.div
          className="absolute inset-0 rounded-full"
          style={{ background: `conic-gradient(from 0deg, transparent, ${theme.accent}88, transparent, ${theme.secondary}55, transparent)`, opacity: 0.5 }}
          animate={{ rotate: [0, 360] }}
          transition={{ duration: state === "thinking" ? 2 : 5, repeat: Infinity, ease: "linear" }}
        />
        {/* Highlight */}
        <div className="absolute rounded-full" style={{ width: 44, height: 44, top: 24, left: 28, background: "radial-gradient(circle, rgba(255,255,255,0.22), transparent)" }} />
      </motion.div>

      {/* Center icon */}
      <div className="relative z-10">
        <AnimatePresence mode="wait">
          {state === "idle" && (
            <motion.div key="idle" initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 0.7, scale: 1 }} exit={{ opacity: 0, scale: 0.7 }}>
              <Mic className="w-9 h-9 text-white" />
            </motion.div>
          )}
          {state === "listening" && (
            <motion.div key="listen" initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.7 }} className="flex items-end gap-[3px]">
              {[0, 0.12, 0.24, 0.12, 0].map((d, i) => (
                <motion.span key={i} className="block w-[5px] rounded-full bg-white" style={{ height: 10 + i * 4 }}
                  animate={{ scaleY: [0.4, 1.6, 0.4] }} transition={{ duration: 0.65, repeat: Infinity, delay: d, ease: "easeInOut" }} />
              ))}
            </motion.div>
          )}
          {state === "thinking" && (
            <motion.div key="think" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex gap-2">
              {[0, 0.18, 0.36].map((d, i) => (
                <motion.span key={i} className="block w-3 h-3 rounded-full bg-white"
                  animate={{ y: [0, -10, 0], opacity: [0.6, 1, 0.6] }} transition={{ duration: 0.7, repeat: Infinity, delay: d }} />
              ))}
            </motion.div>
          )}
          {state === "speaking" && (
            <motion.div key="speak" initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.7 }}>
              <Volume2 className="w-9 h-9 text-white" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ── Conversation bubble ────────────────────────────────────────────────────
function ConvBubble({ msg, language }: { msg: Message; language: string }) {
  const isUser = msg.role === "user";
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={`flex mb-2 ${isUser ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${isUser ? "bg-blue-500/30 border border-blue-400/25 text-white/90 rounded-br-sm" : "bg-white/7 border border-white/10 text-white/75 rounded-bl-sm"}`}>
        {!isUser && <span className="block text-[10px] font-semibold text-emerald-400/80 mb-1 uppercase tracking-wider">Dento AI</span>}
        <p>{msg.content.length > 160 ? msg.content.slice(0, 160) + "…" : msg.content}</p>
      </div>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Main Page
// ═══════════════════════════════════════════════════════════════════════════
export default function VoiceChatPage() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { language } = useLanguage();

  const [voiceState, setVoiceState] = useState<VoiceState>("idle");
  const [transcript, setTranscript] = useState("");
  const [botText, setBotText] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isMuted, setIsMuted] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [sessionSeconds, setSessionSeconds] = useState(0);
  const [supported] = useState(() => !!(window.SpeechRecognition || window.webkitSpeechRecognition));

  const recognitionRef = useRef<any>(null);
  const transcriptRef = useRef("");
  const audioElRef = useRef<HTMLAudioElement | null>(null);
  const mediaSourceCreatedRef = useRef(false); // AudioElementSource can only be created ONCE per element

  // Web Audio API refs — mic and synth (playback) analysers
  const audioCtxRef = useRef<AudioContext | null>(null);
  const micAnalyserRef = useRef<AnalyserNode | null>(null);
  const synthAnalyserRef = useRef<AnalyserNode | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const animLevelRef = useRef<number>(0);
  const levelTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const historyScrollRef = useRef<HTMLDivElement>(null);
  const patientName = user?.fullName || (language === "ar" ? "المريض" : "Patient");

  // ── Session timer ──────────────────────────────────────────────────────
  useEffect(() => {
    const id = setInterval(() => setSessionSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, []);
  const formatTime = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  // ── Auto-scroll history ────────────────────────────────────────────────
  useEffect(() => {
    if (historyScrollRef.current) historyScrollRef.current.scrollTop = historyScrollRef.current.scrollHeight;
  }, [messages]);

  // ── Cleanup ────────────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      stopEverything();
    };
  }, []);

  const stopEverything = () => {
    recognitionRef.current?.abort();
    audioElRef.current?.pause();
    if (audioElRef.current) audioElRef.current.src = "";
    micStreamRef.current?.getTracks().forEach((t) => t.stop());
    if (levelTimerRef.current) clearInterval(levelTimerRef.current);
    audioCtxRef.current?.close();
    audioCtxRef.current = null;
    micAnalyserRef.current = null;
    synthAnalyserRef.current = null;
    micStreamRef.current = null;
    cancelAnimationFrame(animLevelRef.current);
  };

  // ── Init audio context (shared) ────────────────────────────────────────
  const getAudioCtx = (): AudioContext => {
    if (!audioCtxRef.current || audioCtxRef.current.state === "closed") {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      audioCtxRef.current = new Ctx();
    }
    return audioCtxRef.current;
  };

  // ── Start mic capture ──────────────────────────────────────────────────
  const startMicCapture = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = stream;
      const ctx = getAudioCtx();
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 128;
      source.connect(analyser);
      micAnalyserRef.current = analyser;

      // Poll audio level for orb animation
      const data = new Uint8Array(analyser.frequencyBinCount);
      const poll = () => {
        analyser.getByteFrequencyData(data);
        const avg = Array.from(data).reduce((a: number, b: number) => a + b, 0) / data.length / 255;
        setAudioLevel(avg);
        animLevelRef.current = requestAnimationFrame(poll);
      };
      poll();
    } catch {
      // No mic permission — visualizer still works in synthetic mode
    }
  };

  const stopMicCapture = () => {
    cancelAnimationFrame(animLevelRef.current);
    micStreamRef.current?.getTracks().forEach((t) => t.stop());
    micStreamRef.current = null;
    micAnalyserRef.current = null;
    setAudioLevel(0);
  };

  // ── Connect audio element to analyser for TTS visualizer ──────────────
  const connectAudioToAnalyser = (audioEl: HTMLAudioElement) => {
    try {
      const ctx = getAudioCtx();
      if (!mediaSourceCreatedRef.current) {
        // createMediaElementSource can only be called ONCE per element
        const source = ctx.createMediaElementSource(audioEl);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 128;
        source.connect(analyser);
        analyser.connect(ctx.destination); // Keep audio audible
        synthAnalyserRef.current = analyser;
        mediaSourceCreatedRef.current = true;
      }
      // At this point synthAnalyserRef.current is valid (either just created or from before)
      const analyser = synthAnalyserRef.current!;
      // Poll level for orb scale
      const data = new Uint8Array(analyser.frequencyBinCount);
      const poll = () => {
        if (synthAnalyserRef.current !== analyser) return;
        analyser.getByteFrequencyData(data);
        const avg = Array.from(data).reduce((a: number, b: number) => a + b, 0) / data.length / 255;
        setAudioLevel(avg);
        animLevelRef.current = requestAnimationFrame(poll);
      };
      poll();
    } catch {
      // Silently fail — AudioBars uses synthetic wave as fallback
    }
  };

  // ── Gemini TTS — play audio via server endpoint ────────────────────────
  const speakWithGemini = useCallback(async (text: string, onEnd?: () => void) => {
    if (isMuted) { onEnd?.(); return; }
    try {
      const res = await fetch("/api/ai/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ text, language }),
      });

      if (!res.ok) throw new Error("TTS endpoint failed");
      const data = await res.json();
      if (!data.success || !data.audio) throw new Error("No audio in response");

      // Convert base64 to blob URL
      const binary = atob(data.audio);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      const blob = new Blob([bytes], { type: data.mimeType || "audio/wav" });
      const url = URL.createObjectURL(blob);

      // Play with audio element
      if (!audioElRef.current) audioElRef.current = new Audio();
      const audioEl = audioElRef.current;
      audioEl.pause();
      audioEl.src = url;

      // Connect to Audio API BEFORE playing (must be before first play on some browsers)
      connectAudioToAnalyser(audioEl);

      setVoiceState("speaking");
      audioEl.onended = () => {
        URL.revokeObjectURL(url);
        synthAnalyserRef.current = null;
        setAudioLevel(0);
        setVoiceState("idle");
        onEnd?.();
      };
      audioEl.onerror = () => {
        synthAnalyserRef.current = null;
        setAudioLevel(0);
        setVoiceState("idle");
        onEnd?.();
      };
      await audioEl.play();
    } catch (err) {
      console.warn("Gemini TTS failed, falling back to Web Speech API:", err);
      speakFallback(text, onEnd);
    }
  }, [language, isMuted]);

  // ── Fallback: Web Speech API ───────────────────────────────────────────
  const speakFallback = useCallback((text: string, onEnd?: () => void) => {
    if (!window.speechSynthesis) { onEnd?.(); return; }
    window.speechSynthesis.cancel();
    const clean = text.replace(/[*_`#~]/g, "").replace(/\n+/g, ". ").slice(0, 700);
    const utter = new SpeechSynthesisUtterance(clean);
    utter.lang = language === "ar" ? "ar-SA" : "en-US";

    // Simulate audio level for waveform during fallback speech
    let t = 0;
    const fakeLevel = setInterval(() => {
      t += 0.15;
      setAudioLevel(0.3 + Math.sin(t) * 0.2 + Math.sin(t * 2.3) * 0.1);
    }, 60);

    const voice = language === "ar"
      ? (["ar-SA", "ar-EG", "ar-001"].map(loc => window.speechSynthesis.getVoices().find(v => v.lang === loc && v.name.toLowerCase().includes("google"))).find(Boolean)
        ?? window.speechSynthesis.getVoices().find(v => v.lang.startsWith("ar")))
      : (window.speechSynthesis.getVoices().find(v => v.lang === "en-US" && v.name.toLowerCase().includes("google"))
        ?? window.speechSynthesis.getVoices().find(v => v.lang === "en-US"));
    if (voice) utter.voice = voice;

    utter.onstart = () => setVoiceState("speaking");
    utter.onend = () => { clearInterval(fakeLevel); setAudioLevel(0); setVoiceState("idle"); onEnd?.(); };
    utter.onerror = () => { clearInterval(fakeLevel); setAudioLevel(0); setVoiceState("idle"); onEnd?.(); };
    window.speechSynthesis.speak(utter);
  }, [language]);

  // ── Primary speak function ─────────────────────────────────────────────
  const speak = useCallback(async (text: string, onEnd?: () => void) => {
    // Try Gemini first, fall back to Web Speech
    await speakWithGemini(text, onEnd);
  }, [speakWithGemini]);

  // ── Send to AI ─────────────────────────────────────────────────────────
  const sendToAI = useCallback(async (text: string) => {
    setVoiceState("thinking");
    const userMsg: Message = { id: Date.now().toString(), role: "user", content: text, timestamp: new Date() };
    setMessages((m) => [...m, userMsg]);

    try {
      const historyForAPI = [...messages, userMsg].slice(-12).map(m => ({ role: m.role, content: m.content }));
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ message: text, conversationHistory: historyForAPI, language, image: null }),
      });
      if (!res.ok) throw new Error("AI error");
      const data = await res.json();
      const reply: string = data.message || "";
      const botMsg: Message = { id: (Date.now() + 1).toString(), role: "bot", content: reply, timestamp: new Date() };
      setMessages((m) => [...m, botMsg]);
      setBotText(reply);
      await speak(reply, () => setVoiceState("idle"));
    } catch {
      const err = language === "ar" ? "عذراً، حدث خطأ. حاول مرة أخرى." : "Sorry, an error occurred.";
      const botMsg: Message = { id: (Date.now() + 1).toString(), role: "bot", content: err, timestamp: new Date() };
      setMessages((m) => [...m, botMsg]);
      setBotText(err);
      await speak(err, () => setVoiceState("idle"));
    }
  }, [messages, language, speak]);

  // ── Mic toggle ─────────────────────────────────────────────────────────
  const toggleMic = useCallback(() => {
    // Interrupt any ongoing speech
    audioElRef.current?.pause();
    window.speechSynthesis?.cancel();
    synthAnalyserRef.current = null;
    setAudioLevel(0);

    if (voiceState === "listening") {
      recognitionRef.current?.stop();
      stopMicCapture();
      setVoiceState("idle");
      return;
    }

    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRec) return;

    const rec = new SpeechRec();
    rec.lang = language === "ar" ? "ar-SA" : "en-US";
    rec.continuous = false;
    rec.interimResults = true;

    rec.onstart = () => { setVoiceState("listening"); setTranscript(""); startMicCapture(); };
    rec.onresult = (e: any) => {
      let interim = "", final = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) final += t; else interim += t;
      }
      setTranscript(final || interim);
      if (final) transcriptRef.current = final;
    };
    rec.onerror = () => { setVoiceState("idle"); setTranscript(""); stopMicCapture(); };
    rec.onend = () => {
      stopMicCapture();
      const final = transcriptRef.current.trim();
      transcriptRef.current = "";
      if (final) { setTranscript(final); sendToAI(final); }
      else setVoiceState("idle");
    };

    recognitionRef.current = rec;
    rec.start();
  }, [voiceState, language, sendToAI]);

  // ── Derived ────────────────────────────────────────────────────────────
  const theme = STATE_THEME[voiceState];
  const stateLabel = {
    idle:      language === "ar" ? "اضغط للتحدث" : "Tap to speak",
    listening: language === "ar" ? "جاري الاستماع…" : "Listening…",
    thinking:  language === "ar" ? "جاري التفكير…" : "Thinking…",
    speaking:  language === "ar" ? "يتحدث Dento" : "Dento is speaking…",
  }[voiceState];

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#080c18] overflow-hidden select-none">

      {/* Animated background */}
      <motion.div
        className="absolute inset-0"
        animate={{ background: [`radial-gradient(ellipse 80% 60% at 50% 0%, ${theme.primary}22 0%, #080c18 65%)`, `radial-gradient(ellipse 90% 70% at 50% 0%, ${theme.secondary}22 0%, #080c18 65%)`, `radial-gradient(ellipse 80% 60% at 50% 0%, ${theme.primary}22 0%, #080c18 65%)`] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      />
      <Particles state={voiceState} />
      <div className="absolute inset-0 opacity-[0.025]" style={{ backgroundImage: `linear-gradient(${theme.primary}44 1px, transparent 1px), linear-gradient(90deg, ${theme.primary}44 1px, transparent 1px)`, backgroundSize: "52px 52px" }} />

      {/* ── Header ── */}
      <div className="relative z-10 flex items-center justify-between px-5 pt-5 pb-2 flex-shrink-0">
        <Button variant="ghost" size="icon" onClick={() => { stopEverything(); navigate("/chat"); }}
          className="text-white/50 hover:text-white hover:bg-white/10 rounded-full h-10 w-10">
          <ArrowRight className="w-5 h-5" />
        </Button>
        <div className="text-center">
          <motion.p className="text-sm font-semibold tracking-widest uppercase" animate={{ color: theme.accent }} transition={{ duration: 1 }}>
            Dento Voice
          </motion.p>
          <p className="text-white/30 text-xs font-mono mt-0.5">{formatTime(sessionSeconds)}</p>
        </div>
        <div className="flex items-center gap-1">
          <div className="relative">
            <Button variant="ghost" size="icon" onClick={() => setShowHistory((v) => !v)}
              className={`h-10 w-10 rounded-full ${showHistory ? "bg-white/15 text-white" : "text-white/50 hover:text-white hover:bg-white/10"}`}>
              <MessageCircle className="w-4 h-4" />
            </Button>
            {messages.length > 0 && <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-blue-400 rounded-full pointer-events-none" />}
          </div>
          <Button variant="ghost" size="icon" onClick={() => { if (!isMuted) { audioElRef.current?.pause(); window.speechSynthesis?.cancel(); } setIsMuted((m) => !m); }}
            className="h-10 w-10 rounded-full text-white/50 hover:text-white hover:bg-white/10">
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {/* ── History Drawer ── */}
      <AnimatePresence>
        {showHistory && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 210, opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3 }}
            className="relative z-10 mx-4 overflow-hidden">
            <div className="h-full rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-3 overflow-y-auto" ref={historyScrollRef}>
              {messages.length === 0
                ? <p className="text-white/30 text-xs text-center mt-10">{language === "ar" ? "لا توجد محادثات بعد" : "No conversation yet"}</p>
                : messages.map((m) => <ConvBubble key={m.id} msg={m} language={language} />)}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Center content ── */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center gap-5 px-6">
        <VoiceOrb state={voiceState} audioLevel={audioLevel} />

        <motion.p key={voiceState} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0, color: theme.accent }} className="text-base font-medium tracking-wide">
          {stateLabel}
        </motion.p>

        {/* Canvas bars */}
        <div className="w-full max-w-xs">
          <AudioBars analyserRef={micAnalyserRef} synthAnalyserRef={synthAnalyserRef} state={voiceState} />
        </div>

        {/* Live transcript */}
        <AnimatePresence mode="wait">
          {transcript && (voiceState === "listening" || voiceState === "thinking") && (
            <motion.div key="t" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="max-w-sm w-full">
              <div className="relative border border-white/10 rounded-2xl px-5 py-3 bg-white/5 backdrop-blur-sm">
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent rounded-t-2xl" />
                <p className="text-white/85 text-sm leading-relaxed text-center">
                  {transcript}
                  <motion.span className="inline-block w-0.5 h-4 bg-blue-400 ml-1 rounded-full align-middle" animate={{ opacity: [1, 0] }} transition={{ duration: 0.6, repeat: Infinity }} />
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Bot reply */}
        <AnimatePresence mode="wait">
          {botText && voiceState !== "thinking" && voiceState !== "listening" && (
            <motion.div key="r" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="max-w-sm w-full">
              <div className="relative rounded-2xl border border-white/10 bg-white/7 backdrop-blur-md px-5 py-4">
                <motion.div className="absolute top-0 left-6 right-6 h-[1.5px] rounded-full"
                  style={{ background: `linear-gradient(90deg, transparent, ${theme.primary}, transparent)` }}
                  animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 2, repeat: Infinity }} />
                <p className="text-[10px] font-semibold uppercase tracking-widest mb-2" style={{ color: theme.accent }}>Dento AI</p>
                <p className="text-white/80 text-sm leading-relaxed">{botText.length > 220 ? botText.slice(0, 220) + "…" : botText}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Bottom controls ── */}
      <div className="relative z-10 flex flex-col items-center gap-3.5 pb-12 flex-shrink-0">
        {messages.length > 0 && (
          <p className="text-white/25 text-xs font-mono">
            {messages.length} {language === "ar" ? "رسالة" : messages.length === 1 ? "message" : "messages"}
          </p>
        )}

        <AnimatePresence mode="wait">
          <motion.p key={voiceState} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-white/30 text-xs">
            {voiceState === "idle" ? (language === "ar" ? "اضغط الزر للتحدث مع Dento" : "Press to talk to Dento")
              : voiceState === "listening" ? (language === "ar" ? "اضغط مرة أخرى للإيقاف" : "Press again to stop")
              : voiceState === "thinking" ? (language === "ar" ? "يعالج ردك…" : "Processing…")
              : (language === "ar" ? "اضغط للتحدث وإيقاف الرد" : "Press to speak or interrupt")}
          </motion.p>
        </AnimatePresence>

        {/* Mic button */}
        <div className="relative flex items-center justify-center">
          <motion.div className="absolute rounded-full" style={{ width: 92, height: 92, background: theme.glow, filter: "blur(22px)", opacity: 0.65 }}
            animate={{ scale: voiceState === "listening" ? [1, 1.3, 1] : [1, 1.08, 1] }} transition={{ duration: 1.5, repeat: Infinity }} />
          {voiceState === "listening" && (
            <motion.span className="absolute rounded-full" style={{ width: 80, height: 80, border: `2px solid ${theme.primary}` }}
              animate={{ scale: [1, 1.7], opacity: [0.6, 0] }} transition={{ duration: 1.1, repeat: Infinity }} />
          )}
          <motion.button
            whileTap={{ scale: 0.9 }} whileHover={{ scale: 1.07 }}
            onClick={toggleMic}
            disabled={!supported || voiceState === "thinking"}
            className="relative w-[72px] h-[72px] rounded-full flex items-center justify-center transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: voiceState === "listening" ? "linear-gradient(135deg,#ef4444,#dc2626)" : `linear-gradient(135deg,${theme.primary},${theme.secondary})`, boxShadow: `0 0 28px ${theme.glow}` }}
          >
            {voiceState === "listening" ? <MicOff className="w-7 h-7 text-white" /> : <Mic className="w-7 h-7 text-white" />}
          </motion.button>
        </div>

        {!supported && (
          <p className="text-red-400/70 text-xs text-center max-w-xs px-4">
            {language === "ar" ? "⚠️ متصفحك لا يدعم التعرف على الكلام. استخدم Chrome أو Edge." : "⚠️ Use Chrome or Edge for speech recognition."}
          </p>
        )}
      </div>
    </div>
  );
}
