
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Save, FileSpreadsheet, RefreshCw } from "lucide-react";
import ExcelImporter from "./ExcelImporter";
import { HistoricalImage } from "@/types/game";

interface EventsToolbarProps {
  onAddEvent: () => void;
  onDeleteSelected: () => void;
  onSaveSelectedToDB: () => void;
  onImportComplete: (events: HistoricalImage[]) => void;
  isUploading: boolean;
  setIsUploading: (isUploading: boolean) => void;
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
    <div className="flex items-center space-x-2">
      <Button size="sm" onClick={onAddEvent}>
        <Plus className="mr-1 h-4 w-4" />
        Add
      </Button>
      
      <Button 
        size="sm" 
        variant="outline" 
        onClick={onDeleteSelected}
        disabled={selectedEventsCount === 0}
      >
        <Trash2 className="mr-1 h-4 w-4" />
        Delete
      </Button>
      
      <Button 
        size="sm" 
        variant="outline"
        onClick={onSaveSelectedToDB}
        disabled={selectedEventsCount === 0 || isSaving}
      >
        {isSaving ? (
          <span className="flex items-center">
            <RefreshCw className="mr-1 h-4 w-4 animate-spin" />
            Saving...
          </span>
        ) : (
          <>
            <Save className="mr-1 h-4 w-4" />
            Save
          </>
        )}
      </Button>
      
      <ExcelImporter 
        onImportComplete={onImportComplete}
        isUploading={isUploading}
        setIsUploading={setIsUploading}
      />
    </div>
  );
};

export default EventsToolbar;
