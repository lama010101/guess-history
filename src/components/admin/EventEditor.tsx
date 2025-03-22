
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Check, Image, Upload, FileSpreadsheet } from "lucide-react";
import { HistoricalImage } from "@/types/game";

interface EventEditorProps {
  selectedEvent: HistoricalImage | null;
  isAddingEvent: boolean;
  onSave: (event: Partial<HistoricalImage>) => void;
  onCancel: () => void;
  onImageUpload: () => void;
  onFileUpload: () => void;
}

const EventEditor = ({
  selectedEvent,
  isAddingEvent,
  onSave,
  onCancel,
  onImageUpload,
  onFileUpload
}: EventEditorProps) => {
  const [eventData, setEventData] = useState<Partial<HistoricalImage>>(
    selectedEvent || {
      description: "",
      title: "",
      year: 2000,
      location: { lat: 0, lng: 0 },
      src: "",
      locationName: ""
    }
  );

  // Reset form when selectedEvent changes
  useEffect(() => {
    setEventData(
      selectedEvent || {
        description: "",
        title: "",
        year: 2000,
        location: { lat: 0, lng: 0 },
        src: "",
        locationName: ""
      }
    );
  }, [selectedEvent]);

  const handleChange = (field: string, value: any) => {
    if (field === "lat" || field === "lng") {
      setEventData({
        ...eventData,
        location: {
          ...eventData.location!,
          [field]: parseFloat(value)
        }
      });
    } else {
      setEventData({
        ...eventData,
        [field]: field === "year" ? parseInt(value) : value
      });
    }
  };

  const handleSave = () => {
    onSave(eventData);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {isAddingEvent ? "Add New Event" : selectedEvent ? "Edit Event" : "Event Details"}
        </CardTitle>
        <CardDescription>
          {isAddingEvent ? "Create a new historical event" : selectedEvent ? "Modify event details" : "Select an event to edit or upload an Excel file to bulk add events"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {(isAddingEvent || selectedEvent) ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="event-title">Title</Label>
              <Input
                id="event-title"
                placeholder="Enter event title..."
                value={eventData.title || ""}
                onChange={(e) => handleChange("title", e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="event-description">Description</Label>
              <Textarea 
                id="event-description"
                placeholder="Enter event description..."
                value={eventData.description || ""}
                onChange={(e) => handleChange("description", e.target.value)}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="event-year">Year</Label>
                <Input 
                  id="event-year"
                  type="number"
                  placeholder="Year"
                  value={eventData.year || 2000}
                  onChange={(e) => handleChange("year", e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="event-location-name">Location Name</Label>
                <Input 
                  id="event-location-name"
                  placeholder="e.g. Paris, France"
                  value={eventData.locationName || ""}
                  onChange={(e) => handleChange("locationName", e.target.value)}
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="event-lat">Latitude Coordinate</Label>
                <Input 
                  id="event-lat"
                  type="number"
                  step="0.0001"
                  placeholder="Latitude"
                  value={eventData.location?.lat || 0}
                  onChange={(e) => handleChange("lat", e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="event-lng">Longitude Coordinate</Label>
                <Input 
                  id="event-lng"
                  type="number"
                  step="0.0001"
                  placeholder="Longitude"
                  value={eventData.location?.lng || 0}
                  onChange={(e) => handleChange("lng", e.target.value)}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="event-image-url">Image URL</Label>
              <Input 
                id="event-image-url"
                placeholder="Enter image URL..."
                value={eventData.src || ""}
                onChange={(e) => handleChange("src", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Image Upload</Label>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="w-full" onClick={onImageUpload}>
                  <Image className="mr-2 h-4 w-4" />
                  Upload Image
                </Button>
              </div>
            </div>

            {eventData.src && (
              <div className="mt-4">
                <img 
                  src={eventData.src}
                  alt={eventData.description}
                  className="w-full h-40 object-cover rounded-md border"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "https://via.placeholder.com/500?text=Image+Error";
                  }}
                />
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-col items-center justify-center h-48 p-6 border-2 border-dashed border-muted-foreground/30 rounded-md bg-muted/30 text-center">
              <FileSpreadsheet className="h-10 w-10 text-muted-foreground mb-2" />
              <p className="text-sm font-medium mb-1">Upload Excel file with event data</p>
              <p className="text-xs text-muted-foreground mb-3">
                Required columns: description, year, latitude, longitude
              </p>
              <Button variant="secondary" size="sm" onClick={onFileUpload}>
                <Upload className="mr-2 h-4 w-4" />
                Select Excel File
              </Button>
            </div>
            
            <div className="text-xs text-muted-foreground">
              <p className="font-medium mb-1">Excel Format Example:</p>
              <div className="bg-muted p-2 rounded-md">
                <pre className="whitespace-pre-wrap">
                  description | year | latitude | longitude | imageUrl | title | locationName
                  ------------|------|----------|-----------|----------|-------|-------------
                  Eiffel Tower | 1950 | 48.8584 | 2.2945 | https://... | Paris | France
                  Great Wall | 1976 | 40.4319 | 116.5704 | https://... | Beijing | China
                </pre>
              </div>
            </div>
          </div>
        )}
      </CardContent>
      {(isAddingEvent || selectedEvent) && (
        <CardFooter className="flex justify-between">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            <Check className="mr-2 h-4 w-4" />
            Save Event
          </Button>
        </CardFooter>
      )}
    </Card>
  );
};

export default EventEditor;
