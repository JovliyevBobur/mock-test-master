export const SUBJECTS = [
  { id: 'math', name: 'Matematika', icon: '📐', color: 'subject-math' },
  { id: 'physics', name: 'Fizika', icon: '⚛️', color: 'subject-physics' },
   { id: 'chemistry', name: 'Kimyo', icon: '🧪', color: 'subject-chemistry' },
   { id: 'biology', name: 'Biologiya', icon: '🧬', color: 'subject-biology' },
   { id: 'informatics', name: 'Informatika', icon: '💻', color: 'subject-informatics' },
  { id: 'english', name: 'Ingliz tili', icon: '🇬🇧', color: 'subject-english' },
  { id: 'history', name: 'Tarix', icon: '📜', color: 'subject-history' },
  { id: 'russian', name: 'Rus tili', icon: '🇷🇺', color: 'subject-russian' },
  { id: 'uzbek', name: 'Ona tili', icon: '🇺🇿', color: 'subject-uzbek' },
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
