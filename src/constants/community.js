export const POST_TYPES = {
  question: { key: 'question', label: 'Question', icon: 'help-circle', color: '#1E6F9F' },
  discussion: { key: 'discussion', label: 'Discussion', icon: 'chatbubbles', color: '#8B5CF6' },
  tip: { key: 'tip', label: 'Learning Tip', icon: 'bulb', color: '#F59E0B' },
  vocabulary: { key: 'vocabulary', label: 'Vocabulary', icon: 'book', color: '#10B981' },
  translation: { key: 'translation', label: 'Translation Help', icon: 'swap-horizontal', color: '#EC4899' },
  pronunciation: { key: 'pronunciation', label: 'Pronunciation', icon: 'mic', color: '#EF4444' },
  culture: { key: 'culture', label: 'Culture', icon: 'color-palette', color: '#14B8A6' },
};

export const POST_TYPE_KEYS = Object.keys(POST_TYPES);

export const FEED_FILTERS = [
  { key: 'all', label: 'For You', icon: 'sparkles' },
  { key: 'latest', label: 'Latest', icon: 'time' },
  { key: 'popular', label: 'Popular', icon: 'flame' },
];

export const isPostType = (value) => POST_TYPE_KEYS.includes(value);
