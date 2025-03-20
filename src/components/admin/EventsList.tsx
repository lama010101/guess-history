
import { Button } from "@/components/ui/button";
import { Edit, Trash } from "lucide-react";
import { HistoricalImage } from "@/types/game";

interface EventsListProps {
  events: HistoricalImage[];
  onEdit: (event: HistoricalImage) => void;
  onDelete: (id: number) => void;
}

const EventsList = ({ events, onEdit, onDelete }: EventsListProps) => {
  if (events.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No events found. Add some events to get started.
      </div>
    );
  }

  return (
    <div className="border rounded-md overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="bg-muted text-left">
            <th className="px-4 py-2 w-16 text-center">#</th>
            <th className="px-4 py-2">Description</th>
            <th className="px-4 py-2 w-20 text-center">Year</th>
            <th className="px-4 py-2 w-28 text-center">Actions</th>
          </tr>
        </thead>
        <tbody>
          {events.map((event) => (
            <tr key={event.id} className="border-t">
              <td className="px-4 py-3 text-center">{event.id}</td>
              <td className="px-4 py-3">{event.description}</td>
              <td className="px-4 py-3 text-center">{event.year}</td>
              <td className="px-4 py-3">
                <div className="flex justify-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onEdit(event)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDelete(event.id)}
                  >
                    <Trash className="h-4 w-4" />
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default EventsList;
