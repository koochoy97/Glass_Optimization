async function updatePricesFromCSV() {
  try {
    console.log("[v0] Fetching new prices from CSV...")
    const response = await fetch(
      "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Solo__Nuevo_precio__ARS__-Qt6kptJhSl3h4GaA5NLqRnVB4yNLwI.csv",
    )
    const csvText = await response.text()

    console.log("[v0] CSV content:", csvText.substring(0, 200) + "...")

    const lines = csvText.trim().split("\n")
    const header = lines[0]
    const dataLines = lines.slice(1)

    console.log("[v0] Found", dataLines.length, "price entries")

    const newPrices = dataLines.map((line) => {
      const price = Number.parseFloat(line.replace(/"/g, "").trim())
      return price
    })

    console.log("[v0] New prices:", newPrices.slice(0, 10))

    return newPrices
  } catch (error) {
    console.error("[v0] Error fetching CSV:", error)
    return []
  }
}

updatePricesFromCSV()
