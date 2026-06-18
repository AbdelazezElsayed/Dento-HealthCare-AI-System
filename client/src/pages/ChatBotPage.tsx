import { Card } from "@/components/ui/card";
import { Clock, AlertCircle, User, Wand2, Sparkles, Mic } from "lucide-react";
import ChatbotCore from "@/components/ChatbotCore";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";

export default function ChatBotPage() {
  const { user } = useAuth();
  const [, navigate] = useLocation();

  // Get user's full name or email as fallback
  const userName = user?.fullName || user?.email?.split('@')[0] || "المريض";

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-blue-50 via-cyan-50 to-slate-50 dark:from-slate-950 dark:via-blue-950 dark:to-slate-900">
      {/* Header - Enhanced */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="bg-gradient-to-r from-blue-600 via-cyan-600 to-blue-700 dark:from-blue-700 dark:via-cyan-700 dark:to-blue-800 text-white p-8 shadow-2xl relative overflow-hidden"
      >
        {/* Animated background pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-64 h-64 bg-white rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
          <div className="absolute bottom-0 right-0 w-64 h-64 bg-white rounded-full blur-3xl translate-x-1/2 translate-y-1/2"></div>
        </div>

        <div className="max-w-4xl mx-auto relative z-10">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-4">
              <motion.div
                className="bg-white/20 p-3 rounded-2xl backdrop-blur-sm shadow-lg"
                animate={{ rotate: [0, 5, -5, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              >
                <Wand2 className="w-8 h-8" />
              </motion.div>
              <h1 className="text-4xl font-bold flex items-center gap-3">
                <Sparkles className="w-8 h-8 animate-pulse" />
                Dento - مساعدك الطبي الذكي
              </h1>
            </div>

            {/* Voice Mode Button */}
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button
                onClick={() => navigate("/voice-chat")}
                className="flex items-center gap-2 bg-white/20 hover:bg-white/30 border border-white/40 text-white rounded-2xl px-4 py-2 backdrop-blur-sm shadow-lg transition-all duration-300"
                variant="ghost"
              >
                <Mic className="w-5 h-5" />
                <span className="font-medium text-sm">وضع الصوت</span>
              </Button>
            </motion.div>
          </div>
          <p className="text-blue-100 text-lg">
            متاح 24/7 للإجابة عن جميع أسئلتك بذكاء وسرعة ✨
          </p>
        </div>
      </motion.div>


      {/* Main Chat Area */}
      <div className="flex-1 overflow-hidden flex flex-col">
        <Card className="flex-1 m-6 flex flex-col overflow-hidden shadow-2xl border-2">
          <ChatbotCore language="ar" patientName={userName} className="flex-1" />
        </Card>
      </div>

      {/* Info Bar - Enhanced */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 border-t-2 border-blue-200 dark:border-blue-800 px-6 py-4 backdrop-blur-sm"
      >
        <div className="max-w-4xl mx-auto flex flex-wrap gap-6 justify-center text-sm">
          <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 px-4 py-2 rounded-full shadow-sm">
            <Clock className="w-4 h-4 text-blue-600" />
            <span className="font-medium">الخدمة متاحة 24 ساعة</span>
          </div>
          <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 px-4 py-2 rounded-full shadow-sm">
            <AlertCircle className="w-4 h-4 text-blue-600" />
            <span className="font-medium">للحالات الطارئة: 101</span>
          </div>
          <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 px-4 py-2 rounded-full shadow-sm">
            <User className="w-4 h-4 text-blue-600" />
            <span className="font-medium">فريق الدعم جاهز</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
