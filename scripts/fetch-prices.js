// Fetch and process the new price data
async function fetchPriceData() {
  try {
    const response = await fetch(
      "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Precios_con_Margen_de_Rentabilidad-pkwkmShhS9qWkT9b6vbIsj0DJxtahZ.csv",
    )
    const csvText = await response.text()

    console.log("CSV Content:")
    console.log(csvText)

    // Parse CSV manually
    const lines = csvText.split("\n")
    const headers = lines[0].split(",")

    console.log("Headers:", headers)

    const products = []
    for (let i = 1; i < lines.length; i++) {
      if (lines[i].trim()) {
        const values = lines[i].split(",")
        if (values.length >= 3) {
          products.push({
            producto: values[0]?.trim(),
            precioFinal: Number.parseFloat(values[1]?.trim()) || 0,
            precioConMargen: Number.parseFloat(values[2]?.trim()) || 0,
          })
        }
      }
    }

    console.log("Parsed products:", products)

    // Generate the glass types array
    const glassTypes = products.map((product) => {
      const name = product.producto

      // Extract dimensions from product name
      let width = 3600,
        height = 2500 // defaults
      const dimensionMatch = name.match(/$$(\d+)x(\d+)$$/)
      if (dimensionMatch) {
        width = Number.parseInt(dimensionMatch[1])
        height = Number.parseInt(dimensionMatch[2])
      }

      // Extract thickness
      let thickness = 4 // default
      const thicknessMatch = name.match(/(\d+(?:\.\d+)?)mm/)
      if (thicknessMatch) {
        thickness = Number.parseFloat(thicknessMatch[1])
      }

      // Generate code from product name
      const code = name.split(" ")[0] || "UNKNOWN"

      // Clean up name
      let cleanName = name.replace(/^[A-Z0-9]+\s+/, "") // Remove code prefix
      cleanName = cleanName.replace(/\s*$$\d+x\d+$$.*$/, "") // Remove dimensions and everything after

      return {
        name: cleanName,
        code: code,
        width: width,
        height: height,
        price: product.precioConMargen, // Use price with 30% margin
        thickness: thickness,
        description: `${cleanName} de ${thickness}mm de espesor`,
      }
    })

    console.log("Generated glass types:", glassTypes)

    return glassTypes
  } catch (error) {
    console.error("Error fetching price data:", error)
    return []
  }
}

// Execute the function
fetchPriceData()
