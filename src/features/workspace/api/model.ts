import type { QuizContent } from '../../quizzes/api/model';
export interface StudyClass {
    id: string;
    name: string;
    subject: string;
    description: string;
    icon: string;
    color: string;
    progress: number;
}
export interface StudyLesson {
    id: string;
    classId: string;
    title: string;
    minutes: number;
    status: 'Not started' | 'In progress' | 'Complete';
    markdown: string;
}
export interface StudyFile {
    id: string;
    name: string;
    kind: string;
    size: number;
    uploader: string;
    description: string;
    folder: string;
    saved: boolean;
    date: string;
}
export interface StudyMessage {
    id: string;
    author: string;
    avatar: number;
    body: string;
    time: string;
    classId?: string;
    own?: boolean;
}
export interface StudyQuiz {
    id: string;
    classId: string;
    title: string;
    status: 'Published' | 'Pending' | 'Draft' | 'Rejected';
    description: string;
    content: QuizContent;
}
export interface StudyMember {
    id: string;
    name: string;
    email: string;
    role: 'Admin' | 'Member';
    status: 'Approved' | 'Invited' | 'Disabled';
    avatar: number;
}
export interface StudyNote {
    id: string;
    classId: string;
    title: string;
    body: string;
}
export interface WorkspaceSnapshot {
    classes: StudyClass[];
    lessons: StudyLesson[];
    files: StudyFile[];
    folders: string[];
    quizzes: StudyQuiz[];
    messages: StudyMessage[];
    members: StudyMember[];
    notes: StudyNote[];
    notifications: {
        id: string;
        text: string;
        read: boolean;
    }[];
    activity: {
        id: string;
        action: string;
        actor: string;
        time: string;
    }[];
}
/** UI data is supplied through this boundary. The local preview never calls Supabase. */
export interface WorkspaceAccess {
    read(): Promise<WorkspaceSnapshot>;
    createFolder(path: string): Promise<void>;
    createClass(value: Omit<StudyClass, 'id' | 'progress'>): Promise<void>;
    createNote(value: Omit<StudyNote, 'id'>): Promise<void>;
    saveLesson(id: string, confidence: number): Promise<void>;
    sendMessage(body: string, classId?: string): Promise<void>;
    saveFile(id: string): Promise<void>;
    addFile(file: File, description: string, folder: string, onProgress: (n: number) => void): Promise<void>;
    reviewQuiz(id: string, approved: boolean, note: string): Promise<void>;
    setMember(id: string, role: StudyMember['role'], status: StudyMember['status']): Promise<void>;
    readNotifications(): Promise<void>;
}
