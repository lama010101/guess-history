
import { useState, useRef } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Upload, Check, Delete, Edit, Image, Search, FileSpreadsheet } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import EventsList from "./EventsList";
import { HistoricalImage } from "@/types/game";
import * as XLSX from 'xlsx';

// Mock data for demonstration
const mockEvents: HistoricalImage[] = [
  {
    id: 1,
    src: "https://images.unsplash.com/photo-1565711561500-49678a10a63f?q=80&w=2940&auto=format&fit=crop",
    year: 1950,
    location: { lat: 48.8584, lng: 2.2945 },
    description: "Eiffel Tower, Paris"
  },
  {
    id: 2,
    src: "https://images.unsplash.com/photo-1568797629192-789acf8e4df3?q=80&w=3174&auto=format&fit=crop",
    year: 1932,
    location: { lat: 40.7484, lng: -73.9857 },
    description: "Empire State Building, New York"
  },
  {
    id: 3,
    src: "https://images.unsplash.com/photo-1526711657229-e7e080961425?q=80&w=2832&auto=format&fit=crop",
    year: 1969,
    location: { lat: 37.8199, lng: -122.4783 },
    description: "Golden Gate Bridge, San Francisco"
  }
];

interface ExcelImageData {
  description: string;
  year: number;
  latitude: number;
  longitude: number;
  imageUrl?: string;
}

