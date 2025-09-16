async function updatePricesFromCSV() {
  try {
    console.log("Fetching new prices from CSV...")

    // Fetch the CSV data
    const response = await fetch(
      "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Solo__Nuevo_precio__ARS__-p7BttDU0IyA84j2MJTc7pG6d0g4hZn.csv",
    )
    const csvText = await response.text()

    console.log("CSV data fetched successfully")
    console.log("CSV content preview:", csvText.substring(0, 200))

    // Parse CSV data
    const lines = csvText.trim().split("\n")
    const header = lines[0]
    const dataLines = lines.slice(1)

    console.log("Header:", header)
    console.log("Number of price entries:", dataLines.length)

    // Extract prices (assuming they're in order matching our glass types array)
    const newPrices = dataLines.map((line) => {
      const price = line.replace(/"/g, "").trim()
      return Number.parseFloat(price)
    })

    console.log("Parsed prices:", newPrices.slice(0, 10)) // Show first 10 prices
    console.log("Total prices parsed:", newPrices.length)

    return newPrices
  } catch (error) {
    console.error("Error updating prices:", error)
    throw error
  }
}

// Run the update
updatePricesFromCSV()
  .then((prices) => {
    console.log("Successfully fetched", prices.length, "new prices")
    console.log("First few prices:", prices.slice(0, 5))
  })
  .catch((error) => {
    console.error("Failed to update prices:", error)
  })
