import { cleanSettings } from "./index";

export const SETTINGS = cleanSettings({
  workCountry: "Testland",
  regions: [{ id: "metro", label: "Metro", description: "Springfield metro area, onsite or hybrid", linkedinLocation: "Springfield" }],
  payFloor: 60_000,
});
