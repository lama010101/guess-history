
import { useState, useEffect } from "react";
import { HistoricalImage } from "@/types/game";
import { useToast } from "@/hooks/use-toast";

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

export function useEvents() {
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

  const processImageUrl = (url: string): string => {
    if (url.includes('wikimedia.org/wiki/File:')) {
      const fileNameMatch = url.match(/File:([^/]+)$/);
      if (fileNameMatch && fileNameMatch[1]) {
        const fileName = fileNameMatch[1];
        return `https://commons.wikimedia.org/wiki/Special:FilePath/${fileName}?width=800`;
      }
    }
    return url;
  };

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

  const handleSaveEvent = (eventData: Partial<HistoricalImage>) => {
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

  const handleSaveSelectedToDB = () => {
    setIsSaving(true);
    
    const eventsToSave = events.filter(event => selectedEvents.has(event.id));
    
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

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedEvents(new Set());
    } else {
      const allIds = events.map(event => event.id);
      setSelectedEvents(new Set(allIds));
    }
    setIsAllSelected(!isAllSelected);
  };

  const handleImageUpload = () => {
    toast({
      title: "Image Upload",
      description: "This feature is not yet implemented.",
    });
  };

  const handleFileUpload = () => {
    setIsUploading(true);
  };

  const filteredEvents = events.filter(event => 
    (event.description && event.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (event.title && event.title.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (event.locationName && event.locationName.toLowerCase().includes(searchTerm.toLowerCase())) ||
    event.year.toString().includes(searchTerm)
  );

  return {
    events: filteredEvents,
    selectedEvents,
    selectedEvent,
    isAddingEvent,
    isUploading,
    isSaving,
    isAllSelected,
    searchTerm,
    showDeleteDialog,
    handleAddEvent,
    handleEditEvent,
    handleDeleteEvent,
    handleDeleteSelected,
    confirmDeleteSelected,
    handleSaveEvent,
    handleCancelEdit,
    handleSaveSelectedToDB,
    handleImportExcelData,
    toggleSelectEvent,
    toggleSelectAll,
    setSearchTerm,
    setShowDeleteDialog,
    handleImageUpload,
    handleFileUpload,
    setIsUploading
  };
}
