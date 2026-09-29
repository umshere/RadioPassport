import { json, redirect, type LoaderFunctionArgs, type MetaFunction } from "@remix-run/node";
import { useLoaderData, useNavigate } from "@remix-run/react";
import { useEffect } from "react";
import { tuneLandingPath } from "~/components/share/shareStation";
import { ticketMeta, type TicketPageStation } from "~/components/share/ticketMeta";
import { ticketImagePath, ticketPlace } from "~/components/share/ticketModel";
import { TICKET_VOICE } from "~/components/share/ticketVoice";
import { isStationUuid, lookupStation } from "~/services/station/lookup.server";

/** The root drops its house card for this page: the ticket is the card. */
export const handle = { socialCard: true };

/**
 * GET /t/<uuid> — the link a listener sends. Crawlers read the meta (the
 * ticket image, the station, the place); people are handed straight on to
 * `/?tune=<uuid>`, where the friend's arrival card and "Land here" wait.
 */
export async function loader({ request, params }: LoaderFunctionArgs) {
  const uuid = (params.uuid ?? "").trim();
  if (!isStationUuid(uuid)) throw redirect("/");
  const found = await lookupStation(uuid).catch(() => null);
  const station: TicketPageStation | null = found
    ? {
        uuid: found.uuid,
        name: found.name,
        city: found.city ?? null,
        state: found.state ?? null,
        country: found.country,
        longitude: found.longitude ?? null,
      }
    : null;
  return json(
    { uuid, station, origin: new URL(request.url).origin },
    { headers: { "Cache-Control": station ? "public, max-age=60, s-maxage=600" : "no-store" } },
  );
}

export const meta: MetaFunction<typeof loader> = ({ data }) =>
  data ? ticketMeta({ origin: data.origin, uuid: data.uuid, station: data.station }) : [{ title: "Elsewhere" }];

export default function TicketPage() {
  const { uuid, station } = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const landing = tuneLandingPath(uuid, "ticket");

  useEffect(() => {
    navigate(landing, { replace: true });
  }, [landing, navigate]);

  const place = station ? ticketPlace(station) : null;
  return (
    <main className="ew-ticket-page">
      <p className="rp-eyebrow text-foil">{TICKET_VOICE.pageLead}</p>
      {station ? (
        <img
          className="ew-ticket-page-img"
          src={ticketImagePath(uuid)}
          alt={TICKET_VOICE.alt(station.name, place!)}
          width={1200}
          height={630}
        />
      ) : null}
      <a className="ew-ticket-page-go" href={landing}>
        {TICKET_VOICE.pageGo}
      </a>
    </main>
  );
}
