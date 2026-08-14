import httpx
import asyncio

async def test():
    async with httpx.AsyncClient() as client:
        r = await client.get('https://api.bigdatacloud.net/data/reverse-geocode-client', params={'latitude':20.7014, 'longitude':83.4851, 'localityLanguage':'en'})
        print(r.status_code, r.text[:200])

asyncio.run(test())
