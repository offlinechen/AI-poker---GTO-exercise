import { motion } from 'framer-motion';
import { Card } from '../../types';
import { SUIT_SYMBOLS, SUIT_COLORS } from '../../constants';

interface PokerCardProps {
  card?: Card;
  faceDown?: boolean;
  size?: 'small' | 'medium' | 'large';
  className?: string;
}

export function PokerCard({ card, faceDown = false, size = 'medium', className = '' }: PokerCardProps) {
  const sizeClasses = {
    small: 'w-12 h-16 text-xs',
    medium: 'w-16 h-24 text-base',
    large: 'w-20 h-28 text-lg'
  };

  if (!card || faceDown) {
    return (
      <motion.div
        className={`${sizeClasses[size]} ${className} bg-gradient-to-br from-blue-900 via-blue-800 to-blue-900 rounded-lg border-2 border-blue-700 flex items-center justify-center shadow-lg relative overflow-hidden`}
        whileHover={{ scale: 1.05, rotateY: 5 }}
        transition={{ duration: 0.2 }}
      >
        <div className="absolute inset-0 opacity-20">
          <div className="absolute inset-0" style={{
            backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,0.1) 10px, rgba(255,255,255,0.1) 20px)',
          }}></div>
        </div>
        <div className="text-blue-400 font-bold opacity-50">?</div>
      </motion.div>
    );
  }

  const suitColor = SUIT_COLORS[card.suit];
  const suitSymbol = SUIT_SYMBOLS[card.suit];

  return (
    <motion.div
      className={`${sizeClasses[size]} ${className} bg-white rounded-lg border-2 border-gray-300 flex flex-col items-center justify-between p-2 shadow-lg relative`}
      style={{ color: suitColor }}
      whileHover={{ scale: 1.1, y: -8 }}
      transition={{ duration: 0.2 }}
    >
      <div className="font-bold self-start">{card.rank}</div>
      <div className={size === 'large' ? 'text-4xl' : size === 'medium' ? 'text-3xl' : 'text-xl'}>
        {suitSymbol}
      </div>
      <div className="font-bold self-end transform rotate-180">{card.rank}</div>
    </motion.div>
  );
}
