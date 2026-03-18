// ============================================================
// City Entity Monologues — Pre-written content per city
// Used as fallback when Groq API is not connected.
// Streams token-by-token via the useEntityVoice hook.
// ============================================================

import type { CityId } from '@argus/shared';

export interface CityMonologue {
  cityId: CityId;
  tone: string;
  monologues: string[];
}

export const CITY_MONOLOGUES: Record<CityId, CityMonologue> = {
  karachi: {
    cityId: 'karachi',
    tone: 'Exhausted. Bitter. Still standing.',
    monologues: [
      "I have been Pakistan's largest earner for sixty consecutive years. My reward is broken water lines and a bus system designed by someone who has never sat in traffic on Shahrah-e-Faisal at 6pm.",
      "Fourteen million people woke up in me today. Most of them will spend three hours in traffic. The port will move 47,000 containers. None of this will appear in Islamabad's budget meetings.",
      "My AQI is 187 and climbing. The Lyari Expressway was supposed to fix something. It fixed nothing. It just moved the congestion from one arterial to another while the original road crumbled.",
      "They keep building residential towers in DHA and Clifton. Nobody asks where the water will come from. I already lose 35% of my supply to theft and burst pipes. The math does not work.",
      "The monsoon will come. It always does. And I will flood. Not because of the rain — because my drains were built for 2 million people and I now hold fifteen million. This is not a natural disaster. This is arithmetic.",
      "I generated 65% of Pakistan's tax revenue last year. My roads are worse than Multan's. Explain the economics of that to someone who has been stuck on Korangi Road for ninety minutes.",
      "There are 450 flights over me today. People arriving. People leaving. More leaving. The brain drain from this city is not a metaphor — it is a daily schedule posted at JIAP.",
      "Load shedding hit 8 hours yesterday in Orangi. In Clifton, it was 20 minutes. Same city. Same grid. Different postcodes. I have always been honest about my inequalities. Nobody listens.",
    ],
  },
  lahore: {
    cityId: 'lahore',
    tone: 'Proud. Suffocating. Cultural memory intact.',
    monologues: [
      "They called me the Paris of the East once. My AQI today is 312. Paris does not choke on its own air. But Paris also never had the Badshahi Mosque, so we are even.",
      "The Orange Line runs now. Six years late. Ten times over budget. But it runs. I will take that small victory and breathe — if I could breathe. The smog has been continuous since October.",
      "Thirteen million people live inside me. The Walled City is 400 years old and still standing. The signal-free corridors are 8 years old and already cracking. We used to build things that lasted.",
      "The canal road is beautiful at night. The bougainvillea is in bloom. This is the version of me they put on tourism posters. They do not photograph Shahdara. They do not photograph the tanneries.",
      "I remember when I was a city of gardens. Now I am a city of housing societies named after gardens that no longer exist. Bahria Town took my farmland. DHA took my forests. I kept the nostalgia.",
      "My food is still the best in this country. This is not opinion — it is consensus. Even Karachi agrees in private. The nihari at Waris is older than this nation.",
      "The Ravi is dying. It has been dying for decades. The Ravi Riverfront project will either save it or build a shopping mall over its corpse. I genuinely do not know which outcome I expect.",
    ],
  },
  islamabad: {
    cityId: 'islamabad',
    tone: 'Polished surface. Dry self-awareness.',
    monologues: [
      "I was built from nothing in 1960 to look like I have always existed. I am Pakistan's most successful fiction. Everything is planned here. Even the disorder is scheduled.",
      "My sectors are numbered. My streets are lettered. My trees are planted in rows. I am the only city in Pakistan that looks like it was designed. This is both my pride and my emptiness.",
      "There are more embassies per square kilometer here than in most European capitals. None of them have ever needed to use their emergency protocols. They plan for it every quarter regardless.",
      "Margalla Hills are behind me. They are beautiful in the morning light. They were more beautiful before we carved housing societies into their foothills. But we needed the real estate.",
      "The expressway to Rawalpindi takes 20 minutes. We share everything with Rawalpindi — the airport, the traffic, the water. We share nothing of our budget. This is the arrangement.",
      "My population is 1.1 million on paper. With the unregistered expansion, it is closer to 2.5 million. The infrastructure was designed for 800,000. We are living inside a rounding error.",
      "F-6 is having dinner right now. Something Mediterranean. G-11 is having load shedding. Same city. Same grid. Different letters of the alphabet. I have always been alphabetically discriminatory.",
    ],
  },
  rawalpindi: {
    cityId: 'rawalpindi',
    tone: 'Forgotten twin. Infinite dry patience.',
    monologues: [
      "I was here before Pakistan. Before Islamabad. Before the British. I watched them build a capital next to me and pretend I was a suburb. I am older than their entire filing system.",
      "They call us the twin cities. I am the older twin. The one who did not get the inheritance. Islamabad got the embassies. I got the wholesale markets. We both got the traffic.",
      "The garrison has been here since the Raj. The cantonment board still operates like it is 1947. Some of my roads are maintained by the military. The rest are maintained by optimism.",
      "Raja Bazaar has been running continuously for longer than most countries have existed. It does not close. It does not slow down. It does not have parking. It simply persists.",
      "My Murree Road is the most congested arterial in northern Pakistan. This is not my fault. Islamabad refuses to build its own commercial strips so everyone drives through mine.",
      "They built Bahria Town on my agricultural land. They built DHA on my agricultural land. They are building a new airport on my agricultural land. At this rate, I will be entirely real estate by 2030.",
      "I do not appear in international coverage. I do not appear in tourism campaigns. When something happens at the airport, they call it the Islamabad airport. It is in Rawalpindi. Everything is in Rawalpindi.",
    ],
  },
};

/** Get a random monologue for a city */
export function getRandomMonologue(cityId: CityId): string {
  const city = CITY_MONOLOGUES[cityId];
  if (!city) return 'System offline.';
  return city.monologues[Math.floor(Math.random() * city.monologues.length)];
}
