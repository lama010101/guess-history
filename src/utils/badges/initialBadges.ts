
import { createBadge } from './badgeService';
import { BadgeCategory, BadgeDifficulty, BadgeRequirementCode } from './types';

export async function initializeBadges(): Promise<boolean> {
  try {
    console.log('Initializing default badges...');
    
    // Define the default badges
    const defaultBadges = [
      // Time/Year Badges
      {
        name: "Time Traveler I",
        description: "Get within 5 years of the actual date on 10 rounds",
        iconName: "clock",
        category: "time" as BadgeCategory,
        difficulty: "bronze" as BadgeDifficulty,
        requirementCode: "time_accuracy" as BadgeRequirementCode,
        requirementValue: 10,
      },
      {
        name: "Time Traveler II",
        description: "Get within 5 years of the actual date on 50 rounds",
        iconName: "clock",
        category: "time" as BadgeCategory,
        difficulty: "silver" as BadgeDifficulty,
        requirementCode: "time_accuracy" as BadgeRequirementCode,
        requirementValue: 50,
      },
      {
        name: "Time Traveler III",
        description: "Get within 5 years of the actual date on 100 rounds",
        iconName: "clock",
        category: "time" as BadgeCategory,
        difficulty: "gold" as BadgeDifficulty,
        requirementCode: "time_accuracy" as BadgeRequirementCode,
        requirementValue: 100,
      },
      
      // Location Badges
      {
        name: "Cartographer I",
        description: "Get within 100km of the actual location on 10 rounds",
        iconName: "map-pin",
        category: "location" as BadgeCategory,
        difficulty: "bronze" as BadgeDifficulty,
        requirementCode: "location_accuracy" as BadgeRequirementCode,
        requirementValue: 10,
      },
      {
        name: "Cartographer II",
        description: "Get within 100km of the actual location on 50 rounds",
        iconName: "map-pin",
        category: "location" as BadgeCategory,
        difficulty: "silver" as BadgeDifficulty,
        requirementCode: "location_accuracy" as BadgeRequirementCode,
        requirementValue: 50,
      },
      {
        name: "Cartographer III",
        description: "Get within 100km of the actual location on 100 rounds",
        iconName: "map-pin",
        category: "location" as BadgeCategory,
        difficulty: "gold" as BadgeDifficulty,
        requirementCode: "location_accuracy" as BadgeRequirementCode,
        requirementValue: 100,
      },
      
      // Perfect Badges
      {
        name: "Precision I",
        description: "Get a perfect score on 1 round",
        iconName: "target",
        category: "perfect" as BadgeCategory,
        difficulty: "bronze" as BadgeDifficulty,
        requirementCode: "perfect_rounds" as BadgeRequirementCode,
        requirementValue: 1,
      },
      {
        name: "Precision II",
        description: "Get a perfect score on 5 rounds",
        iconName: "target",
        category: "perfect" as BadgeCategory,
        difficulty: "silver" as BadgeDifficulty,
        requirementCode: "perfect_rounds" as BadgeRequirementCode,
        requirementValue: 5,
      },
      {
        name: "Precision III",
        description: "Get a perfect score on 10 rounds",
        iconName: "target",
        category: "perfect" as BadgeCategory,
        difficulty: "gold" as BadgeDifficulty,
        requirementCode: "perfect_rounds" as BadgeRequirementCode,
        requirementValue: 10,
      },
      
      // Streak Badges
      {
        name: "Streak I",
        description: "Play for 3 days in a row",
        iconName: "flame",
        category: "streak" as BadgeCategory,
        difficulty: "bronze" as BadgeDifficulty,
        requirementCode: "daily_streak" as BadgeRequirementCode,
        requirementValue: 3,
      },
      {
        name: "Streak II",
        description: "Play for 7 days in a row",
        iconName: "flame",
        category: "streak" as BadgeCategory,
        difficulty: "silver" as BadgeDifficulty,
        requirementCode: "daily_streak" as BadgeRequirementCode,
        requirementValue: 7,
      },
      {
        name: "Streak III",
        description: "Play for 30 days in a row",
        iconName: "flame",
        category: "streak" as BadgeCategory,
        difficulty: "gold" as BadgeDifficulty,
        requirementCode: "daily_streak" as BadgeRequirementCode,
        requirementValue: 30,
      },
      
      // Challenge Badges
      {
        name: "Competitor I",
        description: "Win 5 friend challenges",
        iconName: "trophy",
        category: "challenge" as BadgeCategory,
        difficulty: "bronze" as BadgeDifficulty,
        requirementCode: "win_streak" as BadgeRequirementCode,
        requirementValue: 5,
      },
      {
        name: "Competitor II",
        description: "Win 15 friend challenges",
        iconName: "trophy",
        category: "challenge" as BadgeCategory,
        difficulty: "silver" as BadgeDifficulty,
        requirementCode: "win_streak" as BadgeRequirementCode,
        requirementValue: 15,
      },
      {
        name: "Competitor III",
        description: "Win 30 friend challenges",
        iconName: "trophy",
        category: "challenge" as BadgeCategory,
        difficulty: "gold" as BadgeDifficulty,
        requirementCode: "win_streak" as BadgeRequirementCode,
        requirementValue: 30,
      },
      
      // Overall Badges
      {
        name: "Historian I",
        description: "Complete 10 games",
        iconName: "book",
        category: "overall" as BadgeCategory,
        difficulty: "bronze" as BadgeDifficulty,
        requirementCode: "games_played" as BadgeRequirementCode,
        requirementValue: 10,
      },
      {
        name: "Historian II",
        description: "Complete 50 games",
        iconName: "book",
        category: "overall" as BadgeCategory,
        difficulty: "silver" as BadgeDifficulty,
        requirementCode: "games_played" as BadgeRequirementCode,
        requirementValue: 50,
      },
      {
        name: "Historian III",
        description: "Complete 100 games",
        iconName: "book",
        category: "overall" as BadgeCategory,
        difficulty: "gold" as BadgeDifficulty,
        requirementCode: "games_played" as BadgeRequirementCode,
        requirementValue: 100,
      },
    ];
    
    // Create each badge
    for (const badge of defaultBadges) {
      await createBadge(badge);
    }
    
    console.log('Default badges initialized successfully');
    return true;
  } catch (error) {
    console.error('Error initializing default badges:', error);
    return false;
  }
}
