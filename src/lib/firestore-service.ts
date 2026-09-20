import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  onSnapshot,
  writeBatch,
} from 'firebase/firestore';
import { db } from './firebase.js';
import { CommitmentCard, InboxItem } from '../types.js';
import { MeetingItineraryItem } from '../types/itinerary.js';

// Default initial meetings for demo / reality test
export const INITIAL_MEETINGS: MeetingItineraryItem[] = [
  {
    id: 'meet-1',
    title: 'Weekly Cross-Functional Status & Alignment',
    calendarTime: '09:30 AM – 10:30 AM',
    startMinutes: 9 * 60 + 30,
    durationMinutes: 60,
    organizer: 'VP of Product',
    agendaSummary: 'Reviewing 15 slide deck of cross-team dependencies and timelines.',
    suggestedPosture: 'Show_Face_Early',
    chosenPosture: 'Show_Face_Early',
    tacticalExitMinute: 20,
    tacticalExitScript: '"Team, my updates are in slide 4. I have a hard stop to push the client deployment release. Ping me on Slack if anything blocks."',
    asyncUpdateNotes: 'Pushed release v1.4. Partition indices live.',
    energyDrainScore: 7,
  },
  {
    id: 'meet-2',
    title: 'Architecture Review: Tenant Isolation',
    calendarTime: '11:00 AM – 12:00 PM',
    startMinutes: 11 * 60,
    durationMinutes: 60,
    organizer: 'Lead Engineer',
    agendaSummary: 'Technical deep-dive on PKCE verification and database tenancy.',
    suggestedPosture: 'Full_Presence',
    chosenPosture: 'Full_Presence',
    tacticalExitMinute: 60,
    tacticalExitScript: '',
    energyDrainScore: 5,
  },
  {
    id: 'meet-3',
    title: 'Vendor Pitch & Exploratory Tool Demo',
    calendarTime: '02:00 PM – 03:00 PM',
    startMinutes: 14 * 60,
    durationMinutes: 60,
    organizer: 'Third-party Sales Team',
    agendaSummary: 'Introductory demo of telemetry observability suite.',
    suggestedPosture: 'Strategic_Ghost',
    chosenPosture: 'Strategic_Ghost',
    tacticalExitMinute: 0,
    tacticalExitScript: '"Declined: Prioritizing single-active sprint deliverables. Please send the 2-pager and recording for async review."',
    energyDrainScore: 9,
  },
  {
    id: 'meet-4',
    title: 'Quick 15-Min End-of-Day Tactical Sync',
    calendarTime: '04:30 PM – 04:45 PM',
    startMinutes: 16 * 60 + 30,
    durationMinutes: 15,
    organizer: 'Project Manager',
    agendaSummary: 'Confirming proof artifacts before tomorrow morning.',
    suggestedPosture: 'Full_Presence',
    chosenPosture: 'Full_Presence',
    tacticalExitMinute: 15,
    tacticalExitScript: '',
    energyDrainScore: 2,
  },
];

// Firebase Firestore helpers for Cards
export async function syncCardsToFirestore(cards: CommitmentCard[]): Promise<void> {
  try {
    const batch = writeBatch(db);
    cards.forEach((card) => {
      const ref = doc(db, 'commitments', card.id);
      batch.set(ref, card, { merge: true });
    });
    await batch.commit();
  } catch (err) {
    console.error('Failed to sync cards to Firestore:', err);
  }
}

export async function saveCardToFirestore(card: CommitmentCard): Promise<void> {
  try {
    const ref = doc(db, 'commitments', card.id);
    await setDoc(ref, card, { merge: true });
  } catch (err) {
    console.error('Failed to save card to Firestore:', err);
  }
}

export async function deleteCardFromFirestore(cardId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'commitments', cardId));
  } catch (err) {
    console.error('Failed to delete card from Firestore:', err);
  }
}

// Clear all cards in Firestore to start fresh with user's real data
export async function clearAllFirestoreData(): Promise<void> {
  try {
    const snapshot = await getDocs(collection(db, 'commitments'));
    const batch = writeBatch(db);
    snapshot.forEach((d) => {
      batch.delete(d.ref);
    });
    await batch.commit();
  } catch (err) {
    console.error('Failed to clear Firestore:', err);
  }
}
