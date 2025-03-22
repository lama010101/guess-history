
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import EventsTable from "./EventsTable";
import EventEditor from "./EventEditor";
import DeleteEventsDialog from "./DeleteEventsDialog";
import EventsToolbar from "./EventsToolbar";
import { useEvents } from "@/hooks/useEvents";

const AdminEventsManager = () => {
  const {
    events,
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
    handleFileUpload
  } = useEvents();

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Historical Events</CardTitle>
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
            <CardDescription>
              Manage historical events and images for the game. Upload an Excel file with columns: description, year, latitude, longitude, imageUrl, title, locationName, country.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <EventsTable 
              events={events}
              selectedEvents={selectedEvents}
              onToggleSelectEvent={toggleSelectEvent}
              onToggleSelectAll={toggleSelectAll}
              onEdit={handleEditEvent}
              onDelete={handleDeleteEvent}
              isAllSelected={isAllSelected}
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
            />
          </CardContent>
        </Card>

        <EventEditor 
          selectedEvent={selectedEvent}
          isAddingEvent={isAddingEvent}
          onSave={handleSaveEvent}
          onCancel={handleCancelEdit}
          onImageUpload={handleImageUpload}
          onFileUpload={handleFileUpload}
        />
      </div>

      <DeleteEventsDialog 
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        selectedCount={selectedEvents.size}
        onConfirm={confirmDeleteSelected}
      />
    </div>
  );
};

export default AdminEventsManager;
