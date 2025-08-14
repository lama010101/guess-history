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
      <DialogContent className="w-full h-full max-w-none max-h-none sm:max-w-[95vw] sm:max-h-[95vh] flex flex-col p-0">
        <DialogHeader className="p-4 border-b flex-shrink-0">
          <DialogTitle>Source</DialogTitle>
        </DialogHeader>
        <div className="flex-grow overflow-hidden">
          <iframe src={url} title="Source Content" className="w-full h-full border-0" />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SourceModal;
