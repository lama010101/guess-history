
import { useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Upload, Check, Delete, Edit, Image, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import EventsList from "./EventsList";
import { HistoricalImage } from "@/types/game";

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
  const [events, setEvents] = useState<HistoricalImage[]>(mockEvents);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedEvent, setSelectedEvent] = useState<HistoricalImage | null>(null);
  const [isAddingEvent, setIsAddingEvent] = useState(false);

  const handleFileUpload = () => {
    toast({
      title: "Bulk Upload Feature",
      description: "In production, this would upload an Excel file with event data.",
    });
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
                <Button variant="outline" onClick={handleFileUpload}>
                  <Upload className="mr-2 h-4 w-4" />
                  Bulk Upload
                </Button>
                <Button onClick={handleAddEvent}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Event
                </Button>
              </div>
            </div>
            <CardDescription>
              Manage historical events and images for the game.
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
            <EventsList 
              events={filteredEvents} 
              onEdit={handleEditEvent} 
              onDelete={handleDeleteEvent} 
            />
          </CardContent>
        </Card>

        {/* Event Editor */}
        <Card>
          <CardHeader>
            <CardTitle>
              {isAddingEvent ? "Add New Event" : selectedEvent ? "Edit Event" : "Event Details"}
            </CardTitle>
            <CardDescription>
              {isAddingEvent ? "Create a new historical event" : selectedEvent ? "Modify event details" : "Select an event to edit"}
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
                      <Button variant="outline" size="sm" className="w-full">
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
              <div className="flex items-center justify-center h-48 text-muted-foreground">
                Select an event to edit or add a new one
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
