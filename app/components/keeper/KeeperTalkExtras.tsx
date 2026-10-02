import { Chip } from "~/components/ui/Button";
import type { KeeperTalk } from "./useKeeperTalk";
import { VOICE } from "./keeperVoice";

/**
 * What can ride under a knowledge answer: a small portrait from Wikimedia
 * (linked back to the article), a few facts lifted from it, and the offer of
 * those facts. Everything is labelled as the keeper's notebook by the caller.
 */
export function KeeperTalkExtras({
  talk,
  className,
  onFacts,
}: {
  talk: KeeperTalk;
  className: string;
  onFacts: (topic: string) => void;
}) {
  if (!talk.answer) return null;
  return (
    <>
      {talk.image ? (
        <figure className={`${className}-photo`}>
          <img src={talk.image} alt={talk.topic ?? ""} loading="lazy" decoding="async" referrerPolicy="no-referrer" />
          {talk.pageUrl ? (
            <figcaption>
              <a href={talk.pageUrl} target="_blank" rel="noreferrer">{VOICE.photoCredit}</a>
            </figcaption>
          ) : null}
        </figure>
      ) : null}
      {talk.facts?.length ? (
        <ul className={`${className}-facts`}>
          {talk.facts.map((fact) => (
            <li key={fact}>{fact}</li>
          ))}
        </ul>
      ) : null}
      {talk.facts?.length && talk.pageUrl ? (
        <p className={`${className}-source`}>
          <a href={talk.pageUrl} target="_blank" rel="noreferrer">{VOICE.factsSource}</a>
        </p>
      ) : null}
      {talk.basis === "knowledge" && talk.topic && !talk.facts?.length && talk.image ? (
        <Chip className={`${className}-more`} onClick={() => onFacts(talk.topic!)}>
          {VOICE.moreFacts(talk.topic)}
        </Chip>
      ) : null}
    </>
  );
}
