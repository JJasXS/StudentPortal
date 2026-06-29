export const STUDENT_REGISTER_STEP_COUNT = 4;

export function parseRegisterStepParam(param: string | null): number {
  const n = Number.parseInt(param ?? '1', 10);
  if (Number.isFinite(n) && n >= 1 && n <= STUDENT_REGISTER_STEP_COUNT) return n;
  return 1;
}

export function registerStudentStepPath(step: number): string {
  const safe = Math.min(Math.max(step, 1), STUDENT_REGISTER_STEP_COUNT);
  return `/register/student?step=${safe}`;
}
