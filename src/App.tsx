import { useState, useEffect, useRef } from "react";
import { GoogleGenAI, ThinkingLevel } from "@google/genai";
import { 
  Send, 
  Code, 
  Eye, 
  Sparkles, 
  RotateCcw,
  Terminal,
  Layers,
  Layout,
  Cpu,
  Copy,
  ExternalLink,
  Download,
  Trash2,
  History,
  Zap,
  Shield,
  Search,
  Settings,
  MoreVertical,
  Check,
  X,
  MessageSquare,
  Undo2,
  Redo2,
  Link,
  Rocket,
  Image as ImageIcon,
  Mic,
  MicOff,
  Paperclip,
  AlertCircle,
  RefreshCw
} from "lucide-react";
import { Toaster, toast } from "sonner";
import { 
  SiReact, 
  SiTailwindcss, 
  SiJavascript, 
  SiHtml5, 
  SiCss,
  SiVite,
  SiFramer
} from "react-icons/si";
import { motion, AnimatePresence } from "motion/react";
import Markdown from "react-markdown";
import Editor from "@monaco-editor/react";

// System instruction for the AI - Now supports iterative updates and mobile-first design
const SYSTEM_INSTRUCTION = `You are b.v.b, a high-performance neural app engine.
Your goal is to build and iteratively edit functional, high-quality web applications.

DESIGN PERSONA:
You are a world-class product designer and engineer. You don't just "make apps"; you craft digital experiences. You favor minimalism, high-contrast typography, and fluid motion.

DESIGN PHILOSOPHY:
- NO "AI SLOP": Avoid generic purple/blue gradients, default shadows, and standard "card-on-gray" layouts.
- INTENTIONAL PAIRINGS: Every font choice and color must have a purpose.
- SPACING AS A TOOL: Use whitespace to create hierarchy. Avoid uniform padding; create rhythm.
- MOTION: Use subtle transitions and hover effects to make the app feel alive.
- ACCESSIBILITY: Ensure high contrast and legible typography.

DESIGN RECIPES (MANDATORY: Pick one and stick to it):
1. TECHNICAL DASHBOARD: Professional, precise. Use visible 1px borders (white/10), monospace for data, and "Space Grotesk" for headers.
2. EDITORIAL HERO: Bold, dramatic. Use massive typography (20vw), tight line-height (0.85), and high-contrast black/white themes.
3. DARK LUXURY: Sophisticated. Pure black (#000) backgrounds, font weight 300, and thin gold or orange accents.
4. BRUTALIST: Raw, high-energy. Thick black borders, neon accents (#00FF00), and oversized sans-serif numbers.
5. CLEAN UTILITY: Trustworthy. System fonts, soft grays (#F5F5F5), and large rounded corners (24px).
6. ATMOSPHERIC: Immersive. Layered radial gradients, glassmorphism (backdrop-blur), and serif fonts for content.

TECHNICAL STANDARDS:
1. COMPLETE CODE: Always provide the full HTML in one block.
2. TAILWIND V4: Use modern Tailwind classes. Prefer @theme variables if needed.
3. LUCIDE ICONS: Use Lucide for all iconography.
4. RESPONSIVE: Mobile-first is not optional. Use bento grids for desktop.
5. INTERACTIVE: All buttons and inputs must have hover/active states.
6. BRANDING: Subtle "Built with b.v.b" in the footer.
7. CLEAN CODE: Use descriptive variable names and clear logic. Avoid spaghetti code.
8. PERFORMANCE: Use efficient DOM manipulation and avoid unnecessary re-renders in logic.

CODE STRUCTURE:
- Use a single <script type="module"> for logic.
- Keep CSS in a <style type="text/tailwindcss"> block.
- Use Lucide's createIcons() for rendering.
- Ensure all logic is self-contained and robust.

Format:
- Start with a 1-sentence technical summary.
- Provide the code block wrapped in \`\`\`html ... \`\`\`.
- After the code block, provide 3-4 short, actionable follow-up suggestions for the user to improve or modify the app. Format them as a JSON array of strings on a single line starting with 'SUGGESTIONS: '. Example: SUGGESTIONS: ["Add dark mode toggle", "Make it more brutalist", "Add a contact form"]`;

interface Message {
  role: "user" | "model";
  content: string;
  timestamp: Date;
  suggestions?: string[];
  image?: string;
}

interface AppSnapshot {
  id: string;
  code: string;
  timestamp: Date;
  prompt: string;
}

