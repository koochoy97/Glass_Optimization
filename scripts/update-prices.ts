// Script to update glass prices from CSV data
async function updateGlassPrices() {
  console.log("[v0] Starting price update process...")

  try {
    // Fetch the CSV data
    const response = await fetch(
      "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Solo__Nuevo_precio__ARS__-b6t6GbSPH4lDEsHiZi8LIQg8w6ssGF.csv",
    )
    const csvText = await response.text()

    console.log("[v0] CSV data fetched successfully")
    console.log("[v0] CSV content:", csvText)

    // Parse CSV data (skip header row)
    const lines = csvText.trim().split("\n")
    const prices = lines
      .slice(1)
      .map((line) => {
        const price = Number.parseFloat(line.replace(/"/g, "").trim())
        return price
      })
      .filter((price) => !isNaN(price))

    console.log("[v0] Parsed prices:", prices)
    console.log("[v0] Total prices found:", prices.length)

    // The prices should match the order of glass types in the array
    // We'll update each glass type with its corresponding price

    return prices
  } catch (error) {
    console.error("[v0] Error updating prices:", error)
    throw error
  }
}

// Run the update
updateGlassPrices()
