export const STUDENT_SKILL_LEVELS = ['Beginner', 'Intermediate', 'Expert'] as const;
export type StudentSkillLevel = (typeof STUDENT_SKILL_LEVELS)[number];

export function isStudentSkillLevel(value: string): value is StudentSkillLevel {
  return (STUDENT_SKILL_LEVELS as readonly string[]).includes(value);
}
