
export interface FoodResult {
  id:          string;
  name:        string;
  brand:       string;
  calories:    number;
  protein:     number;
  carbs:       number;
  fat:         number;
  servingSize: string;
  image?:      string;
  // ── MICRONUTRIENTS (optional — only from Open Food Facts) ──
  fiber_g?:      number;
  sugar_g?:      number;
  sodium_mg?:    number;
  vitamin_c_mg?: number;
  calcium_mg?:   number;
  iron_mg?:      number;
  potassium_mg?: number;
}

export const searchFoods = async (query: string): Promise<FoodResult[]> => {
  if (!query.trim() || query.length < 2) return [];

  try {
    const response = await fetch(
      `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=20&fields=product_name,brands,nutriments,serving_size,image_small_url`
    );

    if (!response.ok) throw new Error('API error');

    const data = await response.json();
    const products = data.products ?? [];

    const results: FoodResult[] = products
      .filter((p: any) => p.product_name && p.nutriments?.['energy-kcal_100g'])
      .map((p: any, i: number) => {
        const n = p.nutriments ?? {};
        return {
          id:          p.code ?? `off_${i}`,
          name:        p.product_name ?? 'Unknown',
          brand:       p.brands ?? '',
          calories:    Math.round(n['energy-kcal_100g'] ?? 0),
          protein:     Math.round((n.proteins_100g      ?? 0) * 10) / 10,
          carbs:       Math.round((n.carbohydrates_100g ?? 0) * 10) / 10,
          fat:         Math.round((n.fat_100g           ?? 0) * 10) / 10,
          servingSize: p.serving_size ?? '100g',
          image:       p.image_small_url,
          // ── Micronutrients — undefined if not in API response ──
          // Open Food Facts returns ALL nutrients in g/100g; convert to mg where needed
          fiber_g:      +(n.fiber_100g?.toFixed(1) ?? 0) || undefined,
          sugar_g:      +(n.sugars_100g?.toFixed(1) ?? 0) || undefined,
          sodium_mg:    n.sodium_100g     != null ? +(n.sodium_100g     * 1000).toFixed(1) : undefined,  // g→mg
          vitamin_c_mg: n['vitamin-c_100g'] != null ? +(n['vitamin-c_100g'] * 1000).toFixed(1) : undefined,
          calcium_mg:   n.calcium_100g    != null ? +(n.calcium_100g    * 1000).toFixed(1) : undefined,
          iron_mg:      n.iron_100g       != null ? +(n.iron_100g       * 1000).toFixed(1) : undefined,
          potassium_mg: n.potassium_100g  != null ? +(n.potassium_100g  * 1000).toFixed(1) : undefined,
        };
      });

    if (results.length === 0) return searchLocalFoods(query);
    return results;
  } catch {
    return searchLocalFoods(query);
  }
};