export default function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [generatedCode, setGeneratedCode] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [isPublishing, setIsPublishing] = useState(false);
  const [snapshots, setSnapshots] = useState<AppSnapshot[]>([]);
  const [activeTab, setActiveTab] = useState<"preview" | "code" | "projects">("preview");
  const [mobileView, setMobileView] = useState<"chat" | "preview" | "code" | "projects">("chat");
  const [copySuccess, setCopySuccess] = useState(false);
  const [shareLink, setShareLink] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isRequestingMic, setIsRequestingMic] = useState(false);
  const [micVolume, setMicVolume] = useState(0);
  const [userProfile, setUserProfile] = useState({
    name: "User",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=User",
    bio: "AI App Creator"
  });
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [lastAppError, setLastAppError] = useState<string | null>(null);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);
  const baseInputRef = useRef("");

  // Error listener for the generated app
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'APP_ERROR') {
        console.error("App Error Detected:", event.data.error);
        setLastAppError(event.data.error);
        toast.error("Error detected in preview. Click 'Fix Error' to resolve.", {
          duration: 5000,
          action: {
            label: "Fix Error",
            onClick: () => handleFixError(event.data.error)
          }
        });
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [generatedCode]);

  const handleFixError = async (error: string) => {
    const fixPrompt = `I detected an error in the generated application: "${error}". Please fix the code to resolve this issue.`;
    setInput(fixPrompt);
    setLastAppError(null);
    // Auto-send if possible or just let user click send
  };

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      if (hash.startsWith("#code=")) {
        try {
          const encodedCode = hash.replace("#code=", "");
          const decodedCode = atob(decodeURIComponent(encodedCode));
          if (decodedCode) {
            setGeneratedCode(decodedCode);
            setActiveTab("preview");
            setMobileView("preview");
            // Clear hash to avoid reloading on every refresh
            window.history.replaceState(null, "", window.location.pathname);
          }
        } catch (e) {
          console.error("Failed to decode code from URL", e);
        }
      }
    };

    handleHashChange();
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Speech Recognition Setup
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';
      recognitionRef.current.maxAlternatives = 1;

      recognitionRef.current.onresult = (event: any) => {
        let transcript = "";
        for (let i = 0; i < event.results.length; i++) {
          const result = event.results[i][0].transcript;
          // Ensure spaces between results if the engine doesn't provide them
          if (i > 0 && !transcript.endsWith(" ") && !result.startsWith(" ")) {
            transcript += " ";
          }
          transcript += result;
        }
        
        // Append transcript to the base input that was present when recording started
        const base = baseInputRef.current.trim();
        const cleanTranscript = transcript.trimStart();
        const combined = base ? `${base} ${cleanTranscript}` : cleanTranscript;
        setInput(combined);
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error("Speech recognition error", event.error);
        setIsRecording(false);
        if (event.error === 'not-allowed') {
          toast.error("Microphone access denied. Please check your browser permissions.");
        } else {
          toast.error(`Speech recognition error: ${event.error}`);
        }
      };

      recognitionRef.current.onend = () => {
        setIsRecording(false);
      };
    }
  }, []);

  const stopAudioAnalysis = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    setMicVolume(0);
  };

  const startAudioAnalysis = async (stream: MediaStream) => {
    try {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      source.connect(analyserRef.current);

      const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
      const updateVolume = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
        setMicVolume(average / 128); // Normalize to 0-1 range roughly
        animationFrameRef.current = requestAnimationFrame(updateVolume);
      };
      updateVolume();
    } catch (err) {
      console.error("Audio analysis error:", err);
    }
  };

  const toggleRecording = async () => {
    if (isRecording) {
      try {
        recognitionRef.current?.stop();
      } catch (e) {}
      stopAudioAnalysis();
      return;
    }
    
    if (isRequestingMic) return;

    if (!recognitionRef.current) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRecognition) {
        toast.error("Speech recognition is not supported in this browser.");
        return;
      }
      // Re-initialize if lost
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';
      recognitionRef.current.onresult = (event: any) => {
        let transcript = "";
        for (let i = 0; i < event.results.length; i++) {
          const result = event.results[i][0].transcript;
          if (i > 0 && !transcript.endsWith(" ") && !result.startsWith(" ")) {
            transcript += " ";
          }
          transcript += result;
        }
        const base = baseInputRef.current.trim();
        const cleanTranscript = transcript.trimStart();
        const combined = base ? `${base} ${cleanTranscript}` : cleanTranscript;
        setInput(combined);
      };
      recognitionRef.current.onerror = (event: any) => {
        console.error("Speech recognition error", event.error);
        setIsRecording(false);
        stopAudioAnalysis();
      };
      recognitionRef.current.onend = () => {
        setIsRecording(false);
        stopAudioAnalysis();
      };
    }
    
    setIsRequestingMic(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      startAudioAnalysis(stream);
      
      await new Promise(resolve => setTimeout(resolve, 300));
      
      baseInputRef.current = input;
      
      try {
        recognitionRef.current.start();
        setIsRecording(true);
        toast.info("Listening...");
      } catch (startError: any) {
        if (startError.name === 'InvalidStateError') {
          setIsRecording(true);
        } else {
          stopAudioAnalysis();
          stream.getTracks().forEach(track => track.stop());
          throw startError;
        }
      }
    } catch (err: any) {
      console.error("Microphone access error:", err);
      setIsRecording(false);
      stopAudioAnalysis();
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        toast.error("Microphone access denied. Please check your browser permissions.");
      } else {
        toast.error(`Microphone error: ${err.message || 'Unknown error'}`);
      }
    } finally {
      setIsRequestingMic(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Image size must be less than 5MB");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Suppress ResizeObserver loop error
  useEffect(() => {
    const handleError = (e: ErrorEvent) => {
      if (e.message === "ResizeObserver loop completed with undelivered notifications.") {
        const resizeObserverErrDiv = document.getElementById(
          "webpack-dev-server-client-overlay-div"
        );
        const resizeObserverErr = document.getElementById(
          "webpack-dev-server-client-overlay"
        );
        if (resizeObserverErr) {
          resizeObserverErr.setAttribute("style", "display: none");
        }
        if (resizeObserverErrDiv) {
          resizeObserverErrDiv.setAttribute("style", "display: none");
        }
        e.stopImmediatePropagation();
      }
    };

    window.addEventListener("error", handleError);
    return () => window.removeEventListener("error", handleError);
  }, []);

  const extractCode = (text: string) => {
    const match = text.match(/```html\s+([\s\S]*?)\s+```/);
    return match ? match[1] : null;
  };

  const extractSuggestions = (text: string) => {
    const match = text.match(/SUGGESTIONS:\s*(\[.*\])/);
    if (match) {
      try {
        return JSON.parse(match[1]);
      } catch (e) {
        return null;
      }
    }
    return null;
  };

  const [editorValue, setEditorValue] = useState<string>("");
  const editorRef = useRef<any>(null);

  useEffect(() => {
    if (generatedCode) {
      setEditorValue(generatedCode);
    }
  }, [generatedCode]);

  const handleEditorChange = (value: string | undefined) => {
    if (value !== undefined) {
      setEditorValue(value);
    }
  };

  const updateGeneratedCode = (code: string) => {
    if (!code) return "";
    const errorScript = `
<script>
  (function() {
    const originalError = window.onerror;
    window.onerror = function(message, source, lineno, colno, error) {
      window.parent.postMessage({
        type: 'APP_ERROR',
        error: message,
        source: source,
        lineno: lineno,
        colno: colno
      }, '*');
      if (originalError) return originalError(message, source, lineno, colno, error);
      return false;
    };
    window.onunhandledrejection = function(event) {
      window.parent.postMessage({
        type: 'APP_ERROR',
        error: event.reason ? (event.reason.message || event.reason) : 'Unhandled Promise Rejection'
      }, '*');
    };
    console.error = (function(oldError) {
      return function(message) {
        window.parent.postMessage({
          type: 'APP_ERROR',
          error: typeof message === 'object' ? JSON.stringify(message) : String(message)
        }, '*');
        oldError.apply(console, arguments);
      };
    })(console.error);
  })();
</script>
`;
    const injectedCode = code.includes('<head>') 
      ? code.replace('<head>', '<head>' + errorScript)
      : errorScript + code;
    
    setGeneratedCode(injectedCode);
    return injectedCode;
  };

  const handleSaveEditor = () => {
    const finalCode = updateGeneratedCode(editorValue);
    const newHistory = [...history.slice(0, historyIndex + 1), finalCode];
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
    toast.success("Code updated successfully!");
  };

  const handleFormatCode = async () => {
    if (editorRef.current) {
      editorRef.current.getAction('editor.action.formatDocument').run();
      toast.success("Code formatted!");
    }
  };

  const onEditorMount = (editor: any, monaco: any) => {
    editorRef.current = editor;
    
    // Configure Monaco for better linting/validation
    monaco.languages.html.htmlDefaults.setOptions({
      format: {
        tabSize: 2,
        insertSpaces: true,
      },
      suggest: {
        html5: true,
      },
      validate: true,
    });

    monaco.languages.css.cssDefaults.setOptions({
      validate: true,
      lint: {
        compatibleVendorPrefixes: "ignore",
        vendorPrefix: "warning",
        duplicateProperties: "warning",
        emptyRules: "warning",
        importStatement: "ignore",
        boxModel: "ignore",
        universalSelector: "ignore",
        zeroUnits: "ignore",
        fontFaceDeclaration: "warning",
        argumentsInColorFunction: "error",
        unknownProperties: "warning",
        ieHack: "ignore",
        unknownVendorSpecificProperties: "ignore",
        propertyIgnoredDueToDisplay: "warning",
        important: "warning",
        float: "ignore",
        idSelector: "warning",
      },
    });

    monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
      noSemanticValidation: false,
      noSyntaxValidation: false,
    });
  };

  const handleSend = async () => {
    if ((!input.trim() && !selectedImage) || isLoading) return;

    const userMessage = input.trim();
    const currentImage = selectedImage;
    setInput("");
    setSelectedImage(null);
    
    const newUserMsg: Message = { 
      role: "user", 
      content: userMessage || (currentImage ? "Analyze this image" : ""), 
      timestamp: new Date(),
      image: currentImage || undefined
    };
    setMessages(prev => [...prev, newUserMsg]);
    setIsLoading(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
      const chat = ai.chats.create({
        model: "gemini-3-flash-preview",
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH }
        },
      });

      let contents: any = userMessage;
      if (currentImage) {
        const base64Data = currentImage.split(",")[1];
        const mimeType = currentImage.split(";")[0].split(":")[1];
        contents = {
          parts: [
            { text: userMessage || "Analyze this image and help me build/edit my app based on it." },
            { inlineData: { data: base64Data, mimeType } }
          ]
        };
      }

      const contextPrompt = generatedCode 
        ? `I am working on an app. Here is the current code:\n\n\`\`\`html\n${generatedCode}\n\`\`\`\n\nUser's request for modification: ${userMessage || "Update based on the provided image"}\n\nPlease update the code based on this request. Remember to provide the COMPLETE code in your response.`
        : `User's request for a new app: ${userMessage || "Create an app based on the provided image"}`;

      // If there's an image, we use generateContent directly instead of chat for simplicity in this turn
      // or we can just send the content part.
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: currentImage ? [
          { role: 'user', parts: contents.parts },
          { role: 'user', parts: [{ text: contextPrompt }] }
        ] : [
          { role: 'user', parts: [{ text: contextPrompt }] }
        ],
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH }
        }
      });

      let fullResponse = response.text || "";
      const suggestions = extractSuggestions(fullResponse);
      
      setMessages(prev => [...prev, { 
        role: "model", 
        content: fullResponse, 
        timestamp: new Date(),
        suggestions: suggestions || undefined
      }]);

      const code = extractCode(fullResponse);
      if (code) {
        const finalCode = updateGeneratedCode(code);
        const newHistory = [...history.slice(0, historyIndex + 1), finalCode];
        setHistory(newHistory);
        setHistoryIndex(newHistory.length - 1);
        setActiveTab("preview");
        setMobileView("preview");
      }
    } catch (error: any) {
      console.error("Error generating app:", error);
      let errorMessage = "Sorry, I encountered an error while generating your app. Please try again.";
      
      if (error?.message?.includes("429") || error?.status === "RESOURCE_EXHAUSTED") {
        errorMessage = "You've hit the rate limit for the AI model. Please wait a minute before trying again.";
      }

      setMessages(prev => [...prev, { 
        role: "model", 
        content: errorMessage,
        timestamp: new Date()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setGeneratedCode(history[newIndex]);
      setActiveTab("preview");
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setGeneratedCode(history[newIndex]);
      setActiveTab("preview");
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedCode);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  const downloadCode = () => {
    const blob = new Blob([generatedCode], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "bvb-app.html";
    a.click();
    URL.revokeObjectURL(url);
  };

  const popoutPreview = () => {
    const win = window.open("", "_blank");
    if (win) {
      win.document.write(generatedCode);
      win.document.close();
    }
  };

  const publishApp = async () => {
    if (!generatedCode) return;
    setIsPublishing(true);
    
    // Simulate a deployment process
    const promise = new Promise((resolve) => setTimeout(resolve, 2500));
    
    toast.promise(promise, {
      loading: 'Synthesizing production build...',
      success: () => {
        setIsPublishing(false);
        return 'App successfully deployed to the edge!';
      },
      error: 'Deployment failed. Neural core link unstable.',
    });
  };

  const saveToVault = () => {
    if (!generatedCode) return;
    
    // Get the last user message as the prompt
    const lastUserMsg = [...messages].reverse().find(m => m.role === "user")?.content || "Untitled App";
    
    const id = Math.random().toString(36).substr(2, 9);
    setSnapshots(prev => [
      { 
        id, 
        code: generatedCode, 
        timestamp: new Date(), 
        prompt: lastUserMsg 
      },
      ...prev
    ]);
    
    // Generate share link
    try {
      const baseUrl = window.location.origin + window.location.pathname;
      const encoded = encodeURIComponent(btoa(generatedCode));
      const link = `${baseUrl}#code=${encoded}`;
      setShareLink(link);
    } catch (e) {
      console.error("Failed to generate share link", e);
    }
    
    // Show a temporary success message in the chat
    setMessages(prev => [...prev, {
      role: "model",
      content: "✨ **Project published to Vault!** You can find it in the Projects tab. \n\nI've also generated a shareable link for you.",
      timestamp: new Date()
    }]);
  };

  const resetApp = () => {
    if (confirm("Are you sure you want to reset? This will clear the current app and chat history.")) {
      setMessages([{ 
        role: "model", 
        content: "App reset. What can I build for you now?",
        timestamp: new Date()
      }]);
      setGeneratedCode("");
      setHistory([]);
      setHistoryIndex(-1);
      setSnapshots([]);
      setActiveTab("preview");
      setMobileView("chat");
    }
  };

  return (
    <div className="flex h-screen bg-[#050505] text-white font-sans overflow-hidden flex-col md:flex-row text-[13px] relative">
      <Toaster position="top-center" expand={false} richColors theme="dark" />
      {/* Background Atmosphere - Optimized for performance */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-orange-500/5 blur-[150px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-500/5 blur-[150px] rounded-full" />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.02] mix-blend-overlay" />
      </div>

      {/* Left Sidebar - Hidden on Mobile */}
      <div className="hidden md:flex w-14 border-r border-white/5 flex-col items-center py-6 gap-8 bg-[#0a0a0a]/80 backdrop-blur-3xl z-10">
        <motion.div 
          whileHover={{ scale: 1.1, rotate: 5 }}
          whileTap={{ scale: 0.9 }}
          className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center shadow-xl shadow-orange-500/30 ring-1 ring-white/20"
        >
          <Sparkles className="text-white w-5 h-5" />
        </motion.div>
        
        <div className="flex flex-col gap-6 flex-1">
          <motion.button 
            whileHover={{ scale: 1.1, x: 2 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => { setActiveTab("preview"); setMobileView("chat"); }}
            className={`p-2 transition-all group relative ${activeTab === "preview" ? "text-orange-500" : "text-white/30 hover:text-white"}`} 
            title="Chat"
          >
            <MessageSquare className="w-5 h-5" />
            <div className="absolute left-full ml-2 px-2 py-1 bg-white/5 border border-white/10 rounded text-[10px] opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">Chat Engine</div>
          </motion.button>
          <motion.button 
            whileHover={{ scale: 1.1, x: 2 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => { setActiveTab("projects"); setMobileView("projects"); }}
            className={`p-2 transition-all group relative ${activeTab === "projects" ? "text-orange-500" : "text-white/30 hover:text-white"}`} 
            title="Projects"
          >
            <Layers className="w-5 h-5" />
            <div className="absolute left-full ml-2 px-2 py-1 bg-white/5 border border-white/10 rounded text-[10px] opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">Project Gallery</div>
          </motion.button>
        </div>

        <div className="flex flex-col gap-6">
          <motion.button 
            whileHover={{ scale: 1.1, x: 2 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setIsProfileModalOpen(true)}
            className="p-2 text-white/30 hover:text-orange-500 transition-all group relative" 
            title="Profile"
          >
            <div className="w-6 h-6 rounded-full border border-white/20 overflow-hidden">
              <img src={userProfile.avatar} alt="Profile" className="w-full h-full object-cover" />
            </div>
            <div className="absolute left-full ml-2 px-2 py-1 bg-white/5 border border-white/10 rounded text-[10px] opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">User Profile</div>
          </motion.button>
          <motion.button 
            whileHover={{ scale: 1.1, x: 2 }}
            whileTap={{ scale: 0.9 }}
            className="p-2 text-white/30 hover:text-orange-500 transition-all group relative" 
            title="Settings"
          >
            <Settings className="w-5 h-5" />
            <div className="absolute left-full ml-2 px-2 py-1 bg-white/5 border border-white/10 rounded text-[10px] opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">System Config</div>
          </motion.button>
          <motion.button 
            whileHover={{ scale: 1.1, x: 2 }}
            whileTap={{ scale: 0.9 }}
            onClick={resetApp}
            className="p-2 text-white/30 hover:text-red-500 transition-all group relative" 
            title="Reset"
          >
            <Trash2 className="w-5 h-5" />
            <div className="absolute left-full ml-2 px-2 py-1 bg-white/5 border border-white/10 rounded text-[10px] opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">Hard Reset</div>
          </motion.button>
        </div>
      </div>

      {/* Chat Panel - Full width on mobile, 340px on desktop */}
      <div className={`${mobileView === "chat" ? "flex" : "hidden md:flex"} w-full md:w-[340px] border-r border-white/5 flex flex-col bg-[#0d0d0d]/60 backdrop-blur-2xl h-full z-10`}>
        <div className="p-5 border-b border-white/5 flex items-center justify-between bg-black/20 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center shadow-lg shadow-orange-500/20 overflow-hidden border border-white/10">
              <img 
                src="https://api.dicebear.com/7.x/shapes/svg?seed=bvb&backgroundColor=transparent&shape1Color=ffffff&shape2Color=ffffff&shape3Color=ffffff" 
                alt="b.v.b" 
                className="w-5 h-5 opacity-80"
                referrerPolicy="no-referrer"
              />
            </div>
            <div>
              <h1 className="text-sm font-black tracking-tight flex items-center gap-2 font-display">
                b.v.b <span className="text-[9px] bg-orange-500/10 text-orange-400 px-2 py-0.5 rounded-full border border-orange-500/20 font-black">PRO</span>
              </h1>
              <p className="text-[8px] text-white/20 uppercase tracking-[0.3em] font-black">Neural App Engine</p>
            </div>
          </div>
          <div className="flex gap-2">
            <motion.button 
              whileHover={{ scale: 1.1, rotate: 90 }}
              whileTap={{ scale: 0.9 }}
              onClick={resetApp} 
              className="p-2 text-white/20 hover:text-red-500 transition-colors"
            >
              <Trash2 className="w-4.5 h-4.5" />
            </motion.button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-8 scrollbar-custom">
          <AnimatePresence initial={false}>
            {messages.length === 0 && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="h-full flex flex-col items-center justify-center text-center space-y-6 py-10"
              >
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center shadow-2xl shadow-orange-500/20 border border-white/10 mb-2">
                  <Cpu className="w-8 h-8 text-white animate-pulse" />
                </div>
                <div>
                  <h2 className="text-lg font-black tracking-tight font-display">Initialize Neural Engine</h2>
                  <p className="text-[10px] text-white/30 uppercase tracking-[0.2em] mt-1">Describe your blueprint to begin synthesis</p>
                </div>
              </motion.div>
            )}
            {messages.map((msg, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, x: msg.role === "user" ? 20 : -20, scale: 0.95 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}
              >
                <div className={`flex items-start gap-3 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
                  {msg.role === "model" ? (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-orange-500/20 border border-white/10 overflow-hidden">
                      <img 
                        src="https://api.dicebear.com/7.x/shapes/svg?seed=bvb&backgroundColor=transparent&shape1Color=ffffff&shape2Color=ffffff&shape3Color=ffffff" 
                        alt="b.v.b" 
                        className="w-5 h-5 opacity-80"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  ) : (
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      onClick={() => setIsProfileModalOpen(true)}
                      className="w-8 h-8 rounded-full border border-orange-500/30 overflow-hidden flex-shrink-0 shadow-lg shadow-orange-500/10"
                    >
                      <img src={userProfile.avatar} alt={userProfile.name} className="w-full h-full object-cover" />
                    </motion.button>
                  )}
                  <div 
                    className={`max-w-[90%] p-3 md:p-4 rounded-2xl text-[11px] md:text-[12px] leading-relaxed shadow-2xl transition-all ${
                      msg.role === "user" 
                        ? "bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded-tr-none border border-orange-400/20" 
                        : "bg-white/[0.04] text-white/90 border border-white/10 rounded-tl-none backdrop-blur-md"
                    }`}
                  >
                    <div className="prose prose-invert prose-xs max-w-none prose-p:my-1 prose-headings:text-orange-400 prose-headings:font-display prose-headings:tracking-tight prose-strong:text-orange-300 prose-pre:bg-black/50 prose-pre:border prose-pre:border-white/10 prose-pre:rounded-xl prose-code:text-orange-300 prose-code:bg-orange-500/10 prose-code:px-1 prose-code:rounded">
                      <Markdown>
                        {msg.role === "model" 
                          ? msg.content.replace(/```html\s+[\s\S]*?\s+```/g, "").split('SUGGESTIONS:')[0].trim() 
                          : msg.content}
                      </Markdown>
                    </div>
                    {msg.image && (
                      <div className="mt-3 rounded-xl overflow-hidden border border-white/10 shadow-lg max-w-[200px]">
                        <img src={msg.image} alt="User Upload" className="w-full h-auto object-cover" />
                      </div>
                    )}
                    {msg.role === "model" && extractCode(msg.content) && (
                      <div className="mt-3 flex gap-2">
                        <motion.button 
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => {
                            const code = extractCode(msg.content);
                            if (code) {
                              setGeneratedCode(code);
                              setActiveTab("code");
                              setMobileView("code");
                            }
                          }}
                          className="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white rounded-lg text-[9px] font-black uppercase tracking-widest transition-all border border-white/10"
                        >
                          <Code className="w-3 h-3" />
                          Edit Code
                        </motion.button>
                        <motion.button 
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => {
                            const code = extractCode(msg.content);
                            if (code) {
                              setGeneratedCode(code);
                              setActiveTab("preview");
                              setMobileView("preview");
                            }
                          }}
                          className="flex items-center gap-2 px-3 py-1.5 bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all border border-orange-500/20"
                        >
                          <Eye className="w-3 h-3" />
                          Preview
                        </motion.button>
                      </div>
                    )}
                    {msg.role === "model" && msg.content.includes("published to Vault") && shareLink && (
                      <div className="mt-4 p-3 bg-black/40 rounded-xl border border-white/10 flex items-center justify-between gap-4">
                        <div className="flex-1 truncate text-[10px] text-white/40 font-mono">
                          {shareLink}
                        </div>
                        <button 
                          onClick={() => {
                            navigator.clipboard.writeText(shareLink);
                            setCopySuccess(true);
                            setTimeout(() => setCopySuccess(false), 2000);
                          }}
                          className="flex items-center gap-2 px-3 py-1.5 bg-orange-500/20 text-orange-400 rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-orange-500 hover:text-white transition-all"
                        >
                          {copySuccess ? <Check className="w-3 h-3" /> : <Link className="w-3 h-3" />}
                          {copySuccess ? "COPIED" : "COPY LINK"}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                <span className="text-[8px] text-white/10 mt-2 uppercase tracking-[0.2em] font-black px-1">
                  {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </motion.div>
            ))}
          </AnimatePresence>
          {isLoading && (
            <div className="flex items-start gap-3 mb-6">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-orange-500/20 border border-white/10 overflow-hidden">
                <img 
                  src="https://api.dicebear.com/7.x/shapes/svg?seed=bvb&backgroundColor=transparent&shape1Color=ffffff&shape2Color=ffffff&shape3Color=ffffff" 
                  alt="b.v.b" 
                  className="w-5 h-5 opacity-80"
                  referrerPolicy="no-referrer"
                />
              </div>
              <motion.div 
                initial={{ opacity: 0, x: -10 }} 
                animate={{ opacity: 1, x: 0 }} 
                className="flex flex-col gap-2 bg-white/[0.04] border border-white/10 rounded-2xl rounded-tl-none p-4 backdrop-blur-md shadow-2xl min-w-[160px]"
              >
                <div className="flex items-center gap-3">
                  <div className="flex gap-1.5">
                    <motion.div animate={{ scale: [1, 1.5, 1], opacity: [0.4, 1, 0.4] }} transition={{ duration: 1, repeat: Infinity }} className="w-1.5 h-1.5 bg-orange-500 rounded-full shadow-[0_0_10px_rgba(249,115,22,0.5)]" />
                    <motion.div animate={{ scale: [1, 1.5, 1], opacity: [0.4, 1, 0.4] }} transition={{ duration: 1, repeat: Infinity, delay: 0.2 }} className="w-1.5 h-1.5 bg-orange-500 rounded-full shadow-[0_0_10px_rgba(249,115,22,0.5)]" />
                    <motion.div animate={{ scale: [1, 1.5, 1], opacity: [0.4, 1, 0.4] }} transition={{ duration: 1, repeat: Infinity, delay: 0.4 }} className="w-1.5 h-1.5 bg-orange-500 rounded-full shadow-[0_0_10px_rgba(249,115,22,0.5)]" />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-[0.3em] text-orange-400 animate-pulse">Thinking...</span>
                </div>
                <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ x: "-100%" }}
                    animate={{ x: "100%" }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                    className="h-full w-1/2 bg-gradient-to-r from-transparent via-orange-500/40 to-transparent"
                  />
                </div>
                <p className="text-[8px] text-white/20 font-mono uppercase tracking-[0.2em]">Synthesizing Neural Patterns</p>
              </motion.div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        <div className="p-5 border-t border-white/5 bg-black/30 backdrop-blur-xl">
          {lastAppError && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center justify-between gap-4"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-500/20 rounded-lg">
                  <AlertCircle className="w-4 h-4 text-red-500" />
                </div>
                <div>
                  <p className="text-[10px] font-black text-red-400 uppercase tracking-widest">Error Detected</p>
                  <p className="text-[9px] text-red-400/60 truncate max-w-[200px]">{lastAppError}</p>
                </div>
              </div>
              <button 
                onClick={() => handleFixError(lastAppError)}
                className="px-3 py-1.5 bg-red-500 text-white rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-red-600 transition-all shadow-lg shadow-red-500/20"
              >
                Fix with AI
              </button>
            </motion.div>
          )}
          {(() => {
            const lastModelMsg = [...messages].reverse().find(m => m.role === "model" && m.suggestions);
            if (lastModelMsg?.suggestions && !isLoading) {
              return (
                <div className="flex gap-2 mb-4 overflow-x-auto scrollbar-hide pb-2">
                  {lastModelMsg.suggestions.map((s, i) => (
                    <motion.button
                      key={i}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      onClick={() => { setInput(s); }}
                      className="flex-shrink-0 px-3 py-1.5 bg-white/[0.03] hover:bg-white/[0.08] border border-white/5 rounded-full text-[9px] font-bold text-white/40 hover:text-orange-400 transition-all whitespace-nowrap"
                    >
                      {s}
                    </motion.button>
                  ))}
                </div>
              );
            }
            return null;
          })()}
          {selectedImage && (
            <div className="mb-4 relative inline-block group">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative rounded-xl overflow-hidden border border-white/10 shadow-2xl"
              >
                <img src={selectedImage} alt="Preview" className="h-20 w-auto object-cover" />
                <button 
                  onClick={() => setSelectedImage(null)}
                  className="absolute top-1 right-1 p-1 bg-black/60 hover:bg-black/80 rounded-full text-white/80 hover:text-white transition-all"
                >
                  <X className="w-3 h-3" />
                </button>
              </motion.div>
            </div>
          )}
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-orange-500/20 to-blue-500/20 rounded-[24px] blur-lg opacity-0 group-focus-within:opacity-100 transition duration-700" />
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="Describe your vision..."
                className="relative w-full bg-white/[0.04] border border-white/10 rounded-2xl p-4 pr-32 text-[12px] focus:outline-none focus:border-orange-500/40 transition-all resize-none h-24 placeholder:text-white/10 scrollbar-hide backdrop-blur-md ring-1 ring-white/5"
              />
            </motion.div>
            <div className="absolute bottom-4 right-4 flex items-center gap-2 z-10">
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleImageUpload} 
                accept="image/*" 
                className="hidden" 
              />
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => fileInputRef.current?.click()}
                className="p-2.5 bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 rounded-xl text-white/40 hover:text-orange-400 transition-all"
                title="Upload Image"
              >
                <ImageIcon className="w-4.5 h-4.5" />
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={toggleRecording}
                className={`p-2.5 border border-white/10 rounded-xl transition-all relative overflow-hidden ${isRecording ? 'bg-red-500/20 text-red-500' : 'bg-white/[0.04] hover:bg-white/[0.08] text-white/40 hover:text-orange-400'}`}
                title={isRecording ? "Stop Recording" : "Start Voice Input"}
              >
                {isRecording && (
                  <motion.div 
                    className="absolute inset-0 bg-red-500/10 pointer-events-none"
                    animate={{ 
                      scale: 1 + (micVolume * 0.5),
                      opacity: 0.2 + (micVolume * 0.3)
                    }}
                  />
                )}
                {isRecording ? <MicOff className="w-4.5 h-4.5 relative z-10" /> : <Mic className="w-4.5 h-4.5" />}
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.1, boxShadow: "0 0 20px rgba(249,115,22,0.4)" }}
                whileTap={{ scale: 0.9 }}
                onClick={handleSend}
                disabled={isLoading || (!input.trim() && !selectedImage)}
                className="p-2.5 bg-gradient-to-br from-orange-400 to-orange-600 rounded-xl disabled:opacity-50 transition-all shadow-lg"
              >
                <Send className="w-4.5 h-4.5" />
              </motion.button>
            </div>
          </div>
          <div className="flex items-center justify-between mt-4 px-2">
             <div className="flex gap-4 opacity-20">
                <SiReact className="w-3.5 h-3.5 hover:text-blue-400 transition-colors cursor-help" />
                <SiTailwindcss className="w-3.5 h-3.5 hover:text-cyan-400 transition-colors cursor-help" />
                <SiVite className="w-3.5 h-3.5 hover:text-purple-400 transition-colors cursor-help" />
             </div>
             <p className="text-[8px] text-white/5 uppercase tracking-[0.5em] font-black">v1.2.0-stable</p>
          </div>
        </div>
      </div>

      {/* Main Content - Preview/Code */}
      <div className={`${mobileView !== "chat" ? "flex" : "hidden md:flex"} flex-1 flex-col bg-transparent relative h-full z-10`}>
        <div className="min-h-[3.5rem] py-2 border-b border-white/5 flex flex-wrap items-center justify-between px-4 md:px-8 bg-[#0a0a0a]/60 backdrop-blur-2xl sticky top-0 z-10 gap-y-2">
          <div className="flex items-center gap-3 md:gap-8">
            <motion.button 
              whileHover={{ y: -2 }}
              onClick={() => { setActiveTab("preview"); setMobileView("preview"); }}
              className={`flex items-center gap-2.5 text-[10px] font-black tracking-[0.3em] uppercase transition-all relative py-5 font-display ${activeTab === "preview" ? "text-orange-400" : "text-white/20 hover:text-white/40"}`}
            >
              <Eye className="w-4.5 h-4.5" />
              Preview
              {activeTab === "preview" && <motion.div layoutId="tab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.6)]" />}
            </motion.button>
            <motion.button 
              whileHover={{ y: -2 }}
              onClick={() => { setActiveTab("code"); setMobileView("code"); }}
              className={`flex items-center gap-2.5 text-[10px] font-black tracking-[0.3em] uppercase transition-all relative py-5 font-display ${activeTab === "code" ? "text-orange-400" : "text-white/20 hover:text-white/40"}`}
            >
              <Code className="w-4.5 h-4.5" />
              Code
              {activeTab === "code" && <motion.div layoutId="tab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.6)]" />}
            </motion.button>
            <motion.button 
              whileHover={{ y: -2 }}
              onClick={() => { setActiveTab("projects"); setMobileView("projects"); }}
              className={`flex items-center gap-2.5 text-[10px] font-black tracking-[0.3em] uppercase transition-all relative py-5 font-display ${activeTab === "projects" ? "text-orange-400" : "text-white/20 hover:text-white/40"}`}
            >
              <Layers className="w-4.5 h-4.5" />
              Projects
              {activeTab === "projects" && <motion.div layoutId="tab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.6)]" />}
            </motion.button>
          </div>
          
          <div className="flex items-center gap-5">
            <div className="hidden sm:flex gap-2 mr-2 border-r border-white/10 pr-4">
              <motion.button 
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={handleUndo} 
                disabled={historyIndex <= 0}
                className="p-2 text-white/20 hover:text-white bg-white/[0.04] border border-white/5 rounded-xl transition-all disabled:opacity-5 hover:bg-white/10"
                title="Undo"
              >
                <Undo2 className="w-4 h-4" />
              </motion.button>
              <motion.button 
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={handleRedo} 
                disabled={historyIndex >= history.length - 1}
                className="p-2 text-white/20 hover:text-white bg-white/[0.04] border border-white/5 rounded-xl transition-all disabled:opacity-5 hover:bg-white/10"
                title="Redo"
              >
                <Redo2 className="w-4 h-4" />
              </motion.button>
            </div>
            {generatedCode && (
              <div className="flex items-center gap-1.5 sm:gap-2">
                <motion.button 
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => { setActiveTab("code"); setMobileView("code"); }}
                  className="px-2.5 py-1.5 bg-white/[0.04] text-white/40 border border-white/10 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-white/10 hover:text-white transition-all flex items-center gap-2"
                  title="Edit Source Code"
                >
                  <Code className="w-3 h-3" />
                  <span className="hidden xs:inline">Edit</span>
                </motion.button>
                <motion.button 
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={saveToVault}
                  className="px-2.5 py-1.5 bg-white/[0.04] text-white/40 border border-white/10 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-white/10 hover:text-white transition-all flex items-center gap-2"
                  title="Save to Vault"
                >
                  <Zap className="w-3 h-3" />
                  <span className="hidden xs:inline">Vault</span>
                </motion.button>
                
                <div className="flex gap-1 sm:gap-2">
                  <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={copyToClipboard} className="p-2 text-white/20 hover:text-white bg-white/[0.04] border border-white/5 rounded-xl transition-all hover:bg-white/10" title="Copy Code">
                    {copySuccess ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                  </motion.button>
                  <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={downloadCode} className="p-2 text-white/20 hover:text-white bg-white/[0.04] border border-white/5 rounded-xl transition-all hover:bg-white/10" title="Download">
                    <Download className="w-4 h-4" />
                  </motion.button>
                  <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={popoutPreview} className="p-2 text-white/20 hover:text-white bg-white/[0.04] border border-white/5 rounded-xl transition-all hover:bg-white/10" title="Popout">
                    <ExternalLink className="w-4 h-4" />
                  </motion.button>
                </div>

                <motion.button 
                  whileHover={{ scale: 1.05, boxShadow: "0 0 30px rgba(249,115,22,0.5)" }}
                  whileTap={{ scale: 0.95 }}
                  onClick={publishApp} 
                  disabled={isPublishing}
                  className="flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-orange-500 text-white rounded-xl shadow-[0_0_20px_rgba(249,115,22,0.3)] transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
                >
                  <Rocket className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isPublishing ? 'animate-bounce' : 'group-hover:animate-pulse'}`} />
                  <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest">Publish App</span>
                </motion.button>
              </div>
            )}
            <div className="md:hidden w-px h-5 bg-white/10 mx-1" />
            <motion.button whileTap={{ scale: 0.9 }} onClick={() => setMobileView("chat")} className="md:hidden p-2 text-white/20 hover:text-orange-500 transition-colors">
              <MessageSquare className="w-5 h-5" />
            </motion.button>
          </div>
        </div>

        <div className="flex-1 relative overflow-hidden bg-transparent">
          <AnimatePresence mode="wait">
            {activeTab === "preview" ? (
              <motion.div 
                key="preview"
                initial={{ opacity: 0, scale: 0.99 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.01 }}
                className="w-full h-full"
              >
                {generatedCode ? (
                  <div className="w-full h-full p-6 bg-black/20">
                    <div className="w-full h-full rounded-3xl overflow-hidden bg-white shadow-[0_40px_80px_-20px_rgba(0,0,0,0.6)] border border-white/5 ring-1 ring-white/10 relative group">
                      <div className="absolute inset-0 bg-gradient-to-tr from-orange-500/5 to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
                      <iframe
                        title="App Preview"
                        srcDoc={generatedCode}
                        className="w-full h-full border-none"
                        sandbox="allow-scripts allow-forms allow-modals allow-popups"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-white/5 space-y-8">
                    <div className="relative">
                      <div className="absolute inset-[-40px] bg-gradient-to-r from-orange-500/10 to-blue-500/10 blur-3xl rounded-full opacity-50" />
                      <div className="grid grid-cols-2 gap-8 relative">
                        <Layout className="w-16 h-16" />
                        <Cpu className="w-16 h-16" />
                      </div>
                    </div>
                    <p className="text-[11px] font-black uppercase tracking-[0.6em] text-white/10 font-display">Engine Standby</p>
                  </div>
                )}
              </motion.div>
            ) : activeTab === "code" ? (
              <motion.div 
                key="code"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="w-full h-full flex flex-col bg-[#0d0d0d]/60 backdrop-blur-md"
              >
                {generatedCode ? (
                  <>
                    <div className="h-10 border-b border-white/5 flex items-center justify-between px-4 bg-white/[0.02]">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <SiHtml5 className="w-3 h-3 text-orange-500" />
                          <span className="text-[9px] font-black uppercase tracking-widest text-white/40">index.html</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <SiTailwindcss className="w-3 h-3 text-cyan-400" />
                          <span className="text-[9px] font-black uppercase tracking-widest text-white/40">Tailwind v4</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <motion.button 
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => { setActiveTab("preview"); setMobileView("chat"); }}
                          className="px-2 py-1 bg-blue-500/10 hover:bg-blue-500 border border-blue-500/20 rounded-lg text-[8px] font-black uppercase tracking-widest text-blue-400 hover:text-white transition-all flex items-center gap-1.5"
                        >
                          <MessageSquare className="w-3 h-3" />
                          Modify with AI
                        </motion.button>
                        <motion.button 
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={handleFormatCode}
                          className="px-2 py-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-[8px] font-black uppercase tracking-widest text-white/60 transition-all flex items-center gap-1.5"
                        >
                          <Sparkles className="w-3 h-3" />
                          Format
                        </motion.button>
                        <motion.button 
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={handleSaveEditor}
                          className="px-2 py-1 bg-orange-500/10 hover:bg-orange-500 border border-orange-500/20 rounded-lg text-[8px] font-black uppercase tracking-widest text-orange-500 hover:text-white transition-all flex items-center gap-1.5"
                        >
                          <Check className="w-3 h-3" />
                          Save & Run
                        </motion.button>
                      </div>
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <Editor
                        height="100%"
                        defaultLanguage="html"
                        theme="vs-dark"
                        value={editorValue}
                        onChange={handleEditorChange}
                        onMount={onEditorMount}
                        options={{
                          readOnly: false,
                          minimap: { enabled: false },
                          fontSize: 13,
                          lineNumbers: "on",
                          scrollBeyondLastLine: false,
                          automaticLayout: true,
                          padding: { top: 20, bottom: 20 },
                          wordWrap: "on",
                          folding: true,
                          fontFamily: "'JetBrains Mono', monospace",
                          renderLineHighlight: "all",
                          cursorStyle: "block",
                          smoothScrolling: true,
                          formatOnPaste: true,
                          formatOnType: true,
                          suggestOnTriggerCharacters: true,
                          acceptSuggestionOnEnter: "on",
                          tabSize: 2,
                          insertSpaces: true,
                          quickSuggestions: true,
                          snippetSuggestions: "top",
                        }}
                      />
                    </div>
                  </>
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white/5 italic text-[11px] uppercase tracking-[0.4em] font-black font-display">
                    Source Empty
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.div 
                key="projects"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="w-full h-full p-8 overflow-y-auto scrollbar-custom"
              >
                <div className="max-w-5xl mx-auto">
                  <div className="flex items-center justify-between mb-12">
                    <div>
                      <h2 className="text-3xl font-black tracking-tight font-display">Project Gallery</h2>
                      <p className="text-white/30 text-[11px] uppercase tracking-[0.3em] mt-2">Your synthesized application history</p>
                    </div>
                    <div className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-[10px] font-mono text-orange-500">
                      {snapshots.length} SNAPSHOTS
                    </div>
                  </div>

                  {snapshots.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                      {snapshots.map((snapshot, i) => (
                        <motion.div
                          key={snapshot.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.1 }}
                          whileHover={{ y: -4, scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          className="bg-white/[0.03] border border-white/5 rounded-3xl p-5 flex flex-col gap-4 group cursor-pointer hover:border-orange-500/30 transition-all backdrop-blur-sm"
                          onClick={() => {
                            setGeneratedCode(snapshot.code);
                            setActiveTab("preview");
                            setMobileView("preview");
                          }}
                        >
                          <div className="w-full aspect-video bg-black/40 rounded-2xl border border-white/5 flex items-center justify-center overflow-hidden relative">
                             <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                             <Layout className="w-6 h-6 text-white/10 group-hover:text-orange-500/40 transition-colors" />
                             <div className="absolute top-3 right-3 px-2 py-1 bg-black/60 backdrop-blur-md rounded-lg text-[8px] font-mono text-white/40 border border-white/5">
                                {(snapshot.code.length / 1024).toFixed(1)} KB
                             </div>
                          </div>
                          <div className="space-y-1">
                            <h3 className="font-bold text-[12px] line-clamp-1 group-hover:text-orange-400 transition-colors tracking-tight">{snapshot.prompt}</h3>
                            <div className="flex items-center gap-2">
                               <div className="w-1 h-1 rounded-full bg-orange-500/40" />
                               <p className="text-[9px] text-white/20 uppercase tracking-widest font-black">
                                 {snapshot.timestamp.toLocaleDateString()} • {snapshot.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                               </p>
                            </div>
                          </div>
                          <div className="flex items-center justify-between mt-auto pt-4 border-t border-white/5">
                             <div className="flex gap-2">
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const baseUrl = window.location.origin + window.location.pathname;
                                    const encoded = encodeURIComponent(btoa(snapshot.code));
                                    const link = `${baseUrl}#code=${encoded}`;
                                    navigator.clipboard.writeText(link);
                                    setCopySuccess(true);
                                    setTimeout(() => setCopySuccess(false), 2000);
                                  }}
                                  className="p-2 bg-white/5 rounded-xl hover:bg-blue-500/20 hover:text-blue-400 transition-all border border-white/5"
                                  title="Copy Share Link"
                                >
                                   <Link className="w-3.5 h-3.5" />
                                </button>
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const win = window.open("", "_blank");
                                    if (win) {
                                      win.document.write(snapshot.code);
                                      win.document.close();
                                    }
                                  }}
                                  className="p-2 bg-white/5 rounded-xl hover:bg-green-500/20 hover:text-green-400 transition-all border border-white/5"
                                  title="Open in New Tab"
                                >
                                   <ExternalLink className="w-3.5 h-3.5" />
                                </button>
                             </div>
                             <button 
                               onClick={(e) => {
                                 e.stopPropagation();
                                 setSnapshots(prev => prev.filter(s => s.id !== snapshot.id));
                               }}
                               className="p-2 bg-white/5 rounded-xl hover:bg-red-500/20 hover:text-red-400 transition-all border border-white/5"
                               title="Delete Snapshot"
                             >
                                <Trash2 className="w-3.5 h-3.5" />
                             </button>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-32 text-white/10">
                      <Layers className="w-16 h-16 mb-4 opacity-20" />
                      <p className="text-[11px] font-black uppercase tracking-[0.4em]">No snapshots found</p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Status Bar - Hidden on Mobile */}
        <div className="hidden md:flex h-10 border-t border-white/5 bg-black/50 backdrop-blur-2xl items-center justify-between px-8">
           <div className="flex items-center gap-6 text-[9px] text-white/20 uppercase tracking-[0.3em] font-black font-display">
              <span className="flex items-center gap-2"><Zap className="w-3 h-3 text-orange-500 animate-pulse shadow-[0_0_8px_rgba(249,115,22,0.6)]" /> Mode: Elite Reasoning</span>
              <span className="flex items-center gap-2"><Cpu className="w-3 h-3 text-blue-500" /> Neural Core v4.0 (Pro)</span>
              <span className="flex items-center gap-2"><Terminal className="w-3 h-3 text-green-500" /> Node 20.x</span>
           </div>
           <div className="text-[10px] text-white/10 font-mono font-black tracking-tighter">
              {generatedCode.length > 0 ? `PAYLOAD: ${(generatedCode.length / 1024).toFixed(1)} KB` : "NULL"}
           </div>
        </div>
      </div>

      {/* Mobile Navigation Bar */}
      <div className="md:hidden h-16 border-t border-white/5 bg-[#0a0a0a]/95 backdrop-blur-3xl flex items-center justify-around px-2 sticky bottom-0 z-20">
        <motion.button 
          whileTap={{ scale: 0.9 }}
          onClick={() => setMobileView("chat")}
          className={`flex flex-col items-center gap-1 transition-all ${mobileView === "chat" ? "text-orange-500 scale-110" : "text-white/20"}`}
        >
          <MessageSquare className="w-5 h-5" />
          <span className="text-[8px] font-black uppercase tracking-widest font-display">Chat</span>
        </motion.button>
        <motion.button 
          whileTap={{ scale: 0.9 }}
          onClick={() => { setMobileView("preview"); setActiveTab("preview"); }}
          className={`flex flex-col items-center gap-1 transition-all ${mobileView === "preview" ? "text-orange-400 scale-110" : "text-white/20"}`}
        >
          <Eye className="w-5 h-5" />
          <span className="text-[8px] font-black uppercase tracking-widest font-display">View</span>
        </motion.button>
        <motion.button 
          whileTap={{ scale: 0.9 }}
          onClick={() => { setMobileView("code"); setActiveTab("code"); }}
          className={`flex flex-col items-center gap-1 transition-all ${mobileView === "code" ? "text-orange-400 scale-110" : "text-white/20"}`}
        >
          <Code className="w-5 h-5" />
          <span className="text-[8px] font-black uppercase tracking-widest font-display">Code</span>
        </motion.button>
        <motion.button 
          whileTap={{ scale: 0.9 }}
          onClick={() => { setMobileView("projects"); setActiveTab("projects"); }}
          className={`flex flex-col items-center gap-1 transition-all ${mobileView === "projects" ? "text-orange-500 scale-110" : "text-white/20"}`}
        >
          <Layers className="w-5 h-5" />
          <span className="text-[8px] font-black uppercase tracking-widest font-display">Vault</span>
        </motion.button>
      </div>
      {/* Profile Modal */}
      <AnimatePresence>
        {isProfileModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsProfileModalOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-[#0d0d0d] border border-white/10 rounded-[32px] overflow-hidden shadow-2xl"
            >
              <div className="p-8">
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-xl font-black uppercase tracking-[0.2em] text-white font-display">User Profile</h2>
                  <button onClick={() => setIsProfileModalOpen(false)} className="p-2 hover:bg-white/5 rounded-full transition-colors">
                    <X className="w-5 h-5 text-white/40" />
                  </button>
                </div>

                <div className="flex flex-col items-center space-y-6">
                  <div className="relative group">
                    <div className="w-24 h-24 rounded-full border-2 border-orange-500/30 p-1">
                      <img src={userProfile.avatar} alt="Avatar" className="w-full h-full rounded-full object-cover" />
                    </div>
                    <button 
                      onClick={() => setUserProfile(prev => ({ ...prev, avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${Math.random()}` }))}
                      className="absolute bottom-0 right-0 p-2 bg-orange-500 rounded-full text-white shadow-lg hover:scale-110 transition-transform"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="w-full space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-widest text-white/20 ml-1">Display Name</label>
                      <input 
                        type="text" 
                        value={userProfile.name}
                        onChange={(e) => setUserProfile(prev => ({ ...prev, name: e.target.value }))}
                        className="w-full bg-white/[0.03] border border-white/10 rounded-2xl px-4 py-3 text-sm text-white focus:outline-none focus:border-orange-500/50 transition-all"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-widest text-white/20 ml-1">Bio</label>
                      <textarea 
                        value={userProfile.bio}
                        onChange={(e) => setUserProfile(prev => ({ ...prev, bio: e.target.value }))}
                        className="w-full bg-white/[0.03] border border-white/10 rounded-2xl px-4 py-3 text-sm text-white focus:outline-none focus:border-orange-500/50 transition-all h-24 resize-none"
                      />
                    </div>
                  </div>

                  <button 
                    onClick={() => setIsProfileModalOpen(false)}
                    className="w-full py-4 bg-orange-500 text-white rounded-2xl font-black uppercase tracking-[0.2em] text-xs shadow-lg shadow-orange-500/20 hover:bg-orange-600 transition-all"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
