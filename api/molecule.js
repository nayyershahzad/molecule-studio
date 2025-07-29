// This file should be saved as: api/molecule.js

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight request
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { moleculeName } = req.body;

    if (!moleculeName) {
      return res.status(400).json({ error: 'Molecule name is required' });
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 2000,
        messages: [
          {
            role: "user",
            content: `Provide the 3D molecular structure data for ${moleculeName}. Return ONLY a valid JSON object with this exact format:

{
  "formula": "chemical formula (e.g., H2O)",
  "atoms": [
    {
      "element": "element symbol (e.g., H, C, N, O)",
      "x": number,
      "y": number,
      "z": number
    }
  ],
  "bonds": [
    {
      "atom1": index_of_first_atom,
      "atom2": index_of_second_atom,
      "order": bond_order (1=single, 2=double, 3=triple)
    }
  ]
}

Use realistic 3D coordinates in Angstroms. DO NOT include any text outside the JSON. If the molecule doesn't exist or you're unsure, return an error object: {"error": "Molecule not found or invalid"}`
          }
        ]
      })
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    let responseText = data.content[0].text.trim();
    
    // Clean up any markdown formatting
    responseText = responseText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    
    const moleculeInfo = JSON.parse(responseText);
    
    res.status(200).json(moleculeInfo);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ 
      error: `Failed to fetch molecule data: ${error.message}` 
    });
  }
}