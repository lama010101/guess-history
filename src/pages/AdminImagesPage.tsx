import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  AlertCircle, 
  CheckCircle, 
  Image as ImageIcon, 
  User, 
  Trash2, 
  Pencil
} from 'lucide-react';
import { toast } from '@/components/ui/sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Define types for our data structures
interface ImageEntry {
  id: string;
  title: string;
  description: string;
  date: string | null;
  year: number;
  ready: boolean;
  image_url: string; // Changed from url to image_url to match the database schema
  gps: { lat: number; lng: number } | null;
  latitude?: number;
  longitude?: number;
  true_event: boolean;
  mature: boolean;
  mature_content?: boolean;
  ai_generated: boolean;
  storage_file_found: boolean;
  created_at: string;
  location_name: string;
}

interface StorageFile {
  name: string;
  id: string;
  bucketId: string;
  publicUrl: string;
  dbEntryFound: boolean;
  metadata: {
    size: number;
    mimetype: string;
  };
  created_at: string;
  updated_at: string;
}

interface BucketStats {
  total: number;
  ready: number;
  notReady: number;
  missingStorage: number;
}

interface EditableImage {
  id: string;
  image_url: string;
  publicUrl?: string; // Add publicUrl field for displaying images
  title: string;
  description: string;
  year: number;
  location_name: string;
  latitude: number;
  longitude: number;
  gps?: { lat: number; lng: number };
  true_event: boolean;
  mature: boolean;
  mature_content?: boolean; // Database field name
  ai_generated: boolean;
  ready: boolean;
  created_at: string;
  storage_file_found: boolean;
  date: Date | null;
  isEditing: boolean;
}

