# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Manu and Paco, the two people who live in the house in Jaén (Spain). They are the only regular viewers: visits are rare. They use the wall screen in two ways, about equally:

- **Glancing in passing**, from 2–3 m: the time, the weather, what comes next and whether there is something to do.
- **Standing in front of it and touching it daily**: ticking off chores, adding to the shopping list, checking the agenda and the bills.

They also open the same web app on their phones (Telegram bot and browser).

## Product Purpose

BBDS is the household's shared wall dashboard: the agenda, the shopping list, chores with points, the weather, electricity prices and the bills, in one place that both see without asking each other. Success means fewer forgotten things and fewer "did you pay the rent?" conversations, plus a screen they like having on the wall.

## Positioning

It is made for this house, not for "a house". It knows:

- the two people and their friendly rivalry over points;
- the shopping aisles of their supermarket;
- the PVPC price of electricity, as advice on when to run the washing machine;
- the rent and bills, split half and half;
- Jaén's own calendar of festivities.

A generic family dashboard could not truthfully claim any of this.

## Operating Context

- **Device:** a Frameo photo frame, 1280 × 800 landscape touchscreen, Chrome 64 WebView, 1 GB of RAM, slow. It runs an Android kiosk app. The screen is dimmed at night and wakes in the morning.
- **Time of day:** the screen changes with it: a morning view for leaving the house, the full day view, and a calm night view.
- **Other ways in:** a Telegram bot handles shopping, tasks and bills from the phone, including morning reminders.
- **Data:** a Cloudflare Worker with D1. Weather from Open-Meteo, calendars from iCloud ICS feeds, and an optional room temperature sensor.

## Capabilities and Constraints

- **Views:** Hoy (home), Agenda, Compra (shopping grouped by aisle, with "Lo de siempre"), Tareas (cleaning routine plus one-off tasks, with points, manual points and rewards), Tiempo, Energía, Cuentas (rent and bills split in half, with comparison against the previous year), and Casa (climate sensors, optional).
- **Language:** all user-facing copy is in Spanish; dates are formatted as es-ES.
- **Performance:** the target is the Chrome 64 WebView. `?lite` / lite mode removes animations, blur and continuous motion, and every change must keep `npm run check:webview` green.
- **Touch:** controls need targets of 44 px or more; the screen also has to read from 2–3 m.

## Brand Commitments

These are binding and must survive any redesign:

- The name **BBDS** and its "B" mark in the rail.
- **Yoshi** as the house mascot: in his window, with moods, apples for finished tasks, and greetings.
- **The seasonal system:** decorations through the year and full-house dressing on festivity days.
- **Jaén's festivities:** Feria de San Lucas, the San Antón bonfires (lumbres), the Virgen de la Capilla, the Torreperogil fair, plus Halloween, Christmas and birthdays.
- **The Gemini-generated Yoshi's Island–style illustrations:** the window scenes and the seasonal stickers in `src/assets/`.
- **The points rivalry** between Manu and Paco: streaks, levels and rewards.
- **The voice:** warm, playful, household Spanish.

## Evidence on Hand

- Real household data lives in production D1.
- The demo uses invented data in `src/lib/demo.js` and `src/lib/localStore.js`.
- There is no external audience, testimonials or metrics, and none should be invented.

## Product Principles

1. **Readable from across the room first; touch second.** Each screen answers its main question at a glance.
2. **Each fact once.** A piece of information lives in one place on a screen.
3. **The personality lives in the house's own things:** Yoshi, the festivities, the rivalry, their places. Generic decoration does not count.
4. **Respect the frame:** nothing ships that the slow WebView cannot render smoothly.
5. **Friendly, never nagging:** reminders inform without shaming one person in front of the other.

## Accessibility & Inclusion

- Text contrast of 4.5:1 or more on every theme (day, night and the dark sheets).
- 44 px touch targets.
- Sizes that work at 2–3 m.
- A reduced-motion path that keeps state changes visible.
