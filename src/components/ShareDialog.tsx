
import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Copy, Share2, Facebook, Twitter, Mail } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ShareDialog = ({ open, onOpenChange }: ShareDialogProps) => {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();
  
  const shareUrl = window.location.origin;
  
  const handleCopy = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    toast({
      title: "Link copied!",
      description: "The link has been copied to your clipboard"
    });
    setTimeout(() => setCopied(false), 2000);
  };
  
  const handleShare = (platform: string) => {
    let shareLink = '';
    const text = "Check out this awesome historical events guessing game!";
    
    switch (platform) {
      case 'facebook':
        shareLink = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}&quote=${encodeURIComponent(text)}`;
        break;
      case 'twitter':
        shareLink = `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(text)}`;
        break;
      case 'email':
        shareLink = `mailto:?subject=${encodeURIComponent("Check out EventGuesser")}&body=${encodeURIComponent(`${text} ${shareUrl}`)}`;
        break;
      default:
        break;
    }
    
    if (shareLink) {
      window.open(shareLink, '_blank');
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share EventGuesser</DialogTitle>
          <DialogDescription>
            Share this app with your friends and invite them to play!
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex items-center space-x-2 mt-4">
          <div className="grid flex-1 gap-2">
            <input
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              value={shareUrl}
              readOnly
            />
          </div>
          <Button type="submit" size="sm" onClick={handleCopy}>
            {copied ? "Copied" : "Copy"}
            <Copy className="ml-2 h-4 w-4" />
          </Button>
        </div>
        
        <div className="flex justify-center space-x-4 mt-6">
          <Button 
            variant="outline" 
            size="icon" 
            className="h-12 w-12 rounded-full bg-blue-600 text-white hover:bg-blue-700"
            onClick={() => handleShare('facebook')}
          >
            <Facebook className="h-5 w-5" />
            <span className="sr-only">Share on Facebook</span>
          </Button>
          
          <Button 
            variant="outline" 
            size="icon" 
            className="h-12 w-12 rounded-full bg-blue-400 text-white hover:bg-blue-500"
            onClick={() => handleShare('twitter')}
          >
            <Twitter className="h-5 w-5" />
            <span className="sr-only">Share on Twitter</span>
          </Button>
          
          <Button 
            variant="outline" 
            size="icon" 
            className="h-12 w-12 rounded-full bg-amber-500 text-white hover:bg-amber-600"
            onClick={() => handleShare('email')}
          >
            <Mail className="h-5 w-5" />
            <span className="sr-only">Share via Email</span>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ShareDialog;
