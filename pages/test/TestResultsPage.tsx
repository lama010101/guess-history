
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

  return <ResultsLayout2 onNext={handleNext} />;
};

export default TestResultsPage;
