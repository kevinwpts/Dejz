export interface SwedishExpensePreset {
  id: string;
  name: string;
  defaultAmount: number;
  category: string;
  deductionDay: number;
  paymentMethod: string;
  popular?: boolean;
  frequency?: string;
}

export const SWEDISH_EXPENSE_PRESETS: SwedishExpensePreset[] = [
  // --- STREAMING FILM, SERIER & TV ---
  { id: 'spotify-individual', name: 'Spotify', defaultAmount: 119, category: 'Streaming & Abonnemang', deductionDay: 24, paymentMethod: 'Kort', popular: true },
  { id: 'netflix-standard', name: 'Netflix', defaultAmount: 109, category: 'Streaming & Abonnemang', deductionDay: 24, paymentMethod: 'Kort', popular: true },
  { id: 'youtube-premium', name: 'YouTube Premium', defaultAmount: 149, category: 'Streaming & Abonnemang', deductionDay: 24, paymentMethod: 'Kort', popular: true },
  { id: 'disney-plus', name: 'Disney+', defaultAmount: 89, category: 'Streaming & Abonnemang', deductionDay: 24, paymentMethod: 'Kort', popular: true },
  { id: 'max-hbo', name: 'Max (HBO)', defaultAmount: 89, category: 'Streaming & Abonnemang', deductionDay: 24, paymentMethod: 'Kort', popular: true },
  { id: 'viaplay-film-serier', name: 'Viaplay', defaultAmount: 169, category: 'Streaming & Abonnemang', deductionDay: 24, paymentMethod: 'Kort', popular: true },
  { id: 'tv4-play-plus', name: 'TV4 Play Plus', defaultAmount: 69, category: 'Streaming & Abonnemang', deductionDay: 24, paymentMethod: 'Kort', popular: true },
  { id: 'prime-video', name: 'Amazon Prime', defaultAmount: 59, category: 'Streaming & Abonnemang', deductionDay: 24, paymentMethod: 'Kort', popular: true },
  { id: 'apple-tv-plus', name: 'Apple TV+', defaultAmount: 99, category: 'Streaming & Abonnemang', deductionDay: 24, paymentMethod: 'Kort', popular: true },
  { id: 'skyshowtime', name: 'SkyShowtime', defaultAmount: 79, category: 'Streaming & Abonnemang', deductionDay: 24, paymentMethod: 'Kort', popular: true },
  { id: 'viaplay-total-sport', name: 'Viaplay Total (Sport)', defaultAmount: 699, category: 'Streaming & Abonnemang', deductionDay: 24, paymentMethod: 'Kort' },
  { id: 'discovery-plus', name: 'Discovery+', defaultAmount: 89, category: 'Streaming & Abonnemang', deductionDay: 24, paymentMethod: 'Kort' },
  { id: 'crunchyroll', name: 'Crunchyroll', defaultAmount: 85, category: 'Streaming & Abonnemang', deductionDay: 24, paymentMethod: 'Kort' },

  // --- LJUD, MUSIK & BÖCKER ---
  { id: 'storytel-ljudbok', name: 'Storytel', defaultAmount: 179, category: 'Streaming & Abonnemang', deductionDay: 24, paymentMethod: 'Kort', popular: true },
  { id: 'bookbeat', name: 'BookBeat', defaultAmount: 149, category: 'Streaming & Abonnemang', deductionDay: 24, paymentMethod: 'Kort', popular: true },
  { id: 'apple-music', name: 'Apple Music', defaultAmount: 119, category: 'Streaming & Abonnemang', deductionDay: 24, paymentMethod: 'Kort', popular: true },
  { id: 'podme', name: 'PodMe Premium', defaultAmount: 79, category: 'Streaming & Abonnemang', deductionDay: 24, paymentMethod: 'Kort', popular: true },
  { id: 'nextory', name: 'Nextory', defaultAmount: 139, category: 'Streaming & Abonnemang', deductionDay: 24, paymentMethod: 'Kort' },
  { id: 'audible', name: 'Audible', defaultAmount: 120, category: 'Streaming & Abonnemang', deductionDay: 24, paymentMethod: 'Kort' },
  { id: 'tidal', name: 'Tidal', defaultAmount: 119, category: 'Streaming & Abonnemang', deductionDay: 24, paymentMethod: 'Kort' },

  // --- BOENDE, EL & FÖRSÄKRING ---
  { id: 'hyra-bostad', name: 'Hyra / Månadsavgift', defaultAmount: 6500, category: 'Boende', deductionDay: 27, paymentMethod: 'Bankgiro', popular: true },
  { id: 'bostadslan-ranta', name: 'Bolån & Ränta', defaultAmount: 8500, category: 'Boende', deductionDay: 28, paymentMethod: 'Autogiro', popular: true },
  { id: 'hemforsakring', name: 'Hemförsäkring', defaultAmount: 165, category: 'Försäkringar', deductionDay: 27, paymentMethod: 'Autogiro', popular: true },
  { id: 'hedvig-hemforsakring', name: 'Hedvig Försäkring', defaultAmount: 129, category: 'Försäkringar', deductionDay: 24, paymentMethod: 'Kort', popular: true },
  { id: 'lansforsakringar-hem', name: 'Länsförsäkringar', defaultAmount: 185, category: 'Försäkringar', deductionDay: 27, paymentMethod: 'Autogiro', popular: true },
  { id: 'trygghansa-hem', name: 'Trygg-Hansa', defaultAmount: 195, category: 'Försäkringar', deductionDay: 27, paymentMethod: 'Autogiro', popular: true },
  { id: 'if-hemforsakring', name: 'If Försäkring', defaultAmount: 175, category: 'Försäkringar', deductionDay: 27, paymentMethod: 'Autogiro', popular: true },
  { id: 'folksam-hem', name: 'Folksam', defaultAmount: 165, category: 'Försäkringar', deductionDay: 27, paymentMethod: 'Autogiro', popular: true },
  { id: 'elavtal', name: 'Elräkning & Nät', defaultAmount: 480, category: 'Boende', deductionDay: 28, paymentMethod: 'Autogiro', popular: true },
  { id: 'tibber-el', name: 'Tibber El', defaultAmount: 350, category: 'Boende', deductionDay: 27, paymentMethod: 'Autogiro', popular: true },
  { id: 'vattenfall-el', name: 'Vattenfall', defaultAmount: 620, category: 'Boende', deductionDay: 28, paymentMethod: 'Autogiro' },
  { id: 'fortum-el', name: 'Fortum', defaultAmount: 490, category: 'Boende', deductionDay: 28, paymentMethod: 'Autogiro' },
  { id: 'larm-verisure', name: 'Verisure Larm', defaultAmount: 469, category: 'Boende', deductionDay: 27, paymentMethod: 'Autogiro', popular: true },
  { id: 'larm-sector-alarm', name: 'Sector Alarm', defaultAmount: 449, category: 'Boende', deductionDay: 27, paymentMethod: 'Autogiro' },
  { id: 'sophantning-vatten', name: 'Vatten & Sophämtning', defaultAmount: 420, category: 'Boende', deductionDay: 28, paymentMethod: 'Autogiro' },

  // --- MOBIL & BREDBAND ---
  { id: 'mobilabonnemang', name: 'Mobilabonnemang', defaultAmount: 299, category: 'Abonnemang', deductionDay: 27, paymentMethod: 'Autogiro', popular: true },
  { id: 'bredband-hemma', name: 'Bredband / Fiber', defaultAmount: 399, category: 'Abonnemang', deductionDay: 27, paymentMethod: 'Autogiro', popular: true },
  { id: 'tele2-mobil', name: 'Tele2', defaultAmount: 329, category: 'Abonnemang', deductionDay: 27, paymentMethod: 'Autogiro', popular: true },
  { id: 'telia-mobil', name: 'Telia', defaultAmount: 399, category: 'Abonnemang', deductionDay: 27, paymentMethod: 'Autogiro', popular: true },
  { id: 'telenor-mobil', name: 'Telenor', defaultAmount: 369, category: 'Abonnemang', deductionDay: 27, paymentMethod: 'Autogiro', popular: true },
  { id: 'tre-mobil', name: 'Tre (3)', defaultAmount: 329, category: 'Abonnemang', deductionDay: 27, paymentMethod: 'Autogiro', popular: true },
  { id: 'vimla-mobil', name: 'Vimla', defaultAmount: 160, category: 'Abonnemang', deductionDay: 24, paymentMethod: 'Kort', popular: true },
  { id: 'hallon-mobil', name: 'Hallon', defaultAmount: 149, category: 'Abonnemang', deductionDay: 24, paymentMethod: 'Kort', popular: true },
  { id: 'bahnhoff-bredband', name: 'Bahnhof', defaultAmount: 389, category: 'Abonnemang', deductionDay: 27, paymentMethod: 'Autogiro', popular: true },
  { id: 'halebop-mobil', name: 'Halebop', defaultAmount: 269, category: 'Abonnemang', deductionDay: 27, paymentMethod: 'Autogiro' },
  { id: 'fello-mobil', name: 'Fello', defaultAmount: 145, category: 'Abonnemang', deductionDay: 24, paymentMethod: 'Kort' },
  { id: 'comviq-mobil', name: 'Comviq', defaultAmount: 225, category: 'Abonnemang', deductionDay: 27, paymentMethod: 'Autogiro' },
  { id: 'ownit-bredband', name: 'Ownit', defaultAmount: 349, category: 'Abonnemang', deductionDay: 27, paymentMethod: 'Autogiro' },
  { id: 'bredband2', name: 'Bredband2', defaultAmount: 369, category: 'Abonnemang', deductionDay: 27, paymentMethod: 'Autogiro' },

  // --- TRÄNING & HÄLSA ---
  { id: 'sats-gym', name: 'SATS', defaultAmount: 649, category: 'Träning & Hälsa', deductionDay: 27, paymentMethod: 'Autogiro', popular: true },
  { id: 'nordic-wellness', name: 'Nordic Wellness', defaultAmount: 429, category: 'Träning & Hälsa', deductionDay: 27, paymentMethod: 'Autogiro', popular: true },
  { id: 'fitness24seven', name: 'Fitness24Seven', defaultAmount: 299, category: 'Träning & Hälsa', deductionDay: 27, paymentMethod: 'Autogiro', popular: true },
  { id: 'friskis-svettis', name: 'Friskis & Svettis', defaultAmount: 369, category: 'Träning & Hälsa', deductionDay: 27, paymentMethod: 'Autogiro', popular: true },
  { id: 'actic-gym', name: 'Actic', defaultAmount: 499, category: 'Träning & Hälsa', deductionDay: 27, paymentMethod: 'Autogiro', popular: true },
  { id: 'stc-training', name: 'STC', defaultAmount: 379, category: 'Träning & Hälsa', deductionDay: 27, paymentMethod: 'Autogiro' },
  { id: 'strava-premium', name: 'Strava', defaultAmount: 79, category: 'Träning & Hälsa', deductionDay: 24, paymentMethod: 'Kort', popular: true },
  { id: 'whoop-membership', name: 'WHOOP', defaultAmount: 310, category: 'Träning & Hälsa', deductionDay: 24, paymentMethod: 'Kort' },

  // --- TRANSPORT & FORDON ---
  { id: 'sl-manadskort', name: 'SL Månadskort', defaultAmount: 1020, category: 'Transport', deductionDay: 25, paymentMethod: 'Kort', popular: true },
  { id: 'vasttrafik-period', name: 'Västtrafik Månadskort', defaultAmount: 835, category: 'Transport', deductionDay: 25, paymentMethod: 'Kort', popular: true },
  { id: 'skanetrafiken-period', name: 'Skånetrafiken', defaultAmount: 920, category: 'Transport', deductionDay: 25, paymentMethod: 'Kort', popular: true },
  { id: 'bilforsakring', name: 'Bilförsäkring', defaultAmount: 450, category: 'Försäkringar', deductionDay: 27, paymentMethod: 'Autogiro', popular: true },
  { id: 'parkering-boende', name: 'Boendeparkering', defaultAmount: 850, category: 'Transport', deductionDay: 27, paymentMethod: 'Autogiro', popular: true },
  { id: 'bil-leasing', name: 'Privatleasing Bil', defaultAmount: 3890, category: 'Transport', deductionDay: 28, paymentMethod: 'Autogiro', popular: true },
  { id: 'easypark-medlemskap', name: 'EasyPark', defaultAmount: 29, category: 'Transport', deductionDay: 27, paymentMethod: 'Kort' },
  { id: 'trangselskatt-infrastruktur', name: 'Trängselskatt', defaultAmount: 350, category: 'Transport', deductionDay: 28, paymentMethod: 'Autogiro' },

  // --- FACK, A-KASSA & CSN ---
  { id: 'csn-aterbetalning', name: 'CSN Lån', defaultAmount: 750, category: 'Lån & Krediter', deductionDay: 28, paymentMethod: 'Autogiro', popular: true },
  { id: 'akassa-unionen', name: 'Unionen A-kassa/Fack', defaultAmount: 295, category: 'Fack & A-kassa', deductionDay: 27, paymentMethod: 'Autogiro', popular: true },
  { id: 'akassa-sveriges-ingenjorer', name: 'Sveriges Ingenjörer', defaultAmount: 330, category: 'Fack & A-kassa', deductionDay: 27, paymentMethod: 'Autogiro', popular: true },
  { id: 'akassa-kommunal', name: 'Kommunal', defaultAmount: 350, category: 'Fack & A-kassa', deductionDay: 27, paymentMethod: 'Autogiro', popular: true },
  { id: 'akassa-vision', name: 'Vision', defaultAmount: 280, category: 'Fack & A-kassa', deductionDay: 27, paymentMethod: 'Autogiro' },
  { id: 'akassa-alfakassan', name: 'Alfa-kassan', defaultAmount: 140, category: 'Fack & A-kassa', deductionDay: 27, paymentMethod: 'Autogiro' },
  { id: 'djurforsakring-agria', name: 'Agria Djurförsäkring', defaultAmount: 320, category: 'Försäkringar', deductionDay: 27, paymentMethod: 'Autogiro', popular: true },
  { id: 'lassie-djurforsakring', name: 'Lassie Djurförsäkring', defaultAmount: 280, category: 'Försäkringar', deductionDay: 24, paymentMethod: 'Kort' },
  { id: 'barnforsakring', name: 'Barnförsäkring', defaultAmount: 210, category: 'Försäkringar', deductionDay: 27, paymentMethod: 'Autogiro' },

  // --- TECH, MOLN & AI ---
  { id: 'icloud-storage', name: 'iCloud (Apple)', defaultAmount: 39, category: 'Abonnemang', deductionDay: 24, paymentMethod: 'Kort', popular: true },
  { id: 'chatgpt-plus', name: 'ChatGPT Plus', defaultAmount: 235, category: 'AI & Mjukvara', deductionDay: 24, paymentMethod: 'Kort', popular: true },
  { id: 'google-one-100gb', name: 'Google One', defaultAmount: 19, category: 'Abonnemang', deductionDay: 24, paymentMethod: 'Kort', popular: true },
  { id: 'microsoft-365', name: 'Microsoft 365', defaultAmount: 75, category: 'Abonnemang', deductionDay: 24, paymentMethod: 'Kort', popular: true },
  { id: 'claude-pro', name: 'Claude Pro', defaultAmount: 235, category: 'AI & Mjukvara', deductionDay: 24, paymentMethod: 'Kort' },
  { id: 'adobe-photography', name: 'Adobe Lightroom/PS', defaultAmount: 130, category: 'AI & Mjukvara', deductionDay: 24, paymentMethod: 'Kort' },
  { id: '1password', name: '1Password', defaultAmount: 39, category: 'Abonnemang', deductionDay: 24, paymentMethod: 'Kort' },
  { id: 'nordvpn', name: 'NordVPN', defaultAmount: 49, category: 'Abonnemang', deductionDay: 24, paymentMethod: 'Kort' },

  // --- GAMING & NÖJE ---
  { id: 'playstation-plus', name: 'PlayStation Plus', defaultAmount: 95, category: 'Gaming', deductionDay: 24, paymentMethod: 'Kort', popular: true },
  { id: 'xbox-game-pass', name: 'Xbox Game Pass', defaultAmount: 179, category: 'Gaming', deductionDay: 24, paymentMethod: 'Kort', popular: true },
  { id: 'nintendo-switch-online', name: 'Nintendo Switch Online', defaultAmount: 45, category: 'Gaming', deductionDay: 24, paymentMethod: 'Kort', popular: true },
  { id: 'discord-nitro', name: 'Discord Nitro', defaultAmount: 109, category: 'Gaming', deductionDay: 24, paymentMethod: 'Kort', popular: true },
  { id: 'twitch-subs', name: 'Twitch', defaultAmount: 55, category: 'Gaming', deductionDay: 24, paymentMethod: 'Kort' },

  // --- NYHETER & TIDNINGAR ---
  { id: 'aftonbladet-plus', name: 'Aftonbladet Plus', defaultAmount: 79, category: 'Nyheter', deductionDay: 24, paymentMethod: 'Kort', popular: true },
  { id: 'expressen-premium', name: 'Expressen Premium', defaultAmount: 79, category: 'Nyheter', deductionDay: 24, paymentMethod: 'Kort', popular: true },
  { id: 'dagens-nyheter', name: 'Dagens Nyheter', defaultAmount: 149, category: 'Nyheter', deductionDay: 24, paymentMethod: 'Kort', popular: true },
  { id: 'svenska-dagbladet', name: 'Svenska Dagbladet', defaultAmount: 149, category: 'Nyheter', deductionDay: 24, paymentMethod: 'Kort' },
  { id: 'dagens-industri', name: 'Dagens Industri', defaultAmount: 399, category: 'Nyheter', deductionDay: 24, paymentMethod: 'Kort' },
  { id: 'readly-tidningar', name: 'Readly', defaultAmount: 149, category: 'Nyheter', deductionDay: 24, paymentMethod: 'Kort' },

  // --- MATKASSAR & DATING ---
  { id: 'hello-fresh', name: 'HelloFresh', defaultAmount: 1950, category: 'Mat & Dryck', deductionDay: 27, paymentMethod: 'Kort', popular: true },
  { id: 'linas-matkasse', name: 'Linas Matkasse', defaultAmount: 1890, category: 'Mat & Dryck', deductionDay: 27, paymentMethod: 'Kort' },
  { id: 'tinder-plus', name: 'Tinder', defaultAmount: 149, category: 'Streaming & Abonnemang', deductionDay: 24, paymentMethod: 'Kort', popular: true },
  { id: 'hinge-preferred', name: 'Hinge', defaultAmount: 199, category: 'Streaming & Abonnemang', deductionDay: 24, paymentMethod: 'Kort' },
];
