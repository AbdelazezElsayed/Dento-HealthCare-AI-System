import { useState, useRef, useEffect, useCallback } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
    Send,
    Upload,
    Bot,
    User,
    Loader2,
    Sparkles,
    Zap,
    Mic,
    MicOff,
    Volume2,
    VolumeX,
} from "lucide-react";
import { motion } from "framer-motion";

type Message = {
    id: string;
    role: "user" | "bot";
    content: string;
    suggestedClinic?: string | null;
    timestamp: Date;
    image?: string;
};

type ChatbotCoreProps = {
    language?: "ar" | "en";
    patientName?: string;
    quickSymptoms?: Array<{ label: string; emoji: string }>;
    className?: string;
};

// Extend Window interface for WebkitSpeechRecognition
declare global {
    interface Window {
        webkitSpeechRecognition: any;
        SpeechRecognition: any;
    }
}

export default function ChatbotCore({
    language = "ar",
    patientName = "المريض",
    quickSymptoms = [
        { label: "ألم أسنان", emoji: "😣" },
        { label: "تسوس", emoji: "🦷" },
        { label: "تبييض", emoji: "✨" },
        { label: "تقويم", emoji: "📐" },
        { label: "زراعة", emoji: "🌱" },
        { label: "تنظيف", emoji: "🧹" },
    ],
    className = "",
}: ChatbotCoreProps) {
    const [messages, setMessages] = useState<Message[]>([
        {
            id: "1",
            role: "bot",
            content:
                language === "ar"
                    ? `مرحباً ${patientName}! أنا مساعدك الطبي الذكي. كيف يمكنني مساعدتك اليوم؟`
                    : `Hello ${patientName}! I'm your smart medical assistant. How can I help you today?`,
            timestamp: new Date(),
        },
    ]);
    const [inputMessage, setInputMessage] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Voice states
    const [isListening, setIsListening] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const recognitionRef = useRef<any>(null);
    const synthRef = useRef<SpeechSynthesis | null>(null);
    const transcriptRef = useRef<string>(""); // avoids stale closure in onend

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    // Initialize Speech Recognition and Synthesis
    useEffect(() => {
        if ("SpeechRecognition" in window || "webkitSpeechRecognition" in window) {
            const SpeechRecognition =
                window.SpeechRecognition || window.webkitSpeechRecognition;
            recognitionRef.current = new SpeechRecognition();
            recognitionRef.current.continuous = false;
            recognitionRef.current.interimResults = false;
            recognitionRef.current.lang = language === "ar" ? "ar-SA" : "en-US";

            recognitionRef.current.onstart = () => {
                setIsListening(true);
                console.log("Speech recognition started");
            };

            recognitionRef.current.onresult = (event: any) => {
                const transcript = event.results[0][0].transcript;
                transcriptRef.current = transcript;
                setInputMessage(transcript);
            };

            recognitionRef.current.onerror = (event: any) => {
                console.error("Speech recognition error:", event.error);
                setIsListening(false);
                transcriptRef.current = "";
            };

            recognitionRef.current.onend = () => {
                setIsListening(false);
                const final = transcriptRef.current.trim();
                transcriptRef.current = "";
                if (final) {
                    handleSendMessage(final);
                }
            };
        } else {
            console.warn("Speech Recognition API not supported in this browser.");
        }

        if ("speechSynthesis" in window) {
            synthRef.current = window.speechSynthesis;
        } else {
            console.warn("Speech Synthesis API not supported in this browser.");
        }

        return () => {
            if (recognitionRef.current) {
                recognitionRef.current.stop();
            }
            if (synthRef.current) {
                synthRef.current.cancel();
            }
        };
    }, [language]); // Only re-init when language changes; transcript is tracked via ref

    const speakMessage = useCallback(
        (content: string) => {
            if (isMuted || !synthRef.current || !content) return;

            synthRef.current.cancel();

            const utterance = new SpeechSynthesisUtterance(content);
            utterance.lang = language === "ar" ? "ar-SA" : "en-US";

            // Improved voice selection — tries multiple Arabic locales
            const voices = synthRef.current.getVoices();
            let selectedVoice: SpeechSynthesisVoice | undefined;
            if (language === "ar") {
                const arLocales = ["ar-SA", "ar-EG", "ar-001"];
                // First try Google voices
                selectedVoice = arLocales
                    .map(loc => voices.find(v => v.lang === loc && v.name.toLowerCase().includes("google")))
                    .find(Boolean);
                // Then any voice for those locales
                if (!selectedVoice) {
                    selectedVoice = arLocales
                        .map(loc => voices.find(v => v.lang === loc))
                        .find(Boolean);
                }
                // Fallback: any Arabic voice
                if (!selectedVoice) {
                    selectedVoice = voices.find(v => v.lang.startsWith("ar"));
                }
            } else {
                selectedVoice =
                    voices.find(v => v.lang === "en-US" && v.name.toLowerCase().includes("google")) ??
                    voices.find(v => v.lang === "en-US") ??
                    voices.find(v => v.lang.startsWith("en"));
            }
            if (selectedVoice) utterance.voice = selectedVoice;

            utterance.onstart = () => setIsSpeaking(true);
            utterance.onend = () => setIsSpeaking(false);
            utterance.onerror = () => setIsSpeaking(false);

            synthRef.current.speak(utterance);
        },
        [language, isMuted]
    );

    const handleListen = () => {
        if (!recognitionRef.current) {
            alert(
                language === "ar"
                    ? "عذراً، ميزة التعرف على الكلام غير مدعومة في متصفحك."
                    : "Sorry, speech recognition is not supported in your browser."
            );
            return;
        }

        // ── Fix: always stop TTS before activating mic ──
        if (synthRef.current) {
            synthRef.current.cancel();
            setIsSpeaking(false);
        }

        if (isListening) {
            recognitionRef.current.stop();
        } else {
            setInputMessage("");
            recognitionRef.current.start();
        }
    };

    const handleSendMessage = async (messageText?: string) => {
        const textToSend = messageText || inputMessage;
        if (!textToSend.trim() && !fileInputRef.current?.files?.[0]) return;

        const userMessage: Message = {
            id: Date.now().toString(),
            role: "user",
            content: textToSend,
            timestamp: new Date(),
        };

        setMessages((prev) => [...prev, userMessage]);
        setInputMessage("");
        setIsLoading(true);

        try {
            // Prepare conversation history (last 10 messages)
            const history = messages.slice(-10).map((msg) => ({
                role: msg.role,
                content: msg.content,
            }));

            const response = await fetch("/api/ai/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({
                    message: textToSend,
                    conversationHistory: history,
                    language,
                    image: null,
                }),
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error("API Error Response:", errorText);
                console.error("Status:", response.status, response.statusText);
                throw new Error(`Failed to get response from AI: ${response.status} ${errorText}`);
            }

            const data = await response.json();

            const botMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: "bot",
                content: data.message,
                suggestedClinic: data.suggestedClinic,
                timestamp: new Date(),
            };

            setMessages((prev) => [...prev, botMessage]);
            speakMessage(data.message); // Speak the bot's response
        } catch (error) {
            console.error("Chat error (full):", error);
            const errorMessageContent =
                language === "ar"
                    ? `عذراً، حدث خطأ. يرجى المحاولة مرة أخرى.\n\nتفاصيل الخطأ: ${error instanceof Error ? error.message : String(error)}`
                    : `Sorry, an error occurred. Please try again.\n\nError details: ${error instanceof Error ? error.message : String(error)}`;
            const errorMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: "bot",
                content: errorMessageContent,
                timestamp: new Date(),
            };
            setMessages((prev) => [...prev, errorMessage]);
            speakMessage(errorMessageContent); // Speak the error message
        } finally {
            setIsLoading(false);
        }
    };

    const handleQuickSymptom = (symptom: string) => {
        setInputMessage(symptom);
        setTimeout(() => handleSendMessage(symptom), 0);
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            const imageData = event.target?.result as string;

            const userMessage: Message = {
                id: Date.now().toString(),
                role: "user",
                content:
                    language === "ar"
                        ? "قمت برفع صورة للفحص"
                        : "I uploaded an image for examination",
                image: imageData,
                timestamp: new Date(),
            };

            setMessages((prev) => [...prev, userMessage]);
            setIsLoading(true);

            try {
                const history = messages.slice(-10).map((msg) => ({
                    role: msg.role,
                    content: msg.content,
                }));

                const response = await fetch("/api/ai/chat", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    credentials: "include",
                    body: JSON.stringify({
                        message:
                            language === "ar"
                                ? "يرجى تحليل هذه الصورة"
                                : "Please analyze this image",
                        conversationHistory: history,
                        language,
                        image: imageData,
                    }),
                });

                if (!response.ok) {
                    throw new Error("Failed to analyze image");
                }

                const data = await response.json();

                const botMessage: Message = {
                    id: (Date.now() + 1).toString(),
                    role: "bot",
                    content: data.message,
                    suggestedClinic: data.suggestedClinic,
                    timestamp: new Date(),
                };

                setMessages((prev) => [...prev, botMessage]);
                speakMessage(data.message); // Speak the bot's response
            } catch (error) {
                console.error("Image analysis error:", error);
                const errorMessageContent =
                    language === "ar"
                        ? "عذراً، حدث خطأ في تحليل الصورة."
                        : "Sorry, an error occurred while analyzing the image.";
                const errorMessage: Message = {
                    id: (Date.now() + 1).toString(),
                    role: "bot",
                    content: errorMessageContent,
                    timestamp: new Date(),
                };
                setMessages((prev) => [...prev, errorMessage]);
                speakMessage(errorMessageContent); // Speak the error message
            } finally {
                setIsLoading(false);
            }
        };

        reader.readAsDataURL(file);
    };

    return (
        <div className={`flex flex-col h-full ${className}`}>
            <ScrollArea className="flex-1 p-6" ref={scrollRef}>
                <div className="space-y-6 max-w-4xl mx-auto">
                    {messages.map((message, index) => (
                        <motion.div
                            key={message.id}
                            initial={{ opacity: 0, y: 20, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            transition={{ duration: 0.3, delay: index * 0.05 }}
                            className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}
                        >
                            {message.role === "bot" && (
                                <motion.div
                                    className="flex-shrink-0 relative"
                                    whileHover={{ scale: 1.1, rotate: 5 }}
                                    transition={{ duration: 0.2 }}
                                >
                                    <div className="p-3 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full shadow-lg">
                                        <Bot className="w-5 h-5 text-white" />
                                    </div>
                                    {isSpeaking && (
                                        <motion.div
                                            className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full flex items-center justify-center"
                                            animate={{ scale: [1, 1.2, 1] }}
                                            transition={{ duration: 0.8, repeat: Infinity }}
                                        >
                                            <span className="sr-only">Bot is speaking</span>
                                        </motion.div>
                                    )}
                                </motion.div>
                            )}

                            <div className={`max-w-[75%] ${message.role === "user" ? "order-first" : ""}`}>
                                <motion.div
                                    whileHover={{ scale: 1.02 }}
                                    className={`rounded-2xl p-4 shadow-md ${message.role === "user"
                                        ? "bg-gradient-to-br from-emerald-500 to-teal-600 text-white"
                                        : "bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 border border-slate-200 dark:border-slate-700"
                                        }`}
                                >
                                    {message.image && (
                                        <motion.img
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            src={message.image}
                                            alt="Uploaded"
                                            className="rounded-xl mb-3 max-w-full shadow-md"
                                        />
                                    )}
                                    <p className={`text-base leading-relaxed whitespace-pre-wrap ${message.role === "user" ? "text-white" : "text-slate-800 dark:text-slate-100"
                                        }`}>
                                        {message.content}
                                    </p>
                                    {message.suggestedClinic && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: 0.2 }}
                                        >
                                            <Badge className="mt-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white border-0 shadow-md px-3 py-1">
                                                {language === "ar" ? "🏥 العيادة المقترحة: " : "🏥 Suggested Clinic: "}
                                                {message.suggestedClinic}
                                            </Badge>
                                        </motion.div>
                                    )}
                                </motion.div>
                                <p className={`text-xs text-slate-500 dark:text-slate-400 mt-2 px-2 ${message.role === "user" ? "text-right" : "text-left"
                                    }`}>
                                    {message.timestamp.toLocaleTimeString(
                                        language === "ar" ? "ar-EG" : "en-US",
                                        { hour: "2-digit", minute: "2-digit" }
                                    )}
                                </p>
                            </div>

                            {message.role === "user" && (
                                <motion.div
                                    className="flex-shrink-0"
                                    whileHover={{ scale: 1.1, rotate: -5 }}
                                    transition={{ duration: 0.2 }}
                                >
                                    <div className="p-3 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full shadow-lg">
                                        <User className="w-5 h-5 text-white" />
                                    </div>
                                </motion.div>
                            )}
                        </motion.div>
                    ))}

                    {isLoading && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex gap-3 justify-start"
                        >
                            <div className="flex-shrink-0">
                                <div className="p-3 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full shadow-lg">
                                    <Bot className="w-5 h-5 text-white" />
                                </div>
                            </div>
                            <div className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 shadow-md">
                                <div className="flex gap-1.5">
                                    <motion.span
                                        className="w-2.5 h-2.5 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full"
                                        animate={{ y: [0, -8, 0] }}
                                        transition={{ duration: 0.6, repeat: Infinity, ease: "easeInOut" }}
                                    />
                                    <motion.span
                                        className="w-2.5 h-2.5 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full"
                                        animate={{ y: [0, -8, 0] }}
                                        transition={{ duration: 0.6, repeat: Infinity, ease: "easeInOut", delay: 0.2 }}
                                    />
                                    <motion.span
                                        className="w-2.5 h-2.5 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full"
                                        animate={{ y: [0, -8, 0] }}
                                        transition={{ duration: 0.6, repeat: Infinity, ease: "easeInOut", delay: 0.4 }}
                                    />
                                </div>
                            </div>
                        </motion.div>
                    )}
                </div>
            </ScrollArea>

            {/* Quick Symptoms - Modern Pills */}
            {messages.length === 1 && quickSymptoms.length > 0 && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="px-6 py-4 border-t bg-gradient-to-r from-slate-50 to-blue-50 dark:from-slate-900 dark:to-blue-950"
                >
                    <div className="max-w-4xl mx-auto">
                        <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-3 flex items-center gap-2">
                            <Sparkles className="w-4 h-4" />
                            {language === "ar" ? "اختصارات سريعة:" : "Quick Replies:"}
                        </p>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            {quickSymptoms.map((symptom, idx) => (
                                <motion.div
                                    key={idx}
                                    initial={{ opacity: 0, scale: 0.8, y: 20 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    transition={{ delay: 0.4 + idx * 0.1, duration: 0.3 }}
                                    whileHover={{ scale: 1.05, y: -2 }}
                                    whileTap={{ scale: 0.95 }}
                                >
                                    <Button
                                        size="lg"
                                        variant="outline"
                                        onClick={() => handleQuickSymptom(symptom.label)}
                                        className="w-full h-auto py-3 px-4 rounded-full border-2 bg-white dark:bg-slate-800 hover:bg-gradient-to-r hover:from-blue-500 hover:to-cyan-500 hover:text-white hover:border-transparent transition-all duration-300 shadow-sm hover:shadow-md group"
                                        data-testid={`button-quick-symptom-${idx}`}
                                    >
                                        <span className="text-2xl mr-2 group-hover:scale-110 transition-transform">{symptom.emoji}</span>
                                        <span className="font-medium">{symptom.label}</span>
                                    </Button>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </motion.div>
            )}

            {/* Input Area - Modern Design */}
            <div className="border-t bg-white dark:bg-slate-900 p-6 shadow-lg">
                <div className="max-w-4xl mx-auto">
                    <div className="flex gap-3 items-end">
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleImageUpload}
                            data-testid="input-image-upload"
                        />
                        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                            <Button
                                variant="outline"
                                size="icon"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={isLoading || isListening}
                                data-testid="button-upload-image"
                                className="h-12 w-12 rounded-full border-2 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 hover:from-purple-500 hover:to-pink-500 hover:text-white transition-all duration-300 shadow-md hover:shadow-lg"
                            >
                                <Upload className="h-5 w-5" />
                            </Button>
                        </motion.div>

                        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                            <Button
                                variant="outline"
                                size="icon"
                                onClick={() => setIsMuted(!isMuted)}
                                disabled={isLoading || isListening}
                                data-testid="button-toggle-mute"
                                className="h-12 w-12 rounded-full border-2 bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 hover:from-yellow-500 hover:to-orange-500 hover:text-white transition-all duration-300 shadow-md hover:shadow-lg"
                            >
                                {isMuted ? (
                                    <VolumeX className="h-5 w-5" />
                                ) : (
                                    <Volume2 className="h-5 w-5" />
                                )}
                            </Button>
                        </motion.div>

                        <div className="flex-1 relative">
                            <Input
                                placeholder={language === "ar" ? "اكتب رسالتك..." : "Type your message..."}
                                value={inputMessage}
                                onChange={(e) => setInputMessage(e.target.value)}
                                onKeyPress={(e) => e.key === "Enter" && !isLoading && !isListening && handleSendMessage()}
                                disabled={isLoading || isListening}
                                data-testid="input-chatbot-message"
                                className="h-14 px-6 text-base rounded-2xl border-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800 shadow-sm transition-all duration-300"
                            />
                        </div>

                        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                            <Button
                                onClick={handleListen}
                                disabled={isLoading}
                                size="icon"
                                data-testid="button-toggle-mic"
                                className={`h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed ${isListening
                                    ? "bg-red-500 hover:bg-red-600 text-white animate-pulse"
                                    : "bg-gradient-to-r from-green-500 to-lime-500 hover:from-green-600 hover:to-lime-600 text-white"
                                    }`}
                            >
                                {isListening ? (
                                    <MicOff className="h-6 w-6" />
                                ) : (
                                    <Mic className="h-6 w-6" />
                                )}
                            </Button>
                        </motion.div>

                        <motion.div
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                        >
                            <Button
                                onClick={() => handleSendMessage()}
                                disabled={isLoading || !inputMessage.trim() || isListening}
                                size="icon"
                                data-testid="button-send-message"
                                className="h-14 w-14 rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isLoading ? (
                                    <Loader2 className="h-6 w-6 animate-spin" />
                                ) : (
                                    <Send className="h-6 w-6" />
                                )}
                            </Button>
                        </motion.div>
                    </div>
                    <p className="text-xs text-center text-slate-500 dark:text-slate-400 mt-3 flex items-center justify-center gap-1">
                        <Zap className="w-3 h-3" />
                        {language === "ar" ? "مدعوم بالذكاء الاصطناعي" : "Powered by AI"}
                    </p>
                </div>
            </div>
        </div>
    );
}