const AdminEventsManager = () => {
  const { toast } = useToast();
  const [events, setEvents] = useState<HistoricalImage[]>(mockEvents);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedEvent, setSelectedEvent] = useState<HistoricalImage | null>(null);
  const [isAddingEvent, setIsAddingEvent] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const handleAddEvent = () => {
    setIsAddingEvent(true);
    setSelectedEvent(null);
  };

  const handleEditEvent = (event: HistoricalImage) => {
    setSelectedEvent(event);
    setIsAddingEvent(false);
  };

  const handleDeleteEvent = (id: number) => {
    setEvents(events.filter(event => event.id !== id));
    toast({
      title: "Event Deleted",
      description: `Event #${id} has been removed.`,
    });
  };

  const handleSaveEvent = () => {
    toast({
      title: "Event Saved",
      description: "Changes have been saved successfully.",
    });
    
    // Reset form
    setSelectedEvent(null);
    setIsAddingEvent(false);
  };

  const handleFileUpload = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleImageUpload = () => {
    if (imageInputRef.current) {
      imageInputRef.current.click();
    }
  };

  const processExcelFile = async (file: File) => {
    setIsUploading(true);
    
    try {
      const data = await readExcelFile(file);
      
      if (data && data.length > 0) {
        // Convert Excel data to HistoricalImage format
        const newEvents: HistoricalImage[] = data.map((row, index) => ({
          id: events.length + index + 1,
          description: row.description || 'Unknown location',
          year: row.year || 2000,
          location: { 
            lat: row.latitude || 0, 
            lng: row.longitude || 0 
          },
          src: row.imageUrl || 'https://via.placeholder.com/500'
        }));
        
        // Add new events to the list
        setEvents(prev => [...prev, ...newEvents]);
        
        toast({
          title: "Upload Successful",
          description: `${newEvents.length} events have been added from the Excel file.`,
        });
      } else {
        toast({
          title: "No Data Found",
          description: "The Excel file doesn't contain any valid data.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Upload Failed",
        description: "There was an error processing the Excel file.",
        variant: "destructive",
      });
      console.error("Excel processing error:", error);
    } finally {
      setIsUploading(false);
    }
  };

  const readExcelFile = (file: File): Promise<ExcelImageData[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          const workbook = XLSX.read(data, { type: 'binary' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json<ExcelImageData>(worksheet);
          
          resolve(jsonData);
        } catch (error) {
          reject(error);
        }
      };
      
      reader.onerror = (error) => reject(error);
      reader.readAsBinaryString(file);
    });
  };

  const handleExcelChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processExcelFile(files[0]);
    }
  };

  const filteredEvents = events.filter(event => 
    event.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    event.year.toString().includes(searchTerm)
  );

  return (
    <div className="space-y-6">
      {/* Hidden file inputs */}
      <input 
        type="file" 
        ref={fileInputRef} 
        className="hidden" 
        accept=".xlsx,.xls" 
        onChange={handleExcelChange}
      />
      <input 
        type="file" 
        ref={imageInputRef} 
        className="hidden" 
        accept="image/*" 
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Events List */}
        <Card className="md:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Historical Events</CardTitle>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleFileUpload} disabled={isUploading}>
                  {isUploading ? (
                    <span className="flex items-center">
                      <div className="animate-spin mr-2 h-4 w-4 border-2 border-primary border-r-transparent rounded-full"></div>
                      Uploading...
                    </span>
                  ) : (
                    <>
                      <FileSpreadsheet className="mr-2 h-4 w-4" />
                      Upload Excel
                    </>
                  )}
                </Button>
                <Button onClick={handleAddEvent}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Event
                </Button>
              </div>
            </div>
            <CardDescription>
              Manage historical events and images for the game. Upload an Excel file with columns: description, year, latitude, longitude, imageUrl.
            </CardDescription>
            <div className="relative mt-2">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search events..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </CardHeader>
          <CardContent>
            <EventsList 
              events={filteredEvents} 
              onEdit={handleEditEvent} 
              onDelete={handleDeleteEvent} 
            />
          </CardContent>
        </Card>

        {/* Event Editor */}
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
                  <Label htmlFor="event-description">Description</Label>
                  <Textarea 
                    id="event-description"
                    placeholder="Enter event description..."
                    defaultValue={selectedEvent?.description || ""}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="event-year">Year</Label>
                    <Input 
                      id="event-year"
                      type="number"
                      placeholder="Year"
                      defaultValue={selectedEvent?.year || 2000}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="event-image">Image Upload</Label>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" className="w-full" onClick={handleImageUpload}>
                        <Image className="mr-2 h-4 w-4" />
                        Upload Image
                      </Button>
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="event-lat">Latitude</Label>
                    <Input 
                      id="event-lat"
                      type="number"
                      step="0.0001"
                      placeholder="Latitude"
                      defaultValue={selectedEvent?.location.lat || 0}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="event-lng">Longitude</Label>
                    <Input 
                      id="event-lng"
                      type="number"
                      step="0.0001"
                      placeholder="Longitude"
                      defaultValue={selectedEvent?.location.lng || 0}
                    />
                  </div>
                </div>

                {selectedEvent && (
                  <div className="mt-4">
                    <img 
                      src={selectedEvent.src}
                      alt={selectedEvent.description}
                      className="w-full h-40 object-cover rounded-md border"
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
                  <Button variant="secondary" size="sm" onClick={handleFileUpload}>
                    <Upload className="mr-2 h-4 w-4" />
                    Select Excel File
                  </Button>
                </div>
                
                <div className="text-xs text-muted-foreground">
                  <p className="font-medium mb-1">Excel Format Example:</p>
                  <div className="bg-muted p-2 rounded-md">
                    <pre className="whitespace-pre-wrap">
                      description | year | latitude | longitude | imageUrl
                      ------------|------|----------|-----------|----------
                      Eiffel Tower | 1950 | 48.8584 | 2.2945 | https://...
                      Great Wall | 1976 | 40.4319 | 116.5704 | https://...
                    </pre>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
          {(isAddingEvent || selectedEvent) && (
            <CardFooter className="flex justify-between">
              <Button variant="outline" onClick={() => {
                setSelectedEvent(null);
                setIsAddingEvent(false);
              }}>
                Cancel
              </Button>
              <Button onClick={handleSaveEvent}>
                <Check className="mr-2 h-4 w-4" />
                Save Event
              </Button>
            </CardFooter>
          )}
        </Card>
      </div>
    </div>
  );
};

export default AdminEventsManager;
