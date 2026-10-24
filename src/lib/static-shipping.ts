/** STANDARD shipping input shared by the static cart demo (mirrors seed rates). */
export function STATIC_SHIPPING(method: "STANDARD" | "EXPRESS" | "PICKUP") {
  if (method === "EXPRESS") return { baseFee: 149, perItemFee: 35, freeAbove: null as number | null, method };
  return { baseFee: 79, perItemFee: 20, freeAbove: 1999 as number | null, method };
}
