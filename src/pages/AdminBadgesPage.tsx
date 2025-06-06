import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Badge as BadgeType } from '@/utils/badges/types';
import { 
  fetchAllBadges, 
  createBadge, 
  updateBadge, 
  deleteBadge 
} from '@/utils/badges/badgeService';
import { initializeBadges } from '@/utils/badges/initialBadges';
import { AlertCircle, Award, Eye, Pencil, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/sonner';
import { BadgeCard } from '@/components/badges/BadgeCard';

type BadgeFormData = Omit<BadgeType, 'id'>;

const AdminBadgesPage = () => {
  const { user } = useAuth();
  const [badges, setBadges] = useState<BadgeType[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [selectedBadge, setSelectedBadge] = useState<BadgeType | null>(null);
  const [formData, setFormData] = useState<BadgeFormData>({
    name: '',
    description: '',
    iconName: 'award',
    category: 'overall',
    difficulty: 'bronze',
    requirementCode: 'games_played',
    requirementValue: 1,
    imageUrl: null
  });
  
  // Check if user is admin
  const isAdmin = user && 
    user.type === 'auth' && // First check if it's an auth user
    !user.isGuest;          // Any authenticated non-guest user can access admin

  useEffect(() => {
    if (!isAdmin) return;
    
    const loadBadges = async () => {
      try {
        const allBadges = await fetchAllBadges();
        setBadges(allBadges);
      } catch (error) {
        console.error('Error loading badges:', error);
        toast.error('Failed to load badges');
      } finally {
        setLoading(false);
      }
    };
    
    loadBadges();
  }, [isAdmin]);
  
  const handleOpenCreateDialog = () => {
    setFormMode('create');
    setSelectedBadge(null);
    setFormData({
      name: '',
      description: '',
      iconName: 'award',
      category: 'overall',
      difficulty: 'bronze',
      requirementCode: 'games_played',
      requirementValue: 1,
      imageUrl: null
    });
    setIsDialogOpen(true);
  };
  
  const handleOpenEditDialog = (badge: BadgeType) => {
    setFormMode('edit');
    setSelectedBadge(badge);
    setFormData({
      name: badge.name,
      description: badge.description,
      iconName: badge.iconName,
      category: badge.category,
      difficulty: badge.difficulty,
      requirementCode: badge.requirementCode,
      requirementValue: badge.requirementValue,
      imageUrl: badge.imageUrl
    });
    setIsDialogOpen(true);
  };
  
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (formMode === 'create') {
        // Create new badge
        const newBadgeId = await createBadge(formData);
        if (newBadgeId) {
          const newBadge: BadgeType = {
            id: newBadgeId,
            ...formData
          };
          setBadges([...badges, newBadge]);
          toast.success('Badge created successfully');
        } else {
          toast.error('Failed to create badge');
        }
      } else if (formMode === 'edit' && selectedBadge) {
        // Update existing badge
        const updatedBadge: BadgeType = {
          id: selectedBadge.id,
          ...formData
        };
        const success = await updateBadge(updatedBadge);
        if (success) {
          setBadges(badges.map(b => b.id === updatedBadge.id ? updatedBadge : b));
          toast.success('Badge updated successfully');
        } else {
          toast.error('Failed to update badge');
        }
      }
      
      setIsDialogOpen(false);
    } catch (error) {
      console.error('Error submitting badge form:', error);
      toast.error('An error occurred');
    }
  };
  
  const handleDeleteBadge = async (badgeId: string) => {
    if (!confirm('Are you sure you want to delete this badge?')) return;
    
    try {
      const success = await deleteBadge(badgeId);
      if (success) {
        setBadges(badges.filter(b => b.id !== badgeId));
        toast.success('Badge deleted successfully');
      } else {
        toast.error('Failed to delete badge');
      }
    } catch (error) {
      console.error('Error deleting badge:', error);
      toast.error('An error occurred');
    }
  };
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };
  
  const handleSelectChange = (name: string, value: string) => {
    setFormData({
      ...formData,
      [name]: value
    });
  };
  
  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: parseInt(value, 10)
    });
  };
  
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
      <h1 className="text-2xl font-bold mb-8 text-history-primary">Admin: Badges Dashboard</h1>
      
      {/* Stats Summary */}
      <div className="glass-card rounded-xl p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-history-primary">Badge Management</h2>
          <div className="flex gap-2">
            <Button variant="outline" onClick={async () => {
              if (confirm('This will create all default badges. Continue?')) {
                try {
                  await initializeBadges();
                  toast.success('Badges initialized');
                  // Reload badges
                  const allBadges = await fetchAllBadges();
                  setBadges(allBadges);
                } catch (error) {
                  console.error('Error initializing badges:', error);
                  toast.error('Error initializing badges');
                }
              }
            }}>
              Initialize Default Badges
            </Button>
            <Button onClick={handleOpenCreateDialog}>
              <Plus className="mr-2 h-4 w-4" />
              Create Badge
            </Button>
          </div>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 bg-secondary/20 rounded-lg text-center">
            <div className="text-3xl font-bold">{badges.length}</div>
            <div className="text-sm text-muted-foreground">Total Badges</div>
          </div>
          <div className="p-4 bg-green-500/20 rounded-lg text-center">
            <div className="text-3xl font-bold">{badges.filter(b => b.difficulty === 'bronze').length}</div>
            <div className="text-sm text-muted-foreground">Bronze Badges</div>
          </div>
          <div className="p-4 bg-yellow-500/20 rounded-lg text-center">
            <div className="text-3xl font-bold">{badges.filter(b => b.difficulty === 'silver').length}</div>
            <div className="text-sm text-muted-foreground">Silver Badges</div>
          </div>
          <div className="p-4 bg-amber-500/20 rounded-lg text-center">
            <div className="text-3xl font-bold">{badges.filter(b => b.difficulty === 'gold').length}</div>
            <div className="text-sm text-muted-foreground">Gold Badges</div>
          </div>
        </div>
      </div>
      
      {/* Badge List */}
      <div className="glass-card rounded-xl p-6">
        <h3 className="text-lg font-semibold mb-6 text-history-primary">All Badges</h3>
        
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin h-8 w-8 border-4 border-history-primary border-t-transparent rounded-full"></div>
          </div>
        ) : badges.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No badges found. Create your first badge!
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {badges.map(badge => (
              <div key={badge.id} className="bg-white dark:bg-gray-800 rounded-lg p-4 flex items-center shadow-sm">
                <div className="flex-shrink-0 mr-4">
                  <BadgeCard 
                    badge={badge} 
                    earned={true} 
                    size="sm" 
                    showProgress={false}
                  />
                </div>
                
                <div className="flex-grow space-y-1">
                  <h4 className="font-semibold">{badge.name}</h4>
                  <p className="text-sm text-muted-foreground">{badge.description}</p>
                  <div className="flex flex-wrap gap-2 text-xs">
                    <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded">
                      {badge.category}
                    </span>
                    <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded">
                      {badge.difficulty}
                    </span>
                    <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded">
                      {badge.requirementCode}: {badge.requirementValue}
                    </span>
                  </div>
                </div>
                
                <div className="flex-shrink-0 space-x-2">
                  <Button variant="ghost" size="icon" onClick={() => handleOpenEditDialog(badge)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDeleteBadge(badge.id)}>
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Badge Form Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>
              {formMode === 'create' ? 'Create New Badge' : 'Edit Badge'}
            </DialogTitle>
            <DialogDescription>
              Fill in the details for this badge.
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleFormSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Badge Name</Label>
                  <Input 
                    id="name" 
                    name="name" 
                    value={formData.name}
                    onChange={handleInputChange} 
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="iconName">Icon Name</Label>
                  <Input 
                    id="iconName" 
                    name="iconName" 
                    value={formData.iconName} 
                    onChange={handleInputChange} 
                    required
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea 
                  id="description" 
                  name="description" 
                  value={formData.description} 
                  onChange={handleInputChange} 
                  required
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select 
                    name="category" 
                    value={formData.category} 
                    onValueChange={(value) => handleSelectChange('category', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="time">Time</SelectItem>
                      <SelectItem value="location">Location</SelectItem>
                      <SelectItem value="streak">Streak</SelectItem>
                      <SelectItem value="perfect">Perfect</SelectItem>
                      <SelectItem value="challenge">Challenge</SelectItem>
                      <SelectItem value="overall">Overall</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="difficulty">Difficulty</Label>
                  <Select 
                    name="difficulty" 
                    value={formData.difficulty} 
                    onValueChange={(value) => handleSelectChange('difficulty', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select difficulty" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bronze">Bronze</SelectItem>
                      <SelectItem value="silver">Silver</SelectItem>
                      <SelectItem value="gold">Gold</SelectItem>
                      <SelectItem value="platinum">Platinum</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="requirementCode">Requirement Type</Label>
                  <Select 
                    name="requirementCode" 
                    value={formData.requirementCode} 
                    onValueChange={(value) => handleSelectChange('requirementCode', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select requirement" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="games_played">Games Played</SelectItem>
                      <SelectItem value="perfect_rounds">Perfect Rounds</SelectItem>
                      <SelectItem value="perfect_games">Perfect Games</SelectItem>
                      <SelectItem value="time_accuracy">Time Accuracy</SelectItem>
                      <SelectItem value="location_accuracy">Location Accuracy</SelectItem>
                      <SelectItem value="overall_accuracy">Overall Accuracy</SelectItem>
                      <SelectItem value="win_streak">Win Streak</SelectItem>
                      <SelectItem value="daily_streak">Daily Streak</SelectItem>
                      <SelectItem value="xp_total">Total XP</SelectItem>
                      <SelectItem value="year_bullseye">Year Bullseye</SelectItem>
                      <SelectItem value="location_bullseye">Location Bullseye</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="requirementValue">Requirement Value</Label>
                  <Input 
                    id="requirementValue" 
                    name="requirementValue" 
                    type="number"
                    min="1"
                    value={formData.requirementValue} 
                    onChange={handleNumberChange} 
                    required
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="imageUrl">Image URL (Optional)</Label>
                <Input 
                  id="imageUrl" 
                  name="imageUrl" 
                  value={formData.imageUrl || ''} 
                  onChange={handleInputChange} 
                  placeholder="https://example.com/badge-image.png"
                />
              </div>
            </div>
            
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">
                {formMode === 'create' ? 'Create Badge' : 'Update Badge'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminBadgesPage; 