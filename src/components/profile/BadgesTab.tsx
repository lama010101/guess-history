import React from 'react';
import { BadgeGrid } from '@/components/badges/BadgeGrid';
import { BadgeEvaluation } from '@/utils/badges/types';

interface BadgesTabProps {
  badgeEvaluations: BadgeEvaluation[];
  isLoading: boolean;
}

const BadgesTab: React.FC<BadgesTabProps> = ({ badgeEvaluations, isLoading }) => {
  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin h-8 w-8 border-4 border-history-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }
  
  return (
    <div className="glass-card rounded-xl p-6">
      <h3 className="text-lg font-semibold mb-4 text-history-primary dark:text-history-light">Your Badges</h3>
      
      <BadgeGrid 
        badges={badgeEvaluations.map(evaluation => ({
          badge: evaluation.badge,
          earned: evaluation.earned,
          progress: evaluation.progress
        }))}
        defaultCategory="all"
        showProgress={true}
        emptyMessage="No badges available yet. Keep playing to earn badges!"
      />
    </div>
  );
};

export default BadgesTab; 