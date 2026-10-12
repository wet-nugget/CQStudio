export const STORE_KEY='offlineClassQuizStudio.v1';
export const THEME_KEY='offlineClassQuizStudio.theme';
export const DATA_VERSION=1;
export const BACKUP_VERSION=1;
export const MAX_ICON_IMAGE=200*1024;
export const TYPES=['Multiple Choice','Multiple Responses','Matching','True or False','Identification','Fill in the Blank','Enumeration'];
export const DEFAULT_ICON={color:'#4f46e5',style:'Gradient',shape:'Rounded square',emoji:'📘',image:''};
export const ICON_COLORS=['#4f46e5','#2563eb','#06b6d4','#16a34a','#84cc16','#f59e0b','#f97316','#dc2626','#ec4899','#8b5cf6','#64748b','#111827'];
export const letters='ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
export const sampleQuiz=`# Quiz: Introduction to Biology
Class: Biology 101
Time Limit: 20
Points: 50

---

## Multiple Choice
Q: What is the basic unit of life?
A. Atom
B. Cell
C. Tissue
D. Organ
Answer: B

---

## Multiple Responses
Q: Which are states of matter?
A. Solid
B. Liquid
C. Photosynthesis
D. Gas
Answers:
- A
- B
- D

---

## Matching
Q: Match each organelle to its function.
Pairs:
- Mitochondria = Produces energy
- Ribosome = Builds proteins
- Nucleus = Stores DNA

---

## True or False
Q: Plants perform photosynthesis.
Answer: True

---

## Identification
Q: What organelle is known as the powerhouse of the cell?
Answers:
- Mitochondria
- the mitochondria

---

## Fill in the Blank
Q: The process by which plants make food is called ____.
Answer: photosynthesis

---

## Enumeration
Q: List three states of matter.
Answers:
- Solid
- Liquid
- Gas
`;