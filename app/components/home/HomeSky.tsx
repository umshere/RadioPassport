import { useState, type CSSProperties } from "react";
import { CountryFlag } from "~/components/CountryFlag";
import { FlipBoard } from "~/components/radio-passport/FlipBoard";
import { AtmospherePin } from "~/components/radio-passport/AtmospherePin";
import { Eyebrow } from "~/components/ui/Eyebrow";
import { Button, ButtonLink, Chip } from "~/components/ui/Button";
import { Keeper } from "~/components/keeper/Keeper";
import { hourWord, VOICE } from "~/components/keeper/keeperVoice";
import { keeperMood, type KeeperState } from "~/components/keeper/keeperState";
import { spokenHour } from "~/components/keeper/keeperFacts";
import { skyBody, skyHour } from "~/components/desk/deskModel";
import type { Station } from "~/types/radio";
import { flapLine, isSeekQuery, type ArrivalSky, type GuideChip, type HomePhase } from "./homeModel";

/**
 * The top band of the departures hall: the arrival city's sky at its own
 * hour. The same sky as the desk (.ew-sky, shared classes, not a fork): tint
 * by the hour there, the sun or the moon where it stands, a split-flap clock,
 * the city on the board, and the keeper on the horizon with one line. One
 * call to action. While seeking, the sky folds to one flap line: the query.
 */
export function HomeSky({
  phase,
  place,
  station,
  sky,
  offset,
  playing,
  trackLine,
  query,
  keeperLine,
  keeperState,
  cta,
  guide,
  onGuide,
  onAsk,
  onLand,
  onOpenKeeper,
}: {
  phase: HomePhase;
  place: string;
  station: Station | null | undefined;
  sky: ArrivalSky;
  /** "7 hours ahead of you"; null before hydration or without an hour. */
  offset: string | null;
  playing: boolean;
  /** Only what the stream sent; never invented. */
  trackLine: string | null;
  query: string;
  keeperLine: string;
  keeperState: KeeperState;
  cta: { label: string; kind: "land" | "continue" | "none" };
  guide: GuideChip[];
  onGuide: (chip: GuideChip) => void;
  /** A question typed to the keeper; the home decides what it means. */
  onAsk: (question: string) => void;
  onLand: () => void;
  onOpenKeeper?: () => void;
}) {
  const [asking, setAsking] = useState(false);
  const [draft, setDraft] = useState("");
  const tint = skyHour(sky.solar);
  const body = sky.localHour === null ? null : skyBody(sky.localHour, sky.minute);
  // A typed question folds the sky, and it stays folded if the answer is
  // empty: no jump back to the full sky while the board says "no departures".
  const seeking = phase === "seek" || (phase === "empty" && isSeekQuery(query));
  const country = station?.country?.trim() || "";
  const sub = [
    country && country !== place ? country : null,
    sky.solar ? VOICE.homeThere(hourWord(sky.solar)) : null,
    offset,
  ].filter(Boolean);
  const cityFlap = flapLine(place, 22);
  const queryFlap = flapLine(query, 24);

  return (
    <section
      className="ew-sky ew-home-sky"
      data-hour={tint}
      data-phase={phase}
      data-compact={seeking || undefined}
      aria-labelledby="ew-home-place"
    >
      <div className="ew-sky-field" aria-hidden="true">
        <i className="ew-sky-stars" />
        {body ? (
          <i className="ew-sky-lane">
            <i
              className="ew-sky-body"
              data-kind={body.kind}
              style={{ "--sky-x": body.x, "--sky-y": body.y } as CSSProperties}
            />
          </i>
        ) : null}
        <i className="ew-sky-grain" />
      </div>

      <div className="ew-sky-head">
        <span className="ew-sky-status" data-live={playing || undefined}>
          <i aria-hidden="true" />
          {playing ? VOICE.deskLive : VOICE.homeLeaving}
        </span>
        <AtmospherePin />
      </div>

      {seeking ? (
        <div className="ew-sky-copy ew-home-sky-seek">
          <h1 id="ew-home-place" className="ew-home-sky-query">
            <FlipBoard text={queryFlap} className="is-city" />
            <span className="sr-only">{VOICE.homeSeeking(query.trim())}</span>
          </h1>
          <p className="ew-home-sky-line">{keeperLine}</p>
        </div>
      ) : (
        <div className="ew-sky-copy">
          {sky.clock ? (
            <p className="ew-sky-clock">
              <span className="sr-only">
                {VOICE.clockSpoken(spokenHour(sky.clock, sky.localHour ?? 0), place)}
              </span>
              <FlipBoard text={sky.clock} className="is-clock" />
            </p>
          ) : (
            <p className="ew-sky-clock is-unknown">{VOICE.hourUnknownShort}</p>
          )}
          <h1
            id="ew-home-place"
            className="ew-home-city"
            style={{ "--chars": Math.max(4, cityFlap.length) } as CSSProperties}
          >
            <FlipBoard text={cityFlap} className="is-city" />
            <span className="sr-only">{place}</span>
          </h1>
          <p className="ew-sky-sub">
            {station?.countryCode ? (
              <CountryFlag
                iso={station.countryCode}
                title={country || place}
                em={0.9}
                className="ew-sky-flag"
              />
            ) : null}
            <span>{sub.join(" · ") || VOICE.homeBoard}</span>
          </p>
          {phase === "aboard" && trackLine ? (
            <p className="ew-home-sky-track" key={trackLine}>
              {trackLine}
            </p>
          ) : null}
          <div className="ew-home-cta">
            {playing ? (
              <ButtonLink to="/listen" variant="atlas" className="ew-home-desk-link" prefetch="intent">
                {VOICE.homeAtDesk} <span aria-hidden="true">→</span>
              </ButtonLink>
            ) : station && cta.kind !== "none" ? (
              <Button
                variant="land"
                onClick={onLand}
              >
                {cta.label}
              </Button>
            ) : null}
          </div>
          <div className="ew-home-guide" role="group" aria-label="The keeper suggests">
            {guide.map((chip) => (
              <Chip key={chip.id + chip.label} onClick={() => onGuide(chip)}>
                {chip.label}
              </Chip>
            ))}
            {asking ? null : (
              <Chip onClick={() => setAsking(true)}>{VOICE.guideAskChip}</Chip>
            )}
          </div>
          {asking ? (
            <form
              className="ew-home-ask"
              onSubmit={(event) => {
                event.preventDefault();
                const text = draft.trim();
                if (!text) return;
                onAsk(text);
                setDraft("");
                setAsking(false);
              }}
            >
              <input
                autoFocus
                value={draft}
                maxLength={200}
                onChange={(event) => setDraft(event.target.value)}
                placeholder={VOICE.guideAskPlaceholder}
                aria-label="Ask the keeper"
              />
              <Button type="submit" variant="mono">
                {VOICE.guideAskSend}
              </Button>
            </form>
          ) : null}
        </div>
      )}

      <div className="ew-sky-ground">
        <div className="ew-sky-say" aria-live="polite">
          {seeking ? null : (
            <p className="ew-sky-bubble ew-home-say" key={keeperLine}>
              <span className="ew-sky-bubble-text">{keeperLine}</span>
            </p>
          )}
        </div>
        <Keeper
          state={keeperState}
          mood={keeperMood(sky.solar)}
          size="desk"
          className="ew-sky-keeper"
          onOpen={onOpenKeeper}
          label={onOpenKeeper ? `Ask the keeper about ${place}` : undefined}
        />
      </div>
    </section>
  );
}
