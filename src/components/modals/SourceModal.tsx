import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

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
          <DialogDescription className="truncate">
            <a href={url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
              {url}
            </a>
          </DialogDescription>
          <DialogClose asChild>
            <Button variant="ghost" size="icon" className="absolute top-2 right-2">
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </Button>
          </DialogClose>
        </DialogHeader>
        <div className="flex-grow overflow-hidden">
          <iframe src={url} title="Source Content" className="w-full h-full border-0" />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SourceModal;
