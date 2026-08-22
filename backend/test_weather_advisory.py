import asyncio
from app.ai.llm_service import LLMService

async def main():
    llm = LLMService()
    print("Testing generate_daily_insight...")
    res = await llm.generate_daily_insight({"profile": {"district": "Balangir", "state": "Odisha"}, "weather": {"current": {"temperature_c": 26, "condition": "Clear", "rainfall_mm": 0}}})
    print(f"Result: {repr(res)}")

if __name__ == "__main__":
    asyncio.run(main())
