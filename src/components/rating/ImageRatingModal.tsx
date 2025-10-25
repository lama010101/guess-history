import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { toast } from '@/components/ui/sonner';

interface ImageRatingModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageId: string;
  onFeedbackSubmitted?: () => void;
}

const ImageRatingModal: React.FC<ImageRatingModalProps> = ({ isOpen, onClose, imageId, onFeedbackSubmitted }) => {
  const [imageAccuracy, setImageAccuracy] = useState<number>(5);
  const [descriptionAccuracy, setDescriptionAccuracy] = useState<number>(5);
  const [locationAccuracy, setLocationAccuracy] = useState<number>(5);
  const [dateAccuracy, setDateAccuracy] = useState<number>(5);
  const [additionalComments, setAdditionalComments] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isFormValid = imageAccuracy !== undefined;

  const getBooleanValue = (value: number | null): boolean | null => {
    if (value === null || value === undefined) return null;
    return value >= 6;
  };

  const handleSubmit = async () => {
    if (!isFormValid) {
      toast.error("Please rate the image accuracy before submitting.");
      return;
    }
    setIsSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser(); // Corrected Supabase auth.getUser() call
      if (!user) {
        toast.error("You must be authenticated to submit feedback.");
        setIsSubmitting(false);
        return;
      }

      const feedbackData = {
        image_id: imageId,
        user_id: user.id, // Included authenticated user's ID
        image_accuracy: imageAccuracy,
        description_accurate: getBooleanValue(descriptionAccuracy),
        location_accurate: getBooleanValue(locationAccuracy),
        date_accurate: getBooleanValue(dateAccuracy),
        additional_comments: additionalComments.trim() || null,
      };

      const { error } = await supabase
        .from('image_feedbacks')
        .upsert(feedbackData, { onConflict: ['user_id', 'image_id'] });

      if (error) {
        console.error("Error submitting feedback:", error);
        toast.error(`Failed to submit feedback: ${error.message}`);
      } else {
        toast.success("Feedback submitted successfully!");
        if (onFeedbackSubmitted) {
          onFeedbackSubmitted();
        }
        onClose();
      }
    } catch (err) {
      console.error("An unexpected error occurred:", err);
      toast.error("An unexpected error occurred while submitting your feedback.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Rate Accuracy</DialogTitle>
          <DialogDescription>
            Your feedback helps us improve our content
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="flex flex-col gap-2">
            <label>Image</label>
            <Slider
              value={[imageAccuracy]}
              min={1}
              max={10}
              step={1}
              onValueChange={(value) => setImageAccuracy(value[0])}
            />
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Poor</span>
              <span>Excellent</span>
            </div>
          </div>
          
          <div className="flex flex-col gap-2">
            <label>Title and Description</label>
            <Slider
              value={[descriptionAccuracy]}
              min={1}
              max={10}
              step={1}
              onValueChange={(value) => setDescriptionAccuracy(value[0])}
            />
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Poor</span>
              <span>Excellent</span>
            </div>
          </div>
          
          <div className="flex flex-col gap-2">
            <label>Location</label>
            <Slider
              value={[locationAccuracy]}
              min={1}
              max={10}
              step={1}
              onValueChange={(value) => setLocationAccuracy(value[0])}
            />
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Poor</span>
              <span>Excellent</span>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label>Date</label>
            <Slider
              value={[dateAccuracy]}
              min={1}
              max={10}
              step={1}
              onValueChange={(value) => setDateAccuracy(value[0])}
            />
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Poor</span>
              <span>Excellent</span>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="comments">Add your comment</label>
            <Textarea 
              id="comments"
              placeholder="Leave a comment (optional)..."
              value={additionalComments}
              onChange={(e) => setAdditionalComments(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
          <Button variant="outline" onClick={onClose} className="w-full sm:w-auto">
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !isFormValid}
            className="w-full sm:w-auto bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ImageRatingModal;