const AdminImagesPage = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [showOnlyReady, setShowOnlyReady] = useState(false);
  const [activeTab, setActiveTab] = useState('table');
  
  // Data states
  const [imageEntries, setImageEntries] = useState<EditableImage[]>([]);
  const [storageImages, setStorageImages] = useState<StorageFile[]>([]);
  const [storageAvatars, setStorageAvatars] = useState<StorageFile[]>([]);
  const [stats, setStats] = useState<BucketStats>({
    total: 0,
    ready: 0,
    notReady: 0,
    missingStorage: 0
  });

  // Edit states
  const [editedImage, setEditedImage] = useState<EditableImage | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [imageToDelete, setImageToDelete] = useState<EditableImage | null>(null);

  // Check if user is admin
  const isAdmin = user && 
    user.type === 'auth' && // First check if it's an auth user
    !user.isGuest;          // Any authenticated non-guest user can access admin

  // Fetch data from Supabase
  useEffect(() => {
    if (!isAdmin) {
      // Don't load data if not admin
      setLoading(false);
      return;
    }
    
    fetchData();
  }, [isAdmin]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // 1. Fetch image entries from database
      const { data: dbImages, error: dbError } = await supabase
        .from('images')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (dbError) throw dbError;
      
      // 2. Fetch files from images bucket
      const { data: imgFiles, error: imgError } = await supabase
        .storage
        .from('images')
        .list();
      
      if (imgError) throw imgError;
      
      // 3. Fetch files from avatars bucket
      const { data: avatarFiles, error: avatarError } = await supabase
        .storage
        .from('avatars')
        .list();
      
      if (avatarError) throw avatarError;
      
      // Process database entries
      const processedDbEntries: EditableImage[] = dbImages.map(entry => {
        // Get the filename and create the public URL properly
        const filename = entry.image_url.replace('images/', '');
        
        // Create the public URL for the image
        const { data: publicUrlData } = supabase.storage
          .from('images')
          .getPublicUrl(filename);
        
        // Check if the file exists in storage
        const fileExists = imgFiles.some(file => file.name === filename);
        
        return {
          ...entry,
          storage_file_found: fileExists,
          publicUrl: publicUrlData.publicUrl, // Store the public URL in publicUrl
          image_url: entry.image_url, // Keep the original storage path
          // Add missing properties required by ImageEntry
          date: null,
          gps: { lat: entry.latitude, lng: entry.longitude },
          mature: !!entry.mature_content, // Convert to boolean
          isEditing: false
        };
      });
      
      // Process image storage files
      const processedImgFiles = imgFiles.map(file => {
        // Get public URL
        const publicUrl = supabase.storage.from('images').getPublicUrl(file.name).data.publicUrl;
        
        // Check if entry exists in DB
        const dbEntryFound = dbImages.some(entry => 
          entry.image_url.replace('images/', '') === file.name
        );
        
        return {
          ...file,
          bucketId: 'images',
          publicUrl,
          dbEntryFound,
          metadata: {
            size: file.metadata?.size || 0,
            mimetype: file.metadata?.mimetype || 'unknown/unknown'
          },
          created_at: file.created_at || '',
          updated_at: file.updated_at || ''
        } as StorageFile;
      });
      
      // Process avatar storage files
      const processedAvatarFiles = avatarFiles.map(file => {
        // Get public URL
        const publicUrl = supabase.storage.from('avatars').getPublicUrl(file.name).data.publicUrl;
        
        // Avatars don't need DB entries
        return {
          ...file,
          bucketId: 'avatars',
          publicUrl,
          dbEntryFound: true, // Not applicable
          metadata: {
            size: file.metadata?.size || 0,
            mimetype: file.metadata?.mimetype || 'unknown/unknown'
          },
          created_at: file.created_at || '',
          updated_at: file.updated_at || ''
        } as StorageFile;
      });
      
      // Update states
      setImageEntries(processedDbEntries);
      setStorageImages(processedImgFiles);
      setStorageAvatars(processedAvatarFiles);
      
      // Calculate statistics
      setStats({
        total: processedDbEntries.length,
        ready: processedDbEntries.filter(img => img.ready).length,
        notReady: processedDbEntries.filter(img => !img.ready).length,
        missingStorage: processedDbEntries.filter(img => !img.storage_file_found).length
      });
      
      // Log stats to console
      console.log(`Admin Images Report:
        Total images in DB: ${processedDbEntries.length}
        Ready images: ${processedDbEntries.filter(img => img.ready).length}
        Not ready images: ${processedDbEntries.filter(img => !img.ready).length}
        DB entries missing storage files: ${processedDbEntries.filter(img => !img.storage_file_found).length}
        Storage images: ${processedImgFiles.length}
        Storage avatars: ${processedAvatarFiles.length}
        Storage images without DB entry: ${processedImgFiles.filter(img => !img.dbEntryFound).length}
      `);
    } catch (error) {
      console.error('Error fetching admin image data:', error);
      toast.error('Failed to load image data');
    } finally {
      setLoading(false);
    }
  };

  // Toggle ready status for an image
  const toggleReadyStatus = async (image: EditableImage) => {
    try {
      console.log('Toggling ready status for image:', image.id, 'Current ready state:', image.ready);
      
      // Show loading toast
      toast.loading('Updating image status...');
      
      const { data, error } = await supabase
        .from('images')
        .update({ ready: !image.ready })
        .eq('id', image.id)
        .select('*')
        .single();
      
      if (error) {
        console.error('Supabase error updating ready status:', error);
        toast.dismiss();
        toast.error('Failed to update image status');
        throw error;
      }
      
      console.log('Database update response:', data);
      
      // Update local state only after successful DB update
      setImageEntries(prevImages => 
        prevImages.map(img => 
          img.id === image.id 
            ? { 
                ...img, 
                ready: data.ready // Use the value from server response
              } 
            : img
        )
      );
      
      // Update stats
      setStats(prev => ({
        ...prev,
        ready: data.ready ? prev.ready + (image.ready ? 0 : 1) : prev.ready - (image.ready ? 1 : 0),
        notReady: data.ready ? prev.notReady - (image.ready ? 0 : 1) : prev.notReady + (image.ready ? 1 : 0)
      }));
      
      toast.dismiss();
      toast.success(`Image marked as ${data.ready ? 'ready' : 'not ready'}`);
    } catch (error) {
      console.error('Error toggling ready status:', error);
      toast.error('Failed to update image status');
    }
  };

  // Delete image from database and storage
  const deleteImage = async (image: EditableImage) => {
    try {
      // 1. Delete from database
      const { error: dbError } = await supabase
        .from('images')
        .delete()
        .eq('id', image.id);
      
      if (dbError) throw dbError;
      
      // 2. Delete from storage if found
      if (image.storage_file_found) {
        const filename = image.image_url.split('/').pop();
        if (filename) {
          const { error: storageError } = await supabase
            .storage
            .from('images')
            .remove([filename]);
          
          if (storageError) {
            console.error('Error deleting image from storage:', storageError);
            // Continue with UI update even if storage delete fails
          }
        }
      }
      
      // Update local state
      setImageEntries(prevImages => 
        prevImages.filter(img => img.id !== image.id)
      );
      
      // Update stats
      setStats(prev => ({
        ...prev,
        total: prev.total - 1,
        ready: image.ready ? prev.ready - 1 : prev.ready,
        notReady: !image.ready ? prev.notReady - 1 : prev.notReady,
        missingStorage: !image.storage_file_found ? prev.missingStorage - 1 : prev.missingStorage
      }));
      
      setImageToDelete(null);
      setIsDeleteDialogOpen(false);
      
      toast.success('Image deleted successfully');
    } catch (error) {
      console.error('Error deleting image:', error);
      toast.error('Failed to delete image');
    }
  };

  // Open edit dialog
  const openEditDialog = (image: EditableImage) => {
    setEditedImage({...image});
    setIsEditDialogOpen(true);
  };

  // Save edited image
  const saveEditedImage = async () => {
    if (!editedImage) return;
    
    try {
      // Show loading toast
      toast.loading('Saving image changes...');
      
      console.log('Saving edited image:', editedImage.id, 'with data:', {
        title: editedImage.title,
        description: editedImage.description,
        year: editedImage.year,
        location_name: editedImage.location_name,
        latitude: editedImage.gps?.lat,
        longitude: editedImage.gps?.lng,
        true_event: editedImage.true_event,
        mature_content: editedImage.mature,
        ai_generated: editedImage.ai_generated
      });
      
      // Ensure we have valid coordinate values
      const latitude = editedImage.gps?.lat || null;
      const longitude = editedImage.gps?.lng || null;
      
      const { data, error } = await supabase
        .from('images')
        .update({
          title: editedImage.title,
          description: editedImage.description,
          year: editedImage.year,
          location_name: editedImage.location_name,
          latitude,
          longitude,
          true_event: editedImage.true_event,
          mature_content: editedImage.mature,
          ai_generated: editedImage.ai_generated,
        })
        .eq('id', editedImage.id)
        .select('*')
        .single();
      
      if (error) {
        console.error('Supabase error updating image metadata:', error);
        toast.dismiss();
        toast.error('Failed to update image');
        throw error;
      }
      
      console.log('Database update response:', data);
      
      // Update local state with the data returned from the server
      setImageEntries(prevImages => 
        prevImages.map(img => 
          img.id === editedImage.id 
            ? { 
                ...img, 
                title: data.title,
                description: data.description,
                year: data.year,
                location_name: data.location_name,
                gps: { lat: data.latitude, lng: data.longitude },
                true_event: data.true_event,
                mature: data.mature_content, // Map back to UI field
                ai_generated: data.ai_generated,
              } 
            : img
        )
      );
      
      setIsEditDialogOpen(false);
      setEditedImage(null);
      
      toast.dismiss();
      toast.success('Image updated successfully');
    } catch (error) {
      console.error('Error updating image:', error);
      toast.error('Failed to update image');
    }
  };

  // Open delete confirmation dialog
  const openDeleteDialog = (image: EditableImage) => {
    setImageToDelete(image);
    setIsDeleteDialogOpen(true);
  };

  // Filter images based on ready flag
  const filteredImages = showOnlyReady 
    ? imageEntries.filter(img => img.ready)
    : imageEntries;

  if (!isAdmin) {
    return (
      <div className="max-w-4xl mx-auto p-4 pt-8">
        <div className="glass-card rounded-xl p-6 text-center">
          <AlertCircle className="h-16 w-16 mx-auto mb-4 text-red-500" />
          <h1 className="text-2xl font-bold text-red-500 mb-2">Access Denied</h1>
          <p>You don't have permission to view this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-4 pt-8">
      <h1 className="text-2xl font-bold mb-8 text-history-primary">Admin: Images Dashboard</h1>
      
      {/* Stats Summary */}
      <div className="glass-card rounded-xl p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4 text-history-primary">Image Stats</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 bg-secondary/20 rounded-lg text-center">
            <div className="text-3xl font-bold">{stats.total}</div>
            <div className="text-sm text-muted-foreground">Total DB Images</div>
          </div>
          <div className="p-4 bg-green-500/20 rounded-lg text-center">
            <div className="text-3xl font-bold">{stats.ready}</div>
            <div className="text-sm text-muted-foreground">Ready Images</div>
          </div>
          <div className="p-4 bg-yellow-500/20 rounded-lg text-center">
            <div className="text-3xl font-bold">{stats.notReady}</div>
            <div className="text-sm text-muted-foreground">Not Ready</div>
          </div>
          <div className="p-4 bg-red-500/20 rounded-lg text-center">
            <div className="text-3xl font-bold">{stats.missingStorage}</div>
            <div className="text-sm text-muted-foreground">Missing Files</div>
          </div>
        </div>
        <div className="mt-4 text-sm text-muted-foreground">
          <div>Storage Files: {storageImages.length} images, {storageAvatars.length} avatars</div>
          <div>Storage images without DB entries: {storageImages.filter(img => !img.dbEntryFound).length}</div>
        </div>
      </div>
      
      {/* Tabs Navigation */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="table">
            <ImageIcon className="h-4 w-4 mr-2" />
            Images Table
          </TabsTrigger>
          <TabsTrigger value="images">
            <ImageIcon className="h-4 w-4 mr-2" />
            Storage: Images
          </TabsTrigger>
          <TabsTrigger value="avatars">
            <User className="h-4 w-4 mr-2" />
            Storage: Avatars
          </TabsTrigger>
        </TabsList>
        
        {/* Images Table Tab */}
        <TabsContent value="table" className="mt-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-history-primary">Database Images</h2>
            <div className="flex items-center space-x-2">
              <Switch
                id="ready-filter"
                checked={showOnlyReady}
                onCheckedChange={setShowOnlyReady}
              />
              <Label htmlFor="ready-filter">Show only ready</Label>
            </div>
          </div>
          
          <div className="border rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted">
                  <tr>
                    <th className="px-4 py-3 text-left">Preview</th>
                    <th className="px-4 py-3 text-left">ID/Title</th>
                    <th className="px-4 py-3 text-left">Year</th>
                    <th className="px-4 py-3 text-left">Status</th>
                    <th className="px-4 py-3 text-left">Storage</th>
                    <th className="px-4 py-3 text-left">Created</th>
                    <th className="px-4 py-3 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {loading ? (
                    Array(5).fill(0).map((_, i) => (
                      <tr key={`skeleton-${i}`}>
                        <td className="px-4 py-3"><Skeleton className="h-16 w-16" /></td>
                        <td className="px-4 py-3"><Skeleton className="h-6 w-36" /></td>
                        <td className="px-4 py-3"><Skeleton className="h-6 w-16" /></td>
                        <td className="px-4 py-3"><Skeleton className="h-6 w-24" /></td>
                        <td className="px-4 py-3"><Skeleton className="h-6 w-24" /></td>
                        <td className="px-4 py-3"><Skeleton className="h-6 w-24" /></td>
                        <td className="px-4 py-3"><Skeleton className="h-8 w-20" /></td>
                      </tr>
                    ))
                  ) : filteredImages.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-6 text-center text-muted-foreground">
                        No images found
                      </td>
                    </tr>
                  ) : (
                    filteredImages.map(image => (
                      <tr key={image.id} className="hover:bg-muted/50">
                        <td className="px-4 py-3">
                          <div className="flex items-center">
                            {image.storage_file_found ? (
                              <div className="relative w-20 h-20 rounded-md overflow-hidden mr-3">
                                <img 
                                  src={image.publicUrl || image.image_url}
                                  alt={image.title || "Image"}
                                  className="h-full w-full object-cover"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).src = '/placeholder.svg';
                                  }}
                                />
                              </div>
                            ) : (
                              <div className="relative w-20 h-20 bg-gray-200 rounded-md flex items-center justify-center mr-3">
                                <ImageIcon className="h-8 w-8 text-gray-400" />
                                <span className="text-xs text-gray-500 absolute bottom-1">Missing</span>
                              </div>
                            )}
                            <div>
                              <div className="font-medium text-foreground">{image.title || "Untitled"}</div>
                              <div className="text-sm opacity-50">ID: {image.id}</div>
                              {image.year && (
                                <div className="text-sm text-muted-foreground">Year: {image.year}</div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium">{image.title}</div>
                          <div className="text-xs text-muted-foreground">ID: {image.id}</div>
                          <div className="text-xs text-muted-foreground truncate max-w-xs">{image.description}</div>
                        </td>
                        <td className="px-4 py-3">{image.year}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center space-x-2">
                            <Switch
                              checked={image.ready}
                              onCheckedChange={() => toggleReadyStatus(image)}
                              className="data-[state=checked]:bg-green-500"
                            />
                            <Badge variant={image.ready ? "success" : "secondary"}>
                              {image.ready ? "Ready" : "Not Ready"}
                            </Badge>
                          </div>
                          <div className="flex flex-wrap gap-1 mt-2">
                            {image.true_event && <Badge className="text-xs">True Event</Badge>}
                            {image.mature && <Badge variant="destructive" className="text-xs">Mature</Badge>}
                            {image.ai_generated && <Badge className="text-xs bg-purple-500">AI</Badge>}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {image.storage_file_found ? (
                            <div className="flex items-center text-green-500">
                              <CheckCircle className="h-4 w-4 mr-1" />
                              <span>File Found</span>
                            </div>
                          ) : (
                            <div className="flex items-center text-red-500">
                              <AlertCircle className="h-4 w-4 mr-1" />
                              <span>Missing</span>
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          {new Date(image.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openEditDialog(image)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-red-500 hover:text-red-700"
                              onClick={() => openDeleteDialog(image)}
                            >
                              <Trash2 className="h-4 w-4" />
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
        </TabsContent>
        
        {/* Storage Images Tab */}
        <TabsContent value="images" className="mt-6">
          <h2 className="text-xl font-semibold mb-4 text-history-primary">Storage Bucket: Images</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {loading ? (
              Array(8).fill(0).map((_, i) => (
                <div key={`skeleton-img-${i}`} className="border rounded-lg p-3 bg-card">
                  <Skeleton className="h-32 w-full rounded mb-2" />
                  <Skeleton className="h-4 w-24 mb-2" />
                  <Skeleton className="h-4 w-16" />
                </div>
              ))
            ) : storageImages.length === 0 ? (
              <div className="col-span-full text-center py-8 text-muted-foreground">
                No images found in storage
              </div>
            ) : (
              storageImages.map(file => (
                <div key={file.id} className="border rounded-lg p-3 bg-card hover:shadow-md transition-shadow">
                  <div className="h-32 w-full bg-muted rounded-md overflow-hidden mb-2">
                    <img 
                      src={file.publicUrl} 
                      alt={file.name} 
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/placeholder.svg';
                      }}
                    />
                  </div>
                  <div className="text-sm font-medium truncate" title={file.name}>{file.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {(file.metadata.size / 1024).toFixed(1)} KB
                  </div>
                  <div className="mt-2">
                    {file.dbEntryFound ? (
                      <Badge variant="success" className="text-xs">DB Entry Found</Badge>
                    ) : (
                      <Badge variant="destructive" className="text-xs">No DB Entry</Badge>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </TabsContent>
        
        {/* Avatars Tab */}
        <TabsContent value="avatars" className="mt-6">
          <h2 className="text-xl font-semibold mb-4 text-history-primary">Storage Bucket: Avatars</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {loading ? (
              Array(6).fill(0).map((_, i) => (
                <div key={`skeleton-avatar-${i}`} className="border rounded-lg p-3 bg-card">
                  <Skeleton className="h-24 w-24 mx-auto rounded-full mb-2" />
                  <Skeleton className="h-4 w-full mb-2" />
                </div>
              ))
            ) : storageAvatars.length === 0 ? (
              <div className="col-span-full text-center py-8 text-muted-foreground">
                No avatars found in storage
              </div>
            ) : (
              storageAvatars.map(file => (
                <div key={file.id} className="border rounded-lg p-3 bg-card hover:shadow-md transition-shadow">
                  <div className="h-24 w-24 mx-auto bg-muted rounded-full overflow-hidden mb-2">
                    <img 
                      src={file.publicUrl} 
                      alt={file.name} 
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/placeholder.svg';
                      }}
                    />
                  </div>
                  <div className="text-sm font-medium truncate text-center" title={file.name}>{file.name}</div>
                  <div className="text-xs text-muted-foreground text-center">
                    {(file.metadata.size / 1024).toFixed(1)} KB
                  </div>
                </div>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Edit Image Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Image</DialogTitle>
          </DialogHeader>
          {editedImage && (
            <div className="grid gap-4 py-4">
              <div className="flex gap-4">
                <div className="w-1/3">
                  <img 
                    src={editedImage.publicUrl || editedImage.image_url} 
                    alt={editedImage.title} 
                    className="w-full h-auto rounded-md object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/placeholder.svg';
                    }}
                  />
                </div>
                <div className="w-2/3 grid gap-4">
                  <div>
                    <Label htmlFor="title">Title</Label>
                    <Input 
                      id="title" 
                      value={editedImage.title} 
                      onChange={(e) => setEditedImage({...editedImage, title: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="year">Year</Label>
                    <Input 
                      id="year" 
                      type="number" 
                      value={editedImage.year} 
                      onChange={(e) => setEditedImage({...editedImage, year: parseInt(e.target.value)})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="location">Location Name</Label>
                    <Input 
                      id="location" 
                      value={editedImage.location_name} 
                      onChange={(e) => setEditedImage({...editedImage, location_name: e.target.value})}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label htmlFor="latitude">Latitude</Label>
                      <Input 
                        id="latitude" 
                        type="number" 
                        step="0.000001"
                        value={editedImage.gps?.lat} 
                        onChange={(e) => setEditedImage({
                          ...editedImage, 
                          gps: {...editedImage.gps, lat: parseFloat(e.target.value)}
                        })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="longitude">Longitude</Label>
                      <Input 
                        id="longitude" 
                        type="number" 
                        step="0.000001"
                        value={editedImage.gps?.lng} 
                        onChange={(e) => setEditedImage({
                          ...editedImage, 
                          gps: {...editedImage.gps, lng: parseFloat(e.target.value)}
                        })}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea 
                  id="description" 
                  rows={4}
                  value={editedImage.description} 
                  onChange={(e) => setEditedImage({...editedImage, description: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="true_event"
                    checked={editedImage.true_event}
                    onCheckedChange={(checked) => setEditedImage({...editedImage, true_event: checked})}
                  />
                  <Label htmlFor="true_event">True Event</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="mature"
                    checked={editedImage.mature}
                    onCheckedChange={(checked) => setEditedImage({...editedImage, mature: checked})}
                  />
                  <Label htmlFor="mature">Mature Content</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="ai_generated"
                    checked={editedImage.ai_generated}
                    onCheckedChange={(checked) => setEditedImage({...editedImage, ai_generated: checked})}
                  />
                  <Label htmlFor="ai_generated">AI Generated</Label>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
            <Button onClick={saveEditedImage}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p>Are you sure you want to delete this image?</p>
            {imageToDelete && (
              <div className="mt-4 flex items-center gap-4">
                <img 
                  src={imageToDelete.publicUrl || imageToDelete.image_url} 
                  alt={imageToDelete.title} 
                  className="w-20 h-20 object-cover rounded" 
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/placeholder.svg';
                  }}
                />
                <div>
                  <div className="font-medium">{imageToDelete.title}</div>
                  <div className="text-sm text-muted-foreground">Year: {imageToDelete.year}</div>
                </div>
              </div>
            )}
            <p className="mt-4 text-sm text-red-500">This action cannot be undone. The image will be permanently removed from both the database and storage.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>Cancel</Button>
            <Button 
              variant="destructive" 
              onClick={() => imageToDelete && deleteImage(imageToDelete)}
            >
              Delete Image
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Export with the correct name
export default AdminImagesPage; 