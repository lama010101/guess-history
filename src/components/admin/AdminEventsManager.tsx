
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import EventsTable from "./EventsTable";
import EventsToolbar from "./EventsToolbar";
import EventEditor from "./EventEditor";
import { HistoricalImage } from "@/types/game";
import ExcelImporter from "./ExcelImporter";

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
          <div className="flex flex-wrap items-center justify-between gap-4">
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
