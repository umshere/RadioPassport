# Tickets

Sharing a station sends a **ticket**: a cream passport-paper boarding pass printed from the station's own record. The ticket is the link preview, the picture in the share sheet, and the page a friend opens.

## The loop

1. A listener taps share (header square, the desk pass stub, the Keeper's sheet "Ticket"). Every one of them calls `shareStation()`, which opens the **Your ticket** sheet (`app/components/share/TicketSheet.tsx`). Nothing is sent yet.
2. The sheet shows the ticket (Card 1200×630 or Story 1080×1350), the Keeper's line, the link, and three actions:
   - **Send this ticket**: `navigator.share` with the ticket PNG as a file when `navigator.canShare({ files })` says yes (link travels in the text), else the share sheet with the link, else the clipboard. The PNG is fetched when the sheet opens so the tap is spent on the share sheet, not a download (Safari refuses a share sheet that is not a direct answer to a tap).
   - **Copy link**: the `/t/<uuid>` link alone.
   - **Save image**: downloads the PNG.
3. The link is `https://elsewheremusic.com/t/<uuid>` (`tuneLink()`). Crawlers read its meta: `og:title` "Station · Place", a timeless `og:description` in the Keeper's voice, `og:image` = the ticket, `twitter:card` summary_large_image. The root drops its house card on pages whose route `handle` says `socialCard: true`.
4. A person is handed on client-side to `/?tune=<uuid>&from=ticket`; `TuneBridge` shows "A friend sent you a ticket" and **Land here**. `/?tune=<uuid>` keeps working forever for older links.

## The image

`GET /ticket/<uuid>.png[?format=story]` (`app/routes/ticket.$uuid.ts`). satori lays out the ticket (`app/services/ticket/renderTicket.server.tsx`), `@resvg/resvg-js` rasterises it. Cached `public, max-age=300, s-maxage=600, stale-while-revalidate=86400` because the local hour is printed on it.

- Fields come from `ticketFields()` (`app/components/share/ticketModel.ts`): place (city, else the directory's region, else country), country, local hour at the station's longitude (left off when there are no coordinates), spoken languages, signal, postmark date at the station, the station id as the serial. A field we do not have is left off, never filled.
- Anything that is not a station uuid, an unknown station, or any render error: `302` to `/elsewhere-og.jpg`. Link previews never break.
- Fonts: Newsreader and Azeret Mono, both SIL Open Font License, Latin + Latin-ext WOFF subsets in `public/fonts/ticket/`. The Keeper sprite is `public/keeper/ticket-keeper.png`. Both are fetched from our own origin once per warm function, so nothing heavy is bundled. Other scripts in a station name (Cyrillic, CJK, Devanagari, Arabic…) are fetched on demand as Noto glyph subsets from Google Fonts, 2.5s timeout; failure leaves them blank, never breaks the ticket.

## Counting

`logUsage` beacons, names only: `ticket_open`, `ticket_share`, `ticket_copy`, `ticket_save`, and `tune_join` with `source: ticket | link`.

## Words

The sheet's lines live in `app/components/share/ticketVoice.ts`, in the Keeper's voice (see `KEEPER_CHARACTER.md`). The preview never claims anything is on air.
