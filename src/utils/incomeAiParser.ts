import { supabase } from '../supabaseClient';
import { fetchLogoForName } from './logo';

export interface ParsedIncomeResult {
  amount: number;
  name: string;
  category: string;
  deductionDay: number;
  icon: string;
  logo?: string;
  note?: string;
}

/**
 * Parses free text describing an income (e.g. "25000 från ur & penn", "CSN 13200", "Lön 34500 den 25:e")
 * using Supabase Edge Function with Google AI Gemini, with an instant robust client-side fallback.
 */
export async function parseIncomePrompt(
  prompt: string,
  availableCategories: string[] = ['Lön', 'CSN', 'Barnbidrag', 'Pension', 'Sidoinkomst', 'Övrigt'],
  defaultPayday: number = 25
): Promise<ParsedIncomeResult> {
  const trimmed = prompt.trim();
  if (!trimmed) {
    throw new Error('Ingen text angiven');
  }

  let result: Omit<ParsedIncomeResult, 'logo'> | null = null;

  // 1. Attempt Supabase Edge Function invocation
  try {
    const { data, error } = await supabase.functions.invoke('parse-income', {
      body: {
        prompt: trimmed,
        incomeCategories: availableCategories,
        defaultPayday,
      },
    });

    if (!error && data && typeof data.amount === 'number' && data.amount > 0) {
      result = {
        amount: Math.round(data.amount),
        name: data.name?.trim() || 'Lön',
        category: data.category?.trim() || 'Lön',
        deductionDay: Number(data.deductionDay) || defaultPayday,
        icon: data.icon || 'Briefcase',
        note: data.note || '',
      };
    }
  } catch (edgeErr) {
    console.warn('[parseIncomePrompt] Edge Function call failed, using client parser:', edgeErr);
  }

  // 2. Client-side fallback parser if Edge Function was unavailable
  if (!result) {
    result = parseIncomeLocally(trimmed, availableCategories, defaultPayday);
  }

  // 3. Enrich with company/brand logo
  let logo: string | undefined;
  try {
    logo = await fetchLogoForName(result.name, 'Lön');
  } catch (logoErr) {
    console.warn('[parseIncomePrompt] Could not fetch logo:', logoErr);
  }

  return {
    ...result,
    logo,
  };
}

/**
 * Intelligent local Swedish parser for income prompts.
 * Handles phrases like:
 * "25000 från ur & penn"
 * "25 000 kr lön från volvo"
 * "CSN 13200"
 * "Barnbidrag 2650 den 20:e"
 * "extrajobb 4500"
 */
export function parseIncomeLocally(
  prompt: string,
  categories: string[],
  defaultPayday: number
): Omit<ParsedIncomeResult, 'logo'> {
  let cleaned = prompt.trim();

  // Extract day if mentioned (e.g. "den 25:e", "den 27", "25e")
  let deductionDay = defaultPayday;
  const dayMatch = cleaned.match(/(?:den\s+)?(\d{1,2})(?::?e)?(?:\s+varje\s+månad)?/i);
  if (dayMatch) {
    const d = parseInt(dayMatch[1], 10);
    if (d >= 1 && d <= 31 && d !== 2024 && d !== 2025 && d !== 2026) {
      deductionDay = d;
    }
  }

  // Extract amount
  let amount = 0;
  // Match "25k" or "25 tkr"
  const kMatch = cleaned.match(/(\d+[\d\s.,]*)\s*(?:k|tkr)\b/i);
  if (kMatch) {
    const num = parseFloat(kMatch[1].replace(/\s+/g, '').replace(',', '.'));
    amount = Math.round(num * 1000);
    cleaned = cleaned.replace(kMatch[0], '');
  } else {
    // Match normal number like 25000, 25 000, 25.000, 25,000
    const numMatch = cleaned.match(/(\d[\d\s.,]*)/);
    if (numMatch) {
      const raw = numMatch[1].replace(/\s+/g, '').replace(',', '.');
      amount = Math.round(parseFloat(raw)) || 0;
      cleaned = cleaned.replace(numMatch[0], '');
    }
  }

  // Remove filler Swedish prepositions
  let name = cleaned
    .replace(/\b(?:kr|sek|kronor|från|fran|hos|på|pa|inkomst|lön|lon|månadsvis|månaden|varje\s+månad|den\s+\d{1,2}:?e?)\b/gi, ' ')
    .replace(/[.,\-_/]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  let category = 'Lön';
  let icon = 'Briefcase';

  const lowerPrompt = prompt.toLowerCase();
  if (lowerPrompt.includes('csn') || lowerPrompt.includes('studie')) {
    name = name || 'CSN';
    category = 'CSN';
    icon = 'GraduationCap';
  } else if (lowerPrompt.includes('barnbidrag') || lowerPrompt.includes('föräldrapenning')) {
    name = name || 'Försäkringskassan';
    category = 'Barnbidrag';
    icon = 'Heart';
  } else if (lowerPrompt.includes('pension')) {
    name = name || 'Pensionsmyndigheten';
    category = 'Pension';
    icon = 'Wallet';
  } else if (lowerPrompt.includes('sido') || lowerPrompt.includes('extra') || lowerPrompt.includes('gig')) {
    name = name || 'Sidoinkomst';
    category = 'Sidoinkomst';
    icon = 'Wallet';
  } else {
    name = name || 'Lön';
    category = 'Lön';
    icon = 'Briefcase';
  }

  // Capitalize name nicely (e.g. "ur & penn" -> "Ur & Penn")
  name = name.split(' ')
    .map(w => {
      const low = w.toLowerCase();
      if (low === '&' || low === 'och') return '&';
      return w.charAt(0).toUpperCase() + w.slice(1);
    })
    .join(' ');

  // Match against available categories
  const matchedCat = categories.find(c => c.toLowerCase() === category.toLowerCase()) || categories[0] || 'Lön';

  return {
    amount,
    name,
    category: matchedCat,
    deductionDay,
    icon,
    note: '',
  };
}
