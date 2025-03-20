
import { useState, useRef, useCallback } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Table, TableHeader, TableRow, TableHead, 
  TableBody, TableCell 
} from "@/components/ui/table";
import { 
  Plus, Upload, Check, X, Edit, Image, 
  Search, FileSpreadsheet, Save, RefreshCw 
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
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
  location?: string;
  country?: string;
}

const AdminEventsManager = () => {
  const { toast } = useToast();
  const [events, setEvents] = useState<HistoricalImage[]>(mockEvents);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedEvent, setSelectedEvent] = useState<HistoricalImage | null>(null);
  const [isAddingEvent, setIsAddingEvent] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedEvents, setSelectedEvents] = useState<Set<number>>(new Set());
  const [isAllSelected, setIsAllSelected] = useState(false);
  
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
    setSelectedEvents(prev => {
      const newSet = new Set(prev);
      newSet.delete(id);
      return newSet;
    });
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

  const toggleSelectAll = () => {
    if (isAllSelected) {
      // Deselect all
      setSelectedEvents(new Set());
    } else {
      // Select all
      const allIds = filteredEvents.map(event => event.id);
      setSelectedEvents(new Set(allIds));
    }
    setIsAllSelected(!isAllSelected);
  };

  const toggleSelectEvent = (id: number) => {
    setSelectedEvents(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const handleSaveSelectedToDB = () => {
    setIsSaving(true);
    
    // Simulate saving to database
    setTimeout(() => {
      setIsSaving(false);
      toast({
        title: "Events Saved to Database",
        description: `${selectedEvents.size} events have been saved to the database.`,
      });
    }, 1500);
  };

  const processExcelFile = async (file: File) => {
    setIsUploading(true);
    
    try {
      const data = await readExcelFile(file);
      
      if (data && data.length > 0) {
        console.log("Excel data:", data);
        
        // Convert Excel data to HistoricalImage format
        const newEvents: HistoricalImage[] = data.map((row, index) => {
          // Handle potential data inconsistencies
          const latitude = typeof row.latitude === 'number' ? row.latitude : parseFloat(String(row.latitude)) || 0;
          const longitude = typeof row.longitude === 'number' ? row.longitude : parseFloat(String(row.longitude)) || 0;
          const year = typeof row.year === 'number' ? row.year : parseInt(String(row.year)) || 2000;
          
          return {
            id: events.length + index + 1,
            description: row.description || 'Unknown location',
            year: year,
            location: { 
              lat: latitude, 
              lng: longitude 
            },
            src: row.imageUrl || 'https://via.placeholder.com/500'
          };
        });
        
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
      console.error("Excel processing error:", error);
      toast({
        title: "Upload Failed",
        description: "There was an error processing the Excel file. Check the console for details.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const readExcelFile = useCallback((file: File): Promise<ExcelImageData[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          const workbook = XLSX.read(data, { type: 'binary' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          
          // Use headers option to handle column name variations
          const jsonData = XLSX.utils.sheet_to_json<ExcelImageData>(worksheet, {
            header: "A", // Use Excel column headers (A, B, C, etc.)
            range: 1,    // Skip header row
            raw: false   // Convert all cells to strings
          });
          
          console.log("Raw Excel data:", jsonData);
          
          // Map Excel data to our expected format
          // This is more flexible than direct mapping
          const mappedData = jsonData.map((row: any) => {
            // Check for common column name patterns
            const description = row.description || row.Description || row.title || row.Title || row.A || '';
            const year = row.year || row.Year || row.date || row.Date || row.B || 2000;
            
            // Try different variations of latitude/longitude names
            const latitude = row.latitude || row.Latitude || row.lat || row.Lat || row.C || 0;
            const longitude = row.longitude || row.Longitude || row.lng || row.Lng || row.D || 0;
            
            // Image URL might be called different things
            const imageUrl = row.imageUrl || row.ImageUrl || row.image || row.Image || row.url || row.URL || row.E || '';
            
            // Country or location might be useful
            const location = row.location || row.Location || row.place || row.Place || row.F || '';
            const country = row.country || row.Country || row.nation || row.Nation || row.G || '';
            
            return {
              description,
              year: typeof year === 'string' ? parseInt(year) : year,
              latitude: typeof latitude === 'string' ? parseFloat(latitude) : latitude,
              longitude: typeof longitude === 'string' ? parseFloat(longitude) : longitude,
              imageUrl,
              location,
              country
            };
          });
          
          resolve(mappedData);
        } catch (error) {
          console.error("Excel parsing error:", error);
          reject(error);
        }
      };
      
      reader.onerror = (error) => reject(error);
      reader.readAsBinaryString(file);
    });
  }, []);

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
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
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
                <Button 
                  onClick={handleSaveSelectedToDB} 
                  disabled={isSaving || selectedEvents.size === 0}
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
            {filteredEvents.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No events found. Add some events to get started.
              </div>
            ) : (
              <div className="border rounded-md overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted">
                      <TableHead className="w-12 text-center">
                        <Checkbox 
                          checked={isAllSelected} 
                          onCheckedChange={toggleSelectAll}
                          aria-label="Select all events"
                        />
                      </TableHead>
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="w-20 text-center">Year</TableHead>
                      <TableHead className="w-28 text-center">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredEvents.map((event) => (
                      <TableRow key={event.id}>
                        <TableCell className="text-center">
                          <Checkbox 
                            checked={selectedEvents.has(event.id)}
                            onCheckedChange={() => toggleSelectEvent(event.id)}
                            aria-label={`Select event ${event.id}`}
                          />
                        </TableCell>
                        <TableCell>{event.id}</TableCell>
                        <TableCell>{event.description}</TableCell>
                        <TableCell className="text-center">{event.year}</TableCell>
                        <TableCell>
                          <div className="flex justify-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditEvent(event)}
                              title="Edit event"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteEvent(event.id)}
                              title="Delete event"
                            >
                              <X className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
            <div className="mt-4 text-sm text-muted-foreground">
              {selectedEvents.size} of {filteredEvents.length} events selected
            </div>
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
