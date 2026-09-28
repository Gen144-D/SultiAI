export const dashboardGradients = {
  header: ['#008B8B', '#00A896', '#008B8B'],
  headerFade: ['rgba(255,255,255,0.12)', 'transparent'],
  xpWidget: ['#00A896', '#34D399'],
  progressFill: ['#00A896', '#34D399'],
};

export const FEATURES = [
  { id: 'tutor', title: 'Sulti Tutor', iconName: 'sparkles', gradient: ['#00A896', '#008B8B'], path: 'SULTI' },
  { id: 'whisper', title: 'Whisper AI', iconName: 'language', gradient: ['#5EEAD4', '#00A896'], path: 'WhisperAI' },
  { id: 'practice', title: 'Practice', iconName: 'chatbubbles', gradient: ['#34D399', '#00A896'], path: 'Learn' },
  { id: 'voice', title: 'AI Voice', iconName: 'mic-circle', gradient: ['#00A896', '#5EEAD4'], path: 'VoiceMode' },
  { id: 'pronunciation', title: 'Pronunciation', iconName: 'mic', gradient: ['#008B8B', '#00A896'], path: 'Pronunciation' },
  { id: 'ar', title: 'AR Explore', iconName: 'camera', gradient: ['#008B8B', '#00A896'], path: 'ARScene' },
  { id: 'rewards', title: 'Rewards', iconName: 'trophy', gradient: ['#FCD34D', '#FB923C'], path: 'Achievements' },
  { id: 'challenge', title: 'Daily Challenge', iconName: 'flame', gradient: ['#FCD34D', '#FB7185'], path: 'SULTI' },
];

export const TAB_ROUTES = [
  { id: 'Home', label: 'Home', focusedIcon: 'home', unfocusedIcon: 'home-outline' },
  { id: 'Learn', label: 'Learn', focusedIcon: 'school', unfocusedIcon: 'school-outline' },
  { id: 'SULTI', label: 'SULTI', focusedIcon: 'sparkles', unfocusedIcon: 'sparkles-outline' },
  { id: 'Community', label: 'Community', focusedIcon: 'people', unfocusedIcon: 'people-outline' },
  { id: 'Profile', label: 'Profile', focusedIcon: 'person', unfocusedIcon: 'person-outline' },
];

export default dashboardGradients;
