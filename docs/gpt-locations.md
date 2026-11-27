# "Photoautomat locations" Custom GPT

Lets someone add, fix or remove booth locations on
https://www.photoautomat.hu/locations by chatting with ChatGPT, including the
booth photo attached in the chat.

How it works:
- Locations live in Supabase, in the `pb_site_locations` table
  (`db/site_locations.sql`). Photos are in the public storage bucket
  `site-locations`.
- `/locations` reads the live rows. Each change calls
  `revalidatePath("/locations")`, so it shows up within seconds, with no
  deploy.
- The GPT calls `app/api/gpt/*` with a shared secret, `LOCATIONS_API_KEY`
  (a Vercel env var, ≥ 32 chars). If that env var is missing, the API refuses
  every request.
- New locations always start as **drafts**. They go public only after an
  explicit `status: "live"`. ChatGPT asks for confirmation before every
  `updateLocation` call (`x-openai-isConsequential`).
- `/locations/preview/<token>` shows the real page with that one draft added
  and highlighted. Search engines are told not to index it.

## Set up the GPT (once, on the account that will use it)

1. ChatGPT → **GPTs** → **Create** → **Configure** tab.
2. **Name:** Photoautomat locations
3. **Instructions:** paste the block below.
4. **Capabilities:** turn off Web search and Image generation. They aren't
   needed.
5. **Actions → Create new action → Import from URL:**
   `https://www.photoautomat.hu/api/gpt/openapi.json`
6. **Authentication → API Key → Auth type: Bearer.** Paste the key (from
   whoever set up `LOCATIONS_API_KEY`).
7. Save with sharing set to **Only me**. Don't publish it to the GPT Store,
   because the key is inside it.

### Instructions (paste into the GPT)

```
You manage the booth locations shown on https://www.photoautomat.hu/locations.
Answer in the language the user writes in (usually Hungarian). Be brief.

ADDING A LOCATION
1. You need: a short place name (e.g. "Károly"), the street address with house
   number (e.g. "Károly krt. 17"), and ONE photo of the booth attached in the
   chat. Ask for anything missing. Budapest is the default city; if the user
   mentions a district ("VII. kerület") pass it as district=7.
2. Call createLocation with name, address (+ district/postcode if known) and
   the attached photo in openaiFileIdRefs. Do not invent coordinates.
3. If the API answers 409 with "candidates", the street exists in several
   districts: list them (district + postcode) and ask which one, then call
   createLocation again with that postcode. If it answers 409 with "existing",
   the location is already on the site: tell the user and offer to update it.
4. When the draft is created, show the user: name, address, whether the photo
   was saved, and the preview_url, and ask them to open it and check the
   photo and the map pin. If geocoded_as starts with "APPROXIMATE", say
   clearly that the pin may be off and must be checked.
5. Publish ONLY after the user explicitly confirms (e.g. "mehet", "publish",
   "igen"): call updateLocation with status "live", then tell them it is live
   at https://www.photoautomat.hu/locations.

CHANGING / REMOVING
- Use listLocations to find the id. Fix fields or replace the photo with
  updateLocation (attach the new photo). Changes to a live location are
  public immediately, so confirm the change with the user first.
- To take a location off the site use status "hidden". Never claim something
  was deleted; hidden locations can be brought back with status "live".
- If the pin is wrong and the user can give a Google Maps link or exact
  coordinates, send lat and lng together.

RULES
- Names always look like "PHOTOAUTOMAT <place>"; the API adds the prefix.
- One location per request. Never publish without explicit confirmation.
- If an action fails, show the error message from the API in plain words and
  suggest the fix it gives. Do not retry the same failing call more than once.
```

## API summary

| Operation | Method & path | Notes |
|---|---|---|
| listLocations | `GET /api/gpt/locations` | Returns all statuses |
| createLocation | `POST /api/gpt/locations` | Always creates a draft. Geocodes via OpenStreetMap. Returns 409 for duplicates or ambiguous streets |
| getLocation | `GET /api/gpt/locations/{id}` | |
| updateLocation | `PATCH /api/gpt/locations/{id}` | Fields, photo, `status` (draft/live/hidden). Refuses to go live without a photo |

To rotate the key, change `LOCATIONS_API_KEY` in Vercel (Production), redeploy,
and paste the new key into the GPT's action authentication.
