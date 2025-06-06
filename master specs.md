
📄 Guess-History: Web App Specifications
🚀 Product Vision
Name: guess-history
Tagline: “guess where & when”
Sub-tagline: “let’s time travel!”

🧠 Core Vision
Build an immersive, educational image-guessing game that blends historical exploration, visual AI intelligence, and social challenge into a smooth, beautiful, and replayable experience.

Players are invited to:

Travel through time and space via compelling, real or AI-generated historical images.

Guess the event's year and location, leveraging deduction, historical knowledge, and intuition.

Compete and collaborate with friends in asynchronous multiplayer.

Unlock depth with badges, combos, themes, and progressive mastery.

📚 Table of Contents
🎮 Game Overview

🕹 Core Gameplay Mechanics

💡 Hints System

🏪 Coin Shop

🧲 Scoring System

🖥 User Interface (UI)

♻️ Game Modes

🧠 Image Intelligence & Data Model

🛡 Technical Stack & Infrastructure

🛠 Admin Panel

🔐 Security

📣 Marketing Strategy

💸 Financial & Monetization Strategy

🌌 Future Vision

🎨 UI Style & Feeling Specification

🎮 Game Overview
🚀 Onboarding

The onboarding experience must be frictionless and fast.

New users can start playing instantly as a guest.

First-time users see a brief 3-step overlay tutorial:

"When?" → Use the horizontal slider to select a year. A large orange number appears above the slider dot.

"Where?" → Scroll the map and tap a point to place your pin. A glowing orange pin (profile image icon) confirms your guess.

"Make Guess" → Tap the orange "Make Guess" button at the bottom to lock in your answer. Results will appear instantly.

Each step highlights the target UI element using a translucent dark overlay and animated orange arrows.

Optional tooltip for the TRUE/REAL bonus appears after the first round, encouraging discovery.

A progress bar or dot stepper at the top shows tutorial progress (1/3, 2/3, 3/3).

Users can skip the tutorial anytime with a "Skip Tutorial" button or close icon.

Tutorial re-accessible from profile → "Help & Tutorial"

Login prompt appears after Round 5 or when user first earns coins or a badge.

All onboarding content is mobile-optimized, fast-loading, and <30 seconds total time.

🎯 Objective

Players are shown historical or AI-generated images and must guess:

WHEN: The year of the event (via slider)

WHERE: The location (precise spot via map)

Bonus challenge:

TRUE / REAL: Determine the accuracy levels:

TRUE: Event historically true

REAL: Image is a photo (vs AI-created)

Both measured from 0 to 100%

👩‍🏫 Audience
For everyone — especially fans of history, geography, AI, and trivia.

🌍 Platform
Web (desktop/mobile)

Supported Browsers: Chrome, Firefox, Safari, Edge

Responsive design optimized for mobile devices

🕹 Core Gameplay Mechanics
📦 Game Structure
Rounds: Default 5 per game (configurable in Admin Panel)

Modes:

Single Player

Multiplayer with friends

Daily Challenge (same sequence of images for everyone)

📍 Location Guessing
Module: Image Container ("WHAT?")

📦 Container

Matches the style of the Map Location Picker

