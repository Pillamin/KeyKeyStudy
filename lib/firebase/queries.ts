import { 
  collection, doc, getDoc, getDocs, setDoc, addDoc, updateDoc, deleteDoc, 
  query, where, orderBy, onSnapshot, Timestamp 
} from 'firebase/firestore';
import { db } from './client';
import type { WhitelistDoc, ClassDoc, FolderDoc, TopicDoc, ContentDoc, ScoreDoc } from './types';

// Helper for type casting
const mapDoc = <T>(docSnap: any): T => ({ id: docSnap.id, ...docSnap.data() } as T);

// Whitelist
export async function getWhitelistDoc(email: string): Promise<WhitelistDoc | null> {
  const d = await getDoc(doc(db, 'whitelist', email));
  return d.exists() ? mapDoc<WhitelistDoc>(d) : null;
}

export async function createWhitelistDoc(email: string, data: Omit<WhitelistDoc, 'id' | 'type'>): Promise<void> {
  await setDoc(doc(db, 'whitelist', email), { type: 'whitelist', ...data });
}

export async function updateWhitelistDoc(email: string, data: Partial<WhitelistDoc>): Promise<void> {
  await updateDoc(doc(db, 'whitelist', email), { ...data, updatedAt: Timestamp.now() });
}

export async function deleteWhitelistDoc(email: string): Promise<void> {
  await deleteDoc(doc(db, 'whitelist', email));
}

export async function getAllWhitelistDocs(): Promise<WhitelistDoc[]> {
  const q = query(collection(db, 'whitelist'), orderBy('registeredAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => mapDoc<WhitelistDoc>(d));
}

// Class
export async function createClass(data: Omit<ClassDoc, 'id' | 'type'>): Promise<string> {
  const ref = await addDoc(collection(db, 'classes'), { type: 'class', ...data });
  return ref.id;
}

export async function updateClass(classId: string, data: Partial<ClassDoc>): Promise<void> {
  await updateDoc(doc(db, 'classes', classId), data);
}

export async function getAllClasses(): Promise<ClassDoc[]> {
  const q = query(collection(db, 'classes'), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => mapDoc<ClassDoc>(d));
}

export async function getClassesByTeacher(teacherEmail: string): Promise<ClassDoc[]> {
  const qCreated = query(collection(db, 'classes'), where('createdByEmail', '==', teacherEmail));
  const qCoTeacher = query(collection(db, 'classes'), where('coTeacherEmails', 'array-contains', teacherEmail));
  
  const [snap1, snap2] = await Promise.all([getDocs(qCreated), getDocs(qCoTeacher)]);
  const docsMap = new Map();
  snap1.docs.forEach(d => docsMap.set(d.id, mapDoc<ClassDoc>(d)));
  snap2.docs.forEach(d => docsMap.set(d.id, mapDoc<ClassDoc>(d)));
  
  return Array.from(docsMap.values()).sort((a, b) => {
    if (a.orderIndex !== undefined && b.orderIndex !== undefined) return a.orderIndex - b.orderIndex;
    return b.createdAt.toMillis() - a.createdAt.toMillis();
  });
}

export async function getClassDoc(classId: string): Promise<ClassDoc | null> {
  const d = await getDoc(doc(db, 'classes', classId));
  return d.exists() ? mapDoc<ClassDoc>(d) : null;
}

export async function getClassByCode(classCode: string): Promise<ClassDoc | null> {
  const q = query(collection(db, 'classes'), where('classCode', '==', classCode));
  const snap = await getDocs(q);
  return snap.empty ? null : mapDoc<ClassDoc>(snap.docs[0]);
}

export async function deleteClass(classId: string): Promise<void> {
  await deleteDoc(doc(db, 'classes', classId));
  // Delete contents
  const cq = query(collection(db, 'contents'), where('classId', '==', classId));
  const cSnap = await getDocs(cq);
  await Promise.all(cSnap.docs.map(d => deleteDoc(d.ref)));
  
  // Delete topics
  const tq = query(collection(db, 'topics'), where('parentId', '==', classId));
  const tSnap = await getDocs(tq);
  await Promise.all(tSnap.docs.map(d => deleteDoc(d.ref)));
  
  // Unassign students
  const wq = query(collection(db, 'whitelist'), where('classId', '==', classId));
  const wSnap = await getDocs(wq);
  await Promise.all(wSnap.docs.map(d => updateDoc(d.ref, { classId: '' })));
}

export async function getStudentsByClass(classId: string): Promise<WhitelistDoc[]> {
  const q = query(collection(db, 'whitelist'), where('role', '==', 'student'), where('classId', '==', classId));
  const snap = await getDocs(q);
  return snap.docs.map(d => mapDoc<WhitelistDoc>(d));
}



// Folder
export async function createFolder(data: Omit<FolderDoc, 'id' | 'type'>): Promise<string> {
  const ref = await addDoc(collection(db, 'folders'), { type: 'folder', ...data });
  return ref.id;
}

export async function getFoldersByTeacher(teacherId: string): Promise<FolderDoc[]> {
  const q = query(collection(db, 'folders'), where('createdBy', '==', teacherId));
  const snap = await getDocs(q);
  return snap.docs.map(d => mapDoc<FolderDoc>(d)).sort((a, b) => a.createdAt.toMillis() - b.createdAt.toMillis());
}

export async function updateFolder(folderId: string, data: Partial<FolderDoc>): Promise<void> {
  await updateDoc(doc(db, 'folders', folderId), data);
}

export async function deleteFolder(folderId: string): Promise<void> {
  await deleteDoc(doc(db, 'folders', folderId));
  // Delete contents
  const cq = query(collection(db, 'contents'), where('folderId', '==', folderId));
  const cSnap = await getDocs(cq);
  await Promise.all(cSnap.docs.map(d => deleteDoc(d.ref)));
}

// Topic
export async function createTopic(data: Omit<TopicDoc, 'id' | 'type'>): Promise<string> {
  const ref = await addDoc(collection(db, 'topics'), { type: 'topic', ...data });
  return ref.id;
}

export async function getTopicsByParent(parentId: string): Promise<TopicDoc[]> {
  const q = query(collection(db, 'topics'), where('parentId', '==', parentId));
  const snap = await getDocs(q);
  return snap.docs.map(d => mapDoc<TopicDoc>(d)).sort((a, b) => {
    if (a.orderIndex !== undefined && b.orderIndex !== undefined) return a.orderIndex - b.orderIndex;
    return a.createdAt.toMillis() - b.createdAt.toMillis();
  });
}

export async function updateTopic(topicId: string, data: Partial<TopicDoc>): Promise<void> {
  await updateDoc(doc(db, 'topics', topicId), data);
}

export async function deleteTopic(topicId: string): Promise<void> {
  await deleteDoc(doc(db, 'topics', topicId));
  // Unset topic from contents
  const cq = query(collection(db, 'contents'), where('topicId', '==', topicId));
  const cSnap = await getDocs(cq);
  await Promise.all(cSnap.docs.map(d => updateDoc(d.ref, { topicId: '' }))); // Firestore equivalent of delete
}

// Content
export async function createContent(data: Omit<ContentDoc, 'id' | 'type'>): Promise<string> {
  const ref = await addDoc(collection(db, 'contents'), { type: 'content', ...data });
  return ref.id;
}

export async function getContentDoc(contentId: string): Promise<ContentDoc | null> {
  const d = await getDoc(doc(db, 'contents', contentId));
  return d.exists() ? mapDoc<ContentDoc>(d) : null;
}

export async function updateContent(contentId: string, data: Partial<ContentDoc>): Promise<void> {
  await updateDoc(doc(db, 'contents', contentId), { ...data, updatedAt: Timestamp.now() });
}

export async function getContentsByClass(classId: string): Promise<ContentDoc[]> {
  const q = query(collection(db, 'contents'), where('classId', '==', classId));
  const snap = await getDocs(q);
  return snap.docs.map(d => mapDoc<ContentDoc>(d)).sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());
}

export async function getPublishedContentsByClass(classId: string): Promise<ContentDoc[]> {
  const q = query(collection(db, 'contents'), where('classId', '==', classId), where('status', '==', 'published'));
  const snap = await getDocs(q);
  return snap.docs.map(d => mapDoc<ContentDoc>(d)).sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());
}

