
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import EventsTable from "./EventsTable";
import EventsToolbar from "./EventsToolbar";
import EventEditor from "./EventEditor";
import { HistoricalImage } from "@/types/game";
import { useEvents } from "@/hooks/useEvents";
import ExcelImporter from "./ExcelImporter";

const AdminEventsManager = () => {
  const { toast } = useToast();
  const [events, setEvents] = useState<HistoricalImage[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<HistoricalImage | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const { loadEvents, saveEvents } = useEvents();

  // Load events on mount
  useEffect(() => {
    const fetchEvents = async () => {
      const loadedEvents = await loadEvents();
      setEvents(loadedEvents);
    };
    
    fetchEvents();
  }, [loadEvents]);

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

  const handleEditEvent = (id: number) => {
    const event = events.find(e => e.id === id);
    if (event) {
      setSelectedEvent(event);
      setIsEditing(true);
    }
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

  const handleSaveEvent = async (event: HistoricalImage) => {
    // Check if this is an update or a new event
    const eventExists = events.some(e => e.id === event.id);
    
    let updatedEvents: HistoricalImage[];
    
    if (eventExists) {
      updatedEvents = events.map(e => e.id === event.id ? event : e);
    } else {
      updatedEvents = [...events, event];
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

  const handleImportExcel = async (importedEvents: HistoricalImage[]) => {
    // Combine existing events with new ones
    let updatedEvents = [...events];
    
    // Process each imported event
    importedEvents.forEach(newEvent => {
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
      description: `${importedEvents.length} events were imported successfully.`
    });
  };

  return (
    <div className="space-y-6">
      {isEditing ? (
        <EventEditor 
          event={selectedEvent} 
          onSave={handleSaveEvent} 
          onCancel={handleCancelEdit} 
        />
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <EventsToolbar onAddEvent={handleAddEvent} />
            <div className="ml-auto">
              <ExcelImporter 
                onImportComplete={handleImportExcel}
                isUploading={isUploading}
                setIsUploading={setIsUploading}
              />
            </div>
          </div>
          
          <EventsTable 
            events={events} 
            onEdit={handleEditEvent} 
            onDelete={handleDeleteEvent} 
          />
        </>
      )}
    </div>
  );
};

export default AdminEventsManager;
