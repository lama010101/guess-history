
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import EventsTable from "./EventsTable";
import EventsToolbar from "./EventsToolbar";
import EventEditor from "./EventEditor";
import { HistoricalImage } from "@/types/game";
import { supabase } from "@/integrations/supabase/client";

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
    loadEventsFromSupabase();
  }, []);

  const loadEventsFromSupabase = async () => {
    try {
      const { data, error } = await supabase
        .from('historical_events')
        .select('*')
        .eq('deleted', false)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error loading events from Supabase:', error);
        toast({
          title: "Error loading events",
          description: "Could not load events from the database"
        });
        
        // Try loading from local storage as fallback
        loadEventsFromLocalStorage();
        return;
      }
      
      if (data && data.length > 0) {
        // Transform data to match our HistoricalImage interface
        const transformedEvents: HistoricalImage[] = data.map((item, index) => ({
          id: index + 1,
          title: item.location_name || '',
          description: item.description || '',
          year: item.year || 2000,
          location: { 
            lat: parseFloat(item.latitude) || 0, 
            lng: parseFloat(item.longitude) || 0 
          },
          locationName: item.location_name || '',
          country: item.country || '',
          src: item.image_url || 'https://via.placeholder.com/800x500?text=No+Image'
        }));
        
        setEvents(transformedEvents);
      } else {
        // No data in Supabase, try loading from local storage
        loadEventsFromLocalStorage();
      }
    } catch (error) {
      console.error('Error in loadEventsFromSupabase:', error);
      loadEventsFromLocalStorage();
    }
  };
  
  const loadEventsFromLocalStorage = () => {
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

  const saveEventsToSupabase = async (eventsToSave: HistoricalImage[]) => {
    try {
      setIsSaving(true);
      
      // Check if bucket exists, create if not
      const { data: bucketData } = await supabase.storage.listBuckets();
      if (!bucketData?.find(b => b.name === 'historical_images')) {
        await supabase.storage.createBucket('historical_images', {
          public: true
        });
      }
      
      // Process each event
      for (const event of eventsToSave) {
        // Check if the image is already in Supabase Storage
        const isStorageUrl = event.src && 
          (event.src.includes('storage.googleapis.com') || 
           event.src.includes(window.location.hostname));
           
        let finalImageUrl = event.src;
        
        // If it's not already in storage and it's a remote URL, download and re-upload
        if (!isStorageUrl && event.src && event.src.startsWith('http')) {
          try {
            // Fetch the image
            const imageResponse = await fetch(event.src);
            const imageBlob = await imageResponse.blob();
            
            // Create a unique filename
            const fileName = `event_${event.id}_${Date.now()}.${imageResponse.headers.get('content-type')?.split('/')[1] || 'jpg'}`;
            const filePath = `historical_images/${fileName}`;
            
            // Upload to Supabase Storage
            const { error: uploadError } = await supabase.storage
              .from('historical_images')
              .upload(filePath, imageBlob);
              
            if (uploadError) {
              console.error('Error uploading image to storage:', uploadError);
              continue;
            }
            
            // Get the public URL
            const { data: urlData } = supabase.storage
              .from('historical_images')
              .getPublicUrl(filePath);
              
            finalImageUrl = urlData.publicUrl;
          } catch (error) {
            console.error('Error processing image:', error);
            // Continue with the original URL if there's an error
          }
        }
        
        // Insert or update in the historical_events table
        const { error } = await supabase
          .from('historical_events')
          .upsert({
            description: event.description,
            year: event.year,
            latitude: event.location.lat,
            longitude: event.location.lng,
            location_name: event.locationName,
            country: event.country || '',
            image_url: finalImageUrl,
            deleted: false
          });
          
        if (error) {
          console.error('Error saving event to Supabase:', error);
          toast({
            title: "Error saving event",
            description: `Could not save event: ${error.message}`,
            variant: "destructive"
          });
        }
      }
      
      setIsSaving(false);
      toast({
        title: "Events saved",
        description: `${eventsToSave.length} events have been saved to the database.`
      });
      
      // Refresh events from database
      loadEventsFromSupabase();
      return true;
    } catch (error) {
      console.error('Error saving events to Supabase:', error);
      setIsSaving(false);
      
      // Fall back to localStorage
      localStorage.setItem('savedEvents', JSON.stringify(eventsToSave));
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
      country: '',
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
    
    // Also mark as deleted in Supabase
    const eventToDelete = events.find(e => e.id === id);
    if (eventToDelete) {
      try {
        // Soft delete by setting deleted=true
        await supabase
          .from('historical_events')
          .update({ deleted: true })
          .eq('description', eventToDelete.description)
          .eq('location_name', eventToDelete.locationName);
      } catch (error) {
        console.error('Error deleting event from Supabase:', error);
      }
    }
    
    localStorage.setItem('savedEvents', JSON.stringify(updatedEvents));
    
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
    
    if (!event.country) {
      return { valid: false, message: "Country is required" };
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
    
    // Save to Supabase
    await saveEventsToSupabase([processedEvent]);
    
    // Also save to localStorage as backup
    localStorage.setItem('savedEvents', JSON.stringify(updatedEvents));
    
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
    
    // Save to localStorage
    localStorage.setItem('savedEvents', JSON.stringify(updatedEvents));
    
    // Also mark as deleted in Supabase
    const eventsToDelete = events.filter(e => selectedEvents.has(e.id));
    if (eventsToDelete.length > 0) {
      eventsToDelete.forEach(async (event) => {
        try {
          await supabase
            .from('historical_events')
            .update({ deleted: true })
            .eq('description', event.description)
            .eq('location_name', event.locationName);
        } catch (error) {
          console.error('Error deleting event from Supabase:', error);
        }
      });
    }
    
    setSelectedEvents(new Set());
    
    toast({
      title: "Events deleted",
      description: `${selectedEvents.size} events have been removed.`
    });
  };

  const handleSaveSelectedToDB = async () => {
    setIsSaving(true);
    const selectedEventsArray = events.filter(e => selectedEvents.has(e.id));
    
    const success = await saveEventsToSupabase(selectedEventsArray);
    
    setIsSaving(false);
    
    if (success) {
      toast({
        title: "Events saved",
        description: `${selectedEvents.size} events have been saved to the database.`
      });
    } else {
      toast({
        title: "Error saving to database",
        description: "Events saved to local storage as a fallback.",
        variant: "destructive"
      });
    }
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
        // Generate new id
        const newId = updatedEvents.length > 0 ? Math.max(...updatedEvents.map(e => e.id)) + 1 : 1;
        updatedEvents.push({
          ...newEvent,
          id: newId
        });
      }
    });
    
    setEvents(updatedEvents);
    
    // Save to Supabase
    await saveEventsToSupabase(validEvents);
    
    // Also save to localStorage as backup
    localStorage.setItem('savedEvents', JSON.stringify(updatedEvents));
    
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

  // Filter events based on search term
  const filteredEvents = searchTerm 
    ? events.filter(event => 
        (event.title && event.title.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (event.description && event.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (event.locationName && event.locationName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (event.country && event.country.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (event.year && event.year.toString().includes(searchTerm))
      )
    : events;

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
            events={filteredEvents} 
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
