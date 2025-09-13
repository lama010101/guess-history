import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface SourceModalProps {
  isOpen: boolean;
  onClose: () => void;
  url: string;
}

const SourceModal: React.FC<SourceModalProps> = ({ isOpen, onClose, url }) => {
  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[92vw] sm:max-w-[95vw] max-h-[95vh] overflow-hidden rounded-2xl border border-white/10 bg-black/85 backdrop-blur-md shadow-2xl flex flex-col p-0">
        <DialogHeader className="px-4 py-3 border-b border-white/10 flex-shrink-0">
          <DialogTitle className="text-white">Source</DialogTitle>
        </DialogHeader>
        <div className="flex-grow overflow-hidden">
          <iframe src={url} title="Source Content" className="w-full h-full border-0" />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SourceModal;
