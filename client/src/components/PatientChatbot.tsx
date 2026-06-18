import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Send, Upload, Bot, User, X } from "lucide-react";
import { getClinicBySlug } from "@/constants/clinics";

interface Message {
  id: string;
  type: "user" | "bot";
  content: string;
  image?: string;
  timestamp: Date;
  suggestedClinic?: string;
}

interface PatientChatbotProps {
  onClose?: () => void;
  patientName?: string;
}

const clinicName = (slug: string) => getClinicBySlug(slug)?.nameAr || "";

export default function PatientChatbot({ onClose, patientName = "المريض" }: PatientChatbotProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      type: "bot",
      content: `مرحباً ${patientName}! أنا مساعدك الطبي الذكي. يمكنني مساعدتك في تحديد الحالة الصحية لأسنانك وتوجيهك للعيادة المناسبة. \n\nيمكنك وصف الأعراض التي تعاني منها أو رفع صورة للمنطقة المصابة.`,
      timestamp: new Date(),
    },
  ]);
  const [inputMessage, setInputMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const analyzeSymptoms = (userMessage: string): { clinic: string; response: string } => {
    const lowerMessage = userMessage.toLowerCase();
    
    if (lowerMessage.includes("ألم") || lowerMessage.includes("وجع") || lowerMessage.includes("تسوس")) {
      return {
        clinic: clinicName("conservative-dentistry"),
        response: "بناءً على الأعراض التي ذكرتها، أنصحك بزيارة عيادة العلاج التحفظي. سيقوم الطبيب بفحص الأسنان المصابة وتحديد العلاج المناسب.",
      };
    } else if (lowerMessage.includes("لثة") || lowerMessage.includes("نزيف") || lowerMessage.includes("التهاب اللثة")) {
      return {
        clinic: clinicName("oral-diagnosis-periodontology"),
        response: "أعراضك تشير إلى مشكلة في اللثة. أنصحك بزيارة عيادة التشخيص وعلاج اللثة لفحص الحالة والحصول على العلاج المناسب.",
      };
    } else if (lowerMessage.includes("تقويم") || lowerMessage.includes("اعوجاج") || lowerMessage.includes("ترتيب")) {
      return {
        clinic: clinicName("orthodontics"),
        response: "بناءً على وصفك، يبدو أنك بحاجة لزيارة قسم تقويم الأسنان لتقييم الحالة ووضع خطة علاجية مناسبة.",
      };
    } else if (lowerMessage.includes("زراعة") || lowerMessage.includes("سن مفقود") || lowerMessage.includes("فقدت")) {
      return {
        clinic: clinicName("implant-dentistry"),
        response: "أنصحك بزيارة قسم زراعة الأسنان لتقييم إمكانية الزراعة ووضع خطة العلاج.",
      };
    } else if (lowerMessage.includes("تجميل") || lowerMessage.includes("تبييض") || lowerMessage.includes("ابتسامة")) {
      return {
        clinic: clinicName("cosmetic-dentistry"),
        response: "يمكنك زيارة قسم تجميل الأسنان للحصول على استشارة حول تحسين مظهر أسنانك.",
      };
    } else if (lowerMessage.includes("طفل") || lowerMessage.includes("ابني") || lowerMessage.includes("ابنتي")) {
      return {
        clinic: clinicName("pediatric-special-care-dentistry"),
        response: "أنصحك بزيارة عيادة أسنان الأطفال والاحتياجات الخاصة المتخصصة في علاج ورعاية أسنان الأطفال.",
      };
    } else if (lowerMessage.includes("خلع") || lowerMessage.includes("جراحة") || lowerMessage.includes("ضرس العقل")) {
      return {
        clinic: clinicName("oral-surgery"),
        response: "حالتك تتطلب زيارة عيادة جراحة الفم للتقييم والإجراء الجراحي المناسب.",
      };
    } else if (lowerMessage.includes("أشعة") || lowerMessage.includes("فحص") || lowerMessage.includes("تشخيص")) {
      return {
        clinic: clinicName("oral-diagnosis-periodontology"),
        response: "أنصحك بزيارة عيادة التشخيص وعلاج اللثة للحصول على فحص شامل وتحديد الحالة بدقة.",
      };
    } else if (lowerMessage.includes("تركيبة") || lowerMessage.includes("طقم")) {
      return {
        clinic: clinicName("removable-prosthodontics"),
        response: "يمكنك زيارة قسم التركيبات المتحركة لتقييم حالتك والحصول على تركيبة مناسبة.",
      };
    } else {
      return {
        clinic: clinicName("oral-diagnosis-periodontology"),
        response: "لتحديد حالتك بدقة، أنصحك بزيارة عيادة التشخيص وعلاج اللثة للحصول على فحص شامل أولاً.",
      };
    }
  };

  const handleSendMessage = () => {
    if (!inputMessage.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: "user",
      content: inputMessage,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputMessage("");
    setIsTyping(true);

    setTimeout(() => {
      const { clinic, response } = analyzeSymptoms(inputMessage);
      
      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: "bot",
        content: response,
        suggestedClinic: clinic,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, botMessage]);
      setIsTyping(false);
    }, 1500);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const imageUrl = event.target?.result as string;
      
      const userMessage: Message = {
        id: Date.now().toString(),
        type: "user",
        content: "قمت برفع صورة للفحص",
        image: imageUrl,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, userMessage]);
      setIsTyping(true);

      setTimeout(() => {
        const botMessage: Message = {
          id: (Date.now() + 1).toString(),
          type: "bot",
          content: "شكراً لرفع الصورة. بناءً على الفحص الأولي للصورة، أنصحك بزيارة عيادة التشخيص وعلاج اللثة للحصول على تقييم دقيق من قبل الطبيب المختص. يمكن للطبيب إجراء فحص شامل وتحديد العلاج المناسب.",
          suggestedClinic: clinicName("oral-diagnosis-periodontology"),
          timestamp: new Date(),
        };

        setMessages((prev) => [...prev, botMessage]);
        setIsTyping(false);
      }, 2000);
    };

    reader.readAsDataURL(file);
  };

  return (
    <Card className="flex flex-col h-[600px] max-w-2xl mx-auto" data-testid="card-chatbot">
      <CardHeader className="border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary rounded-full">
              <Bot className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <CardTitle className="text-xl">المساعد الطبي الذكي</CardTitle>
              <CardDescription>تحديد الحالة وتوجيهك للعيادة المناسبة</CardDescription>
            </div>
          </div>
          {onClose && (
            <Button variant="ghost" size="icon" onClick={onClose} data-testid="button-close-chatbot">
              <X className="h-5 w-5" />
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-0">
        <ScrollArea className="flex-1 p-4" ref={scrollRef}>
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 ${message.type === "user" ? "justify-end" : "justify-start"}`}
                data-testid={`message-${message.type}-${message.id}`}
              >
                {message.type === "bot" && (
                  <div className="flex-shrink-0">
                    <div className="p-2 bg-primary/10 rounded-full">
                      <Bot className="w-5 h-5 text-primary" />
                    </div>
                  </div>
                )}

                <div className={`max-w-[80%] ${message.type === "user" ? "order-first" : ""}`}>
                  <Card className={message.type === "user" ? "bg-primary text-primary-foreground" : ""}>
                    <CardContent className="p-3">
                      {message.image && (
                        <img
                          src={message.image}
                          alt="صورة مرفوعة"
                          className="rounded-md mb-2 max-w-full h-auto"
                        />
                      )}
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      {message.suggestedClinic && (
                        <Badge className="mt-2 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
                          العيادة المقترحة: {message.suggestedClinic}
                        </Badge>
                      )}
                      <p className="text-xs opacity-70 mt-1">
                        {message.timestamp.toLocaleTimeString("ar-EG", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {message.type === "user" && (
                  <div className="flex-shrink-0">
                    <div className="p-2 bg-primary rounded-full">
                      <User className="w-5 h-5 text-primary-foreground" />
                    </div>
                  </div>
                )}
              </div>
            ))}

            {isTyping && (
              <div className="flex gap-3 justify-start">
                <div className="flex-shrink-0">
                  <div className="p-2 bg-primary/10 rounded-full">
                    <Bot className="w-5 h-5 text-primary" />
                  </div>
                </div>
                <Card>
                  <CardContent className="p-3">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 bg-primary rounded-full animate-bounce"></span>
                      <span className="w-2 h-2 bg-primary rounded-full animate-bounce delay-100"></span>
                      <span className="w-2 h-2 bg-primary rounded-full animate-bounce delay-200"></span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="border-t p-4">
          <div className="flex gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageUpload}
              data-testid="input-image-upload"
            />
            <Button
              variant="outline"
              size="icon"
              onClick={() => fileInputRef.current?.click()}
              data-testid="button-upload-image"
            >
              <Upload className="h-4 w-4" />
            </Button>
            <Input
              placeholder="اكتب رسالتك هنا..."
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
              data-testid="input-chatbot-message"
            />
            <Button onClick={handleSendMessage} data-testid="button-send-message">
              <Send className="h-4 w-4 ml-2" />
              إرسال
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
