import { NextResponse } from "next/server";

// OpenAPI schema for the "Photoautomat locations" Custom GPT. In the GPT
// builder: Actions → Import from URL → https://www.photoautomat.hu/api/gpt/openapi.json
// Public on purpose (contains no secrets); every operation needs the API key.

const LocationInput = {
  name: {
    type: "string",
    description: 'Short place name. The server adds the "PHOTOAUTOMAT " prefix, so "Károly" becomes "PHOTOAUTOMAT Károly".',
  },
  address: {
    type: "string",
    description: 'Street and house number as the user wrote it, e.g. "Károly krt. 17". The server finds the postcode and map coordinates.',
  },
  city: { type: "string", description: 'Defaults to "Budapest".' },
  district: {
    type: "integer",
    description: "Budapest district number (VII. kerület = 7). Send it when the user mentions it or after the API answered that the street exists in several districts.",
  },
  postcode: { type: "string", description: "4-digit postcode, only if known (from the user or from the API's candidates list)." },
  lat: { type: "number", description: "Only to override the automatic map position (must be sent with lng)." },
  lng: { type: "number", description: "Only to override the automatic map position (must be sent with lat)." },
  maps_url: {
    type: "string",
    description: "Optional Google Maps link (https). If omitted the server builds a Google Maps search link.",
  },
  openaiFileIdRefs: {
    type: "array",
    items: { type: "string" },
    description: "The photo of the booth the user attached in the chat (one image).",
  },
};

const Location = {
  type: "object",
  properties: {
    id: { type: "integer" },
    name: { type: "string" },
    address: { type: "string" },
    lat: { type: "number" },
    lng: { type: "number" },
    maps_url: { type: "string", nullable: true },
    photo_url: { type: "string", nullable: true },
    status: { type: "string", enum: ["draft", "live", "hidden"] },
    preview_url: { type: "string", description: "Private preview of this location on the real page." },
    updated_at: { type: "string" },
  },
};

const schema = {
  openapi: "3.1.0",
  info: {
    title: "Photoautomat locations",
    version: "1.0.0",
    description: "Manage the booth locations shown on https://www.photoautomat.hu/locations.",
  },
  servers: [{ url: "https://www.photoautomat.hu" }],
  paths: {
    "/api/gpt/locations": {
      get: {
        operationId: "listLocations",
        summary: "List every location (live, draft and hidden).",
        responses: {
          "200": {
            description: "All locations",
            content: { "application/json": { schema: { type: "object", properties: { locations: { type: "array", items: Location } } } } },
          },
        },
      },
      post: {
        operationId: "createLocation",
        summary: "Create a new location as a DRAFT (not public). Returns a preview_url.",
        "x-openai-isConsequential": false,
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { type: "object", required: ["name", "address"], properties: LocationInput },
            },
          },
        },
        responses: {
          "201": { description: "Draft created", content: { "application/json": { schema: { type: "object", properties: { location: Location, geocoded_as: { type: "string" }, photo: { type: "string" }, next_step: { type: "string" } } } } } },
          "409": {
            description:
              "Either a location with this address already exists (see `existing`), or the street exists in several districts (see `candidates`: ask the user which one and call again with its postcode).",
          },
          "422": { description: "Address not found or photo problem" },
        },
      },
    },
    "/api/gpt/locations/{id}": {
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
      get: {
        operationId: "getLocation",
        summary: "Get one location.",
        responses: { "200": { description: "The location", content: { "application/json": { schema: { type: "object", properties: { location: Location } } } } } },
      },
      patch: {
        operationId: "updateLocation",
        summary:
          'Change a location: fix fields, replace the photo, or change status. status "live" PUBLISHES it on the public site; "hidden" removes it from the site.',
        "x-openai-isConsequential": true,
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  ...LocationInput,
                  status: { type: "string", enum: ["draft", "live", "hidden"] },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "Updated", content: { "application/json": { schema: { type: "object", properties: { location: Location, public_page: { type: "string", nullable: true } } } } } },
          "422": { description: "Cannot apply (e.g. publishing without a photo)" },
        },
      },
    },
  },
  components: {
    schemas: {},
    securitySchemes: { apiKey: { type: "http", scheme: "bearer" } },
  },
  security: [{ apiKey: [] }],
};

export function GET() {
  return NextResponse.json(schema);
}
