
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import ResultsLayout2 from "@/components/layouts/ResultsLayout2";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";

const TestResultsPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const gameId = searchParams.get('id');

  useEffect(() => {
    // If there's no game ID, we still show results but could show a message
    if (!gameId) {
      console.log('No game ID provided for results');
    }
  }, [gameId]);

  const handleNext = () => {
    navigate('/test/final');
  };

  const mockResult = {
    xpTotal: 850,
    locationAccuracy: 80,
    timeAccuracy: 90,
    eventLat: 40.7128,
    eventLng: -74.0060, // New York
    guessLat: 40.7128,
    guessLng: -74.0060,
    eventYear: 2020,
    guessYear: 2021,
    distanceKm: 111,
    yearDifference: 1,
    isCorrect: false,
    imageUrl: 'https://placehold.co/600x400',
    imageTitle: 'Mock Image Title',
    imageDescription: 'This is a mock image for testing purposes.',
    locationName: 'New York, USA',
  };

  const mockPeers = [
    {
      userId: 'peer-1',
      displayName: 'Alice',
      guessLat: 34.0522,
      guessLng: -118.2437, // Los Angeles
      distanceKm: 3935,
      guessYear: 2018,
			roundScore: 500,
			gameScore: 2500,
			streak: 2,
    },
    {
      userId: 'peer-2',
      displayName: 'Bob',
      guessLat: 41.8781,
      guessLng: -87.6298, // Chicago
      distanceKm: 1145,
      guessYear: 2022,
			roundScore: 750,
			gameScore: 3250,
			streak: 0,
    },
  ];

  return <ResultsLayout2 
    loading={false}
    error={null}
    result={mockResult}
    peers={mockPeers}
    round={1}
    totalRounds={5}
    nextRoundButton={<Button onClick={handleNext}>Next Round</Button>}
  />;
};

export default TestResultsPage;
