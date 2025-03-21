
import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, FileSpreadsheet, Save, RefreshCw, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { HistoricalImage } from "@/types/game";
import EventsTable from "./EventsTable";
import EventEditor from "./EventEditor";
import ExcelImporter from "./ExcelImporter";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const mockEvents: HistoricalImage[] = [
  {
    id: 1,
    src: "https://images.unsplash.com/photo-1565711561500-49678a10a63f?q=80&w=2940&auto=format&fit=crop",
    year: 1950,
    location: { lat: 48.8584, lng: 2.2945 },
    description: "One of the most iconic landmarks in the world",
    title: "Eiffel Tower",
    locationName: "Paris, France"
  },
  {
    id: 2,
    src: "https://images.unsplash.com/photo-1568797629192-789acf8e4df3?q=80&w=3174&auto=format&fit=crop",
    year: 1932,
    location: { lat: 40.7484, lng: -73.9857 },
    description: "A defining part of the New York City skyline",
    title: "Empire State Building",
    locationName: "New York, USA"
  },
  {
    id: 3,
    src: "https://images.unsplash.com/photo-1526711657229-e7e080961425?q=80&w=2832&auto=format&fit=crop",
    year: 1969,
    location: { lat: 37.8199, lng: -122.4783 },
    description: "The famous suspension bridge connecting San Francisco and Marin County",
    title: "Golden Gate Bridge",
    locationName: "San Francisco, USA"
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
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  useEffect(() => {
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

  const handleDeleteSelected = () => {
    setShowDeleteDialog(true);
  };

  const confirmDeleteSelected = () => {
    const remainingEvents = events.filter(event => !selectedEvents.has(event.id));
    setEvents(remainingEvents);
    setSelectedEvents(new Set());
    setIsAllSelected(false);
    setShowDeleteDialog(false);
    
    toast({
      title: "Events Deleted",
      description: `${selectedEvents.size} events have been removed.`,
    });
  };

  const processImageUrl = (url: string): string => {
    // Process Wikimedia Commons URLs
    if (url.includes('wikimedia.org/wiki/File:')) {
      // Extract file name
      const fileNameMatch = url.match(/File:([^/]+)$/);
      if (fileNameMatch && fileNameMatch[1]) {
        const fileName = fileNameMatch[1];
        // Convert to direct image URL using Wikimedia thumbnail API
        return `https://commons.wikimedia.org/wiki/Special:FilePath/${fileName}?width=800`;
      }
    }
    return url;
  };

  const handleSaveEvent = (eventData: Partial<HistoricalImage>) => {
    // Process image URL if it's from Wikimedia Commons
    if (eventData.src) {
      eventData.src = processImageUrl(eventData.src);
    }
    
    if (selectedEvent) {
      setEvents(events.map(event => 
        event.id === selectedEvent.id 
          ? { ...event, ...eventData } 
          : event
      ));
    } else {
      const newEvent: HistoricalImage = {
        id: events.length > 0 ? Math.max(...events.map(e => e.id)) + 1 : 1,
        src: eventData.src || "https://via.placeholder.com/500",
        year: eventData.year || 2000,
        location: eventData.location || { lat: 0, lng: 0 },
        description: eventData.description || "New Event",
        title: eventData.title || "",
        locationName: eventData.locationName || ""
      };
      setEvents([...events, newEvent]);
    }
    
    toast({
      title: "Event Saved",
      description: "Changes have been saved successfully.",
    });
    
    setSelectedEvent(null);
    setIsAddingEvent(false);
  };

  const handleCancelEdit = () => {
    setSelectedEvent(null);
    setIsAddingEvent(false);
  };

  const handleImageUpload = () => {
    toast({
      title: "Image Upload",
      description: "Image upload functionality would be implemented here.",
    });
  };

  const handleFileUpload = () => {
    toast({
      title: "File Upload",
      description: "File upload functionality would be implemented here.",
    });
  };

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedEvents(new Set());
    } else {
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
    
    const eventsToSave = events.filter(event => selectedEvents.has(event.id));
    
    // Process any Wikimedia URLs
    const processedEvents = eventsToSave.map(event => ({
      ...event,
      src: event.src ? processImageUrl(event.src) : event.src
    }));
    
    setTimeout(() => {
      localStorage.setItem('savedEvents', JSON.stringify(processedEvents));
      setSavedEvents(processedEvents);
      
      setIsSaving(false);
      toast({
        title: "Events Saved to Database",
        description: `${selectedEvents.size} events have been saved to the database.`,
      });
    }, 1000);
  };

  const handleImportExcelData = (newEventsData: HistoricalImage[]) => {
    console.log("Importing new events from Excel:", newEventsData);
    
    // Process any Wikimedia URLs in imported events
    const processedNewEvents = newEventsData.map(event => ({
      ...event,
      id: events.length > 0 ? Math.max(...events.map(e => e.id)) + 1 + newEventsData.indexOf(event) : 1 + newEventsData.indexOf(event),
      src: event.src ? processImageUrl(event.src) : event.src
    }));
    
    setEvents(prev => [...prev, ...processedNewEvents]);
    
    const newIds = processedNewEvents.map(event => event.id);
    setSelectedEvents(prev => {
      const newSet = new Set(prev);
      newIds.forEach(id => newSet.add(id));
      return newSet;
    });
    
    toast({
      title: "Upload Successful",
      description: `${processedNewEvents.length} events have been added from the Excel file.`,
    });
    
    setIsUploading(false);
  };

  const filteredEvents = events.filter(event => 
    (event.description && event.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (event.title && event.title.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (event.locationName && event.locationName.toLowerCase().includes(searchTerm.toLowerCase())) ||
    event.year.toString().includes(searchTerm)
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
                  onClick={handleDeleteSelected} 
                  disabled={selectedEvents.size === 0}
                  variant="destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Selected
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
              Manage historical events and images for the game. Upload an Excel file with columns: description, year, latitude, longitude, imageUrl, title, locationName, country.
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

        <EventEditor 
          selectedEvent={selectedEvent}
          isAddingEvent={isAddingEvent}
          onSave={handleSaveEvent}
          onCancel={handleCancelEdit}
          onImageUpload={handleImageUpload}
          onFileUpload={handleFileUpload}
        />
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              You are about to delete {selectedEvents.size} selected events. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteSelected} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminEventsManager;
