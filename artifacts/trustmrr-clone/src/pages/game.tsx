import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { mockStartups, Startup } from '@/lib/mockData';
import { formatCurrency } from '@/lib/utils';
import { RefreshCw } from 'lucide-react';

export default function Game() {
  const [isMounted, setIsMounted] = useState(false);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [pair, setPair] = useState<[Startup, Startup] | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);

  const getNewPair = () => {
    const shuffled = [...mockStartups].sort(() => 0.5 - Math.random());
    // Ensure they don't have the exact same MRR
    let a = shuffled[0];
    let b = shuffled.find(s => s.revenue !== a.revenue) || shuffled[1];
    setPair([a, b]);
    setRevealed(false);
    setIsCorrect(null);
  };

  useEffect(() => {
    setIsMounted(true);
    getNewPair();
    const savedHighScore = localStorage.getItem('trustmrr_highscore');
    if (savedHighScore) setHighScore(parseInt(savedHighScore, 10));
  }, []);

  const handleGuess = (index: 0 | 1) => {
    if (revealed || !pair) return;
    
    const chosen = pair[index];
    const other = pair[index === 0 ? 1 : 0];
    
    const correct = chosen.revenue > other.revenue;
    setIsCorrect(correct);
    setRevealed(true);
    
    if (correct) {
      const newScore = score + 1;
      setScore(newScore);
      if (newScore > highScore) {
        setHighScore(newScore);
        localStorage.setItem('trustmrr_highscore', newScore.toString());
      }
    } else {
      setScore(0);
    }
  };

  if (!isMounted || !pair) return <div className="min-h-[500px]" />;

  return (
    <div className="max-w-4xl mx-auto flex flex-col items-center text-center gap-8 py-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">$1 vs $1,000,000</h1>
        <p className="text-muted-foreground">Which startup has the higher MRR? Test your intuition.</p>
      </div>

      <div className="flex gap-8 items-center font-bold text-lg">
        <div className="startup-card px-6 py-2 bg-white">Score: {score}</div>
        <div className="startup-card px-6 py-2 bg-muted/20">High Score: {highScore}</div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full relative mt-4">
        
        {/* VS Badge */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 w-12 h-12 bg-black text-white rounded-full flex items-center justify-center font-bold shadow-xl border-4 border-background hidden md:flex">
          VS
        </div>

        {pair.map((startup, index) => (
          <motion.div
            key={`${startup.slug}-${index}`}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`startup-card p-8 flex flex-col items-center cursor-pointer transition-all duration-300 ${
              revealed 
                ? (startup.revenue === Math.max(pair[0].revenue, pair[1].revenue) ? 'border-green-500 shadow-lg bg-[#E6FFE8]' : 'opacity-50')
                : 'hover:-translate-y-1 hover:shadow-xl'
            }`}
            onClick={() => handleGuess(index as 0 | 1)}
          >
            <div 
              className="w-24 h-24 rounded-2xl flex items-center justify-center font-bold text-4xl shadow-sm border border-black/5 mb-6"
              style={{ backgroundColor: startup.logoColor, color: 'rgba(0,0,0,0.7)' }}
            >
              {startup.name.charAt(0)}
            </div>
            
            <h2 className="text-2xl font-bold mb-2">{startup.name}</h2>
            <p className="text-muted-foreground mb-8 line-clamp-2">{startup.description}</p>

            <div className="mt-auto w-full">
              <AnimatePresence mode="wait">
                {revealed ? (
                  <motion.div
                    key="revealed"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-4xl font-bold tracking-tight text-center"
                  >
                    {formatCurrency(startup.revenue)}
                    <span className="text-sm text-muted-foreground block font-normal mt-1 uppercase tracking-wider">MRR</span>
                  </motion.div>
                ) : (
                  <motion.div
                    key="hidden"
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="w-full py-4 border-2 border-dashed border-border rounded-[10px] text-muted-foreground font-bold tracking-wider hover:bg-muted/10 transition-colors"
                  >
                    SELECT
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        ))}
      </div>

      <AnimatePresence>
        {revealed && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center gap-4 mt-4"
          >
            <div className={`text-2xl font-bold ${isCorrect ? 'text-green-600' : 'text-red-500'}`}>
              {isCorrect ? 'Correct! 🎉' : 'Wrong! 💀'}
            </div>
            <button 
              onClick={getNewPair}
              className="px-6 py-3 bg-black text-white font-bold rounded-[10px] flex items-center gap-2 hover:bg-black/80 transition-colors shadow-lg"
            >
              <RefreshCw className="w-4 h-4" /> Next pair
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}