import asyncio
from app.ai.llm_service import LLMService

async def main():
    llm = LLMService()
    try:
        print("Testing generate_daily_insight...")
        res = await llm.generate_daily_insight({})
        print(f"Result: {res}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(main())
