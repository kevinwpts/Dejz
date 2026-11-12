// Banklogga: en källa per bank (lokal appikon eller bokstavsruta, se utils/bankMarks.ts).
// Okända banker får alltid en bokstavsruta – aldrig en ordbild eller favicon från nätet.
import React from 'react';
import { findBankMark } from '../utils/bankMarks';
import { ItemLogo } from './ItemLogo';
import { MonogramTile, type LogoTileSize } from './MonogramTile';

interface BankLogoProps {
  name: string;
  size?: LogoTileSize;
}

export const BankLogo: React.FC<BankLogoProps> = ({ name, size = 'md' }) =>
  findBankMark(name) ? <ItemLogo name={name} size={size} /> : <MonogramTile name={name} size={size} />;
