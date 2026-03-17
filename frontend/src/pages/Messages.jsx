import { useState, useRef, useEffect } from "react";
import { 
  Search, 
  Send, 
  MoreVertical, 
  Phone, 
  Video, 
  Hash, 
  User, 
  Sparkles,
  Paperclip,
  Smile,
  CheckCheck
} from "lucide-react";
import { cn } from "@/lib";
import { useAuth } from "@/context/AuthContext";

const DUMMY_CHATS = [
  { id: 1, name: "Arjun Iyer", sub: "Backend implementation is...", time: "2m", unread: 2, status: 'online' },
  { id: 2, name: "Nebula Stream", sub: "New task assigned to node...", time: "1h", unread: 0, status: 'offline' },
  { id: 3, name: "Sarah Chen", sub: "The Q3 reports are ready...", time: "4h", unread: 0, status: 'online' },
  { id: 4, name: "Deployment Sync", sub: "Staging node synchronized...", time: "1d", unread: 0, status: 'busy' },
];

const DUMMY_MESSAGES = [
  { id: 1, sender: "Arjun Iyer", text: "Hey! The backend endpoints for the task migration are now live.", time: "10:30 AM", isMe: false },
  { id: 2, sender: "Me", text: "Great! I'm starting the integration with the new FlowAnalyzer component.", time: "10:32 AM", isMe: true },
  { id: 3, sender: "Arjun Iyer", text: "Perfect. Let me know if you encounter any parity issues with the current schema.", time: "10:33 AM", isMe: false },
  { id: 4, sender: "Me", text: "Will do. Initial tests look promising. Parallelizing the stream now.", time: "10:35 AM", isMe: true },
];

