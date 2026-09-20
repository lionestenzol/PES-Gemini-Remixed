// Meeting Itinerary Protocol & Real-time Prediction Engine Types

export type MeetingPosture =
  | 'Full_Presence'      // Active stakeholder, speaking, decisions
  | 'Show_Face_Early'    // Tactical 15-20m check-in, say hi, confirm status, leave before circular debate
  | 'Passive_Listener'   // Camera off, audio background while executing
  | 'Strategic_Ghost'    // Planned calendar block to do deep work, reject meeting
  | 'Extended_Lunch_Opt' // Meeting coincides with 90m recovery block; decline with async update
  | 'Async_Decline';     // Decline with pre-written status message

export interface MeetingItineraryItem {
  id: string;
  title: string;
  calendarTime: string; // e.g., "10:30 AM - 11:30 AM"
  startMinutes: number; // minutes from midnight (e.g. 630 for 10:30)
  durationMinutes: number;
  organizer: string;
  agendaSummary: string;
  suggestedPosture: MeetingPosture;
  chosenPosture: MeetingPosture;
  tacticalExitMinute?: number; // e.g., 20
  tacticalExitScript?: string; // Pre-scripted exit line to drop in chat
  asyncUpdateNotes?: string;
  energyDrainScore: number; // 1 to 10 scale
}

export interface DayPredictionForecast {
  energySurplusScore: number; // 0 to 100
  riskOfBurnout: 'Low' | 'Moderate' | 'High' | 'Critical';
  recommendedInpactMode: 'A' | 'B' | 'C' | 'D';
  frictionPoints: string[];
  batteryDrainForecast: {
    hour: string;
    batteryLevel: number; // 0 - 100%
    primaryDrain: string;
  }[];
  strategicAdvice: string;
}
