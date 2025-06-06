import React from 'react';
import { Badge, BadgeCategory } from '@/utils/badges/types';
import { BadgeCard } from './BadgeCard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface BadgeGridProps {
  badges: {
    badge: Badge;
    earned: boolean;
    progress: number;
  }[];
  showAllTabs?: boolean;
  showProgress?: boolean;
  defaultCategory?: BadgeCategory | 'all';
  emptyMessage?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const BadgeGrid: React.FC<BadgeGridProps> = ({
  badges,
  showAllTabs = true,
  showProgress = true,
  defaultCategory = 'all',
  emptyMessage = 'No badges found',
  size = 'md',
}) => {
  // Group badges by category
  const categories = badges.reduce<Record<string, typeof badges>>((acc, item) => {
    const category = item.badge.category;
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(item);
    return acc;
  }, { all: badges });

  // Get unique categories
  const uniqueCategories = Object.keys(categories).filter(cat => cat !== 'all');

  return (
    <div>
      {showAllTabs ? (
        <Tabs defaultValue={defaultCategory}>
          <TabsList className="mb-6">
            <TabsTrigger value="all">All</TabsTrigger>
            {uniqueCategories.map(category => (
              <TabsTrigger key={category} value={category}>
                {category.charAt(0).toUpperCase() + category.slice(1)}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="all" className="mt-0">
            {renderBadges(badges, emptyMessage, showProgress, size)}
          </TabsContent>

          {uniqueCategories.map(category => (
            <TabsContent key={category} value={category} className="mt-0">
              {renderBadges(categories[category], emptyMessage, showProgress, size)}
            </TabsContent>
          ))}
        </Tabs>
      ) : (
        renderBadges(badges, emptyMessage, showProgress, size)
      )}
    </div>
  );
};

function renderBadges(
  badges: { badge: Badge; earned: boolean; progress: number }[],
  emptyMessage: string,
  showProgress: boolean,
  size: 'sm' | 'md' | 'lg'
) {
  if (badges.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">{emptyMessage}</div>
    );
  }

  // Sort badges: earned first, then by category
  const sortedBadges = [...badges].sort((a, b) => {
    if (a.earned && !b.earned) return -1;
    if (!a.earned && b.earned) return 1;
    return a.badge.name.localeCompare(b.badge.name);
  });

  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4">
      {sortedBadges.map((item) => (
        <BadgeCard
          key={item.badge.id}
          badge={item.badge}
          earned={item.earned}
          progress={item.progress}
          showProgress={showProgress}
          size={size}
        />
      ))}
    </div>
  );
} 