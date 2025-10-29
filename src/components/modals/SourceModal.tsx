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
      <DialogContent
        className="left-0 top-0 h-screen w-screen max-w-none translate-x-0 translate-y-0 overflow-hidden border-0 bg-black text-white p-0 sm:rounded-none flex flex-col"
      >
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
