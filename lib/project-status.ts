export type ProjectStatusSummary = {
  projectName: string;
  currentStage: string;
  completedFindings: string[];
  openQuestions: string[];
  blockedBy: string[];
  nextPhaseName: string;
  nextPhaseEntryPoints: string[];
};

export function getProjectStatusSummary(): ProjectStatusSummary {
  return {
    projectName: 'MangAkita',
    currentStage: 'Comic Walker-first scaffold created; next goal is page isolation quality.',
    completedFindings: [
      'A new repository was created specifically for Comic Walker.',
      'The initial Next.js project scaffold is in place.',
      'The project intentionally avoids Nico Nico legacy as a first principle.',
    ],
    openQuestions: [
      'Is there a cleaner viewer JSON with the ordered page list?',
      'Which network responses correspond only to real chapter pages?',
      'What validation rules should promote or reject candidates inside units[]?',
    ],
    blockedBy: [
      'The probe still needs a stronger ranking layer for real pages versus UI assets.',
      'The reader still needs a second validation layer before rendering all units.',
    ],
    nextPhaseName: 'comicwalker-page-isolation',
    nextPhaseEntryPoints: ['/import', '/reader', '/status'],
  };
}
