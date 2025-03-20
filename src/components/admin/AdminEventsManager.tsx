
import { useState, useRef, useCallback, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Plus, Upload, FileSpreadsheet, Save, RefreshCw 
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { HistoricalImage } from "@/types/game";
import * as XLSX from 'xlsx';
import EventsTable from "./EventsTable";
import EventEditor from "./EventEditor";

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
  description?: string;
  year?: number;
  latitude?: number;
  longitude?: number;
  imageUrl?: string;
  location?: string;
  country?: string;
  title?: string;
  [key: string]: any;
}

const AdminEventsManager = () => {
  const { toast } = useToast();
  const [events, setEvents] = useState<HistoricalImage[]>([]);
  const [savedEvents, setSavedEvents] = useState<HistoricalImage[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedEvent, setSelectedEvent] = useState<HistoricalImage | null>(null);
  const [isAddingEvent, setIsAddingEvent] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedEvents, setSelectedEvents] = useState<Set<number>>(new Set());
  const [isAllSelected, setIsAllSelected] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // Load saved events on component mount
  useEffect(() => {
    // In a real application, this would fetch from your backend
    // For now we'll simulate with localStorage
    const savedEventsJson = localStorage.getItem('savedEvents');
    if (savedEventsJson) {
      try {
        const parsed = JSON.parse(savedEventsJson);
        setSavedEvents(parsed);
        setEvents(parsed);
      } catch (e) {
        console.error("Error parsing saved events:", e);
      }
    } else {
      // Use mock data if nothing is saved yet
      setEvents(mockEvents);
    }
  }, []);

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

  const handleSaveEvent = (eventData: Partial<HistoricalImage>) => {
    if (selectedEvent) {
      // Update existing event
      setEvents(events.map(event => 
        event.id === selectedEvent.id 
          ? { ...event, ...eventData } 
          : event
      ));
    } else {
      // Add new event
      const newEvent: HistoricalImage = {
        id: events.length > 0 ? Math.max(...events.map(e => e.id)) + 1 : 1,
        src: eventData.src || "https://via.placeholder.com/500",
        year: eventData.year || 2000,
        location: eventData.location || { lat: 0, lng: 0 },
        description: eventData.description || "New Event"
      };
      setEvents([...events, newEvent]);
    }
    
    toast({
      title: "Event Saved",
      description: "Changes have been saved successfully.",
    });
    
    // Reset form
    setSelectedEvent(null);
    setIsAddingEvent(false);
  };

  const handleCancelEdit = () => {
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
    
    // Get selected events
    const eventsToSave = events.filter(event => selectedEvents.has(event.id));
    
    // In a real app, this would send to your backend
    // For now, we'll simulate with localStorage
    setTimeout(() => {
      // Merge with existing saved events (avoiding duplicates by id)
      const newSavedEvents = [...savedEvents];
      
      eventsToSave.forEach(event => {
        const existingIndex = newSavedEvents.findIndex(e => e.id === event.id);
        if (existingIndex >= 0) {
          newSavedEvents[existingIndex] = event;
        } else {
          newSavedEvents.push(event);
        }
      });
      
      // Save to localStorage
      localStorage.setItem('savedEvents', JSON.stringify(newSavedEvents));
      setSavedEvents(newSavedEvents);
      
      setIsSaving(false);
      toast({
        title: "Events Saved to Database",
        description: `${selectedEvents.size} events have been saved to the database.`,
      });
    }, 1000);
  };

  const processExcelFile = async (file: File) => {
    setIsUploading(true);
    
    try {
      const data = await readExcelFile(file);
      console.log("Parsed Excel data:", data);
      
      if (data && data.length > 0) {
        // Convert Excel data to HistoricalImage format
        const newEvents: HistoricalImage[] = data.map((row, index) => {
          // Handle potential data inconsistencies
          const latitude = typeof row.latitude === 'number' ? row.latitude : parseFloat(String(row.latitude)) || 0;
          const longitude = typeof row.longitude === 'number' ? row.longitude : parseFloat(String(row.longitude)) || 0;
          const year = typeof row.year === 'number' ? row.year : parseInt(String(row.year)) || 2000;
          
          // Generate a unique ID
          const newId = events.length > 0 ? Math.max(...events.map(e => e.id)) + index + 1 : index + 1;
          
          // Build a description that includes the title and location if available
          let description = row.description || '';
          if (row.title && !description.includes(row.title)) {
            description = description ? `${row.title} - ${description}` : row.title;
          }
          if (row.location && !description.includes(row.location)) {
            description = description ? `${description} (${row.location})` : row.location;
          }
          
          return {
            id: newId,
            description: description || 'Unknown location',
            year: year,
            location: { 
              lat: latitude, 
              lng: longitude 
            },
            src: row.imageUrl || 'https://via.placeholder.com/500'
          };
        });
        
        console.log("Converted to HistoricalImages:", newEvents);
        
        // Add new events to the list
        setEvents(prev => [...prev, ...newEvents]);
        
        // Auto-select the newly imported events
        const newIds = newEvents.map(event => event.id);
        setSelectedEvents(prev => {
          const newSet = new Set(prev);
          newIds.forEach(id => newSet.add(id));
          return newSet;
        });
        
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
          
          // Get raw data with headers
          const rawData = XLSX.utils.sheet_to_json(worksheet, { 
            header: 1, 
            raw: false,
            defval: ""
          });
          
          console.log("Raw Excel data with headers:", rawData);
          
          if (rawData.length < 2) {
            throw new Error("Excel file must have at least a header row and one data row");
          }
          
          // Extract header row and normalize headers
          const headers = (rawData[0] as string[]).map(header => 
            String(header).toLowerCase().trim()
          );
          
          console.log("Normalized headers:", headers);
          
          // Map column indices to our expected fields
          const fieldMap: Record<string, string> = {};
          
          // Define variations of each field name we want to capture
          const fieldVariations: Record<string, string[]> = {
            description: ['description', 'desc', 'text', 'info', 'details', 'caption'],
            title: ['title', 'name', 'heading', 'subject'],
            year: ['year', 'date', 'time', 'period', 'era'],
            latitude: ['latitude', 'lat', 'y', 'yloc'],
            longitude: ['longitude', 'lng', 'long', 'x', 'xloc'],
            imageUrl: ['imageurl', 'image', 'img', 'url', 'src', 'picture', 'photo'],
            location: ['location', 'place', 'city', 'town', 'address', 'site', 'spot'],
            country: ['country', 'nation', 'land', 'territory', 'state']
          };
          
          // Map each header to our expected fields if possible
          headers.forEach((header, index) => {
            for (const [field, variations] of Object.entries(fieldVariations)) {
              if (variations.some(v => header.includes(v))) {
                fieldMap[index] = field;
                break;
              }
            }
          });
          
          console.log("Field mapping:", fieldMap);
          
          // Process data rows
          const processedData: ExcelImageData[] = [];
          
          for (let i = 1; i < rawData.length; i++) {
            const row = rawData[i] as any[];
            const item: ExcelImageData = {};
            
            // Map each cell to the appropriate field based on the mapping
            for (let j = 0; j < row.length; j++) {
              const field = fieldMap[j];
              if (field) {
                const value = row[j];
                
                // Convert to appropriate type
                if (field === 'year') {
                  item[field] = parseInt(String(value)) || null;
                } else if (field === 'latitude' || field === 'longitude') {
                  item[field] = parseFloat(String(value)) || null;
                } else {
                  item[field] = String(value).trim();
                }
              }
            }
            
            // Only add if we have at least some basic data
            if (
              (item.description || item.title || item.location) && 
              (item.latitude !== null || item.longitude !== null || item.year !== null)
            ) {
              processedData.push(item);
            }
          }
          
          console.log("Processed Excel data:", processedData);
          resolve(processedData);
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
        accept=".xlsx,.xls,.csv" 
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
              Manage historical events and images for the game. Upload an Excel file with columns: description, year, latitude, longitude, imageUrl, title, location.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <EventsTable 
              events={filteredEvents}
              selectedEvents={selectedEvents}
              onToggleSelectEvent={toggleSelectEvent}
              onToggleSelectAll={toggleSelectAll}
              onEdit={handleEditEvent}
              onDelete={handleDeleteEvent}
              isAllSelected={isAllSelected}
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
            />
          </CardContent>
        </Card>

        {/* Event Editor */}
        <EventEditor 
          selectedEvent={selectedEvent}
          isAddingEvent={isAddingEvent}
          onSave={handleSaveEvent}
          onCancel={handleCancelEdit}
          onImageUpload={handleImageUpload}
          onFileUpload={handleFileUpload}
        />
      </div>
    </div>
  );
};

export default AdminEventsManager;
