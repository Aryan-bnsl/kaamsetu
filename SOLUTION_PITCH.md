# KaamSetu — Voice-assisted local hiring

**Great Indian AI Internship Challenge · Ghaziabad prototype**

## Problem
Local workers and contractors need a simple way to find each other and agree on wages, working hours, location and responsibilities. A listing alone does not establish that both sides accepted the same terms. Language and typing can add friction to job posting and discovery.

## Solution
KaamSetu connects painters, plumbers and electricians with local contractors through Hindi/English interfaces, voice-assisted requests and map-based job discovery. Contractors create and review a structured job. Workers filter relevant opportunities, inspect the terms and express interest. The contractor then confirms the worker.

## Main feature — Dono ki Baat Pakki
A booking is created only after both parties accept the same terms version. Each receives the same booking reference and terms card. Backend functions check duplicate applications, capacity and outdated acceptances. Changing unconfirmed job terms requires fresh acceptance.

## Gnani AI usage
Gnani Prisma v3.0 handles speech-to-text, and Timbre v2.5 generates spoken job details and terms. Authenticated server functions protect the API key. A separate Lovable AI Gateway step extracts structured intent from transcripts. Matching and booking validation run in application/database code.

## Working prototype
The app provides job posting, skill/locality/date/wage filters, Leaflet maps, applications, contractor confirmation, saved jobs and booking history. The pilot covers six Ghaziabad localities and includes fictional demo identities isolated from real-user transactions.

## Validation and scope
The browser demonstration completed form-based posting, manual-filter search, worker acceptance and contractor confirmation, with matching booking cards. TTS playback was observed through media events. That recorded run did not verify microphone input or speech recognition. Voice endpoints are implemented separately. Listings in the demo are fictional, and booking confirmation does not guarantee payment or verify identity.

## Next steps
Validate the flow with local workers and contractors, test speech accuracy with realistic Hindi/Hinglish audio, and improve onboarding and accessibility based on feedback.
