// Waren im Späti. Neue Ware = neuer Eintrag hier plus ein Eintrag im Tech-Tree (upgrades.ts).

import type { CustomerType } from './customers';

export type ProductId = 'bier' | 'kaffee' | 'mate' | 'schoki' | 'pfeffi' | 'lotto';

export interface Product {
  id: ProductId;
  name: string;      // Einzahl, z. B. für „Kassieren · Bier“
  plural: string;    // fürs Lager, z. B. „24 Flaschen“
  price: number;     // Verkaufspreis
  buyPrice: number;  // Einkaufspreis pro Stück
  orderAmount: number;
  place: 'fridge' | 'shelf' | 'counter'; // wo Kunden die Ware holen
  fans: Partial<Record<CustomerType, number>>; // wie gern welcher Kundentyp das kauft
}

export const PRODUCTS: Record<ProductId, Product> = {
  bier: {
    id: 'bier', name: 'Bier', plural: 'Flaschen', price: 1.5, buyPrice: 0.6, orderAmount: 10, place: 'fridge',
    fans: { oma: 1, raver: 3, tourist: 3, bauarbeiter: 4 },
  },
  kaffee: {
    id: 'kaffee', name: 'Kaffee', plural: 'Becher', price: 1.8, buyPrice: 0.4, orderAmount: 10, place: 'counter',
    fans: { oma: 4, bauarbeiter: 4, tourist: 1, raver: 1 },
  },
  mate: {
    id: 'mate', name: 'Club-Mate', plural: 'Flaschen', price: 2.2, buyPrice: 0.9, orderAmount: 10, place: 'fridge',
    fans: { raver: 5, tourist: 2 },
  },
  schoki: {
    id: 'schoki', name: 'Schokolade', plural: 'Tafeln', price: 1.5, buyPrice: 0.5, orderAmount: 10, place: 'shelf',
    fans: { tourist: 4, oma: 2, raver: 1 },
  },
  pfeffi: {
    id: 'pfeffi', name: 'Pfeffi', plural: 'Fläschchen', price: 1.9, buyPrice: 0.5, orderAmount: 10, place: 'fridge',
    fans: { raver: 4, tourist: 2, bauarbeiter: 1 },
  },
  lotto: {
    id: 'lotto', name: 'Lottoschein', plural: 'Scheine', price: 3, buyPrice: 1.2, orderAmount: 10, place: 'counter',
    fans: { oma: 5, bauarbeiter: 2 },
  },
};

export const PRODUCT_IDS = Object.keys(PRODUCTS) as ProductId[];
