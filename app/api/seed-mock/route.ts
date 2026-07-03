import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase/client';
import { collection, getDocs, addDoc, query, Timestamp } from 'firebase/firestore';

export async function GET() {
  try {
    const classesSnap = await getDocs(query(collection(db, 'classes')));
    const mockClasses = classesSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    const contentsSnap = await getDocs(query(collection(db, 'contents')));
    const mockContents = contentsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    if (mockClasses.length === 0 || mockContents.length === 0) {
      return NextResponse.json({ error: 'Missing mock classes or contents. Classes: ' + mockClasses.length + ', Contents: ' + mockContents.length }, { status: 400 });
    }

    let newScoreCount = 0;

    for (const cls of mockClasses) {
      const clsData = cls as any;
      if (!clsData.students || clsData.students.length === 0) continue;

      const assignedContents = mockContents.filter((c: any) => c.classIds && c.classIds.includes(cls.id));
      if (assignedContents.length === 0) continue;

      const limitStudents = clsData.students.slice(0, 3); // 3명씩만

      for (const student of limitStudents) {
        const studentEmail = student.email;
        const studentName = student.name;
        const studentId = student.id || studentEmail;

        for (const content of assignedContents) {
          const step1_wpm = Math.floor(Math.random() * 200) + 150;
          const step1_accuracy = Math.floor(Math.random() * 10) + 90;
          const step1_score = Math.floor(step1_wpm * (step1_accuracy / 100));
          
          const step2_completed = true;
          const step2_wpm = Math.floor(Math.random() * 200) + 120;
          const step2_accuracy = Math.floor(Math.random() * 15) + 85;
          const step2_score = Math.floor(step2_wpm * (step2_accuracy / 100));

          const step3_total_count = (content as any).step3_quiz_list?.length || 3;
          const step3_correct_count = Math.floor(Math.random() * (step3_total_count + 1));
          const step3_score = step3_correct_count * 1000;
          const step3_time_taken = Math.floor(Math.random() * 120) + 30;

          const total_score = step1_score + step2_score + step3_score;

          const msAgo = Math.floor(Math.random() * 48 * 60 * 60 * 1000);
          const completedAtMillis = Date.now() - msAgo;
          const completedAt = Timestamp.fromMillis(completedAtMillis);

          const scoreDoc = {
            type: 'score',
            contentId: content.id,
            classId: cls.id,
            userId: studentId,
            studentName,
            studentEmail,
            step1_wpm, step1_accuracy, step1_score, step1_completedAt: completedAt,
            step2_completed, step2_wpm, step2_accuracy, step2_score, step2_completedAt: completedAt,
            step3_correct_count, step3_total_count, step3_time_taken, step3_score, step3_completedAt: completedAt,
            total_score,
            updatedAt: completedAt
          };

          await addDoc(collection(db, 'scores'), scoreDoc);
          newScoreCount++;
        }
      }
    }

    return NextResponse.json({ success: true, count: newScoreCount });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