Background color: Dark charcoal (#121212 or similar)

Padding: Uniform (p-4)

Rounded corners: Large (rounded-xl or 2xl)

Narrow margins to take full width of available screen

Inner shadow to give sense of depth (neumorphic effect)

Image Display

Full-color image

Centered with crop to maintain aspect ratio

Rounded corners matching the container (rounded-xl)

No borders

Soft inner shadows (shadow-inner, shadow-black/40)

Label ("WHAT?")

Font: Sans-serif

Color: Soft light gray (#CCCCCC)

Weight: Medium

Size: Medium (text-md or text-base)

Letter spacing: Slightly spaced

Position: Top-left inside the section

Module: Map Location Picker ("WHERE?")

📦 Container

Background color: Dark charcoal (#121212 or similar)

Padding: Uniform (p-4)

Rounded corners: Large (rounded-xl or 2xl)

Spacing between sections: Consistent vertical margin (mt-6 or gap-y-4)

Label ("WHERE?")

Font: Sans-serif

Color: Soft light gray (#CCCCCC)

Weight: Medium

Size: Medium (text-md or text-base)

Letter spacing: Slightly spaced

Position: Top-left inside the section

🗺️ Map View

Embedded static map view

Style: Light custom-styled vector map (reduced saturation + elevated roads)

Center: GMT

Zoom level: Show the whole world (zoom: 1)

Overlay

Orange pin with a circular photo inside (user avatar)

Avatar inside a 50% border-radius mask (perfect circle)

Map Container

Size: Full width, 9/16

Rounded corners: Medium-large (rounded-xl)

Inner padding: None

Shadow: Subtle shadow (shadow-md)

Border: None

Uses OpenStreetMap for user pin drop

No auto-recentering on pin placement

Points based on proximity to actual coordinates

⏰ Time Guessing
Full-width slider (default 1900–2025)

Centered selection box

Scalable ranges:

Ancient: -100 to 1900

Modern: 1900 to present

Future: +1 to +100 years

⌚ Timer (Optional)
Range: 30 seconds to 5 minutes per round

Default: 2 minutes

Timeout ends the round automatically

User- or host-enabled per game

💡 Hints System
In-Game Hint Popup
Contextual popup appears above the slider or map when Hint buttons are tapped

Rounded card with slight inner shadow, dark background (#1A1A1A), soft white text

Displays: "📍 Country: Germany" or "🕰 Year: 19X7"

Auto-dismisses in 3–5 seconds or can be manually closed

If no coins: popup prompts "Need more coins?" with an "Earn Coins" button

Out-of-Game Hint Modal
Triggered if user attempts hint without enough coins

Options to earn coins:

👀 Watch a short video

🤝 Invite a friend

🏅 Earn achievements

🔁 Complete daily streaks

Coin reward amount and estimated time are shown

Modal has dismiss and link to Coin Shop

🏪 Coin Shop
The Coin Shop allows players to exchange Coins for gameplay perks, cosmetics, and progression boosts.

🛒 Categories:
Hints

Time Hint — Cost: 10 coins

Location Hint — Cost: 10 coins

Level Progression

Spend coins to fill XP bar or trigger instant level up — Cost: 100 coins (configurable)

🧾 Features:
Coin Shop is accessible from the user profile and home screen

Items display current coin price, preview, and rarity (Common, Rare, Limited)

All items are purely cosmetic or helpful — no pay-to-win effects

Item availability may rotate weekly (admin-controlled)

Admin Panel includes full control over shop inventory, prices, categories

🧲 Scoring System
Type	Formula
Location	5000 – (5000 × tanh(km / 300))
Time	5000 – (5000 × tanh(years / 40))
Total	Max 10,000 points
Accuracy	% closeness from correct values
Badges
Perfect Location: <15m

Perfect Year: ±1

Gold/Silver/Bronze tiers

Combo badges = both correct

Each has count tracking and XP bonuses

🔼 Leveling
XP from badges, accuracy, streaks

Coins can be used to level up

Unlocks: event packs, cosmetics

🖥 User Interface (UI)
🏆 Leaderboard UI
A vertical, neumorphic-style leaderboard inspired by futuristic ranking visuals. Includes:

Container:

Background: Dark charcoal (#121212)

Layout: Vertical scroll with central timeline

Padding: p-4 with gap-y-6

Rounded corners: rounded-xl

Player Entry Card:

Left: glowing circular profile photo, bold accuracy %, username

Right: rank number in large font, badge icon, optional additional stats

Visual Effects:

🥇 Top 3 players glow with gold/silver/bronze halos

Highlight the current user in list

Optional fire/sparkle icon for streaks

Toggles:

Global / Friends / Local Leaderboard

Timeframe: Weekly / All-Time

Filter by: Badge type, country, game mode

♻️ Game Modes
Single Player

5 rounds

Play anytime

Custom settings

Multiplayer

Invite friends via link

Group-specific leaderboard

Async play

Daily Challenge

Everyone plays same 5 images daily

Scores ranked globally

Fixed settings

🧠 Image Intelligence & Data Model
Images processed by Reve Collector (AI tool):

Ingests or generates images

Infers metadata:

Title

Date

Location: lat/lng, country, address

ai_description

tag: Real, AI Recreate, AI Imagine

confidence_score

Supabase Table: images
Field	Type	Description
id	UUID	Primary Key
image_url	TEXT	CDN-hosted image link
title	TEXT	Inferred title
prompt	TEXT	Original AI prompt (if any)
ai_description	TEXT	Scene description by AI
date	DATE	Inferred year
country/address	TEXT	Country + location detail
latitude/longitude	FLOAT	Geocoordinates
confidence_score	FLOAT	Match score (0–1)
tag	TEXT	Real / AI Recreate / AI Imagine
ready_for_game	BOOLEAN	If true, image appears in game
created_at	TIMESTAMP	Upload timestamp
🛡 Technical Stack & Infrastructure
Frontend: React.js (Vite), TailwindCSS, Zustand

Backend: Supabase (DB, Auth, Storage)

Auth: Supabase (Google, Guest)

Mapping: OpenStreetMap + Leaflet.js

AI: Reve Collector (external image analysis)

URL: https://guess-history.com

🛠 Admin Panel (/adminlolo)
Admins: lama010101@gmail.com, laurent.martenot@gmail.com

Game Config:

Rounds, hint rules, perfect badge params

User Management:

Ban/unban, see games played

Image Management:

Upload/edit/delete/search/approve images

Analytics:

Export logs, view user stats

Security:

JWT, OAuth, MFA planned

🔐 Security
Supabase Auth with Google + guest

MFA support planned

User data encrypted at rest/in transit

JWT-based auth

Rate limiting and abuse protection

Admin access restricted to whitelist

Action logging for audits

GDPR-ready

📣 Marketing Strategy
Pre-launch teaser with limited beta

Launch:

TikTok, IG Reels, YouTube Shorts

Education & AI creator outreach

Product Hunt / Indie Hackers

Referral bonuses

Daily Challenge as viral loop

Content updates + blog + packs

💸 Financial & Monetization Strategy
Revenue Streams:

Ad views for coins/hints

Coin bundle purchases

Event/expansion packs

Educator/streamer license

Profit Optimization:

Reward loops for ads/referrals

Limited-time cosmetics

Engagement & conversion analytics

Discounts via badge triggers

🌌 Future Vision
Spinoffs: Guess Fashion / Sports / Vehicles

Real-time multiplayer, spectator mode

Private rooms for educators, streamers

AI-vs-Human showdown

Mobile app port

🎨 UI Style & Feeling Specification
🎭 Themes
1. Real Neumorphism

Tactile, embossed, vintage UI

Inspired by cameras & museums

2. Minimalist Monochrome

Grayscale base, high contrast

Accent: orange/blue only

📱 Mobile Game Layout
Top nav: round #, score, hints, menu

Full-width image (color)

WHEN section: slider + year (orange)

WHERE section: interactive map

Bottom: Make Guess button

No toggle button between image/map

Fonts: Inter or Poppins

Buttons/sliders with soft shadows

Fully responsive



