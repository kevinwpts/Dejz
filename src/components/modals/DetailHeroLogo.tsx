import { ItemLogo } from '../ItemLogo';
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

/** Stora loggan överst i detaljvyer, Tryck växlar logga/kategoriikon. */
export function DetailHeroLogo({ name, category, logoUrl, isRecurring, refreshKey, onToggled }: DetailHeroLogoProps) {
  const prefersCatIcon = useExternalSnapshot(() => isMerchantCategoryIconPreferred(name), [name, refreshKey]);

  return (
    <>
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
