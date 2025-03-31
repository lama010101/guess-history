import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Share2, Video } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
interface HintDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  hintCoins: number;
}
const HintDialog = ({
  open,
  onOpenChange,
  hintCoins
}: HintDialogProps) => {
  const {
    toast
  } = useToast();
  const handleWatchAd = () => {
    // Simulate watching an ad
    toast({
      title: "Ad watched!",
      description: "You've earned 1 hint coin for watching an ad"
    });

    // Close the dialog
    onOpenChange(false);
  };
  const handleShareApp = () => {
    // Share app functionality
    const shareLink = window.location.origin;
    if (navigator.share) {
      navigator.share({
        title: 'EventGuesser',
        text: 'Check out this awesome historical events guessing game!',
        url: shareLink
      }).then(() => {
        toast({
          title: "Thanks for sharing!",
          description: "You've earned 1 hint coin for sharing the app"
        });
      }).catch(error => console.log('Error sharing:', error));
    } else {
      navigator.clipboard.writeText(shareLink);
      toast({
        title: "Link copied!",
        description: "The link has been copied to your clipboard. Share it to earn a hint coin!"
      });
    }

    // Close the dialog
    onOpenChange(false);
  };
  return <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Get Hint Coins</DialogTitle>
          <DialogDescription>
            You currently have {hintCoins} hint coins. Earn more coins by watching ads or sharing the app!
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 mt-6">
          <Button variant="outline" onClick={handleWatchAd} className="flex flex-col items-center justify-center gap-2 p-6 h-auto bg-slate-950 hover:bg-slate-800 text-slate-50">
            <Video className="h-8 w-8" />
            <div className="text-center">
              <div className="font-semibold">Watch Ad</div>
              <div className="text-xs text-muted-foreground">Earn 1 coin</div>
            </div>
          </Button>
          
          <Button variant="outline" onClick={handleShareApp} className="flex flex-col items-center justify-center gap-2 p-6 h-auto bg-slate-950 hover:bg-slate-800 text-slate-50">
            <Share2 className="h-8 w-8" />
            <div className="text-center">
              <div className="font-semibold">Share App</div>
              <div className="text-xs text-muted-foreground">Earn 1 coin</div>
            </div>
          </Button>
        </div>
      </DialogContent>
    </Dialog>;
};
export default HintDialog;