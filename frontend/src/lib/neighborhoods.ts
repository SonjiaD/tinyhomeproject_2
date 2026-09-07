/**
 * Oakland's 124 official neighbourhood names.
 *
 * This list was previously copy-pasted into both OnboardingGoalPage and ProfilePage, which is
 * exactly the sort of duplication that drifts: two pickers offering slightly different options
 * would quietly split the research data into incompatible buckets. One copy, imported by both.
 *
 * Names come from the Oakland Open Data neighbourhood boundaries, the same source the map uses
 * for its neighbourhood outlines, so a value chosen here matches a shape on the map.
 */
export const NEIGHBORHOODS = [
  "Acorn/ Acorn Industrial", "Adams Point", "Allendale", "Arroyo Viejo",
  "Bancroft Business/ Havenscourt", "Bartlett", "Bella Vista", "Brookfield Village",
  "Bushrod", "Caballo Hills", "Castlemont", "Chabot Park",
  "Chinatown", "Civic Center", "Claremont", "Clawson",
  "Cleveland Heights", "Clinton", "Coliseum", "Coliseum Industrial",
  "Columbia Gardens", "Cox", "Crestmont", "Crocker Highland",
  "Dimond", "Downtown", "Durant Manor", "East Peralta",
  "Eastmont", "Eastmont Hills", "Elmhurst Park", "Fairfax",
  "Fairfax Business/ Wentworth/ Holland", "Fairview Park", "Fitchburg", "Foothill Square",
  "Forestland", "Fremont", "Frick", "Fruitvale Station",
  "Gaskill", "Glen Highlands", "Glenview", "Golden Gate",
  "Golf Links", "Grand Lake", "Harrington", "Hawthorne",
  "Hegenberger", "Highland", "Highland Terrace", "Hiller Highlands",
  "Hoover/ Foster", "Iveywood", "Ivy Hill", "Jefferson",
  "Lakeshore", "Lakewide", "Las Palmas", "Laurel",
  "Leona Heights", "Lincoln Highlands", "Lockwood Tevis", "Longfellow",
  "Lynn/ Highland Park", "Maxwell Park", "McClymonds", "Melrose",
  "Merritt", "Merriwood", "Mills College", "Millsmont",
  "Montclair", "Montclair Business", "Mosswood", "North Kennedy Tract",
  "North Stonehurst", "Northgate", "Oak Center", "Oak Tree",
  "Oakland Ave/ Harrison St", "Oakmore", "Old City/ Produce & Waterfront", "Panoramic Hill",
  "Paradise Park", "Patten", "Peralta/ Hacienda", "Peralta/ Laney",
  "Piedmont Avenue", "Piedmont Pines", "Pill Hill", "Prescott",
  "Produce & Waterfront", "Ralph Bunche", "Rancho San Antonio", "Redwood Heights",
  "Reservoir Hill/ Meadow Brook", "Rockridge", "San Pablo Gateway", "Santa Fe",
  "Sausal Creek", "Seminary", "Sequoyah", "Shafter",
  "Sheffield Village", "Shepherd Canyon", "Skyline - Hillcrest Estates", "Sobrante Park",
  "South Kennedy Tract", "South Prescott", "South Stonehurst", "St. Elizabeth",
  "Temescal", "Toler Heights", "Trestle Glen", "Tuxedo",
  "Upper Dimond", "Upper Laurel", "Upper Peralta Creek/ Bartlett", "Upper Rockridge",
  "Waverly", "Webster", "Woodland", "Woodminster",
] as const

/**
 * Stored when someone says they live outside Oakland.
 *
 * A sentinel rather than an empty value, because "asked and answered: not in Oakland" and
 * "never answered" are different facts, and analysis needs to tell them apart.
 */
export const NOT_OAKLAND = 'not-oakland'
