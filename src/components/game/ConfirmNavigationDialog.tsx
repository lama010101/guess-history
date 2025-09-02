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
  title = "Leave Game?",
  description = "Are you sure? Your progress will be lost.",
  confirmText = "Leave",
  cancelText = "Cancel",
}: ConfirmNavigationDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="relative z-[11010] sm:max-w-[425px] max-h-[85vh] overflow-y-auto rounded-xl border border-white/20 bg-white/10 dark:bg-zinc-900/30 backdrop-blur-md shadow-2xl pb-16 sm:pb-0">
        {/* Decorative glassmorphism panel behind the modal */}
        <div className="pointer-events-none absolute inset-0 translate-y-3 rounded-2xl border border-white/10 bg-white/10 dark:bg-zinc-900/20 backdrop-blur-lg shadow-[0_8px_60px_rgba(0,0,0,0.5)] -z-10" />
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter className="mt-4">
          {/* Always stack vertically: Leave on top, spacer equal to button height, then Cancel */}
          <div className="flex w-full flex-col gap-2">
            <Button className="w-full" variant="destructive" onClick={onConfirm}>
              {confirmText}
            </Button>
            {/* Spacer equal to default Button height (h-10) */}
            <div className="block h-12 sm:h-10" aria-hidden="true" />
            <Button className="w-full" variant="outline" onClick={onClose}>
              {cancelText}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default ConfirmNavigationDialog;
