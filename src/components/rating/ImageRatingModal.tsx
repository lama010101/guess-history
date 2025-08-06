import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { toast } from 'sonner';

interface ImageRatingModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageId: string;
  onFeedbackSubmitted?: () => void;
}

const ImageRatingModal: React.FC<ImageRatingModalProps> = ({ isOpen, onClose, imageId, roundId, onFeedbackSubmitted }) => {
  const [imageAccuracy, setImageAccuracy] = useState<number>(5);
  const [descriptionAccurate, setDescriptionAccurate] = useState<string | null>(null);
  const [locationAccurate, setLocationAccurate] = useState<string | null>(null);
  const [dateAccurate, setDateAccurate] = useState<string | null>(null);
  const [additionalComments, setAdditionalComments] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isFormValid = imageAccuracy !== undefined;

  const getBooleanValue = (value: string | null): boolean | null => {
    if (value === 'yes') return true;
    if (value === 'no') return false;
    return null;
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
        description_accurate: getBooleanValue(descriptionAccurate),
        location_accurate: getBooleanValue(locationAccurate),
        date_accurate: getBooleanValue(dateAccurate),
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
          <DialogTitle>Rate Image and Metadata Accuracy</DialogTitle>
          <DialogDescription>
            Your feedback helps us improve our content
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="flex flex-col gap-2">
            <label>IMAGE Quality & Accuracy</label>
            <Slider
              defaultValue={[5]}
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
            <label>TITLE & DESCRIPTION accurate?</label>
            <div className="flex gap-2">
              <Button variant={descriptionAccurate === 'yes' ? 'default' : 'outline'} onClick={() => setDescriptionAccurate('yes')}>Yes</Button>
              <Button variant={descriptionAccurate === 'no' ? 'default' : 'outline'} onClick={() => setDescriptionAccurate('no')}>No</Button>
            </div>
          </div>
          
          <div className="flex flex-col gap-2">
            <label>LOCATION accurate?</label>
            <div className="flex gap-2">
              <Button variant={locationAccurate === 'yes' ? 'default' : 'outline'} onClick={() => setLocationAccurate('yes')}>Yes</Button>
              <Button variant={locationAccurate === 'no' ? 'default' : 'outline'} onClick={() => setLocationAccurate('no')}>No</Button>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label>DATE Accurate?</label>
            <div className="flex gap-2">
              <Button variant={dateAccurate === 'yes' ? 'default' : 'outline'} onClick={() => setDateAccurate('yes')}>Yes</Button>
              <Button variant={dateAccurate === 'no' ? 'default' : 'outline'} onClick={() => setDateAccurate('no')}>No</Button>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="comments">COMMENT</label>
            <Textarea 
              id="comments"
              placeholder="Leave a comment (optional)..."
              value={additionalComments}
              onChange={(e) => setAdditionalComments(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || !isFormValid}>
            {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ImageRatingModal;
