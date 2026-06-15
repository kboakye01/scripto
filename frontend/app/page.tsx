"use client";

import { useRef, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function Home() {
  const [image, setImage] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [script, setScript] = useState("");
  const [status, setStatus] = useState("idle");
  const [videoReady, setVideoReady] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [voiceStyle, setVoiceStyle] = useState("Young Male - Calm");
  const [analysis, setAnalysis] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const generatorRef = useRef<HTMLDivElement>(null);
  const howRef = useRef<HTMLDivElement>(null);
  const pricingRef = useRef<HTMLDivElement>(null);
  const featuresRef = useRef<HTMLDivElement>(null);

  function scrollToSection(ref: React.RefObject<HTMLDivElement | null>) {
    ref.current?.scrollIntoView({ behavior: "smooth" });
  }

  function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setImage(URL.createObjectURL(file));
    setVideoReady(false);
    setVideoUrl(null);
    setAnalysis(null);
  }

  function analyzePhoto() {
    if (!image) {
      alert("Please upload a photo first.");
      return;
    }

    setAnalysis(
      "Demo Analysis: The image appears ready for AI video generation. Recommended voice: calm, confident, natural tone."
    );
    setVoiceStyle("Young Male - Calm");
  }

  function speakTranscript() {
    if (!script.trim()) {
      alert("Please enter a transcript first.");
      return;
    }

    const utterance = new SpeechSynthesisUtterance(script);

    if (voiceStyle.includes("Female")) {
      utterance.pitch = 1.2;
      utterance.rate = 0.95;
    } else if (voiceStyle.includes("Mature")) {
      utterance.pitch = 0.75;
      utterance.rate = 0.85;
    } else if (voiceStyle.includes("Energetic")) {
      utterance.pitch = 1.05;
      utterance.rate = 1.15;
    } else {
      utterance.pitch = 0.95;
      utterance.rate = 0.95;
    }

    utterance.volume = 1;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }

  async function generateVideo() {
    if (!selectedFile || !image || !script.trim()) {
      alert("Please upload a photo and enter a transcript.");
      return;
    }

    try {
      setStatus("processing");
      setVideoReady(false);
      setVideoUrl(null);

      const fileName = `${Date.now()}-${selectedFile.name}`;

      const { error: uploadError } = await supabase.storage
        .from("images")
        .upload(fileName, selectedFile);

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from("images").getPublicUrl(fileName);

      const { error: dbError } = await supabase.from("generations").insert([
        {
          image_url: publicUrl,
          transcript: script,
        },
      ]);

      if (dbError) throw dbError;

      await createDemoVideo(image, script);

      setStatus("completed");
      setVideoReady(true);
      alert("Saved to Supabase and demo video created!");
    } catch (error) {
      console.error(error);
      setStatus("idle");
      alert("Something went wrong. Check Supabase policies or console.");
    }
  }

  async function createDemoVideo(imageUrl: string, transcript: string) {
    const canvasElement = canvasRef.current;
    if (!canvasElement) return;

    const context = canvasElement.getContext("2d");
    if (!context) return;

    canvasElement.width = 1080;
    canvasElement.height = 1920;

    const img = new Image();
    img.src = imageUrl;

    await new Promise<void>((resolve) => {
      img.onload = () => resolve();
    });

    const stream = canvasElement.captureStream(30);
    const recorder = new MediaRecorder(stream, {
      mimeType: "video/webm",
    });

    const chunks: Blob[] = [];

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunks.push(event.data);
    };

    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: "video/webm" });
      setVideoUrl(URL.createObjectURL(blob));
    };

    const words = transcript.split(" ");
    const duration = Math.max(6, words.length * 0.35);
    const fps = 30;
    const totalFrames = duration * fps;
    let frame = 0;

    recorder.start();

    await new Promise<void>((resolve) => {
      function draw() {
        const progress = frame / totalFrames;

        context.fillStyle = "#020617";
        context.fillRect(0, 0, canvasElement.width, canvasElement.height);

        const zoom = 1 + progress * 0.08;
        const imgW = canvasElement.width * zoom;
        const imgH = canvasElement.height * zoom;
        const x = (canvasElement.width - imgW) / 2;
        const y = (canvasElement.height - imgH) / 2;

        context.drawImage(img, x, y, imgW, imgH);

        context.fillStyle = "rgba(0, 0, 0, 0.62)";
        context.fillRect(70, 1320, 940, 420);

        context.fillStyle = "white";
        context.font = "bold 54px Arial";
        context.textAlign = "center";

        const currentWords = Math.floor(progress * words.length);
        const visibleText = words.slice(0, currentWords + 1).join(" ");

        wrapText(context, visibleText, 540, 1430, 850, 68);

        frame++;

        if (frame <= totalFrames) {
          requestAnimationFrame(draw);
        } else {
          recorder.stop();
          resolve();
        }
      }

      draw();
    });
  }

  function wrapText(
    context: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    maxWidth: number,
    lineHeight: number
  ) {
    const words = text.split(" ");
    let line = "";

    for (let i = 0; i < words.length; i++) {
      const testLine = line + words[i] + " ";
      const metrics = context.measureText(testLine);

      if (metrics.width > maxWidth && i > 0) {
        context.fillText(line, x, y);
        line = words[i] + " ";
        y += lineHeight;
      } else {
        line = testLine;
      }
    }

    context.fillText(line, x, y);
  }

  return (
    <main className="min-h-screen bg-white text-slate-950">
      <nav className="md:sticky md:top-0 z-50 bg-white/90 backdrop-blur-xl border-b border-blue-100">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 text-white w-10 h-10 rounded-xl flex items-center justify-center font-bold shadow-lg">
              S
            </div>
            <h1 className="text-2xl font-bold">Scripto</h1>
          </div>

          <div className="hidden md:flex gap-8 text-sm font-semibold">
            <button onClick={() => scrollToSection(featuresRef)}>Product</button>
            <button onClick={() => scrollToSection(howRef)}>How it Works</button>
            <button onClick={() => scrollToSection(pricingRef)}>Pricing</button>
            <button onClick={() => scrollToSection(generatorRef)}>Generate</button>
          </div>

          <button
            onClick={() => scrollToSection(generatorRef)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-xl font-bold shadow-lg"
          >
            Get Started
          </button>
        </div>
      </nav>

      <section className="relative overflow-hidden px-6 pt-24 pb-24 text-center bg-[radial-gradient(circle_at_center,#dbeafe_0%,#ffffff_45%,#ffffff_100%)]">
        <div className="absolute inset-x-0 bottom-0 h-80 bg-gradient-to-t from-blue-600 via-blue-400 to-transparent opacity-90" />

        <div className="relative z-10 max-w-6xl mx-auto">
          <p className="inline-flex bg-blue-100 text-blue-700 px-5 py-2 rounded-full text-sm font-bold">
            AI VIDEO GENERATOR
          </p>

          <h2 className="text-5xl md:text-7xl font-black mt-6 leading-tight tracking-tight">
            Turn Photos & Scripts
            <br />
            Into <span className="text-blue-600">AI-Ready Videos</span>
          </h2>

          <p className="text-slate-600 mt-6 max-w-2xl mx-auto text-lg">
            Upload a photo, paste your transcript, choose a voice style, and
            create a demo video now.
          </p>

          <button
            onClick={() => scrollToSection(generatorRef)}
            className="mt-8 bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-2xl font-bold shadow-xl"
          >
            Get Started Free →
          </button>
        </div>
      </section>

      <section ref={howRef} className="px-6 py-24 bg-white">
        <h2 className="text-4xl font-black text-center">
          Follow These Steps To Create Your Video
        </h2>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto mt-12">
          <StepCard number="1" icon="📸" title="Upload Photo" text="Choose a clear photo." />
          <StepCard number="2" icon="🎙️" title="Play Voice" text="Use browser demo voice to speak your transcript." />
          <StepCard number="3" icon="🎬" title="Generate Video" text="Create a downloadable demo video." />
        </div>
      </section>

      <section ref={featuresRef} className="px-6 py-24 bg-gradient-to-b from-white to-blue-50">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-5xl font-black leading-tight">
              Built For <span className="text-blue-600">Real AI APIs Later</span>
            </h2>

            <p className="text-slate-600 mt-5 text-lg">
              Scripto is ready for OpenAI Vision, ElevenLabs, Tavus, HeyGen, or
              D-ID when you add API keys later.
            </p>

            <div className="mt-8 space-y-5">
              <Feature title="Photo Upload" text="Upload and preview selected images." />
              <Feature title="Browser Demo Voice" text="Plays your transcript using browser speech." />
              <Feature title="Supabase Backend" text="Saves images and transcripts automatically." />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-5">
            <div className="h-80 rounded-3xl bg-slate-900 shadow-2xl p-5 text-white flex flex-col justify-end border-4 border-blue-600">
              <p className="text-sm text-blue-200">DEMO MODE</p>
              <h3 className="text-2xl font-bold mt-2">Voice + Captions</h3>
            </div>

            <div className="h-96 rounded-3xl bg-blue-600 shadow-2xl p-5 text-white flex flex-col justify-end mt-10">
              <p className="text-sm text-blue-100">COMING NEXT</p>
              <h3 className="text-2xl font-bold mt-2">Moving Lips</h3>
            </div>
          </div>
        </div>
      </section>

      <section ref={generatorRef} className="px-6 py-24 bg-white">
        <div className="max-w-4xl mx-auto bg-white shadow-2xl rounded-[2rem] p-8 md:p-10 border border-blue-100">
          <h2 className="text-4xl font-black text-center">
            Generate Your Demo Video
          </h2>

          <div className="space-y-6 mt-10">
            <label className="block border-2 border-dashed border-blue-200 rounded-2xl p-8 text-center cursor-pointer hover:bg-blue-50">
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />

              {image ? (
                <div>
                  <img
                    src={image}
                    alt="Selected"
                    className="w-full max-h-80 object-cover rounded-2xl mb-4"
                  />
                  <p className="font-bold text-green-600">Photo selected ✅</p>
                  <p className="text-sm text-slate-500 mt-1">
                    {selectedFile?.name}
                  </p>
                </div>
              ) : (
                <div>
                  <p className="font-bold text-blue-600">Choose Photo</p>
                  <p className="text-sm text-slate-500 mt-2">
                    PNG, JPG, or JPEG image
                  </p>
                </div>
              )}
            </label>

            <button
              onClick={analyzePhoto}
              className="w-full bg-slate-950 hover:bg-slate-800 text-white py-4 rounded-2xl font-bold"
            >
              Analyze Photo
            </button>

            {analysis && (
              <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5 text-blue-800 font-semibold">
                {analysis}
              </div>
            )}

            <select
              value={voiceStyle}
              onChange={(e) => setVoiceStyle(e.target.value)}
              className="w-full border border-blue-100 rounded-2xl p-4 outline-none focus:ring-4 focus:ring-blue-100"
            >
              <option>Young Male - Calm</option>
              <option>Young Male - Energetic</option>
              <option>Mature Male - Deep</option>
              <option>Young Female - Friendly</option>
              <option>Mature Female - Professional</option>
              <option>Neutral Voice - Natural</option>
            </select>

            <textarea
              value={script}
              onChange={(e) => setScript(e.target.value)}
              placeholder="Paste your transcript here..."
              className="w-full h-44 border border-blue-100 rounded-2xl p-5 outline-none focus:ring-4 focus:ring-blue-100"
            />

            <button
              onClick={speakTranscript}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white py-5 rounded-2xl font-black text-lg shadow-xl"
            >
              Play Demo Voice
            </button>

            <button
              onClick={generateVideo}
              disabled={status === "processing"}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white py-5 rounded-2xl font-black text-lg shadow-xl"
            >
              {status === "processing" ? "Creating Demo Video..." : "Generate Demo Video"}
            </button>

            {videoReady && videoUrl && (
              <div className="bg-green-50 border border-green-200 rounded-2xl p-6 text-center">
                <p className="font-bold text-green-700">
                  Demo video created successfully!
                </p>

                <video
                  src={videoUrl}
                  controls
                  className="w-full rounded-2xl mt-5"
                />

                <a
                  href={videoUrl}
                  download="scripto-demo-video.webm"
                  className="inline-block mt-5 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-xl font-bold"
                >
                  Download Video
                </a>
              </div>
            )}
          </div>
        </div>
      </section>

      <section ref={pricingRef} className="px-6 py-24 bg-blue-50 text-center">
        <h2 className="text-4xl font-black">Simple Pricing</h2>
        <p className="mt-4 text-slate-600">
          Free demo now. Real AI voice and avatar generation can be added later.
        </p>
      </section>

      <footer className="bg-slate-950 text-white px-6 py-10 text-center">
        <h3 className="text-2xl font-bold">Scripto</h3>
        <p className="text-slate-400 mt-2">
          Turn photos and transcripts into AI-ready videos.
        </p>
      </footer>

      <canvas ref={canvasRef} className="hidden" />
    </main>
  );
}

function StepCard({
  number,
  icon,
  title,
  text,
}: {
  number: string;
  icon: string;
  title: string;
  text: string;
}) {
  return (
    <div className="bg-white rounded-[2rem] shadow-xl p-8 border border-blue-50 hover:shadow-2xl transition">
      <div className="flex items-center justify-between">
        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-bold">
          {number}
        </div>
        <div className="text-4xl">{icon}</div>
      </div>
      <h3 className="text-2xl font-bold mt-8">{title}</h3>
      <p className="text-slate-600 mt-3">{text}</p>
    </div>
  );
}

function Feature({ title, text }: { title: string; text: string }) {
  return (
    <div className="flex gap-4 items-start">
      <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center text-blue-600">
        ✓
      </div>
      <div>
        <h3 className="font-bold text-lg">{title}</h3>
        <p className="text-slate-600">{text}</p>
      </div>
    </div>
  );
}