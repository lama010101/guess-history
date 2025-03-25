
import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Search, Plus, Trash, Edit, Upload, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { sampleImages } from '@/data/sampleImages';

const AdminEventsManager = () => {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [events, setEvents] = useState(sampleImages);
  const [selectedEvents, setSelectedEvents] = useState<number[]>([]);
  const [showAddEvent, setShowAddEvent] = useState(false);
  
  // Helper to extract just the country from location name
  const getCountryOnly = (locationName?: string): string => {
    if (!locationName) return "N/A";
    
    // Split by comma and get the last part which is usually the country
    const parts = locationName.split(',');
    return parts.length > 1 ? parts[parts.length - 1].trim() : parts[0].trim();
  };
  
  const formatCoordinates = (lat: number, lng: number): string => {
    return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  };

  const filteredEvents = events.filter(event => 
    event.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    event.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    event.locationName?.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  const handleSelectEvent = (id: number) => {
    setSelectedEvents(prev => 
      prev.includes(id) 
        ? prev.filter(eventId => eventId !== id)
        : [...prev, id]
    );
  };
  
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedEvents(filteredEvents.map(event => event.id));
    } else {
      setSelectedEvents([]);
    }
  };
  
  const handleDeleteSelected = () => {
    setEvents(prev => prev.filter(event => !selectedEvents.includes(event.id)));
    setSelectedEvents([]);
    
    toast({
      title: "Events deleted",
      description: `${selectedEvents.length} event(s) have been deleted.`
    });
  };
  
  const handleExportEvents = () => {
    const eventsToExport = selectedEvents.length > 0
      ? events.filter(event => selectedEvents.includes(event.id))
      : events;
    
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(eventsToExport, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "events.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
    
    toast({
      title: "Events exported",
      description: `${eventsToExport.length} event(s) have been exported.`
    });
  };
  
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Events Manager</h2>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportEvents}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button 
            onClick={() => setShowAddEvent(!showAddEvent)}
            className="gap-1"
          >
            <Plus className="h-4 w-4" />
            Add Event
          </Button>
        </div>
      </div>
      
      <div className="flex justify-between items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search events..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        {selectedEvents.length > 0 && (
          <Button 
            variant="destructive" 
            size="sm"
            onClick={handleDeleteSelected}
          >
            <Trash className="mr-2 h-4 w-4" />
            Delete ({selectedEvents.length})
          </Button>
        )}
      </div>
      
      <div className="border rounded-md">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="py-3 px-4 text-left">
                  <Checkbox 
                    id="selectAll"
                    checked={selectedEvents.length === filteredEvents.length && filteredEvents.length > 0}
                    onCheckedChange={handleSelectAll}
                  />
                </th>
                <th className="py-3 px-4 text-left">#</th>
                <th className="py-3 px-4 text-left">Title</th>
                <th className="py-3 px-4 text-left">Year</th>
                <th className="py-3 px-4 text-left">Country</th>
                <th className="py-3 px-4 text-left">Geocoordinates</th>
                <th className="py-3 px-4 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredEvents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-4 text-center text-muted-foreground">
                    No events found.
                  </td>
                </tr>
              ) : (
                filteredEvents.map((event, index) => (
                  <tr key={event.id} className="border-b hover:bg-muted/50">
                    <td className="py-3 px-4">
                      <Checkbox 
                        id={`event-${event.id}`}
                        checked={selectedEvents.includes(event.id)}
                        onCheckedChange={() => handleSelectEvent(event.id)}
                      />
                    </td>
                    <td className="py-3 px-4">{index + 1}</td>
                    <td className="py-3 px-4 max-w-[200px] truncate" title={event.title}>
                      {event.title || event.description.substring(0, 30) + '...'}
                    </td>
                    <td className="py-3 px-4">{event.year}</td>
                    <td className="py-3 px-4">{getCountryOnly(event.locationName)}</td>
                    <td className="py-3 px-4">{formatCoordinates(event.location.lat, event.location.lng)}</td>
                    <td className="py-3 px-4">
                      <div className="flex gap-2">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="h-8 w-8 p-0"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Add Event section would go here */}
      {showAddEvent && (
        <div className="border rounded-md p-4 mt-4">
          <h3 className="text-lg font-medium mb-4">Add New Event</h3>
          {/* Form for adding events would go here */}
          <div className="text-center p-8 text-muted-foreground">
            <p>Event creation form coming soon!</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminEventsManager;
