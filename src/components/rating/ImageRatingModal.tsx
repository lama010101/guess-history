import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Check, X } from "lucide-react";
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/sonner';

interface ImageRatingModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  imageId: string;
  roundId: string;
}

const ImageRatingModal: React.FC<ImageRatingModalProps> = ({
  isOpen,
  onClose,
  userId,
  imageId,
  roundId
}) => {
  // Rating state
  const [imageAccuracy, setImageAccuracy] = useState<number>(5);
  const [descriptionAccurate, setDescriptionAccurate] = useState<string | null>(null);
  const [locationAccurate, setLocationAccurate] = useState<string | null>(null);
  const [dateAccurate, setDateAccurate] = useState<string | null>(null);
  const [comment, setComment] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Convert toggle values to boolean
  const getBooleanValue = (value: string | null): boolean | null => {
    if (value === null) return null;
    return value === 'yes';
  };

  const handleSubmit = async () => {
    if (imageAccuracy === undefined) {
      toast.error("Please rate the image accuracy");
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase.from('image_feedback').upsert({
        user_id: userId,
        image_id: imageId,
        round_id: roundId,
        image_accuracy: imageAccuracy,
        description_accurate: getBooleanValue(descriptionAccurate),
        location_accurate: getBooleanValue(locationAccurate),
        date_accurate: getBooleanValue(dateAccurate),
        comment: comment.trim() || null
      }, { onConflict: 'user_id,round_id' });

      if (error) {
        console.error("Error submitting feedback:", error);
        toast.error("Failed to submit feedback");
      } else {
        toast.success("Your feedback has been saved!");
        onClose();
      }
    } catch (err) {
      console.error("Error submitting feedback:", err);
      toast.error("Failed to submit feedback");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setImageAccuracy(5);
    setDescriptionAccurate(null);
    setLocationAccurate(null);
    setDateAccurate(null);
    setComment('');
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) {
        onClose();
        resetForm();
      }
    }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center">Rate Image and Metadata Accuracy</DialogTitle>
          <DialogDescription className="text-center">
            Your feedback helps us improve our content
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Image Accuracy Slider */}
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm font-medium">Image Accuracy</span>
              <span className="text-sm font-medium">{imageAccuracy}/10</span>
            </div>
            <Slider
              value={[imageAccuracy]}
              min={0}
              max={10}
              step={1}
              onValueChange={(value) => setImageAccuracy(value[0])}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Poor</span>
              <span>Excellent</span>
            </div>
          </div>

          {/* Description Accuracy */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Is the Description Accurate?</label>
            <ToggleGroup 
              type="single" 
              value={descriptionAccurate} 
              onValueChange={setDescriptionAccurate}
              className="flex justify-start gap-2"
            >
              <ToggleGroupItem value="yes" className="flex items-center gap-1 border">
                <Check className="h-4 w-4" />
                Yes
              </ToggleGroupItem>
              <ToggleGroupItem value="no" className="flex items-center gap-1 border">
                <X className="h-4 w-4" />
                No
              </ToggleGroupItem>
            </ToggleGroup>
          </div>

          {/* Location Accuracy */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Is the Location Accurate?</label>
            <ToggleGroup 
              type="single" 
              value={locationAccurate} 
              onValueChange={setLocationAccurate}
              className="flex justify-start gap-2"
            >
              <ToggleGroupItem value="yes" className="flex items-center gap-1 border">
                <Check className="h-4 w-4" />
                Yes
              </ToggleGroupItem>
              <ToggleGroupItem value="no" className="flex items-center gap-1 border">
                <X className="h-4 w-4" />
                No
              </ToggleGroupItem>
            </ToggleGroup>
          </div>

          {/* Date Accuracy */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Is the Date Accurate?</label>
            <ToggleGroup 
              type="single" 
              value={dateAccurate} 
              onValueChange={setDateAccurate}
              className="flex justify-start gap-2"
            >
              <ToggleGroupItem value="yes" className="flex items-center gap-1 border">
                <Check className="h-4 w-4" />
                Yes
              </ToggleGroupItem>
              <ToggleGroupItem value="no" className="flex items-center gap-1 border">
                <X className="h-4 w-4" />
                No
              </ToggleGroupItem>
            </ToggleGroup>
          </div>

          {/* Comment Field */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Additional Comments</label>
            <Textarea 
              placeholder="Leave a comment (optional)..." 
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="resize-none"
              rows={3}
            />
          </div>
        </div>

        <DialogFooter className="sm:justify-between">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={isSubmitting || imageAccuracy === undefined}
            className="bg-history-primary hover:bg-history-primary/90"
          >
            {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ImageRatingModal;
