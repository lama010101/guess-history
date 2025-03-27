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

  useEffect(() => {
    loadEvents();
  }, []);

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

  const saveEvents = async (eventsToSave: HistoricalImage[]) => {
    try {
      localStorage.setItem('savedEvents', JSON.stringify(eventsToSave));
      return true;
    } catch (error) {
      console.error('Error saving events:', error);
      return false;
    }
  };

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

  const validateAndFixWikimediaUrl = (url: string): string => {
    if (!url) return url;
    
    if (url.includes('wikimedia.org/wiki/')) {
      const fileNameMatch = url.match(/File:([^/]+)$/);
      if (fileNameMatch && fileNameMatch[1]) {
        const fileName = fileNameMatch[1];
        return `https://commons.wikimedia.org/wiki/Special:FilePath/${fileName}?width=800`;
      }
    }
    
    return url;
  };

  const ensureCountryField = (event: HistoricalImage): HistoricalImage => {
    if (!event.locationName) return event;
    
    const updatedEvent = { ...event };
    
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

  const validateEvent = (event: HistoricalImage): { valid: boolean; message?: string } => {
    if (!event.title || !event.title.trim()) {
      return { valid: false, message: "Title is required" };
    }
    
    if (!event.year || event.year < 1000 || event.year > new Date().getFullYear()) {
      return { valid: false, message: "Valid year is required" };
    }
    
    if (!event.location || typeof event.location.lat !== 'number' || typeof event.location.lng !== 'number' ||
        isNaN(event.location.lat) || isNaN(event.location.lng)) {
      return { valid: false, message: "Valid location coordinates are required" };
    }
    
    if (!event.src || !event.src.trim() || event.src === 'https://via.placeholder.com/800x500?text=Select+Image') {
      return { valid: false, message: "Image URL is required" };
    }
    
    if (!event.src.startsWith('https://commons.wikimedia.org/')) {
      return { 
        valid: false, 
        message: "Image URL must be from Wikimedia Commons (https://commons.wikimedia.org/)" 
      };
    }
    
    return { valid: true };
  };

  const handleSaveEvent = async (event: HistoricalImage) => {
    const processedEvent = ensureCountryField(event);
    processedEvent.src = validateAndFixWikimediaUrl(processedEvent.src);
    
    const validation = validateEvent(processedEvent);
    if (!validation.valid) {
      toast({
        title: "Validation Error",
        description: validation.message,
        variant: "destructive"
      });
      return;
    }
    
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
    const selectedEventsArray = events.filter(e => selectedEvents.has(e.id));
    saveEvents(selectedEventsArray);
    
    toast({
      title: "Events saved",
      description: `${selectedEvents.size} events have been saved to the database.`
    });
  };

  const handleImportExcel = async (importedEvents: HistoricalImage[]) => {
    const validEvents: HistoricalImage[] = [];
    const invalidEvents: HistoricalImage[] = [];
    
    for (const newEvent of importedEvents) {
      newEvent.src = validateAndFixWikimediaUrl(newEvent.src);
      
      const processedEvent = ensureCountryField(newEvent);
      
      const validation = validateEvent(processedEvent);
      if (validation.valid) {
        validEvents.push(processedEvent);
      } else {
        console.log(`Invalid event: ${validation.message}`, processedEvent);
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
    
    let updatedEvents = [...events];
    
    validEvents.forEach(newEvent => {
      const existingEventIndex = updatedEvents.findIndex(e => e.src === newEvent.src);
      
      if (existingEventIndex >= 0) {
        updatedEvents[existingEventIndex] = {
          ...updatedEvents[existingEventIndex],
          ...newEvent,
          id: updatedEvents[existingEventIndex].id
        };
      } else {
        updatedEvents.push(newEvent);
      }
    });
    
    setEvents(updatedEvents);
    await saveEvents(updatedEvents);
    
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
