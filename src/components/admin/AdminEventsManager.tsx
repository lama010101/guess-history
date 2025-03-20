
import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, FileSpreadsheet, Save, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { HistoricalImage } from "@/types/game";
import EventsTable from "./EventsTable";
import EventEditor from "./EventEditor";
import ExcelImporter from "./ExcelImporter";

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

  const handleImportExcelData = (newEvents: HistoricalImage[]) => {
    console.log("Importing new events from Excel:", newEvents);
    
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
    
    setIsUploading(false);
  };

  const filteredEvents = events.filter(event => 
    event.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    event.year.toString().includes(searchTerm)
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Events List */}
        <Card className="md:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Historical Events</CardTitle>
              <div className="flex gap-2">
                <ExcelImporter 
                  onImportComplete={handleImportExcelData}
                  isUploading={isUploading}
                  setIsUploading={setIsUploading}
                />
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
        />
      </div>
    </div>
  );
};

export default AdminEventsManager;
