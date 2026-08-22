import asyncio
import json
import os
from app.ai.llm_service import LLMService
from loguru import logger

# 100 Crops
CROPS = [
    # Cereals
    "Rice", "Wheat", "Maize", "Barley", "Sorghum", "Pearl Millet", "Finger Millet", "Oats",
    # Pulses
    "Chickpea", "Pigeon Pea", "Lentil", "Black Gram", "Green Gram", "Cowpea", "Peas", "Kidney Bean",
    # Oilseeds
    "Groundnut", "Mustard", "Soybean", "Sunflower", "Safflower", "Sesame", "Castor", "Linseed",
    # Cash Crops
    "Cotton", "Sugarcane", "Jute", "Tobacco", "Tea", "Coffee", "Rubber", "Coconut",
    # Fruits
    "Mango", "Banana", "Citrus", "Apple", "Guava", "Papaya", "Grapes", "Pineapple", "Pomegranate", "Sapota", "Litchi", "Watermelon", "Muskmelon",
    # Vegetables (Solanaceous)
    "Tomato", "Potato", "Brinjal", "Chili", "Capsicum",
    # Vegetables (Cucurbits)
    "Cucumber", "Bottle Gourd", "Bitter Gourd", "Ridge Gourd", "Pumpkin", "Sponge Gourd",
    # Vegetables (Cruciferous & Others)
    "Cabbage", "Cauliflower", "Broccoli", "Radish", "Carrot", "Onion", "Garlic", "Okra", "Spinach", "Fenugreek", "Coriander",
    # Spices
    "Black Pepper", "Cardamom", "Ginger", "Turmeric", "Clove", "Nutmeg", "Cinnamon", "Cumin", "Fennel",
    # Flowers & Ornamentals
    "Rose", "Marigold", "Jasmine", "Chrysanthemum", "Tuberose", "Gerbera", "Carnation",
    # Plantation & Tree
    "Arecanut", "Cashew", "Cocoa", "Oil Palm", "Teak", "Bamboo", "Eucalyptus", "Neem",
    # Medicinal
    "Ashwagandha", "Aloe Vera", "Tulsi", "Mint"
]

OUTPUT_FILE = "../knowledge/diseases/disease_knowledge.json"

PROMPT_TEMPLATE = """You are an agricultural expert. Generate a highly detailed JSON dictionary of 3 common diseases for each of the following crops: {crops}.

Requirements for each disease entry:
1. The key must be lowercase and formatted as: "crop___disease_name" (e.g. "wheat___rust").
2. Include these fields for each entry:
   - "crop": Crop name
   - "disease": Disease name
   - "pathogen": Scientific name of pathogen
   - "symptoms": List of 3-4 distinct visual symptoms
   - "favorable_conditions": List of 2-3 weather/soil conditions that trigger it
   - "management": List of 3-5 practical management or chemical control steps
   - "prevention": List of 2-3 preventive measures
   - "source": Name of a reputable agricultural research organization/university (e.g., ICAR, FAO, IRRI, University Extension) as reference.

STRICT RULES:
- Output ONLY valid JSON starting with {{ and ending with }}. Do NOT output markdown code blocks like ```json.
- No other text, no explanations.
- Ensure proper escaping.

Example format:
{{
  "wheat___leaf_rust": {{
     "crop": "Wheat",
     "disease": "Leaf Rust",
     "pathogen": "Puccinia triticina",
     "symptoms": ["..."],
     "favorable_conditions": ["..."],
     "management": ["..."],
     "prevention": ["..."],
     "source": "ICAR"
  }}
}}
"""

async def generate_batch(llm: LLMService, crops_batch: list[str]) -> dict:
    prompt = PROMPT_TEMPLATE.format(crops=", ".join(crops_batch))
    
    # We will use the direct OpenRouter completion to ensure no truncation of large JSON outputs
    # Using 3000 max_tokens to accommodate the 15 diseases safely
    response_text = await llm.complete(prompt, max_tokens=4000)
    
    # Clean up output
    text = response_text.strip()
    if text.startswith("```json"):
        text = text.replace("```json", "", 1)
    if text.startswith("```"):
        text = text.replace("```", "", 1)
    if text.endswith("```"):
        text = text[:text.rfind("```")]
    text = text.strip()
    
    try:
        data = json.loads(text)
        return data
    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse JSON for batch {crops_batch}: {e}")
        logger.debug(f"Raw output: {text}")
        return {}

async def main():
    llm = LLMService()
    
    # Load existing to not overwrite
    if os.path.exists(OUTPUT_FILE):
        with open(OUTPUT_FILE, "r", encoding="utf-8") as f:
            disease_db = json.load(f)
    else:
        disease_db = {}
    
    batch_size = 5
    for i in range(0, len(CROPS), batch_size):
        batch = CROPS[i:i+batch_size]
        logger.info(f"Processing batch {i//batch_size + 1}: {batch}")
        
        # Check if already done (if the first crop in batch has at least 1 entry)
        first_crop_lower = batch[0].lower().replace(" ", "_")
        if any(k.startswith(f"{first_crop_lower}___") for k in disease_db.keys()):
            logger.info(f"Skipping {batch} - already exists in DB")
            continue
            
        new_data = await generate_batch(llm, batch)
        if new_data:
            disease_db.update(new_data)
            # Save incrementally
            with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
                json.dump(disease_db, f, indent=2, ensure_ascii=False)
            logger.info(f"Successfully added {len(new_data)} entries. Total: {len(disease_db)}")
        else:
            logger.warning(f"Failed to generate data for {batch}")
            
        await asyncio.sleep(2) # rate limit buffer

if __name__ == "__main__":
    asyncio.run(main())
