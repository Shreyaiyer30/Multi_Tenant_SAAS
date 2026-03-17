import { useState, useMemo } from "react";
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Clock, 
  Hash, 
  Calendar as CalendarIcon,
  Sparkles
} from "lucide-react";
import { cn } from "@/lib";

export default function Calendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  
  const monthNames = ["January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const daysInMonth = (month, year) => new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = (month, year) => new Date(year, month, 1).getDay();

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const calendarDays = useMemo(() => {
    const days = [];
    const count = daysInMonth(currentDate.getMonth(), currentDate.getFullYear());
    const startDay = firstDayOfMonth(currentDate.getMonth(), currentDate.getFullYear());
    
    // Previous month buffering
    const prevCount = daysInMonth(currentDate.getMonth() - 1, currentDate.getFullYear());
    for (let i = startDay - 1; i >= 0; i--) {
       days.push({ day: prevCount - i, current: false });
    }
    
    // Current month
    for (let i = 1; i <= count; i++) {
       days.push({ day: i, current: true });
    }
    
    // Next month buffering
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
       days.push({ day: i, current: false });
    }
    
    return days;
  }, [currentDate]);

  return (
    <div className="p-8 space-y-8 page-enter h-full flex flex-col xl:flex-row gap-8">
       {/* Left: Interactive Calendar Grid */}
       <div className="flex-1 flex flex-col min-w-0">
          <div className="flex items-center justify-between mb-8">
             <div className="flex items-center gap-5">
                <div className="w-14 h-14 bg-accent/20 border border-accent/40 rounded-3xl flex items-center justify-center text-accent shadow-2xl animate-pulse">
                   <CalendarIcon size={28} />
                </div>
                <div>
                   <h1 className="text-3xl font-syne font-black text-text tracking-tighter uppercase leading-none">
                      {monthNames[currentDate.getMonth()]} <span className="text-accent">{currentDate.getFullYear()}</span>
                   </h1>
                   <p className="text-[10px] font-black text-muted uppercase tracking-[0.2em] mt-2">Flow Synchronizer / Node Schedule</p>
                </div>
             </div>

             <div className="flex bg-surface2 rounded-2xl border border-border p-1.5 shadow-xl">
                <button 
                  onClick={handlePrevMonth}
                  className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-surface hover:text-accent transition-all text-muted"
                >
                   <ChevronLeft size={20} />
                </button>
                <div className="w-px h-6 bg-border mx-1 self-center" />
                <button 
                  onClick={handleNextMonth}
                  className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-surface hover:text-accent transition-all text-muted"
                >
                   <ChevronRight size={20} />
                </button>
             </div>
          </div>

          <div className="flex-1 rounded-[3rem] border border-border bg-surface/30 backdrop-blur-xl shadow-2xl overflow-hidden flex flex-col">
             <div className="grid grid-cols-7 border-b border-border bg-surface2/40">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                   <div key={day} className="py-4 text-center text-[10px] font-black text-muted uppercase tracking-[0.3em]">{day}</div>
                ))}
             </div>
             <div className="grid grid-cols-7 grid-rows-6 flex-1">
                {calendarDays.map((d, i) => {
                   const isToday = d.current && d.day === new Date().getDate() && currentDate.getMonth() === new Date().getMonth();
                   const hasEvent = d.current && (d.day % 5 === 0);
                   return (
                      <div 
                        key={i} 
                        className={cn(
                          "border-r border-b border-border/40 p-3 group relative transition-all cursor-pointer hover:bg-surface2/50",
                          !d.current ? "opacity-20" : "",
                          (i + 1) % 7 === 0 ? "border-r-0" : ""
                        )}
                      >
                         <span className={cn(
                           "text-xs font-dm-mono font-bold transition-all",
                           isToday ? "w-7 h-7 bg-accent text-background rounded-lg flex items-center justify-center shadow-lg" : "text-text"
                         )}>
                            {d.day}
                         </span>
                         
                         {hasEvent && (
                           <div className="mt-2 space-y-1">
                              <div className="px-1.5 py-0.5 rounded bg-accent2/10 border border-accent2/20 text-[8px] font-black text-accent2 uppercase tracking-tighter truncate group-hover:bg-accent2 group-hover:text-background transition-all">
                                 Flow Initialization
                              </div>
                              <div className="px-1.5 py-0.5 rounded bg-accent5/10 border border-border text-[8px] font-black text-accent5 uppercase tracking-tighter truncate group-hover:bg-accent5 group-hover:text-background transition-all">
                                 Sync Phase
                              </div>
                           </div>
                         )}

                         <button className="absolute bottom-2 right-2 w-6 h-6 rounded-lg bg-surface border border-border flex items-center justify-center text-muted opacity-0 group-hover:opacity-100 hover:text-accent hover:border-accent transition-all">
                            <Plus size={12} />
                         </button>
                      </div>
                   );
                })}
             </div>
          </div>
       </div>

       {/* Right: Selected Flow / Stats */}
       <div className="w-full xl:w-96 space-y-8 shrink-0">
          <div className="surface-glass rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden group">
             <div className="absolute top-0 right-0 w-32 h-32 bg-accent/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 group-hover:scale-150 transition-transform" />
             <div className="relative">
                <h2 className="text-xl font-syne font-black text-text uppercase mb-6 tracking-tight flex items-center gap-3">
                   Upcoming <span className="text-accent underline decoration-2 decoration-accent/40 underline-offset-4">Syncs</span>
                </h2>
                
                <div className="space-y-4">
                   {[
                      { title: 'Database Optimization', time: '14:30', color: 'var(--accent2)', id: 'FL-234' },
                      { title: 'Frontend Refactor', time: '16:00', color: 'var(--accent5)', id: 'FL-892' },
                      { title: 'Core API Patch', time: '09:00', color: 'var(--accent3)', id: 'FL-012' },
                   ].map((item, idx) => (
                      <div key={idx} className="p-5 rounded-2xl bg-surface2 border border-border group/item cursor-pointer hover:border-accent/40 transition-all hover:translate-x-1">
                         <div className="flex items-center justify-between mb-3">
                            <span className="text-[9px] font-black text-muted uppercase tracking-[0.2em]">{item.id}</span>
                            <div className="flex items-center gap-2">
                               <Clock size={10} className="text-muted" />
                               <span className="text-[10px] font-dm-mono text-text font-bold">{item.time}</span>
                            </div>
                         </div>
                         <h4 className="font-syne font-bold text-sm text-text mb-2 group-hover/item:text-accent transition-colors">{item.title}</h4>
                         <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                            <span className="text-[9px] font-black text-muted uppercase tracking-widest">Active Stream</span>
                         </div>
                      </div>
                   ))}
                </div>
             </div>
          </div>

          <div className="surface-glass rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden flex flex-col items-center text-center">
             <div className="w-16 h-16 rounded-3xl bg-accent flex items-center justify-center text-background shadow-[0_0_30px_rgba(0,229,192,0.3)] mb-6">
                <Sparkles size={32} />
             </div>
             <h3 className="text-lg font-syne font-black text-text uppercase tracking-tight mb-2">Initialize Flow</h3>
             <p className="text-[10px] font-bold text-muted uppercase tracking-[0.2em] mb-8 leading-relaxed">
                Add a mission-critical stream to your operational node schedule.
             </p>
             <button className="w-full h-14 bg-accent text-background rounded-2xl font-syne font-bold text-xs tracking-[0.3em] uppercase hover:scale-[1.02] active:scale-95 transition-all shadow-lg flex items-center justify-center gap-3">
                <Plus size={18} />
                Deploy Stream
             </button>
          </div>
       </div>
    </div>
  );
}
