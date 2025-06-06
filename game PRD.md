1. Introduction1.1 PurposeThe Guess-History game is an online interactive quiz where players view historical images or event descriptions and guess the exact year and location they occurred.
1.2 ScopeCovers core gameplay (single-player and friends challenge), user accounts/profiles, content management, scoring and leaderboards, daily/weekly challenges, analytics, and all backend/frontend requirements.

2. Objectives & Success Metrics
	•	Engagement: ≥ 3 plays/user/week
	•	Retention: ≥ 30% of new players return after one week
	•	Virality: 15% of sessions shared/challenged friends
	•	Accuracy: average time per round < 30 s
	•	Monetization (future): ad interactions or in-app purchases

3. User Personas
	•	History Buff “Alex”Wants deep-dive challenges, cares about accuracy and context.
	•	Casual Player “Riley”Plays quick rounds; motivated by streaks and daily rewards.
	•	Social Gamer “Jordan”Invites friends, competes on leaderboards and share results.

4. Features & User Stories4.1 Account Management
	•	As a user, I can register/log in via email or OAuth (Google/GitHub).
	•	As a user, I can view/edit my profile and see my stats.
4.2 Core Gameplay
	•	As a player, I see a historical image, a map to guess the location, and a slider/input to guess the year (e.g. 1800–2025).
	•	As a player, I submit my guess and immediately see XP and accuracy % in score (e.g. points = max 100 – |actual–guess|).
	•	As a player, I can play N rounds (default N = 5) per session.
4.3 Challenge Modes
	•	Daily Challenge: one shared puzzle per day; global leaderboard.
	•	Friends Challenge: send a link to invite friends to play the same set; compare scores.
4.4 Content Management
	•	Admin interface to upload images, descriptions, correct dates, hints.
	•	Tagging by category (war, discovery, culture, etc.) and difficulty (easy, medium, hard).
4.5 Leaderboards & Achievements
	•	Global and friends-only leaderboards (all-time, weekly, daily).
	•	Badges for streaks, accuracy milestones, challenge wins.
4.6 Notifications & Sharing
	•	Email/web push reminders for new daily challenge.
	•	“Share your score” cards (auto-generated image with score & year).

5. Functional Requirements
ID
Requirement
FR1
User can sign up/sign in (email + OAuth)
FR2
Player can view/play a session of 5 history rounds
FR3
System calculates score based on absolute error
FR4
Daily challenge unlocks at 00:00 UTC+2
FR5
Friends challenge creates unique, shareable URL
FR6
Admin can CRUD historical items (image/text/date/tags/difficulty)
FR7
Leaderboards query top 100 scores for each scope
FR8
Notifications sent via Supabase Edge Functions and web push

6. Non-Functional Requirements
	•	Performance: page load < 2 s, guess submission latency < 300 ms
	•	Reliability: 99.9% uptime; database backups daily
	•	Scalability: auto-scale serverless functions for spikes
	•	Security: OWASP top 10; JWT-based auth; rate-limit APIs
	•	Accessibility: WCAG 2.1 AA compliance

7. System Architecture
	•	Frontend: Next.js React with Tailwind CSS, Vercel hosting
	•	Backend: Supabase (PostgreSQL, Auth, Storage, Edge Functions)
	•	CDN & Storage: Supabase Storage for images; CDN via Vercel
	•	Analytics: Supabase Analytics + Postgres events; optional Google Analytics
7.1 Data Model
	•	Users: id, email, oauth_ids, created_at, stats (games_played, avg_score…)
	•	Items: id, image_url, description, correct_year, tags[], difficulty
	•	Games: id, user_id, mode (solo/daily/friends), start_at, end_at, score
	•	Guesses: id, game_id, item_id, guess_year, actual_year, distance, points

8. User Flow
	1	Landing page → Sign up / Play as Guest
	2	Choose mode: Solo / Daily / Friends
	3	Game screen: show item → guess input → submit → feedback → next
	4	End screen: show total score, leaderboard, share CTA

9. Analytics & Monitoring
	•	Track: session_start, guess_submitted, session_end, share_click
	•	Dashboards: MAU/DAU, retention curves, top content items by plays
	•	Alerts: error rates > 1%, latency > 500 ms

10. Roadmap (phased)
	•	Phase 1 (Alpha): Solo play, basic scoring, Supabase integration
	•	Phase 2 (Beta): Daily challenge, leaderboards, profile pages
	•	Phase 3 (V1.0): Friends challenge, sharing cards, admin CMS
	•	Phase 4 (Growth): Badges/achievements, push notifications, A/B tests

11. Future Extensions
	•	Localization (multi-language content)
	•	Thematic “packs” (genre-based quizzes) as in-app purchases
	•	Mobile app wrapper (iOS/Android)
