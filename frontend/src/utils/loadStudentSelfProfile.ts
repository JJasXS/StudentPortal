import { parentsApi, studentsApi } from '@/api/resources';
import type { StudentSelfProfile, User } from '@/types';

export async function loadStudentSelfProfile(user: User): Promise<StudentSelfProfile | null> {
  try {
    return await studentsApi.getMe();
  } catch {
    try {
      const students = await studentsApi.getAll();
      const student = students.find((s) => s.userId === user.id);
      if (!student) return null;

      let parent: StudentSelfProfile['parent'] = null;
      try {
        const parents = await parentsApi.getAll();
        const linked = parents.find((p) => p.children?.includes(user.id));
        if (linked) {
          parent = {
            fullName: linked.fullName,
            email: linked.email,
            phoneNumber: linked.phoneNumber,
            relationship: linked.relationship,
          };
        }
      } catch {
        // Parent list may be restricted; profile still loads without it.
      }

      return {
        ...student,
        phoneNumber: user.phoneNumber,
        parent,
      };
    } catch {
      return null;
    }
  }
}
