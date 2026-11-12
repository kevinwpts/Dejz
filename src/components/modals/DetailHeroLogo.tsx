import { ItemLogo } from '../ItemLogo';
import { resolveCategoryColor } from '../CategoryIcon';
import { isMerchantCategoryIconPreferred, setMerchantCategoryIconPreferred } from '../../utils/logo';
import { useExternalSnapshot } from '../../utils/hooks/useExternalSnapshot';

interface DetailHeroLogoProps {
  name: string;
  category: string;
  logoUrl?: string;
  isRecurring: boolean;
  /** Höjs när loggan eller kategorin ändrats någon annanstans – då läses inställningarna om */
  refreshKey: number;
  /** Anropas efter att användaren växlat mellan logga och kategoriikon */
  onToggled: () => void;
}

/** Stora loggan överst i detaljvyer, med kategorins färg som glöd. Tryck växlar logga/kategoriikon. */
export function DetailHeroLogo({ name, category, logoUrl, isRecurring, refreshKey, onToggled }: DetailHeroLogoProps) {
  const accentColor = useExternalSnapshot(() => resolveCategoryColor(category), [category, refreshKey]);
  const prefersCatIcon = useExternalSnapshot(() => isMerchantCategoryIconPreferred(name), [name, refreshKey]);

  return (
    <>
      <div
        className="pointer-events-none absolute -top-10 left-1/2 -translate-x-1/2 w-44 h-32 rounded-full blur-2xl opacity-15 dark:opacity-20"
        style={{ backgroundColor: accentColor }}
      />
      <div className="relative flex justify-center mb-3.5">
        <button
          type="button"
          onClick={() => {
            setMerchantCategoryIconPreferred(name, !prefersCatIcon);
            onToggled();
          }}
          title={prefersCatIcon ? 'Tryck för att visa företagslogga' : 'Tryck för att visa kategori-ikon'}
          aria-label={prefersCatIcon ? 'Visa företagslogga' : 'Visa kategoriikon'}
          className="relative group/logo cursor-pointer rounded-2xl focus:outline-none active:scale-95 transition-transform"
        >
          <ItemLogo
            key={`hero-logo-${refreshKey}`}
            name={name}
            category={category}
            logoUrl={logoUrl}
            size="xl"
            isRecurring={isRecurring}
          />
        </button>
      </div>
    </>
  );
}
