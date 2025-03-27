
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import EventsTable from "./EventsTable";
import EventsToolbar from "./EventsToolbar";
import EventEditor from "./EventEditor";
import { HistoricalImage } from "@/types/game";

const AdminEventsManager = () => {
  const { toast } = useToast();
  const [events, setEvents] = useState<HistoricalImage[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<HistoricalImage | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedEvents, setSelectedEvents] = useState<Set<number>>(new Set());
  const [searchTerm, setSearchTerm] = useState("");
  const [isAllSelected, setIsAllSelected] = useState(false);

  // Load events from localStorage on mount
  useEffect(() => {
    loadEvents();
  }, []);

  // Load events from localStorage
  const loadEvents = () => {
    const savedEventsJson = localStorage.getItem('savedEvents');
    if (savedEventsJson) {
      try {
        const loadedEvents = JSON.parse(savedEventsJson);
        setEvents(loadedEvents);
      } catch (error) {
        console.error('Error parsing saved events:', error);
        setEvents([]);
      }
    }
  };

  // Save events to localStorage
  const saveEvents = async (eventsToSave: HistoricalImage[]) => {
    try {
      localStorage.setItem('savedEvents', JSON.stringify(eventsToSave));
      return true;
    } catch (error) {
      console.error('Error saving events:', error);
      return false;
    }
  };

  // Event actions
  const handleAddEvent = () => {
    const newId = events.length > 0 ? Math.max(...events.map(e => e.id)) + 1 : 1;
    
    const newEvent: HistoricalImage = {
      id: newId,
      title: '',
      description: '',
      year: 2000,
      location: { lat: 0, lng: 0 },
      locationName: '',
      src: 'https://via.placeholder.com/800x500?text=Select+Image'
    };
    
    setSelectedEvent(newEvent);
    setIsEditing(true);
  };

  const handleEditEvent = (event: HistoricalImage) => {
    setSelectedEvent(event);
    setIsEditing(true);
  };

  const handleDeleteEvent = async (id: number) => {
    const updatedEvents = events.filter(e => e.id !== id);
    setEvents(updatedEvents);
    await saveEvents(updatedEvents);
    
    toast({
      title: "Event deleted",
      description: "The event has been removed from your collection."
    });
  };

  // Validate Wikimedia URL
  const validateAndFixWikimediaUrl = (url: string): string => {
    if (!url) return url;
    
    // Check if it's a wikimedia URL but in the wrong format
    if (url.includes('wikimedia.org/wiki/')) {
      // Extract the filename
      const fileNameMatch = url.match(/File:([^/]+)$/);
      if (fileNameMatch && fileNameMatch[1]) {
        const fileName = fileNameMatch[1];
        return `https://commons.wikimedia.org/wiki/Special:FilePath/${fileName}?width=800`;
      }
    }
    
    return url;
  };

  // Check if country field exists, and if not, extract it from locationName
  const ensureCountryField = (event: HistoricalImage): HistoricalImage => {
    if (!event.locationName) return event;
    
    const updatedEvent = { ...event };
    
    // If no country specified, try to extract from locationName
    if (!updatedEvent.country) {
      const parts = event.locationName.split(',');
      if (parts.length > 1) {
        updatedEvent.country = parts[parts.length - 1].trim();
      } else {
        updatedEvent.country = event.locationName.trim();
      }
    }
    
    return updatedEvent;
  };

  // Validate event data
  const validateEvent = (event: HistoricalImage): { valid: boolean; message?: string } => {
    // Check for required fields
    if (!event.title || !event.title.trim()) {
      return { valid: false, message: "Title is required" };
    }
    
    if (!event.year || event.year < 1000 || event.year > new Date().getFullYear()) {
      return { valid: false, message: "Valid year is required" };
    }
    
    if (!event.location || typeof event.location.lat !== 'number' || typeof event.location.lng !== 'number') {
      return { valid: false, message: "Valid location coordinates are required" };
    }
    
    if (!event.src || !event.src.trim() || event.src === 'https://via.placeholder.com/800x500?text=Select+Image') {
      return { valid: false, message: "Image URL is required" };
    }
    
    // Validate image URL
    if (!event.src.startsWith('https://commons.wikimedia.org/')) {
      return { valid: false, message: "Image URL must start with https://commons.wikimedia.org/" };
    }
    
    return { valid: true };
  };

  const handleSaveEvent = async (event: HistoricalImage) => {
    // First, ensure country field and fix wikimedia URL
    const processedEvent = ensureCountryField(event);
    processedEvent.src = validateAndFixWikimediaUrl(processedEvent.src);
    
    // Validate the event
    const validation = validateEvent(processedEvent);
    if (!validation.valid) {
      toast({
        title: "Validation Error",
        description: validation.message,
        variant: "destructive"
      });
      return;
    }
    
    // Check if this is an update or a new event
    const eventExists = events.some(e => e.id === processedEvent.id);
    
    let updatedEvents: HistoricalImage[];
    
    if (eventExists) {
      updatedEvents = events.map(e => e.id === processedEvent.id ? processedEvent : e);
    } else {
      updatedEvents = [...events, processedEvent];
    }
    
    setEvents(updatedEvents);
    await saveEvents(updatedEvents);
    
    setIsEditing(false);
    setSelectedEvent(null);
    
    toast({
      title: eventExists ? "Event updated" : "Event added",
      description: eventExists 
        ? "Your changes have been saved." 
        : "The new event has been added to your collection."
    });
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setSelectedEvent(null);
  };

  const handleDeleteSelected = () => {
    // Implement deletion of selected events
    const updatedEvents = events.filter(e => !selectedEvents.has(e.id));
    setEvents(updatedEvents);
    saveEvents(updatedEvents);
    setSelectedEvents(new Set());
    
    toast({
      title: "Events deleted",
      description: `${selectedEvents.size} events have been removed.`
    });
  };

  const handleSaveSelectedToDB = () => {
    // Save selected events to database (localStorage in this case)
    const selectedEventsArray = events.filter(e => selectedEvents.has(e.id));
    saveEvents(selectedEventsArray);
    
    toast({
      title: "Events saved",
      description: `${selectedEvents.size} events have been saved to the database.`
    });
  };

  const handleImportExcel = async (importedEvents: HistoricalImage[]) => {
    // Process and validate imported events
    const validEvents: HistoricalImage[] = [];
    const invalidEvents: HistoricalImage[] = [];
    
    // Process each imported event
    for (const newEvent of importedEvents) {
      // Fix URL if needed
      newEvent.src = validateAndFixWikimediaUrl(newEvent.src);
      
      // Ensure country field
      const processedEvent = ensureCountryField(newEvent);
      
      // Validate the event
      const validation = validateEvent(processedEvent);
      if (validation.valid) {
        validEvents.push(processedEvent);
      } else {
        invalidEvents.push(processedEvent);
      }
    }
    
    if (invalidEvents.length > 0) {
      toast({
        title: "Some events were not imported",
        description: `${invalidEvents.length} events had invalid data and were not imported.`,
        variant: "destructive"
      });
    }
    
    if (validEvents.length === 0) {
      toast({
        title: "No valid events found",
        description: "None of the imported events had valid data. Check the URLs and try again.",
        variant: "destructive"
      });
      setIsUploading(false);
      return;
    }
    
    // Combine existing events with new valid ones
    let updatedEvents = [...events];
    
    // Process each valid imported event
    validEvents.forEach(newEvent => {
      // Check if this event already exists by checking if there's an event with the same source
      const existingEventIndex = updatedEvents.findIndex(e => e.src === newEvent.src);
      
      if (existingEventIndex >= 0) {
        // Update existing event
        updatedEvents[existingEventIndex] = {
          ...updatedEvents[existingEventIndex],
          ...newEvent,
          id: updatedEvents[existingEventIndex].id // Keep the original ID
        };
      } else {
        // Add new event
        updatedEvents.push(newEvent);
      }
    });
    
    // Save all events
    setEvents(updatedEvents);
    await saveEvents(updatedEvents);
    
    // Stop loading indicator
    setIsUploading(false);
    
    toast({
      title: "Import complete",
      description: `${validEvents.length} events were imported successfully.`
    });
  };

  const handleImageUpload = () => {
    toast({
      title: "Image Upload",
      description: "This feature is not yet implemented.",
    });
  };

  const handleToggleSelectEvent = (id: number) => {
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

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedEvents(new Set());
    } else {
      const allIds = events.map(event => event.id);
      setSelectedEvents(new Set(allIds));
    }
    setIsAllSelected(!isAllSelected);
  };

  const handleSearchChange = (term: string) => {
    setSearchTerm(term);
  };

  return (
    <div className="space-y-6">
      {isEditing ? (
        <EventEditor 
          selectedEvent={selectedEvent} 
          isAddingEvent={!selectedEvent?.id}
          onSave={handleSaveEvent} 
          onCancel={handleCancelEdit}
          onImageUpload={handleImageUpload}
          onFileUpload={() => setIsUploading(true)}
        />
      ) : (
        <>
          <div className="flex items-center justify-between gap-4">
            <EventsToolbar 
              onAddEvent={handleAddEvent}
              onDeleteSelected={handleDeleteSelected}
              onSaveSelectedToDB={handleSaveSelectedToDB}
              onImportComplete={handleImportExcel}
              isUploading={isUploading}
              setIsUploading={setIsUploading}
              isSaving={isSaving}
              selectedEventsCount={selectedEvents.size}
            />
          </div>
          
          <EventsTable 
            events={events} 
            onEdit={handleEditEvent} 
            onDelete={handleDeleteEvent}
            selectedEvents={selectedEvents}
            onToggleSelectEvent={handleToggleSelectEvent}
            onToggleSelectAll={handleToggleSelectAll}
            isAllSelected={isAllSelected}
            searchTerm={searchTerm}
            onSearchChange={handleSearchChange}
          />
        </>
      )}
    </div>
  );
};

export default AdminEventsManager;
