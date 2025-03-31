
import { useState } from "react";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { HistoricalImage } from "@/types/game";
import { Edit, Search, Trash2, Image as ImageIcon } from "lucide-react";

interface EventsTableProps {
  events: HistoricalImage[];
  selectedEvents: Set<number>;
  isAllSelected: boolean;
  searchTerm: string;
  onToggleSelectEvent: (id: number) => void;
  onToggleSelectAll: () => void;
  onEdit: (event: HistoricalImage) => void;
  onDelete: (id: number) => void;
  onSearchChange: (term: string) => void;
}

const EventsTable = ({ 
  events, 
  selectedEvents,
  isAllSelected,
  searchTerm,
  onToggleSelectEvent,
  onToggleSelectAll,
  onEdit, 
  onDelete,
  onSearchChange
}: EventsTableProps) => {
  const [confirmingDelete, setConfirmingDelete] = useState<number | null>(null);

  const handleConfirmDelete = (id: number) => {
    onDelete(id);
    setConfirmingDelete(null);
  };

  const handleCancelDelete = () => {
    setConfirmingDelete(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search events..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox 
                  checked={isAllSelected}
                  onCheckedChange={onToggleSelectAll}
                  aria-label="Select all events"
                />
              </TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Year</TableHead>
              <TableHead>Address</TableHead>
              <TableHead>Country</TableHead>
              <TableHead>Image</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {events.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  No events found.
                </TableCell>
              </TableRow>
            ) : (
              events.map((event) => (
                <TableRow key={event.id} className={selectedEvents.has(event.id) ? "bg-primary/5" : ""}>
                  <TableCell>
                    <Checkbox 
                      checked={selectedEvents.has(event.id)}
                      onCheckedChange={() => onToggleSelectEvent(event.id)}
                      aria-label={`Select event ${event.id}`}
                    />
                  </TableCell>
                  <TableCell className="font-medium line-clamp-1" title={event.title || event.description}>
                    {event.title || event.description}
                  </TableCell>
                  <TableCell>{event.year}</TableCell>
                  <TableCell className="line-clamp-1" title={event.locationName}>
                    {event.locationName}
                  </TableCell>
                  <TableCell className="line-clamp-1" title={event.country}>
                    {event.country}
                  </TableCell>
                  <TableCell>
                    {event.src ? (
                      <div className="relative h-10 w-16 overflow-hidden rounded border">
                        <img
                          src={event.src}
                          alt={event.title || "Event image"}
                          className="h-full w-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = "https://via.placeholder.com/160x100?text=Error";
                          }}
                        />
                      </div>
                    ) : (
                      <div className="flex h-10 w-16 items-center justify-center rounded border bg-muted">
                        <ImageIcon className="h-4 w-4 text-muted-foreground" />
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {confirmingDelete === event.id ? (
                      <div className="flex items-center justify-end space-x-2">
                        <Button 
                          variant="destructive" 
                          size="sm"
                          onClick={() => handleConfirmDelete(event.id)}
                        >
                          Confirm
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={handleCancelDelete}
                        >
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-end space-x-2">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => onEdit(event)}
                          className="h-8 w-8"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => setConfirmingDelete(event.id)}
                          className="h-8 w-8"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default EventsTable;