// ── LOCAL INDIAN FOOD DATABASE ────────────────────────────────
// No micronutrient data — fields are simply absent (undefined)
export const INDIAN_FOODS: FoodResult[] = [
  { id: 'in_1',  name: 'Butter Chicken',      brand: 'Indian', calories: 290, protein: 22, carbs: 8,  fat: 18, servingSize: '1 bowl (250g)' },
  { id: 'in_2',  name: 'Dal Tadka',           brand: 'Indian', calories: 180, protein: 10, carbs: 24, fat: 5,  servingSize: '1 bowl (200g)' },
  { id: 'in_3',  name: 'Roti (Chapati)',      brand: 'Indian', calories: 120, protein: 3,  carbs: 20, fat: 3,  servingSize: '2 pieces (80g)' },
  { id: 'in_4',  name: 'Basmati Rice',        brand: 'Indian', calories: 205, protein: 4,  carbs: 45, fat: 0,  servingSize: '1 cup cooked (200g)' },
  { id: 'in_5',  name: 'Chicken Biryani',     brand: 'Indian', calories: 350, protein: 18, carbs: 42, fat: 12, servingSize: '1 plate (300g)' },
  { id: 'in_6',  name: 'Paneer Tikka',        brand: 'Indian', calories: 270, protein: 18, carbs: 6,  fat: 20, servingSize: '6 pieces (150g)' },
  { id: 'in_7',  name: 'Masala Dosa',         brand: 'Indian', calories: 250, protein: 6,  carbs: 38, fat: 8,  servingSize: '1 dosa (180g)' },
  { id: 'in_8',  name: 'Idli with Sambar',    brand: 'Indian', calories: 160, protein: 6,  carbs: 32, fat: 1,  servingSize: '3 idlis + sambar' },
  { id: 'in_9',  name: 'Chole Bhature',       brand: 'Indian', calories: 450, protein: 12, carbs: 58, fat: 18, servingSize: '1 plate (350g)' },
  { id: 'in_10', name: 'Palak Paneer',        brand: 'Indian', calories: 240, protein: 14, carbs: 10, fat: 16, servingSize: '1 bowl (250g)' },
  { id: 'in_11', name: 'Rajma Chawal',        brand: 'Indian', calories: 320, protein: 14, carbs: 48, fat: 8,  servingSize: '1 plate (300g)' },
  { id: 'in_12', name: 'Pav Bhaji',           brand: 'Indian', calories: 380, protein: 8,  carbs: 52, fat: 16, servingSize: '1 plate (280g)' },
  { id: 'in_13', name: 'Samosa',              brand: 'Indian', calories: 260, protein: 5,  carbs: 28, fat: 14, servingSize: '2 pieces (120g)' },
  { id: 'in_14', name: 'Aloo Paratha',        brand: 'Indian', calories: 320, protein: 8,  carbs: 42, fat: 14, servingSize: '1 paratha (120g)' },
  { id: 'in_15', name: 'Poha',                brand: 'Indian', calories: 180, protein: 4,  carbs: 32, fat: 4,  servingSize: '1 bowl (200g)' },
  { id: 'in_16', name: 'Upma',                brand: 'Indian', calories: 210, protein: 5,  carbs: 34, fat: 6,  servingSize: '1 bowl (200g)' },
  { id: 'in_17', name: 'Dhokla',              brand: 'Indian', calories: 160, protein: 6,  carbs: 28, fat: 3,  servingSize: '4 pieces (120g)' },
  { id: 'in_18', name: 'Vada Pav',            brand: 'Indian', calories: 290, protein: 6,  carbs: 38, fat: 12, servingSize: '1 serving (150g)' },
  { id: 'in_19', name: 'Tandoori Chicken',    brand: 'Indian', calories: 260, protein: 30, carbs: 4,  fat: 14, servingSize: '2 pieces (150g)' },
  { id: 'in_20', name: 'Naan',                brand: 'Indian', calories: 260, protein: 8,  carbs: 45, fat: 5,  servingSize: '1 naan (90g)' },
  { id: 'in_21', name: 'Raita',               brand: 'Indian', calories: 80,  protein: 4,  carbs: 8,  fat: 4,  servingSize: '1 bowl (150g)' },
  { id: 'in_22', name: 'Sweet Lassi',         brand: 'Indian', calories: 180, protein: 6,  carbs: 28, fat: 5,  servingSize: '1 glass (250ml)' },
  { id: 'in_23', name: 'Gulab Jamun',         brand: 'Indian', calories: 300, protein: 4,  carbs: 48, fat: 10, servingSize: '2 pieces (80g)' },
  { id: 'in_24', name: 'Masala Chai',         brand: 'Indian', calories: 90,  protein: 2,  carbs: 14, fat: 3,  servingSize: '1 cup (200ml)' },
  { id: 'in_25', name: 'Hyderabadi Biryani',  brand: 'Indian', calories: 380, protein: 20, carbs: 44, fat: 14, servingSize: '1 plate (300g)' },
];

/** @deprecated Use INDIAN_FOODS — kept for any legacy imports */
export const NIGERIAN_FOODS = INDIAN_FOODS;

export const searchLocalFoods = (query: string): FoodResult[] => {
  const q = query.toLowerCase();
  return INDIAN_FOODS.filter(
    f => f.name.toLowerCase().includes(q) || f.brand.toLowerCase().includes(q)
  );
};