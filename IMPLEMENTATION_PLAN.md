# SULTI AI Companion Redesign - Implementation Plan

## Overview
Transform the SultiTutorScreen from a chat-centric interface into a unified SULTI hub that presents **Chat AI** and **Voice AI Agent** as two interaction modes of the same SULTI agent.

## Files to Modify

### Primary Changes
1. **`src/screens/SultiTutorScreen.js`** — Complete UI redesign (922 lines → ~600 lines)
2. **`src/screens/VoiceModeScreen.js`** — Minor styling improvements to feel cohesive
3. **`src/components/BottomTabBar.js`** — Enhance SULTI tab visual highlight

### New Components
4. **`src/components/sulti/SultiModeCard.js`** — Chat/Voice mode cards
5. **`src/components/sulti/TopicPill.js`** — Topic practice pill
6. **`src/components/sulti/RoleplayCard.js`** — Role-play section card

### Files to Read/Verify (no changes)
- `src/navigation/AppNavigator.js` — Route names confirmed: `SULTI` (tab), `VoiceMode` (modal)
- `src/theme/index.js` — Existing tokens: primary (#5B5FEF), accent (#2EC4B6), gradientA (#2563EB), gradientB (#0D9488)
- `src/components/AIAvatar.js` — Reuse as-is
- `src/components/GlassCard.js` — Reuse as-is
- `src/components/Badge.js` — Reuse as-is
- `src/components/AuroraBackground.js` — Reuse as-is

## Implementation Steps

### Step 1: Create New Components

#### `src/components/sulti/SultiModeCard.js`
- A gradient card for Chat AI and Voice AI modes
- Props: `title`, `subtitle`, `icon`, `gradient`, `badge`, `badgeColor`, `onPress`, `variant` ('chat' | 'voice')
- Chat variant: blue/purple gradient, chat bubble icon, "AI CHAT" badge
- Voice variant: teal/cyan gradient, mic icon, waveform decoration, "VOICE AGENT" badge
- Uses LinearGradient, Ionicons, animated waveform bars for voice variant
- Press animation with scale spring

#### `src/components/sulti/TopicPill.js`
- Rounded pill with icon + label
- Props: `label`, `icon`, `color`, `onPress`
- Color-coded background with soft opacity
- Touch target minimum 44x44

#### `src/components/sulti/RoleplayCard.js`
- Glass card with gamepad icon, title, subtitle, chevron
- Props: `onPress`, `expanded`, `children`
- Uses GlassCard variant="tinted"

### Step 2: Redesign SultiTutorScreen.js

Transform from a chat screen into a scrollable hub screen. Keep all existing logic intact (chat messages, voice recording, API calls, state, effects).

#### New Visual Hierarchy:
1. **Gradient Header** — Avatar, "Sulti", "Learning", mic/history/hearts icons
2. **Welcome Card** — GlassCard with avatar, "Kumusta! I'm Sulti..." greeting
3. **Two AI Mode Cards** — SultiModeCard for Chat + Voice (the centerpiece)
4. **Topic Practice** — "Choose a Topic to Practice" with TopicPill grid
5. **Role-Play Section** — RoleplayCard with expandable scenarios
6. **Quick Chat Input** — Bottom input bar (existing functionality preserved)

#### Key Design Decisions:
- **Remove the FlatList-based chat from this screen** — When user presses "Start Chat", navigate to a dedicated chat view. BUT the current screen IS the chat screen (route `SULTI`).
- **Strategy**: Transform SultiTutorScreen into a hub that shows the new UI by default. When user taps "Start Chat" OR sends a message via the quick input, it transitions to the chat view within the same screen (using a state toggle `mode: 'hub' | 'chat'`). This preserves backward compatibility.
- The existing `messages` state, `sendMessage`, `pickSituation`, `startRoleplay`, voice recording, etc. all remain functional.
- The hub view shows when `messages.length <= 1` (just the initial welcome). The chat view shows when there are actual conversation messages.

#### Revised Approach (simpler):
Actually, the cleanest approach is:
- Keep the existing chat functionality exactly as-is
- **Restructure the initial welcome/empty state** to show the new hub layout
- When user sends a message or picks a topic, it transitions into the existing chat view naturally
- This means we're primarily redesigning the `renderWelcomeCard` and the area around it, plus the header

#### Specific Changes:
1. **Header**: Keep gradient, add sparkle indicator under SULTI label
2. **Replace renderWelcomeCard** with new hub layout containing:
   - Welcome message card
   - Two SultiModeCards (Chat → stays on this screen in chat mode, Voice → navigates to VoiceMode)
   - Topic pills grid
   - Role-play card
3. **Keep FlatList, messages, sendMessage, etc.** exactly as they work now
4. **When messages array has conversation content** (length > 1), show the chat view (current behavior)
5. **When messages array is just the initial welcome**, show the hub view

### Step 3: Improve VoiceModeScreen Styling

Minor changes to make VoiceModeScreen feel more cohesive with the new SULTI design:
- Add Sulti avatar to the top bar (next to "SULTI Voice Tutor" title)
- Ensure the greeting matches the Sulti personality ("Kumusta! I'm ready to talk")
- No breaking changes to voice functionality

### Step 4: Enhance SULTI Tab Highlight

In `BottomTabBar.js`:
- When SULTI tab is focused, show a stronger visual:
  - Purple/blue glow on the icon wrap (change from teal to primary color)
  - Sparkle icon instead of just the active icon style
  - Small indicator dot underneath

### Step 5: Register New Components

Add exports to `src/components/index.js` if needed.

## Architecture Preservation Checklist

- [x] `api.tutorChat()` calls remain intact
- [x] `api.generateLesson()` calls remain intact
- [x] Voice recording via `expo-audio` remains intact
- [x] TTS via `speakTTS`/`stopTTS` remains intact
- [x] Chat history via AsyncStorage remains intact
- [x] Adaptive tutor integration remains intact
- [x] XP rewards remain intact
- [x] Navigation routes unchanged: `SULTI` (tab), `VoiceMode` (modal)
- [x] Hearts system remains intact
- [x] All existing effects/cleanup remain intact
- [x] `route.params.situation` handling remains intact
- [x] Lesson card rendering remains intact
- [x] Pronunciation card rendering remains intact
- [x] History modal remains intact

## Route Mapping

| Action | Route | Notes |
|--------|-------|-------|
| Start Chat | Stays on SULTI tab | Transitions to chat view within screen |
| Start Voice | `VoiceMode` (modal) | Existing navigation |
| Topic tap | Stays on SULTI tab | Calls `pickSituation()`, transitions to chat |
| Roleplay tap | Stays on SULTI tab | Calls `startRoleplay()`, transitions to chat |
| Quick input send | Stays on SULTI tab | Calls `sendMessage()`, transitions to chat |
| Microphone (quick input) | Stays on SULTI tab | Existing voice recording |

## Color Palette for New Elements

```
Chat Card Gradient: ['#5B5FEF', '#2563EB']  (purple → blue)
Voice Card Gradient: ['#0D9488', '#06B6D4'] (teal → cyan)
Topic Colors: Same as existing SITUATIONS array
Roleplay Card: primary + '10' tinted glass
Header: ['#5B5FEF', '#FF8A65'] or existing [colors.primary, colors.secondary]
```

## Responsive Design Notes

- Use `useWindowDimensions` for width-dependent layouts
- Topic pills: `flexDirection: 'row', flexWrap: 'wrap'` with gap
- Mode cards: Side by side on wider screens, stacked on narrow
- ScrollView for hub content, FlatList for chat messages
- KeyboardAvoidingView for input area
- SafeAreaView insets for header/padding
