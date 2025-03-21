
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { 
  Table, TableHeader, TableRow, TableHead, 
  TableBody, TableCell 
} from "@/components/ui/table";
import { Search, Edit, X, Image } from "lucide-react";
import { HistoricalImage } from "@/types/game";

interface EventsTableProps {
  events: HistoricalImage[];
  selectedEvents: Set<number>;
  onToggleSelectEvent: (id: number) => void;
  onToggleSelectAll: () => void;
  onEdit: (event: HistoricalImage) => void;
  onDelete: (id: number) => void;
  isAllSelected: boolean;
  searchTerm: string;
  onSearchChange: (term: string) => void;
}

const EventsTable = ({
  events,
  selectedEvents,
  onToggleSelectEvent,
  onToggleSelectAll,
  onEdit,
  onDelete,
  isAllSelected,
  searchTerm,
  onSearchChange
}: EventsTableProps) => {
  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search events..."
          className="pl-8"
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>

      {events.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          No events found. Add some events to get started.
        </div>
      ) : (
        <div className="border rounded-md overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted">
                <TableHead className="w-12 text-center">
                  <Checkbox 
                    checked={isAllSelected && events.length > 0} 
                    onCheckedChange={onToggleSelectAll}
                    aria-label="Select all events"
                  />
                </TableHead>
                <TableHead className="w-12">#</TableHead>
                <TableHead className="w-16">Image</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="w-24">Location</TableHead>
                <TableHead className="w-20 text-center">Year</TableHead>
                <TableHead className="w-28 text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {events.map((event) => (
                <TableRow key={event.id}>
                  <TableCell className="text-center">
                    <Checkbox 
                      checked={selectedEvents.has(event.id)}
                      onCheckedChange={() => onToggleSelectEvent(event.id)}
                      aria-label={`Select event ${event.id}`}
                      id={`select-event-${event.id}`} // Add unique ID to fix selection issue
                    />
                  </TableCell>
                  <TableCell>{event.id}</TableCell>
                  <TableCell>
                    {event.src ? (
                      <div className="w-12 h-12 rounded overflow-hidden">
                        <img 
                          src={event.src} 
                          alt={event.description || 'Event image'} 
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.src = "https://via.placeholder.com/60?text=No+Image";
                          }}
                        />
                      </div>
                    ) : (
                      <div className="w-12 h-12 rounded bg-muted flex items-center justify-center">
                        <Image className="h-6 w-6 text-muted-foreground" />
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="max-w-[300px] truncate">
                    {event.title ? <strong>{event.title}</strong> : null}
                    {event.title && event.description ? <br /> : null}
                    {event.description}
                  </TableCell>
                  <TableCell className="max-w-[120px] truncate">
                    {event.locationName || (event.location ? `${event.location.lat.toFixed(2)}, ${event.location.lng.toFixed(2)}` : '-')}
                  </TableCell>
                  <TableCell className="text-center">{event.year}</TableCell>
                  <TableCell>
                    <div className="flex justify-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onEdit(event)}
                        title="Edit event"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onDelete(event.id)}
                        title="Delete event"
                      >
                        <X className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      <div className="mt-4 text-sm text-muted-foreground">
        {selectedEvents.size} of {events.length} events selected
      </div>
    </div>
  );
};

export default EventsTable;
