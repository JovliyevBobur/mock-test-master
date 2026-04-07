export const SUBJECTS = [
  { id: 'math', name: 'Matematika', icon: '📐', iconType: 'emoji' as const, color: 'subject-math' },
  { id: 'physics', name: 'Fizika', icon: '⚛️', iconType: 'emoji' as const, color: 'subject-physics' },
  { id: 'chemistry', name: 'Kimyo', icon: '🧪', iconType: 'emoji' as const, color: 'subject-chemistry' },
  { id: 'biology', name: 'Biologiya', icon: '🧬', iconType: 'emoji' as const, color: 'subject-biology' },
  { id: 'informatics', name: 'Informatika', icon: '💻', iconType: 'emoji' as const, color: 'subject-informatics' },
  { id: 'english', name: 'Ingliz tili', icon: 'https://img.icons8.com/color/96/great-britain-circular.png', iconType: 'image' as const, color: 'subject-english' },
  { id: 'history', name: 'Tarix', icon: '📜', iconType: 'emoji' as const, color: 'subject-history' },
  { id: 'russian', name: 'Rus tili', icon: 'https://img.icons8.com/color/96/russian-federation-circular.png', iconType: 'image' as const, color: 'subject-russian' },
  { id: 'uzbek', name: 'Ona tili', icon: 'https://img.icons8.com/color/96/uzbekistn-circular.png', iconType: 'image' as const, color: 'subject-uzbek' },
] as const;

export type SubjectId = typeof SUBJECTS[number]['id'];

export const getSubjectById = (id: string) => SUBJECTS.find(s => s.id === id);

export const getSubjectColor = (id: string): string => {
  const colors: Record<string, string> = {
    math: 'bg-subject-math',
    physics: 'bg-subject-physics',
     chemistry: 'bg-subject-chemistry',
     biology: 'bg-subject-biology',
     informatics: 'bg-subject-informatics',
    english: 'bg-subject-english',
    history: 'bg-subject-history',
    russian: 'bg-subject-russian',
    uzbek: 'bg-subject-uzbek',
  };
  return colors[id] || 'bg-primary';
};

export const getSubjectBorderColor = (id: string): string => {
  const colors: Record<string, string> = {
    math: 'border-subject-math',
    physics: 'border-subject-physics',
     chemistry: 'border-subject-chemistry',
     biology: 'border-subject-biology',
     informatics: 'border-subject-informatics',
    english: 'border-subject-english',
    history: 'border-subject-history',
    russian: 'border-subject-russian',
    uzbek: 'border-subject-uzbek',
  };
  return colors[id] || 'border-primary';
};
