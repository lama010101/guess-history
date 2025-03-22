
import React, { useEffect } from "react";
import { useEvents } from "@/hooks/useEvents";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import EventsTable from "./EventsTable";
import EventEditor from "./EventEditor";
import DeleteEventsDialog from "./DeleteEventsDialog";
import EventsToolbar from "./EventsToolbar";

const AdminEventsManager = () => {
  const {
    events,
    selectedEvents,
    selectedEvent,
    isAddingEvent,
    isUploading,
    setIsUploading,
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
    setShowDeleteDialog
  } = useEvents();

  // Show a form to add/edit event when selected or adding
  if (selectedEvent || isAddingEvent) {
    return (
      <EventEditor
        event={selectedEvent}
        onSave={handleSaveEvent}
        onCancel={handleCancelEdit}
        isNewEvent={!selectedEvent}
      />
    );
  }

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Toolbar with actions */}
      <div className="flex justify-between">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search events..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
          />
        </div>
        
        <EventsToolbar
          onAddEvent={handleAddEvent}
          onDeleteSelected={handleDeleteSelected}
          onSaveSelectedToDB={handleSaveSelectedToDB}
          onImportComplete={handleImportExcelData}
          isUploading={isUploading}
          setIsUploading={setIsUploading}
          isSaving={isSaving}
          selectedEventsCount={selectedEvents.size}
        />
      </div>

      {/* Main content - events table */}
      <div className="flex-1 overflow-auto border rounded-md">
        <EventsTable
          events={events}
          selectedEvents={selectedEvents}
          isAllSelected={isAllSelected}
          onEditEvent={handleEditEvent}
          onDeleteEvent={handleDeleteEvent}
          onToggleSelect={toggleSelectEvent}
          onToggleSelectAll={toggleSelectAll}
        />
      </div>

      {/* Delete confirmation dialog */}
      <DeleteEventsDialog
        open={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={confirmDeleteSelected}
        count={selectedEvents.size}
      />
    </div>
  );
};

export default AdminEventsManager;
