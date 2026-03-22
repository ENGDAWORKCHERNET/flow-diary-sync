import { useState, useRef, useEffect } from 'react';
import { Send, MessageSquare, X, Bot } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface AIAssistantProps {
  onCommand: (command: string, arg?: string) => void;
}

export default function AIAssistant({ onCommand }: AIAssistantProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: "Hi! I'm your StudyFlow assistant. How can I help you today?" }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, { role: 'user', content: userMsg }].map(m => ({
            role: m.role,
            content: m.content
          }))
        })
      });

      const data = await response.json();
      
      if (!response.ok) {
        setMessages(prev => [...prev, { role: 'assistant', content: `AI Error: ${data.error?.message || data.error || 'Unknown error'}` }]);
        setIsLoading(false);
        return;
      }

      const assistantMsg = data.choices?.[0]?.message?.content || "Sorry, I couldn't process that.";
      
      setMessages(prev => [...prev, { role: 'assistant', content: assistantMsg }]);

      // Simple command parsing
      if (assistantMsg.includes('[add_task:')) {
        const match = assistantMsg.match(/\[add_task:\s*(.*?)\]/);
        if (match) onCommand('add_task', match[1]);
      } else if (assistantMsg.includes('[complete_task:')) {
        const match = assistantMsg.match(/\[complete_task:\s*(.*?)\]/);
        if (match) onCommand('complete_task', match[1]);
      } else if (assistantMsg.includes('[show_tasks]')) {
        onCommand('show_tasks');
      }

    } catch (error) {
      setMessages(prev => [...prev, { role: 'assistant', content: "Error connecting to AI. Please try again later." }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-24 left-5 z-50 w-14 h-14 rounded-2xl bg-accent text-accent-foreground shadow-xl flex items-center justify-center hover:scale-105 active:scale-95 transition-transform"
      >
        <MessageSquare className="w-6 h-6" />
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center p-4 bg-background/80 backdrop-blur-sm sm:items-center">
          <div className="w-full max-w-lg glass-card rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh] animate-in fade-in slide-in-from-bottom-4 duration-300">
            {/* Header */}
            <div className="p-4 border-b border-border/50 flex items-center justify-between bg-secondary/30">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                  <Bot className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="text-sm font-bold font-display">StudyFlow AI</h3>
                  <div className="flex items-center gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Online</span>
                  </div>
                </div>
              </div>
              <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-secondary rounded-xl transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 p-4 overflow-y-auto" ref={scrollRef}>
              <div className="space-y-4">
                {messages.map((m, i) => (
                  <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] p-3 rounded-2xl text-sm ${
                      m.role === 'user' 
                        ? 'bg-primary text-primary-foreground rounded-tr-none' 
                        : 'bg-secondary text-secondary-foreground rounded-tl-none border border-border/50'
                    }`}>
                      {m.content.replace(/\[.*?\]/g, '').trim()}
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-secondary text-secondary-foreground p-3 rounded-2xl rounded-tl-none border border-border/50 flex gap-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 animate-bounce" />
                      <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 animate-bounce delay-100" />
                      <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 animate-bounce delay-200" />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Input */}
            <div className="p-4 border-t border-border/50 bg-secondary/10">
              <form 
                onSubmit={(e) => { e.preventDefault(); handleSend(); }}
                className="flex gap-2"
              >
                <Input 
                  placeholder="Ask anything..." 
                  value={input} 
                  onChange={(e) => setInput(e.target.value)}
                  className="rounded-xl bg-background/50 border-border/50"
                  disabled={isLoading}
                />
                <Button 
                  type="submit" 
                  size="icon" 
                  disabled={isLoading || !input.trim()}
                  className="rounded-xl shrink-0"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
