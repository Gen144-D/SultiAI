export const SULTI_IMAGES = {
  idle: require('../../assets/avatars/sulti/sulti-idle.png'),
  listening: require('../../assets/avatars/sulti/sulti-listening.png'),
  thinking: require('../../assets/avatars/sulti/sulti-thinking.png'),
  error: require('../../assets/avatars/sulti/sulti-error.png'),
};

export const SULTI_SPEAKING_FRAMES = [
  require('../../assets/avatars/sulti/sulti-speaking-1.png'),
  require('../../assets/avatars/sulti/sulti-speaking-2.png'),
  require('../../assets/avatars/sulti/sulti-speaking-3.png'),
  require('../../assets/avatars/sulti/sulti-speaking-2.png'),
];

export const USER_AVATARS = [
  { id: 'avatar-01', source: require('../../assets/avatars/users/avatar-01.png'), label: 'Short dark hair' },
  { id: 'avatar-02', source: require('../../assets/avatars/users/avatar-02.png'), label: 'Long dark hair' },
  { id: 'avatar-03', source: require('../../assets/avatars/users/avatar-03.png'), label: 'Curly hair' },
  { id: 'avatar-04', source: require('../../assets/avatars/users/avatar-04.png'), label: 'Medium hair' },
  { id: 'avatar-05', source: require('../../assets/avatars/users/avatar-05.png'), label: 'Glasses' },
  { id: 'avatar-06', source: require('../../assets/avatars/users/avatar-06.png'), label: 'Different style' },
];

export const DEFAULT_AVATAR_ID = 'avatar-01';

export function getAvatarSource(avatarId) {
  const found = USER_AVATARS.find((a) => a.id === avatarId);
  return found ? found.source : USER_AVATARS[0].source;
}