export async function getContentsByTeacher(teacherId: string): Promise<ContentDoc[]> {
  const q = query(collection(db, 'contents'), where('createdBy', '==', teacherId));
  const snap = await getDocs(q);
  return snap.docs
    .map(d => mapDoc<ContentDoc>(d))
    .filter(c => !c.classId) // 원본만 반환 (복사본은 classId가 있음)
    .sort((a, b) => {
      if (a.orderIndex !== undefined && b.orderIndex !== undefined) return a.orderIndex - b.orderIndex;
      return b.createdAt.toMillis() - a.createdAt.toMillis();
    });
}

export async function deleteContent(contentId: string): Promise<void> {
  await deleteDoc(doc(db, 'contents', contentId));
  const sq = query(collection(db, 'scores'), where('contentId', '==', contentId));
  const sSnap = await getDocs(sq);
  await Promise.all(sSnap.docs.map(d => deleteDoc(d.ref)));
}

// Score
export async function upsertScore(contentId: string, userId: string, data: Partial<Omit<ScoreDoc, 'id' | 'type'>>): Promise<void> {
  const q = query(collection(db, 'scores'), where('contentId', '==', contentId), where('userId', '==', userId));
  const snap = await getDocs(q);
  if (snap.empty) {
    await addDoc(collection(db, 'scores'), { type: 'score', contentId, userId, ...data, updatedAt: Timestamp.now() });
  } else {
    await updateDoc(snap.docs[0].ref, { ...data, updatedAt: Timestamp.now() });
  }
}

export async function getMyScore(contentId: string, userId: string): Promise<ScoreDoc | null> {
  const q = query(collection(db, 'scores'), where('contentId', '==', contentId), where('userId', '==', userId));
  const snap = await getDocs(q);
  return snap.empty ? null : mapDoc<ScoreDoc>(snap.docs[0]);
}

export async function getMyScores(userId: string): Promise<ScoreDoc[]> {
  const q = query(collection(db, 'scores'), where('userId', '==', userId));
  const snap = await getDocs(q);
  return snap.docs.map(d => mapDoc<ScoreDoc>(d));
}

// Leaderboard Subscription
export function subscribeLeaderboard(contentId: string, callback: (scores: ScoreDoc[]) => void): () => void {
  const q = query(collection(db, 'scores'), where('contentId', '==', contentId));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map(d => mapDoc<ScoreDoc>(d)));
  });
}
