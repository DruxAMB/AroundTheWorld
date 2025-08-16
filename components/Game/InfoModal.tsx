// components/Game/InfoModal.tsx
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

interface InfoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const InfoModal: React.FC<InfoModalProps> = ({ isOpen, onClose }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, y: -20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: -20 }}
            className="bg-slate-800/80 backdrop-blur-sm rounded-2xl shadow-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 border border-slate-700 relative"
            onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside
          >
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
            >
              <X size={24} />
            </button>
            <h2 className="text-3xl font-bold text-center mb-6 text-white">How to Play</h2>
            
            <div className="space-y-6 text-slate-300">
              <div>
                <h3 className="text-xl font-semibold text-teal-400 mb-2">The Basics</h3>
                <p>Swap any two adjacent items to make a line of 3 or more matching items. Matches can be horizontal or vertical.</p>
              </div>

              <div>
                <h3 className="text-xl font-semibold text-teal-400 mb-2">Special Items</h3>
                <p className="mb-2">Matching more than 3 items creates special items with powerful effects:</p>
                <ul className="space-y-3 list-disc list-inside pl-2">
                  <li>
                    <strong>Striped Item (Match 4):</strong> Clears an entire row or column.
                  </li>
                  <li>
                    <strong>Wrapped Item (Match in L or T shape):</strong> Explodes and clears a 3x3 area of items around it.
                  </li>
                  <li>
                    <strong>Color Bomb (Match 5 in a line):</strong> When swapped with any item, it clears all items of that color from the board.
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="text-xl font-semibold text-teal-400 mb-2">Special Combos</h3>
                <p>Swap two special items together for even bigger effects!</p>
                 <ul className="space-y-3 list-disc list-inside pl-2">
                  <li><strong>Striped + Wrapped:</strong> Clears three rows and three columns.</li>
                  <li><strong>Striped + Striped:</strong> Clears a row and a column.</li>
                  <li><strong>Color Bomb + Striped:</strong> Turns all items of the striped item's color into striped items and then activates them.</li>
                  <li><strong>Color Bomb + Color Bomb:</strong> Clears the entire board!</li>
                </ul>
              </div>

               <div>
                <h3 className="text-xl font-semibold text-teal-400 mb-2">Objectives</h3>
                <p>Each level has a unique objective. It could be reaching a target score, clearing all jelly squares, or collecting specific items. Check the objective at the start of each level!</p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default InfoModal;
