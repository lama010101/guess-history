
import { Button } from "@/components/ui/button";
import { Plus, Save, RefreshCw, Trash2 } from "lucide-react";
import ExcelImporter from "./ExcelImporter";
import { HistoricalImage } from "@/types/game";

interface EventsToolbarProps {
  onAddEvent: () => void;
  onDeleteSelected: () => void;
  onSaveSelectedToDB: () => void;
  onImportComplete: (events: HistoricalImage[]) => void;
  isUploading: boolean;
  setIsUploading: (value: boolean) => void;
  isSaving: boolean;
  selectedEventsCount: number;
}

const EventsToolbar = ({
  onAddEvent,
  onDeleteSelected,
  onSaveSelectedToDB,
  onImportComplete,
  isUploading,
  setIsUploading,
  isSaving,
  selectedEventsCount
}: EventsToolbarProps) => {
  return (
    <div className="flex gap-2">
      <ExcelImporter 
        onImportComplete={onImportComplete}
        isUploading={isUploading}
        setIsUploading={setIsUploading}
      />
      <Button onClick={onAddEvent}>
        <Plus className="mr-2 h-4 w-4" />
        Add Event
      </Button>
      <Button 
        onClick={onDeleteSelected} 
        disabled={selectedEventsCount === 0}
        variant="destructive"
      >
        <Trash2 className="mr-2 h-4 w-4" />
        Delete Selected
      </Button>
      <Button 
        onClick={onSaveSelectedToDB} 
        disabled={isSaving || selectedEventsCount === 0}
        variant="default"
      >
        {isSaving ? (
          <span className="flex items-center">
            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
            Saving...
          </span>
        ) : (
          <>
            <Save className="mr-2 h-4 w-4" />
            Save to DB
          </>
        )}
      </Button>
    </div>
  );
};

export default EventsToolbar;
