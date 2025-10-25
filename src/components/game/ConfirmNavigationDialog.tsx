import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ConfirmNavigationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
}

export function ConfirmNavigationDialog({
  isOpen,
  onClose,
  onConfirm,
  title = "Leave Page?",
  description = "Are you sure? Your progress will be lost.",
  confirmText = "Leave",
  cancelText = "Cancel",
}: ConfirmNavigationDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="fixed left-1/2 top-1/2 bottom-auto right-auto -translate-x-1/2 -translate-y-1/2 z-[11010] w-[92vw] sm:w-auto sm:max-w-[420px] max-h-[80vh] overflow-hidden rounded-2xl border border-white/10 bg-black/80 dark:bg-zinc-900/90 backdrop-blur-md shadow-xl p-0">
        <DialogHeader className="px-6 pt-5">
          <DialogTitle className="text-white text-lg sm:text-xl font-semibold">{title}</DialogTitle>
          <DialogDescription className="text-zinc-300">{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter className="mt-6 px-6 pb-5">
          <div className="flex w-full flex-col gap-3">
            <Button className="w-full h-11 rounded-lg text-base" variant="destructive" onClick={onConfirm}>{confirmText}</Button>
            <Button className="w-full h-11 rounded-lg text-base bg-zinc-800 hover:bg-zinc-700 text-white border-none" variant="outline" onClick={onClose}>{cancelText}</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default ConfirmNavigationDialog;