export default function Messages() {
  const { user } = useAuth();
  const [activeChat, setActiveChat] = useState(DUMMY_CHATS[0]);
  const [messages, setMessages] = useState(DUMMY_MESSAGES);
  const [input, setInput] = useState("");
  const scrollRef = useRef();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = () => {
    if (!input.trim()) return;
    const newMsg = {
      id: Date.now(),
      sender: "Me",
      text: input,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isMe: true
    };
    setMessages(prev => [...prev, newMsg]);
    setInput("");
  };

  return (
    <div className="p-8 space-y-8 page-enter h-[calc(100vh-72px)] overflow-hidden flex flex-col xl:flex-row gap-8">
       {/* Left: Chat List */}
       <div className="w-full xl:w-96 flex flex-col min-h-0">
          <div className="mb-8 px-4 flex items-center justify-between">
             <div>
                <h1 className="text-3xl font-syne font-black text-text tracking-tighter uppercase leading-none">
                   Streams
                </h1>
                <p className="text-[10px] font-black text-muted uppercase tracking-[0.2em] mt-2">Active Network Links</p>
             </div>
             <div className="w-12 h-12 bg-accent/20 border border-accent/40 rounded-2xl flex items-center justify-center text-accent shadow-2xl animate-pulse">
                <Hash size={24} />
             </div>
          </div>

          <div className="relative mb-6">
             <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" size={16} />
             <input 
               placeholder="Search nodes..."
               className="w-full h-12 bg-surface2/50 rounded-xl border border-border pl-12 pr-4 text-sm font-dm-mono uppercase tracking-widest focus:border-accent focus:outline-none transition-all"
             />
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-2">
             {DUMMY_CHATS.map(chat => (
                <button
                  key={chat.id}
                  onClick={() => setActiveChat(chat)}
                  className={cn(
                    "w-full p-4 rounded-2xl border transition-all flex items-center gap-4 group",
                    activeChat.id === chat.id 
                      ? "bg-accent/10 border-accent/40 text-accent shadow-lg" 
                      : "bg-surface/30 border-transparent text-muted hover:bg-surface2 hover:text-text"
                  )}
                >
                   <div className="relative">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-accent2 to-accent5 flex items-center justify-center text-white font-bold text-sm shadow-md">
                         {chat.name[0]}
                      </div>
                      <div className={cn(
                        "absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-background shadow-sm",
                        chat.status === 'online' ? "bg-accent" : chat.status === 'busy' ? "bg-accent3" : "bg-muted"
                      )} />
                   </div>
                   <div className="flex-1 min-w-0 text-left">
                      <div className="flex items-center justify-between mb-1">
                         <span className="font-syne font-bold text-sm truncate pr-2 group-hover:text-accent transition-colors">{chat.name}</span>
                         <span className="text-[9px] font-dm-mono opacity-40">{chat.time}</span>
                      </div>
                      <p className="text-[11px] truncate opacity-60 leading-tight">{chat.sub}</p>
                   </div>
                   {chat.unread > 0 && (
                      <div className="w-5 h-5 rounded-lg bg-accent text-background flex items-center justify-center text-[9px] font-black">
                         {chat.unread}
                      </div>
                   )}
                </button>
             ))}
          </div>
       </div>

       {/* Right: Message Window */}
       <div className="flex-1 flex flex-col min-w-0">
          <div className="surface-glass rounded-[3rem] shadow-2xl border border-border flex flex-col h-full relative overflow-hidden">
             {/* Chat Header */}
             <div className="p-6 border-b shrink-0 flex items-center justify-between" style={{ borderColor: 'var(--border)' }}>
                <div className="flex items-center gap-4">
                   <div className="w-12 h-12 rounded-2xl bg-surface2 border border-border flex items-center justify-center text-accent">
                      <User size={24} />
                   </div>
                   <div>
                      <h2 className="text-xl font-syne font-bold text-text tracking-tight uppercase leading-none">{activeChat.name}</h2>
                      <div className="flex items-center gap-2 mt-1.5">
                         <div className={cn("w-1.5 h-1.5 rounded-full", activeChat.status === 'online' ? 'bg-accent animate-pulse' : 'bg-muted')} />
                         <span className="text-[10px] font-black text-muted uppercase tracking-widest">Active Connection</span>
                      </div>
                   </div>
                </div>
                
                <div className="flex items-center gap-2">
                   <button className="w-10 h-10 flex items-center justify-center rounded-xl bg-surface2 text-muted hover:text-accent transition-all border border-border">
                      <Phone size={18} />
                   </button>
                   <button className="w-10 h-10 flex items-center justify-center rounded-xl bg-surface2 text-muted hover:text-accent transition-all border border-border">
                      <Video size={18} />
                   </button>
                   <button className="w-10 h-10 flex items-center justify-center rounded-xl bg-surface2 text-muted hover:text-accent transition-all border border-border">
                      <MoreVertical size={18} />
                   </button>
                </div>
             </div>

             {/* Messages Area */}
             <div 
               ref={scrollRef}
               className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar bg-surface/10"
             >
                {messages.map((m, i) => (
                   <div key={m.id} className={cn(
                     "flex w-full animate-fade-up",
                     m.isMe ? "justify-end" : "justify-start"
                   )} style={{ animationDelay: `${i * 0.05}s` }}>
                      <div className={cn(
                        "max-w-[70%] space-y-1.5",
                        m.isMe ? "items-end" : "items-start"
                      )}>
                         <div className={cn(
                           "p-4 rounded-2xl text-sm leading-relaxed shadow-lg border",
                           m.isMe 
                            ? "bg-accent/10 border-accent/20 rounded-tr-none text-text" 
                            : "bg-surface2 border-border rounded-tl-none text-text"
                         )}>
                            {m.text}
                         </div>
                         <div className={cn("flex items-center gap-2 px-1 opacity-40")}>
                            <span className="text-[9px] font-dm-mono font-bold uppercase tracking-widest">{m.time}</span>
                            {m.isMe && <CheckCheck size={12} className="text-accent" />}
                         </div>
                      </div>
                   </div>
                ))}
             </div>

             {/* Input Area */}
             <div className="p-8 border-t bg-surface/40 backdrop-blur-md shrink-0" style={{ borderColor: 'var(--border)' }}>
                <div className="flex items-center gap-4 relative">
                   <div className="flex items-center gap-2 absolute left-4 top-1/2 -translate-y-1/2 text-muted z-10">
                      <button className="hover:text-accent transition-all p-1"><Paperclip size={18} /></button>
                      <button className="hover:text-accent transition-all p-1"><Smile size={18} /></button>
                   </div>
                   <input 
                      value={input}
                      onChange={e => setInput(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleSend()}
                      placeholder="Type a message to synchronize..."
                      className="w-full h-14 bg-surface2 rounded-[2rem] border border-border pl-24 pr-16 text-sm text-text focus:border-accent focus:outline-none transition-all shadow-inner"
                   />
                   <button 
                      onClick={handleSend}
                      disabled={!input.trim()}
                      className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-accent text-background rounded-2xl flex items-center justify-center hover:scale-[1.1] active:scale-90 transition-all shadow-lg disabled:opacity-30 disabled:scale-100"
                   >
                      <Send size={18} />
                   </button>
                </div>
                
                <div className="flex items-center gap-3 mt-4 justify-center">
                   <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
                   <span className="text-[9px] font-black text-accent uppercase tracking-widest">Quantum Stream Secure</span>
                   <div className="w-1 h-1 rounded-full bg-border" />
                   <Sparkles size={10} className="text-muted" />
                </div>
             </div>
          </div>
       </div>
    </div>
  );
}
