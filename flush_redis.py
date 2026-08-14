import asyncio
import redis.asyncio as aioredis
import os
from dotenv import load_dotenv

async def main():
    load_dotenv('backend/.env')
    redis_url = os.getenv('REDIS_URL')
    if not redis_url:
        print("No REDIS_URL found")
        return
        
    print(f"Connecting to {redis_url[:15]}...")
    try:
        r = aioredis.from_url(redis_url, decode_responses=True, ssl_cert_reqs="none")
        await r.ping()
        print("Connected!")
        
        keys = await r.keys("weather_advisory:*")
        keys2 = await r.keys("openmeteo_weather:*")
        all_keys = keys + keys2
        
        if all_keys:
            print(f"Deleting {len(all_keys)} cached weather keys...")
            await r.delete(*all_keys)
            print("Successfully deleted keys.")
        else:
            print("No cached keys found.")
            
    except Exception as e:
        print(f"Error: {e}")

asyncio.run(main())
