// Kända bolag bakom räkningar med allmänna namn ("El", "Hyra", "Telefon", "Internet").
import { foldForMatching } from './text';

const word = (w: string) => new RegExp(`(^| )${w}( |$)`);
const ELECTRICITY = [
  'vattenfall', 'tibber', 'ellevio', 'fortum', 'e on', 'eon', 'oresundskraft', 'goteborg energi',
  'skelleftea kraft', 'jamtkraft', 'malarenergi', 'telge energi', 'bixia', 'greenely', 'godel',
  'kalmar energi', 'jonkoping energi', 'tekniska verken', 'umea energi', 'lulea energi', 'sundsvall elnat',
].map(word);
const HOUSING = [
  'heimstaden', 'akelius', 'balder', 'wallenstam', 'riksbyggen', 'hsb', 'brf', 'bostadsrattsforening',
  'stena fastigheter', 'victoriahem', 'willhem', 'rikshem', 'hyresvard', 'fastighet', 'fastigheter',
  'bostader', 'bostad', 'hyra',
].map(word);
const PHONE = ['telia', 'tele2', 'telenor', 'hi3g', 'tre sverige', 'comviq', 'halebop', 'vimla', 'fello', 'hallon'].map(word);
const INTERNET = ['bahnhof', 'bredband2', 'ownit', 'comhem', 'com hem', 'telia', 'tele2', 'telenor', 'tre sverige', 'hi3g'].map(word);

const GENERIC_BILL_NAMES: Array<{ names: string[]; providers: RegExp[] }> = [
  { names: ['el', 'elen', 'elrakning', 'elraking', 'elavtal', 'elnat', 'strom', 'elrakningen', 'el och natavgift'], providers: ELECTRICITY },
  { names: ['hyra', 'hyran', 'boende', 'bostad', 'hyresavi', 'manadsavgift', 'avgift brf'], providers: HOUSING },
  { names: ['telefon', 'mobil', 'mobilabonnemang', 'telefonrakning', 'mobiltelefon', 'mobilrakning'], providers: PHONE },
  { names: ['internet', 'bredband', 'wifi', 'fiber'], providers: INTERNET },
];

/** Bolag som kan stå bakom en räkning med ett allmänt namn, t.ex. "El" → elbolag. Annars null. */
export function getGenericBillProviders(name: string): RegExp[] | null {
  const n = foldForMatching(name);
  for (const group of GENERIC_BILL_NAMES) {
    if (group.names.includes(n)) return group.providers;
  }
  return null;
}
