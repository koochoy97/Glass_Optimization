// API functions for WordPress glass data
const API_BASE_URL = "https://viprou.com/wp-json/wp/v2"
const USERNAME = "viprou995"
const PASSWORD = "A31N BFAj sSEf iUfT bO54 AMQJ"

// Create authorization header
const authHeader = "Basic " + Buffer.from(`${USERNAME}:${PASSWORD}`).toString("base64")

export interface GlassType {
  id: number
  title: { rendered: string }
  acf: {
    name: string
    code: string
    width: number
    height: number
    price: number
    thickness: number
    description: string
    label: string
  }
}

export interface GlassCategory {
  id: number
  title: { rendered: string }
  acf: {
    tipo_de_vidrio: number[]
  }
}

// Fetch all glass types
export async function fetchAllGlassTypes(): Promise<GlassType[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/tipo-de-vidrio?per_page=100`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader,
      },
    })

    if (!response.ok) {
      throw new Error(`Error HTTP: ${response.status}`)
    }

    const data = await response.json()
    return data
  } catch (error) {
    console.error("Error fetching glass types:", error)
    throw error
  }
}

// Fetch specific glass category
export async function fetchGlassCategory(id: number): Promise<GlassCategory> {
  try {
    const response = await fetch(`${API_BASE_URL}/categoria-de-vidrio/${id}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader,
      },
    })

    if (!response.ok) {
      throw new Error(`Error HTTP: ${response.status}`)
    }

    const data = await response.json()
    return data
  } catch (error) {
    console.error("Error fetching glass category:", error)
    throw error
  }
}

// Transform API data to match our component structure
export function transformGlassType(apiGlassType: GlassType) {
  const codigo = apiGlassType.acf?.code || ""

  return {
    code: codigo,
    name: apiGlassType.acf.name || apiGlassType.title.rendered,
    thickness: apiGlassType.acf.thickness,
    price: apiGlassType.acf.price,
    width: apiGlassType.acf.width,
    height: apiGlassType.acf.height,
    description:
      apiGlassType.acf.description ||
      `${apiGlassType.acf.name || apiGlassType.title.rendered} ${apiGlassType.acf.thickness}mm`,
    isSafety: codigo.startsWith("LAM"),
    hasSolarControl: codigo === "LAMSV44",
  }
}
