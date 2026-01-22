# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.0] - 2025-01-07

### Added
- Initial release of Texas Hold'em GTO Trainer
- Complete Texas Hold'em game engine with multi-player support (2-8 players)
- AI opponents with four difficulty levels (Easy/Medium/Hard/Expert)
- Four AI playing styles: TAG, LAG, TAP, LAP
- Real-time GTO strategy assistant with EV calculations
- Preflop hand range charts based on position
- Hand evaluation system supporting all poker hand rankings
- Draw detection (flush draws, straight draws, gutshots)
- Game history replay and analysis
- Player statistics tracking (VPIP, PFR, Aggression Factor)
- Local data persistence using IndexedDB
- Beautiful UI with animations using Framer Motion
- Responsive design with Tailwind CSS

### Technical Stack
- React 18 + TypeScript
- Zustand for state management
- Vite for build tooling
- Dexie.js for IndexedDB
- Recharts for statistics visualization
