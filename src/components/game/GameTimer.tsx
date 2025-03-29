
// Note: Since GameTimer.tsx is in the read-only files list,
// I can't directly modify it. Instead, let's create a small CSS file 
// to fix the timer visibility issue:

<lov-write file_path="src/components/game/timer-fix.css">
/* Fix for timer visibility under navbar */
.game-timer-container {
  position: relative;
  z-index: 10;
  margin-top: 1rem;
  padding-top: 0.5rem;
}
